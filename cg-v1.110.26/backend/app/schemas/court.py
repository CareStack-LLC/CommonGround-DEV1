"""
Court Access Mode schemas.

Pydantic schemas for court professional access, settings, events, and reports.
"""

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from app.models.court import (
    CourtRole,
    AccessScope,
    GrantStatus,
    CourtEventType,
    CourtMessageType,
    ReportType,
    DEFAULT_ACCESS_DURATION,
)


# =============================================================================
# Court Professional Schemas
# =============================================================================

class CourtProfessionalBase(BaseModel):
    """Base schema for court professional."""
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=200)
    phone: Optional[str] = None
    role: CourtRole
    organization: Optional[str] = None
    title: Optional[str] = None
    credentials: Optional[dict] = None


class CourtProfessionalCreate(CourtProfessionalBase):
    """Schema for creating a court professional."""
    pass


class CourtProfessionalUpdate(BaseModel):
    """Schema for updating a court professional."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    organization: Optional[str] = None
    title: Optional[str] = None
    credentials: Optional[dict] = None
    is_active: Optional[bool] = None


class CourtProfessionalResponse(CourtProfessionalBase):
    """Schema for court professional response."""
    id: str
    is_verified: bool
    verified_at: Optional[datetime] = None
    mfa_enabled: bool
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CourtProfessionalVerify(BaseModel):
    """Schema for verifying a court professional."""
    verification_method: str = Field(..., description="bar_lookup, court_email, appointment_letter")
    credentials: Optional[dict] = None


# =============================================================================
# Court Access Grant Schemas
# =============================================================================

class AccessGrantRequest(BaseModel):
    """Schema for requesting access to a case."""
    case_id: str
    role: CourtRole
    access_scope: list[AccessScope] = Field(
        default=[AccessScope.AGREEMENT, AccessScope.SCHEDULE, AccessScope.COMPLIANCE]
    )
    data_start_date: Optional[date] = None
    data_end_date: Optional[date] = None
    authorization_type: str = Field(..., description="court_order, parental_consent, appointment")
    authorization_reference: Optional[str] = None
    duration_days: Optional[int] = None  # Uses role default if not specified
    notes: Optional[str] = None


class AccessGrantCreate(BaseModel):
    """Schema for creating an access grant (internal use)."""
    case_id: str
    professional_id: str
    role: CourtRole
    access_scope: list[AccessScope]
    data_start_date: Optional[date] = None
    data_end_date: Optional[date] = None
    authorization_type: str
    authorization_reference: Optional[str] = None
    expires_at: datetime
    sealed_items_access: bool = False
    notes: Optional[str] = None


class AccessGrantResponse(BaseModel):
    """Schema for access grant response."""
    id: str
    case_id: str
    professional_id: str
    role: str
    access_scope: list[str]
    data_start_date: Optional[date] = None
    data_end_date: Optional[date] = None
    authorization_type: str
    authorization_reference: Optional[str] = None
    status: str
    granted_at: datetime
    activated_at: Optional[datetime] = None
    expires_at: datetime
    days_remaining: int
    is_active: bool
    petitioner_approved: bool
    respondent_approved: bool
    access_count: int
    last_accessed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AccessGrantApproval(BaseModel):
    """Schema for parent approval of access grant."""
    approved: bool
    notes: Optional[str] = None


class AccessGrantRevoke(BaseModel):
    """Schema for revoking access."""
    reason: str = Field(..., min_length=10, max_length=500)


class AccessLinkResponse(BaseModel):
    """Schema for access link generation."""
    grant_id: str
    access_link: str
    access_code: str
    expires_at: datetime


# =============================================================================
# Court Access Log Schemas
# =============================================================================

class AccessLogEntry(BaseModel):
    """Schema for access log entry."""
    id: str
    grant_id: str
    professional_id: str
    case_id: str
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[dict] = None
    ip_address: Optional[str] = None
    logged_at: datetime

    class Config:
        from_attributes = True


class AccessLogList(BaseModel):
    """Schema for list of access logs."""
    logs: list[AccessLogEntry]
    total: int
    page: int
    per_page: int


# =============================================================================
# Court Case Settings Schemas
# =============================================================================

class CourtSettingsBase(BaseModel):
    """Base schema for court settings."""
    gps_checkins_required: bool = False
    supervised_exchange_required: bool = False
    aria_enforcement_locked: bool = False
    in_app_communication_only: bool = False
    agreement_edits_locked: bool = False
    investigation_mode: bool = False
    child_safety_tracking: bool = False
    financial_verification_required: bool = False


class CourtSettingsCreate(CourtSettingsBase):
    """Schema for creating court settings."""
    case_id: str
    court_order_reference: Optional[str] = None
    notes: Optional[str] = None


class CourtSettingsUpdate(BaseModel):
    """Schema for updating court settings."""
    gps_checkins_required: Optional[bool] = None
    supervised_exchange_required: Optional[bool] = None
    aria_enforcement_locked: Optional[bool] = None
    in_app_communication_only: Optional[bool] = None
    agreement_edits_locked: Optional[bool] = None
    investigation_mode: Optional[bool] = None
    child_safety_tracking: Optional[bool] = None
    financial_verification_required: Optional[bool] = None
    court_order_reference: Optional[str] = None
    notes: Optional[str] = None


class CourtSettingsResponse(CourtSettingsBase):
    """Schema for court settings response."""
    id: str
    case_id: str
    set_by_professional_id: Optional[str] = None
    set_at: Optional[datetime] = None
    court_order_reference: Optional[str] = None
    notes: Optional[str] = None
    active_controls: list[str]
    settings_history: Optional[list] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CourtSettingsPublic(BaseModel):
    """Schema for settings visible to parents (limited info)."""
    gps_checkins_required: bool
    supervised_exchange_required: bool
    aria_enforcement_locked: bool
    in_app_communication_only: bool
    agreement_edits_locked: bool
    active_controls: list[str]
    is_court_controlled: bool = True


# =============================================================================
# Court Event Schemas
# =============================================================================

class CourtEventBase(BaseModel):
    """Base schema for court event."""
    event_type: CourtEventType
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    event_date: date
    start_time: Optional[str] = None  # HH:MM format
    end_time: Optional[str] = None
    location: Optional[str] = None
    virtual_link: Optional[str] = None
    petitioner_required: bool = True
    respondent_required: bool = True
    is_mandatory: bool = True
    shared_notes: Optional[str] = None


class CourtEventCreate(CourtEventBase):
    """Schema for creating a court event."""
    case_id: str
    internal_notes: Optional[str] = None


class CourtEventUpdate(BaseModel):
    """Schema for updating a court event."""
    event_type: Optional[CourtEventType] = None
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    virtual_link: Optional[str] = None
    petitioner_required: Optional[bool] = None
    respondent_required: Optional[bool] = None
    is_mandatory: Optional[bool] = None
    status: Optional[str] = None
    internal_notes: Optional[str] = None
    shared_notes: Optional[str] = None


class CourtEventAttendance(BaseModel):
    """Schema for recording attendance."""
    petitioner_attended: Optional[bool] = None
    respondent_attended: Optional[bool] = None
    petitioner_attendance_notes: Optional[str] = None
    respondent_attendance_notes: Optional[str] = None


class CourtEventResponse(CourtEventBase):
    """Schema for court event response."""
    id: str
    case_id: str
    created_by: str
    status: str
    internal_notes: Optional[str] = None  # Only for court staff
    petitioner_attended: Optional[bool] = None
    respondent_attended: Optional[bool] = None
    attendance_summary: str
    is_past: bool
    reminder_sent: bool
    # RSVP tracking for parent responses
    petitioner_rsvp_status: Optional[str] = None
    respondent_rsvp_status: Optional[str] = None
    petitioner_rsvp_at: Optional[datetime] = None
    respondent_rsvp_at: Optional[datetime] = None
    petitioner_rsvp_notes: Optional[str] = None
    respondent_rsvp_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CourtEventPublic(BaseModel):
    """Schema for event visible to parents (no internal notes)."""
    id: str
    event_type: str
    title: str
    description: Optional[str] = None
    event_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    virtual_link: Optional[str] = None
    is_mandatory: bool
    status: str
    shared_notes: Optional[str] = None
    is_court_event: bool = True


# =============================================================================
# Court Message Schemas
# =============================================================================

class CourtMessageCreate(BaseModel):
    """Schema for creating a court message."""
    case_id: str
    message_type: CourtMessageType
    subject: Optional[str] = None
    content: str = Field(..., min_length=10)
    to_petitioner: bool = True
    to_respondent: bool = True
    replies_allowed: bool = False
    is_urgent: bool = False
    attachments: Optional[list[dict]] = None


class CourtMessageResponse(BaseModel):
    """Schema for court message response."""
    id: str
    case_id: str
    sent_by: str
    message_type: str
    subject: Optional[str] = None
    content: str
    to_petitioner: bool
    to_respondent: bool
    petitioner_read_at: Optional[datetime] = None
    respondent_read_at: Optional[datetime] = None
    is_fully_read: bool
    replies_allowed: bool
    is_urgent: bool
    attachments: Optional[list[dict]] = None
    sent_at: datetime

    class Config:
        from_attributes = True


class CourtMessagePublic(BaseModel):
    """Schema for message visible to parents."""
    id: str
    message_type: str
    subject: Optional[str] = None
    content: str
    is_urgent: bool
    attachments: Optional[list[dict]] = None
    sent_at: datetime
    is_court_message: bool = True


# =============================================================================
# Investigation Report Schemas
# =============================================================================

class ReportRequest(BaseModel):
    """Schema for requesting a report."""
    case_id: str
    report_type: ReportType
    title: Optional[str] = None
    date_range_start: date
    date_range_end: date
    sections_included: list[str] = Field(
        default=["agreement", "compliance", "schedule"]
    )
    purpose: Optional[str] = None
    is_permanent: bool = True


class ReportResponse(BaseModel):
    """Schema for report response."""
    id: str
    case_id: str
    generated_by: str
    report_number: str
    report_type: str
    title: str
    date_range_start: date
    date_range_end: date
    sections_included: list[str]
    file_url: Optional[str] = None
    file_size_bytes: Optional[int] = None
    page_count: Optional[int] = None
    content_hash: str
    watermark_text: str
    verification_url: str
    evidence_counts: Optional[dict] = None
    status: str
    download_count: int
    purpose: Optional[str] = None
    generated_at: datetime
    expires_at: Optional[datetime] = None
    is_expired: bool

    class Config:
        from_attributes = True


class ReportVerification(BaseModel):
    """Schema for report verification response."""
    report_number: str
    is_valid: bool
    content_hash: str
    generated_at: datetime
    generated_by: str  # Professional name
    case_id: str
    verification_timestamp: datetime


# =============================================================================
# ARIA Court Query Schemas
# =============================================================================

class ARIACourtQuery(BaseModel):
    """Schema for ARIA court query."""
    case_id: str
    query: str = Field(..., min_length=5, max_length=500)


class ARIACourtResponse(BaseModel):
    """Schema for ARIA court response."""
    query: str
    response: str
    data: Optional[dict] = None  # Structured data if applicable
    sources: list[str] = []  # What data was referenced
    disclaimer: str = "This response contains factual information only. No recommendations or interpretations are provided."


class ARIASuggestion(BaseModel):
    """Schema for suggested ARIA queries."""
    category: str
    queries: list[str]


class ARIASuggestionList(BaseModel):
    """Schema for list of ARIA suggestions."""
    suggestions: list[ARIASuggestion]


# =============================================================================
# Court Portal Authentication
# =============================================================================

class CourtLoginRequest(BaseModel):
    """Schema for court portal login."""
    email: EmailStr
    access_code: Optional[str] = None  # For initial access link


class CourtMFARequest(BaseModel):
    """Schema for MFA verification."""
    code: str = Field(..., min_length=6, max_length=6)


class CourtLoginResponse(BaseModel):
    """Schema for court login response."""
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    professional: CourtProfessionalResponse
    active_grants: list[AccessGrantResponse]


# =============================================================================
# Summary Schemas
# =============================================================================

class CaseCourtSummary(BaseModel):
    """Summary of court-related info for a case."""
    case_id: str
    has_court_settings: bool
    active_controls: list[str]
    active_grants_count: int
    upcoming_court_events: int
    unread_court_messages: int
    investigation_mode: bool


class CourtDashboardStats(BaseModel):
    """Stats for court professional dashboard."""
    active_cases: int
    pending_approvals: int
    upcoming_events: int
    recent_reports: int
    access_expiring_soon: int  # Grants expiring within 7 days


# =============================================================================
# Compliance Snapshot Schemas
# =============================================================================

class ComplianceStatus(str):
    """Compliance status indicator."""
    GREEN = "green"    # 🟢 Good standing
    AMBER = "amber"    # 🟡 Needs attention
    RED = "red"        # 🔴 Serious issues


class CategoryCompliance(BaseModel):
    """Compliance details for a specific category."""
    status: str  # green, amber, red
    score: float  # 0-100
    metrics: dict  # Category-specific metrics
    issues: list[str] = []  # Current issues/concerns


class ComplianceSnapshot(BaseModel):
    """
    Comprehensive compliance snapshot for court dashboard.

    Aggregates data from schedule, messages, financial, and items
    to provide a unified compliance view.
    """
    case_id: str
    generated_at: datetime

    # Overall status
    overall_status: str  # green, amber, red
    overall_score: float  # 0-100 weighted average

    # Category breakdowns
    schedule_compliance: CategoryCompliance
    communication_compliance: CategoryCompliance
    financial_compliance: CategoryCompliance
    item_compliance: CategoryCompliance

    # Quick stats
    days_monitored: int
    total_exchanges: int
    on_time_rate: float
    flagged_messages_count: int
    overdue_obligations: int
    disputed_items: int

    # Trends (optional)
    trend: Optional[str] = None  # improving, stable, declining

    class Config:
        from_attributes = True


class ComplianceThresholds(BaseModel):
    """Configurable thresholds for compliance scoring."""
    # Schedule thresholds
    on_time_green: float = 90.0  # >= 90% on-time = green
    on_time_amber: float = 70.0  # >= 70% on-time = amber, below = red

    # Communication thresholds
    flagged_rate_green: float = 5.0   # <= 5% flagged = green
    flagged_rate_amber: float = 15.0  # <= 15% flagged = amber

    # Financial thresholds
    overdue_green: int = 0   # 0 overdue = green
    overdue_amber: int = 2   # <= 2 overdue = amber

    # Item thresholds
    disputes_green: int = 0   # 0 disputes = green
    disputes_amber: int = 1   # 1 dispute = amber


# =============================================================================
# Exchange Compliance Schemas (Silent Handoff Integration)
# =============================================================================

class ParentExchangeMetrics(BaseModel):
    """Metrics for a single parent's exchange compliance."""
    check_ins: int = 0
    avg_distance_meters: Optional[float] = None
    geofence_hit_rate: float = 0  # 0-100 percentage
    on_time_rate: float = 0  # 0-100 percentage


