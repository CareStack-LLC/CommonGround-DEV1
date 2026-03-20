"""Google Workspace email monitoring models."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class MonitoredEmail(Base, UUIDMixin, TimestampMixin):
    """An email fetched from Google Workspace and analyzed by AI."""

    __tablename__ = "monitored_emails"

    gmail_message_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    thread_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    from_email: Mapped[str] = mapped_column(String(320))
    from_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    to_email: Mapped[str] = mapped_column(String(320))
    subject: Mapped[str] = mapped_column(String(1000))
    body_preview: Mapped[str] = mapped_column(String(500))
    body_full: Mapped[str] = mapped_column(Text)
    received_at: Mapped[datetime] = mapped_column(DateTime, index=True)

    is_urgent: Mapped[bool] = mapped_column(Boolean, default=False)
    urgency_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    category: Mapped[str] = mapped_column(String(50), default="other")  # support, sales, partnership, spam, personal, other

    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_draft_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    draft_status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, approved, sent, rejected, skipped
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<MonitoredEmail {self.subject[:50]} from {self.from_email}>"


class EmailDigest(Base, UUIDMixin, TimestampMixin):
    """A periodic digest of monitored emails."""

    __tablename__ = "email_digests"

    period_start: Mapped[datetime] = mapped_column(DateTime)
    period_end: Mapped[datetime] = mapped_column(DateTime)
    total_emails: Mapped[int] = mapped_column(default=0)
    urgent_count: Mapped[int] = mapped_column(default=0)
    summary_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<EmailDigest {self.period_start} - {self.period_end}>"


class GoogleOAuthToken(Base, UUIDMixin, TimestampMixin):
    """Stored OAuth2 refresh token for Gmail API access."""

    __tablename__ = "google_oauth_tokens"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[str] = mapped_column(Text)
    token_expiry: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    scopes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<GoogleOAuthToken {self.email}>"
