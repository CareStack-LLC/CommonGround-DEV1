"""Bug triage sprint models for automated Sentry issue management."""

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class BugTriageSprint(Base, UUIDMixin, TimestampMixin):
    """A bug triage sprint plan generated from Sentry issues."""

    __tablename__ = "bug_triage_sprints"

    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, active, completed
    summary_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    sprint_plan_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ai_analysis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolution_notes_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # per-item fix notes on close

    def __repr__(self) -> str:
        return f"<BugTriageSprint {self.period_start} - {self.period_end} ({self.status})>"
