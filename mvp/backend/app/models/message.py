"""
Message models - communication between parents with ARIA integration.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class MessageThread(Base, UUIDMixin, TimestampMixin):
    """
    Message thread - groups related messages together.
    """

    __tablename__ = "message_threads"

    # Case link (legacy - being phased out)
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)

    # Agreement link (primary - messages belong to a specific SharedCare Agreement)
    agreement_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("agreements.id"), index=True, nullable=True
    )

    # Thread info
    subject: Mapped[str] = mapped_column(String(200))
    thread_type: Mapped[str] = mapped_column(
        String(50), default="general"
    )  # general, schedule_change, expense, child_info

    # Status
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Participants
    participant_ids: Mapped[list] = mapped_column(JSON)  # List of user IDs

    # Last activity
    last_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    message_count: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="thread", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<MessageThread {self.subject}>"


class Message(Base, UUIDMixin, TimestampMixin):
    """
    Message - immutable communication record.

    Messages cannot be edited or deleted once sent.
    """

    __tablename__ = "messages"

    # Links - at least one of case_id or family_file_id should be set
    case_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("cases.id"), index=True, nullable=True
    )  # Court case context (legacy)
    family_file_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True, nullable=True
    )  # Family file context (preferred)
    thread_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("message_threads.id"), index=True, nullable=True
    )
    # Agreement link (primary - messages belong to a specific SharedCare Agreement)
    agreement_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("agreements.id"), index=True, nullable=True
    )

    # Sender/recipient
    sender_id: Mapped[str] = mapped_column(String(36), index=True)  # User ID
    recipient_id: Mapped[str] = mapped_column(String(36), index=True)  # User ID

    # Content
    content: Mapped[str] = mapped_column(Text)
    content_hash: Mapped[str] = mapped_column(String(64))  # SHA-256 for verification

    # Metadata
    message_type: Mapped[str] = mapped_column(
        String(50), default="text"
    )  # text, voice, request

    # Attachments
    has_attachments: Mapped[bool] = mapped_column(Boolean, default=False)
    attachment_urls: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Status
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # User actions
    is_hidden_by_sender: Mapped[bool] = mapped_column(Boolean, default=False)
    is_hidden_by_recipient: Mapped[bool] = mapped_column(Boolean, default=False)
    is_starred_by_sender: Mapped[bool] = mapped_column(Boolean, default=False)
    is_starred_by_recipient: Mapped[bool] = mapped_column(Boolean, default=False)

    # ARIA integration
    was_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    original_content: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # If user modified after ARIA suggestion

    # Relationships
    case: Mapped[Optional["Case"]] = relationship("Case", back_populates="messages")
    family_file: Mapped[Optional["FamilyFile"]] = relationship("FamilyFile", back_populates="messages")
    thread: Mapped[Optional["MessageThread"]] = relationship("MessageThread", back_populates="messages")
    flags: Mapped[list["MessageFlag"]] = relationship(
        "MessageFlag", back_populates="message", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Message from {self.sender_id} at {self.sent_at}>"


class MessageFlag(Base, UUIDMixin, TimestampMixin):
    """
    ARIA flag on a message - tracks interventions and user responses.
    """

    __tablename__ = "message_flags"

    # Link to message
    message_id: Mapped[str] = mapped_column(String(36), ForeignKey("messages.id"), index=True)

    # ARIA analysis
    toxicity_score: Mapped[float] = mapped_column(Float)  # 0.0 to 1.0
    severity: Mapped[str] = mapped_column(
        String(20)
    )  # low, medium, high, severe

    # Categories detected
    categories: Mapped[list] = mapped_column(JSON)  # List of detected issues
    # e.g., ["hostility", "blame", "all_caps"]

    # Original and suggested content
    original_content_hash: Mapped[str] = mapped_column(String(64))
    suggested_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suggested_content_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # User response
    user_action: Mapped[str] = mapped_column(
        String(20)
    )  # accepted, modified, rejected, held
    user_action_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Final content (what was actually sent)
    final_content_hash: Mapped[str] = mapped_column(String(64))

    # Metadata
    intervention_level: Mapped[int] = mapped_column(Integer)  # 1-4 (gentle to block)
    intervention_message: Mapped[str] = mapped_column(Text)  # What ARIA showed the user

    # Analytics
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    message: Mapped["Message"] = relationship("Message", back_populates="flags")

    def __repr__(self) -> str:
        return f"<MessageFlag {self.severity} on {self.message_id}>"

    @property
    def was_improved(self) -> bool:
        """Check if user accepted or modified (improved) the message."""
        return self.user_action in ["accepted", "modified"]
