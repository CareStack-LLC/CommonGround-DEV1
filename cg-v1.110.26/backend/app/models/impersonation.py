"""Admin impersonation audit trail.

Every time a superadmin uses "View as this user," a session row is created.
All downstream AuditLog rows during that session get `real_sub=superadmin_id`
+ `act_as=target_id` so accountability is preserved.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class ImpersonationSession(Base, UUIDMixin, TimestampMixin):
    """A single impersonation session — started when an admin acts-as a user.

    Lifecycle:
      1. Admin clicks "View as this user" → POST /admin/users/{id}/impersonate
         creates this row with started_at=now(), ended_at=NULL
      2. During the session, every auditable action increments action_count
      3. Admin clicks "End impersonation" → POST /admin/impersonate/end
         stamps ended_at and finalizes the row
    """

    __tablename__ = "impersonation_sessions"

    superadmin_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True, nullable=False,
    )
    superadmin_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    target_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True, nullable=False,
    )
    target_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    started_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False,
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    # User clicking End, automatic timeout, or logout — tracked for audit clarity
    end_reason: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    # One of: "admin_ended", "timeout", "logout", "token_expired"

    action_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Why the superadmin entered impersonation — shown in the audit viewer

    def __repr__(self) -> str:
        return (
            f"<ImpersonationSession admin={self.superadmin_email} "
            f"target={self.target_email} actions={self.action_count}>"
        )
