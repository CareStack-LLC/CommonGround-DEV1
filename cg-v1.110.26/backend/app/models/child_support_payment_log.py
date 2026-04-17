"""
Wave 4-Alt — Child Support Payment Log.

Parents pay child support directly to their state SDU (see
`app/services/sdu_registry.py`). CommonGround does NOT touch the money.
When a parent completes a payment on the SDU portal, they return and
log it here so the other parent + court see the timeline.

Lifecycle:
    created (parent says "I paid") → verified_by_receipt (optional,
    if they upload proof) → contested (other parent disputes)
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class ChildSupportPaymentLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "child_support_payment_logs"

    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )

    # Optional link to a recurring obligation that defines the schedule.
    obligation_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("obligations.id"), nullable=True, index=True
    )

    # Who logged the payment (almost always the payer).
    logged_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True
    )
    # Who actually sent the money (may differ from logger when an
    # admin or professional is entering historical records).
    payer_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))

    # State + optional county — mirrors sdu_registry keys.
    state_code: Mapped[str] = mapped_column(String(2))
    county: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    payment_date: Mapped[datetime] = mapped_column(DateTime, index=True)

    # Confirmation number / reference from the SDU portal. When blank
    # we flag the log as unverified.
    confirmation_number: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True, index=True
    )

    # Optional link to an uploaded receipt (Supabase Storage path, etc.)
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Was it actually paid through the SDU, or some other channel?
    # When 'informal' (parent paid off-platform / direct) we flag that
    # on court exports so the distinction is visible.
    payment_channel: Mapped[str] = mapped_column(
        String(20), default="sdu"
    )  # sdu | informal

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Verification lifecycle — contested payments keep the row but
    # mark it so reviewers see the disagreement.
    status: Mapped[str] = mapped_column(
        String(20), default="logged", index=True
    )  # logged | verified | contested | voided
    contested_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    contested_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    contested_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_cs_payment_logs_family_date", "family_file_id", "payment_date"),
    )
