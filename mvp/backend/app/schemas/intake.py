"""
ARIA Paralegal - Intake Schemas.

Request and response schemas for legal intake API endpoints.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# =============================================================================
# Base Schemas
# =============================================================================

class IntakeSessionBase(BaseModel):
    """Base fields for intake session."""
    target_forms: List[str] = Field(
        ...,
        description="Target court forms: FL-300, FL-311, FL-320",
        min_items=1
    )
    custom_questions: Optional[List[str]] = Field(
        default=None,
        description="Custom questions from professional"
    )


class IntakeQuestionBase(BaseModel):
    """Base fields for intake question."""
    question_text: str
    question_category: str = "other"
    expected_response_type: str = "text"
    choices: Optional[List[str]] = None
    is_required: bool = True


# =============================================================================
# Request Schemas
# =============================================================================

class IntakeSessionCreate(IntakeSessionBase):
    """Create a new intake session."""
    case_id: str
    parent_id: str = Field(..., description="Which parent to send intake to")
    family_file_id: Optional[str] = None
    expires_in_days: int = Field(default=7, ge=1, le=30)


class IntakeQuestionCreate(IntakeQuestionBase):
    """Create a custom intake question."""
    is_template: bool = False


class IntakeMessageRequest(BaseModel):
    """Send a message to ARIA."""
    message: str = Field(..., min_length=1, max_length=5000)


class IntakeConfirmRequest(BaseModel):
    """Parent confirms intake completion."""
    edits: Optional[List[dict]] = Field(
        default=None,
        description="Any corrections the parent wants to make"
    )


class IntakeClarificationRequest(BaseModel):
    """Professional requests clarification."""
    clarification_request: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="What additional information is needed"
    )


# =============================================================================
# Response Schemas
# =============================================================================

class IntakeSessionResponse(BaseModel):
    """Response for intake session."""
    id: str
    session_number: str
    case_id: str
    family_file_id: Optional[str]
    professional_id: str
    parent_id: str

    # Access info
    access_token: str
    intake_link: str
    access_link_expires_at: datetime
    access_link_used_at: Optional[datetime]

    # Form targets
    target_forms: List[str]
    custom_questions: Optional[List[str]]

    # Status
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    message_count: int

    # Confirmation
    parent_confirmed: bool
    parent_confirmed_at: Optional[datetime]

    # Professional review
    professional_reviewed: bool
    professional_reviewed_at: Optional[datetime]

    # Clarification
    clarification_requested: bool
    clarification_request: Optional[str]
    clarification_response: Optional[str]

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IntakeSessionListItem(BaseModel):
    """Summary item for intake session list."""
    id: str
    session_number: str
    case_id: str
    parent_id: str
    target_forms: List[str]
    status: str
    message_count: int
    parent_confirmed: bool
    professional_reviewed: bool
    clarification_requested: bool
    access_link_expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class IntakeSessionList(BaseModel):
    """List of intake sessions."""
    items: List[IntakeSessionListItem]
    total: int


class IntakeAccessResponse(BaseModel):
    """Response when accessing intake via token."""
    session_id: str
    session_number: str
    professional_name: str
    professional_role: str
    target_forms: List[str]
    status: str
    is_accessible: bool
    case_name: Optional[str] = None
    children_names: Optional[List[str]] = None


class IntakeMessageResponse(BaseModel):
    """Response from ARIA after message."""
    response: str
    message_count: int
    extracted_so_far: Optional[dict] = None
    progress_sections: Optional[List[str]] = Field(
        default=None,
        description="Sections that have been discussed"
    )
    is_complete: bool = False


class IntakeSummaryResponse(BaseModel):
    """ARIA summary response."""
    session_number: str
    aria_summary: str
    extracted_data: Optional[dict]
    target_forms: List[str]
    message_count: int
    parent_confirmed: bool


class IntakeTranscriptResponse(BaseModel):
    """Full conversation transcript."""
    session_number: str
    messages: List[dict]
    message_count: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]


class IntakeQuestionResponse(BaseModel):
    """Response for intake question."""
    id: str
    professional_id: str
    question_text: str
    question_category: str
    expected_response_type: str
    choices: Optional[List[str]]
    is_template: bool
    is_required: bool
    is_active: bool
    use_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class IntakeQuestionList(BaseModel):
    """List of intake questions."""
    items: List[IntakeQuestionResponse]
    total: int


# =============================================================================
# Extraction Schemas
# =============================================================================

class IntakeExtractionResponse(BaseModel):
    """Response for extraction result."""
    id: str
    session_id: str
    target_form: str
    extraction_version: int
    extracted_at: datetime
    raw_extraction: Optional[dict]
    validated_fields: Optional[dict]
    confidence_score: Optional[float]
    extraction_errors: Optional[List[str]]
    missing_fields: Optional[List[str]]
    ai_provider: str
    model_used: Optional[str]

    class Config:
        from_attributes = True


# =============================================================================
# Output Schemas
# =============================================================================

class IntakeOutputs(BaseModel):
    """All outputs from completed intake."""
    session_number: str
    status: str
    parent_confirmed: bool
    parent_confirmed_at: Optional[datetime]

    # Summary
    aria_summary: Optional[str]

    # Extracted data
    extracted_data: Optional[dict]

    # Transcript
    messages: List[dict]
    message_count: int

    # Draft form
    draft_form_url: Optional[str]
    draft_form_generated_at: Optional[datetime]

    # Metadata
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    target_forms: List[str]
