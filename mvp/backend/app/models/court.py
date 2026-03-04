"""
Court Access Mode models.

These models support the court-side of CommonGround:
- Court professionals (clerks, GALs, attorneys, judges)
- Time-limited case access grants
- Court-controlled case settings
- Court events (hearings, deadlines)
- Court messages (one-way communications)
- Investigation reports

Design principle: Courts authorize, they don't "use" the app.
"""

from datetime import datetime, date
from typing import Optional
from enum import Enum

from sqlalchemy import (
    Boolean, Date, DateTime, ForeignKey, Integer, String, Text, JSON, Time
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


# =============================================================================
# Enums
# =============================================================================

class CourtRole(str, Enum):
    """Court professional roles with different access levels."""
    COURT_CLERK = "court_clerk"      # Upload agreements, toggle settings, create events
    GAL = "gal"                       # Guardian ad Litem - full investigation access
    ATTORNEY_PETITIONER = "attorney_petitioner"
    ATTORNEY_RESPONDENT = "attorney_respondent"
    MEDIATOR = "mediator"
    JUDGE = "judge"                   # Summary view only


class AccessScope(str, Enum):
    """What data a professional can access."""
    AGREEMENT = "agreement"
    SCHEDULE = "schedule"
    CHECKINS = "checkins"
    MESSAGES = "messages"
    FINANCIALS = "financials"
    COMPLIANCE = "compliance"
    INTERVENTIONS = "interventions"  # ARIA data


class GrantStatus(str, Enum):
    """Status of an access grant."""
    PENDING_VERIFICATION = "pending_verification"
    PENDING_CONSENT = "pending_consent"  # Waiting for parent approval
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"


class CourtEventType(str, Enum):
    """Types of court events."""
    HEARING = "hearing"
    MEDIATION = "mediation"
    DEADLINE = "deadline"
    REVIEW = "review"
    CONFERENCE = "conference"
    OTHER = "other"


class CourtMessageType(str, Enum):
    """Types of court messages."""
    NOTICE = "notice"
    REMINDER = "reminder"
    ORDER = "order"
    GENERAL = "general"


class ReportType(str, Enum):
    """Types of investigation reports."""
    COMMUNICATION_SUMMARY = "communication_summary"
    COMPLIANCE_REPORT = "compliance_report"
    FINANCIAL_SUMMARY = "financial_summary"
    TIMELINE_EXPORT = "timeline_export"
    FULL_COURT_PACKAGE = "full_court_package"


# =============================================================================
# Default Durations (from Module-Status-Guide.md)
# =============================================================================

DEFAULT_ACCESS_DURATION = {
    CourtRole.GAL: 120,
    CourtRole.ATTORNEY_PETITIONER: 90,
    CourtRole.ATTORNEY_RESPONDENT: 90,
    CourtRole.MEDIATOR: 60,
    CourtRole.COURT_CLERK: 30,
    CourtRole.JUDGE: 30,
}


# =============================================================================
# Models
# =============================================================================

class CourtProfessional(Base, UUIDMixin, TimestampMixin):
    """
    Verified court professional who can access cases.

    This is separate from regular users - professionals don't have
    parent accounts, they have court credentials.
    """

    __tablename__ = "court_professionals"

    # Identity
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200))
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Role and organization
    role: Mapped[str] = mapped_column(String(50))  # CourtRole value
    organization: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Credentials (stored as JSON for flexibility)
    credentials: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g., {"bar_number": "CA-287456", "court_id": "SDSC-CLK-4521"}

    # Verification status
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    verified_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    verification_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # e.g., "bar_lookup", "court_email", "appointment_letter"

    # MFA (simulated for MVP)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    mfa_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Account status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    access_grants: Mapped[list["CourtAccessGrant"]] = relationship(
        "CourtAccessGrant", back_populates="professional", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<CourtProfessional {self.full_name} ({self.role})>"

    @property
    def default_duration_days(self) -> int:
        """Get default access duration for this role."""
        try:
            return DEFAULT_ACCESS_DURATION.get(CourtRole(self.role), 30)
        except ValueError:
            return 30


