"""
Pydantic schemas for the notification inbox (in-app + email).
"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class NotificationResponse(BaseModel):
    """A single notification as returned by the API."""

    id: str
    user_id: str
    family_file_id: Optional[str] = None
    notification_type: str
    title: str
    body: str
    action_url: Optional[str] = None
    metadata_json: Optional[dict[str, Any]] = None
    is_read: bool
    read_at: Optional[datetime] = None
    email_sent: bool
    email_sent_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    """Paginated list of notifications with unread count."""

    items: list[NotificationResponse]
    total: int
    unread_count: int

    model_config = ConfigDict(from_attributes=True)


class NotificationMarkReadRequest(BaseModel):
    """
    Request body for marking notifications read.

    An empty list (or omitted field) marks ALL unread notifications for
    the current user as read.
    """

    notification_ids: Optional[list[str]] = Field(
        default=None,
        description=(
            "IDs of notifications to mark read. Empty or null = mark all "
            "unread for the current user."
        ),
    )
