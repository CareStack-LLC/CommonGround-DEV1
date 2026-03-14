"""
Stripe Webhook Handler - Processes Stripe events for wallet system.

This endpoint receives webhooks from Stripe and updates the wallet system
accordingly. It handles:
- Payment Intent success/failure (deposits, obligation payments, contributions)
- Account updates (Connect onboarding)
- Transfer/payout status changes
"""

import logging
from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Union
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import settings
from app.services.stripe_service import stripe_service
from app.services.wallet_service import wallet_service
from app.models.wallet import (
    Wallet,
    WalletTransaction,
    WalletFunding,
    ChildWalletContribution,
    Payout,
)
from app.models.user import UserProfile
from app.models.subscription import SubscriptionPlan
from app.schemas.wallet import WebhookHandlerResponse
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/stripe")
async def handle_stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> WebhookHandlerResponse:
    """
    Handle incoming Stripe webhooks.

    Verifies webhook signature and processes events.
    Returns 200 OK to acknowledge receipt.
    """
    from datetime import datetime

    # Get raw payload and signature
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe-Signature header"
        )

    try:
        # Verify signature and construct event
        event = stripe_service.verify_webhook_signature(payload, sig_header)

        # Parse event
        event_data = stripe_service.handle_webhook_event(event)
        event_type = event_data["event_type"]

        logger.info(f"Received Stripe webhook: {event_type}")

        # Route to handler based on event type
        handler = WEBHOOK_HANDLERS.get(event_type)
        if handler:
            await handler(db, event_data)
            await db.commit()
            message = f"Processed {event_type}"
        else:
            message = f"Ignored unhandled event type: {event_type}"
            logger.debug(message)

        return WebhookHandlerResponse(
            success=True,
            event_type=event_type,
            message=message,
            processed_at=datetime.utcnow(),
        )

    except ValueError as e:
        logger.error(f"Invalid webhook payload: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payload: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Webhook handler error: {e}")
        # Return 200 to prevent Stripe retries for application errors
        # Log the error for investigation
        return WebhookHandlerResponse(
            success=False,
            event_type=event_data.get("event_type", "unknown") if "event_data" in locals() else "unknown",
            message=f"Error processing event: {str(e)}",
            processed_at=datetime.utcnow(),
        )


# ============================================================================
# Event Handlers
# ============================================================================

async def handle_payment_intent_succeeded(db: AsyncSession, event_data: dict) -> None:
    """
    Handle successful payment.

    Routes to deposit, obligation payment, or child contribution handler
    based on metadata.
    """
    payment_intent_id = event_data["payment_intent_id"]
    metadata = event_data.get("metadata", {})

    payment_type = metadata.get("type")

    if payment_type == "wallet_deposit":
        await _handle_deposit_success(db, payment_intent_id, metadata)
    elif payment_type == "obligation_payment":
        await _handle_obligation_payment_success(db, payment_intent_id, metadata)
    elif payment_type == "child_contribution":
        await _handle_contribution_success(db, payment_intent_id, metadata)
    else:
        logger.info(f"Unknown payment type: {payment_type} for PI {payment_intent_id}")


async def _handle_deposit_success(db: AsyncSession, payment_intent_id: str, metadata: dict) -> None:
    """Complete a wallet deposit."""
    transaction_id = metadata.get("transaction_id")

    if not transaction_id:
        logger.warning(f"No transaction_id in deposit metadata for PI {payment_intent_id}")
        return

    await wallet_service.complete_deposit(db, transaction_id, payment_intent_id)
    logger.info(f"Completed deposit transaction {transaction_id}")


async def _handle_obligation_payment_success(db: AsyncSession, payment_intent_id: str, metadata: dict) -> None:
    """Complete an obligation payment."""
    funding_id = metadata.get("funding_id")
    obligation_id = metadata.get("obligation_id")

    if not funding_id:
        logger.warning(f"No funding_id in obligation payment metadata for PI {payment_intent_id}")
        return

    # Get funding record
    result = await db.execute(
        select(WalletFunding).where(WalletFunding.id == funding_id)
    )
    funding = result.scalar_one_or_none()

    if not funding:
        logger.warning(f"Funding record not found: {funding_id}")
        return

    if funding.status == "completed":
        return

    # Get payment intent to verify success
    pi = await stripe_service.get_payment_intent(payment_intent_id)

    if pi["status"] == "succeeded":
        funding.status = "completed"
        funding.completed_at = datetime.utcnow()
        funding.stripe_charge_id = pi.get("charge_id")

        # Update obligation
        from app.models.clearfund import Obligation
        from datetime import datetime

        oblig_result = await db.execute(
            select(Obligation).where(Obligation.id == funding.obligation_id)
        )
        obligation = oblig_result.scalar_one_or_none()

        if obligation:
            obligation.amount_funded += funding.amount
            if obligation.amount_funded >= obligation.total_amount:
                obligation.status = "funded"
                obligation.funded_at = datetime.utcnow()

                # Process payout
                await wallet_service._check_and_process_full_funding(db, obligation)

        logger.info(f"Completed obligation funding {funding_id}")