class CourtAccessGrant(Base, UUIDMixin, TimestampMixin):
    """
    Time-limited access grant for a professional to a specific case.

    Access is:
    - Case-specific
    - Time-limited (with role-based defaults)
    - Scope-limited (what data they can see)
    - Logged (every action tracked)
    """

    __tablename__ = "court_access_grants"

    # Links
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)
    professional_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("court_professionals.id"), index=True
    )

    # Role for this grant (may differ from professional's default)
    role: Mapped[str] = mapped_column(String(50))

    # Access scope
    access_scope: Mapped[list] = mapped_column(JSON)  # List of AccessScope values
    # e.g., ["agreement", "schedule", "messages", "compliance"]

    # Data range (how far back can they see)
    data_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    data_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Authorization
    authorization_type: Mapped[str] = mapped_column(String(50))
    # "court_order", "parental_consent", "appointment", "representation"
    authorization_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # e.g., "ORD-2025-FC-01234" or "APT-2025-00234"

    # For parental consent grants
    authorized_by: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # e.g., ["petitioner_user_id", "respondent_user_id"]
    petitioner_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    respondent_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    petitioner_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    respondent_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Access link (for initial setup)
    access_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    access_link_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Time bounds
    granted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)

    # Status
    status: Mapped[str] = mapped_column(String(30), default="pending_verification")

    # Revocation
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    revoked_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    revocation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Sealed/protected items
    sealed_items_access: Mapped[bool] = mapped_column(Boolean, default=False)

    # Access tracking
    last_accessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    access_count: Mapped[int] = mapped_column(Integer, default=0)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    professional: Mapped["CourtProfessional"] = relationship(
        "CourtProfessional", back_populates="access_grants"
    )
    access_logs: Mapped[list["CourtAccessLog"]] = relationship(
        "CourtAccessLog", back_populates="grant", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<CourtAccessGrant {self.role} for case {self.case_id}>"

    @property
    def is_expired(self) -> bool:
        """Check if access has expired."""
        return datetime.utcnow() > self.expires_at

    @property
    def is_active(self) -> bool:
        """Check if access is currently valid."""
        return (
            self.status == "active"
            and not self.is_expired
            and self.revoked_at is None
        )

    @property
    def days_remaining(self) -> int:
        """Days until expiration."""
        if self.is_expired:
            return 0
        delta = self.expires_at - datetime.utcnow()
        return max(0, delta.days)

    @property
    def requires_joint_consent(self) -> bool:
        """Check if this grant type requires both parents to approve."""
        return self.role in [CourtRole.GAL.value, CourtRole.MEDIATOR.value]

    @property
    def has_joint_consent(self) -> bool:
        """Check if both parents have approved."""
        return self.petitioner_approved and self.respondent_approved


class CourtAccessLog(Base, UUIDMixin, TimestampMixin):
    """
    Immutable audit log of all court professional actions.

    This creates a complete chain of custody for court evidence.
    """

    __tablename__ = "court_access_logs"

    # Links
    grant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("court_access_grants.id"), index=True
    )
    professional_id: Mapped[str] = mapped_column(String(36), index=True)
    case_id: Mapped[str] = mapped_column(String(36), index=True)

    # Action details
    action: Mapped[str] = mapped_column(String(50))
    # "login", "view", "export", "query", "generate_report"

    resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # "schedule", "messages", "compliance", "report"

    resource_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Details (action-specific)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g., {"report_type": "compliance", "date_range": "90 days"}

    # Client info
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Timestamp (immutable)
    logged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    grant: Mapped["CourtAccessGrant"] = relationship(
        "CourtAccessGrant", back_populates="access_logs"
    )

    def __repr__(self) -> str:
        return f"<CourtAccessLog {self.action} at {self.logged_at}>"


