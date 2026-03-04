"""
Pydantic schemas for KidComs (child communication sessions).

KidComs enables children to have video calls, chat, watch movies together,
play games, and use collaborative whiteboards with their approved circle.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ============================================================
# KidComs Settings Schemas
# ============================================================

class KidComsSettingsCreate(BaseModel):
    """Schema for creating KidComs settings (usually auto-created with family)."""
    family_file_id: str

    # Circle approval settings
    circle_approval_mode: str = Field(
        default="both_parents",
        pattern=r"^(both_parents|either_parent)$",
        description="Mode for approving circle contacts"
    )

    # Availability schedule
    availability_schedule: Optional[Dict[str, Dict[str, str]]] = Field(
        default=None,
        description="Format: {'monday': {'start': '09:00', 'end': '20:00'}, ...}"
    )
    enforce_availability: bool = True

    # Notifications
    require_parent_notification: bool = True
    notify_on_session_start: bool = True
    notify_on_session_end: bool = True
    notify_on_aria_flag: bool = True

    # Feature toggles
    allowed_features: Dict[str, bool] = Field(
        default_factory=lambda: {
            "video": True,
            "chat": True,
            "theater": True,
            "arcade": True,
            "whiteboard": True
        }
    )

    # Session limits
    max_session_duration_minutes: int = Field(default=60, ge=5, le=180)
    max_daily_sessions: int = Field(default=5, ge=1, le=20)
    max_participants_per_session: int = Field(default=4, ge=2, le=10)

    # Parental controls
    require_parent_in_call: bool = False
    allow_child_to_initiate: bool = True
    record_sessions: bool = False


class KidComsSettingsUpdate(BaseModel):
    """Schema for updating KidComs settings."""
    circle_approval_mode: Optional[str] = Field(
        default=None,
        pattern=r"^(both_parents|either_parent)$"
    )

    availability_schedule: Optional[Dict[str, Dict[str, str]]] = None
    enforce_availability: Optional[bool] = None

    require_parent_notification: Optional[bool] = None
    notify_on_session_start: Optional[bool] = None
    notify_on_session_end: Optional[bool] = None
    notify_on_aria_flag: Optional[bool] = None

    allowed_features: Optional[Dict[str, bool]] = None

    max_session_duration_minutes: Optional[int] = Field(default=None, ge=5, le=180)
    max_daily_sessions: Optional[int] = Field(default=None, ge=1, le=20)
    max_participants_per_session: Optional[int] = Field(default=None, ge=2, le=10)

    require_parent_in_call: Optional[bool] = None
    allow_child_to_initiate: Optional[bool] = None
    record_sessions: Optional[bool] = None


class KidComsSettingsResponse(BaseModel):
    """Schema for KidComs settings response."""
    id: str
    family_file_id: str

    circle_approval_mode: str
    availability_schedule: Optional[Dict[str, Dict[str, str]]] = None
    enforce_availability: bool

    require_parent_notification: bool
    notify_on_session_start: bool
    notify_on_session_end: bool
    notify_on_aria_flag: bool

    allowed_features: Dict[str, bool]

    max_session_duration_minutes: int
    max_daily_sessions: int
    max_participants_per_session: int

    require_parent_in_call: bool
    allow_child_to_initiate: bool
    record_sessions: bool

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ============================================================
# KidComs Session Schemas
# ============================================================

class SessionParticipant(BaseModel):
    """Schema for a session participant."""
    id: str
    type: str = Field(
        ...,
        pattern=r"^(child|parent|circle_contact)$"
    )
    name: str
    joined_at: Optional[str] = None


class KidComsSessionCreate(BaseModel):
    """Schema for creating a KidComs session."""
    family_file_id: str
    child_id: str

    session_type: str = Field(
        default="video_call",
        pattern=r"^(video_call|theater|arcade|whiteboard|mixed)$",
        description="Type of session"
    )
    title: Optional[str] = Field(default=None, max_length=200)

    # Invited participants (circle contacts or other family members)
    invited_contact_ids: List[str] = Field(
        default_factory=list,
        description="Circle contact IDs to invite"
    )

    # Scheduling
    scheduled_for: Optional[datetime] = Field(
        default=None,
        description="Optional future time to schedule session"
    )


class ChildSessionCreate(BaseModel):
    """Schema for a child to initiate a KidComs session.

    Used when a child clicks on a contact to start a call.
    The child's family_file_id and child_id come from their auth token.
    """
    # Target contact to call
    contact_type: str = Field(
        ...,
        pattern=r"^(parent_a|parent_b|circle)$",
        description="Type of contact: parent_a, parent_b, or circle"
    )
    contact_id: str = Field(
        ...,
        description="ID of the contact to call (parent user ID or circle contact ID)"
    )

    # Session type
    session_type: str = Field(
        default="video_call",
        pattern=r"^(video_call|voice_call)$",
        description="Type of session - video_call or voice_call"
    )


class CircleContactSessionCreate(BaseModel):
    """Schema for a circle contact to initiate a KidComs session.

    Used when a circle contact (grandparent, aunt, etc.) initiates a call with a child.
    The circle contact's user info comes from their auth token.
    """
    # Target child to call
    child_id: str = Field(
        ...,
        description="ID of the child to call"
    )

    # Session type
    session_type: str = Field(
        default="video_call",
        pattern=r"^(video_call|voice_call)$",
        description="Type of session - video_call or voice_call"
    )


class KidComsSessionUpdate(BaseModel):
    """Schema for updating a KidComs session."""
    title: Optional[str] = Field(default=None, max_length=200)
    notes: Optional[str] = None
    status: Optional[str] = Field(
        default=None,
        pattern=r"^(scheduled|waiting|active|completed|cancelled)$"
    )


class KidComsSessionResponse(BaseModel):
    """Schema for KidComs session response."""
    id: str
    family_file_id: str
    child_id: str

    session_type: str
    title: Optional[str] = None
    status: str

    # Daily.co room info
    daily_room_name: str
    daily_room_url: str
    # Note: daily_room_token is NOT exposed in response for security

    # Initiation
    initiated_by_id: str
    initiated_by_type: str

    # Participants
    participants: List[SessionParticipant] = Field(default_factory=list)

    # Timing
    scheduled_for: Optional[datetime] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None

    # Features used
    features_used: List[str] = Field(default_factory=list)

    # ARIA stats
    total_messages: int = 0
    flagged_messages: int = 0

    notes: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class KidComsSessionListResponse(BaseModel):
    """Schema for listing sessions."""
    items: List[KidComsSessionResponse]
    total: int


class KidComsJoinRequest(BaseModel):
    """Schema for joining an existing session."""
    session_id: str


class KidComsJoinResponse(BaseModel):
    """Response when joining a session (includes token)."""
    session_id: str
    room_url: str  # Daily.co room URL
    token: str  # Daily.co participant token
    participant_name: str
    participant_type: str


class IncomingCallResponse(BaseModel):
    """Schema for incoming call notification."""
    session_id: str
    caller_name: str
    caller_type: str  # "circle_contact" or "child"
    session_type: str  # "video_call" or "voice_call"
    room_url: str
    started_ringing_at: Optional[datetime] = None
    # Include child info if caller is circle_contact
    child_id: Optional[str] = None
    child_name: Optional[str] = None
    # Include contact info if caller is child
    circle_contact_id: Optional[str] = None
    contact_name: Optional[str] = None


class IncomingCallListResponse(BaseModel):
    """Schema for list of incoming calls."""
    items: List[IncomingCallResponse]
    total: int


class KidComsEndSessionRequest(BaseModel):
    """Schema for ending a session."""
    notes: Optional[str] = None


# ============================================================
# KidComs Message Schemas
# ============================================================

class KidComsMessageCreate(BaseModel):
    """Schema for sending a message in a session."""
    # session_id comes from URL path parameter
    content: str = Field(..., min_length=1, max_length=2000)


class KidComsMessageResponse(BaseModel):
    """Schema for KidComs message response."""
    id: str
    session_id: str

    sender_id: str
    sender_type: str
    sender_name: str

    content: str
    original_content: Optional[str] = None  # If modified by ARIA

    # ARIA analysis
    aria_analyzed: bool
    aria_flagged: bool
    aria_category: Optional[str] = None
    aria_reason: Optional[str] = None

    is_delivered: bool
    is_hidden: bool  # Hidden due to flag

    sent_at: datetime

    model_config = {"from_attributes": True}


class KidComsMessageListResponse(BaseModel):
    """Schema for listing messages in a session."""
    items: List[KidComsMessageResponse]
    total: int
    flagged_count: int = 0


# ============================================================
# KidComs Session Invite Schemas
# ============================================================

class KidComsSessionInviteCreate(BaseModel):
    """Schema for inviting someone to a session."""
    session_id: str
    circle_contact_id: str


class KidComsSessionInviteResponse(BaseModel):
    """Schema for session invite response."""
    id: str
    session_id: str
    circle_contact_id: Optional[str] = None

    invited_by_id: str
    invited_by_type: str
    invite_token: str
    invite_url: str

    status: str  # pending, accepted, declined, expired
    expires_at: datetime
    accepted_at: Optional[datetime] = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class KidComsInviteAcceptRequest(BaseModel):
    """Schema for accepting a session invite."""
    invite_token: str


# ============================================================
# Daily.co Integration Schemas
# ============================================================

class DailyRoomCreate(BaseModel):
    """Schema for creating a Daily.co room."""
    name: str = Field(..., min_length=3, max_length=100)
    privacy: str = Field(
        default="private",
        pattern=r"^(public|private)$"
    )
    properties: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional room properties (max participants, expiry, etc.)"
    )


class DailyRoomResponse(BaseModel):
    """Response from Daily.co room creation."""
    name: str
    url: str
    created_at: Optional[datetime] = None
    privacy: str


class DailyTokenCreate(BaseModel):
    """Schema for creating a Daily.co participant token."""
    room_name: str
    user_name: str
    user_id: str
    is_owner: bool = False
    start_video_off: bool = False
    start_audio_off: bool = False
    exp_minutes: int = Field(default=60, ge=5, le=480)


class DailyTokenResponse(BaseModel):
    """Response containing Daily.co participant token."""
    token: str
    room_url: str


# ============================================================
# ARIA Chat Analysis Schemas
# ============================================================

class ARIAChatAnalyzeRequest(BaseModel):
    """Schema for analyzing a chat message with ARIA."""
    content: str = Field(..., min_length=1, max_length=2000)
    sender_type: str = Field(
        ...,
        pattern=r"^(child|parent|circle_contact)$"
    )
    sender_name: str
    context: Optional[str] = Field(
        default=None,
        description="Additional context for analysis (e.g., recent conversation)"
    )


class ARIAChatAnalyzeResponse(BaseModel):
    """Response from ARIA chat analysis."""
    is_safe: bool
    should_flag: bool
    category: Optional[str] = Field(
        default=None,
        description="Category of concern if flagged"
    )
    reason: Optional[str] = None
    confidence_score: float = Field(..., ge=0.0, le=1.0)

    # For children's messages, provide gentle suggestions if needed
    suggested_rewrite: Optional[str] = None

    # Whether to hide from other participants
    should_hide: bool = False

    # Whether to notify parents
    should_notify_parents: bool = False


# ============================================================
# KidComs Dashboard/Summary Schemas
# ============================================================

class KidComsChildSummary(BaseModel):
    """Summary of KidComs activity for a child."""
    child_id: str
    child_name: str

    # Session stats
    total_sessions: int = 0
    sessions_this_week: int = 0
    total_duration_minutes: int = 0

    # Circle stats
    circle_contacts_count: int = 0
    favorite_contacts: List[str] = Field(default_factory=list)

    # Communication stats
    messages_sent: int = 0
    messages_flagged: int = 0

    # Last activity
    last_session_at: Optional[datetime] = None
    last_session_with: Optional[str] = None


class KidComsFamilySummary(BaseModel):
    """Summary of KidComs activity for a family."""
    family_file_id: str

    # Overall stats
    total_sessions: int = 0
    sessions_this_week: int = 0

    # Per-child summaries
    children: List[KidComsChildSummary] = Field(default_factory=list)

    # Feature usage
    feature_usage: Dict[str, int] = Field(
        default_factory=lambda: {
            "video_call": 0,
            "theater": 0,
            "arcade": 0,
            "whiteboard": 0,
            "chat": 0
        }
    )

    # Availability
    is_within_availability: bool = True
    next_available_window: Optional[str] = None


# ============================================================
# Feature Constants
# ============================================================

SESSION_TYPES = [
    {"value": "video_call", "label": "Video Call", "icon": "video"},
    {"value": "theater", "label": "Theater", "icon": "film"},
    {"value": "arcade", "label": "Arcade", "icon": "gamepad-2"},
    {"value": "whiteboard", "label": "Whiteboard", "icon": "pencil"},
    {"value": "mixed", "label": "Mixed Session", "icon": "layout-grid"},
]

ARIA_CATEGORIES = [
    "inappropriate_content",
    "bullying",
    "personal_info_sharing",
    "external_links",
    "profanity",
    "concerning_behavior",
    "conflict_escalation",
    "other",
]


# ============================================================
# My Circle - Room Management Schemas
# ============================================================

class KidComsRoomResponse(BaseModel):
    """Schema for a KidComs communication room."""
    id: str
    family_file_id: str
    room_number: int  # 1-10
    room_type: str  # parent_a, parent_b, circle
    room_name: Optional[str] = None

    # Assignment
    assigned_to_id: Optional[str] = None
    assigned_contact_name: Optional[str] = None
    assigned_contact_relationship: Optional[str] = None

    # Daily.co room
    daily_room_name: Optional[str] = None
    daily_room_url: Optional[str] = None

    is_active: bool = True
    is_reserved: bool = False  # True for parent rooms
    is_assigned: bool = False

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class KidComsRoomListResponse(BaseModel):
    """Schema for listing all rooms for a family."""
    items: List[KidComsRoomResponse]
    total: int = 10
    assigned_count: int = 0
    available_count: int = 0


class KidComsRoomAssignRequest(BaseModel):
    """Schema for assigning a circle contact to a room."""
    circle_contact_id: str
    room_name: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Custom name for the room (e.g., 'Grandma's Room')"
    )


class KidComsRoomUpdate(BaseModel):
    """Schema for updating a room."""
    room_name: Optional[str] = Field(default=None, max_length=100)
    is_active: Optional[bool] = None


# ============================================================
# My Circle - Circle User (Contact Login) Schemas
# ============================================================

class CircleUserInviteRequest(BaseModel):
    """Schema for inviting a circle contact to create an account."""
    circle_contact_id: str


class CircleUserCreateAndInviteRequest(BaseModel):
    """Schema for creating a new circle contact and sending an invitation."""
    family_file_id: str
    email: str
    contact_name: str
    relationship_type: Optional[str] = None
    room_number: Optional[int] = Field(None, ge=3, le=10)  # 1-2 are reserved for parents


class CircleUserInviteResponse(BaseModel):
    """Response after sending invite to circle contact."""
    id: str
    circle_contact_id: str
    email: str
    invite_token: str
    invite_url: str
    invite_expires_at: Optional[datetime] = None  # None when contact already accepted (returns login URL)
    contact_name: str
    relationship_type: str
    room_number: Optional[int] = None

    model_config = {"from_attributes": True}


class CircleUserAcceptInviteRequest(BaseModel):
    """Schema for accepting a circle invitation."""
    invite_token: str
    password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str = Field(..., min_length=8, max_length=100)


class CircleUserLoginRequest(BaseModel):
    """Schema for circle user login."""
    email: str
    password: str


class CircleUserLoginResponse(BaseModel):
    """Response after successful circle user login."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user_id: str
    circle_contact_id: str
    contact_name: str
    family_file_id: str
    child_ids: List[str]  # Children they can communicate with


