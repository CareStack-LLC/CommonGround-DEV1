"""Message schemas for request/response validation."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator
from app.utils.sanitize import sanitize_text


class MessageCreate(BaseModel):
    """Create a new message."""

    case_id: Optional[str] = Field(None, max_length=100)  # Court case context (legacy)
    family_file_id: Optional[str] = Field(None, max_length=100)  # Family file context (preferred)
    recipient_id: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1, max_length=10000)
    thread_id: Optional[str] = Field(None, max_length=100)
    agreement_id: Optional[str] = Field(None, max_length=100)  # SharedCare Agreement context
    message_type: str = Field(default="text", max_length=50)

    @field_validator('content')
    @classmethod
    def sanitize_content(cls, v: str) -> str:
        """Sanitize message content for XSS protection."""
        if not v or not v.strip():
            raise ValueError('Content cannot be empty')
        # Sanitize but preserve length for user feedback
        sanitized = sanitize_text(v, max_length=10000)
        if not sanitized:
            raise ValueError('Content is empty after sanitization')
        return sanitized

    @field_validator('message_type')
    @classmethod
    def validate_message_type(cls, v: str) -> str:
        """Validate message type is one of allowed values."""
        allowed_types = ['text', 'voice', 'request', 'system', 'notification']
        if v not in allowed_types:
            raise ValueError(f'Invalid message type. Must be one of: {", ".join(allowed_types)}')
        return v


class MessageUpdate(BaseModel):
    """Update message (for editing sent messages)."""

    content: str = Field(..., min_length=1, max_length=10000)

    @field_validator('content')
    @classmethod
    def sanitize_content(cls, v: str) -> str:
        """Sanitize message content for XSS protection."""
        if not v or not v.strip():
            raise ValueError('Content cannot be empty')
        sanitized = sanitize_text(v, max_length=10000)
        if not sanitized:
            raise ValueError('Content is empty after sanitization')
        return sanitized


class InterventionAction(BaseModel):
    """User's response to ARIA intervention."""

    action: str = Field(..., max_length=50)
    final_message: Optional[str] = Field(None, max_length=10000)
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator('action')
    @classmethod
    def validate_action(cls, v: str) -> str:
        """Validate action is one of allowed values."""
        allowed_actions = ['accepted', 'modified', 'rejected', 'cancelled']
        if v not in allowed_actions:
            raise ValueError(f'Invalid action. Must be one of: {", ".join(allowed_actions)}')
        return v

    @field_validator('final_message', 'notes')
    @classmethod
    def sanitize_text_fields(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize text fields for XSS protection."""
        if v is None:
            return None
        sanitized = sanitize_text(v, max_length=10000)
        return sanitized if sanitized else None


class ARIAAnalysisResponse(BaseModel):
    """ARIA sentiment analysis result."""

    toxicity_level: str
    toxicity_score: float
    categories: List[str]
    triggers: List[str]
    explanation: str
    suggestion: Optional[str]
    is_flagged: bool


class InterventionResponse(BaseModel):
    """ARIA intervention message."""

    level: str
    header: str
    explanation: str
    original_message: str
    suggestion: Optional[str]
    toxicity_score: float
    categories: List[str]
    child_reminder: str


class MessageFlagResponse(BaseModel):
    """Message flag details."""

    id: str
    message_id: str
    flagged_by: str
    flag_type: str
    toxicity_score: float
    toxicity_categories: List[str]
    suggested_rewrite: Optional[str]
    user_action: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    """Message response with all details."""

    id: str
    case_id: Optional[str] = None  # Court case context (legacy)
    family_file_id: Optional[str] = None  # Family file context (preferred)
    thread_id: Optional[str] = None
    agreement_id: Optional[str] = None  # SharedCare Agreement context
    sender_id: str
    recipient_id: str
    content: str
    message_type: str
    sent_at: datetime
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    was_flagged: bool
    original_content: Optional[str] = None  # If ARIA intervention occurred

    class Config:
        from_attributes = True


class MessageWithFlagResponse(BaseModel):
    """Message with flag details if applicable."""

    message: MessageResponse
    flag: Optional[MessageFlagResponse]


class ThreadCreate(BaseModel):
    """Create a new message thread."""

    case_id: str = Field(..., min_length=1, max_length=100)
    agreement_id: Optional[str] = Field(None, max_length=100)  # SharedCare Agreement context
    subject: str = Field(..., min_length=1, max_length=200)
    participants: List[str] = Field(..., min_items=2, max_items=10)

    @field_validator('subject')
    @classmethod
    def sanitize_subject(cls, v: str) -> str:
        """Sanitize thread subject for XSS protection."""
        if not v or not v.strip():
            raise ValueError('Subject cannot be empty')
        sanitized = sanitize_text(v, max_length=200)
        if not sanitized:
            raise ValueError('Subject is empty after sanitization')
        return sanitized

    @field_validator('participants')
    @classmethod
    def validate_participants(cls, v: List[str]) -> List[str]:
        """Validate participants list."""
        if len(v) < 2:
            raise ValueError('Thread must have at least 2 participants')
        if len(v) > 10:
            raise ValueError('Thread cannot have more than 10 participants')
        # Check for duplicates
        if len(v) != len(set(v)):
            raise ValueError('Duplicate participants not allowed')
        return v


class ThreadResponse(BaseModel):
    """Message thread response."""

    id: str
    case_id: str
    agreement_id: Optional[str] = None  # SharedCare Agreement context
    subject: str
    participants: List[str]
    last_message_at: Optional[datetime]
    is_archived: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ThreadWithMessagesResponse(BaseModel):
    """Thread with recent messages."""

    thread: ThreadResponse
    messages: List[MessageResponse]
    message_count: int


class AnalyticsResponse(BaseModel):
    """Good faith communication metrics."""

    user_id: str
    case_id: str
    total_messages: int
    flagged_messages: int
    flag_rate: float
    suggestions_accepted: int
    suggestions_modified: int
    suggestions_rejected: int
    acceptance_rate: float
    average_toxicity: float
    trend: str  # improving, stable, worsening
    period_start: datetime
    period_end: datetime


class ConversationStatsResponse(BaseModel):
    """Overall conversation statistics."""

    case_id: str
    total_messages: int
    total_flagged: int
    parent_a_stats: Dict[str, Any]
    parent_b_stats: Dict[str, Any]
    overall_toxicity: float
    trend: str
    last_activity: datetime


class TrendDataPoint(BaseModel):
    """Single data point for trend analysis."""

    date: str
    message_count: int
    flagged_count: int
    average_toxicity: float
    accepted: int
    rejected: int


class TrendResponse(BaseModel):
    """Trend data over time."""

    case_id: str
    data_points: List[TrendDataPoint]
    overall_trend: str