class CourtCaseSettings(Base, UUIDMixin, TimestampMixin):
    """
    Court-controlled case settings.

    These settings CANNOT be overridden by parents.
    When enabled, parents see: "This setting is court-controlled."
    """

    __tablename__ = "court_case_settings"

    # One-to-one with Case
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id"), unique=True, index=True
    )

    # ==========================================================================
    # Toggleable Settings
    # ==========================================================================

    # Exchange requirements
    gps_checkins_required: Mapped[bool] = mapped_column(Boolean, default=False)
    supervised_exchange_required: Mapped[bool] = mapped_column(Boolean, default=False)

    # Communication controls
    aria_enforcement_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    # When True, parents cannot disable or bypass ARIA

    in_app_communication_only: Mapped[bool] = mapped_column(Boolean, default=False)
    # When True, system logs that external communication is prohibited

    # Agreement controls
    agreement_edits_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    # When True, parents cannot modify the agreement

    # Investigation mode
    investigation_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    # When True, enhanced logging is enabled

    # Safety features
    child_safety_tracking: Mapped[bool] = mapped_column(Boolean, default=False)
    # When True, location sharing is enabled for child safety

    # Financial controls
    financial_verification_required: Mapped[bool] = mapped_column(Boolean, default=False)
    # When True, payments require receipt verification

    # ==========================================================================
    # Metadata
    # ==========================================================================

    # Who set these
    set_by_professional_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    set_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Court order reference
    court_order_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Change history (immutable log)
    settings_history: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # e.g., [{"setting": "gps_required", "old": false, "new": true, "by": "...", "at": "..."}]

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<CourtCaseSettings for case {self.case_id}>"

    def get_active_controls(self) -> list[str]:
        """Return list of active court controls."""
        controls = []
        if self.gps_checkins_required:
            controls.append("GPS check-ins required")
        if self.supervised_exchange_required:
            controls.append("Supervised exchanges required")
        if self.aria_enforcement_locked:
            controls.append("Communication monitoring locked")
        if self.in_app_communication_only:
            controls.append("In-app communication only")
        if self.agreement_edits_locked:
            controls.append("Agreement modifications locked")
        if self.investigation_mode:
            controls.append("Investigation mode active")
        if self.child_safety_tracking:
            controls.append("Child safety tracking enabled")
        if self.financial_verification_required:
            controls.append("Financial verification required")
        return controls


class CourtEvent(Base, UUIDMixin, TimestampMixin):
    """
    Court-created events that appear on both parents' calendars.

    These events:
    - Cannot be deleted by parents
    - Cannot be modified by parents
    - Support attendance tracking
    - Support both internal and shared notes
    """

    __tablename__ = "court_events"

    # Links
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)
    created_by: Mapped[str] = mapped_column(String(36), index=True)  # professional_id

    # Event details
    event_type: Mapped[str] = mapped_column(String(50))  # CourtEventType value
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timing
    event_date: Mapped[date] = mapped_column(Date, index=True)
    start_time: Mapped[Optional[datetime]] = mapped_column(Time, nullable=True)
    end_time: Mapped[Optional[datetime]] = mapped_column(Time, nullable=True)

    # Location
    location: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    virtual_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Attendance requirements
    petitioner_required: Mapped[bool] = mapped_column(Boolean, default=True)
    respondent_required: Mapped[bool] = mapped_column(Boolean, default=True)

    # Attendance tracking
    petitioner_attended: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    respondent_attended: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    petitioner_attendance_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    respondent_attendance_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="scheduled")
    # "scheduled", "completed", "cancelled", "rescheduled"

    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True)

    # Notes
    internal_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Court-only, never shown to parents

    shared_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Visible to parents

    # Reminders
    reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    reminder_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # RSVP tracking for parent responses
    petitioner_rsvp_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # "attending", "not_attending", "pending", "maybe"
    respondent_rsvp_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    petitioner_rsvp_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    respondent_rsvp_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    petitioner_rsvp_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    respondent_rsvp_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<CourtEvent {self.title} on {self.event_date}>"

    @property
    def is_past(self) -> bool:
        """Check if event date has passed."""
        return self.event_date < date.today()

    @property
    def attendance_summary(self) -> str:
        """Get attendance summary for display."""
        if not self.is_past:
            return "Upcoming"

        parts = []
        if self.petitioner_required:
            status = "Present" if self.petitioner_attended else "Absent"
            parts.append(f"Petitioner: {status}")
        if self.respondent_required:
            status = "Present" if self.respondent_attended else "Absent"
            parts.append(f"Respondent: {status}")

        return " | ".join(parts) if parts else "No attendance required"


