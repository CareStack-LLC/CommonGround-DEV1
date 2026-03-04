"""
Court Form models - California Family Court form workflow.

Supports the complete court form lifecycle:
- FL-300 (Request for Order) - Petitioner initiates
- FL-311 (Child Custody and Visitation Application) - Petitioner's proposal
- FL-320 (Responsive Declaration) - Respondent's response
- FL-340 (Findings and Order After Hearing) - Judge's order
- FL-341 (Child Custody and Visitation Order Attachment) - Custody details
- FL-342 (Child Support Information and Order Attachment) - Support details
"""

from datetime import datetime, date
from typing import Optional
from enum import Enum

from sqlalchemy import Boolean, DateTime, Date, ForeignKey, Integer, String, Text, JSON, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


# =============================================================================
# Enums for Court Forms
# =============================================================================

class CourtFormType(str, Enum):
    """California family law form types."""
    FL_300 = "FL-300"       # Request for Order (petitioner)
    FL_311 = "FL-311"       # Child Custody and Visitation Application (petitioner)
    FL_320 = "FL-320"       # Responsive Declaration (respondent)
    FL_340 = "FL-340"       # Findings and Order After Hearing (judge)
    FL_341 = "FL-341"       # Child Custody and Visitation Order Attachment
    FL_342 = "FL-342"       # Child Support Order Attachment
    FL_341_C = "FL-341(C)"  # Holiday Schedule Attachment
    FL_341_D = "FL-341(D)"  # Additional Provisions Attachment
    FL_341_E = "FL-341(E)"  # Joint Legal Custody Attachment


class CourtFormStatus(str, Enum):
    """Form submission status."""
    DRAFT = "draft"
    PENDING_SUBMISSION = "pending_submission"
    SUBMITTED = "submitted"
    UNDER_COURT_REVIEW = "under_court_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    RESUBMIT_REQUIRED = "resubmit_required"
    SERVED = "served"               # FL-300 served to respondent
    ENTERED = "entered"             # FL-340 order entered by court
    WITHDRAWN = "withdrawn"


class FormSubmissionSource(str, Enum):
    """How form was submitted."""
    PARENT_PLATFORM = "parent_platform"
    PARENT_ARIA = "parent_aria"
    COURT_UPLOAD = "court_upload"
    COURT_MANUAL = "court_manual"
    OCR_EXTRACTION = "ocr_extraction"


class CaseActivationStatus(str, Enum):
    """Extended case status for form workflow."""
    PENDING = "pending"
    FL300_REQUIRED = "fl300_required"
    FL300_SUBMITTED = "fl300_submitted"
    FL300_APPROVED = "fl300_approved"
    RESPONDENT_SERVICE_PENDING = "respondent_service_pending"
    RESPONDENT_NOTIFIED = "respondent_notified"
    FL320_REQUIRED = "fl320_required"
    FL320_SUBMITTED = "fl320_submitted"
    AWAITING_HEARING = "awaiting_hearing"
    HEARING_COMPLETED = "hearing_completed"
    ORDER_ENTERED = "order_entered"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CLOSED = "closed"


class ServiceType(str, Enum):
    """Type of service for court documents."""
    PERSONAL = "personal"               # Hand-delivered
    SUBSTITUTED = "substituted"         # Left with someone at address
    MAIL = "mail"                       # Mailed
    ELECTRONIC = "electronic"           # Via platform (if respondent on platform)
    NOTICE_ACK = "notice_acknowledge"   # Respondent acknowledged via platform


class HearingType(str, Enum):
    """Type of court hearing."""
    RFO = "rfo"                         # Request for Order hearing
    STATUS_CONFERENCE = "status_conference"
    TRIAL = "trial"
    MEDIATION = "mediation"
    SETTLEMENT_CONFERENCE = "settlement_conference"
    MOTION = "motion"
    OTHER = "other"


class HearingOutcome(str, Enum):
    """Outcome of court hearing."""
    PENDING = "pending"
    CONTINUED = "continued"             # Hearing postponed
    SETTLED = "settled"                 # Parties reached agreement
    ORDER_ISSUED = "order_issued"       # Judge issued order
    DISMISSED = "dismissed"
    DEFAULT = "default"                 # One party didn't appear


# =============================================================================
# Court Form Submission Model
# =============================================================================

