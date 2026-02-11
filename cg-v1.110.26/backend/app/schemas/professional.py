"""
Professional Portal schemas.

Pydantic schemas for professional profiles, firms, memberships,
case assignments, and related features.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
import re

from app.models.professional import (
    ProfessionalType,
    FirmType,
    FirmRole,
    AssignmentRole,
    AssignmentStatus,
    MembershipStatus,
    AccessRequestStatus,
    TemplateType,
    EventType,
    EventVisibility,
)
from app.models.court import AccessScope


# =============================================================================
# Professional Profile Schemas
# =============================================================================

class ProfessionalProfileBase(BaseModel):
    """Base schema for professional profile."""
    professional_type: ProfessionalType = ProfessionalType.ATTORNEY
    license_number: Optional[str] = None
    license_state: Optional[str] = Field(None, max_length=2)
    credentials: Optional[dict] = None
    practice_areas: Optional[list[str]] = None
    professional_email: Optional[EmailStr] = None
    professional_phone: Optional[str] = None

    # Directory Fields
    headline: Optional[str] = Field(None, max_length=150)
    bio: Optional[str] = None
    video_url: Optional[str] = None
    languages: Optional[list[str]] = None
    hourly_rate: Optional[str] = None
    years_experience: Optional[int] = None
    education: Optional[list[dict]] = None
    awards: Optional[list[dict]] = None
    consultation_fee: Optional[str] = None
    accepted_payment_methods: Optional[list[str]] = None


class ProfessionalProfileCreate(ProfessionalProfileBase):
    """Schema for creating a professional profile (onboarding)."""
    pass


class ProfessionalProfileUpdate(BaseModel):
    """Schema for updating a professional profile."""
    professional_type: Optional[ProfessionalType] = None
    license_number: Optional[str] = None
    license_state: Optional[str] = None
    credentials: Optional[dict] = None
    practice_areas: Optional[list[str]] = None
    professional_email: Optional[EmailStr] = None
    professional_phone: Optional[str] = None
    
    # Directory Fields
    headline: Optional[str] = None
    bio: Optional[str] = None
    video_url: Optional[str] = None
    languages: Optional[list[str]] = None
    hourly_rate: Optional[str] = None
    years_experience: Optional[int] = None
    education: Optional[list[dict]] = None
    awards: Optional[list[dict]] = None
    consultation_fee: Optional[str] = None
    accepted_payment_methods: Optional[list[str]] = None

    default_intake_template: Optional[str] = None
    notification_preferences: Optional[dict] = None


class ProfessionalProfileResponse(ProfessionalProfileBase):
    """Schema for professional profile response."""
    id: str
    user_id: str
    license_verified: bool = False
    license_verified_at: Optional[datetime] = None
    default_intake_template: Optional[str] = None
    notification_preferences: Optional[dict] = None
    is_active: bool = True
    onboarded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # User info (populated from relationship)
    user_first_name: Optional[str] = None
    user_last_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True


class ProfessionalProfileWithFirms(ProfessionalProfileResponse):
    """Professional profile with firm memberships."""
    firms: list["FirmMembershipResponse"] = []


# =============================================================================
# Firm Schemas
# =============================================================================

class FirmBase(BaseModel):
    """Base schema for firm."""
    name: str = Field(..., min_length=2, max_length=200)
    firm_type: FirmType = FirmType.LAW_FIRM
    email: EmailStr
    phone: Optional[str] = None
    website: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: str = Field(default="CA", max_length=2)
    zip_code: Optional[str] = None

    # Directory Fields
    headline: Optional[str] = Field(None, max_length=150)
    video_url: Optional[str] = None
    social_links: Optional[dict] = None
    pricing_structure: Optional[dict] = None
    safety_vetted: bool = False
    description: Optional[str] = None
    practice_areas: Optional[list[str]] = None


class FirmCreate(FirmBase):
    """Schema for creating a firm."""
    is_public: bool = False
    settings: Optional[dict] = None


class FirmUpdate(BaseModel):
    """Schema for updating a firm."""
    name: Optional[str] = None
    firm_type: Optional[FirmType] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    is_public: Optional[bool] = None
    settings: Optional[dict] = None
    description: Optional[str] = None
    practice_areas: Optional[list[str]] = None
    
    # Directory Fields
    headline: Optional[str] = None
    video_url: Optional[str] = None
    social_links: Optional[dict] = None
    pricing_structure: Optional[dict] = None
    safety_vetted: Optional[bool] = None

    @field_validator('primary_color')
    @classmethod
    def validate_color(cls, v):
        if v and not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError('Invalid color format. Use #RRGGBB')
        return v


class FirmResponse(FirmBase):
    """Schema for firm response."""
    id: str
    slug: str
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    is_public: bool = False
    settings: Optional[dict] = None
    subscription_tier: str = "professional"
    subscription_status: str = "trial"
    is_active: bool = True
    created_by: str
    created_at: datetime
    updated_at: datetime
    description: Optional[str] = None
    practice_areas: Optional[list[str]] = None

    # Computed
    member_count: Optional[int] = None

    class Config:
        from_attributes = True


class ProfessionalPublicResponse(BaseModel):
    """Public professional profile info."""
    id: str
    user_first_name: Optional[str] = None
    user_last_name: Optional[str] = None
    professional_type: ProfessionalType
    license_verified: bool = False
    headline: Optional[str] = None
    bio: Optional[str] = None
    video_url: Optional[str] = None
    languages: list[str] = []
    hourly_rate: Optional[str] = None
    years_experience: Optional[int] = None
    education: list[dict] = []
    awards: list[dict] = []
    consultation_fee: Optional[str] = None
    accepted_payment_methods: list[str] = []
    practice_areas: list[str] = []

    class Config:
        from_attributes = True


class FirmPublicResponse(BaseModel):
    """Public firm info for directory listing."""
    id: str
    name: str
    slug: str
    firm_type: FirmType
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    primary_color: Optional[str] = None
    practice_areas: list[str] = []
    professional_count: int = 0
    description: Optional[str] = None
    
    
    # Directory Fields
    headline: Optional[str] = None
    video_url: Optional[str] = None
    social_links: Optional[dict] = None
    pricing_structure: Optional[dict] = None
    safety_vetted: bool = False

    professionals: list[ProfessionalPublicResponse] = []

    class Config:
        from_attributes = True


class FirmDirectoryResponse(BaseModel):
    """Paginated firm directory response."""
    items: list[FirmPublicResponse]
    total: int


class FirmWithMembers(FirmResponse):
    """Firm with member list."""
    members: list["FirmMembershipResponse"] = []


# =============================================================================
# Firm Membership Schemas
# =============================================================================

class FirmMemberInvite(BaseModel):
    """Schema for inviting a member to a firm."""
    email: EmailStr
    role: FirmRole = FirmRole.ATTORNEY
    custom_permissions: Optional[dict] = None


class FirmMembershipUpdate(BaseModel):
    """Schema for updating a firm membership."""
    role: Optional[FirmRole] = None
    custom_permissions: Optional[dict] = None


class FirmMembershipResponse(BaseModel):
    """Schema for firm membership response."""
    id: str
    professional_id: Optional[str] = None
    firm_id: str
    role: FirmRole
    custom_permissions: Optional[dict] = None
    status: MembershipStatus
    invited_at: Optional[datetime] = None
    joined_at: Optional[datetime] = None
    invited_by: Optional[str] = None
    invite_email: Optional[str] = None

    # Professional info (from relationship)
    professional_name: Optional[str] = None
    professional_email: Optional[str] = None
    professional_type: Optional[ProfessionalType] = None

    # Firm info (from relationship)
    firm_name: Optional[str] = None
    firm_slug: Optional[str] = None

    class Config:
        from_attributes = True


# =============================================================================
# Case Assignment Schemas
# =============================================================================

class CaseAssignmentCreate(BaseModel):
    """Schema for creating a case assignment."""
    family_file_id: str
    assignment_role: AssignmentRole = AssignmentRole.LEAD_ATTORNEY
    representing: Optional[str] = Field(None, description="parent_a, parent_b, both, or court")
    access_scopes: list[str] = Field(
        default=["agreement", "schedule", "messages", "compliance"]
    )
    can_control_aria: bool = False
    can_message_client: bool = True
    internal_notes: Optional[str] = None


class CaseAssignmentUpdate(BaseModel):
    """Schema for updating a case assignment."""
    assignment_role: Optional[AssignmentRole] = None
    representing: Optional[str] = None
    access_scopes: Optional[list[str]] = None
    can_control_aria: Optional[bool] = None
    aria_preferences: Optional[dict] = None
    can_message_client: Optional[bool] = None
    status: Optional[AssignmentStatus] = None
    internal_notes: Optional[str] = None


class CaseAssignmentResponse(BaseModel):
    """Schema for case assignment response."""
    id: str
    professional_id: str
    firm_id: str
    family_file_id: str
    case_id: Optional[str] = None
    assignment_role: AssignmentRole
    representing: Optional[str] = None
    access_scopes: list[str]
    can_control_aria: bool
    aria_preferences: Optional[dict] = None
    can_message_client: bool
    status: AssignmentStatus
    assigned_at: datetime
    assigned_by: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Related info
    professional_name: Optional[str] = None
    firm_name: Optional[str] = None
    family_file_title: Optional[str] = None
    family_file_number: Optional[str] = None

    class Config:
        from_attributes = True


class CaseAssignmentWithDetails(CaseAssignmentResponse):
    """Case assignment with full case details."""
    parent_a_name: Optional[str] = None
    parent_b_name: Optional[str] = None
    children_count: Optional[int] = None
    agreement_count: Optional[int] = None
    unread_messages: Optional[int] = None
    last_activity_at: Optional[datetime] = None


# =============================================================================
# Professional Access Request Schemas
# =============================================================================

class AccessRequestCreate(BaseModel):
    """Schema for creating an access request (professional-initiated)."""
    family_file_id: str
    requested_role: AssignmentRole = AssignmentRole.LEAD_ATTORNEY
    requested_scopes: list[str] = Field(
        default=["agreement", "schedule", "messages", "compliance"]
    )
    representing: Optional[str] = None
    message: Optional[str] = None


class InviteProfessionalRequest(BaseModel):
    """Schema for parent inviting a professional."""
    professional_email: Optional[EmailStr] = None
    professional_id: Optional[str] = None
    firm_id: Optional[str] = None
    requested_role: AssignmentRole = AssignmentRole.LEAD_ATTORNEY
    requested_scopes: list[str] = Field(
        default=["agreement", "schedule", "messages", "compliance"]
    )
    representing: Optional[str] = None
    message: Optional[str] = None


class AccessRequestApprove(BaseModel):
    """Schema for approving an access request."""
    pass  # Just the action, no data needed


class AccessRequestDecline(BaseModel):
    """Schema for declining an access request."""
    reason: Optional[str] = None


class AccessRequestResponse(BaseModel):
    """Schema for access request response."""
    id: str
    family_file_id: str
    professional_id: Optional[str] = None
    professional_email: Optional[str] = None
    firm_id: Optional[str] = None
    requested_by: str
    requested_by_user_id: str
    requested_role: AssignmentRole
    requested_scopes: list[str]
    representing: Optional[str] = None
    status: AccessRequestStatus
    parent_a_approved: bool
    parent_b_approved: bool
    parent_a_approved_at: Optional[datetime] = None
    parent_b_approved_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    declined_at: Optional[datetime] = None
    decline_reason: Optional[str] = None
    case_assignment_id: Optional[str] = None
    expires_at: datetime
    message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Related info
    family_file_title: Optional[str] = None
    professional_name: Optional[str] = None
    firm_name: Optional[str] = None
    requester_name: Optional[str] = None

    class Config:
        from_attributes = True


# =============================================================================
# Firm Template Schemas
# =============================================================================

class FirmTemplateCreate(BaseModel):
    """Schema for creating a firm template."""
    name: str = Field(..., min_length=2, max_length=200)
    template_type: TemplateType
    description: Optional[str] = None
    content: dict


class FirmTemplateUpdate(BaseModel):
    """Schema for updating a firm template."""
    name: Optional[str] = None
    description: Optional[str] = None
    content: Optional[dict] = None
    is_active: Optional[bool] = None


class FirmTemplateResponse(BaseModel):
    """Schema for firm template response."""
    id: str
    firm_id: str
    created_by: str
    name: str
    template_type: TemplateType
    description: Optional[str] = None
    content: dict
    version: int
    is_current: bool
    is_active: bool
    use_count: int
    last_used_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# Professional Message Schemas
# =============================================================================

class ProfessionalMessageCreate(BaseModel):
    """Schema for creating a professional message."""
    recipient_id: str
    subject: Optional[str] = None
    content: str = Field(..., min_length=1)
    thread_id: Optional[str] = None
    reply_to_id: Optional[str] = None
    attachments: Optional[list[dict]] = None


class ProfessionalMessageResponse(BaseModel):
    """Schema for professional message response."""
    id: str
    family_file_id: str
    case_assignment_id: str
    sender_id: str
    sender_type: str
    recipient_id: str
    subject: Optional[str] = None
    content: str
    thread_id: Optional[str] = None
    reply_to_id: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    attachments: Optional[list[dict]] = None
    sent_at: datetime
    created_at: datetime

    # Related info
    sender_name: Optional[str] = None
    recipient_name: Optional[str] = None

    class Config:
        from_attributes = True


class ProfessionalMessageThread(BaseModel):
    """Schema for a message thread."""
    thread_id: str
    family_file_id: str
    case_assignment_id: str
    subject: Optional[str] = None
    last_message_at: datetime
    message_count: int
    unread_count: int
    participants: list[str]
    messages: list[ProfessionalMessageResponse] = []


# =============================================================================
# Dashboard Schemas
# =============================================================================

class Alert(BaseModel):
    """Schema for dashboard alert."""
    id: str
    alert_type: str  # intake_completed, compliance_issue, court_date_approaching, etc.
    title: str
    description: str
    severity: str  # info, warning, critical
    family_file_id: Optional[str] = None
    family_file_title: Optional[str] = None
    created_at: datetime
    action_url: Optional[str] = None


class PendingAction(BaseModel):
    """Schema for pending action item."""
    id: str
    action_type: str  # review_intake, approve_request, sign_document, etc.
    title: str
    description: str
    family_file_id: Optional[str] = None
    family_file_title: Optional[str] = None
    due_at: Optional[datetime] = None
    created_at: datetime


class UpcomingEvent(BaseModel):
    """Schema for upcoming event."""
    id: str
    title: str
    event_type: str
    event_date: datetime
    family_file_id: Optional[str] = None
    family_file_title: Optional[str] = None
    location: Optional[str] = None
    is_mandatory: bool = False


class RecentActivity(BaseModel):
    """Schema for recent activity item."""
    id: str
    activity_type: str
    title: str
    description: str
    family_file_id: Optional[str] = None
    family_file_title: Optional[str] = None
    actor_name: Optional[str] = None
    created_at: datetime


class CaseSummaryCard(BaseModel):
    """Schema for case summary on dashboard."""
    id: str
    family_file_id: str
    family_file_number: str
    title: str
    parent_a_name: Optional[str] = None
    parent_b_name: Optional[str] = None
    assignment_role: AssignmentRole
    representing: Optional[str] = None
    status: AssignmentStatus
    children_count: int = 0
    unread_messages: int = 0
    pending_actions: int = 0
    last_activity_at: Optional[datetime] = None
    next_event: Optional[UpcomingEvent] = None


class ProfessionalDashboard(BaseModel):
    """Schema for professional dashboard."""
    case_count: int
    active_cases: int
    pending_intakes: int
    pending_approvals: int
    unread_messages: int

    cases: list[CaseSummaryCard] = []
    alerts: list[Alert] = []
    pending_actions: list[PendingAction] = []
    upcoming_events: list[UpcomingEvent] = []
    recent_activity: list[RecentActivity] = []


# =============================================================================
# Timeline Schemas
# =============================================================================

class TimelineEvent(BaseModel):
    """Schema for a timeline event."""
    id: str
    event_type: str  # message, agreement, exchange, payment, court_event, aria_flag
    title: str
    description: Optional[str] = None
    timestamp: datetime
    actor_name: Optional[str] = None
    actor_type: Optional[str] = None  # parent_a, parent_b, system, court

    # Event-specific data
    details: Optional[dict] = None

    # Flags
    is_flagged: bool = False
    flag_severity: Optional[str] = None


class CaseTimeline(BaseModel):
    """Schema for case timeline."""
    family_file_id: str
    family_file_title: str
    total_events: int
    events: list[TimelineEvent]

    # Filters applied
    date_start: Optional[datetime] = None
    date_end: Optional[datetime] = None
    event_types: Optional[list[str]] = None


class TimelineFilters(BaseModel):
    """Schema for timeline filter options."""
    date_start: Optional[datetime] = None
    date_end: Optional[datetime] = None
    event_types: Optional[list[str]] = None
    actor_types: Optional[list[str]] = None
    flagged_only: bool = False
    limit: int = 100
    offset: int = 0


# =============================================================================
# ARIA Control Schemas
# =============================================================================

class ARIASettings(BaseModel):
    """Schema for ARIA settings on a case."""
    aria_enabled: bool
    aria_provider: str  # claude, openai, regex
    sensitivity_level: str = "medium"  # low, medium, high
    auto_intervene: bool = True
    intervention_threshold: float = 0.3
    cool_down_minutes: int = 0
    court_locked: bool = False  # If court has locked ARIA settings


class ARIASettingsUpdate(BaseModel):
    """Schema for updating ARIA settings."""
    aria_enabled: Optional[bool] = None
    aria_provider: Optional[str] = None
    sensitivity_level: Optional[str] = None
    auto_intervene: Optional[bool] = None
    intervention_threshold: Optional[float] = None
    cool_down_minutes: Optional[int] = None


class ARIAMetrics(BaseModel):
    """Schema for ARIA good faith metrics."""
    parent_a: "ParentARIAMetrics"
    parent_b: "ParentARIAMetrics"
    overall_health: str  # excellent, good, fair, concerning
    trend: str  # improving, stable, declining


class ParentARIAMetrics(BaseModel):
    """Schema for per-parent ARIA metrics."""
    total_messages: int
    flagged_messages: int
    flag_rate: float
    suggestions_accepted: int
    suggestions_modified: int
    suggestions_rejected: int
    acceptance_rate: float
    average_toxicity: float
    trend: str  # improving, stable, worsening
    compliance_score: str  # excellent, good, fair, needs_improvement


class ARIAIntervention(BaseModel):
    """Schema for ARIA intervention record."""
    id: str
    message_id: str
    timestamp: datetime
    sender_name: str
    sender_type: str
    toxicity_score: float
    severity: str
    categories: list[str]
    original_content_preview: Optional[str] = None  # First 100 chars, redacted
    suggested_content_preview: Optional[str] = None
    user_action: str  # accepted, modified, rejected, held
    intervention_level: int


class ARIAInterventionResponse(BaseModel):
    """Schema for ARIA intervention API response."""
    id: Optional[str] = None
    message_id: Optional[str] = None
    intervention_type: Optional[str] = None
    trigger_text: Optional[str] = None
    original_text: Optional[str] = None
    suggested_text: Optional[str] = None
    action_taken: Optional[str] = None
    sender_id: Optional[str] = None
    sender_role: Optional[str] = None
    created_at: Optional[datetime] = None


# =============================================================================
# Compliance Schemas
# =============================================================================

class ComplianceOverview(BaseModel):
    """Schema for case compliance overview."""
    family_file_id: str
    period_start: datetime
    period_end: datetime

    exchange_compliance: "ExchangeComplianceSummary"
    financial_compliance: "FinancialComplianceSummary"
    communication_compliance: "CommunicationComplianceSummary"

    overall_score: float  # 0-100
    overall_status: str  # excellent, good, fair, concerning


class ExchangeComplianceSummary(BaseModel):
    """Schema for exchange compliance summary."""
    total_exchanges: int
    completed_on_time: int
    completed_late: int
    missed: int
    disputed: int
    completion_rate: float
    on_time_rate: float

    parent_a_compliance: float
    parent_b_compliance: float


class FinancialComplianceSummary(BaseModel):
    """Schema for financial compliance summary."""
    total_obligations: int
    paid_on_time: int
    paid_late: int
    overdue: int
    disputed: int
    total_amount: float
    paid_amount: float
    overdue_amount: float

    parent_a_compliance: float
    parent_b_compliance: float


class CommunicationComplianceSummary(BaseModel):
    """Schema for communication compliance summary."""
    total_messages: int
    flagged_messages: int
    flag_rate: float
    average_response_time_hours: float

    parent_a_flag_rate: float
    parent_b_flag_rate: float


# =============================================================================
# Directory Search Schemas
# =============================================================================

class DirectorySearchRequest(BaseModel):
    """Schema for searching the firm directory."""
    query: Optional[str] = None
    state: Optional[str] = None
    firm_type: Optional[FirmType] = None
    practice_areas: Optional[list[str]] = None
    limit: int = 20
    offset: int = 0


class DirectorySearchResponse(BaseModel):
    """Schema for directory search response."""
    total: int
    firms: list[FirmPublicResponse]


# =============================================================================
# Professional Intake Schemas
# =============================================================================

class IntakeSessionCreate(BaseModel):
    """Schema for creating an intake session from professional portal."""
    client_name: str = Field(..., min_length=1, max_length=200)
    client_email: EmailStr
    client_phone: Optional[str] = None
    intake_type: str = "custody"
    notes: Optional[str] = None
    target_forms: Optional[list[str]] = None
    custom_questions: Optional[list[dict]] = None


class IntakeSessionUpdate(BaseModel):
    """Schema for updating intake session."""
    notes: Optional[str] = None
    status: Optional[str] = None
    professional_notes: Optional[str] = None


class IntakeSessionListItem(BaseModel):
    """Schema for intake session in list view."""
    id: str
    session_number: str
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    status: str
    intake_type: str = "custody"
    message_count: int = 0
    has_summary: bool = False
    family_file_id: Optional[str] = None
    case_assignment_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class IntakeSessionDetail(IntakeSessionListItem):
    """Schema for detailed intake session view."""
    client_phone: Optional[str] = None
    intake_link: str
    notes: Optional[str] = None
    target_forms: list[str] = []
    professional_notes: Optional[str] = None
    professional_reviewed: bool = False
    professional_reviewed_at: Optional[datetime] = None
    clarification_requested: bool = False
    clarification_request: Optional[str] = None
    started_at: Optional[datetime] = None
    parent_confirmed: bool = False
    parent_confirmed_at: Optional[datetime] = None


class IntakeMessageItem(BaseModel):
    """Schema for intake conversation message."""
    id: str
    role: str  # "assistant" or "user"
    content: str
    created_at: datetime


class IntakeTranscriptResponse(BaseModel):
    """Schema for intake transcript response."""
    session_id: str
    messages: list[IntakeMessageItem]
    total_messages: int


class IntakeSummaryChild(BaseModel):
    """Schema for child info in intake summary."""
    name: str
    age: Optional[int] = None
    special_needs: Optional[str] = None


class IntakeSummary(BaseModel):
    """Schema for AI-generated intake summary."""
    client_info: dict
    case_overview: Optional[str] = None
    children: list[IntakeSummaryChild] = []
    current_situation: Optional[str] = None
    goals: list[str] = []
    concerns: list[str] = []
    other_party_info: Optional[str] = None
    timeline: Optional[str] = None
    recommended_actions: list[str] = []
    confidence_score: float = 0.0


class IntakeExtractedData(BaseModel):
    """Schema for extracted form data from intake."""
    parties: Optional[dict] = None
    children: list[dict] = []
    custody_preferences: Optional[dict] = None
    financial_info: Optional[dict] = None
    schedule_preferences: Optional[dict] = None
    special_considerations: list[str] = []


class IntakeOutputsResponse(BaseModel):
    """Schema for intake outputs (summary + extracted data)."""
    session_id: str
    summary: Optional[IntakeSummary] = None
    extracted_data: Optional[IntakeExtractedData] = None
    draft_form_url: Optional[str] = None


class IntakeClarificationRequest(BaseModel):
    """Schema for requesting clarification from client."""
    questions: list[str]
    message: Optional[str] = None


class IntakeSessionListResponse(BaseModel):
    """Schema for paginated intake sessions list."""
    items: list[IntakeSessionListItem]
    total: int
    limit: int
    offset: int


# =============================================================================
# Professional Event Schemas
# =============================================================================

class ProfessionalEventBase(BaseModel):
    """Base schema for professional calendar events."""
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    event_type: EventType = EventType.MEETING
    start_time: datetime
    end_time: datetime
    all_day: bool = False
    timezone: Optional[str] = "UTC"
    location: Optional[str] = None
    virtual_meeting_url: Optional[str] = None
    family_file_id: Optional[str] = None
    attendee_ids: Optional[list[str]] = None
    attendee_emails: Optional[list[str]] = None
    parent_visibility: EventVisibility = EventVisibility.NONE
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None
    reminder_minutes: Optional[int] = None  # Single value, not list (matches model)
    notes: Optional[str] = None
    color: Optional[str] = None


class ProfessionalEventCreate(ProfessionalEventBase):
    """Schema for creating a professional event."""
    pass


class ProfessionalEventUpdate(BaseModel):
    """Schema for updating a professional event."""
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    event_type: Optional[EventType] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    all_day: Optional[bool] = None
    timezone: Optional[str] = None
    location: Optional[str] = None
    virtual_meeting_url: Optional[str] = None
    family_file_id: Optional[str] = None
    attendee_ids: Optional[list[str]] = None
    attendee_emails: Optional[list[str]] = None
    parent_visibility: Optional[EventVisibility] = None
    is_recurring: Optional[bool] = None
    recurrence_rule: Optional[str] = None
    reminder_minutes: Optional[int] = None  # Single value, not list (matches model)
    notes: Optional[str] = None
    color: Optional[str] = None
    is_cancelled: Optional[bool] = None


class ProfessionalEventResponse(ProfessionalEventBase):
    """Schema for professional event response."""
    id: str
    professional_id: Optional[str] = None  # Can be None for non-professional events
    firm_id: Optional[str] = None
    family_file_title: Optional[str] = None
    parent_event_id: Optional[str] = None
    is_cancelled: bool = False
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None

    class Config:
        from_attributes = True


class EventConflict(BaseModel):
    """Schema for a scheduling conflict."""
    event_id: str
    title: str
    start_time: datetime
    end_time: datetime
    event_type: str
    overlap_minutes: int


class ConflictCheckResponse(BaseModel):
    """Schema for conflict check results."""
    has_conflicts: bool
    conflicts: list[EventConflict]


class ProfessionalEventListResponse(BaseModel):
    """Schema for paginated event list."""
    events: list[ProfessionalEventResponse]
    total: int
    limit: int
    offset: int


class CalendarSummary(BaseModel):
    """Schema for calendar summary statistics."""
    total_events: int
    active_events: int
    cancelled_events: int
    events_by_type: dict[str, int]
    period_start: str
    period_end: str


# =============================================================================
# Invitation Case Preview Schemas
# =============================================================================

class InvitationAgreementPreview(BaseModel):
    """Schema for agreement summary in invitation preview."""
    has_active_agreement: bool = False
    agreement_title: Optional[str] = None
    total_sections: int = 0
    completed_sections: int = 0
    last_updated: Optional[datetime] = None
    key_sections: list[str] = []  # Names of filled sections


class InvitationCompliancePreview(BaseModel):
    """Schema for compliance summary in invitation preview."""
    exchange_completion_rate: Optional[float] = None
    on_time_rate: Optional[float] = None
    total_exchanges_30d: int = 0
    completed_exchanges_30d: int = 0
    communication_flag_rate: Optional[float] = None
    overall_health: str = "unknown"  # excellent, good, fair, concerning, unknown


class InvitationMessagePreview(BaseModel):
    """Schema for message trends in invitation preview."""
    total_messages_30d: int = 0
    flagged_messages_30d: int = 0
    flag_rate: float = 0.0
    parent_a_messages: int = 0
    parent_b_messages: int = 0
    last_message_at: Optional[datetime] = None


class InvitationClearFundPreview(BaseModel):
    """Schema for ClearFund summary in invitation preview."""
    total_obligations: int = 0
    pending_obligations: int = 0
    total_amount: float = 0.0
    paid_amount: float = 0.0
    overdue_amount: float = 0.0
    categories: list[str] = []


class InvitationChildPreview(BaseModel):
    """Schema for child info in invitation preview."""
    id: str
    first_name: str
    age: Optional[int] = None
    has_special_needs: bool = False


class InvitationCasePreview(BaseModel):
    """Schema for full case preview on invitation."""
    family_file_id: str
    family_file_number: Optional[str] = None
    family_file_title: Optional[str] = None
    state: Optional[str] = None
    county: Optional[str] = None
    created_at: Optional[datetime] = None

    # Parents info
    parent_a_name: Optional[str] = None
    parent_b_name: Optional[str] = None

    # Children
    children: list[InvitationChildPreview] = []

    # Preview sections
    agreement: InvitationAgreementPreview
    compliance: InvitationCompliancePreview
    messages: InvitationMessagePreview
    clearfund: InvitationClearFundPreview

    # Request info
    requested_role: Optional[str] = None
    requested_scopes: list[str] = []
    representing: Optional[str] = None
    message: Optional[str] = None


# Forward references for nested models
ProfessionalProfileWithFirms.model_rebuild()
FirmWithMembers.model_rebuild()
ARIAMetrics.model_rebuild()
ComplianceOverview.model_rebuild()