class CourtMessage(Base, UUIDMixin, TimestampMixin):
    """
    One-way court communications to parents.

    These messages:
    - Are clearly marked as "Court Communication"
    - Cannot be edited or deleted by parents
    - Are timestamped and immutable
    - Support controlled replies (optional)
    """

    __tablename__ = "court_messages"

    # Links
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)
    sent_by: Mapped[str] = mapped_column(String(36), index=True)  # professional_id

    # Message details
    message_type: Mapped[str] = mapped_column(String(50))  # CourtMessageType value
    subject: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    content: Mapped[str] = mapped_column(Text)

    # Recipients
    to_petitioner: Mapped[bool] = mapped_column(Boolean, default=True)
    to_respondent: Mapped[bool] = mapped_column(Boolean, default=True)

    # Read tracking
    petitioner_read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    respondent_read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Reply control
    replies_allowed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Attachments
    attachments: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # e.g., [{"name": "order.pdf", "url": "...", "size": 12345}]

    # Priority
    is_urgent: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamp (immutable)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<CourtMessage {self.message_type}: {self.subject}>"

    @property
    def is_read_by_petitioner(self) -> bool:
        return self.petitioner_read_at is not None

    @property
    def is_read_by_respondent(self) -> bool:
        return self.respondent_read_at is not None

    @property
    def is_fully_read(self) -> bool:
        """Check if all intended recipients have read."""
        if self.to_petitioner and not self.is_read_by_petitioner:
            return False
        if self.to_respondent and not self.is_read_by_respondent:
            return False
        return True


class InvestigationReport(Base, UUIDMixin, TimestampMixin):
    """
    Generated investigation reports for court use.

    Reports are:
    - Date-range scoped
    - Role-limited in content
    - SHA-256 hash verified
    - Watermarked with generator identity
    """

    __tablename__ = "investigation_reports"

    # Links
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)
    generated_by: Mapped[str] = mapped_column(String(36), index=True)  # professional_id

    # Report identification
    report_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    # e.g., "RPT-20251231-4827"

    report_type: Mapped[str] = mapped_column(String(50))  # ReportType value
    title: Mapped[str] = mapped_column(String(200))

    # Scope
    date_range_start: Mapped[date] = mapped_column(Date)
    date_range_end: Mapped[date] = mapped_column(Date)
    sections_included: Mapped[list] = mapped_column(JSON)
    # e.g., ["agreement", "compliance", "messages", "financials"]

    # File
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Integrity verification
    content_hash: Mapped[str] = mapped_column(String(64))  # SHA-256
    chain_of_custody_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Watermark
    watermark_text: Mapped[str] = mapped_column(String(200))
    # e.g., "Generated for: Sarah Mitchell, GAL - 2025-12-31 14:32 UTC"

    # Verification
    verification_url: Mapped[str] = mapped_column(String(500))
    # e.g., "verify.commonground.family/RPT-20251231-4827"

    # Evidence counts
    evidence_counts: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g., {"messages": 156, "exchanges": 24, "payments": 12}

    # Access tracking
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    last_downloaded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="generated")
    # "generating", "generated", "downloaded", "submitted"

    # Expiration (for temporary reports)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_permanent: Mapped[bool] = mapped_column(Boolean, default=True)

    # Purpose
    purpose: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # e.g., "Prepared for hearing on 2026-01-15"

    # Generation metadata
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    generation_time_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<InvestigationReport {self.report_number}>"

    @property
    def is_expired(self) -> bool:
        """Check if report has expired."""
        if self.is_permanent:
            return False
        return self.expires_at and datetime.utcnow() > self.expires_at
