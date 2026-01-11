"""Schedule schemas for request/response validation."""

from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ========== MY TIME COLLECTION SCHEMAS ==========

class MyTimeCollectionCreate(BaseModel):
    """Create a new My Time collection."""

    case_id: str
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#3B82F6", pattern=r"^#[0-9A-Fa-f]{6}$")
    is_default: bool = False


class MyTimeCollectionUpdate(BaseModel):
    """Update a My Time collection."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    is_default: Optional[bool] = None


class MyTimeCollectionResponse(BaseModel):
    """My Time collection response (privacy filtered)."""

    id: str
    case_id: Optional[str] = None  # Optional - can be None for family-file-only collections
    family_file_id: Optional[str] = None  # Optional - for family file context
    owner_id: str
    name: str  # Filtered for non-owners
    color: str  # Filtered for non-owners
    is_default: bool
    is_active: bool
    display_order: int
    is_owner: bool  # Whether viewer owns this collection
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ========== TIME BLOCK SCHEMAS ==========

class TimeBlockCreate(BaseModel):
    """Create a new time block."""

    collection_id: str
    title: str = Field(..., min_length=1, max_length=200)
    start_time: datetime
    end_time: datetime
    all_day: bool = False
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = Field(None, pattern=r"^(daily|weekly)$")
    recurrence_days: Optional[List[int]] = Field(None, description="0=Mon, 6=Sun")
    recurrence_end_date: Optional[date] = None
    notes: Optional[str] = None


class TimeBlockUpdate(BaseModel):
    """Update a time block."""

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None


class TimeBlockResponse(BaseModel):
    """Time block response."""

    id: str
    collection_id: str
    title: str
    start_time: datetime
    end_time: datetime
    all_day: bool
    is_recurring: bool
    recurrence_pattern: Optional[str]
    recurrence_days: Optional[List[int]]
    recurrence_end_date: Optional[date]
    notes: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ========== EVENT ATTENDANCE SCHEMAS ==========

class EventAttendanceCreate(BaseModel):
    """Create event attendance (invitation)."""

    parent_id: str
    invited_role: str = Field(default="optional", pattern=r"^(required|optional|not_invited)$")


class EventAttendanceUpdate(BaseModel):
    """Update RSVP status."""

    rsvp_status: str = Field(..., pattern=r"^(going|not_going|maybe|no_response)$")
    rsvp_note: Optional[str] = None


class EventAttendanceResponse(BaseModel):
    """Event attendance response."""

    id: str
    event_id: str
    parent_id: str
    invited_role: str
    invited_at: datetime
    rsvp_status: str
    rsvp_at: Optional[datetime]
    rsvp_note: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ========== SCHEDULE EVENT SCHEMAS (UPDATED) ==========

class ScheduleEventCreate(BaseModel):
    """Create a new schedule event."""

    collection_id: str
    agreement_id: Optional[str] = None  # SharedCare Agreement context
    title: str = Field(..., min_length=1)
    start_time: datetime
    end_time: datetime
    child_ids: List[str]
    description: Optional[str] = None
    location: Optional[str] = None
    location_shared: bool = False
    visibility: str = Field(default="co_parent", pattern=r"^(private|co_parent)$")
    all_day: bool = False
    attendance_invites: Optional[List[Dict[str, str]]] = None  # [{parent_id, invited_role}]
    # V2: Event category for specialized forms
    event_category: str = Field(
        default="general",
        pattern=r"^(general|medical|school|sports|exchange)$"
    )
    category_data: Optional[Dict[str, Any]] = None  # Category-specific fields


class ScheduleEventUpdate(BaseModel):
    """Update a schedule event."""

    title: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    location_shared: Optional[bool] = None
    # V2: Event category for specialized forms
    event_category: Optional[str] = Field(
        None,
        pattern=r"^(general|medical|school|sports|exchange)$"
    )
    category_data: Optional[Dict[str, Any]] = None


class ScheduleEventResponse(BaseModel):
    """Schedule event response (privacy filtered)."""

    id: str
    case_id: Optional[str] = None  # Court case context (legacy)
    family_file_id: Optional[str] = None  # Family file context
    collection_id: Optional[str] = None
    agreement_id: Optional[str] = None  # SharedCare Agreement context
    created_by: Optional[str] = None
    title: str  # Filtered for non-creators
    description: Optional[str] = None  # Filtered
    start_time: datetime
    end_time: datetime
    all_day: bool
    child_ids: List[str]
    location: Optional[str] = None  # Filtered based on location_shared
    visibility: str
    status: str
    is_owner: bool  # Whether viewer created this event
    my_attendance: Optional[Dict[str, str]] = None  # {invited_role, rsvp_status}
    # V2: Event category for specialized forms
    event_category: str = "general"
    category_data: Optional[Dict[str, Any]] = None  # Filtered based on visibility
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExchangeCheckInCreate(BaseModel):
    """Create an exchange check-in."""

    event_id: str
    parent_role: str  # dropping_off, picking_up
    check_in_method: str = "manual"  # gps, manual, third_party
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_accuracy: Optional[float] = None
    notes: Optional[str] = None
    children_present: List[str]


class ExchangeCheckInResponse(BaseModel):
    """Exchange check-in response."""

    id: str
    event_id: str
    user_id: str
    parent_role: str
    checked_in_at: datetime
    scheduled_time: datetime
    check_in_method: str
    location_lat: Optional[float]
    location_lng: Optional[float]
    minutes_early_late: int
    is_on_time: bool
    is_within_grace: bool
    notes: Optional[str]
    children_present: List[str]
    verified_by_other_parent: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ComplianceMetrics(BaseModel):
    """Compliance tracking metrics."""

    user_id: str
    case_id: str
    total_exchanges: int
    on_time_count: int
    late_count: int
    no_show_count: int
    on_time_rate: float
    average_lateness_minutes: float
    trend: str  # improving, stable, worsening
    period_start: datetime
    period_end: datetime


class CalendarEvent(BaseModel):
    """Calendar event for frontend display."""

    id: str
    title: str
    start: datetime
    end: datetime
    all_day: bool
    event_type: str
    custodial_parent: Optional[str] = None  # None for court events
    is_exchange: bool = False
    location: Optional[str] = None
    status: str
    child_names: List[str] = []
    # Court event specific fields
    court_event: bool = False
    is_mandatory: Optional[bool] = None
    my_rsvp_status: Optional[str] = None


class CalendarResponse(BaseModel):
    """Calendar data for a date range."""

    case_id: str
    events: List[CalendarEvent]
    start_date: datetime
    end_date: datetime


class ScheduleGenerationRequest(BaseModel):
    """Request to generate schedule from agreement."""

    agreement_id: str
    start_date: datetime
    end_date: datetime
    include_holidays: bool = True


# ========== CONFLICT DETECTION SCHEMAS ==========

class ConflictCheckRequest(BaseModel):
    """Request to check for scheduling conflicts."""

    case_id: str
    start_time: datetime
    end_time: datetime
    exclude_user_id: Optional[str] = None


class ConflictWarning(BaseModel):
    """ARIA conflict warning (privacy-preserving)."""

    type: str = "time_conflict"
    severity: str = "medium"
    message: str
    suggestion: str
    can_proceed: bool = True


class ConflictCheckResponse(BaseModel):
    """Response from conflict check."""

    has_conflicts: bool
    conflicts: List[ConflictWarning]
    can_proceed: bool


# ========== CALENDAR & BUSY PERIODS ==========

class BusyPeriod(BaseModel):
    """Neutral busy period for calendar display."""

    start_time: datetime
    end_time: datetime
    label: str = "Busy"
    color: str = "#94A3B8"  # Neutral gray
    type: str = "busy"
    details_hidden: bool = True


class CalendarDataRequest(BaseModel):
    """Request calendar data for a date range."""

    case_id: str
    start_date: datetime
    end_date: datetime
    include_busy_periods: bool = True


class CustodyExchangeInstanceForCalendar(BaseModel):
    """Simplified exchange instance for calendar display."""
    id: str
    exchange_id: str
    exchange_type: str  # pickup, dropoff, both
    title: str
    scheduled_time: datetime
    duration_minutes: int
    location: Optional[str] = None
    status: str
    is_owner: bool = False

    model_config = {"from_attributes": True}


class CourtEventForCalendar(BaseModel):
    """Court event for parent calendar display."""

    id: str
    event_type: str
    title: str
    description: Optional[str] = None
    event_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    virtual_link: Optional[str] = None
    is_mandatory: bool = True
    shared_notes: Optional[str] = None
    is_court_event: bool = True
    # RSVP info for current user
    my_rsvp_status: Optional[str] = None
    my_rsvp_required: bool = True
    other_parent_rsvp_status: Optional[str] = None

    model_config = {"from_attributes": True}


class CalendarDataResponse(BaseModel):
    """Combined calendar data response."""

    case_id: str
    events: List[ScheduleEventResponse]
    exchanges: List[CustodyExchangeInstanceForCalendar] = []
    court_events: List[CourtEventForCalendar] = []
    busy_periods: List[BusyPeriod]
    my_collections: List[MyTimeCollectionResponse]
    start_date: datetime
    end_date: datetime
