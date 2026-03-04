"""
Time Block model - Availability constraints or busy windows.
Time blocks are NOT events - they mark time as unavailable for scheduling.
"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.my_time_collection import MyTimeCollection


class TimeBlock(Base, UUIDMixin, TimestampMixin):
    """
    Availability constraint or busy window.

    Purpose:
    - Help parents organize their schedule
    - Enable ARIA conflict detection
    - Inform scheduling suggestions

    Privacy:
    - All fields are PRIVATE to the owner
    - Other parent NEVER sees time block details
    - Only displayed as neutral "busy" on calendar
    - Used by ARIA for conflict warnings (without revealing why)

    MVP Recurrence:
    - One-off: is_recurring=False
    - Daily: recurrence_pattern="daily", recurrence_end_date
    - Weekly: recurrence_pattern="weekly", recurrence_days=[0,1,2,3,4] (Mon-Fri)
    """

    __tablename__ = "time_blocks"

    # Collection link
    collection_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("my_time_collections.id"),
        index=True
    )

    # Time window details (PRIVATE to owner)
    title: Mapped[str] = mapped_column(String(200))  # "Work Hours", "Class Time"
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timing
    start_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    all_day: Mapped[bool] = mapped_column(Boolean, default=False)

    # Simple recurrence (MVP - daily/weekly only)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_pattern: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True
    )  # "daily", "weekly"
    recurrence_days: Mapped[Optional[list]] = mapped_column(
        JSON,
        nullable=True
    )  # For weekly: [0,1,2,3,4] = Mon-Fri (0=Monday, 6=Sunday)
    recurrence_end_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    collection: Mapped["MyTimeCollection"] = relationship(
        "MyTimeCollection",
        back_populates="time_blocks"
    )

    def __repr__(self) -> str:
        recur = f" (recurring {self.recurrence_pattern})" if self.is_recurring else ""
        return f"<TimeBlock '{self.title}'{recur} {self.start_time} - {self.end_time}>"
