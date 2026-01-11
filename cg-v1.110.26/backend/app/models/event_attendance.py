"""
Event Attendance model - Court-grade attendance tracking for events.
Records invitation, RSVP, and actual attendance per parent.
"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.schedule import ScheduleEvent
    from app.models.user import User


class EventAttendance(Base, UUIDMixin, TimestampMixin):
    """
    Court-grade attendance tracking for events.

    MVP Features:
    - Invitation tracking (Required/Optional/Not invited)
    - RSVP tracking (Going/Not going/Maybe/No response)

    Deferred to V2:
    - GPS check-in/check-out
    - Show status (showed_up, no_show, late, left_early)
    - Evidence upload (photos, documents)
    - Timeliness tracking

    One attendance record per parent per event.
    """

    __tablename__ = "event_attendance"

    # Event and parent
    event_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("schedule_events.id"),
        index=True
    )
    parent_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        index=True
    )

    # Invitation
    invited_role: Mapped[str] = mapped_column(
        String(20),
        default="optional"
    )  # "required", "optional", "not_invited"
    invited_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # RSVP (MVP feature)
    rsvp_status: Mapped[str] = mapped_column(
        String(20),
        default="no_response"
    )  # "going", "not_going", "maybe", "no_response"
    rsvp_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    rsvp_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    event: Mapped["ScheduleEvent"] = relationship(
        "ScheduleEvent",
        back_populates="attendance_records"
    )
    parent: Mapped["User"] = relationship("User", foreign_keys=[parent_id])

    # Table constraints
    __table_args__ = (
        UniqueConstraint('event_id', 'parent_id', name='uq_event_attendance_parent'),
    )

    def __repr__(self) -> str:
        return f"<EventAttendance event={self.event_id} parent={self.parent_id} rsvp={self.rsvp_status}>"
