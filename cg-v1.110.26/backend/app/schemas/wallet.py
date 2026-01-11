"""
Wallet schemas - Pydantic models for wallet API operations.

Parent wallets via Stripe Connect and child wallets as internal ledgers.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.wallet import (
    WALLET_TYPES,
    OWNER_TYPES,
    TRANSACTION_TYPES,
    PAYMENT_SOURCES,
    PAYOUT_STATUSES,
)


# ============================================================================
# Wallet Schemas
# ============================================================================

class WalletCreate(BaseModel):
    """Create wallet request."""

    family_file_id: Optional[str] = Field(None, description="Family file context")


class WalletOnboardingRequest(BaseModel):
    """Request to start/resume Stripe Connect onboarding."""

    refresh_url: Optional[str] = Field(
        None, description="URL to redirect if onboarding link expires"
    )
    return_url: Optional[str] = Field(
        None, description="URL to redirect after onboarding completes"
    )


class WalletOnboardingResponse(BaseModel):
    """Stripe Connect onboarding response."""

    wallet_id: str
    onboarding_url: str
    expires_in_minutes: int = Field(5, description="Link expires in 5 minutes")


class WalletBalanceResponse(BaseModel):
    """Wallet balance summary."""

    wallet_id: str
    current_balance: Decimal = Field(..., description="Total balance from completed transactions")
    available_balance: Decimal = Field(..., description="Balance available for payments")
    pending_balance: Decimal = Field(..., description="Pending deposits/withdrawals")
    held_balance: Decimal = Field(..., description="Balance held for pending obligations")


class WalletResponse(BaseModel):
    """Wallet response with balance."""

    id: str
    owner_type: str
    owner_id: str
    wallet_type: str
    display_name: Optional[str] = None
    stripe_account_status: Optional[str] = None
    bank_last_four: Optional[str] = None
    bank_name: Optional[str] = None
    onboarding_completed: bool
    charges_enabled: bool
    payouts_enabled: bool
    is_active: bool
    is_ready_for_payments: bool
    is_ready_for_payouts: bool
    current_balance: Decimal
    available_balance: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WalletListResponse(BaseModel):
    """List of wallets."""

    items: List[WalletResponse]
    total: int


# ============================================================================
# Transaction Schemas
# ============================================================================

class DepositCreate(BaseModel):
    """Deposit funds to wallet."""

    amount: Decimal = Field(..., gt=0, le=10000, description="Amount to deposit ($0.01 - $10,000)")
    payment_method: str = Field(..., description="Payment method: card or ach")
    payment_method_id: str = Field(..., description="Stripe payment method ID")
    save_payment_method: bool = Field(False, description="Save payment method for future use")
    idempotency_key: Optional[str] = Field(None, description="Idempotency key to prevent duplicates")

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, v: str) -> str:
        if v not in ["card", "ach"]:
            raise ValueError("Payment method must be 'card' or 'ach'")
        return v


class DepositResponse(BaseModel):
    """Deposit response."""

    transaction_id: str
    wallet_id: str
    amount: Decimal
    fee_amount: Decimal
    net_amount: Decimal
    payment_method: str
    status: str
    stripe_payment_intent_id: str
    client_secret: Optional[str] = Field(
        None, description="Client secret for frontend to complete payment"
    )
    requires_action: bool = Field(False, description="Requires additional action (3D Secure, etc.)")
    created_at: datetime


class WithdrawCreate(BaseModel):
    """Withdraw funds from wallet to bank."""

    amount: Decimal = Field(..., gt=0, description="Amount to withdraw")
    idempotency_key: Optional[str] = Field(None, description="Idempotency key")


class WithdrawResponse(BaseModel):
    """Withdrawal response."""

    transaction_id: str
    wallet_id: str
    amount: Decimal
    status: str
    stripe_payout_id: Optional[str] = None
    estimated_arrival: Optional[datetime] = None
    created_at: datetime


class TransactionResponse(BaseModel):
    """Wallet transaction response."""

    id: str
    wallet_id: str
    transaction_type: str
    amount: Decimal
    currency: str
    description: str
    status: str
    fee_amount: Decimal
    net_amount: Decimal
    balance_after: Optional[Decimal] = None
    obligation_id: Optional[str] = None
    payout_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    """Paginated transaction list."""

    items: List[TransactionResponse]
    total: int
    page: int
    page_size: int


class TransactionFilters(BaseModel):
    """Filters for transaction list."""

    transaction_type: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


# ============================================================================
# Obligation Payment Schemas
# ============================================================================

class ObligationPaymentCreate(BaseModel):
    """Pay obligation from wallet or direct payment."""

    obligation_id: str = Field(..., description="Obligation to pay")
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    payment_source: str = Field(..., description="Payment source: wallet, card, or ach")
    payment_method_id: Optional[str] = Field(
        None, description="Stripe payment method ID (required for card/ach)"
    )
    idempotency_key: Optional[str] = Field(None, description="Idempotency key")

    @field_validator("payment_source")
    @classmethod
    def validate_payment_source(cls, v: str) -> str:
        if v not in PAYMENT_SOURCES:
            raise ValueError(f"Payment source must be one of: {', '.join(PAYMENT_SOURCES)}")
        return v

    @model_validator(mode="after")
    def validate_payment_method(self):
        """Ensure payment_method_id is provided for card/ach payments."""
        if self.payment_source in ["card", "ach"] and not self.payment_method_id:
            raise ValueError("payment_method_id is required for card and ach payments")
        return self


class ObligationPaymentResponse(BaseModel):
    """Obligation payment response."""

    id: str
    obligation_id: str
    payer_id: str
    amount: Decimal
    payment_source: str
    status: str
    wallet_transaction_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    client_secret: Optional[str] = Field(
        None, description="Client secret for frontend to complete payment"
    )
    requires_action: bool = Field(False, description="Requires additional action")
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ObligationFundingStatusResponse(BaseModel):
    """Obligation funding status with wallet payments."""

    obligation_id: str
    total_amount: Decimal
    amount_funded: Decimal
    amount_remaining: Decimal
    funding_percentage: float
    is_fully_funded: bool
    payments: List[ObligationPaymentResponse]


# ============================================================================
# Child Wallet Contribution Schemas
# ============================================================================

class ChildContributionCreate(BaseModel):
    """Guest contribution to child wallet."""

    child_id: str = Field(..., description="Child to contribute to")
    amount: Decimal = Field(..., gt=0, le=1000, description="Contribution amount ($0.01 - $1,000)")
    contributor_name: str = Field(..., min_length=2, max_length=200, description="Contributor name")
    contributor_email: str = Field(..., description="Email for receipt")
    purpose: Optional[str] = Field(None, max_length=500, description="What's this for?")
    message: Optional[str] = Field(None, max_length=1000, description="Personal message to child")
    payment_method_id: str = Field(..., description="Stripe payment method ID")
    idempotency_key: Optional[str] = Field(None, description="Idempotency key")

    @field_validator("contributor_email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Invalid email address")
        return v.lower()


class ChildContributionResponse(BaseModel):
    """Child wallet contribution response."""

    id: str
    child_wallet_id: str
    child_id: str
    contributor_name: str
    contributor_email: str
    amount: Decimal
    fee_amount: Decimal
    net_amount: Decimal
    purpose: Optional[str] = None
    message: Optional[str] = None
    status: str
    stripe_payment_intent_id: str
    client_secret: Optional[str] = Field(
        None, description="Client secret for frontend to complete payment"
    )
    requires_action: bool = Field(False, description="Requires additional action")
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChildContributionListResponse(BaseModel):
    """List of contributions to child wallet."""

    items: List[ChildContributionResponse]
    total: int
    page: int
    page_size: int


class ChildWalletResponse(BaseModel):
    """Child wallet summary."""

    wallet_id: str
    child_id: str
    child_name: str
    balance: Decimal
    total_received: Decimal
    contribution_count: int
    recent_contributions: List[ChildContributionResponse]


# ============================================================================
# Payout Schemas
# ============================================================================

class PayoutResponse(BaseModel):
    """Payout response."""

    id: str
    obligation_id: str
    recipient_wallet_id: str
    recipient_user_id: str
    gross_amount: Decimal
    fee_amount: Decimal
    net_amount: Decimal
    status: str
    requires_approval: bool
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    stripe_transfer_id: Optional[str] = None
    initiated_at: datetime
    completed_at: Optional[datetime] = None
    estimated_arrival: Optional[datetime] = None

    class Config:
        from_attributes = True


class PayoutListResponse(BaseModel):
    """List of payouts."""

    items: List[PayoutResponse]
    total: int
    page: int
    page_size: int


class PayoutFilters(BaseModel):
    """Filters for payout list."""

    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class PayoutApproveRequest(BaseModel):
    """Request to approve a payout."""

    payout_id: str = Field(..., description="Payout to approve")


# ============================================================================
# Analytics Schemas
# ============================================================================

class WalletAnalytics(BaseModel):
    """Wallet analytics for dashboard."""

    wallet_id: str
    period_start: datetime
    period_end: datetime

    # Totals
    total_deposits: Decimal
    total_payments: Decimal
    total_payouts_received: Decimal
    total_fees: Decimal

    # Counts
    deposit_count: int
    payment_count: int
    payout_count: int

    # Averages
    average_deposit: Decimal
    average_payment: Decimal

    # Current state
    current_balance: Decimal
    pending_obligations: int
    pending_obligations_amount: Decimal


class ClearFundAnalyticsWithWallets(BaseModel):
    """Combined ClearFund analytics with wallet data."""

    # Obligation metrics
    total_obligations: int
    obligations_by_status: dict
    total_amount: Decimal
    amount_funded: Decimal
    amount_pending: Decimal
    funding_rate: float

    # Wallet metrics
    total_wallet_payments: int
    total_direct_payments: int
    wallet_payment_amount: Decimal
    direct_payment_amount: Decimal
    wallet_usage_rate: float

    # Payout metrics
    total_payouts: int
    payouts_completed: int
    payouts_pending: int
    total_payout_amount: Decimal

    # Time series (optional)
    daily_fundings: Optional[List[dict]] = None
    daily_payouts: Optional[List[dict]] = None


# ============================================================================
# Webhook Schemas
# ============================================================================

class StripeWebhookEvent(BaseModel):
    """Stripe webhook event wrapper."""

    id: str
    type: str
    data: dict
    created: int
    livemode: bool


class WebhookHandlerResponse(BaseModel):
    """Response from webhook handler."""

    success: bool
    event_type: str
    message: Optional[str] = None
    processed_at: datetime
