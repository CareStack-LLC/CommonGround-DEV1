"""
Wave 4-Alt — Recurring Parent Card.

A monthly-refilled virtual card issued via Stripe Issuing, representing
a parent's "shared expenses" allowance (school supplies, activities,
transport, etc.). One row per parent per family file.

Card lifecycle:
    1. Parent requests the card from their family-file dashboard.
    2. Platform creates (or reuses) a Stripe Issuing cardholder tied to
       the parent's user profile.
    3. A virtual card is issued with `monthly_limit_amount` spending
       limit and an MCC allowlist drawn from `allowed_mccs` (falls back
       to `mcc_mapping.DEFAULT_MCCS` when empty).
    4. Scheduler at month-end: funds the card balance for next cycle and
       resets `current_cycle_spent`.

This model does NOT hold the money — that sits on the platform Issuing
balance at Stripe. These rows are our operational view + audit trail.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, JSON, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class RecurringParentCard(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "recurring_parent_cards"

    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE")
    )
    parent_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))

    stripe_cardholder_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stripe_card_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    monthly_limit_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    current_cycle_spent: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal(0))

    # Optional per-card override. Null = fall back to category-wide MCCs
    # from mcc_mapping (currently the DEFAULT_MCCS set).
    allowed_mccs: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    cycle_start: Mapped[datetime] = mapped_column(DateTime)
    cycle_end: Mapped[datetime] = mapped_column(DateTime)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    __table_args__ = (
        Index(
            "ix_recurring_parent_cards_family_parent",
            "family_file_id",
            "parent_user_id",
        ),
    )
