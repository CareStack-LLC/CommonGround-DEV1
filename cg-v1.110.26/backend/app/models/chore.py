"""
Wave 3 C2 — Chores / Tasks models.

Chores let parents assign tasks to a child with an optional reward amount
that gets credited to the child's wallet when the parent approves the
completed work. Lifecycle:

    pending  →  completed (child marks)  →  approved (parent + wallet credit)
                                         ↘  rejected (parent sends back)

Keeping the scope tight on purpose: no recurrence, no multi-assignee, no
dependency graphs. Those can layer on later without a breaking change.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class ChoreStatus:
    """String sentinel values — kept out of an enum so admin tools can
    inspect/filter by text without importing SQLAlchemy types."""

    PENDING = "pending"
    COMPLETED = "completed"  # child says done, awaiting parent review
    APPROVED = "approved"    # parent approved; reward paid (if any)
    REJECTED = "rejected"    # parent sent back for redo
    CANCELLED = "cancelled"


class Chore(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "chores"

    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id", ondelete="CASCADE"), index=True
    )
    assigned_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True
    )

    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Monetary reward in USD. Null = no wallet credit on approval.
    reward_amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(20), default=ChoreStatus.PENDING, index=True
    )

    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )

    # When parent rejects, we store their feedback so the child can see
    # *why* it needs redoing. Cleared on re-completion.
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Prevents approving a chore twice (defensive; status should already guard).
    reward_credited: Mapped[bool] = mapped_column(Boolean, default=False)

    # Optional proof-of-completion photo the child can attach when marking
    # the chore done. Stored in the private `chore-proofs` Supabase bucket.
    # All four fields move together — set on /complete, cleared on /cancel
    # or chore deletion (best-effort storage cleanup logged on failure).
    completion_photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    completion_photo_bucket: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    completion_photo_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Optional free-text note the child leaves alongside the photo
    # (e.g. "did dishes AND floor").
    completion_note: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
