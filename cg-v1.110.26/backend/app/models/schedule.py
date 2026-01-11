"""
Schedule and exchange models - parenting time tracking.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class ScheduleEvent(Base, UUIDMixin, TimestampMixin):
    """
    Schedule event - parenting time, exchanges, holidays.

    MVP Updates:
    - Added collection_id for My Time Collections
    - Added created_by to track event creator
    - Added visibility for privacy control
    - Added location_shared for location privacy
    - Added attendance_records relationship
    """

    __tablename__ = "schedule_events"

    # Case or Family File - at least one should be set
    case_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("cases.id"), index=True, nullable=True
    )  # Court case context (legacy)
    family_file_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True, nullable=True
    )  # Family file context (preferred for new events)

    # Collection
    collection_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("my_time_collections.id"),
        nullable=True,
        index=True
    )

    # Event creator (for privacy filtering)
    created_by: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    # Event type
    event_type: Mapped[str] = mapped_column(
        String(50)
    )  # regular, holiday, vacation, makeup, special

    # Event category (V2 - category-specific forms)
    event_category: Mapped[str] = mapped_column(
        String(50),
        default="general"
    )  # general, medical, school, sports, exchange
    category_data: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True
    )  # Category-specific fields as JSON

    # Timing
    start_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    all_day: Mapped[bool] = mapped_column(Boolean, default=False)

    # Custody
    custodial_parent_id: Mapped[str] = mapped_column(String(36))  # User ID
    transition_from_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    transition_to_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Children involved
    child_ids: Mapped[list] = mapped_column(JSON)  # List of child IDs

    # Details
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    # Privacy settings (MVP)
    visibility: Mapped[str] = mapped_column(
        String(20),
        default="co_parent"
    )  # "private" or "co_parent"
    location_shared: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )  # Share location with co-parent

    # Exchange information (if this is a transition)
    is_exchange: Mapped[bool] = mapped_column(Boolean, default=False)
    exchange_location: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    exchange_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    exchange_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    grace_period_minutes: Mapped[int] = mapped_column(Integer, default=15)

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default="scheduled"
    )  # scheduled, completed, cancelled, no_show

    # Cancellation
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    cancelled_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Agreement link
    agreement_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    is_agreement_derived: Mapped[bool] = mapped_column(
        Boolean, default=False
    )  # Auto-generated from agreement

    # Modifications
    is_modification: Mapped[bool] = mapped_column(Boolean, default=False)
    modification_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    modification_requested_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    modification_approved_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="schedule_events")
    collection: Mapped[Optional["MyTimeCollection"]] = relationship(
        "MyTimeCollection",
        back_populates="events",
        foreign_keys=[collection_id]
    )
    creator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by])
    check_ins: Mapped[list["ExchangeCheckIn"]] = relationship(
        "ExchangeCheckIn", back_populates="event", cascade="all, delete-orphan"
    )
    attendance_records: Mapped[list["EventAttendance"]] = relationship(
        "EventAttendance", back_populates="event", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ScheduleEvent {self.title} on {self.start_time}>"


class ExchangeCheckIn(Base, UUIDMixin, TimestampMixin):
    """
    Check-in record for exchanges - proves arrival time and location.
    """

    __tablename__ = "exchange_check_ins"

    # Link to event
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("schedule_events.id"), index=True)

    # Who checked in
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    parent_role: Mapped[str] = mapped_column(String(20))  # dropping_off, picking_up

    # When
    checked_in_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    scheduled_time: Mapped[datetime] = mapped_column(DateTime)

    # Location verification
    check_in_method: Mapped[str] = mapped_column(
        String(20)
    )  # gps, manual, third_party
    location_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    location_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    location_accuracy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # meters

    # Timeliness
    minutes_early_late: Mapped[int] = mapped_column(Integer, default=0)  # negative = early
    is_on_time: Mapped[bool] = mapped_column(Boolean, default=True)
    is_within_grace: Mapped[bool] = mapped_column(Boolean, default=True)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    issues_reported: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Children
    children_present: Mapped[list] = mapped_column(JSON)  # List of child IDs present

    # Verification
    verification_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    verified_by_other_parent: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    event: Mapped["ScheduleEvent"] = relationship("ScheduleEvent", back_populates="check_ins")

    def __repr__(self) -> str:
        return f"<ExchangeCheckIn by {self.user_id} at {self.checked_in_at}>"
