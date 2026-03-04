"""
FamilyFile model - the container for all family data in CommonGround.

A FamilyFile is the root entity that houses:
- Parents (can start with single parent, invite other)
- Children (shared)
- Agreements (SharedCare and QuickAccord)
- Court Custody Case (optional, official court matter)
"""

from datetime import datetime
from enum import Enum
from typing import Optional, TYPE_CHECKING
import secrets
import string

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.child import Child
    from app.models.agreement import Agreement
    from app.models.message import Message
    from app.models.schedule import ScheduleEvent
    from app.models.custody_exchange import CustodyExchange
    from app.models.payment import Payment
    from app.models.my_time_collection import MyTimeCollection
    from app.models.clearfund import Obligation
    from app.models.activity import Activity
    from app.models.circle import CircleContact
    from app.models.kidcoms import KidComsSettings, KidComsSession, KidComsRoom, ChildUser


class FamilyFileStatus(str, Enum):
    """Status of a Family File."""
    ACTIVE = "active"
    ARCHIVED = "archived"
    COURT_LINKED = "court_linked"  # Has an active Court Custody Case


class ConflictLevel(str, Enum):
    """Internal conflict level tracking."""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class ParentRole(str, Enum):
    """Role/designation for a parent."""
    MOTHER = "mother"
    FATHER = "father"
    PARENT_A = "parent_a"
    PARENT_B = "parent_b"


def generate_family_file_number() -> str:
    """Generate a unique Family File number (FF-XXXXXX)."""
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(6))
    return f"FF-{random_part}"


