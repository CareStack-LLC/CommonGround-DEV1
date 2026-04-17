"""
Pydantic schemas for the parent ↔ circle-contact coordination thread.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CircleParentMessageCreate(BaseModel):
    """Schema for creating a parent ↔ contact message."""

    content: str = Field(..., min_length=1, max_length=2000)


class CircleParentMessageResponse(BaseModel):
    """Schema for returning a parent ↔ contact message."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    family_file_id: str
    circle_contact_id: str
    parent_user_id: str

    sender_type: str  # "parent" | "contact"
    sender_name: str  # resolved server-side for display

    content: str
    original_content: Optional[str] = None

    aria_flagged: bool
    aria_reason: Optional[str] = None

    read_at: Optional[datetime] = None
    created_at: datetime


class CircleParentMessageListResponse(BaseModel):
    """Paginated list of messages in a single thread."""

    items: List[CircleParentMessageResponse]
    total: int
    unread_count: int


class CircleParentThreadSummary(BaseModel):
    """Thread summary for a parent's list of circle-contact threads."""

    circle_contact_id: str
    contact_name: str
    contact_photo_url: Optional[str] = None
    relationship_type: Optional[str] = None
    is_verified: bool = False
    is_active: bool = True
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0


class CircleParentThreadListResponse(BaseModel):
    """List of all parent ↔ contact thread summaries for the parent."""

    items: List[CircleParentThreadSummary]
    total: int


class ContactSideThreadInfo(BaseModel):
    """
    Contact-side thread info returned with messages. Tells the contact
    *which* parent they're coordinating with and whether the channel is
    still open.
    """

    circle_contact_id: str
    parent_user_id: str
    parent_name: str
    family_file_id: str
    is_active: bool
    is_verified: bool


class ContactSideThreadResponse(BaseModel):
    """What the contact sees when they hit the parent-chat endpoint."""

    info: ContactSideThreadInfo
    items: List[CircleParentMessageResponse]
    total: int
    unread_count: int
