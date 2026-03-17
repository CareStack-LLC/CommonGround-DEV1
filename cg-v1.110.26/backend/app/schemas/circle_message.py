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
