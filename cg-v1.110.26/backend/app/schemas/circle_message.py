"""
Pydantic schemas for Circle Messages (standalone text messaging).

Circle Messages enable children, parents, and circle contacts to exchange
text messages with full ARIA child-safety monitoring.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ============================================================
# Create / Send Message
# ============================================================

class CircleMessageCreate(BaseModel):
    """Schema for sending a new circle message."""
    child_id: str = Field(..., description="The child involved in the conversation")
    recipient_id: str = Field(..., description="ID of the message recipient")
    recipient_type: str = Field(
        ...,
        pattern=r"^(child|parent_a|parent_b|circle_contact)$",
        description="Type of the recipient"
    )
    content: str = Field(..., min_length=1, max_length=2000, description="Message text content")

    # Optional attachment fields (set after uploading via /upload-attachment)
    attachment_url: Optional[str] = Field(None, description="URL of the uploaded attachment")
    attachment_type: Optional[str] = Field(None, pattern=r"^(image|video|file)$", description="Attachment type")
    attachment_name: Optional[str] = Field(None, max_length=255, description="Original filename")
    attachment_size: Optional[int] = Field(None, ge=0, description="File size in bytes")

    # ARIA intervention fields (set when resending after ARIA intercept)
    aria_accepted_rewrite: Optional[bool] = Field(None, description="True if user accepted ARIA's rewrite")
    intervention_action: Optional[str] = Field(None, pattern=r"^(accepted|modified|sent_anyway|cancelled)$", description="What the user chose")


# ============================================================
# Response Schemas
# ============================================================

class CircleMessageResponse(BaseModel):
    """Response schema for a single circle message."""
    id: str
    family_file_id: str
    child_id: str

    # Sender
    sender_id: str
    sender_type: str
    sender_name: str

    # Recipient
    recipient_id: str
    recipient_type: str

    # Content
    content: str
    original_content: Optional[str] = None

    # Attachment
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_size: Optional[int] = None

    # ARIA analysis
    aria_analyzed: bool = False
    aria_flagged: bool = False
    aria_category: Optional[str] = None
    aria_reason: Optional[str] = None
    aria_score: Optional[float] = None

    # ARIA intervention tracking
    user_action: Optional[str] = None
    aria_intervention_level: Optional[int] = None
    aria_all_categories: Optional[str] = None
    aria_suggested_rewrite: Optional[str] = None
    aria_response_time_ms: Optional[int] = None

    # Status
    is_delivered: bool = True
    is_read: bool = False
    is_hidden: bool = False

    # Timestamps
    sent_at: datetime
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CircleMessageListResponse(BaseModel):
    """Paginated list of circle messages."""
    items: List[CircleMessageResponse]
    total: int
    skip: int = 0
    limit: int = 50


# ============================================================
# Conversation Summary
# ============================================================

class CircleConversationResponse(BaseModel):
    """Summary of a conversation for the conversations list."""
    partner_id: str = Field(..., description="The other participant's ID")
    partner_name: str = Field(..., description="Display name of the conversation partner")
    partner_type: str = Field(..., description="Type: child, parent_a, parent_b, circle_contact")
    child_id: str = Field(..., description="The child involved")
    child_name: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0


class CircleConversationListResponse(BaseModel):
    """List of active conversations."""
    items: List[CircleConversationResponse]
    total: int


# ============================================================
# Unread Count
# ============================================================

class UnreadCountResponse(BaseModel):
    """Total unread message count."""
    count: int = 0


# ============================================================
# Terms Acceptance
# ============================================================

class AcceptTermsRequest(BaseModel):
    """Request to accept Terms of Service."""
    terms_version: str = Field(default="1.0", description="Version of terms being accepted")


class AcceptTermsResponse(BaseModel):
    """Response after accepting terms."""
    terms_accepted: bool = True
    terms_accepted_at: datetime
    terms_version: str


# ============================================================
# ARIA Analysis
# ============================================================

class CircleMessageAnalyzeRequest(BaseModel):
    """Request to pre-analyze a message before sending."""
    content: str = Field(..., min_length=1, max_length=10000, description="Message text to analyze")
    sender_type: str = Field(..., pattern=r"^(child|parent_a|parent_b|circle_contact)$")
    child_id: str = Field(..., description="The child involved")
    family_file_id: str = Field(..., description="Family file context")


class CircleMessageAnalyzeResponse(BaseModel):
    """Response from ARIA analysis of a circle message."""
    is_flagged: bool = False
    severity: str = "safe"  # safe, mild, moderate, severe
    categories: List[str] = Field(default_factory=list)
    explanation: Optional[str] = None
    suggested_rewrite: Optional[str] = None
    action: str = "ALLOW"  # ALLOW, FLAG, WARN_REWRITE, BLOCK
    should_block: bool = False
    confidence_score: float = 0.0
    response_time_ms: int = 0


# ============================================================
# Intervention Reporting
# ============================================================

class InterventionRecord(BaseModel):
    """Single ARIA intervention for reporting."""
    message_id: str
    sent_at: datetime
    sender_type: str
    sender_name: str
    severity: str
    categories: List[str] = Field(default_factory=list)
    original_content: Optional[str] = None
    final_content: Optional[str] = None
    suggested_rewrite: Optional[str] = None
    user_action: Optional[str] = None
    aria_score: Optional[float] = None
    response_time_ms: Optional[int] = None


class InterventionListResponse(BaseModel):
    """List of ARIA interventions for a family file."""
    items: List[InterventionRecord]
    total: int


class InterventionStatsResponse(BaseModel):
    """ARIA intervention statistics for a family file."""
    total_messages: int = 0
    total_flagged: int = 0
    flag_rate: float = 0.0
    by_category: dict = Field(default_factory=dict)
    by_sender: dict = Field(default_factory=dict)
    by_severity: dict = Field(default_factory=dict)
    by_user_action: dict = Field(default_factory=dict)
    escalation_trend: str = "stable"  # increasing, stable, decreasing
    time_distribution: dict = Field(default_factory=dict)