class CourtFormSubmission(Base, UUIDMixin, TimestampMixin):
    """
    Tracks form submissions through the court workflow.

    Each form submission represents a specific form (FL-300, FL-311, etc.)
    at a specific point in the workflow.
    """

    __tablename__ = "court_form_submissions"

    # Case and parent links
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)
    parent_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )  # Null for court-uploaded forms

    # Form identification
    form_type: Mapped[str] = mapped_column(String(20))  # FL-300, FL-311, etc.
    form_state: Mapped[str] = mapped_column(String(2), default="CA")

    # Status tracking
    status: Mapped[str] = mapped_column(String(30), default=CourtFormStatus.DRAFT.value)
    status_history: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Submission details
    submission_source: Mapped[str] = mapped_column(
        String(30), default=FormSubmissionSource.PARENT_PLATFORM.value
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Form data (structured fields)
    form_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # PDF storage
    pdf_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pdf_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # ARIA assistance tracking
    aria_assisted: Mapped[bool] = mapped_column(Boolean, default=False)
    aria_conversation_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Form relationships
    responds_to_form_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("court_form_submissions.id"), nullable=True
    )  # FL-320 responds to FL-300
    parent_form_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("court_form_submissions.id"), nullable=True
    )  # FL-341/FL-342 attach to FL-340

    # Hearing link
    hearing_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("court_hearings.id"), nullable=True
    )

    # Court review
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)  # Court professional ID
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Parent edit permissions (clerk allows edits, doesn't make them)
    edits_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    edits_allowed_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)  # Court professional ID
    edits_allowed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    edits_allowed_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # What needs fixing
    edits_allowed_sections: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)  # Optional: specific sections

    # Extraction metadata (for OCR uploads)
    extraction_confidence: Mapped[Optional[float]] = mapped_column(Numeric(3, 2), nullable=True)
    extraction_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requires_review: Mapped[bool] = mapped_column(Boolean, default=False)

    # Link to custody order (for FL-311, FL-341)
    custody_order_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("custody_orders.id"), nullable=True
    )

    # Relationships
    case: Mapped["Case"] = relationship("Case", backref="court_form_submissions")
    parent: Mapped[Optional["User"]] = relationship("User", backref="court_form_submissions")
    responds_to_form: Mapped[Optional["CourtFormSubmission"]] = relationship(
        "CourtFormSubmission",
        remote_side="CourtFormSubmission.id",
        foreign_keys=[responds_to_form_id],
        backref="responses"
    )
    parent_form: Mapped[Optional["CourtFormSubmission"]] = relationship(
        "CourtFormSubmission",
        remote_side="CourtFormSubmission.id",
        foreign_keys=[parent_form_id],
        backref="attachments"
    )
    # Note: hearing relationship defined separately to avoid circular issues
    custody_order: Mapped[Optional["CustodyOrder"]] = relationship(
        "CustodyOrder", backref="form_submissions"
    )

    def __repr__(self) -> str:
        return f"<CourtFormSubmission {self.form_type} status={self.status}>"

    def add_status_change(self, new_status: str, changed_by: Optional[str] = None, notes: Optional[str] = None):
        """Record a status change in history."""
        if self.status_history is None:
            self.status_history = []

        self.status_history.append({
            "from_status": self.status,
            "to_status": new_status,
            "changed_at": datetime.utcnow().isoformat(),
            "changed_by": changed_by,
            "notes": notes
        })
        self.status = new_status


# =============================================================================
# Case Form Requirement Model
# =============================================================================

class CaseFormRequirement(Base, UUIDMixin, TimestampMixin):
    """
    Tracks required forms per case.

    Allows the system to know which forms are needed and whether
    they've been satisfied.
    """

    __tablename__ = "case_form_requirements"

    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)

    # Requirement details
    form_type: Mapped[str] = mapped_column(String(20))  # FL-300, FL-311, etc.
    required_by: Mapped[str] = mapped_column(String(20))  # petitioner, respondent, both, court

    # Satisfaction tracking
    is_satisfied: Mapped[bool] = mapped_column(Boolean, default=False)
    satisfied_by_submission_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("court_form_submissions.id"), nullable=True
    )
    satisfied_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Deadlines
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    case: Mapped["Case"] = relationship("Case", backref="form_requirements")
    satisfied_by: Mapped[Optional["CourtFormSubmission"]] = relationship(
        "CourtFormSubmission", backref="satisfies_requirements"
    )

    def __repr__(self) -> str:
        status = "satisfied" if self.is_satisfied else "pending"
        return f"<CaseFormRequirement {self.form_type} {status}>"


# =============================================================================
# Proof of Service Model
# =============================================================================

