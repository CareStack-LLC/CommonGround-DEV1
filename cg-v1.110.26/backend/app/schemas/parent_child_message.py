"""
Pydantic schemas for persistent parent↔child messaging.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ParentChildMessageCreate(BaseModel):
    """Schema for creating a parent↔child message."""

    content: str = Field(..., min_length=1, max_length=2000)


class ParentChildMessageResponse(BaseModel):
    """Schema for returning a parent↔child message."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    family_file_id: str
    child_id: str

    sender_id: str
    sender_type: str
    sender_name: str

    content: str
    original_content: Optional[str] = None

    aria_analyzed: bool
    aria_flagged: bool
    aria_hidden: bool
    aria_category: Optional[str] = None
    aria_reason: Optional[str] = None
    aria_score: Optional[float] = None

    read_by_recipient: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class ParentChildMessageListResponse(BaseModel):
    """Paginated list of messages in a single thread."""

    items: List[ParentChildMessageResponse]
    total: int
    unread_count: int


class ParentChildThreadSummary(BaseModel):
    """Thread card for the parent inbox view (one entry per child)."""

    child_id: str
    child_name: str
    child_avatar_url: Optional[str] = None
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0


class ParentChildThreadListResponse(BaseModel):
    """List of all thread summaries for the authenticated parent."""

    items: List[ParentChildThreadSummary]
    total: int
