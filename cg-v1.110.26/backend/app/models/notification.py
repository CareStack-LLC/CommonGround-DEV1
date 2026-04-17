"""
Notification model for in-app + email notifications.

Stores a per-user notification inbox. Each row represents a single
notification delivered to one user. Email delivery is tracked via
``email_sent`` / ``email_sent_at`` so we can retry or audit.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


class NotificationType(str, Enum):
    """Types of notifications surfaced in the in-app inbox."""

    PARENT_CHILD_MESSAGE = "parent_child_message"
    CIRCLE_CONTACT_MESSAGE = "circle_contact_message"
    KIDCOMS_CALL = "kidcoms_call"
    ARIA_INTERVENTION = "aria_intervention"
    CIRCLE_INVITE = "circle_invite"
    WALLET_GIFT = "wallet_gift"
    CIRCLE_CONTRIBUTION = "circle_contribution"
    CHORE_COMPLETED = "chore_completed"
    REWARD_REDEEMED = "reward_redeemed"
    AGREEMENT_CHANGE = "agreement_change"
    EXCHANGE_REMINDER = "exchange_reminder"
    OTHER = "other"


class Notification(Base, UUIDMixin):
    """
    Notification - a single in-app notification delivered to a user.

    One row per recipient. Fan-out (one sender -> N recipients) is handled
    by ``NotificationService.create_bulk``.
    """

    __tablename__ = "notifications"

    # Recipient
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Optional scoping to a family file (for filtering in the UI)
    family_file_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("family_files.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Notification classification (string-backed enum; see NotificationType)
    notification_type: Mapped[str] = mapped_column(
        String(50), default=NotificationType.OTHER.value
    )

    # Content
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(String(1000))
    action_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Per-type extra data (message_id, session_id, etc.)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Read tracking
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Email delivery tracking
    email_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    email_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Created timestamp (indexed for ORDER BY)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    __table_args__ = (
        Index("ix_notifications_user_unread", "user_id", "is_read"),
        Index("ix_notifications_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<Notification {self.id} user={self.user_id} "
            f"type={self.notification_type} read={self.is_read}>"
        )

    def mark_read(self) -> None:
        """Mark this notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.utcnow()
