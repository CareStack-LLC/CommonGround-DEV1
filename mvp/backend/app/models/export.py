"""
CaseExport models for court-ready documentation packages.

These models support generating comprehensive export packages with:
- Investigation packages (focused on specific claims)
- Court packages (comprehensive summaries)
- 8 standard sections with modular generation
- SHA-256 integrity verification
- Chain of custody verification
- PII redaction capabilities
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class CaseExport(Base, UUIDMixin, TimestampMixin):
    """
    Generated case export package.

    Supports both Investigation and Court package types with
    modular section generation and integrity verification.
    """
    __tablename__ = "case_exports"

    # Links
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id"), index=True
    )
    generated_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True
    )
    generator_type: Mapped[str] = mapped_column(
        String(20), default="parent"
    )  # "parent" or "professional"

    # Export identification
    export_number: Mapped[str] = mapped_column(
        String(50), unique=True, index=True
    )  # Format: "EXP-YYYYMMDD-XXXX"

    # Package type
    package_type: Mapped[str] = mapped_column(
        String(30)
    )  # "investigation" or "court"

    # For investigation packages: specific claim context
    claim_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # schedule_violation, financial_non_compliance, communication_concern, safety_concern, other
    claim_description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Date range
    date_range_start: Mapped[date] = mapped_column(Date)
    date_range_end: Mapped[date] = mapped_column(Date)

    # Sections included
    sections_included: Mapped[list] = mapped_column(JSON)
    # e.g., ["agreement_overview", "compliance_summary", "parenting_time", ...]

    # Redaction settings
    redaction_level: Mapped[str] = mapped_column(
        String(20), default="standard"
    )  # "none", "standard", "enhanced"
    message_content_redacted: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    sealed_items_included: Mapped[bool] = mapped_column(
        Boolean, default=False
    )

    # File details
    file_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    file_size_bytes: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    page_count: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )

    # Integrity verification
    content_hash: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True
    )  # SHA-256 of PDF content
    chain_hash: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True
    )  # Hash of EventLog chain

    # Watermark
    watermark_text: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Verification URL
    verification_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Evidence counts per section
    evidence_counts: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # e.g., {"messages": 156, "exchanges": 24, "payments": 12}

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default="generating"
    )  # "generating", "completed", "failed", "downloaded"
    error_message: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Access tracking
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    last_downloaded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # Expiration
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    is_permanent: Mapped[bool] = mapped_column(Boolean, default=False)

    # Generation metadata
    generated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    generation_time_seconds: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )

    # Relationships
    sections: Mapped[list["ExportSection"]] = relationship(
        "ExportSection",
        back_populates="export",
        cascade="all, delete-orphan",
        order_by="ExportSection.section_order"
    )
    case: Mapped["Case"] = relationship("Case")
    generator: Mapped["User"] = relationship("User")

    @property
    def is_expired(self) -> bool:
        """Check if export has expired."""
        if self.is_permanent:
            return False
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at

    @property
    def is_ready(self) -> bool:
        """Check if export is ready for download."""
        return self.status == "completed" and not self.is_expired


class ExportSection(Base, UUIDMixin, TimestampMixin):
    """
    Individual section of a case export with its generated content.

    Each section is independently generated and cached for
    potential reuse across multiple exports.
    """
    __tablename__ = "export_sections"

    # Link to export
    export_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("case_exports.id"), index=True
    )

    # Section identification
    section_type: Mapped[str] = mapped_column(String(50))
    # One of: agreement_overview, compliance_summary, parenting_time,
    #         financial_compliance, communication_compliance, intervention_log,
    #         parent_impact, chain_of_custody
    section_order: Mapped[int] = mapped_column(Integer)
    section_title: Mapped[str] = mapped_column(String(200))

    # Content
    content_json: Mapped[dict] = mapped_column(JSON)  # Structured data for rendering
    content_hash: Mapped[str] = mapped_column(String(64))  # SHA-256 of content

    # Page range in final PDF
    page_start: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_end: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Generation metadata
    evidence_count: Mapped[int] = mapped_column(Integer, default=0)
    data_sources: Mapped[list] = mapped_column(JSON, default=list)  # Tables queried

    # Generation timing
    generation_time_ms: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )

    # Relationships
    export: Mapped["CaseExport"] = relationship(
        "CaseExport", back_populates="sections"
    )


class RedactionRule(Base, UUIDMixin, TimestampMixin):
    """
    Configurable redaction rules for PII and sensitive data.

    Supports regex patterns, keyword lists, and entity type matching.
    Can be jurisdiction-specific for state law compliance.
    """
    __tablename__ = "redaction_rules"

    # Rule identification
    rule_name: Mapped[str] = mapped_column(String(100), unique=True)
    rule_type: Mapped[str] = mapped_column(String(50))
    # "regex", "keyword", "entity_type"

    # Pattern
    pattern: Mapped[str] = mapped_column(Text)  # Regex pattern or keyword list (JSON)
    replacement: Mapped[str] = mapped_column(
        String(100), default="[REDACTED]"
    )

    # Description
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Applicability
    applies_to: Mapped[list] = mapped_column(JSON, default=list)
    # ["messages", "notes", "addresses", "all"]
    redaction_level: Mapped[str] = mapped_column(String(20))
    # "standard", "enhanced"

    # Jurisdiction-specific
    jurisdiction: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True
    )  # State code or null for all

    # Priority for ordering rules
    priority: Mapped[int] = mapped_column(Integer, default=0)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


# Section type constants for reference
SECTION_TYPES = [
    "agreement_overview",
    "compliance_summary",
    "parenting_time",
    "financial_compliance",
    "communication_compliance",
    "intervention_log",
    "parent_impact",
    "chain_of_custody",
]

# Package type constants
PACKAGE_TYPES = ["investigation", "court"]

# Claim type constants for investigation packages
CLAIM_TYPES = [
    "schedule_violation",
    "financial_non_compliance",
    "communication_concern",
    "safety_concern",
    "other",
]

# Redaction level constants
REDACTION_LEVELS = ["none", "standard", "enhanced"]