class CircleUserProfileResponse(BaseModel):
    """Schema for circle user profile."""
    id: str
    circle_contact_id: str
    email: str
    contact_name: str
    relationship_type: str
    family_file_id: str
    room_number: Optional[int] = None

    # Status
    email_verified: bool = False
    is_active: bool = True
    last_login: Optional[datetime] = None

    # Children they can communicate with
    children: List[Dict[str, Any]] = Field(default_factory=list)

    # Their permissions
    permissions: List[Dict[str, Any]] = Field(default_factory=list)

    created_at: datetime

    model_config = {"from_attributes": True}


# ============================================================
# My Circle - Child User (PIN Login) Schemas
# ============================================================

class ChildUserSetupRequest(BaseModel):
    """Schema for setting up a child's login."""
    child_id: str
    username: str = Field(..., min_length=3, max_length=50)
    pin: str = Field(..., min_length=4, max_length=6, pattern=r"^\d{4,6}$")
    avatar_id: Optional[str] = Field(default=None, max_length=50)


class ChildUserUpdateRequest(BaseModel):
    """Schema for updating a child's login."""
    username: Optional[str] = Field(default=None, min_length=3, max_length=50)
    pin: Optional[str] = Field(default=None, min_length=4, max_length=6, pattern=r"^\d{4,6}$")
    avatar_id: Optional[str] = Field(default=None, max_length=50)
    is_active: Optional[bool] = None


