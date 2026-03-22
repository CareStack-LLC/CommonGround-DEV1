"""
Chatbot models for the public-facing Aria customer success chatbot.

Stores anonymous visitor info, chat sessions, and message history
for review in the SuperAdmin portal.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class ChatbotVisitor(Base, UUIDMixin, TimestampMixin):
    """Anonymous visitor who interacted with the chatbot."""

    __tablename__ = "chatbot_visitors"

    name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False, default="")
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    source_page: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    sessions: Mapped[List["ChatbotSession"]] = relationship(
        "ChatbotSession", back_populates="visitor", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_chatbot_visitors_email", "email"),
    )


class ChatbotSession(Base, UUIDMixin, TimestampMixin):
    """A single chatbot conversation session."""

    __tablename__ = "chatbot_sessions"

    visitor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("chatbot_visitors.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    message_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    escalated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    escalation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    transcript_emailed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # Relationships
    visitor: Mapped["ChatbotVisitor"] = relationship(
        "ChatbotVisitor", back_populates="sessions"
    )
    messages: Mapped[List["ChatbotMessage"]] = relationship(
        "ChatbotMessage", back_populates="session", cascade="all, delete-orphan",
        order_by="ChatbotMessage.created_at"
    )

    __table_args__ = (
        Index("ix_chatbot_sessions_visitor_id", "visitor_id"),
        Index("ix_chatbot_sessions_status", "status"),
        Index("ix_chatbot_sessions_started_at", "started_at"),
    )


class ChatbotMessage(Base, UUIDMixin, TimestampMixin):
    """Individual message within a chatbot session."""

    __tablename__ = "chatbot_messages"

    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("chatbot_sessions.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user, assistant, system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    session: Mapped["ChatbotSession"] = relationship(
        "ChatbotSession", back_populates="messages"
    )

    __table_args__ = (
        Index("ix_chatbot_messages_session_id", "session_id"),
    )


class ChatbotConfig(Base, UUIDMixin, TimestampMixin):
    """Admin-editable chatbot configuration (system prompt, promotions, etc.)."""

    __tablename__ = "chatbot_config"

    key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    __table_args__ = (
        Index("ix_chatbot_config_key", "key", unique=True),
    )
