"""CaseExport schemas for court-ready documentation packages."""

from datetime import date, datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class PackageType(str, Enum):
    """Package type options."""
    INVESTIGATION = "investigation"
    COURT = "court"


class ClaimType(str, Enum):
    """Claim type options for investigation packages."""
    SCHEDULE_VIOLATION = "schedule_violation"
    FINANCIAL_NON_COMPLIANCE = "financial_non_compliance"
    COMMUNICATION_CONCERN = "communication_concern"
    SAFETY_CONCERN = "safety_concern"
    OTHER = "other"


class RedactionLevel(str, Enum):
    """Redaction level options."""
    NONE = "none"
    STANDARD = "standard"
    ENHANCED = "enhanced"


class SectionType(str, Enum):
    """Available section types."""
    AGREEMENT_OVERVIEW = "agreement_overview"
    COMPLIANCE_SUMMARY = "compliance_summary"
    PARENTING_TIME = "parenting_time"
    FINANCIAL_COMPLIANCE = "financial_compliance"
    COMMUNICATION_COMPLIANCE = "communication_compliance"
    INTERVENTION_LOG = "intervention_log"
    PARENT_IMPACT = "parent_impact"
    CHAIN_OF_CUSTODY = "chain_of_custody"
    EXCHANGE_GPS_VERIFICATION = "exchange_gps_verification"


class ExportStatus(str, Enum):
    """Export status options."""
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"
    DOWNLOADED = "downloaded"


# Request Schemas

class ExportRequest(BaseModel):
    """Request to create a case export."""

    case_id: str = Field(..., description="ID of the case to export")
    package_type: PackageType = Field(
        ...,
        description="Type of export package"
    )
    date_start: date = Field(
        ...,
        description="Start date for data range"
    )
    date_end: date = Field(
        default_factory=date.today,
        description="End date for data range"
    )
    claim_type: Optional[ClaimType] = Field(
        None,
        description="Type of claim (required for investigation packages)"
    )
    claim_description: Optional[str] = Field(
        None,
        max_length=1000,
        description="Description of the claim or concern"
    )
    redaction_level: RedactionLevel = Field(
        default=RedactionLevel.STANDARD,
        description="Level of PII redaction"
    )
    sections: Optional[list[str]] = Field(
        None,
        description="Specific sections to include (defaults to all for package type)"
    )
    message_content_redacted: bool = Field(
        default=False,
        description="Whether to redact actual message content"
    )

    @field_validator('date_end')
    @classmethod
    def validate_date_range(cls, v: date, info) -> date:
        """Validate that end date is not before start date."""
        if 'date_start' in info.data and v < info.data['date_start']:
            raise ValueError('End date cannot be before start date')
        return v

    @field_validator('claim_type')
    @classmethod
    def validate_claim_for_investigation(cls, v: Optional[ClaimType], info) -> Optional[ClaimType]:
        """Validate claim type is provided for investigation packages."""
        if info.data.get('package_type') == PackageType.INVESTIGATION and v is None:
            raise ValueError('Claim type is required for investigation packages')
        return v

    @field_validator('sections')
    @classmethod
    def validate_sections(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        """Validate section types."""
        if v is None:
            return v
        valid_sections = [e.value for e in SectionType]
        for section in v:
            if section not in valid_sections:
                raise ValueError(f'Invalid section type: {section}. Must be one of: {valid_sections}')
        return v


# Response Schemas

class ExportSectionResponse(BaseModel):
    """Response for an export section."""

    id: str
    section_type: str
    section_order: int
    section_title: str
    evidence_count: int
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    generation_time_ms: Optional[int] = None

    class Config:
        from_attributes = True


class ExportResponse(BaseModel):
    """Response for a case export."""

    id: str
    case_id: str
    export_number: str
    package_type: str
    claim_type: Optional[str] = None
    claim_description: Optional[str] = None
    date_range_start: date
    date_range_end: date
    sections_included: list[str]
    redaction_level: str
    message_content_redacted: bool
    file_url: Optional[str] = None
    file_size_bytes: Optional[int] = None
    page_count: Optional[int] = None
    content_hash: Optional[str] = None
    chain_hash: Optional[str] = None
    watermark_text: Optional[str] = None
    verification_url: Optional[str] = None
    evidence_counts: Optional[dict] = None
    status: str
    error_message: Optional[str] = None
    download_count: int = 0
    last_downloaded_at: Optional[datetime] = None
    generated_at: Optional[datetime] = None
    generation_time_seconds: Optional[int] = None
    expires_at: Optional[datetime] = None
    is_permanent: bool = False
    created_at: datetime

    # Nested sections (optional, for detailed view)
    sections: Optional[list[ExportSectionResponse]] = None

    class Config:
        from_attributes = True


class ExportListResponse(BaseModel):
    """List of exports response."""

    exports: list[ExportResponse]
    total: int


class ExportVerification(BaseModel):
    """Verification result for an export."""

    export_number: str
    is_valid: bool
    is_expired: bool = False
    content_hash: Optional[str] = None
    chain_hash: Optional[str] = None
    package_type: str
    date_range_start: date
    date_range_end: date
    page_count: Optional[int] = None
    generated_at: Optional[datetime] = None
    generator_type: str
    verification_timestamp: datetime
    message: str = "Export verified successfully"


class ExportDownloadResponse(BaseModel):
    """Response when requesting a download."""

    export_id: str
    export_number: str
    file_url: str
    file_size_bytes: Optional[int] = None
    content_hash: str
    expires_in_seconds: Optional[int] = None


# Redaction Rule Schemas

class RedactionRuleCreate(BaseModel):
    """Create a redaction rule."""

    rule_name: str = Field(..., min_length=1, max_length=100)
    rule_type: str = Field(..., pattern="^(regex|keyword|entity_type)$")
    pattern: str = Field(..., min_length=1)
    replacement: str = Field(default="[REDACTED]", max_length=100)
    description: Optional[str] = None
    applies_to: list[str] = Field(default=["all"])
    redaction_level: RedactionLevel = Field(default=RedactionLevel.STANDARD)
    jurisdiction: Optional[str] = Field(None, max_length=10)
    priority: int = Field(default=0)


class RedactionRuleResponse(BaseModel):
    """Response for a redaction rule."""

    id: str
    rule_name: str
    rule_type: str
    pattern: str
    replacement: str
    description: Optional[str] = None
    applies_to: list[str]
    redaction_level: str
    jurisdiction: Optional[str] = None
    priority: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
