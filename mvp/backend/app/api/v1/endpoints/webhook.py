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
from app.schemas.wallet import WebhookHandlerResponse

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


async def handle_subscription_created(db: AsyncSession, event_data: dict) -> None:
    """Handle new subscription creation."""
    from app.models.user import UserProfile
    from app.models.subscription import SubscriptionPlan

    subscription = event_data.get("subscription", {})
    customer_id = subscription.get("customer")
    subscription_id = subscription.get("id")
    status = subscription.get("status")

    # Find user by Stripe customer ID
    result = await db.execute(
        select(UserProfile).where(UserProfile.stripe_customer_id == customer_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        logger.warning(f"No profile found for Stripe customer {customer_id}")
        return

    # Get the plan from price ID
    items = subscription.get("items", {}).get("data", [])
    if items:
        price_id = items[0].get("price", {}).get("id")

        # Find plan by price ID
        plan_result = await db.execute(
            select(SubscriptionPlan).where(
                (SubscriptionPlan.stripe_price_id_monthly == price_id) |
                (SubscriptionPlan.stripe_price_id_annual == price_id)
            )
        )
        plan = plan_result.scalar_one_or_none()

        if plan:
            profile.subscription_tier = plan.plan_code

    # Update profile
    profile.stripe_subscription_id = subscription_id
    profile.subscription_status = "trial" if status == "trialing" else "active"
    profile.subscription_period_start = datetime.fromtimestamp(
        subscription.get("current_period_start", 0)
    )
    profile.subscription_period_end = datetime.fromtimestamp(
        subscription.get("current_period_end", 0)
    )

    logger.info(f"Subscription created for user profile {profile.id}: {subscription_id}")


async def handle_subscription_updated(db: AsyncSession, event_data: dict) -> None:
    """Handle subscription updates (renewals, plan changes, cancellations)."""
    from app.models.user import UserProfile
    from app.models.subscription import SubscriptionPlan

    subscription = event_data.get("subscription", {})
    customer_id = subscription.get("customer")
    subscription_id = subscription.get("id")
    status = subscription.get("status")

    # Find user by Stripe customer ID
    result = await db.execute(
        select(UserProfile).where(UserProfile.stripe_customer_id == customer_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        logger.warning(f"No profile found for Stripe customer {customer_id}")
        return

    # Map Stripe status to our status
    status_map = {
        "active": "active",
        "trialing": "trial",
        "past_due": "past_due",
        "canceled": "cancelled",
        "unpaid": "past_due",
        "incomplete": "trial",
        "incomplete_expired": "cancelled",
        "paused": "cancelled",
    }

    profile.subscription_status = status_map.get(status, "active")

    # Update period dates
    profile.subscription_period_start = datetime.fromtimestamp(
        subscription.get("current_period_start", 0)
    )
    profile.subscription_period_end = datetime.fromtimestamp(
        subscription.get("current_period_end", 0)
    )

    # Check if plan changed
    items = subscription.get("items", {}).get("data", [])
    if items:
        price_id = items[0].get("price", {}).get("id")

        plan_result = await db.execute(
            select(SubscriptionPlan).where(
                (SubscriptionPlan.stripe_price_id_monthly == price_id) |
                (SubscriptionPlan.stripe_price_id_annual == price_id)
            )
        )
        plan = plan_result.scalar_one_or_none()

        if plan and plan.plan_code != profile.subscription_tier:
            logger.info(
                f"Plan changed for {profile.id}: {profile.subscription_tier} -> {plan.plan_code}"
            )
            profile.subscription_tier = plan.plan_code

    logger.info(f"Subscription updated for user profile {profile.id}: status={status}")


async def handle_subscription_deleted(db: AsyncSession, event_data: dict) -> None:
    """Handle subscription cancellation/deletion."""
    from app.models.user import UserProfile

    subscription = event_data.get("subscription", {})
    customer_id = subscription.get("customer")

    # Find user by Stripe customer ID
    result = await db.execute(
        select(UserProfile).where(UserProfile.stripe_customer_id == customer_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        logger.warning(f"No profile found for Stripe customer {customer_id}")
        return

    # Downgrade to starter tier
    profile.subscription_tier = "starter"
    profile.subscription_status = "cancelled"
    profile.stripe_subscription_id = None
    profile.subscription_period_start = None
    profile.subscription_period_end = None

    logger.info(f"Subscription deleted for user profile {profile.id}, downgraded to starter")


async def handle_invoice_paid(db: AsyncSession, event_data: dict) -> None:
    """Handle successful invoice payment (subscription renewal)."""
    invoice = event_data.get("invoice", {})
    customer_id = invoice.get("customer")
    subscription_id = invoice.get("subscription")

    logger.info(
        f"Invoice paid for customer {customer_id}, subscription {subscription_id}"
    )
    # Subscription updated event will handle the actual status update


async def handle_invoice_payment_failed(db: AsyncSession, event_data: dict) -> None:
    """Handle failed invoice payment."""
    from app.models.user import UserProfile

    invoice = event_data.get("invoice", {})
    customer_id = invoice.get("customer")

    # Find user by Stripe customer ID
    result = await db.execute(
        select(UserProfile).where(UserProfile.stripe_customer_id == customer_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        logger.warning(f"No profile found for Stripe customer {customer_id}")
        return

    # Mark as past due
    profile.subscription_status = "past_due"

    logger.warning(
        f"Invoice payment failed for user profile {profile.id}, marked as past_due"
    )
    # Could trigger notification here


async def handle_checkout_session_completed(db: AsyncSession, event_data: dict) -> None:
    """Handle completed Stripe Checkout session."""
    session = event_data.get("session", {})
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    mode = session.get("mode")

    if mode != "subscription":
        return

    logger.info(
        f"Checkout completed for customer {customer_id}, subscription {subscription_id}"
    )
    # The subscription.created webhook will handle the actual subscription setup


# ============================================================================
# Handler Mapping
# ============================================================================

WEBHOOK_HANDLERS = {
    # Payment events
    "payment_intent.succeeded": handle_payment_intent_succeeded,
    "payment_intent.payment_failed": handle_payment_intent_failed,
    # Connect account events
    "account.updated": handle_account_updated,
    # Transfer/payout events
    "transfer.created": handle_transfer_created,
    "transfer.paid": handle_transfer_paid,
    "payout.paid": handle_payout_paid,
    "payout.failed": handle_payout_failed,
    # Subscription events
    "customer.subscription.created": handle_subscription_created,
    "customer.subscription.updated": handle_subscription_updated,
    "customer.subscription.deleted": handle_subscription_deleted,
    # Invoice events
    "invoice.paid": handle_invoice_paid,
    "invoice.payment_failed": handle_invoice_payment_failed,
    # Checkout events
    "checkout.session.completed": handle_checkout_session_completed,
}
