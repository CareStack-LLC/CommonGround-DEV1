"""
Professional Portal Models.

Models for the Professional Portal that enables attorneys, mediators,
intake coordinators, and practice admins to manage high-conflict
custody cases efficiently.

Design Principle: Professionals use existing User auth + ProfessionalProfile layer.
"""

from datetime import datetime, timedelta
from typing import Optional, TYPE_CHECKING
from enum import Enum
import secrets
import string

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.family_file import FamilyFile
    from app.models.case import Case
    from app.models.court import CourtProfessional


# =============================================================================
# Enums
# =============================================================================

class ProfessionalType(str, Enum):
    """Types of legal professionals."""
    PRACTICE_ADMIN = "practice_admin"
    INTAKE_COORDINATOR = "intake_coordinator"
    ATTORNEY = "attorney"
    PARALEGAL = "paralegal"
    MEDIATOR = "mediator"
    PARENTING_COORDINATOR = "parenting_coordinator"


class FirmType(str, Enum):
    """Types of professional organizations."""
    LAW_FIRM = "law_firm"
    MEDIATION_PRACTICE = "mediation_practice"
    COURT_SERVICES = "court_services"
    SOLO_PRACTICE = "solo_practice"


class FirmRole(str, Enum):
    """Roles within a firm."""
    OWNER = "owner"           # Full admin, billing
    ADMIN = "admin"           # Manage staff, settings
    ATTORNEY = "attorney"     # Full case access
    PARALEGAL = "paralegal"   # Limited case access
    INTAKE = "intake"         # Intake only
    READONLY = "readonly"     # View only


class AssignmentRole(str, Enum):
    """Role on a specific case."""
    LEAD_ATTORNEY = "lead_attorney"
    ASSOCIATE = "associate"
    PARALEGAL = "paralegal"
    MEDIATOR = "mediator"
    PARENTING_COORDINATOR = "parenting_coordinator"
    INTAKE_COORDINATOR = "intake_coordinator"


class AssignmentStatus(str, Enum):
    """Status of a case assignment."""
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    WITHDRAWN = "withdrawn"


class MembershipStatus(str, Enum):
    """Status of firm membership."""
    ACTIVE = "active"
    INVITED = "invited"
    SUSPENDED = "suspended"
    REMOVED = "removed"


class AccessRequestStatus(str, Enum):
    """Status of a professional access request."""
    PENDING = "pending"
    APPROVED = "approved"
    DECLINED = "declined"
    EXPIRED = "expired"


class TemplateType(str, Enum):
    """Types of firm templates."""
    INTAKE_FORM = "intake_form"
    INTAKE_QUESTIONS = "intake_questions"
    AGREEMENT_TEMPLATE = "agreement_template"
    EMAIL_TEMPLATE = "email_template"
    REPORT_TEMPLATE = "report_template"


# =============================================================================
# Helper Functions
# =============================================================================

def generate_firm_slug(name: str) -> str:
    """Generate URL-safe slug from firm name."""
    import re
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    # Add random suffix to ensure uniqueness
    suffix = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(4))
    return f"{slug}-{suffix}"


def generate_invite_token() -> str:
    """Generate secure invite token."""
    return secrets.token_urlsafe(32)


# =============================================================================
# Models
# =============================================================================

