"""
Activity schemas for the activity feed.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class ActivityBase(BaseModel):
    """Base activity fields."""
    activity_type: str
    category: str
    actor_id: Optional[str] = None
    actor_name: str
    subject_type: str
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    icon: str = "info"
    severity: str = "info"
    extra_data: Optional[dict] = None


class ActivityCreate(ActivityBase):
    """Schema for creating a new activity."""
    family_file_id: str


class ActivityResponse(ActivityBase):
    """Schema for activity response."""
    id: str
    family_file_id: str
    created_at: datetime
    is_read: bool = False  # Computed based on viewer

    class Config:
        from_attributes = True


class ActivityList(BaseModel):
    """Paginated list of activities."""
    items: List[ActivityResponse]
    total: int
    unread_count: int
    limit: int
    offset: int


class ActivityUnreadCount(BaseModel):
    """Unread activity count response."""
    unread_count: int


class ActivityMarkReadRequest(BaseModel):
    """Request to mark activities as read."""
    activity_ids: Optional[List[str]] = None  # If None, mark all as read


class ActivityMarkReadResponse(BaseModel):
    """Response after marking activities as read."""
    marked_count: int


# Activity feed item for dashboard (simplified)
class ActivityFeedItem(BaseModel):
    """Simplified activity item for the dashboard feed."""
    id: str
    activity_type: str
    category: str
    actor_name: str
    title: str
    icon: str
    severity: str
    created_at: datetime
    is_read: bool = False
    # For navigation
    subject_type: Optional[str] = None
    subject_id: Optional[str] = None
    # Relative time (computed by frontend)


class RecentActivities(BaseModel):
    """Recent activities for dashboard."""
    items: List[ActivityFeedItem]
    total_count: int
    unread_count: int
