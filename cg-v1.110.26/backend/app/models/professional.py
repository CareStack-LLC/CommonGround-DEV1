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


class ProfessionalTier(str, Enum):
    """Subscription tiers for professional accounts.

    Maps to the 5-tier pricing structure from the Professional Portal spec.
    Each tier has different case limits, feature access, and team capabilities.
    """
    STARTER = "starter"         # Free — 3 active cases
    SOLO = "solo"               # $99/mo — 15 active cases
    SMALL_FIRM = "small_firm"   # $299/mo — 50 active cases, 3 team members
    MID_SIZE = "mid_size"       # $799/mo — 150 active cases, 10 team members
    ENTERPRISE = "enterprise"   # Custom — unlimited


# Case limits per tier (used by entitlement checks)
TIER_CASE_LIMITS = {
    ProfessionalTier.STARTER: 3,
    ProfessionalTier.SOLO: 15,
    ProfessionalTier.SMALL_FIRM: 50,
    ProfessionalTier.MID_SIZE: 150,
    ProfessionalTier.ENTERPRISE: 999999,  # Effectively unlimited
}

# Team member limits per tier (firm-level)
TIER_TEAM_LIMITS = {
    ProfessionalTier.STARTER: 0,
    ProfessionalTier.SOLO: 0,
    ProfessionalTier.SMALL_FIRM: 3,
    ProfessionalTier.MID_SIZE: 10,
    ProfessionalTier.ENTERPRISE: 999999,
}


class FirmType(str, Enum):
    """Types of professional organizations."""
    LAW_FIRM = "law_firm"
    MEDIATION_PRACTICE = "mediation_practice"
    COURT_SERVICES = "court_services"
    SOLO_PRACTICE = "solo_practice"


class FirmRole(str, Enum):
    """Roles within a firm.

    Matches spec roles: Owner, Dispatcher, Lead Attorney, Associate,
    Paralegal, Admin. Legacy roles (intake, readonly) kept for compatibility.
    """
    OWNER = "owner"                 # Full admin, billing, case ownership
    DISPATCHER = "dispatcher"       # Case queue management, assignment
    LEAD_ATTORNEY = "lead_attorney" # Senior case handler
    ADMIN = "admin"                 # Manage staff, settings
    ATTORNEY = "attorney"           # Full case access (associate level)
    PARALEGAL = "paralegal"         # Limited case access
    INTAKE = "intake"               # Intake only
    READONLY = "readonly"           # View only


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


class EventType(str, Enum):
    """Types of professional calendar events."""
    MEETING = "meeting"
    COURT_HEARING = "court_hearing"
    VIDEO_CALL = "video_call"
    DOCUMENT_DEADLINE = "document_deadline"
    CONSULTATION = "consultation"
    DEPOSITION = "deposition"
    MEDIATION = "mediation"
    OTHER = "other"


class EventVisibility(str, Enum):
    """Who can see the event."""
    NONE = "none"                     # Only the professional
    REQUIRED_PARENT = "required_parent"  # Parent(s) required to attend
    BOTH_PARENTS = "both_parents"        # Both parents can see


class OCRExtractionStatus(str, Enum):
    """Status of the OCR document extraction pipeline.

    Lifecycle: pending → processing → review → approved/rejected
    """
    PENDING = "pending"           # Uploaded, awaiting processing
    PROCESSING = "processing"     # OCR engine running
    REVIEW = "review"             # Extraction complete, awaiting professional review
    APPROVED = "approved"         # Professional approved, agreement created
    REJECTED = "rejected"         # Professional rejected extraction
    FAILED = "failed"             # OCR processing failed