class ExchangeComplianceMetrics(BaseModel):
    """
    Detailed exchange compliance metrics from Silent Handoff GPS verification.

    Used by courts/GALs to view objective custody exchange evidence.
    """
    total_exchanges: int = 0
    completed: int = 0
    missed: int = 0
    one_party_only: int = 0
    disputed: int = 0
    gps_verified_rate: float = 0  # % of exchanges with GPS check-in
    geofence_compliance_rate: float = 0  # % within designated geofence
    on_time_rate: float = 0  # % within check-in window
    petitioner_metrics: ParentExchangeMetrics
    respondent_metrics: ParentExchangeMetrics
    date_range: Optional[dict] = None  # {start, end}


class ExchangeGPSData(BaseModel):
    """GPS check-in data for a parent."""
    lat: Optional[float] = None
    lng: Optional[float] = None
    accuracy_meters: Optional[float] = None
    distance_meters: Optional[float] = None
    in_geofence: Optional[bool] = None


class ExchangeParentDetail(BaseModel):
    """Detailed check-in info for a parent in an exchange."""
    role: str  # petitioner, respondent, unassigned
    checked_in: bool = False
    check_in_time: Optional[str] = None
    gps: Optional[ExchangeGPSData] = None


class ExchangeLocationDetail(BaseModel):
    """Location details for an exchange."""
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    geofence_radius_meters: Optional[int] = None


