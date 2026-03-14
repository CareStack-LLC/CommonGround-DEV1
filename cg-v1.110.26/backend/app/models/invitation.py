"""
Case invitation and event tracking models.

Implements the 5 critical fixes from the Invitation Flow Spec:
1. Attorney-branded invitation emails
2. Magic link authentication
3. Single-parent activation
4. Real-time attorney status via case events
5. Automated follow-up tracking
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class InvitationStatus(str, Enum):
    """Status of a case invitation."""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    ACTIVATED = "activated"
    EXPIRED = "expired"
    BOUNCED = "bounced"
    RESENT = "resent"


class InvitationSource(str, Enum):
    """Who initiated the invitation."""
    PARENT = "parent"
    ATTORNEY = "attorney"
    SYSTEM = "system"


class CaseEventType(str, Enum):
    """Types of case events for real-time attorney status."""
    INVITATION_SENT = "invitation_sent"
    INVITATION_DELIVERED = "invitation_delivered"
    INVITATION_OPENED = "invitation_opened"
    INVITATION_CLICKED = "invitation_clicked"
    INVITATION_BOUNCED = "invitation_bounced"
    INVITATION_RESENT = "invitation_resent"
    CLIENT_REGISTERED = "client_registered"
    CLIENT_ACTIVATED = "client_activated"
    COPARENT_INVITED = "coparent_invited"
    COPARENT_ACTIVATED = "coparent_activated"
    BOTH_PARENTS_ACTIVE = "both_parents_active"
    FIRST_MESSAGE_SENT = "first_message_sent"
    AGREEMENT_STARTED = "agreement_started"


class CaseInvitation(Base, UUIDMixin, TimestampMixin):
    """
    Tracks individual invitations sent to parents.

    Each invitation has a unique secure token for magic link auth,
    SendGrid message ID for delivery tracking, and status progression.
    """

    __tablename__ = "case_invitations"

    # Who is being invited
    invitee_email: Mapped[str] = mapped_column(String(255), index=True)
    invitee_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    invitee_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Link to family file (if created)
    family_file_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("family_files.id"), nullable=True, index=True
    )

    # Who sent the invitation
    invited_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True
    )
    invitation_source: Mapped[str] = mapped_column(
        String(20), default=InvitationSource.PARENT.value
    )

    # Attorney branding (Fix #1)
    attorney_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    attorney_firm: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    attorney_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Secure token for magic link (Fix #2)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    token_expires_at: Mapped[datetime] = mapped_column(DateTime)

    # Status tracking
    status: Mapped[str] = mapped_column(
        String(20), default=InvitationStatus.PENDING.value, index=True
    )

    # SendGrid tracking (Fix #5)
    sendgrid_message_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    clicked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    bounced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    bounce_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Activation tracking
    activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    activated_user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )

    # Auto follow-up tracking (Fix #5)
    resend_count: Mapped[int] = mapped_column(Integer, default=0)
    last_resent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    auto_resend_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # Role in the family file
    parent_role: Mapped[str] = mapped_column(
        String(20), default="parent_b"
    )  # parent_a or parent_b

    # Relationships
    inviter: Mapped["User"] = relationship(
        "User", foreign_keys=[invited_by], backref="sent_invitations"
    )
    activated_user: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[activated_user_id], backref="accepted_invitations"
    )

    def __repr__(self) -> str:
        return f"<CaseInvitation {self.invitee_email} ({self.status})>"

    @property
    def is_expired(self) -> bool:
        """Check if invitation token has expired."""
        return datetime.utcnow() > self.token_expires_at

    @property
    def can_resend(self) -> bool:
        """Check if invitation can be resent (max 3 resends)."""
        return self.resend_count < 3 and self.status not in [
            InvitationStatus.ACTIVATED.value,
            InvitationStatus.BOUNCED.value,
        ]


class CaseEvent(Base, UUIDMixin, TimestampMixin):
    """
    Real-time case events for attorney status dashboard (Fix #4).

    Uses Supabase Realtime on this table so attorneys see live
    status updates without polling.
    """

    __tablename__ = "case_events"

    # Link to family file
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True
    )

    # Event details
    event_type: Mapped[str] = mapped_column(String(50), index=True)
    event_data: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )

    # Who triggered the event
    actor_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    actor_type: Mapped[str] = mapped_column(
        String(20), default="system"
    )  # parent, attorney, system

    # Related invitation (if applicable)
    invitation_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("case_invitations.id"), nullable=True
    )

    def __repr__(self) -> str:
        return f"<CaseEvent {self.event_type} for {self.family_file_id}>"