class ReportExportFormat(str, Enum):
    """Export formats for compliance reports."""
    PDF = "pdf"       # Court-ready formatting (required for submission)
    WORD = "word"     # Editable format for attorney notes
    EXCEL = "excel"   # Raw data for analysis


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

    # Directory Profile Fields
    headline: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    headshot_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    video_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    languages: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    hourly_rate: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    years_experience: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    education: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    awards: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    consultation_fee: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    accepted_payment_methods: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    service_location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Portal settings
    default_intake_template: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    notification_preferences: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g., {"intake_completed": true, "deadline_reminder": true}

    # =========================================================================
    # Subscription & Tier Gating (Phase 1 Gap-Fill)
    # =========================================================================
    # Tier determines case limits and feature access per the spec's 5-tier model.
    # This is the INDIVIDUAL professional's tier (separate from firm tier).
    subscription_tier: Mapped[str] = mapped_column(
        String(20), default=ProfessionalTier.STARTER.value
    )
    max_active_cases: Mapped[int] = mapped_column(Integer, default=3)
    # Track count to enforce tier limits without expensive queries
    active_case_count: Mapped[int] = mapped_column(Integer, default=0)

    # Billing (Stripe integration for professional subscriptions)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    subscription_status: Mapped[str] = mapped_column(String(20), default="trial")
    # Values: trial, active, past_due, cancelled
    subscription_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # =========================================================================
    # Directory & Featured Placement (Phase 1 Gap-Fill)
    # =========================================================================
    # Controls whether this professional appears in the parent-facing directory.
    # is_public = opt-in to standard listing (all tiers)
    # is_featured = featured placement at top of results (mid_size+ tier, requires CG approval)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    featured_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Location & Jurisdiction (for directory search and case matching)
    jurisdictions: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    # e.g., ["CA", "NY"] — states where licensed to practice
    office_address: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g., {"line1": "123 Main St", "city": "Los Angeles", "state": "CA", "zip": "90001"}

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

    # Description and practice areas (for directory)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    practice_areas: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # e.g., ["Family Law", "Custody", "Mediation", "Divorce"]

    # Directory Firm Fields
    headline: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    video_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    social_links: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    pricing_structure: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    safety_vetted: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Financials & Service Delivery
    accepted_payment_methods: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    payment_plans_available: Mapped[bool] = mapped_column(Boolean, default=False)
    works_with_nonprofits: Mapped[bool] = mapped_column(Boolean, default=False)
    service_location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

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

    # GAL/Professional dual-parent consent
    consent_both_parents: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_parent_a_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    consent_parent_b_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

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


class ProfessionalEvent(Base, UUIDMixin, TimestampMixin):
    """
    Calendar events for professionals.

    Supports meetings, court hearings, video calls, deadlines, etc.
    Can optionally be linked to a case and made visible to parents.
    """

    __tablename__ = "professional_events"

    # Owner
    professional_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("professional_profiles.id"), index=True
    )
    firm_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("firms.id"), nullable=True, index=True
    )

    # Event details
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_type: Mapped[str] = mapped_column(String(50), default=EventType.MEETING.value)

    # Timing
    start_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    all_day: Mapped[bool] = mapped_column(Boolean, default=False)
    timezone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Location
    location: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    virtual_meeting_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    # Case link (optional)
    family_file_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("family_files.id"), nullable=True, index=True
    )

    # Attendees
    attendee_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    attendee_emails: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Visibility to parents
    parent_visibility: Mapped[str] = mapped_column(
        String(20), default=EventVisibility.NONE.value
    )

    # Recurrence
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_rule: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    parent_event_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("professional_events.id"), nullable=True
    )

    # Reminder
    reminder_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Notes (private to professional)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Display
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Cancellation
    is_cancelled: Mapped[bool] = mapped_column(Boolean, default=False)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    professional: Mapped["ProfessionalProfile"] = relationship(
        "ProfessionalProfile", backref="events"
    )
    firm: Mapped[Optional["Firm"]] = relationship("Firm", backref="events")
    family_file: Mapped[Optional["FamilyFile"]] = relationship(
        "FamilyFile", backref="professional_events"
    )

    def __repr__(self) -> str:
        return f"<ProfessionalEvent {self.title} ({self.event_type})>"


class ProfessionalCallLog(Base, UUIDMixin, TimestampMixin):
    """
    Log of voice/video calls involving professionals.
    """

    __tablename__ = "professional_call_logs"

    # Context
    case_assignment_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("case_assignments.id"), nullable=True, index=True
    )
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True
    )

    # Participants
    professional_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("professional_profiles.id"), index=True
    )
    participant_ids: Mapped[list] = mapped_column(JSON, default=list)
    # List of user_ids (parents) involved

    # Call Details
    call_type: Mapped[str] = mapped_column(String(20))  # 'voice', 'video', 'conference'
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="completed")
    # 'completed', 'missed', 'cancelled'

    # Content
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recording_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Timing
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    professional: Mapped["ProfessionalProfile"] = relationship(
        "ProfessionalProfile", backref="call_logs"
    )
    family_file: Mapped["FamilyFile"] = relationship(
        "FamilyFile", backref="professional_call_logs"
    )

    def __repr__(self) -> str:
        return f"<ProfessionalCallLog {self.id[:8]} ({self.call_type})>"