class ProofOfService(Base, UUIDMixin, TimestampMixin):
    """
    Tracks proof of service for court documents.

    When a respondent is not on the platform, the petitioner must
    serve them and file proof of service.
    """

    __tablename__ = "proof_of_service"

    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)

    # Which form was served
    served_form_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("court_form_submissions.id")
    )

    # Service details
    service_type: Mapped[str] = mapped_column(String(30))  # personal, substituted, mail, etc.

    # Served to
    served_to_name: Mapped[str] = mapped_column(String(200))
    served_at_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Service date and server
    served_on_date: Mapped[date] = mapped_column(Date)
    served_by_name: Mapped[str] = mapped_column(String(200))
    served_by_relationship: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Proof document
    proof_pdf_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    proof_pdf_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Filed with court
    filed_with_court: Mapped[bool] = mapped_column(Boolean, default=False)
    filed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Court acceptance
    accepted_by_court: Mapped[bool] = mapped_column(Boolean, default=False)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    case: Mapped["Case"] = relationship("Case", backref="proof_of_service_records")
    served_form: Mapped["CourtFormSubmission"] = relationship(
        "CourtFormSubmission", backref="proof_of_service"
    )

    def __repr__(self) -> str:
        return f"<ProofOfService {self.service_type} to {self.served_to_name}>"


# =============================================================================
# Court Hearing Model
# =============================================================================

class CourtHearing(Base, UUIDMixin, TimestampMixin):
    """
    Tracks court hearings for a case.

    Extends the basic CourtEvent with hearing-specific details.
    """

    __tablename__ = "court_hearings"

    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)

    # Hearing details
    hearing_type: Mapped[str] = mapped_column(String(30), default=HearingType.RFO.value)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Schedule
    scheduled_date: Mapped[date] = mapped_column(Date)
    scheduled_time: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "9:00 AM"

    # Location
    court_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    courtroom: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Judge
    judge_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Outcome
    outcome: Mapped[str] = mapped_column(String(30), default=HearingOutcome.PENDING.value)
    outcome_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Attendance tracking
    petitioner_attended: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    respondent_attended: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # Related forms
    related_fl300_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("court_form_submissions.id"), nullable=True
    )
    resulting_fl340_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("court_form_submissions.id"), nullable=True
    )

    # Notifications
    notifications_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    notification_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Reminders
    reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    reminder_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Continuation
    is_continuation: Mapped[bool] = mapped_column(Boolean, default=False)
    continued_from_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("court_hearings.id"), nullable=True
    )
    continued_to_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("court_hearings.id"), nullable=True
    )

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    case: Mapped["Case"] = relationship("Case", backref="court_hearings")
    # Note: We use primaryjoin to be explicit about the join condition
    # since CourtFormSubmission has hearing_id FK
    related_forms: Mapped[list["CourtFormSubmission"]] = relationship(
        "CourtFormSubmission",
        primaryjoin="CourtHearing.id == foreign(CourtFormSubmission.hearing_id)",
        backref="hearing",
        viewonly=True
    )

    def __repr__(self) -> str:
        return f"<CourtHearing {self.hearing_type} {self.scheduled_date}>"


# =============================================================================
# Respondent Access Code Model
# =============================================================================

class RespondentAccessCode(Base, UUIDMixin, TimestampMixin):
    """
    Tracks access codes for respondent notification.

    When FL-300 is approved, respondent gets a notification with
    an access code to verify and access the case.
    """

    __tablename__ = "respondent_access_codes"

    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)

    # Target respondent
    respondent_email: Mapped[str] = mapped_column(String(255))
    respondent_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Access code (6-digit)
    access_code: Mapped[str] = mapped_column(String(10))
    code_hash: Mapped[str] = mapped_column(String(64))  # SHA-256 of code

    # Expiration
    expires_at: Mapped[datetime] = mapped_column(DateTime)

    # Usage tracking
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    used_by_user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )

    # Notification tracking
    notification_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    notification_method: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # email, sms

    # Attempts
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Related FL-300
    fl300_submission_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("court_form_submissions.id")
    )

    # Relationships
    case: Mapped["Case"] = relationship("Case", backref="respondent_access_codes")
    fl300_submission: Mapped["CourtFormSubmission"] = relationship(
        "CourtFormSubmission", backref="access_codes"
    )

    def __repr__(self) -> str:
        status = "used" if self.is_used else "pending"
        return f"<RespondentAccessCode {self.respondent_email} {status}>"
