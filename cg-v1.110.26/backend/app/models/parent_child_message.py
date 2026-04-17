"""
ParentChildMessage model — persistent async text thread between parents and children.

Unlike KidComsMessage, which is scoped to an ACTIVE video-call session, this
model stores a standalone, always-available parent↔child inbox. A parent can
text their child at any time; the child sees the message in KidSpace the next
time they log in. All messages are analyzed by ARIA for child safety.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin


class ParentChildMessage(Base, UUIDMixin):
    """
    ParentChildMessage — one message in a persistent parent↔child thread.

    Polymorphic sender: `sender_type` is "parent" or "child" and `sender_id`
    points to either User.id (parent) or Child.id (child). Messages belong to
    a single family_file_id + child_id thread.

    All messages are analyzed by ARIA before being displayed. If a message is
    flagged at SEVERE severity, `content` is replaced with a placeholder and
    the raw text is preserved in `original_content` for parent review.
    """

    __tablename__ = "parent_child_messages"

    # Thread keys
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id", ondelete="CASCADE"), index=True
    )

    # Polymorphic sender
    sender_id: Mapped[str] = mapped_column(String(36), index=True)  # User.id OR Child.id
    sender_type: Mapped[str] = mapped_column(String(20))  # "parent" | "child"
    sender_name: Mapped[str] = mapped_column(String(200))

    # Content (length-limited at schema layer; Text-equivalent here for headroom)
    content: Mapped[str] = mapped_column(String(2000))
    original_content: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)

    # ARIA analysis
    aria_analyzed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    aria_flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    aria_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    aria_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    aria_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    aria_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Read state
    read_by_recipient: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )

    # Relationships
    family_file = relationship("FamilyFile")
    child = relationship("Child")

    __table_args__ = (
        Index(
            "ix_parent_child_messages_thread_time",
            "family_file_id",
            "child_id",
            "created_at",
        ),
    )

    def __repr__(self) -> str:
        flag_status = " [FLAGGED]" if self.aria_flagged else ""
        return (
            f"<ParentChildMessage {self.sender_type}={self.sender_name} "
            f"→ child={self.child_id}{flag_status}>"
        )