class ComplianceReport(Base, UUIDMixin, TimestampMixin):
    """
    Generated compliance reports for court/legal use.

    Per the spec: reports must be downloaded (no auto-send to court),
    include both raw data and formatted summaries, and carry SHA-256
    verification codes for authenticity.
    """

    __tablename__ = "compliance_reports"

    # Context
    case_assignment_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("case_assignments.id"), nullable=True, index=True
    )
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True
    )

    # Generator
    generated_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("professional_profiles.id"), index=True
    )

    # Report identity
    title: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    # Report settings
    report_type: Mapped[str] = mapped_column(String(50))
    # Types per spec:
    # 'exchange_compliance'  — On-time vs. missed exchanges
    # 'communication_analysis' — ARIA interventions, message volume, hostility
    # 'financial_disputes'  — Unresolved expense disputes
    # 'full_timeline'       — Chronological event log
    # 'custom'              — Select specific date ranges and data points
    
    date_range_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    date_range_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    parameters: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g., {"include_messages": true, "include_financials": false}

    # =========================================================================
    # Phase 1 Gap-Fill: Export & Verification
    # =========================================================================
    # Export format (spec requires PDF for court, Word for notes, Excel for data)
    export_format: Mapped[str] = mapped_column(
        String(10), default=ReportExportFormat.PDF.value
    )

    # SHA-256 verification code for authenticity (required by spec)
    sha256_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Attorney signature line (for court-ready documents)
    signature_line: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    # Whether raw data appendix is included
    raw_data_included: Mapped[bool] = mapped_column(Boolean, default=True)

    # Result
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # 'pending', 'processing', 'completed', 'failed'

    # Download tracking (reports are download-only per spec)
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    last_downloaded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    professional: Mapped["ProfessionalProfile"] = relationship(
        "ProfessionalProfile", backref="generated_reports"
    )
    family_file: Mapped["FamilyFile"] = relationship(
        "FamilyFile", backref="compliance_reports"
    )

    def __repr__(self) -> str:
        return f"<ComplianceReport {self.id[:8]} ({self.report_type})>"


# =============================================================================
# New Models (Phase 1 Gap-Fill)
# =============================================================================

class OCRDocument(Base, UUIDMixin, TimestampMixin):
    """
    Tracks the OCR document processing pipeline.

    Lifecycle per spec:
    1. Professional uploads ONE court order PDF per case
    2. System detects document type (FL-341, FL-311, FL-312, FL-150, FL-342)
    3. OCR engine (PaddleOCR) extracts text and identifies data fields
    4. AI validates extracted data for consistency
    5. If confidence is LOW: System alerts professional to double-check
    6. Professional reviews and approves/corrects fields
    7. Upon approval: system creates NEW agreement with court order data
    8. System locks populated fields from parent editing (→ FieldLock)

    California forms only at launch.
    """

    __tablename__ = "ocr_documents"

    # Context — which case and who uploaded
    case_assignment_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("case_assignments.id"), nullable=True, index=True
    )
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True
    )
    uploaded_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("professional_profiles.id"), index=True
    )

    # Source document
    file_url: Mapped[str] = mapped_column(String(500))
    original_filename: Mapped[str] = mapped_column(String(300))
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str] = mapped_column(String(50), default="application/pdf")

    # Detection — which California form type was identified
    detected_form_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # Values: FL-341, FL-311, FL-312, FL-150, FL-342 (California launch set)
    detection_confidence: Mapped[Optional[float]] = mapped_column(nullable=True)

    # Pipeline status
    extraction_status: Mapped[str] = mapped_column(
        String(20), default=OCRExtractionStatus.PENDING.value
    )

    # Extracted data (raw output from OCR + AI validation)
    extracted_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # Structure depends on form type, e.g.:
    # {"custody_type": "joint", "primary_parent": "...", "schedule": {...}}

    # Per-field confidence scores from OCR engine
    confidence_scores: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g., {"custody_type": 0.95, "child_name": 0.87, "schedule_weekday": 0.62}

    # Fields flagged for professional review (confidence < threshold)
    low_confidence_fields: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # e.g., ["schedule_weekday", "holiday_schedule"]

    # Professional corrections made during review
    professional_corrections: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g., {"schedule_weekday": {"original": "Mon-Thu", "corrected": "Mon-Wed"}}

    # Processing metadata
    processing_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    processing_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    processing_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Approval
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    approved_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("professional_profiles.id"), nullable=True
    )
    rejected_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Output — the new agreement created from approved extraction
    # Per spec: OCR creates NEW agreements (doesn't update existing)
    created_agreement_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("agreements.id"), nullable=True
    )

    # Relationships
    professional: Mapped["ProfessionalProfile"] = relationship(
        "ProfessionalProfile", backref="uploaded_ocr_documents",
        foreign_keys=[uploaded_by_id]
    )
    family_file: Mapped["FamilyFile"] = relationship(
        "FamilyFile", backref="ocr_documents"
    )

    def __repr__(self) -> str:
        return f"<OCRDocument {self.id[:8]} ({self.detected_form_type or 'unknown'})>"