class ExchangeDetail(BaseModel):
    """Detailed exchange instance data for court export."""
    id: str
    exchange_id: str
    title: str
    scheduled_time: str
    status: str
    outcome: Optional[str] = None
    location: ExchangeLocationDetail
    from_parent: ExchangeParentDetail
    to_parent: ExchangeParentDetail
    qr_confirmation: dict  # {required, confirmed_at}
    window: dict  # {start, end, auto_closed}
    silent_handoff_enabled: bool = False
    notes: Optional[str] = None
    static_map_url: Optional[str] = None  # Mapbox Static API URL


class ExchangeComplianceResponse(BaseModel):
    """Response for exchange compliance endpoint."""
    case_id: str
    metrics: ExchangeComplianceMetrics
    recent_exchanges: list[dict]  # Last 5 exchanges for quick view
    overall_status: str  # excellent, good, needs_improvement, concerning, no_data
    generated_at: str


# =============================================================================
# Court Event Template Schemas
# =============================================================================

class CourtEventTemplate(BaseModel):
    """Pre-configured template for court events."""
    id: str
    name: str
    event_type: str
    description: str
    default_duration_minutes: int
    typical_location: Optional[str] = None
    petitioner_required: bool = True
    respondent_required: bool = True
    is_mandatory: bool = True
    requires_attorney: bool = False
    notes_template: Optional[str] = None
    icon: str = "calendar"
    color: str = "indigo"