class ProfessionalProfile(Base, UUIDMixin, TimestampMixin):
    """
    Professional profile linked to User account.

    Enables practice management features on top of regular user auth.
    A user can have both a regular profile (as a parent) AND a professional
    profile (as a lawyer/mediator).
    """

    __tablename__ = "professional_profiles"

    # Link to User (1:1)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), unique=True, index=True
    )

    # Professional identity
    professional_type: Mapped[str] = mapped_column(
        String(50), default=ProfessionalType.ATTORNEY.value
    )

    # License/credential info
    license_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    license_state: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    license_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    license_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    license_verified_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Additional credentials (JSON for flexibility)
    credentials: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g., {"bar_number": "CA-287456", "mediation_cert": "MCE-2024-001"}

    # Specializations
    practice_areas: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # e.g., ["custody", "divorce", "mediation", "domestic_violence"]

    # Professional contact (may differ from personal)
    professional_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    professional_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Portal settings
    default_intake_template: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    notification_preferences: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g., {"intake_completed": true, "deadline_reminder": true}

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    onboarded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Link to legacy CourtProfessional (for migration)
    court_professional_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("court_professionals.id"), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="professional_profile")
    firm_memberships: Mapped[list["FirmMembership"]] = relationship(
        "FirmMembership", back_populates="professional", cascade="all, delete-orphan"
    )
    case_assignments: Mapped[list["CaseAssignment"]] = relationship(
        "CaseAssignment", back_populates="professional", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ProfessionalProfile {self.id[:8]} ({self.professional_type})>"

    @property
    def is_onboarded(self) -> bool:
        """Check if professional has completed onboarding."""
        return self.onboarded_at is not None


class Firm(Base, UUIDMixin, TimestampMixin):
    """
    Law firm or practice organization.

    Firms provide workspace context for professionals:
    - Member management
    - Shared templates
    - Case assignments
    - Billing (future)
    """

    __tablename__ = "firms"

    # Identity
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    firm_type: Mapped[str] = mapped_column(
        String(50), default=FirmType.LAW_FIRM.value
    )

    # Contact
    email: Mapped[str] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Address
    address_line1: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    address_line2: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[str] = mapped_column(String(2), default="CA")
    zip_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Branding
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)  # #RRGGBB

    # Settings
    settings: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g., {"default_intake_forms": ["FL-300", "FL-311"], "aria_provider": "claude"}

    # Directory visibility
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    # When True, firm appears in public directory for parent invitations

    # Billing (future)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    subscription_tier: Mapped[str] = mapped_column(String(20), default="professional")
    # professional, enterprise
    subscription_status: Mapped[str] = mapped_column(String(20), default="trial")
    # trial, active, past_due, cancelled
    subscription_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))

    # Relationships
    memberships: Mapped[list["FirmMembership"]] = relationship(
        "FirmMembership", back_populates="firm", cascade="all, delete-orphan"
    )
    templates: Mapped[list["FirmTemplate"]] = relationship(
        "FirmTemplate", back_populates="firm", cascade="all, delete-orphan"
    )
    case_assignments: Mapped[list["CaseAssignment"]] = relationship(
        "CaseAssignment", back_populates="firm"
    )

    def __repr__(self) -> str:
        return f"<Firm {self.name}>"

    @property
    def member_count(self) -> int:
        """Get active member count."""
        return len([m for m in self.memberships if m.status == MembershipStatus.ACTIVE.value])


class FirmMembership(Base, UUIDMixin, TimestampMixin):
    """
    Links professionals to firms with role-based permissions.

    Supports multi-firm professionals (e.g., attorney at 2 firms).
    """

    __tablename__ = "firm_memberships"

    # Links
    professional_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("professional_profiles.id"), index=True
    )
    firm_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("firms.id"), index=True
    )

    # Role within firm
    role: Mapped[str] = mapped_column(String(50), default=FirmRole.ATTORNEY.value)

    # Custom permissions (override role defaults)
    custom_permissions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g., {"can_export": true, "can_manage_intake": true, "max_cases": 50}

    # Status
    status: Mapped[str] = mapped_column(String(20), default=MembershipStatus.INVITED.value)

    # Invitation flow
    invite_token: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    invite_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    invited_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    invited_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    invite_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Email used for invite
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # If removed
    removed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    removed_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    removal_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    professional: Mapped["ProfessionalProfile"] = relationship(
        "ProfessionalProfile", back_populates="firm_memberships"
    )
    firm: Mapped["Firm"] = relationship("Firm", back_populates="memberships")

    # Unique constraint: one membership per professional per firm
    __table_args__ = (
        UniqueConstraint('professional_id', 'firm_id', name='uq_professional_firm'),
    )

    def __repr__(self) -> str:
        return f"<FirmMembership {self.id[:8]} ({self.role})>"

    @property
    def is_active(self) -> bool:
        """Check if membership is active."""
        return self.status == MembershipStatus.ACTIVE.value

    @property
    def is_invite_expired(self) -> bool:
        """Check if invitation has expired."""
        if not self.invite_expires_at:
            return False
        return datetime.utcnow() > self.invite_expires_at


