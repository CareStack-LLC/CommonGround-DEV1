"""
Wallet API endpoints - Parent and child wallet management with Stripe Connect.

Endpoints for managing wallets, deposits, obligation payments, payouts,
and child wallet contributions.

IMPORTANT: Route ordering matters in FastAPI. Static paths (e.g. /payouts,
/pay-obligation, /child/{id}) MUST be defined before parameterized paths
(e.g. /{wallet_id}) to avoid the parameterized route matching first.
"""

import asyncio
import logging
import traceback
from typing import Optional

import stripe

logger = logging.getLogger(__name__)
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user, get_current_child_user
from app.models.kidcoms import ChildUser
from app.models.user import User
from app.schemas.wallet import (
    WalletCreate,
    WalletResponse,
    WalletListResponse,
    WalletOnboardingRequest,
    WalletOnboardingResponse,
    WalletBalanceResponse,
    DepositCreate,
    DepositResponse,
    WithdrawCreate,
    WithdrawResponse,
    TransactionResponse,
    TransactionListResponse,
    ObligationPaymentCreate,
    ObligationPaymentResponse,
    ObligationFundingStatusResponse,
    ChildContributionCreate,
    ChildContributionResponse,
    ChildContributionListResponse,
    ChildWalletResponse,
    PayoutResponse,
    PayoutListResponse,
    PayoutApproveRequest,
    WalletAnalytics,
)
from app.services.wallet_service import wallet_service
from app.utils.sentry_helpers import capture_error

router = APIRouter()


# ============================================================================
# Internal notification helpers
# ============================================================================

async def _notify_parents_of_circle_contribution(
    db: AsyncSession,
    contribution,
) -> None:
    """
    Fan-out an in-app notification to both parents on the family file after
    a circle contact funds a child's wallet.

    Best-effort: swallows notification-side errors so the contribution HTTP
    response is never impacted. Follows the lazy-import pattern used by
    ``app.services.family_messaging`` so a missing notifications module in
    some deployment modes (tests, minimal images) cannot break payments.
    """
    try:
        from sqlalchemy import select as _select
        from app.models.child import Child
        from app.models.family_file import FamilyFile
        from app.services.notification_service import notification_service
    except ImportError as exc:
        logger.info("notification service unavailable; skipping circle-contribution notify: %s", exc)
        return

    # Load family file + child for naming and recipient fan-out.
    ff_result = await db.execute(
        _select(FamilyFile).where(FamilyFile.id == contribution.family_file_id)
    )
    family_file = ff_result.scalar_one_or_none()
    if family_file is None:
        logger.info(
            "circle-contribution notify: family_file %s not found",
            contribution.family_file_id,
        )
        return

    child_result = await db.execute(
        _select(Child).where(Child.id == contribution.child_id)
    )
    child = child_result.scalar_one_or_none()
    child_first_name = (
        getattr(child, "preferred_name", None)
        or getattr(child, "first_name", None)
        or "your child"
    )

    # Format amount as a plain dollar figure (e.g. "25" or "25.50").
    try:
        amount_str = f"{contribution.amount:.2f}".rstrip("0").rstrip(".") or "0"
    except Exception:
        amount_str = str(contribution.amount)

    title = f"New gift for {child_first_name}"
    body = (
        f"{contribution.contributor_name} added ${amount_str} to "
        f"{child_first_name}'s wallet"
    )
    action_url = f"/family-files/{contribution.family_file_id}/wallet"

    parent_ids = [
        pid for pid in (family_file.parent_a_id, family_file.parent_b_id) if pid
    ]
    for parent_id in parent_ids:
        try:
            await notification_service.create(
                db=db,
                user_id=parent_id,
                notification_type="circle_contribution",
                title=title,
                body=body,
                action_url=action_url,
                family_file_id=contribution.family_file_id,
                metadata={
                    "contribution_id": contribution.id,
                    "child_id": contribution.child_id,
                    "contributor_name": contribution.contributor_name,
                    "amount": str(contribution.amount),
                },
            )
        except Exception as exc:  # pragma: no cover - best-effort per-parent
            logger.warning(
                "circle-contribution notify failed for parent %s: %s",
                parent_id,
                exc,
            )


# ============================================================================
# Parent Wallet Endpoints (static paths first)
# ============================================================================

