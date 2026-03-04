"""
Subscription models for CommonGround pricing tiers and nonprofit grants.

This module contains models for:
- SubscriptionPlan: Defines available plans (Starter, Plus, Family+)
- GrantCode: Nonprofit promo codes that unlock paid tiers
- GrantRedemption: Tracks grant code usage by users
- ClearFundFee: Tracks per-payout fees for free tier users
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


# Subscription tier codes
SUBSCRIPTION_TIERS = ["starter", "plus", "family_plus"]

# Subscription statuses
SUBSCRIPTION_STATUSES = ["trial", "active", "past_due", "cancelled", "grant"]

# Grant code statuses
GRANT_STATUSES = ["active", "expired", "exhausted", "revoked"]

# ClearFund fee statuses
FEE_STATUSES = ["pending", "collected", "waived", "failed"]


class SubscriptionPlan(Base, UUIDMixin, TimestampMixin):
    """
    Defines available subscription plans.

    This is reference data that should be seeded, not user-created.
    Plans: starter (free), plus ($12/mo), family_plus ($25/mo)
    """

    __tablename__ = "subscription_plans"

    # Plan identification
    plan_code: Mapped[str] = mapped_column(
        String(30), unique=True, index=True, nullable=False
    )  # "starter", "plus", "family_plus"

    # Stripe integration
    stripe_product_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )  # prod_xxx
    stripe_price_id_monthly: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )  # price_xxx (monthly)
    stripe_price_id_annual: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )  # price_xxx (annual)

    # Display
    display_name: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    badge: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True
    )  # e.g., "Most Popular"

    # Pricing (in USD)
    price_monthly: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0.00"), nullable=False
    )
    price_annual: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0.00"), nullable=False
    )

    # Feature flags and limits (JSON structure)
    features: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Trial days for this plan (0 for free tier)
    trial_days: Mapped[int] = mapped_column(Integer, default=14, nullable=False)

    def __repr__(self) -> str:
        return f"<SubscriptionPlan {self.plan_code} (${self.price_monthly}/mo)>"


class GrantCode(Base, UUIDMixin, TimestampMixin):
    """
    Nonprofit promo codes that unlock paid tiers for free.

    Used for the DV nonprofit partnership program ("Safe Handoff Grant").
    Codes can be time-limited and/or usage-limited.
    """

    __tablename__ = "grant_codes"

    # Code (unique, uppercase)
    code: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )  # e.g., "SAFEHAVEN2025"

    # What plan does this grant?
    granted_plan_code: Mapped[str] = mapped_column(
        String(30), default="plus", nullable=False
    )  # Usually "plus"

    # Nonprofit information
    nonprofit_name: Mapped[str] = mapped_column(String(200), nullable=False)
    nonprofit_contact_email: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    nonprofit_website: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Validity period
    valid_from: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    valid_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )  # None = no expiration

    # Usage limits
    max_redemptions: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )  # None = unlimited
    redemption_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )

    # Duration of grant for each user (days)
    grant_duration_days: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )  # None = lifetime

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Internal notes (admin only)
    internal_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    redemptions: Mapped[list["GrantRedemption"]] = relationship(
        "GrantRedemption", back_populates="grant_code", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<GrantCode {self.code} ({self.nonprofit_name})>"

    @property
    def is_valid(self) -> bool:
        """Check if grant code is currently valid."""
        now = datetime.utcnow()

        if not self.is_active:
            return False

        if now < self.valid_from:
            return False

        if self.valid_until and now > self.valid_until:
            return False

        if self.max_redemptions and self.redemption_count >= self.max_redemptions:
            return False

        return True


class GrantRedemption(Base, UUIDMixin, TimestampMixin):
    """
    Tracks grant code redemptions by users.

    Links a user to a grant code and tracks the grant period.
    """

    __tablename__ = "grant_redemptions"

    # Foreign keys
    grant_code_id: Mapped[str] = mapped_column(
        ForeignKey("grant_codes.id"), index=True, nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=False
    )

    # Grant period
    granted_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )  # None = lifetime grant

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    revocation_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    grant_code: Mapped["GrantCode"] = relationship(
        "GrantCode", back_populates="redemptions"
    )
    user: Mapped["User"] = relationship("User", back_populates="grant_redemptions")

    def __repr__(self) -> str:
        return f"<GrantRedemption user={self.user_id} code={self.grant_code_id}>"

    @property
    def is_valid(self) -> bool:
        """Check if this grant redemption is still active."""
        if not self.is_active:
            return False

        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False

        return True


class ClearFundFee(Base, UUIDMixin, TimestampMixin):
    """
    Tracks $1.50 per-payout fees for free tier users.

    Free tier users pay a fee on each ClearFund payout.
    Plus and Family+ users are exempt from this fee.
    """

    __tablename__ = "clearfund_fees"

    # Links
    payout_id: Mapped[str] = mapped_column(
        ForeignKey("payouts.id"), index=True, nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=False
    )

    # Fee details
    fee_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("1.50"), nullable=False
    )

    # Stripe payment
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    stripe_charge_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )  # pending, collected, waived, failed
    collected_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    waived_reason: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Relationships
    payout: Mapped["Payout"] = relationship("Payout", back_populates="fee")
    user: Mapped["User"] = relationship("User", back_populates="clearfund_fees")

    def __repr__(self) -> str:
        return f"<ClearFundFee ${self.fee_amount} ({self.status})>"


# Import at end to avoid circular imports
from app.models.user import User  # noqa: E402
from app.models.wallet import Payout  # noqa: E402