class CaseAssignment(Base, UUIDMixin, TimestampMixin):
    """
    Assigns professionals to cases (FamilyFiles) with specific roles and permissions.

    This is the core relationship that grants a professional access to a case.
    """

    __tablename__ = "case_assignments"

    # Links
    professional_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("professional_profiles.id"), index=True
    )
    firm_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("firms.id"), index=True
    )
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True
    )

    # For legacy Case support (optional)
    case_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("cases.id"), nullable=True, index=True
    )

    # Role on this case
    assignment_role: Mapped[str] = mapped_column(
        String(50), default=AssignmentRole.LEAD_ATTORNEY.value
    )

    # Client relationship
    representing: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # "parent_a", "parent_b", "both" (mediator), "court" (GAL)

    # Access scopes (what they can see/do)
    access_scopes: Mapped[list] = mapped_column(JSON, default=list)
    # Uses existing AccessScope enum values from court.py:
    # ["agreement", "schedule", "checkins", "messages", "financials", "compliance", "interventions"]

    # ARIA controls
    can_control_aria: Mapped[bool] = mapped_column(Boolean, default=False)
    aria_preferences: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g., {"sensitivity": "high", "auto_intervene": true}

    # Messaging permission
    can_message_client: Mapped[bool] = mapped_column(Boolean, default=True)

    # Status
    status: Mapped[str] = mapped_column(String(20), default=AssignmentStatus.ACTIVE.value)

    # Dates
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    assigned_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Notes (internal to firm, not visible to parents)
    internal_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    professional: Mapped["ProfessionalProfile"] = relationship(
        "ProfessionalProfile", back_populates="case_assignments"
    )
    firm: Mapped["Firm"] = relationship("Firm", back_populates="case_assignments")
    family_file: Mapped["FamilyFile"] = relationship(
        "FamilyFile", backref="professional_assignments"
    )

    def __repr__(self) -> str:
        return f"<CaseAssignment {self.id[:8]} ({self.assignment_role})>"

    @property
    def is_active(self) -> bool:
        """Check if assignment is active."""
        return self.status == AssignmentStatus.ACTIVE.value

    def has_scope(self, scope: str) -> bool:
        """Check if assignment includes a specific scope."""
        return scope in (self.access_scopes or [])


class FirmTemplate(Base, UUIDMixin, TimestampMixin):
    """
    Reusable templates for a firm.

    Templates can be for intake questions, email drafts, agreement sections, etc.
    """

    __tablename__ = "firm_templates"

    # Links
    firm_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("firms.id"), index=True
    )
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))

    # Template info
    name: Mapped[str] = mapped_column(String(200))
    template_type: Mapped[str] = mapped_column(String(50))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Content (structure depends on template_type)
    content: Mapped[dict] = mapped_column(JSON)
    # For intake_questions: {"questions": [...]}
    # For email_template: {"subject": "...", "body": "..."}

    # Versioning
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Usage tracking
    use_count: Mapped[int] = mapped_column(Integer, default=0)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    firm: Mapped["Firm"] = relationship("Firm", back_populates="templates")

    def __repr__(self) -> str:
        return f"<FirmTemplate {self.name} ({self.template_type})>"


