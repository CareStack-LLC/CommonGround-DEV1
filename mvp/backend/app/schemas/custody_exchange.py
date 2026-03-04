"""
Pydantic schemas for CustodyExchange (Pickup/Dropoff).
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class CustodyExchangeCreate(BaseModel):
    """Schema for creating a new custody exchange."""
    case_id: str
    exchange_type: str = Field(
        ...,
        pattern=r"^(pickup|dropoff|both)$",
        description="Type of exchange"
    )
    title: Optional[str] = None

    # Parent involvement
    from_parent_id: Optional[str] = None
    to_parent_id: Optional[str] = None

    # Children involved - simple list (used for pickup or dropoff types)
    child_ids: List[str] = Field(default_factory=list)

    # Children by direction (used when exchange_type="both" to specify per-child direction)
    pickup_child_ids: List[str] = Field(default_factory=list, description="Children being picked up")
    dropoff_child_ids: List[str] = Field(default_factory=list, description="Children being dropped off")

    # Location
    location: Optional[str] = None
    location_notes: Optional[str] = None

    # Timing
    scheduled_time: datetime
    duration_minutes: int = 30

    # Recurrence
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = Field(
        default=None,
        pattern=r"^(weekly|biweekly|monthly|custom)$"
    )
    recurrence_days: Optional[List[int]] = None  # 0=Sun, 1=Mon, etc.
    recurrence_end_date: Optional[datetime] = None

    # Details
    items_to_bring: Optional[str] = None
    special_instructions: Optional[str] = None
    notes_visible_to_coparent: bool = True

    # Silent Handoff settings
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    geofence_radius_meters: int = Field(default=100, ge=25, le=500)
    check_in_window_before_minutes: int = Field(default=30, ge=5, le=120)
    check_in_window_after_minutes: int = Field(default=30, ge=5, le=120)
    silent_handoff_enabled: bool = False
    qr_confirmation_required: bool = False


class CustodyExchangeUpdate(BaseModel):
    """Schema for updating a custody exchange."""
    exchange_type: Optional[str] = Field(
        default=None,
        pattern=r"^(pickup|dropoff|both)$"
    )
    title: Optional[str] = None
    from_parent_id: Optional[str] = None
    to_parent_id: Optional[str] = None
    child_ids: Optional[List[str]] = None
    pickup_child_ids: Optional[List[str]] = None
    dropoff_child_ids: Optional[List[str]] = None
    location: Optional[str] = None
    location_notes: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = Field(
        default=None,
        pattern=r"^(weekly|biweekly|monthly|custom)$"
    )
    recurrence_days: Optional[List[int]] = None
    recurrence_end_date: Optional[datetime] = None
    items_to_bring: Optional[str] = None
    special_instructions: Optional[str] = None
    notes_visible_to_coparent: Optional[bool] = None
    status: Optional[str] = Field(
        default=None,
        pattern=r"^(active|paused|cancelled)$"
    )

    # Silent Handoff settings
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    geofence_radius_meters: Optional[int] = Field(default=None, ge=25, le=500)
    check_in_window_before_minutes: Optional[int] = Field(default=None, ge=5, le=120)
    check_in_window_after_minutes: Optional[int] = Field(default=None, ge=5, le=120)
    silent_handoff_enabled: Optional[bool] = None
    qr_confirmation_required: Optional[bool] = None


class CustodyExchangeResponse(BaseModel):
    """Schema for custody exchange response."""
    id: str
    case_id: str
    created_by: str
    exchange_type: str
    title: Optional[str] = None

    from_parent_id: Optional[str] = None
    to_parent_id: Optional[str] = None
    child_ids: List[str] = Field(default_factory=list)
    pickup_child_ids: List[str] = Field(default_factory=list)
    dropoff_child_ids: List[str] = Field(default_factory=list)

    location: Optional[str] = None
    location_notes: Optional[str] = None

    scheduled_time: datetime
    duration_minutes: int

    is_recurring: bool
    recurrence_pattern: Optional[str] = None
    recurrence_days: Optional[List[int]] = None
    recurrence_end_date: Optional[datetime] = None

    items_to_bring: Optional[str] = None
    special_instructions: Optional[str] = None
    notes_visible_to_coparent: bool

    status: str

    # Silent Handoff settings
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    geofence_radius_meters: int = 100
    check_in_window_before_minutes: int = 30
    check_in_window_after_minutes: int = 30
    silent_handoff_enabled: bool = False
    qr_confirmation_required: bool = False

    # Computed fields
    is_owner: bool = False
    next_occurrence: Optional[datetime] = None
    family_file_id: Optional[str] = None

    # Viewer-perspective fields (adjusted based on who is viewing)
    viewer_role: Optional[str] = None  # "pickup" | "dropoff" | "both" | null
    viewer_pickup_child_ids: List[str] = Field(default_factory=list)
    viewer_dropoff_child_ids: List[str] = Field(default_factory=list)
    other_parent_name: Optional[str] = None
    other_parent_id: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CustodyExchangeInstanceCreate(BaseModel):
    """Schema for creating a specific instance (usually auto-generated)."""
    exchange_id: str
    scheduled_time: datetime
    override_location: Optional[str] = None
    override_time: Optional[datetime] = None
    notes: Optional[str] = None


class CustodyExchangeInstanceUpdate(BaseModel):
    """Schema for updating an instance."""
    status: Optional[str] = Field(
        default=None,
        pattern=r"^(scheduled|completed|missed|cancelled|rescheduled)$"
    )
    override_location: Optional[str] = None
    override_time: Optional[datetime] = None
    notes: Optional[str] = None


class CustodyExchangeInstanceResponse(BaseModel):
    """Schema for instance response."""
    id: str
    exchange_id: str
    scheduled_time: datetime
    status: str

    from_parent_checked_in: bool
    from_parent_check_in_time: Optional[datetime] = None
    to_parent_checked_in: bool
    to_parent_check_in_time: Optional[datetime] = None

    completed_at: Optional[datetime] = None
    notes: Optional[str] = None

    override_location: Optional[str] = None
    override_time: Optional[datetime] = None

    # Silent Handoff - GPS verification data
    from_parent_check_in_lat: Optional[float] = None
    from_parent_check_in_lng: Optional[float] = None
    from_parent_device_accuracy: Optional[float] = None
    from_parent_distance_meters: Optional[float] = None
    from_parent_in_geofence: Optional[bool] = None

    to_parent_check_in_lat: Optional[float] = None
    to_parent_check_in_lng: Optional[float] = None
    to_parent_device_accuracy: Optional[float] = None
    to_parent_distance_meters: Optional[float] = None
    to_parent_in_geofence: Optional[bool] = None

    # QR confirmation
    qr_confirmed_at: Optional[datetime] = None

    # Handoff outcome
    handoff_outcome: Optional[str] = None

    # Exchange window
    window_start: Optional[datetime] = None
    window_end: Optional[datetime] = None
    auto_closed: bool = False

    # Include parent exchange details for context
    exchange: Optional[CustodyExchangeResponse] = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CheckInRequest(BaseModel):
    """Schema for parent check-in at exchange."""
    notes: Optional[str] = None
    location_override: Optional[str] = None


class UpcomingExchangesRequest(BaseModel):
    """Schema for getting upcoming exchanges."""
    case_id: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = 20


# ============================================================
# Silent Handoff Schemas
# ============================================================

class SilentHandoffCheckInRequest(BaseModel):
    """
    GPS-verified check-in request for Silent Handoff.

    Privacy: GPS is captured only at this moment, not continuously tracked.
    """
    latitude: float = Field(..., ge=-90, le=90, description="GPS latitude")
    longitude: float = Field(..., ge=-180, le=180, description="GPS longitude")
    device_accuracy_meters: float = Field(..., ge=0, description="Device-reported GPS accuracy")
    notes: Optional[str] = None


class QRConfirmationRequest(BaseModel):
    """Request to confirm exchange via QR code scan."""
    confirmation_token: str = Field(..., min_length=1, description="Token from QR code")


class GeocodeAddressRequest(BaseModel):
    """Request to geocode an address to lat/lng coordinates."""
    address: str = Field(..., min_length=5, description="Street address to geocode")


class GeocodeAddressResponse(BaseModel):
    """Response from geocoding an address."""
    latitude: float
    longitude: float
    formatted_address: str
    accuracy: str = Field(..., description="Geocoding accuracy: exact, approximate, or fallback")


class WindowStatusResponse(BaseModel):
    """Response for exchange window status check."""
    instance_id: str
    scheduled_time: datetime
    window_start: datetime
    window_end: datetime
    is_within_window: bool
    is_before_window: bool
    is_after_window: bool
    minutes_until_window: float
    minutes_remaining: float


class QRTokenResponse(BaseModel):
    """Response containing QR confirmation token."""
    token: str
    instance_id: str


# ============================================================
# Custody Status Tracker Schemas
# ============================================================

class ChildCustodyStatus(BaseModel):
    """Custody status for a single child."""
    child_id: str
    child_first_name: str
    child_last_name: Optional[str] = None

    # Current status
    with_current_user: bool  # True if child is with the requesting user
    current_parent_id: Optional[str] = None  # Who has the child now
    current_parent_name: Optional[str] = None

    # Next action for this child (from user's perspective)
    next_action: Optional[str] = None  # 'pickup' or 'dropoff'

    # Next exchange info
    next_exchange_id: Optional[str] = None
    next_exchange_time: Optional[datetime] = None
    next_exchange_location: Optional[str] = None

    # Time calculations
    hours_remaining: Optional[float] = None
    time_with_current_parent_hours: Optional[float] = None
    progress_percentage: float = 0  # 0-100


class CustodyStatusResponse(BaseModel):
    """
    Complete custody status for the dashboard.

    Answers: "Where are my kids right now?"
    """
    family_file_id: str
    case_id: Optional[str] = None

    # User context
    current_user_id: str
    coparent_id: Optional[str] = None
    coparent_name: Optional[str] = None

    # Overall status (all kids together case)
    all_with_current_user: bool  # True if ALL children are with requesting user
    any_with_current_user: bool  # True if ANY children are with requesting user

    # Per-child status
    children: List[ChildCustodyStatus]

    # Next exchange summary (soonest)
    next_exchange_time: Optional[datetime] = None
    next_exchange_day: Optional[str] = None  # "Wednesday"
    next_exchange_formatted: Optional[str] = None  # "Wednesday 6:00 PM"
    hours_until_next_exchange: Optional[float] = None

    # Progress (for progress bar)
    custody_period_hours: float = 168  # Default 7 days
    elapsed_hours: float = 0
    progress_percentage: float = 0

    # Manual override info
    last_manual_override: Optional[datetime] = None
    manual_override_by: Optional[str] = None
    pending_override_request: bool = False

    model_config = {"from_attributes": True}


class ManualCustodyOverrideRequest(BaseModel):
    """Request to manually claim custody status."""
    family_file_id: str
    child_ids: List[str] = Field(..., min_length=1, description="Children being claimed")
    notes: Optional[str] = None


class ManualCustodyOverrideResponse(BaseModel):
    """Response after requesting custody override."""
    success: bool
    message: str
    notification_sent_to: Optional[str] = None  # Coparent name
    requires_acknowledgment: bool = True