async def _handle_contribution_success(db: AsyncSession, payment_intent_id: str, metadata: dict) -> None:
    """Complete a child wallet contribution."""
    contribution_id = metadata.get("contribution_id")

    if not contribution_id:
        logger.warning(f"No contribution_id in metadata for PI {payment_intent_id}")
        return

    await wallet_service.complete_child_contribution(db, contribution_id, payment_intent_id)
    logger.info(f"Completed child contribution {contribution_id}")


async def handle_payment_intent_failed(db: AsyncSession, event_data: dict) -> None:
    """Handle failed payment."""
    from datetime import datetime

    payment_intent_id = event_data["payment_intent_id"]
    failure_message = event_data.get("failure_message", "Payment failed")
    metadata = event_data.get("metadata", {})

    payment_type = metadata.get("type")

    if payment_type == "wallet_deposit":
        transaction_id = metadata.get("transaction_id")
        if transaction_id:
            result = await db.execute(
                select(WalletTransaction).where(WalletTransaction.id == transaction_id)
            )
            transaction = result.scalar_one_or_none()
            if transaction and transaction.status != "failed":
                transaction.mark_failed(failure_message)
                logger.info(f"Marked deposit {transaction_id} as failed: {failure_message}")

    elif payment_type == "obligation_payment":
        funding_id = metadata.get("funding_id")
        if funding_id:
            result = await db.execute(
                select(WalletFunding).where(WalletFunding.id == funding_id)
            )
            funding = result.scalar_one_or_none()
            if funding and funding.status != "failed":
                funding.mark_failed(failure_message)
                logger.info(f"Marked funding {funding_id} as failed: {failure_message}")

    elif payment_type == "child_contribution":
        contribution_id = metadata.get("contribution_id")
        if contribution_id:
            result = await db.execute(
                select(ChildWalletContribution).where(
                    ChildWalletContribution.id == contribution_id
                )
            )
            contribution = result.scalar_one_or_none()
            if contribution and contribution.status != "failed":
                contribution.status = "failed"
                contribution.failed_at = datetime.utcnow()
                contribution.failure_reason = failure_message
                logger.info(f"Marked contribution {contribution_id} as failed: {failure_message}")


async def handle_account_updated(db: AsyncSession, event_data: dict) -> None:
    """
    Handle Connect account update.

    Syncs wallet status when Stripe notifies us of account changes.
    """
    account_id = event_data["account_id"]
    charges_enabled = event_data.get("charges_enabled", False)
    payouts_enabled = event_data.get("payouts_enabled", False)

    # Find wallet by Stripe account ID
    result = await db.execute(
        select(Wallet).where(Wallet.stripe_account_id == account_id)
    )
    wallet = result.scalar_one_or_none()

    if not wallet:
        logger.debug(f"No wallet found for Stripe account {account_id}")
        return

    # Sync wallet status
    await wallet_service.sync_stripe_account(db, wallet)
    logger.info(f"Synced wallet {wallet.id} from account.updated webhook")


async def handle_transfer_created(db: AsyncSession, event_data: dict) -> None:
    """Handle transfer creation (payout initiated)."""
    transfer_id = event_data["transfer_id"]
    metadata = event_data.get("metadata", {})

    payout_id = metadata.get("payout_id")
    if not payout_id:
        return

    result = await db.execute(
        select(Payout).where(Payout.id == payout_id)
    )
    payout = result.scalar_one_or_none()

    if payout and payout.status == "processing":
        payout.status = "in_transit"
        payout.stripe_transfer_id = transfer_id
        logger.info(f"Payout {payout_id} transfer created: {transfer_id}")


