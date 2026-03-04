"""
Audit and event logging models for compliance and debugging.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class AuditLog(Base, UUIDMixin, TimestampMixin):
    """
    Audit log - tracks user actions for compliance and security.
    """

    __tablename__ = "audit_logs"

    # Who
    user_id: Mapped[Optional[str]] = mapped_column(String(36), index=True, nullable=True)
    user_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)  # IPv6 compatible
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # What
    action: Mapped[str] = mapped_column(String(100), index=True)
    # e.g., "user.login", "message.send", "agreement.approve", "export.generate"

    resource_type: Mapped[str] = mapped_column(String(50))  # user, case, message, payment, etc.
    resource_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Case context (if applicable)
    case_id: Mapped[Optional[str]] = mapped_column(String(36), index=True, nullable=True)

    # How
    method: Mapped[str] = mapped_column(String(10))  # GET, POST, PUT, DELETE
    endpoint: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Status
    status: Mapped[str] = mapped_column(String(20))  # success, failure, error
    status_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # HTTP status

    # Details
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extra_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Changes (for update/delete actions)
    old_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Error information
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Performance
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Security
    is_suspicious: Mapped[bool] = mapped_column(Boolean, default=False)
    risk_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 0-100

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} by {self.user_email}>"


class EventLog(Base, UUIDMixin, TimestampMixin):
    """
    Event log - immutable ledger of all case events for court evidence.

    This creates a blockchain-like chain of custody.
    """

    __tablename__ = "event_logs"

    # Event identification
    event_type: Mapped[str] = mapped_column(String(100), index=True)
    # e.g., "message.sent", "exchange.completed", "payment.processed"

    # Case context
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)

    # Actor
    actor_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)  # User ID
    actor_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Timestamp (with microsecond precision)
    event_timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Event data (immutable)
    event_data: Mapped[dict] = mapped_column(JSON)

    # Chain of custody (blockchain-like)
    content_hash: Mapped[str] = mapped_column(String(64), index=True)  # SHA-256 of event_data
    previous_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # Links to previous event
    sequence_number: Mapped[int] = mapped_column(Integer, index=True)  # Order within case

    # Verification
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    verification_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Metadata
    source: Mapped[str] = mapped_column(String(50))  # api, system, migration, import
    source_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    # Categories for filtering
    category: Mapped[str] = mapped_column(String(50))  # communication, custody, financial, legal
    severity: Mapped[str] = mapped_column(String(20), default="info")  # info, warning, critical

    # Related entities
    related_user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    related_resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    related_resource_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    def __repr__(self) -> str:
        return f"<EventLog {self.event_type} #{self.sequence_number}>"

    @property
    def can_verify_chain(self) -> bool:
        """Check if this event can be verified in the chain."""
        return self.is_verified and self.content_hash is not None
