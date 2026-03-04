"""
Dashboard schemas for activity stream and upcoming events.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PendingExpense(BaseModel):
    """Individual pending expense item."""
    id: str
    title: str
    amount: float
    category: str
    requested_by_name: Optional[str] = None
    requested_at: datetime
    days_pending: int


class UnreadMessage(BaseModel):
    """Unread message preview."""
    id: str
    sender_id: str
    sender_name: str
    content_preview: str  # First 50 chars
    sent_at: datetime


class PendingAgreement(BaseModel):
    """Agreement needing approval."""
    id: str
    title: str
    agreement_type: str  # "shared_care" or "quick_accord"
    status: str
    submitted_at: Optional[datetime] = None
    submitted_by_name: Optional[str] = None


class CourtNotification(BaseModel):
    """Unread court message/notification."""
    id: str
    message_type: str  # "notice", "reminder", "order", "general"
    subject: Optional[str] = None
    is_urgent: bool = False
    sent_at: datetime


class UpcomingEvent(BaseModel):
    """Upcoming calendar event."""
    id: str
    title: str
    event_category: str  # "medical", "school", "sports", "exchange", "general"
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    all_day: bool = False
    is_exchange: bool = False
    child_names: List[str] = []
    # Exchange-specific viewer-perspective fields
    viewer_role: Optional[str] = None  # "pickup" | "dropoff" | "both" - viewer's role
    other_parent_name: Optional[str] = None  # Name of the other parent for "with X" display


class RecentActivity(BaseModel):
    """Activity item for the recent activity feed."""
    id: str
    activity_type: str
    category: str
    actor_name: str
    title: str
    icon: str
    severity: str = "info"
    created_at: datetime
    is_read: bool = False
    subject_type: Optional[str] = None
    subject_id: Optional[str] = None


class DashboardSummary(BaseModel):
    """Complete dashboard activity summary."""
    # Expense counts and items
    pending_expenses_count: int = 0
    pending_expenses: List[PendingExpense] = []

    # Message counts and previews
    unread_messages_count: int = 0
    unread_messages: List[UnreadMessage] = []
    sender_name: Optional[str] = None  # For "X messages from {name}"

    # Agreement approvals
    pending_agreements_count: int = 0
    pending_agreements: List[PendingAgreement] = []

    # Court notifications
    unread_court_count: int = 0
    court_notifications: List[CourtNotification] = []

    # Upcoming events (next 7 days, all categories)
    upcoming_events: List[UpcomingEvent] = []
    next_event: Optional[UpcomingEvent] = None  # The very next event

    # Recent activities (new activity feed)
    recent_activities: List[RecentActivity] = []
    unread_activity_count: int = 0