async def handle_transfer_paid(db: AsyncSession, event_data: dict) -> None:
    """Handle transfer completion (payout delivered)."""
    transfer_id = event_data["transfer_id"]
    metadata = event_data.get("metadata", {})

    payout_id = metadata.get("payout_id")
    if not payout_id:
        # Try to find payout by transfer ID
        result = await db.execute(
            select(Payout).where(Payout.stripe_transfer_id == transfer_id)
        )
        payout = result.scalar_one_or_none()
    else:
        result = await db.execute(
            select(Payout).where(Payout.id == payout_id)
        )
        payout = result.scalar_one_or_none()

    if payout and payout.status not in ["paid", "failed"]:
        payout.mark_completed()
        logger.info(f"Payout {payout.id} marked as paid")


async def handle_payout_paid(db: AsyncSession, event_data: dict) -> None:
    """Handle payout to bank completion."""
    payout_id = event_data.get("payout_id")
    amount = event_data.get("amount")

    logger.info(f"Stripe payout {payout_id} paid: ${amount}")
    # This is the final step - funds have reached the parent's bank
    # Could trigger notification here


async def handle_payout_failed(db: AsyncSession, event_data: dict) -> None:
    """Handle failed payout to bank."""
    payout_id = event_data.get("payout_id")
    failure_message = event_data.get("failure_message", "Payout failed")

    logger.error(f"Stripe payout {payout_id} failed: {failure_message}")
    # Could trigger notification and retry logic here


# ============================================================================
# Subscription Event Handlers
# ============================================================================


# Canonical mapping of Stripe Price IDs → tier codes (from Stripe test export)
STRIPE_PRICE_TO_TIER: dict[str, str] = {
    # Consumer tiers
    "price_1T7WgnB3EXvvERPfyu40gtfE": "web_starter",      # $0/mo
    "price_1T7WgnB3EXvvERPfcpZeMSSH": "plus",              # $17.99/mo
    "price_1T7WgnB3EXvvERPfe7NNFlru": "plus",              # $199.99/yr
    "price_1T7WgoB3EXvvERPfDm7qKpBN": "complete",          # $34.99/mo
    "price_1T7WgoB3EXvvERPfmDy9KtDh": "complete",          # $349.99/yr
    # Professional tiers
    "price_1T7WgoB3EXvvERPfTe6d3Ccx": "professional_starter",  # $49.99/mo
    "price_1T7WgpB3EXvvERPfjThfJqeO": "solo",              # $99/mo
    "price_1T7WgpB3EXvvERPf4wDi0fjN": "small_firm",        # $299/mo
    "price_1T7WgqB3EXvvERPftbsE7Y2f": "mid_size",          # $799/mo
}

STRIPE_PRODUCT_TO_TIER: dict[str, str] = {
    "prod_U5i6vWb4ktGrTN": "web_starter",
    "prod_U5i6Efw49ipfb3": "plus",
    "prod_U5i6lsgC2mOHxn": "complete",
    "prod_U5i6Vfe7E6vHtZ": "professional_starter",
    "prod_U5i6WdwYSiC9wc": "solo",
    "prod_U5i6tXPi3LbW5h": "small_firm",
    "prod_U5i6Pvkzonm0fe": "mid_size",
}


async def _get_tier_from_price_id(db: AsyncSession, price_id: str) -> str:
    """Map Stripe price ID to subscription tier (plan_code)."""
    if not price_id:
        return "web_starter"

    # 1. Check hardcoded mapping first (fastest, always correct)
    if price_id in STRIPE_PRICE_TO_TIER:
        return STRIPE_PRICE_TO_TIER[price_id]

    # 2. Fall back to database lookup
    result = await db.execute(
        select(SubscriptionPlan).where(
            (SubscriptionPlan.stripe_price_id_monthly == price_id) |
            (SubscriptionPlan.stripe_price_id_annual == price_id)
        )
    )
    plan = result.scalar_one_or_none()
    return plan.plan_code if plan else "web_starter"