class CourtEventTemplateList(BaseModel):
    """List of available event templates."""
    templates: list[CourtEventTemplate]


# Predefined court event templates
COURT_EVENT_TEMPLATES = [
    CourtEventTemplate(
        id="hearing_custody",
        name="Custody Hearing",
        event_type="hearing",
        description="Court hearing to determine custody arrangements",
        default_duration_minutes=60,
        typical_location="Courtroom",
        petitioner_required=True,
        respondent_required=True,
        is_mandatory=True,
        requires_attorney=False,
        notes_template="Custody hearing regarding: ",
        icon="gavel",
        color="red",
    ),
    CourtEventTemplate(
        id="hearing_modification",
        name="Modification Hearing",
        event_type="hearing",
        description="Hearing to modify existing custody order",
        default_duration_minutes=45,
        typical_location="Courtroom",
        petitioner_required=True,
        respondent_required=True,
        is_mandatory=True,
        requires_attorney=False,
        notes_template="Modification request: ",
        icon="edit",
        color="orange",
    ),
    CourtEventTemplate(
        id="mediation",
        name="Mediation Session",
        event_type="mediation",
        description="Facilitated discussion to resolve disputes",
        default_duration_minutes=120,
        typical_location="Mediation Center",
        petitioner_required=True,
        respondent_required=True,
        is_mandatory=True,
        requires_attorney=False,
        notes_template="Topics for mediation: ",
        icon="users",
        color="green",
    ),
    CourtEventTemplate(
        id="status_conference",
        name="Status Conference",
        event_type="conference",
        description="Check-in on case progress and compliance",
        default_duration_minutes=30,
        typical_location="Courtroom or virtual",
        petitioner_required=True,
        respondent_required=True,
        is_mandatory=True,
        requires_attorney=False,
        notes_template="Status update topics: ",
        icon="clipboard",
        color="blue",
    ),
    CourtEventTemplate(
        id="settlement_conference",
        name="Settlement Conference",
        event_type="conference",
        description="Attempt to reach agreement before trial",
        default_duration_minutes=90,
        typical_location="Conference room",
        petitioner_required=True,
        respondent_required=True,
        is_mandatory=True,
        requires_attorney=True,
        notes_template="Settlement items to discuss: ",
        icon="handshake",
        color="purple",
    ),
    CourtEventTemplate(
        id="review_hearing",
        name="Review Hearing",
        event_type="review",
        description="Follow-up to review compliance with orders",
        default_duration_minutes=30,
        typical_location="Courtroom",
        petitioner_required=True,
        respondent_required=True,
        is_mandatory=True,
        requires_attorney=False,
        notes_template="Items under review: ",
        icon="search",
        color="amber",
    ),
    CourtEventTemplate(
        id="deadline_filing",
        name="Filing Deadline",
        event_type="deadline",
        description="Deadline for submitting documents to court",
        default_duration_minutes=0,
        typical_location=None,
        petitioner_required=False,
        respondent_required=False,
        is_mandatory=True,
        requires_attorney=False,
        notes_template="Documents due: ",
        icon="file-text",
        color="gray",
    ),
    CourtEventTemplate(
        id="deadline_response",
        name="Response Deadline",
        event_type="deadline",
        description="Deadline for responding to motion or petition",
        default_duration_minutes=0,
        typical_location=None,
        petitioner_required=False,
        respondent_required=False,
        is_mandatory=True,
        requires_attorney=False,
        notes_template="Response required for: ",
        icon="clock",
        color="red",
    ),
    CourtEventTemplate(
        id="parenting_class",
        name="Parenting Class",
        event_type="other",
        description="Court-ordered parenting education class",
        default_duration_minutes=240,
        typical_location="Community center or virtual",
        petitioner_required=True,
        respondent_required=True,
        is_mandatory=True,
        requires_attorney=False,
        notes_template="Class topic: ",
        icon="book",
        color="teal",
    ),
    CourtEventTemplate(
        id="gal_interview",
        name="GAL Interview",
        event_type="other",
        description="Interview with Guardian ad Litem",
        default_duration_minutes=60,
        typical_location="GAL office or home visit",
        petitioner_required=False,
        respondent_required=False,
        is_mandatory=True,
        requires_attorney=False,
        notes_template="GAL interview purpose: ",
        icon="user-check",
        color="indigo",
    ),
    CourtEventTemplate(
        id="child_custody_evaluation",
        name="Custody Evaluation",
        event_type="other",
        description="Professional evaluation for custody recommendations",
        default_duration_minutes=120,
        typical_location="Evaluator's office",
        petitioner_required=False,
        respondent_required=False,
        is_mandatory=True,
        requires_attorney=False,
        notes_template="Evaluation focus: ",
        icon="clipboard-check",
        color="purple",
    ),
]