class ProfessionalAccessRequest(Base, UUIDMixin, TimestampMixin):
    """
    Request for professional access to a case.

    Can be initiated by:
    - Parent inviting a professional (by email or from firm directory)
    - Professional requesting access to a case

    Requires parent approval before CaseAssignment is created.
    """

    __tablename__ = "professional_access_requests"

    # Case being accessed
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True
    )

    # Professional (if known - may be null if inviting by email to new professional)
    professional_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("professional_profiles.id"), nullable=True, index=True
    )

    # If inviting by email (professional may not exist yet)
    professional_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Firm context (optional - may be solo professional)
    firm_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("firms.id"), nullable=True, index=True
    )

    # Who initiated the request
    requested_by: Mapped[str] = mapped_column(String(20))  # "parent" or "professional"
    requested_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True
    )

    # Requested access details
    requested_role: Mapped[str] = mapped_column(
        String(50), default=AssignmentRole.LEAD_ATTORNEY.value
    )
    requested_scopes: Mapped[list] = mapped_column(JSON, default=list)
    representing: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default=AccessRequestStatus.PENDING.value
    )

    # Parent approvals (for parent-initiated invites, only inviting parent needs to approve)
    # For professional-initiated requests, both parents may need to approve depending on role
    parent_a_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_b_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_a_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    parent_b_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Resolution
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    declined_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    decline_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Created assignment (after approval)
    case_assignment_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("case_assignments.id"), nullable=True
    )

    # Expiration
    expires_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.utcnow() + timedelta(days=14)
    )

    # Access token for email invites
    access_token: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Message to include with request
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Professional acceptance (for parent-initiated invites)
    professional_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    professional_accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    professional: Mapped[Optional["ProfessionalProfile"]] = relationship(
        "ProfessionalProfile", backref="access_requests", foreign_keys=[professional_id]
    )
    family_file: Mapped["FamilyFile"] = relationship(
        "FamilyFile", backref="professional_access_requests"
    )
    firm: Mapped[Optional["Firm"]] = relationship(
        "Firm", backref="access_requests", foreign_keys=[firm_id]
    )

    def __repr__(self) -> str:
        return f"<ProfessionalAccessRequest {self.id[:8]} ({self.status})>"

    @property
    def is_expired(self) -> bool:
        """Check if request has expired."""
        return datetime.utcnow() > self.expires_at

    @property
    def is_pending(self) -> bool:
        """Check if request is still pending."""
        return self.status == AccessRequestStatus.PENDING.value and not self.is_expired


class ProfessionalMessage(Base, UUIDMixin, TimestampMixin):
    """
    Secure messages between professionals and their clients.

    Separate from parent-to-parent messages. These are for
    lawyer-client or mediator-client communication.
    """

    __tablename__ = "professional_messages"

    # Context
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True
    )
    case_assignment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("case_assignments.id"), index=True
    )

    # Sender
    sender_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True
    )
    sender_type: Mapped[str] = mapped_column(String(20))  # "professional" or "parent"

    # Recipient
    recipient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True
    )

    # Message content
    subject: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    content: Mapped[str] = mapped_column(Text)

    # Threading
    thread_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    reply_to_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("professional_messages.id"), nullable=True
    )

    # Status
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Attachments
    attachments: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # e.g., [{"name": "document.pdf", "url": "...", "size": 12345}]

    # Timestamps
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<ProfessionalMessage {self.id[:8]} ({self.sender_type})>"


class ProfessionalAccessLog(Base, UUIDMixin, TimestampMixin):
    """
    Audit log for professional portal actions.

    Tracks all professional access for compliance and court evidence.
    Immutable - records cannot be modified after creation.
    """

    __tablename__ = "professional_access_logs"

    # Who
    professional_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("professional_profiles.id"), index=True
    )
    firm_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("firms.id"), nullable=True, index=True
    )

    # What case
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True
    )

    # Action performed
    action: Mapped[str] = mapped_column(String(100), index=True)
    # Actions: view_case, view_messages, view_timeline, export_report,
    # control_aria, send_intake, message_client, view_compliance, etc.

    # Resource accessed (optional details)
    resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # Types: messages, schedule, agreement, export, intake, etc.
    resource_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Additional details (action-specific)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g., {"report_type": "court_package", "date_range": "90 days"}

    # Request info for verification
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Timestamp (immutable)
    logged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<ProfessionalAccessLog {self.action} at {self.logged_at}>"