async def _get_profile_by_stripe_customer(db: AsyncSession, customer_id: str) -> Optional[UserProfile]:
    """Find user profile by Stripe customer ID."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.stripe_customer_id == customer_id)
    )
    return result.scalar_one_or_none()


async def _get_professional_by_stripe_customer(db: AsyncSession, customer_id: str):
    """Find professional profile by Stripe customer ID."""
    from app.models.professional import ProfessionalProfile
    result = await db.execute(
        select(ProfessionalProfile).where(
            ProfessionalProfile.stripe_customer_id == customer_id
        )
    )
    return result.scalar_one_or_none()


async def _sync_professional_subscription(db: AsyncSession, event_data: dict) -> bool:
    """
    Sync subscription event to professional profile if applicable.

    Returns True if a professional profile was updated.
    """
    from datetime import datetime
    from app.models.professional import ProfessionalTier, TIER_CASE_LIMITS

    customer_id = event_data.get("customer_id")
    if not customer_id:
        return False

    prof = await _get_professional_by_stripe_customer(db, customer_id)
    if not prof:
        return False

    subscription_id = event_data.get("subscription_id")
    status = event_data.get("status")
    price_id = event_data.get("price_id")
    period_end = event_data.get("current_period_end")

    # Map price to tier
    tier = await _get_tier_from_price_id(db, price_id)

    # Update professional profile
    prof.subscription_tier = tier
    prof.subscription_status = status or prof.subscription_status
    prof.stripe_subscription_id = subscription_id

    # Update case limits based on tier
    try:
        tier_enum = ProfessionalTier(tier)
        prof.max_active_cases = TIER_CASE_LIMITS.get(tier_enum, 3)
    except ValueError:
        pass

    if period_end:
        prof.subscription_ends_at = datetime.fromtimestamp(period_end)

    logger.info(
        f"Synced professional subscription: profile={prof.id}, tier={tier}, status={status}"
    )
    return True


async def handle_subscription_created(db: AsyncSession, event_data: dict) -> None:
    """
    Handle new subscription creation.

    Syncs subscription to user profile or professional profile
    when Stripe confirms subscription created.
    """
    from datetime import datetime

    customer_id = event_data.get("customer_id")
    subscription_id = event_data.get("subscription_id")
    status = event_data.get("status")
    price_id = event_data.get("price_id")
    period_start = event_data.get("current_period_start")
    period_end = event_data.get("current_period_end")

    if not customer_id:
        logger.warning(f"No customer_id in subscription.created event")
        return

    # Check professional profile first
    if await _sync_professional_subscription(db, event_data):
        return

    profile = await _get_profile_by_stripe_customer(db, customer_id)
    if not profile:
        logger.warning(f"No profile found for Stripe customer {customer_id}")
        return

    # Map price to tier
    tier = await _get_tier_from_price_id(db, price_id)

    # Update profile subscription fields
    profile.subscription_tier = tier
    profile.subscription_status = status  # active, trialing, past_due, etc.
    profile.stripe_subscription_id = subscription_id

    if period_start:
        profile.subscription_period_start = datetime.fromtimestamp(period_start)
    if period_end:
        profile.subscription_period_end = datetime.fromtimestamp(period_end)
        profile.subscription_ends_at = datetime.fromtimestamp(period_end)

    logger.info(f"Created subscription {subscription_id} for customer {customer_id}: tier={tier}, status={status}")


async def handle_subscription_updated(db: AsyncSession, event_data: dict) -> None:
    """
    Handle subscription updates.

    Syncs status changes, plan changes, and period updates to user or professional profile.
    """
    from datetime import datetime

    customer_id = event_data.get("customer_id")
    subscription_id = event_data.get("subscription_id")
    status = event_data.get("status")
    price_id = event_data.get("price_id")
    period_start = event_data.get("current_period_start")
    period_end = event_data.get("current_period_end")
    cancel_at_period_end = event_data.get("cancel_at_period_end", False)

    if not customer_id:
        logger.warning(f"No customer_id in subscription.updated event")
        return

    # Check professional profile first
    if await _sync_professional_subscription(db, event_data):
        return

    profile = await _get_profile_by_stripe_customer(db, customer_id)
    if not profile:
        logger.warning(f"No profile found for Stripe customer {customer_id}")
        return

    # Map price to tier
    tier = await _get_tier_from_price_id(db, price_id)

    # Update profile
    profile.subscription_tier = tier
    profile.subscription_status = status
    profile.stripe_subscription_id = subscription_id

    if period_start:
        profile.subscription_period_start = datetime.fromtimestamp(period_start)
    if period_end:
        profile.subscription_period_end = datetime.fromtimestamp(period_end)
        profile.subscription_ends_at = datetime.fromtimestamp(period_end)

    # Handle cancel_at_period_end
    if cancel_at_period_end and status == "active":
        profile.subscription_status = "cancelling"

    logger.info(f"Updated subscription {subscription_id}: tier={tier}, status={status}, cancel_at_end={cancel_at_period_end}")


async def handle_subscription_deleted(db: AsyncSession, event_data: dict) -> None:
    """
    Handle subscription cancellation/deletion.

    Downgrades user or professional to starter tier when subscription ends.
    """
    customer_id = event_data.get("customer_id")
    subscription_id = event_data.get("subscription_id")

    if not customer_id:
        logger.warning(f"No customer_id in subscription.deleted event")
        return

    # Check professional profile first
    prof = await _get_professional_by_stripe_customer(db, customer_id)
    if prof:
        from app.models.professional import ProfessionalTier, TIER_CASE_LIMITS
        prof.subscription_tier = ProfessionalTier.STARTER.value
        prof.subscription_status = "cancelled"
        prof.stripe_subscription_id = None
        prof.max_active_cases = TIER_CASE_LIMITS[ProfessionalTier.STARTER]
        prof.subscription_ends_at = None
        logger.info(f"Professional subscription {subscription_id} deleted, downgraded to starter")
        return

    profile = await _get_profile_by_stripe_customer(db, customer_id)
    if not profile:
        logger.warning(f"No profile found for Stripe customer {customer_id}")
        return

    # Downgrade to web_starter (free tier)
    profile.subscription_tier = "web_starter"
    profile.subscription_status = "cancelled"
    profile.stripe_subscription_id = None
    profile.subscription_period_start = None
    profile.subscription_period_end = None

    logger.info(f"Subscription {subscription_id} deleted for customer {customer_id}, downgraded to starter")


async def handle_invoice_paid(db: AsyncSession, event_data: dict) -> None:
    """
    Handle successful invoice payment.

    Updates subscription period and confirms active status.
    """
    customer_id = event_data.get("customer_id")
    subscription_id = event_data.get("subscription_id")
    billing_reason = event_data.get("billing_reason")
    amount_paid = event_data.get("amount_paid")

    if not subscription_id:
        # Not a subscription invoice
        return

    if not customer_id:
        return

    profile = await _get_profile_by_stripe_customer(db, customer_id)
    if not profile:
        return

    # Confirm subscription is active
    if profile.subscription_status in ("past_due", "cancelling"):
        profile.subscription_status = "active"

    logger.info(f"Invoice paid for subscription {subscription_id}: ${amount_paid}, reason={billing_reason}")


async def handle_invoice_payment_failed(db: AsyncSession, event_data: dict) -> None:
    """
    Handle failed invoice payment.

    Marks subscription as past_due so UI can prompt for payment update.
    """
    customer_id = event_data.get("customer_id")
    subscription_id = event_data.get("subscription_id")
    attempt_count = event_data.get("attempt_count", 1)

    if not subscription_id:
        return

    if not customer_id:
        return

    profile = await _get_profile_by_stripe_customer(db, customer_id)
    if not profile:
        return

    # Mark as past_due
    profile.subscription_status = "past_due"

    logger.warning(f"Invoice payment failed for subscription {subscription_id}, attempt {attempt_count}")


async def handle_checkout_completed(db: AsyncSession, event_data: dict) -> None:
    """
    Handle completed checkout session.

    Logs checkout completion for subscription payments.
    The actual subscription sync happens via subscription.created webhook.
    """
    session_id = event_data.get("session_id")
    customer_id = event_data.get("customer_id")
    subscription_id = event_data.get("subscription_id")
    mode = event_data.get("mode")
    payment_status = event_data.get("payment_status")

    if mode != "subscription":
        return

    logger.info(
        f"Checkout completed: session={session_id}, customer={customer_id}, "
        f"subscription={subscription_id}, payment_status={payment_status}"
    )


# ============================================================================
# Handler Mapping
# ============================================================================

WEBHOOK_HANDLERS = {
    # Wallet events
    "payment_intent.succeeded": handle_payment_intent_succeeded,
    "payment_intent.payment_failed": handle_payment_intent_failed,
    "account.updated": handle_account_updated,
    "transfer.created": handle_transfer_created,
    "transfer.paid": handle_transfer_paid,
    "payout.paid": handle_payout_paid,
    "payout.failed": handle_payout_failed,
    # Subscription events
    "customer.subscription.created": handle_subscription_created,
    "customer.subscription.updated": handle_subscription_updated,
    "customer.subscription.deleted": handle_subscription_deleted,
    "invoice.paid": handle_invoice_paid,
    "invoice.payment_failed": handle_invoice_payment_failed,
    "checkout.session.completed": handle_checkout_completed,
}
