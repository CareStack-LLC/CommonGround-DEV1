"""
Agreement models - custody and co-parenting agreements (SharedCare Agreements).

Agreement Types:
- shared_care: Formal 18-section comprehensive agreement (SharedCare Agreement)
- parenting: Legacy type for backwards compatibility (treated as shared_care)
- custody: Legacy type (treated as shared_care)
- visitation: Legacy type (treated as shared_care)

Note: QuickAccords are separate lightweight agreements in family_file.py
"""

from datetime import datetime
from enum import Enum
from typing import Optional, TYPE_CHECKING
import secrets
import string

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.case import Case
    from app.models.family_file import FamilyFile


class AgreementType(str, Enum):
    """Type of agreement."""
    SHARED_CARE = "shared_care"  # Formal 18-section SharedCare Agreement
    PARENTING = "parenting"  # Legacy type, treated same as shared_care
    CUSTODY = "custody"  # Legacy type
    VISITATION = "visitation"  # Legacy type


def generate_shared_care_number() -> str:
    """Generate a unique SharedCare Agreement number (SCA-XXXXXX)."""
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(6))
    return f"SCA-{random_part}"


class Agreement(Base, UUIDMixin, TimestampMixin):
    """
    Agreement - The source of truth for custody arrangements (SharedCare Agreement).

    This is the active agreement. Version history is in AgreementVersion.
    Supports both legacy Case linkage and new FamilyFile linkage.
    """

    __tablename__ = "agreements"

    # Case link (legacy - for backwards compatibility)
    case_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("cases.id"), index=True, nullable=True
    )

    # Family File link (new)
    family_file_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True, nullable=True
    )

    # Agreement number (SCA-XXXXXX format)
    agreement_number: Mapped[Optional[str]] = mapped_column(
        String(20), unique=True, index=True, nullable=True
    )

    # Agreement metadata
    title: Mapped[str] = mapped_column(String(200), default="SharedCare Agreement")
    agreement_type: Mapped[str] = mapped_column(
        String(50), default=AgreementType.SHARED_CARE.value
    )  # shared_care, parenting (legacy), custody (legacy), visitation (legacy)

    # Version tracking
    version: Mapped[int] = mapped_column(Integer, default=1)
    current_version_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True
    )  # Points to AgreementVersion

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default="draft"
    )  # draft, pending_approval, active, superseded

    # Approval workflow
    petitioner_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    petitioner_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    respondent_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    respondent_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Effective dates
    effective_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    expiration_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Court information
    court_ordered: Mapped[bool] = mapped_column(Boolean, default=False)
    court_order_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    court_order_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Machine-readable rules (compiled from sections)
    rules: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # PDF document
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pdf_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # SHA-256

    # Relationships
    case: Mapped[Optional["Case"]] = relationship("Case", back_populates="agreements")
    family_file: Mapped[Optional["FamilyFile"]] = relationship(
        "FamilyFile", back_populates="agreements"
    )
    sections: Mapped[list["AgreementSection"]] = relationship(
        "AgreementSection", back_populates="agreement", cascade="all, delete-orphan"
    )
    versions: Mapped[list["AgreementVersion"]] = relationship(
        "AgreementVersion", back_populates="agreement", cascade="all, delete-orphan"
    )
    conversations: Mapped[list["AgreementConversation"]] = relationship(
        "AgreementConversation", back_populates="agreement", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Agreement {self.title} v{self.version}>"

    @property
    def is_active(self) -> bool:
        """Check if agreement is currently active."""
        return (
            self.status == "active"
            and self.petitioner_approved
            and self.respondent_approved
        )


class AgreementVersion(Base, UUIDMixin, TimestampMixin):
    """
    Version history for agreements.

    Immutable once created - preserves historical record.
    """

    __tablename__ = "agreement_versions"

    # Links
    agreement_id: Mapped[str] = mapped_column(String(36), ForeignKey("agreements.id"), index=True)

    # Version info
    version_number: Mapped[int] = mapped_column(Integer)
    version_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String(36))  # User ID

    # Snapshot of agreement data at this version
    data: Mapped[dict] = mapped_column(JSON)  # Complete agreement data

    # Approval tracking
    petitioner_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    petitioner_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    respondent_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    respondent_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # PDF snapshot
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pdf_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Relationships
    agreement: Mapped["Agreement"] = relationship("Agreement", back_populates="versions")

    def __repr__(self) -> str:
        return f"<AgreementVersion {self.agreement_id} v{self.version_number}>"


class AgreementSection(Base, UUIDMixin, TimestampMixin):
    """
    Individual sections of an agreement.

    Allows granular tracking and updates of specific clauses.
    """

    __tablename__ = "agreement_sections"

    # Link to agreement
    agreement_id: Mapped[str] = mapped_column(String(36), ForeignKey("agreements.id"), index=True)

    # Section info
    section_number: Mapped[str] = mapped_column(String(10))  # e.g., "1", "2.a", "3.1.2"
    section_title: Mapped[str] = mapped_column(String(200))
    section_type: Mapped[str] = mapped_column(
        String(50)
    )  # custody, schedule, financial, decision_making, etc.

    # Content
    content: Mapped[str] = mapped_column(Text)

    # Machine-readable data (for rules engine)
    structured_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Ordering
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    # Status
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    agreement: Mapped["Agreement"] = relationship("Agreement", back_populates="sections")

    def __repr__(self) -> str:
        return f"<AgreementSection {self.section_number}: {self.section_title}>"


class AgreementConversation(Base, UUIDMixin, TimestampMixin):
    """
    ARIA conversation history for agreement building.

    Stores the conversational approach to creating agreements.
    """

    __tablename__ = "agreement_conversations"

    # Link to agreement
    agreement_id: Mapped[str] = mapped_column(String(36), ForeignKey("agreements.id"), index=True)

    # Conversation metadata
    user_id: Mapped[str] = mapped_column(String(36))  # Which parent

    # Conversation data
    messages: Mapped[list] = mapped_column(JSON, default=list)  # [{role: user/assistant, content: ...}]

    # Extraction status
    is_finalized: Mapped[bool] = mapped_column(Boolean, default=False)
    finalized_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Summary generated by ARIA
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Extracted structured data (before writing to sections)
    extracted_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    agreement: Mapped["Agreement"] = relationship("Agreement", back_populates="conversations")

    def __repr__(self) -> str:
        return f"<AgreementConversation {self.agreement_id} ({len(self.messages)} messages)>"