class FamilyFile(Base, UUIDMixin, TimestampMixin):
    """
    FamilyFile - The root container for a family's CommonGround data.

    This replaces "Case" for parent-created records. A FamilyFile can exist
    whether or not there is court involvement.
    """

    __tablename__ = "family_files"

    # Identity
    family_file_number: Mapped[str] = mapped_column(
        String(20), unique=True, index=True, default=generate_family_file_number
    )
    title: Mapped[str] = mapped_column(String(200))  # e.g., "Miller Family - Alex & Jordan"

    # Created by
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True
    )

    # Parent A (the initiating parent)
    parent_a_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True
    )
    parent_a_role: Mapped[str] = mapped_column(
        String(20), default=ParentRole.PARENT_A.value
    )  # mother, father, parent_a, parent_b

    # Parent B (invited parent - can be null until they join)
    parent_b_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, index=True
    )
    parent_b_role: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )
    parent_b_email: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )  # Email for invitation
    parent_b_invited_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    parent_b_joined_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default=FamilyFileStatus.ACTIVE.value
    )
    conflict_level: Mapped[str] = mapped_column(
        String(20), default=ConflictLevel.LOW.value
    )  # Internal system tracking

    # Jurisdiction (for legal context, optional)
    state: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    county: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Settings
    aria_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    aria_provider: Mapped[str] = mapped_column(String(20), default="claude")
    aria_disabled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    aria_disabled_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    require_joint_approval: Mapped[bool] = mapped_column(Boolean, default=True)

    # Link to existing Case (for migration/backwards compatibility)
    legacy_case_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, index=True
    )

    # Relationships
    creator: Mapped["User"] = relationship(
        "User", foreign_keys=[created_by], backref="created_family_files"
    )
    parent_a: Mapped["User"] = relationship(
        "User", foreign_keys=[parent_a_id], backref="family_files_as_parent_a"
    )
    parent_b: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[parent_b_id], backref="family_files_as_parent_b"
    )

    # Children in this family file
    children: Mapped[list["Child"]] = relationship(
        "Child",
        back_populates="family_file",
        foreign_keys="Child.family_file_id",
        cascade="all, delete-orphan"
    )

    # SharedCare Agreements (formal 18-section agreements)
    agreements: Mapped[list["Agreement"]] = relationship(
        "Agreement", back_populates="family_file", cascade="all, delete-orphan"
    )

    # Quick Accords (lightweight situational agreements)
    quick_accords: Mapped[list["QuickAccord"]] = relationship(
        "QuickAccord", back_populates="family_file", cascade="all, delete-orphan"
    )

    # Messages (direct communication between parents)
    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="family_file", cascade="all, delete-orphan"
    )

    # My Time Collections (schedule organization containers)
    my_time_collections: Mapped[list["MyTimeCollection"]] = relationship(
        "MyTimeCollection", back_populates="family_file", cascade="all, delete-orphan"
    )

    # Custody Exchanges (pickup/dropoff events)
    custody_exchanges: Mapped[list["CustodyExchange"]] = relationship(
        "CustodyExchange", back_populates="family_file", cascade="all, delete-orphan"
    )

    # Court Custody Case (optional, 0 or 1)
    court_custody_case: Mapped[Optional["CourtCustodyCase"]] = relationship(
        "CourtCustodyCase", back_populates="family_file", uselist=False
    )

    # Activities (for the activity feed)
    activities: Mapped[list["Activity"]] = relationship(
        "Activity", back_populates="family_file", cascade="all, delete-orphan"
    )

    # Legacy Cases (for migration from old Case model)
    cases: Mapped[list["Case"]] = relationship(
        "Case", backref="family_file"
    )

    # KidComs - Circle contacts (approved people children can communicate with)
    circle_contacts: Mapped[list["CircleContact"]] = relationship(
        "CircleContact", back_populates="family_file", cascade="all, delete-orphan"
    )

    # KidComs - Settings (per-family configuration)
    kidcoms_settings: Mapped[Optional["KidComsSettings"]] = relationship(
        "KidComsSettings", back_populates="family_file", uselist=False
    )

    # KidComs - Sessions (video calls, theater, arcade, etc.)
    kidcoms_sessions: Mapped[list["KidComsSession"]] = relationship(
        "KidComsSession", back_populates="family_file", cascade="all, delete-orphan"
    )

    # My Circle - Communication rooms (10 per family)
    kidcoms_rooms: Mapped[list["KidComsRoom"]] = relationship(
        "KidComsRoom", back_populates="family_file", cascade="all, delete-orphan"
    )

    # My Circle - Child login accounts
    child_users: Mapped[list["ChildUser"]] = relationship(
        "ChildUser", back_populates="family_file", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<FamilyFile {self.family_file_number}: {self.title}>"

    @property
    def is_complete(self) -> bool:
        """Check if both parents have joined."""
        return self.parent_b_id is not None and self.parent_b_joined_at is not None

    @property
    def has_court_case(self) -> bool:
        """Check if there's an active court custody case."""
        return self.court_custody_case is not None

    @property
    def can_create_shared_care_agreement(self) -> bool:
        """
        Check if parents can create a new SharedCare Agreement.
        Not allowed if there's an active court custody case.
        """
        return not self.has_court_case


class CourtCustodyCase(Base, UUIDMixin, TimestampMixin):
    """
    CourtCustodyCase - An official court matter linked to a Family File.

    This represents jurisdiction-bound custody proceedings. When a Court
    Custody Case exists, parents can only create QuickAccords (not new
    SharedCare Agreements) unless approved by the court.
    """

    __tablename__ = "court_custody_cases"

    # Link to Family File
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id"), unique=True, index=True
    )

    # Court identification (court-issued, NOT CommonGround-generated)
    case_number: Mapped[str] = mapped_column(
        String(50), unique=True, index=True
    )
    case_type: Mapped[str] = mapped_column(
        String(50), default="custody"
    )  # custody, visitation, modification, enforcement

    # Jurisdiction
    jurisdiction_state: Mapped[str] = mapped_column(String(2))
    jurisdiction_county: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    court_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Parties
    petitioner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    respondent_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )

    # Attorneys (optional)
    petitioner_attorney: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    respondent_attorney: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Court professionals
    assigned_gal: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    assigned_caseworker: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    judge_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Key dates
    filing_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_court_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    next_court_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    order_effective_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Court orders (stored as JSON for flexibility)
    custody_orders: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    parenting_time_orders: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    exchange_rules: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    restrictions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # System controls (court-mandated settings)
    gps_checkin_required: Mapped[bool] = mapped_column(Boolean, default=False)
    supervised_exchange_required: Mapped[bool] = mapped_column(Boolean, default=False)
    aria_enforcement_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    agreement_editing_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    investigation_mode: Mapped[bool] = mapped_column(Boolean, default=False)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="active")
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    family_file: Mapped["FamilyFile"] = relationship(
        "FamilyFile", back_populates="court_custody_case"
    )
    petitioner: Mapped["User"] = relationship(
        "User", foreign_keys=[petitioner_id], backref="court_cases_as_petitioner"
    )
    respondent: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[respondent_id], backref="court_cases_as_respondent"
    )

    def __repr__(self) -> str:
        return f"<CourtCustodyCase {self.case_number}>"

    @property
    def is_active(self) -> bool:
        """Check if court case is currently active."""
        return self.status == "active" and self.closed_at is None