class ChildUserResponse(BaseModel):
    """Schema for child user response (excludes PIN)."""
    id: str
    child_id: str
    family_file_id: str
    username: str
    avatar_id: Optional[str] = None
    is_active: bool = True
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Child info
    child_name: Optional[str] = None
    child_photo_url: Optional[str] = None

    model_config = {"from_attributes": True}


class ChildUserLoginRequest(BaseModel):
    """Schema for child PIN login."""
    family_file_id: str
    username: str
    pin: str = Field(..., min_length=4, max_length=6)


class ChildUserLoginResponse(BaseModel):
    """Response after successful child login."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user_id: str  # child_user_id
    child_id: str
    child_name: str
    avatar_id: Optional[str] = None
    family_file_id: str

    # Available contacts to call
    contacts: List[Dict[str, Any]] = Field(default_factory=list)


class ChildUserListResponse(BaseModel):
    """Schema for listing child users in a family."""
    items: List[ChildUserResponse]
    total: int


# ============================================================
# My Circle - Circle Permissions Schemas
# ============================================================

class CirclePermissionCreate(BaseModel):
    """Schema for creating circle permissions."""
    circle_contact_id: str
    child_id: str

    # Feature permissions
    can_video_call: bool = True
    can_voice_call: bool = True
    can_chat: bool = True
    can_theater: bool = True

    # Time restrictions (optional)
    allowed_days: Optional[List[int]] = Field(
        default=None,
        description="Days allowed: 0=Sunday, 1=Monday, ... 6=Saturday"
    )
    allowed_start_time: Optional[str] = Field(
        default=None,
        pattern=r"^\d{2}:\d{2}$",
        description="Start time in HH:MM format"
    )
    allowed_end_time: Optional[str] = Field(
        default=None,
        pattern=r"^\d{2}:\d{2}$",
        description="End time in HH:MM format"
    )

    # Session restrictions
    max_call_duration_minutes: int = Field(default=60, ge=5, le=180)
    require_parent_present: bool = False


class CirclePermissionUpdate(BaseModel):
    """Schema for updating circle permissions."""
    can_video_call: Optional[bool] = None
    can_voice_call: Optional[bool] = None
    can_chat: Optional[bool] = None
    can_theater: Optional[bool] = None

    allowed_days: Optional[List[int]] = None
    allowed_start_time: Optional[str] = Field(
        default=None,
        pattern=r"^\d{2}:\d{2}$"
    )
    allowed_end_time: Optional[str] = Field(
        default=None,
        pattern=r"^\d{2}:\d{2}$"
    )

    max_call_duration_minutes: Optional[int] = Field(default=None, ge=5, le=180)
    require_parent_present: Optional[bool] = None


class CirclePermissionResponse(BaseModel):
    """Schema for circle permission response."""
    id: str
    circle_contact_id: str
    child_id: str
    family_file_id: str

    # Feature permissions
    can_video_call: bool
    can_voice_call: bool
    can_chat: bool
    can_theater: bool

    # Time restrictions
    allowed_days: Optional[List[int]] = None
    allowed_start_time: Optional[str] = None
    allowed_end_time: Optional[str] = None
    is_within_allowed_time: bool = True  # Computed

    # Session restrictions
    max_call_duration_minutes: int
    require_parent_present: bool

    # Audit
    set_by_parent_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Related info
    contact_name: Optional[str] = None
    child_name: Optional[str] = None

    model_config = {"from_attributes": True}


class CirclePermissionListResponse(BaseModel):
    """Schema for listing permissions."""
    items: List[CirclePermissionResponse]
    total: int


# ============================================================
# My Circle - Communication Log Schemas
# ============================================================

class KidComsCommunicationLogResponse(BaseModel):
    """Schema for communication log entry."""
    id: str
    room_id: Optional[str] = None
    session_id: Optional[str] = None
    family_file_id: str
    child_id: str

    # Contact info
    contact_type: str  # parent_a, parent_b, circle
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None

    # Communication details
    communication_type: str  # video, voice, chat, theater
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    duration_display: Optional[str] = None  # "15 min 32 sec"

    # ARIA monitoring
    aria_flags: Optional[Dict[str, Any]] = None
    total_messages: int = 0
    flagged_messages: int = 0
    has_flags: bool = False

    # Recording
    recording_url: Optional[str] = None

    created_at: datetime

    model_config = {"from_attributes": True}


class KidComsCommunicationLogListResponse(BaseModel):
    """Schema for listing communication logs."""
    items: List[KidComsCommunicationLogResponse]
    total: int
    total_duration_seconds: int = 0
    flagged_communications: int = 0


# ============================================================
# My Circle - Dashboard Schemas
# ============================================================

class MyCircleContactStatus(BaseModel):
    """Status of a contact for My Circle portal."""
    contact_id: str
    contact_name: str
    relationship_type: str
    room_number: Optional[int] = None

    # Child info
    child_id: str
    child_name: str
    child_photo_url: Optional[str] = None

    # Availability
    is_online: bool = False
    is_within_allowed_time: bool = True
    allowed_features: List[str] = Field(default_factory=list)

    # Last communication
    last_call_at: Optional[datetime] = None
    last_call_duration_minutes: Optional[int] = None


class MyCircleDashboard(BaseModel):
    """Dashboard data for circle contact portal."""
    user_id: str
    contact_name: str
    family_title: str

    # Children they can communicate with
    children: List[MyCircleContactStatus] = Field(default_factory=list)

    # Stats
    total_calls_this_month: int = 0
    total_duration_minutes: int = 0

    # Restrictions
    allowed_hours: Optional[str] = None  # "9:00 AM - 8:00 PM"
    max_call_duration: Optional[int] = None


class ChildPortalContact(BaseModel):
    """A contact card for the child portal."""
    contact_id: str
    contact_type: str  # parent_a, parent_b, circle
    display_name: str
    avatar_url: Optional[str] = None
    relationship: Optional[str] = None
    room_number: int

    # Status
    is_online: bool = False
    is_available: bool = True  # Based on time restrictions

    # Available features
    can_video_call: bool = True
    can_voice_call: bool = True
    can_chat: bool = True
    can_theater: bool = True


class ChildPortalDashboard(BaseModel):
    """Dashboard data for child portal."""
    child_id: str
    child_name: str
    avatar_id: Optional[str] = None

    # Available contacts to communicate with
    contacts: List[ChildPortalContact] = Field(default_factory=list)

    # Active calls
    has_incoming_call: bool = False
    incoming_call_from: Optional[str] = None


# ============================================================
# My Circle - Notification Schemas
# ============================================================

class IncomingCallNotification(BaseModel):
    """Notification for incoming call."""
    session_id: str
    room_number: int
    caller_id: str
    caller_name: str
    caller_type: str  # parent_a, parent_b, circle
    caller_photo_url: Optional[str] = None
    call_type: str  # video, voice


class CallEndedNotification(BaseModel):
    """Notification when a call ends."""
    session_id: str
    caller_name: str
    duration_seconds: int
    had_aria_flags: bool = False


# ============================================================
# My Circle - Avatar Constants
# ============================================================

CHILD_AVATARS = [
    {"id": "lion", "emoji": "🦁", "name": "Lion"},
    {"id": "panda", "emoji": "🐼", "name": "Panda"},
    {"id": "unicorn", "emoji": "🦄", "name": "Unicorn"},
    {"id": "bear", "emoji": "🐻", "name": "Bear"},
    {"id": "cat", "emoji": "🐱", "name": "Cat"},
    {"id": "dog", "emoji": "🐶", "name": "Dog"},
    {"id": "rabbit", "emoji": "🐰", "name": "Rabbit"},
    {"id": "fox", "emoji": "🦊", "name": "Fox"},
    {"id": "koala", "emoji": "🐨", "name": "Koala"},
    {"id": "penguin", "emoji": "🐧", "name": "Penguin"},
    {"id": "monkey", "emoji": "🐵", "name": "Monkey"},
    {"id": "dragon", "emoji": "🐉", "name": "Dragon"},
]

DAYS_OF_WEEK = [
    {"value": 0, "label": "Sunday", "abbr": "Sun"},
    {"value": 1, "label": "Monday", "abbr": "Mon"},
    {"value": 2, "label": "Tuesday", "abbr": "Tue"},
    {"value": 3, "label": "Wednesday", "abbr": "Wed"},
    {"value": 4, "label": "Thursday", "abbr": "Thu"},
    {"value": 5, "label": "Friday", "abbr": "Fri"},
    {"value": 6, "label": "Saturday", "abbr": "Sat"},
]