# Deprecated 2026-04-16 (Wave 4-Alt) — parent wallets were the staging area
# for Stripe Connect. Kept for legacy reads but new creates are blocked;
# the new funding path uses `POST /wallets/obligations/{id}/checkout-session`.
@router.post("/", status_code=status.HTTP_201_CREATED, deprecated=True)
async def create_wallet(
    data: WalletCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WalletResponse:
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail=(
            "Parent wallet creation has been retired. CommonGround now uses "
            "Stripe Issuing: fund obligations directly with a card, no wallet "
            "onboarding required."
        ),
    )
    # Legacy code retained below — unreachable after the 410 above.
    try:
        wallet = await wallet_service.create_parent_wallet(
            db=db,
            user_id=str(current_user.id),
            email=current_user.email,
            family_file_id=data.family_file_id,
            display_name=f"{current_user.first_name}'s Wallet" if current_user.first_name else None,
        )
        await db.commit()

        # Get balance (will be 0 for new wallet)
        balances = await wallet_service.calculate_balance(db, wallet.id)

        return WalletResponse(
            id=wallet.id,
            owner_type=wallet.owner_type,
            owner_id=wallet.owner_id,
            wallet_type=wallet.wallet_type,
            display_name=wallet.display_name,
            stripe_account_status=wallet.stripe_account_status,
            bank_last_four=wallet.bank_last_four,
            bank_name=wallet.bank_name,
            onboarding_completed=wallet.onboarding_completed,
            charges_enabled=wallet.charges_enabled,
            payouts_enabled=wallet.payouts_enabled,
            is_active=wallet.is_active,
            is_ready_for_payments=wallet.is_ready_for_payments,
            is_ready_for_payouts=wallet.is_ready_for_payouts,
            current_balance=balances["current_balance"],
            available_balance=balances["available_balance"],
            created_at=wallet.created_at,
            updated_at=wallet.updated_at,
        )
    except ValueError as e:
        logger.error(f"Failed to create wallet: {e}")
        capture_error(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An error occurred while processing your request.")


@router.get("/me")
async def get_my_wallet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Optional[WalletResponse]:
    """
    Get the current user's parent wallet.

    Returns None if user has no wallet yet.
    """
    wallet = await wallet_service.get_user_wallet(db, str(current_user.id))

    if not wallet:
        return None

    balances = await wallet_service.calculate_balance(db, wallet.id)

    return WalletResponse(
        id=wallet.id,
        owner_type=wallet.owner_type,
        owner_id=wallet.owner_id,
        wallet_type=wallet.wallet_type,
        display_name=wallet.display_name,
        stripe_account_status=wallet.stripe_account_status,
        bank_last_four=wallet.bank_last_four,
        bank_name=wallet.bank_name,
        onboarding_completed=wallet.onboarding_completed,
        charges_enabled=wallet.charges_enabled,
        payouts_enabled=wallet.payouts_enabled,
        is_active=wallet.is_active,
        is_ready_for_payments=wallet.is_ready_for_payments,
        is_ready_for_payouts=wallet.is_ready_for_payouts,
        current_balance=balances["current_balance"],
        available_balance=balances["available_balance"],
        created_at=wallet.created_at,
        updated_at=wallet.updated_at,
    )


# ============================================================================
# Payouts (static path - must be before /{wallet_id})
# ============================================================================

@router.get("/payouts")
async def list_payouts(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PayoutListResponse:
    """Get payouts for current user."""
    payouts, total = await wallet_service.get_user_payouts(
        db=db,
        user_id=str(current_user.id),
        status=status_filter,
        page=page,
        page_size=page_size,
    )

    return PayoutListResponse(
        items=[
            PayoutResponse(
                id=p.id,
                obligation_id=p.obligation_id,
                recipient_wallet_id=p.recipient_wallet_id,
                recipient_user_id=p.recipient_user_id,
                gross_amount=p.gross_amount,
                fee_amount=p.fee_amount,
                net_amount=p.net_amount,
                status=p.status,
                requires_approval=p.requires_approval,
                approved_at=p.approved_at,
                approved_by=p.approved_by,
                stripe_transfer_id=p.stripe_transfer_id,
                initiated_at=p.initiated_at,
                completed_at=p.completed_at,
                estimated_arrival=p.estimated_arrival,
            )
            for p in payouts
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


# ============================================================================
# Obligation Payments (static paths - must be before /{wallet_id})
# ============================================================================

@router.post("/pay-obligation")
async def pay_obligation(
    data: ObligationPaymentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ObligationPaymentResponse:
    """
    Pay an obligation from wallet or direct card/ACH.

    If payment_source is "wallet", funds are deducted from wallet balance.
    If "card" or "ach", payment is processed directly via Stripe.

    When an obligation is fully funded, the total amount is automatically
    transferred to the requesting parent's wallet.
    """
    # Get user's wallet if paying from wallet
    wallet = None
    if data.payment_source == "wallet":
        wallet = await wallet_service.get_user_wallet(db, str(current_user.id))
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You don't have a wallet. Create one first."
            )
    else:
        # For direct payments, wallet is optional (for record keeping)
        wallet = await wallet_service.get_user_wallet(db, str(current_user.id))

    try:
        funding = await wallet_service.pay_obligation(
            db=db,
            wallet=wallet,
            payer_id=str(current_user.id),
            obligation_id=data.obligation_id,
            amount=data.amount,
            payment_source=data.payment_source,
            payment_method_id=data.payment_method_id,
            idempotency_key=data.idempotency_key,
        )
        await db.commit()

        # Check if requires action (3D Secure)
        requires_action = funding.extra_data.get("requires_action", False) if funding.extra_data else False
        client_secret = funding.extra_data.get("client_secret") if funding.extra_data else None

        return ObligationPaymentResponse(
            id=funding.id,
            obligation_id=funding.obligation_id,
            payer_id=funding.payer_id,
            amount=funding.amount,
            payment_source=funding.payment_source,
            status=funding.status,
            wallet_transaction_id=funding.wallet_transaction_id,
            stripe_payment_intent_id=funding.stripe_payment_intent_id,
            client_secret=client_secret,
            requires_action=requires_action,
            created_at=funding.created_at,
            completed_at=funding.completed_at,
        )
    except ValueError as e:
        await db.rollback()
        logger.error(f"Payment validation failed: {e}")
        capture_error(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An error occurred while processing your request.")
    except Exception as e:
        await db.rollback()
        logger.exception(f"Payment failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment failed."
        )


@router.get("/obligation/{obligation_id}/funding-status")
async def get_obligation_funding_status(
    obligation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ObligationFundingStatusResponse:
    """
    Get funding status for an obligation.

    Shows total, funded, remaining amounts and payment history.
    """
    from sqlalchemy import select
    from app.models.clearfund import Obligation
    from app.models.wallet import WalletFunding

    # Get obligation
    result = await db.execute(
        select(Obligation).where(Obligation.id == obligation_id)
    )
    obligation = result.scalar_one_or_none()

    if not obligation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation not found")

    # Get wallet fundings
    fundings_result = await db.execute(
        select(WalletFunding).where(WalletFunding.obligation_id == obligation_id)
    )
    fundings = fundings_result.scalars().all()

    payments = [
        ObligationPaymentResponse(
            id=f.id,
            obligation_id=f.obligation_id,
            payer_id=f.payer_id,
            amount=f.amount,
            payment_source=f.payment_source,
            status=f.status,
            wallet_transaction_id=f.wallet_transaction_id,
            stripe_payment_intent_id=f.stripe_payment_intent_id,
            client_secret=None,
            requires_action=False,
            created_at=f.created_at,
            completed_at=f.completed_at,
        )
        for f in fundings
    ]

    amount_remaining = obligation.total_amount - obligation.amount_funded
    funding_percentage = (
        float(obligation.amount_funded / obligation.total_amount * 100)
        if obligation.total_amount > 0 else 100.0
    )

    return ObligationFundingStatusResponse(
        obligation_id=obligation_id,
        total_amount=obligation.total_amount,
        amount_funded=obligation.amount_funded,
        amount_remaining=amount_remaining,
        funding_percentage=funding_percentage,
        is_fully_funded=obligation.is_fully_funded,
        payments=payments,
    )


# ============================================================================
# Child Wallet Endpoints (static paths - must be before /{wallet_id})
# ============================================================================

@router.post("/child/{child_id}")
async def create_child_wallet(
    child_id: str,
    family_file_id: str = Query(..., description="Family file ID"),
    display_name: Optional[str] = Query(None, description="Display name"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WalletResponse:
    """
    Create a child wallet (internal ledger).

    Child wallets track gifts from parents and circle members.
    They don't have Stripe accounts.
    """
    try:
        wallet = await wallet_service.create_child_wallet(
            db=db,
            child_id=child_id,
            family_file_id=family_file_id,
            display_name=display_name,
        )
        await db.commit()

        balances = await wallet_service.calculate_balance(db, wallet.id)

        return WalletResponse(
            id=wallet.id,
            owner_type=wallet.owner_type,
            owner_id=wallet.owner_id,
            wallet_type=wallet.wallet_type,
            display_name=wallet.display_name,
            stripe_account_status=None,
            bank_last_four=None,
            bank_name=None,
            onboarding_completed=True,
            charges_enabled=False,
            payouts_enabled=False,
            is_active=wallet.is_active,
            is_ready_for_payments=wallet.is_ready_for_payments,
            is_ready_for_payouts=False,
            current_balance=balances["current_balance"],
            available_balance=balances["available_balance"],
            created_at=wallet.created_at,
            updated_at=wallet.updated_at,
        )
    except ValueError as e:
        await db.rollback()
        logger.error(f"Failed to create child wallet: {e}")
        capture_error(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An error occurred while processing your request.")


@router.get("/child/{child_id}")
async def get_child_wallet_summary(
    child_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ChildWalletResponse:
    """
    Get child wallet summary with recent contributions.
    """
    from sqlalchemy import select, func
    from app.models.child import Child

    wallet = await wallet_service.get_child_wallet(db, child_id)

    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child wallet not found")

    # Get child name
    child_result = await db.execute(select(Child).where(Child.id == child_id))
    child = child_result.scalar_one_or_none()
    child_name = f"{child.first_name} {child.last_name}" if child else "Unknown"

    # Get balance
    balances = await wallet_service.calculate_balance(db, wallet.id)

    # Get contribution stats
    contributions, total_count = await wallet_service.get_child_contributions(
        db, wallet.id, page=1, page_size=5
    )

    # Calculate total received
    from app.models.wallet import ChildWalletContribution
    total_result = await db.execute(
        select(func.coalesce(func.sum(ChildWalletContribution.net_amount), 0)).where(
            ChildWalletContribution.child_wallet_id == wallet.id,
            ChildWalletContribution.status == "completed",
        )
    )
    total_received = total_result.scalar() or 0

    return ChildWalletResponse(
        wallet_id=wallet.id,
        child_id=child_id,
        child_name=child_name,
        balance=balances["current_balance"],
        total_received=total_received,
        contribution_count=total_count,
        recent_contributions=[
            ChildContributionResponse(
                id=c.id,
                child_wallet_id=c.child_wallet_id,
                child_id=c.child_id,
                contributor_name=c.contributor_name,
                contributor_email=c.contributor_email,
                amount=c.amount,
                fee_amount=c.fee_amount,
                net_amount=c.net_amount,
                purpose=c.purpose,
                message=c.message,
                status=c.status,
                stripe_payment_intent_id=c.stripe_payment_intent_id,
                client_secret=None,
                requires_action=False,
                created_at=c.created_at,
                completed_at=c.completed_at,
            )
            for c in contributions
        ],
    )


# ============================================================================
# Wave 4-Alt: Obligation funding via Stripe Checkout (no Connect)
# ============================================================================


@router.post("/obligations/{obligation_id}/checkout-session")
async def create_obligation_checkout_session(
    obligation_id: str,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout session for the caller to fund an obligation.

    Body: {"amount": "25.00", "return_url": "https://app.../obligation/..."}

    Replaces the Connect-onboarding path: parents pay with their usual card
    through Stripe's hosted Checkout. Once both parents contribute the full
    total, `issue_virtual_card_on_funding` auto-issues the virtual card.
    """
    from decimal import Decimal
    from app.models.clearfund import Obligation
    from app.models.family_file import FamilyFile
    from app.services.stripe_issuing import is_issuing_available

    amount_raw = (payload or {}).get("amount")
    return_url = (payload or {}).get("return_url")
    if not amount_raw or not return_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both 'amount' and 'return_url' are required.",
        )
    try:
        amount = Decimal(str(amount_raw))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'amount' must be numeric.",
        )
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'amount' must be greater than zero.",
        )

    from sqlalchemy import select as _select
    obligation = (
        await db.execute(_select(Obligation).where(Obligation.id == obligation_id))
    ).scalar_one_or_none()
    if not obligation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation not found")

    ff_id = obligation.family_file_id
    if ff_id:
        ff = (
            await db.execute(_select(FamilyFile).where(FamilyFile.id == ff_id))
        ).scalar_one_or_none()
        if not ff or str(current_user.id) not in (str(ff.parent_a_id), str(ff.parent_b_id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a parent on this family file.",
            )

    remaining = (obligation.total_amount or Decimal(0)) - (obligation.amount_funded or Decimal(0))
    if amount > remaining:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Amount exceeds remaining balance of ${remaining}.",
        )

    if not is_issuing_available():
        return {
            "checkout_url": None,
            "session_id": None,
            "status": "stripe_unavailable",
            "message": "Stripe is not configured in this environment.",
        }

    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        session_obj = await asyncio.to_thread(
            stripe.checkout.Session.create,
            mode="payment",
            success_url=return_url,
            cancel_url=return_url,
            customer_email=current_user.email,
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": int(round(float(amount) * 100)),
                        "product_data": {
                            "name": f"Obligation: {obligation.title}",
                            "description": obligation.description or "Shared expense contribution",
                        },
                    },
                    "quantity": 1,
                }
            ],
            metadata={
                "obligation_id": str(obligation.id),
                "payer_user_id": str(current_user.id),
                "family_file_id": str(ff_id or ""),
                "commonground_flow": "obligation_funding",
            },
        )
    except Exception as exc:
        logger.error("Checkout session failed for obligation=%s: %s", obligation_id, exc)
        capture_error(exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach the payment provider. Try again in a moment.",
        )

    return {
        "checkout_url": session_obj.url,
        "session_id": session_obj.id,
        "status": "created",
    }


@router.get("/child/me/summary")
async def get_my_child_wallet_summary(
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db),
) -> ChildWalletResponse:
    """
    Wave 3 C1: Child-authed read-only view of *their own* wallet.

    A child is authenticated via their child_user JWT (PIN login). We look
    up the wallet by `current_child.child_id` so they can only ever see
    their own balance — no cross-child data leakage.
    """
    from sqlalchemy import select, func
    from app.models.child import Child
    from app.models.wallet import ChildWalletContribution

    wallet = await wallet_service.get_child_wallet(db, current_child.child_id)
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Your wallet hasn't been set up yet. Ask a parent to create it.",
        )

    child_result = await db.execute(select(Child).where(Child.id == current_child.child_id))
    child = child_result.scalar_one_or_none()
    child_name = child.first_name if child else "You"

    balances = await wallet_service.calculate_balance(db, wallet.id)

    contributions, total_count = await wallet_service.get_child_contributions(
        db, wallet.id, page=1, page_size=10,
    )
    total_result = await db.execute(
        select(func.coalesce(func.sum(ChildWalletContribution.net_amount), 0)).where(
            ChildWalletContribution.child_wallet_id == wallet.id,
            ChildWalletContribution.status == "completed",
        )
    )
    total_received = total_result.scalar() or 0

    return ChildWalletResponse(
        wallet_id=wallet.id,
        child_id=current_child.child_id,
        child_name=child_name,
        balance=balances["current_balance"],
        total_received=total_received,
        contribution_count=total_count,
        recent_contributions=[
            ChildContributionResponse(
                id=c.id,
                child_wallet_id=c.child_wallet_id,
                child_id=c.child_id,
                contributor_name=c.contributor_name,
                contributor_email=c.contributor_email,
                amount=c.amount,
                fee_amount=c.fee_amount,
                net_amount=c.net_amount,
                purpose=c.purpose,
                message=c.message,
                status=c.status,
                stripe_payment_intent_id=c.stripe_payment_intent_id,
                client_secret=None,
                requires_action=False,
                created_at=c.created_at,
                completed_at=c.completed_at,
            )
            for c in contributions
        ],
    )


@router.post("/child/{child_id}/contribute")
async def contribute_to_child(
    child_id: str,
    data: ChildContributionCreate,
    db: AsyncSession = Depends(get_db)
) -> ChildContributionResponse:
    """
    Guest contribution to child wallet.

    Circle members can send money to children without creating an account.
    This is a public endpoint (no auth required) - uses Stripe for payment.
    """
    wallet = await wallet_service.get_child_wallet(db, child_id)

    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child wallet not found")

    if not wallet.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Child wallet is not active")

    try:
        contribution = await wallet_service.create_child_contribution(
            db=db,
            child_wallet=wallet,
            child_id=child_id,
            family_file_id=wallet.family_file_id,
            contributor_name=data.contributor_name,
            contributor_email=data.contributor_email,
            amount=data.amount,
            payment_method_id=data.payment_method_id,
            purpose=data.purpose,
            message=data.message,
            contributor_circle_contact_id=data.contributor_circle_contact_id,
            idempotency_key=data.idempotency_key,
        )
        await db.commit()

        requires_action = contribution.extra_data.get("requires_action", False) if contribution.extra_data else False
        client_secret = contribution.extra_data.get("client_secret") if contribution.extra_data else None

        # After the DB commit, notify both parents if this contribution was
        # attributed to a circle contact. Wrapped in try/except so notification
        # failures never break the contribution (same pattern as family_messaging).
        if data.contributor_circle_contact_id:
            try:
                await _notify_parents_of_circle_contribution(
                    db=db,
                    contribution=contribution,
                )
            except Exception as notify_exc:  # pragma: no cover — best-effort
                logger.warning(
                    "circle-contribution notification failed for contribution=%s: %s",
                    contribution.id,
                    notify_exc,
                )

        return ChildContributionResponse(
            id=contribution.id,
            child_wallet_id=contribution.child_wallet_id,
            child_id=contribution.child_id,
            contributor_name=contribution.contributor_name,
            contributor_email=contribution.contributor_email,
            amount=contribution.amount,
            fee_amount=contribution.fee_amount,
            net_amount=contribution.net_amount,
            purpose=contribution.purpose,
            message=contribution.message,
            status=contribution.status,
            stripe_payment_intent_id=contribution.stripe_payment_intent_id,
            client_secret=client_secret,
            requires_action=requires_action,
            created_at=contribution.created_at,
            completed_at=contribution.completed_at,
        )
    except HTTPException:
        # Preserve intentional HTTPExceptions (e.g. 403 from unverified circle
        # contact) — don't collapse them into a generic 400.
        await db.rollback()
        raise
    except ValueError as e:
        await db.rollback()
        logger.error(f"Contribution validation failed: {e}")
        capture_error(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An error occurred while processing your request.")
    except Exception as e:
        await db.rollback()
        logger.exception(f"Contribution failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Contribution failed."
        )


@router.get("/child/{child_id}/contributions")
async def list_child_contributions(
    child_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ChildContributionListResponse:
    """List contributions to a child wallet."""
    wallet = await wallet_service.get_child_wallet(db, child_id)

    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child wallet not found")

    contributions, total = await wallet_service.get_child_contributions(
        db, wallet.id, page, page_size
    )

    return ChildContributionListResponse(
        items=[
            ChildContributionResponse(
                id=c.id,
                child_wallet_id=c.child_wallet_id,
                child_id=c.child_id,
                contributor_name=c.contributor_name,
                contributor_email=c.contributor_email,
                amount=c.amount,
                fee_amount=c.fee_amount,
                net_amount=c.net_amount,
                purpose=c.purpose,
                message=c.message,
                status=c.status,
                stripe_payment_intent_id=c.stripe_payment_intent_id,
                client_secret=None,
                requires_action=False,
                created_at=c.created_at,
                completed_at=c.completed_at,
            )
            for c in contributions
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


# ============================================================================
# Family Wallets (static path - must be before /{wallet_id})
# ============================================================================

@router.get("/family/{family_file_id}")
async def get_family_wallets(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WalletListResponse:
    """Get all wallets in a family file."""
    wallets = await wallet_service.get_family_wallets(db, family_file_id)

    items = []
    for wallet in wallets:
        balances = await wallet_service.calculate_balance(db, wallet.id)
        items.append(WalletResponse(
            id=wallet.id,
            owner_type=wallet.owner_type,
            owner_id=wallet.owner_id,
            wallet_type=wallet.wallet_type,
            display_name=wallet.display_name,
            stripe_account_status=wallet.stripe_account_status,
            bank_last_four=wallet.bank_last_four,
            bank_name=wallet.bank_name,
            onboarding_completed=wallet.onboarding_completed,
            charges_enabled=wallet.charges_enabled,
            payouts_enabled=wallet.payouts_enabled,
            is_active=wallet.is_active,
            is_ready_for_payments=wallet.is_ready_for_payments,
            is_ready_for_payouts=wallet.is_ready_for_payouts,
            current_balance=balances["current_balance"],
            available_balance=balances["available_balance"],
            created_at=wallet.created_at,
            updated_at=wallet.updated_at,
        ))

    return WalletListResponse(items=items, total=len(items))


# ============================================================================
# Parameterized wallet routes (/{wallet_id}/...) - MUST be after static paths
# ============================================================================

@router.get("/{wallet_id}")
async def get_wallet(
    wallet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WalletResponse:
    """Get wallet by ID."""
    wallet = await wallet_service.get_wallet_by_id(db, wallet_id)

    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )

    # Check access - user must own the wallet
    if wallet.owner_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    balances = await wallet_service.calculate_balance(db, wallet.id)

    return WalletResponse(
        id=wallet.id,
        owner_type=wallet.owner_type,
        owner_id=wallet.owner_id,
        wallet_type=wallet.wallet_type,
        display_name=wallet.display_name,
        stripe_account_status=wallet.stripe_account_status,
        bank_last_four=wallet.bank_last_four,
        bank_name=wallet.bank_name,
        onboarding_completed=wallet.onboarding_completed,
        charges_enabled=wallet.charges_enabled,
        payouts_enabled=wallet.payouts_enabled,
        is_active=wallet.is_active,
        is_ready_for_payments=wallet.is_ready_for_payments,
        is_ready_for_payouts=wallet.is_ready_for_payouts,
        current_balance=balances["current_balance"],
        available_balance=balances["available_balance"],
        created_at=wallet.created_at,
        updated_at=wallet.updated_at,
    )


@router.get("/{wallet_id}/balance")
async def get_wallet_balance(
    wallet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WalletBalanceResponse:
    """Get detailed wallet balance breakdown."""
    wallet = await wallet_service.get_wallet_by_id(db, wallet_id)

    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")

    if wallet.owner_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    balances = await wallet_service.calculate_balance(db, wallet_id)

    return WalletBalanceResponse(
        wallet_id=wallet_id,
        current_balance=balances["current_balance"],
        available_balance=balances["available_balance"],
        pending_balance=balances["pending_balance"],
        held_balance=balances["held_balance"],
    )


# ============================================================================
# Stripe Connect Onboarding
# ============================================================================

# Deprecated 2026-04-16 (Wave 4-Alt) — Stripe Connect onboarding has been
# retired. CommonGround now uses Stripe Issuing: parents fund obligations
# with their existing debit/credit card, and a virtual card is auto-issued
# on full funding. There is no parent KYC flow. Existing Connect accounts
# remain readable via GET endpoints; this create path is disabled.
@router.post("/{wallet_id}/onboarding", deprecated=True)
async def start_onboarding(
    wallet_id: str,
    data: WalletOnboardingRequest = WalletOnboardingRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WalletOnboardingResponse:
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail=(
            "Stripe Connect onboarding has been retired. CommonGround now "
            "uses Stripe Issuing — no parent onboarding required. Fund "
            "obligations with your debit/credit card and a virtual card "
            "will be issued automatically."
        ),
    )


@router.post("/{wallet_id}/sync")
async def sync_wallet(
    wallet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sync wallet with Stripe account status.

    Call this after returning from onboarding to update status.
    """
    wallet = await wallet_service.get_wallet_by_id(db, wallet_id)

    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")

    if wallet.owner_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if not wallet.stripe_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe account. Start onboarding first."
        )

    try:
        result = await wallet_service.sync_stripe_account(db, wallet)
        await db.commit()
        return result
    except Exception as e:
        await db.rollback()
        logger.exception(f"Failed to sync wallet: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync wallet."
        )


# ============================================================================
# Deposits (Fund Wallet)
# ============================================================================

@router.post("/{wallet_id}/deposit")
async def deposit_funds(
    wallet_id: str,
    data: DepositCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> DepositResponse:
    """
    Deposit funds to wallet via card or ACH.

    Amount will be added to wallet balance after payment succeeds.
    Stripe fees are deducted from the deposit amount.
    """
    wallet = await wallet_service.get_wallet_by_id(db, wallet_id)

    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")

    if wallet.owner_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    try:
        transaction = await wallet_service.deposit_funds(
            db=db,
            wallet=wallet,
            amount=data.amount,
            payment_method=data.payment_method,
            payment_method_id=data.payment_method_id,
            idempotency_key=data.idempotency_key,
        )
        await db.commit()

        # Check if 3D Secure or additional action required
        requires_action = transaction.extra_data.get("requires_action", False) if transaction.extra_data else False
        client_secret = transaction.extra_data.get("client_secret") if transaction.extra_data else None

        return DepositResponse(
            transaction_id=transaction.id,
            wallet_id=wallet_id,
            amount=transaction.amount,
            fee_amount=transaction.fee_amount,
            net_amount=transaction.net_amount,
            payment_method=data.payment_method,
            status=transaction.status,
            stripe_payment_intent_id=transaction.stripe_payment_intent_id,
            client_secret=client_secret,
            requires_action=requires_action,
            created_at=transaction.created_at,
        )
    except ValueError as e:
        await db.rollback()
        logger.error(f"Deposit validation failed: {e}")
        capture_error(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An error occurred while processing your request.")
    except Exception as e:
        await db.rollback()
        logger.exception(f"Deposit failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Deposit failed."
        )


@router.post("/{wallet_id}/deposit/{transaction_id}/confirm")
async def confirm_deposit(
    wallet_id: str,
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> DepositResponse:
    """
    Confirm a deposit after 3D Secure authentication.

    Call this after stripe.confirmCardPayment() succeeds on the frontend.
    This checks the payment status with Stripe and updates the transaction.
    """
    wallet = await wallet_service.get_wallet_by_id(db, wallet_id)

    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")

    if wallet.owner_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    try:
        # Get the transaction
        from sqlalchemy import select
        from app.models.wallet import WalletTransaction

        result = await db.execute(
            select(WalletTransaction).where(WalletTransaction.id == transaction_id)
        )
        transaction = result.scalar_one_or_none()

        if not transaction:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

        if transaction.wallet_id != wallet_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Transaction does not belong to this wallet")

        # If already completed, just return current state
        if transaction.status == "completed":
            return DepositResponse(
                transaction_id=transaction.id,
                wallet_id=wallet_id,
                amount=transaction.amount,
                fee_amount=transaction.fee_amount,
                net_amount=transaction.net_amount,
                payment_method="card",
                status=transaction.status,
                stripe_payment_intent_id=transaction.stripe_payment_intent_id,
                client_secret=None,
                requires_action=False,
                created_at=transaction.created_at,
            )

        # Check with Stripe and complete if successful
        if transaction.stripe_payment_intent_id:
            transaction = await wallet_service.complete_deposit(
                db, transaction_id, transaction.stripe_payment_intent_id
            )
            await db.commit()

        return DepositResponse(
            transaction_id=transaction.id,
            wallet_id=wallet_id,
            amount=transaction.amount,
            fee_amount=transaction.fee_amount,
            net_amount=transaction.net_amount,
            payment_method="card",
            status=transaction.status,
            stripe_payment_intent_id=transaction.stripe_payment_intent_id,
            client_secret=None,
            requires_action=False,
            created_at=transaction.created_at,
        )
    except ValueError as e:
        await db.rollback()
        logger.error(f"Payment confirmation validation failed: {e}")
        capture_error(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An error occurred while processing your request.")
    except Exception as e:
        await db.rollback()
        logger.exception(f"Payment confirmation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Confirmation failed."
        )


# ============================================================================
# Transactions History
# ============================================================================

@router.get("/{wallet_id}/transactions")
async def get_transactions(
    wallet_id: str,
    transaction_type: Optional[str] = Query(None, description="Filter by type"),
    transaction_status: Optional[str] = Query(None, alias="status", description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> TransactionListResponse:
    """Get paginated transaction history for a wallet."""
    wallet = await wallet_service.get_wallet_by_id(db, wallet_id)

    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")

    if wallet.owner_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    transactions, total = await wallet_service.get_transactions(
        db=db,
        wallet_id=wallet_id,
        transaction_type=transaction_type,
        status=transaction_status,
        page=page,
        page_size=page_size,
    )

    return TransactionListResponse(
        items=[
            TransactionResponse(
                id=t.id,
                wallet_id=t.wallet_id,
                transaction_type=t.transaction_type,
                amount=t.amount,
                currency=t.currency,
                description=t.description,
                status=t.status,
                fee_amount=t.fee_amount,
                net_amount=t.net_amount,
                balance_after=t.balance_after,
                obligation_id=t.obligation_id,
                payout_id=t.payout_id,
                stripe_payment_intent_id=t.stripe_payment_intent_id,
                created_at=t.created_at,
                completed_at=t.completed_at,
            )
            for t in transactions
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


# ============================================================================
# Analytics
# ============================================================================

@router.get("/{wallet_id}/analytics")
async def get_wallet_analytics(
    wallet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WalletAnalytics:
    """Get wallet analytics for dashboard."""
    wallet = await wallet_service.get_wallet_by_id(db, wallet_id)

    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")

    if wallet.owner_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    analytics = await wallet_service.get_wallet_analytics(db, wallet_id)

    return WalletAnalytics(**analytics)