class FieldLock(Base, UUIDMixin, TimestampMixin):
    """
    Court-order-locked fields that parents cannot edit.

    Per spec:
    - Locked fields display: 🔒 Locked by Case-[case-number]
    - Parents can VIEW but cannot EDIT locked content
    - Tooltip: "This field is set by court order. Contact your attorney to request changes."
    - Professionals can unlock specific fields (requires confirmation)
    - Unlock action is logged in case timeline with reason
    - Unlocked fields remain unlocked until a new court order is filed

    Field locking is triggered when an OCR-processed court order is approved.
    """

    __tablename__ = "field_locks"

    # Which case and agreement the lock applies to
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True
    )
    agreement_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("agreements.id"), index=True
    )

    # Source OCR document that created this lock
    ocr_document_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("ocr_documents.id"), nullable=True, index=True
    )

    # Who locked the field
    locked_by_professional_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("professional_profiles.id"), index=True
    )

    # What is locked — JSONPath-style field identifier
    field_path: Mapped[str] = mapped_column(String(300), index=True)
    # e.g., "custody.schedule.weekday", "custody.primary_parent",
    #        "financial.child_support.amount"

    # Display value for the lock badge: "🔒 Locked by Case-[case_number]"
    case_number: Mapped[str] = mapped_column(String(100))

    # Lock timestamp
    locked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Unlock tracking (per spec: professionals can unlock with confirmation)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=True)
    unlocked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    unlocked_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("professional_profiles.id"), nullable=True
    )
    unlock_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Logged in case timeline per spec

    # Relationships
    family_file: Mapped["FamilyFile"] = relationship(
        "FamilyFile", backref="field_locks"
    )
    locked_by: Mapped["ProfessionalProfile"] = relationship(
        "ProfessionalProfile", backref="created_field_locks",
        foreign_keys=[locked_by_professional_id]
    )

    # Unique constraint: one lock per field per agreement
    __table_args__ = (
        UniqueConstraint('agreement_id', 'field_path', name='uq_agreement_field_lock'),
    )

    def __repr__(self) -> str:
        status = "🔒" if self.is_locked else "🔓"
        return f"<FieldLock {status} {self.field_path} Case-{self.case_number}>"


class FirmAuditLog(Base, UUIDMixin, TimestampMixin):
    """
    Audit log for firm-level activities.
    
    Tracks:
    - Member invites/removals
    - Role changes
    - Case assignments
    - Settings updates
    - Template changes
    
    Used for compliance and security auditing.
    """

    __tablename__ = "firm_audit_logs"

    # Context
    firm_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("firms.id"), index=True
    )
    actor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("professional_profiles.id"), index=True
    )
    
    # Event details
    event_type: Mapped[str] = mapped_column(String(50), index=True)
    # e.g., member_invited, member_joined, case_assigned, etc.
    
    description: Mapped[str] = mapped_column(Text)
    # Human readable description: "Sarah assigned case X to John"
    
    event_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # Structured data: { "case_number": "FF-123", "target_user": "John" }
    
    # Relationships
    firm: Mapped["Firm"] = relationship("Firm", backref="audit_logs")
    actor: Mapped["ProfessionalProfile"] = relationship(
        "ProfessionalProfile", backref="audit_actions"
    )

    def __repr__(self) -> str:
        return f"<FirmAuditLog {self.event_type} by {self.actor_id}>"
