"""
CircleParentMessage — dedicated async text thread between a parent and a
circle contact.

Unlike `CircleMessage` (child ↔ contact), this model is scoped to the
parent-coordination channel: a circle contact asking the parent "can I take
Mia to a movie Saturday?" without routing through the child. The thread is
always 1:1 between one parent user and one CircleContact, scoped to the
family file.

All messages pass through ARIA before save. If ARIA flags a message as
SEVERE, `content` is replaced with a placeholder and the raw text is
preserved in `original_content` for moderation.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin


class CircleParentMessage(Base, UUIDMixin):
    """
    CircleParentMessage — one message in a parent ↔ circle-contact thread.

    `sender_type` is "parent" or "contact". A thread is uniquely identified
    by (circle_contact_id, parent_user_id).
    """

    __tablename__ = "circle_parent_messages"

    # Thread keys
    family_file_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("family_files.id", ondelete="CASCADE"),
        index=True,
    )
    circle_contact_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("circle_contacts.id", ondelete="CASCADE"),
        index=True,
    )
    parent_user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )

    # "parent" or "contact"
    sender_type: Mapped[str] = mapped_column(String(20))

    # Content (Text for headroom; schema layer caps length)
    content: Mapped[str] = mapped_column(Text)
    original_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ARIA analysis — lightweight shape, mirrors ParentChildMessage
    aria_flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    aria_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Read tracking
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Timestamp (indexed for ORDER BY)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )

    # Relationships
    family_file = relationship("FamilyFile")
    circle_contact = relationship("CircleContact")
    parent_user = relationship("User", foreign_keys=[parent_user_id])

    __table_args__ = (
        Index(
            "ix_circle_parent_messages_contact_time",
            "circle_contact_id",
            "created_at",
        ),
        Index(
            "ix_circle_parent_messages_parent_time",
            "parent_user_id",
            "created_at",
        ),
    )

    def __repr__(self) -> str:
        flag = " [FLAGGED]" if self.aria_flagged else ""
        return (
            f"<CircleParentMessage {self.sender_type} "
            f"contact={self.circle_contact_id} parent={self.parent_user_id}{flag}>"
        )

    def mark_read(self) -> None:
        """Mark this message as read by the recipient."""
        if self.read_at is None:
            self.read_at = datetime.utcnow()
