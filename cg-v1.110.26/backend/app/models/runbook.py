"""Ops runbooks — structured playbooks for incident response.

A runbook captures the steps an on-call admin should take when a specific
condition fires. Alert rules can reference a runbook so notifications include
a direct link to the relevant steps.
"""

from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


# Canonical categories surfaced in the UI filter. Anything else is allowed
# in the DB but groups under "other" in the UI.
RUNBOOK_CATEGORIES = ("incident", "maintenance", "escalation", "postmortem", "other")


class Runbook(Base, UUIDMixin, TimestampMixin):
    """A single runbook. `steps_json` holds an ordered array of steps;
    each step is {"title": str, "body": str, "expected_outcome": str}."""

    __tablename__ = "runbooks"

    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), default="incident", nullable=False)
    # Markdown summary shown at the top of the runbook — "when to use this"
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Ordered list of steps — see module docstring for shape.
    steps_json: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Free-form additional context (SLAs, escalation contacts, dashboards, etc.)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    owner_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    # Tag array — e.g. ["billing", "stripe", "webhook"]
    tags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<Runbook {self.title} [{self.category}]>"
