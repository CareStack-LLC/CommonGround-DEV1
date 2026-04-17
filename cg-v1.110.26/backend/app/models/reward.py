"""
Wave 3 C3 — Rewards store models.

Parents curate a Rewards catalog (e.g. "Ice cream trip — $5", "New Lego set
— $25"). Children spend wallet balance to redeem. A RewardRedemption row
records the request, moves wallet balance on the server side, and tracks
parent fulfillment.

Redemption lifecycle:
    requested  →  fulfilled (parent delivered IRL)
               ↘  cancelled (parent refunds, or auto-refund on stock-out)
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class RedemptionStatus:
    REQUESTED = "requested"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"


class Reward(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "rewards"

    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=False
    )

    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cost_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    image_emoji: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    # Null = unlimited. Tracks available stock. Decrements on redeem.
    stock_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class RewardRedemption(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "reward_redemptions"

    reward_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rewards.id", ondelete="CASCADE"), index=True
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id", ondelete="CASCADE"), index=True
    )
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=False
    )

    # Frozen at redemption time — parents can edit the catalog later without
    # rewriting history.
    cost_at_redemption: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    status: Mapped[str] = mapped_column(
        String(20), default=RedemptionStatus.REQUESTED, index=True
    )

    # Link to the wallet transaction that debited the child's ledger.
    wallet_transaction_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True
    )

    fulfilled_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    fulfilled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
