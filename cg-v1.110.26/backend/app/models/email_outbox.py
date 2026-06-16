"""
EmailOutbox - durable spillover queue for critical transactional emails.

Rows are inserted by EmailService._send_email when a critical email
(tagged with an outbox_category) exhausts its in-process retries.
A scheduler job re-sends pending rows with exponential backoff and
dead-letters after EMAIL_OUTBOX_MAX_ATTEMPTS.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class OutboxStatus:
    PENDING = "pending"
    SENT = "sent"
    DEAD = "dead"


class EmailOutbox(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "email_outbox"

    to_email: Mapped[str] = mapped_column(String(320), nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    # Rendered HTML is stored (template contexts are not reliably
    # JSON-serializable — they contain datetimes/models).
    html_body: Mapped[str] = mapped_column(Text, nullable=False)
    from_name_override: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=OutboxStatus.PENDING
    )
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    next_attempt_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sendgrid_message_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_email_outbox_status_next_attempt", "status", "next_attempt_at"),
    )

    def __repr__(self) -> str:
        return f"<EmailOutbox {self.id} {self.category} -> {self.to_email} ({self.status})>"
