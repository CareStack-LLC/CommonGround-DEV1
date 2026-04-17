"""
Customer Success intervention record — SuperAdmin tool.

Records an outreach action (email, call, in-app nudge, meeting) taken by
the CommonGround CS team toward a specific user. Admins use these to
track follow-ups and outcomes on at-risk accounts.

Before this table existed, interventions were stored in an in-memory
Python list in `admin_cs.py`, which meant every backend restart wiped
the entire history. This table is the persistence layer for that data.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class CSInterventionStatus:
    """Lifecycle sentinel values."""

    OPEN = "open"
    IN_PROGRESS = "in_progress"
    CLOSED = "closed"


class CSInterventionOutcome:
    """Common outcomes; admins may record any string."""

    RESOLVED = "resolved"
    NO_RESPONSE = "no_response"
    ESCALATED = "escalated"
    CHURNED = "churned"


class CSIntervention(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "cs_interventions"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    channel: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    follow_up_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    outcome: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=CSInterventionStatus.OPEN
    )
    created_by: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
    )
