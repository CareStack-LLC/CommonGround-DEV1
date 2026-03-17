"""
CircleMessage model for standalone text messaging between children, parents, and circle contacts.

All messages are analyzed by ARIA child-safety monitoring before delivery.
Messages form a unified communication system independent of video/voice call sessions.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, Integer, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class SenderType:
    """Valid sender/recipient types for circle messages."""
    CHILD = "child"
    PARENT_A = "parent_a"
    PARENT_B = "parent_b"
    CIRCLE_CONTACT = "circle_contact"


class CircleMessage(Base, UUIDMixin, TimestampMixin):
    """
    CircleMessage - Standalone text messages between children and their circle.

    Supports child ↔ circle contacts, child ↔ parents communication.
    All messages are analyzed by ARIA for child safety before display.
    Flagged messages are stored for parent review; severe messages are hidden.
    """

    __tablename__ = "circle_messages"

    # Family context
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id", ondelete="CASCADE"), index=True
    )

    # Sender info
    sender_id: Mapped[str] = mapped_column(String(36), index=True)
    sender_type: Mapped[str] = mapped_column(String(20))  # child, parent_a, parent_b, circle_contact
    sender_name: Mapped[str] = mapped_column(String(100))

    # Recipient info
    recipient_id: Mapped[str] = mapped_column(String(36), index=True)
    recipient_type: Mapped[str] = mapped_column(String(20))  # child, parent_a, parent_b, circle_contact

    # Message content
    content: Mapped[str] = mapped_column(Text)
    original_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Stored if ARIA modifies

    # ARIA child-safety analysis
    aria_analyzed: Mapped[bool] = mapped_column(Boolean, default=False)
    aria_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    aria_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    aria_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    aria_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Delivery status
    is_delivered: Mapped[bool] = mapped_column(Boolean, default=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False)  # Hidden due to severe ARIA flag

    # Timestamps
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    family_file = relationship("FamilyFile")
    child = relationship("Child")

    # Indexes for efficient queries
    __table_args__ = (
        Index("ix_circle_messages_conversation", "child_id", "sender_id", "recipient_id", "sent_at"),
        Index("ix_circle_messages_family_time", "family_file_id", "child_id", "sent_at"),
        Index("ix_circle_messages_flagged", "family_file_id", "aria_flagged"),
        Index("ix_circle_messages_unread", "recipient_id", "is_read", "is_hidden"),
    )

    def __repr__(self) -> str:
        flag_status = " [FLAGGED]" if self.aria_flagged else ""
        hidden_status = " [HIDDEN]" if self.is_hidden else ""
        return f"<CircleMessage from {self.sender_name} ({self.sender_type}){flag_status}{hidden_status}>"

    def mark_read(self) -> None:
        """Mark message as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.utcnow()