class QuickAccord(Base, UUIDMixin, TimestampMixin):
    """
    QuickAccord - Lightweight situational agreement between parents.

    Used for impromptu situations like:
    - Surprise trips
    - Schedule swaps
    - Special events
    - Temporary expenses

    Created conversationally via ARIA chat.
    """

    __tablename__ = "quick_accords"

    # Link to Family File
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True
    )

    # Identity
    accord_number: Mapped[str] = mapped_column(
        String(20), unique=True, index=True
    )  # QA-XXXXXX format
    title: Mapped[str] = mapped_column(String(200))

    # Purpose
    purpose_category: Mapped[str] = mapped_column(
        String(50)
    )  # travel, schedule_swap, special_event, overnight, expense, other
    purpose_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_single_event: Mapped[bool] = mapped_column(Boolean, default=True)

    # Dates
    event_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )  # For single events
    start_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )  # For date ranges
    end_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # Children involved
    child_ids: Mapped[list] = mapped_column(JSON, default=list)

    # Logistics
    location: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pickup_responsibility: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )  # parent_a, parent_b, or description
    dropoff_responsibility: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    transportation_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Financial (optional, via ClearFund)
    has_shared_expense: Mapped[bool] = mapped_column(Boolean, default=False)
    estimated_amount: Mapped[Optional[float]] = mapped_column(nullable=True)
    expense_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    receipt_required: Mapped[bool] = mapped_column(Boolean, default=False)

    # Initiated by
    initiated_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True
    )

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default="draft"
    )  # draft, pending_approval, active, completed, revoked, expired

    # Approval workflow
    parent_a_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_a_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    parent_b_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_b_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # ARIA integration
    aria_conversation_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True
    )
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Verification
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pdf_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Attestation
    attestation_text: Mapped[str] = mapped_column(
        Text,
        default="I attest this agreement reflects our mutual understanding for this specific situation."
    )

    # Relationships
    family_file: Mapped["FamilyFile"] = relationship(
        "FamilyFile", back_populates="quick_accords"
    )
    initiator: Mapped["User"] = relationship(
        "User", foreign_keys=[initiated_by], backref="initiated_quick_accords"
    )

    def __repr__(self) -> str:
        return f"<QuickAccord {self.accord_number}: {self.title}>"

    @property
    def is_approved(self) -> bool:
        """Check if both parents have approved."""
        return self.parent_a_approved and self.parent_b_approved

    @property
    def is_active(self) -> bool:
        """Check if QuickAccord is currently active."""
        return self.status == "active" and self.is_approved

    @property
    def is_expired(self) -> bool:
        """Check if QuickAccord has expired."""
        if self.end_date:
            return datetime.utcnow() > self.end_date
        if self.event_date:
            return datetime.utcnow() > self.event_date
        return False


def generate_quick_accord_number() -> str:
    """Generate a unique QuickAccord number (QA-XXXXXX)."""
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(6))
    return f"QA-{random_part}"
