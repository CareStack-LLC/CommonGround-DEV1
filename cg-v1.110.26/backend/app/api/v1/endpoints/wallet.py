"""
Wallet API endpoints - Parent and child wallet management with Stripe Connect.

Endpoints for managing wallets, deposits, obligation payments, payouts,
and child wallet contributions.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
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

router = APIRouter()


# ============================================================================
# Parent Wallet Endpoints
# ============================================================================

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_wallet(
    data: WalletCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WalletResponse:
    """
    Create a parent wallet for the current user.

    Creates a wallet record and prepares for Stripe Connect onboarding.
    The wallet is not active until Stripe onboarding is completed.
    """
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


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

@router.post("/{wallet_id}/onboarding")
async def start_onboarding(
    wallet_id: str,
    data: WalletOnboardingRequest = WalletOnboardingRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WalletOnboardingResponse:
    """
    Start or resume Stripe Connect onboarding.

    Returns a URL for the user to complete account setup.
    The URL expires in 5 minutes.
    """
    wallet = await wallet_service.get_wallet_by_id(db, wallet_id)

    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")

    if wallet.owner_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if wallet.onboarding_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Onboarding already completed"
        )

    try:
        url, expires_at = await wallet_service.start_stripe_onboarding(
            db=db,
            wallet=wallet,
            email=current_user.email,
            refresh_url=data.refresh_url,
            return_url=data.return_url,
        )
        await db.commit()

        return WalletOnboardingResponse(
            wallet_id=wallet_id,
            onboarding_url=url,
            expires_in_minutes=5,
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start onboarding: {str(e)}"
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync: {str(e)}"
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deposit failed: {str(e)}"
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Confirmation failed: {str(e)}"
        )


# ============================================================================
# Obligation Payments
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment failed: {str(e)}"
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
# Payouts
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
# Child Wallet Endpoints
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


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
            idempotency_key=data.idempotency_key,
        )
        await db.commit()

        requires_action = contribution.extra_data.get("requires_action", False) if contribution.extra_data else False
        client_secret = contribution.extra_data.get("client_secret") if contribution.extra_data else None

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
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Contribution failed: {str(e)}"
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


# ============================================================================
# Family Wallets
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
