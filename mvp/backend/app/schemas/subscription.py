"""
Pydantic schemas for subscription management.

These schemas handle API requests/responses for:
- Subscription plans listing
- Subscription status
- Checkout sessions
- Grant code redemption
"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# =============================================================================
# Subscription Plan Schemas
# =============================================================================


class PlanFeatures(BaseModel):
    """Feature flags for a subscription plan."""

    aria_manual_sentiment: bool = True
    aria_advanced: bool = False
    clearfund_fee_exempt: bool = False
    quick_accords: bool = False
    auto_scheduling: bool = False
    custody_dashboard: bool = False
    pdf_summaries: bool = False
    circle_contacts_limit: int = 0
    kidcoms_access: bool = False
    theater_mode: bool = False
    court_reporting: bool = False
    silent_handoff_gps: bool = True
    timebridge_calendar: bool = True
    timebridge_manual_only: bool = True


class PlanResponse(BaseModel):
    """Subscription plan response schema."""

    id: str
    plan_code: str
    display_name: str
    description: str
    badge: Optional[str] = None

    price_monthly: Decimal
    price_annual: Decimal

    features: Dict[str, Any]
    trial_days: int
    display_order: int

    class Config:
        from_attributes = True


class PlansListResponse(BaseModel):
    """List of subscription plans."""

    plans: List[PlanResponse]


# =============================================================================
# Subscription Status Schemas
# =============================================================================


class SubscriptionStatusResponse(BaseModel):
    """Current subscription status for a user."""

    # Current plan
    tier: str  # "starter", "plus", "family_plus"
    tier_display_name: str  # "Starter", "Plus", "Family+"
    status: str  # "trial", "active", "past_due", "cancelled", "grant"

    # Stripe subscription info (if applicable)
    stripe_subscription_id: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None

    # Grant info (if using grant)
    has_active_grant: bool = False
    grant_nonprofit_name: Optional[str] = None
    grant_expires_at: Optional[datetime] = None

    # Feature access summary
    features: Dict[str, Any]

    # Trial info
    is_trial: bool = False
    trial_ends_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =============================================================================
# Checkout Schemas
# =============================================================================


class CheckoutRequest(BaseModel):
    """Request to create a Stripe Checkout session."""

    plan_code: str = Field(..., description="Plan to subscribe to: 'plus' or 'family_plus'")
    period: str = Field(
        default="monthly",
        description="Billing period: 'monthly' or 'annual'"
    )
    success_url: str = Field(..., description="URL to redirect after successful payment")
    cancel_url: str = Field(..., description="URL to redirect if user cancels")


class CheckoutSessionResponse(BaseModel):
    """Response with Stripe Checkout session."""

    checkout_url: str
    session_id: str


class PortalSessionRequest(BaseModel):
    """Request to create Stripe Customer Portal session."""

    return_url: str = Field(..., description="URL to return to after portal session")


class PortalSessionResponse(BaseModel):
    """Response with Stripe Customer Portal URL."""

    portal_url: str


# =============================================================================
# Subscription Management Schemas
# =============================================================================


class CancelSubscriptionRequest(BaseModel):
    """Request to cancel subscription."""

    reason: Optional[str] = Field(
        None,
        description="Optional reason for cancellation"
    )
    immediate: bool = Field(
        default=False,
        description="If true, cancel immediately. If false, cancel at period end."
    )


class CancelSubscriptionResponse(BaseModel):
    """Response after cancellation."""

    cancelled: bool
    cancel_at: Optional[datetime] = None
    message: str


class ReactivateSubscriptionResponse(BaseModel):
    """Response after reactivating cancelled subscription."""

    reactivated: bool
    message: str


# =============================================================================
# Grant Code Schemas
# =============================================================================


class GrantRedemptionRequest(BaseModel):
    """Request to redeem a nonprofit grant code."""

    code: str = Field(
        ...,
        description="Grant code to redeem (case-insensitive)",
        min_length=3,
        max_length=50
    )


class GrantRedemptionResponse(BaseModel):
    """Response after grant code redemption."""

    success: bool
    message: str

    # Grant details
    nonprofit_name: Optional[str] = None
    granted_tier: Optional[str] = None
    expires_at: Optional[datetime] = None


class GrantStatusResponse(BaseModel):
    """Current grant status for a user."""

    has_active_grant: bool
    grant_code: Optional[str] = None
    nonprofit_name: Optional[str] = None
    granted_tier: Optional[str] = None
    granted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class GrantCodeInfo(BaseModel):
    """Public info about a grant code (for validation)."""

    code: str
    nonprofit_name: str
    granted_tier: str
    is_valid: bool
    reason: Optional[str] = None  # If invalid, why


# =============================================================================
# ClearFund Fee Schemas
# =============================================================================


class ClearFundFeeResponse(BaseModel):
    """ClearFund payout fee information."""

    id: str
    payout_id: str
    fee_amount: Decimal
    status: str  # "pending", "collected", "waived"
    collected_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FeeRequiredResponse(BaseModel):
    """Response when a fee is required for payout."""

    fee_required: bool
    fee_amount: Decimal
    reason: str
    upgrade_prompt: Optional[str] = None


# =============================================================================
# Feature Access Schemas
# =============================================================================


class FeatureAccessResponse(BaseModel):
    """Response for checking feature access."""

    feature: str
    has_access: bool
    current_tier: str
    required_tier: Optional[str] = None
    limit: Optional[int] = None
    upgrade_message: Optional[str] = None


class FeaturesListResponse(BaseModel):
    """List of all features and user's access."""

    tier: str
    features: Dict[str, Any]
