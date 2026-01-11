"""
Activity model for tracking user-visible events in the family file.

This is a lightweight model designed for the dashboard activity feed,
separate from the audit/event logs which are for compliance.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class ActivityType(str, Enum):
    """Types of activities that can be tracked."""

    # Communication
    MESSAGE_SENT = "message_sent"

    # Custody / Children
    CHILD_ADDED = "child_added"
    CHILD_UPDATED = "child_updated"
    CHILD_APPROVED = "child_approved"

    # Schedule / Events
    EVENT_CREATED = "event_created"
    EVENT_UPDATED = "event_updated"
    EVENT_CANCELLED = "event_cancelled"

    # Exchanges
    EXCHANGE_SCHEDULED = "exchange_scheduled"
    EXCHANGE_COMPLETED = "exchange_completed"
    EXCHANGE_CANCELLED = "exchange_cancelled"

    # Agreements (Phase 2)
    AGREEMENT_CREATED = "agreement_created"
    AGREEMENT_UPDATED = "agreement_updated"
    AGREEMENT_SUBMITTED = "agreement_submitted"
    AGREEMENT_APPROVED = "agreement_approved"

    # Financial (Phase 2)
    EXPENSE_REQUESTED = "expense_requested"
    EXPENSE_APPROVED = "expense_approved"

    # System
    INVITATION_SENT = "invitation_sent"
    INVITATION_ACCEPTED = "invitation_accepted"


class ActivityCategory(str, Enum):
    """Categories for grouping and filtering activities."""

    COMMUNICATION = "communication"
    CUSTODY = "custody"
    SCHEDULE = "schedule"
    FINANCIAL = "financial"
    SYSTEM = "system"


class ActivitySeverity(str, Enum):
    """Severity levels for activities."""

    INFO = "info"
    WARNING = "warning"
    URGENT = "urgent"


# Mapping of activity types to their categories
ACTIVITY_CATEGORY_MAP = {
    ActivityType.MESSAGE_SENT: ActivityCategory.COMMUNICATION,
    ActivityType.CHILD_ADDED: ActivityCategory.CUSTODY,
    ActivityType.CHILD_UPDATED: ActivityCategory.CUSTODY,
    ActivityType.CHILD_APPROVED: ActivityCategory.CUSTODY,
    ActivityType.EVENT_CREATED: ActivityCategory.SCHEDULE,
    ActivityType.EVENT_UPDATED: ActivityCategory.SCHEDULE,
    ActivityType.EVENT_CANCELLED: ActivityCategory.SCHEDULE,
    ActivityType.EXCHANGE_SCHEDULED: ActivityCategory.SCHEDULE,
    ActivityType.EXCHANGE_COMPLETED: ActivityCategory.SCHEDULE,
    ActivityType.EXCHANGE_CANCELLED: ActivityCategory.SCHEDULE,
    ActivityType.AGREEMENT_CREATED: ActivityCategory.CUSTODY,
    ActivityType.AGREEMENT_UPDATED: ActivityCategory.CUSTODY,
    ActivityType.AGREEMENT_SUBMITTED: ActivityCategory.CUSTODY,
    ActivityType.AGREEMENT_APPROVED: ActivityCategory.CUSTODY,
    ActivityType.EXPENSE_REQUESTED: ActivityCategory.FINANCIAL,
    ActivityType.EXPENSE_APPROVED: ActivityCategory.FINANCIAL,
    ActivityType.INVITATION_SENT: ActivityCategory.SYSTEM,
    ActivityType.INVITATION_ACCEPTED: ActivityCategory.SYSTEM,
}

# Mapping of activity types to their default icons
ACTIVITY_ICON_MAP = {
    ActivityType.MESSAGE_SENT: "message",
    ActivityType.CHILD_ADDED: "users",
    ActivityType.CHILD_UPDATED: "users",
    ActivityType.CHILD_APPROVED: "check",
    ActivityType.EVENT_CREATED: "calendar",
    ActivityType.EVENT_UPDATED: "calendar",
    ActivityType.EVENT_CANCELLED: "x",
    ActivityType.EXCHANGE_SCHEDULED: "calendar",
    ActivityType.EXCHANGE_COMPLETED: "check",
    ActivityType.EXCHANGE_CANCELLED: "x",
    ActivityType.AGREEMENT_CREATED: "file",
    ActivityType.AGREEMENT_UPDATED: "file",
    ActivityType.AGREEMENT_SUBMITTED: "file",
    ActivityType.AGREEMENT_APPROVED: "check",
    ActivityType.EXPENSE_REQUESTED: "wallet",
    ActivityType.EXPENSE_APPROVED: "check",
    ActivityType.INVITATION_SENT: "mail",
    ActivityType.INVITATION_ACCEPTED: "users",
}


class Activity(Base, UUIDMixin, TimestampMixin):
    """
    Activity - tracks user-visible events in the family file.

    This provides the data for the dashboard's "Recent Activity" feed,
    showing what's happened recently that each parent should know about.
    """

    __tablename__ = "activities"

    # Foreign key to family file
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )

    # What happened
    activity_type: Mapped[str] = mapped_column(String(50), index=True)
    category: Mapped[str] = mapped_column(String(20), index=True)

    # Who did it (nullable for system activities)
    actor_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    actor_name: Mapped[str] = mapped_column(String(100))  # Denormalized for display

    # What was affected
    subject_type: Mapped[str] = mapped_column(String(50))  # message, child, event, etc.
    subject_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    subject_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Display content
    title: Mapped[str] = mapped_column(String(200))  # "Celia updated Terry's medical info"
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(30), default="info")
    severity: Mapped[str] = mapped_column(String(10), default="info")

    # Per-user read tracking (2 parents per family file)
    read_by_parent_a_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    read_by_parent_b_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Additional context data
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    family_file = relationship("FamilyFile", back_populates="activities")

    # Indexes for common queries
    __table_args__ = (
        Index("ix_activities_family_file_created", "family_file_id", "created_at"),
        Index("ix_activities_family_file_type", "family_file_id", "activity_type"),
    )

    def __repr__(self) -> str:
        return f"<Activity {self.activity_type} in {self.family_file_id}>"

    @property
    def is_read_by_parent_a(self) -> bool:
        """Check if parent A has read this activity."""
        return self.read_by_parent_a_at is not None

    @property
    def is_read_by_parent_b(self) -> bool:
        """Check if parent B has read this activity."""
        return self.read_by_parent_b_at is not None

    def is_read_by_user(self, user_id: str, is_parent_a: bool) -> bool:
        """Check if a specific user has read this activity."""
        if is_parent_a:
            return self.is_read_by_parent_a
        return self.is_read_by_parent_b

    def mark_read(self, is_parent_a: bool) -> None:
        """Mark this activity as read by a parent."""
        now = datetime.utcnow()
        if is_parent_a:
            self.read_by_parent_a_at = now
        else:
            self.read_by_parent_b_at = now