# =============================================================================
# Predefined Report Types
# =============================================================================

class PredefinedReportType(BaseModel):
    """Pre-configured report type for quick generation."""
    id: str
    name: str
    description: str
    sections_included: list[str]
    default_date_range_days: int
    icon: str = "file-text"
    color: str = "indigo"
    requires_date_range: bool = True


class PredefinedReportTypeList(BaseModel):
    """List of available report types."""
    report_types: list[PredefinedReportType]


# Predefined report types for courts
PREDEFINED_REPORT_TYPES = [
    PredefinedReportType(
        id="attendance_compliance",
        name="Attendance Compliance Report",
        description="Summary of exchange attendance and on-time rates",
        sections_included=["schedule", "compliance", "exchanges"],
        default_date_range_days=30,
        icon="calendar-check",
        color="green",
    ),
    PredefinedReportType(
        id="financial_summary",
        name="Financial Summary Report",
        description="Overview of financial obligations and payment history",
        sections_included=["financial", "obligations", "payments"],
        default_date_range_days=90,
        icon="dollar-sign",
        color="blue",
    ),
    PredefinedReportType(
        id="communication_analysis",
        name="Communication Analysis Report",
        description="Analysis of parent communication patterns and flagged messages",
        sections_included=["messages", "flagged_content", "response_times"],
        default_date_range_days=30,
        icon="message-square",
        color="purple",
    ),
    PredefinedReportType(
        id="missed_exchanges",
        name="Missed Exchanges Report",
        description="Detailed report of all missed or late exchanges",
        sections_included=["missed_exchanges", "late_arrivals", "cancellations"],
        default_date_range_days=90,
        icon="x-circle",
        color="red",
    ),
    PredefinedReportType(
        id="complete_case_packet",
        name="Complete Case Packet",
        description="Comprehensive evidence package for court proceedings",
        sections_included=["agreement", "schedule", "compliance", "messages", "financial", "items"],
        default_date_range_days=180,
        icon="folder",
        color="indigo",
    ),
    PredefinedReportType(
        id="item_transfer_log",
        name="Item Transfer Log",
        description="KidsCubbie item transfer history and disputes",
        sections_included=["items", "transfers", "disputes", "condition_reports"],
        default_date_range_days=90,
        icon="package",
        color="amber",
    ),
    PredefinedReportType(
        id="aria_summary",
        name="ARIA Communication Summary",
        description="Summary of ARIA interventions and compliance suggestions",
        sections_included=["aria_interventions", "suggestions_accepted", "good_faith_metrics"],
        default_date_range_days=30,
        icon="bot",
        color="teal",
    ),
    PredefinedReportType(
        id="investigation_report",
        name="Investigation Report",
        description="Detailed report for court investigations",
        sections_included=["all"],
        default_date_range_days=365,
        icon="search",
        color="gray",
        requires_date_range=True,
    ),
]
