"""
Activity service - handles activity feed operations.

This service manages the activity feed which tracks user-visible events
in a family file (messages sent, profile updates, events created, etc.)
"""

from datetime import datetime
from typing import Optional, List, Tuple
from sqlalchemy import select, and_, or_, func, desc, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.user import User
from app.models.family_file import FamilyFile
from app.models.activity import (
    Activity,
    ActivityType,
    ActivityCategory,
    ACTIVITY_CATEGORY_MAP,
    ACTIVITY_ICON_MAP,
)
from app.schemas.activity import (
    ActivityCreate,
    ActivityResponse,
    ActivityList,
    ActivityFeedItem,
    RecentActivities,
)


class ActivityService:
    """Service for managing activity feed operations."""

    @staticmethod
    async def create_activity(
        db: AsyncSession,
        family_file_id: str,
        activity_type: str,
        actor_id: Optional[str],
        actor_name: str,
        subject_type: str,
        subject_id: Optional[str] = None,
        subject_name: Optional[str] = None,
        title: str = "",
        description: Optional[str] = None,
        icon: Optional[str] = None,
        severity: str = "info",
        extra_data: Optional[dict] = None,
    ) -> Activity:
        """
        Create a new activity record.

        Args:
            db: Database session
            family_file_id: The family file this activity belongs to
            activity_type: Type of activity (e.g., 'message_sent', 'child_updated')
            actor_id: ID of the user who performed the action (None for system)
            actor_name: Display name of the actor
            subject_type: Type of entity affected (e.g., 'message', 'child', 'event')
            subject_id: ID of the affected entity
            subject_name: Display name of the affected entity
            title: Human-readable title for the activity
            description: Optional longer description
            icon: Icon to display (defaults based on type)
            severity: 'info', 'warning', or 'urgent'
            extra_data: Additional context data

        Returns:
            Created Activity record
        """
        # Determine category from activity type
        try:
            activity_type_enum = ActivityType(activity_type)
            category = ACTIVITY_CATEGORY_MAP.get(
                activity_type_enum, ActivityCategory.SYSTEM
            ).value
            default_icon = ACTIVITY_ICON_MAP.get(activity_type_enum, "info")
        except ValueError:
            category = ActivityCategory.SYSTEM.value
            default_icon = "info"

        activity = Activity(
            family_file_id=family_file_id,
            activity_type=activity_type,
            category=category,
            actor_id=actor_id,
            actor_name=actor_name,
            subject_type=subject_type,
            subject_id=subject_id,
            subject_name=subject_name,
            title=title,
            description=description,
            icon=icon or default_icon,
            severity=severity,
            extra_data=extra_data,
        )

        db.add(activity)
        await db.commit()
        await db.refresh(activity)

        return activity

    @staticmethod
    async def get_activities(
        db: AsyncSession,
        family_file_id: str,
        user: User,
        limit: int = 20,
        offset: int = 0,
        category: Optional[str] = None,
    ) -> ActivityList:
        """
        Get activities for a family file with user-aware read status.

        Args:
            db: Database session
            family_file_id: The family file to get activities for
            user: Current user (to determine read status)
            limit: Maximum number of activities to return
            offset: Number of activities to skip
            category: Optional category filter

        Returns:
            ActivityList with items, total count, and unread count
        """
        # Verify user has access
        family_file = await ActivityService._verify_access(db, family_file_id, user)
        is_parent_a = str(user.id) == str(family_file.parent_a_id)

        # Build base query
        base_filter = Activity.family_file_id == family_file_id
        if category:
            base_filter = and_(base_filter, Activity.category == category)

        # Get total count
        total_result = await db.execute(
            select(func.count(Activity.id)).where(base_filter)
        )
        total = total_result.scalar() or 0

        # Get unread count
        if is_parent_a:
            unread_filter = and_(base_filter, Activity.read_by_parent_a_at.is_(None))
        else:
            unread_filter = and_(base_filter, Activity.read_by_parent_b_at.is_(None))

        unread_result = await db.execute(
            select(func.count(Activity.id)).where(unread_filter)
        )
        unread_count = unread_result.scalar() or 0

        # Get paginated activities
        result = await db.execute(
            select(Activity)
            .where(base_filter)
            .order_by(desc(Activity.created_at))
            .offset(offset)
            .limit(limit)
        )
        activities = result.scalars().all()

        # Convert to response with read status
        items = []
        for activity in activities:
            is_read = activity.is_read_by_user(str(user.id), is_parent_a)
            items.append(
                ActivityResponse(
                    id=str(activity.id),
                    family_file_id=str(activity.family_file_id),
                    activity_type=activity.activity_type,
                    category=activity.category,
                    actor_id=activity.actor_id,
                    actor_name=activity.actor_name,
                    subject_type=activity.subject_type,
                    subject_id=activity.subject_id,
                    subject_name=activity.subject_name,
                    title=activity.title,
                    description=activity.description,
                    icon=activity.icon,
                    severity=activity.severity,
                    extra_data=activity.extra_data,
                    created_at=activity.created_at,
                    is_read=is_read,
                )
            )

        return ActivityList(
            items=items,
            total=total,
            unread_count=unread_count,
            limit=limit,
            offset=offset,
        )

    @staticmethod
    async def get_recent_activities(
        db: AsyncSession,
        family_file_id: str,
        user: User,
        limit: int = 10,
    ) -> RecentActivities:
        """
        Get recent activities for dashboard display.

        Args:
            db: Database session
            family_file_id: The family file to get activities for
            user: Current user (to determine read status)
            limit: Maximum number of activities to return

        Returns:
            RecentActivities with simplified items for dashboard
        """
        # Verify user has access
        family_file = await ActivityService._verify_access(db, family_file_id, user)
        is_parent_a = str(user.id) == str(family_file.parent_a_id)

        # Get recent activities (excluding activities by this user)
        base_filter = and_(
            Activity.family_file_id == family_file_id,
            or_(
                Activity.actor_id != str(user.id),
                Activity.actor_id.is_(None)
            )
        )

        # Get total count (activities not by this user)
        total_result = await db.execute(
            select(func.count(Activity.id)).where(base_filter)
        )
        total_count = total_result.scalar() or 0

        # Get unread count
        if is_parent_a:
            unread_filter = and_(base_filter, Activity.read_by_parent_a_at.is_(None))
        else:
            unread_filter = and_(base_filter, Activity.read_by_parent_b_at.is_(None))

        unread_result = await db.execute(
            select(func.count(Activity.id)).where(unread_filter)
        )
        unread_count = unread_result.scalar() or 0

        # Get recent activities
        result = await db.execute(
            select(Activity)
            .where(base_filter)
            .order_by(desc(Activity.created_at))
            .limit(limit)
        )
        activities = result.scalars().all()

        # Convert to feed items
        items = []
        for activity in activities:
            is_read = activity.is_read_by_user(str(user.id), is_parent_a)
            items.append(
                ActivityFeedItem(
                    id=str(activity.id),
                    activity_type=activity.activity_type,
                    category=activity.category,
                    actor_name=activity.actor_name,
                    title=activity.title,
                    icon=activity.icon,
                    severity=activity.severity,
                    created_at=activity.created_at,
                    is_read=is_read,
                    subject_type=activity.subject_type,
                    subject_id=activity.subject_id,
                )
            )

        return RecentActivities(
            items=items,
            total_count=total_count,
            unread_count=unread_count,
        )

    @staticmethod
    async def mark_as_read(
        db: AsyncSession,
        activity_id: str,
        user: User,
    ) -> bool:
        """
        Mark a single activity as read by the user.

        Args:
            db: Database session
            activity_id: ID of the activity to mark as read
            user: Current user

        Returns:
            True if marked successfully
        """
        # Get activity
        result = await db.execute(
            select(Activity).where(Activity.id == activity_id)
        )
        activity = result.scalar_one_or_none()

        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")

        # Verify user has access to the family file
        family_file = await ActivityService._verify_access(
            db, str(activity.family_file_id), user
        )
        is_parent_a = str(user.id) == str(family_file.parent_a_id)

        # Mark as read
        activity.mark_read(is_parent_a)
        await db.commit()

        return True

    @staticmethod
    async def mark_all_as_read(
        db: AsyncSession,
        family_file_id: str,
        user: User,
    ) -> int:
        """
        Mark all unread activities as read for the user.

        Args:
            db: Database session
            family_file_id: The family file to mark activities as read
            user: Current user

        Returns:
            Number of activities marked as read
        """
        # Verify user has access
        family_file = await ActivityService._verify_access(db, family_file_id, user)
        is_parent_a = str(user.id) == str(family_file.parent_a_id)
        now = datetime.utcnow()

        # Build update query based on which parent
        if is_parent_a:
            stmt = (
                update(Activity)
                .where(
                    and_(
                        Activity.family_file_id == family_file_id,
                        Activity.read_by_parent_a_at.is_(None),
                    )
                )
                .values(read_by_parent_a_at=now)
            )
        else:
            stmt = (
                update(Activity)
                .where(
                    and_(
                        Activity.family_file_id == family_file_id,
                        Activity.read_by_parent_b_at.is_(None),
                    )
                )
                .values(read_by_parent_b_at=now)
            )

        result = await db.execute(stmt)
        await db.commit()

        return result.rowcount

    @staticmethod
    async def get_unread_count(
        db: AsyncSession,
        family_file_id: str,
        user: User,
    ) -> int:
        """
        Get count of unread activities for the user.

        Args:
            db: Database session
            family_file_id: The family file to count activities for
            user: Current user

        Returns:
            Count of unread activities
        """
        # Verify user has access
        family_file = await ActivityService._verify_access(db, family_file_id, user)
        is_parent_a = str(user.id) == str(family_file.parent_a_id)

        # Build filter based on which parent
        if is_parent_a:
            unread_filter = and_(
                Activity.family_file_id == family_file_id,
                Activity.read_by_parent_a_at.is_(None),
                or_(
                    Activity.actor_id != str(user.id),
                    Activity.actor_id.is_(None)
                )
            )
        else:
            unread_filter = and_(
                Activity.family_file_id == family_file_id,
                Activity.read_by_parent_b_at.is_(None),
                or_(
                    Activity.actor_id != str(user.id),
                    Activity.actor_id.is_(None)
                )
            )

        result = await db.execute(
            select(func.count(Activity.id)).where(unread_filter)
        )
        return result.scalar() or 0

    @staticmethod
    async def _verify_access(
        db: AsyncSession,
        family_file_id: str,
        user: User,
    ) -> FamilyFile:
        """Verify user has access to family file."""
        result = await db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        family_file = result.scalar_one_or_none()

        if not family_file:
            raise HTTPException(status_code=404, detail="Family file not found")

        user_id_str = str(user.id)
        if user_id_str not in [str(family_file.parent_a_id), str(family_file.parent_b_id)]:
            raise HTTPException(status_code=403, detail="Access denied")

        return family_file


# Convenience functions for creating common activities

async def log_message_activity(
    db: AsyncSession,
    family_file_id: str,
    sender_id: str,
    sender_name: str,
    message_id: str,
) -> Activity:
    """Log activity when a message is sent."""
    return await ActivityService.create_activity(
        db=db,
        family_file_id=family_file_id,
        activity_type=ActivityType.MESSAGE_SENT.value,
        actor_id=sender_id,
        actor_name=sender_name,
        subject_type="message",
        subject_id=message_id,
        title=f"{sender_name} sent a message",
    )


async def log_child_activity(
    db: AsyncSession,
    family_file_id: str,
    actor_id: str,
    actor_name: str,
    child_id: str,
    child_name: str,
    action: str,  # 'added', 'updated', 'approved'
    field_changed: Optional[str] = None,
) -> Activity:
    """Log activity when a child profile is modified."""
    if action == "added":
        activity_type = ActivityType.CHILD_ADDED.value
        title = f"{actor_name} added {child_name}"
    elif action == "approved":
        activity_type = ActivityType.CHILD_APPROVED.value
        title = f"{actor_name} approved {child_name}'s profile"
    else:  # updated
        activity_type = ActivityType.CHILD_UPDATED.value
        if field_changed:
            title = f"{actor_name} updated {child_name}'s {field_changed}"
        else:
            title = f"{actor_name} updated {child_name}'s profile"

    return await ActivityService.create_activity(
        db=db,
        family_file_id=family_file_id,
        activity_type=activity_type,
        actor_id=actor_id,
        actor_name=actor_name,
        subject_type="child",
        subject_id=child_id,
        subject_name=child_name,
        title=title,
        extra_data={"field": field_changed} if field_changed else None,
    )


async def log_event_activity(
    db: AsyncSession,
    family_file_id: str,
    actor_id: str,
    actor_name: str,
    event_id: str,
    event_title: str,
    action: str,  # 'created', 'updated', 'cancelled'
) -> Activity:
    """Log activity when an event is created/modified/cancelled."""
    if action == "created":
        activity_type = ActivityType.EVENT_CREATED.value
        title = f"New event: {event_title}"
    elif action == "cancelled":
        activity_type = ActivityType.EVENT_CANCELLED.value
        title = f"{event_title} was cancelled"
    else:  # updated
        activity_type = ActivityType.EVENT_UPDATED.value
        title = f"{event_title} was updated"

    return await ActivityService.create_activity(
        db=db,
        family_file_id=family_file_id,
        activity_type=activity_type,
        actor_id=actor_id,
        actor_name=actor_name,
        subject_type="event",
        subject_id=event_id,
        subject_name=event_title,
        title=title,
    )


async def log_exchange_activity(
    db: AsyncSession,
    family_file_id: str,
    actor_id: str,
    actor_name: str,
    exchange_id: str,
    action: str,  # 'scheduled', 'completed', 'cancelled'
    exchange_time: Optional[datetime] = None,
) -> Activity:
    """Log activity when an exchange is scheduled/completed/cancelled."""
    if action == "scheduled":
        activity_type = ActivityType.EXCHANGE_SCHEDULED.value
        time_str = exchange_time.strftime("%B %d at %I:%M %p") if exchange_time else ""
        title = f"Pickup scheduled for {time_str}" if time_str else "Exchange scheduled"
    elif action == "completed":
        activity_type = ActivityType.EXCHANGE_COMPLETED.value
        time_str = exchange_time.strftime("%I:%M %p") if exchange_time else ""
        title = f"Exchange confirmed at {time_str}" if time_str else "Exchange confirmed"
    else:  # cancelled
        activity_type = ActivityType.EXCHANGE_CANCELLED.value
        title = "Exchange was cancelled"

    return await ActivityService.create_activity(
        db=db,
        family_file_id=family_file_id,
        activity_type=activity_type,
        actor_id=actor_id,
        actor_name=actor_name,
        subject_type="exchange",
        subject_id=exchange_id,
        title=title,
        extra_data={"time": exchange_time.isoformat()} if exchange_time else None,
    )


async def log_agreement_activity(
    db: AsyncSession,
    family_file_id: str,
    actor_id: str,
    actor_name: str,
    agreement_id: str,
    agreement_title: str,
    action: str,  # 'created', 'updated', 'submitted', 'approved'
) -> Activity:
    """Log activity when an agreement is created/modified/approved."""
    if action == "created":
        activity_type = ActivityType.AGREEMENT_CREATED.value
        title = f"{actor_name} started a new agreement"
    elif action == "submitted":
        activity_type = ActivityType.AGREEMENT_SUBMITTED.value
        title = f"{actor_name} submitted {agreement_title} for approval"
    elif action == "approved":
        activity_type = ActivityType.AGREEMENT_APPROVED.value
        title = f"{actor_name} approved {agreement_title}"
    else:  # updated
        activity_type = ActivityType.AGREEMENT_UPDATED.value
        title = f"{actor_name} updated {agreement_title}"

    return await ActivityService.create_activity(
        db=db,
        family_file_id=family_file_id,
        activity_type=activity_type,
        actor_id=actor_id,
        actor_name=actor_name,
        subject_type="agreement",
        subject_id=agreement_id,
        subject_name=agreement_title,
        title=title,
    )


async def log_expense_activity(
    db: AsyncSession,
    family_file_id: str,
    actor_id: str,
    actor_name: str,
    expense_id: str,
    expense_description: str,
    amount: float,
    action: str,  # 'requested', 'approved', 'rejected'
) -> Activity:
    """Log activity when an expense is requested/approved/rejected."""
    amount_str = f"${amount:.2f}"

    if action == "requested":
        activity_type = ActivityType.EXPENSE_REQUESTED.value
        title = f"{actor_name} requested {amount_str} for {expense_description}"
    elif action == "approved":
        activity_type = ActivityType.EXPENSE_APPROVED.value
        title = f"{actor_name} approved {amount_str} expense"
    else:  # rejected
        activity_type = ActivityType.EXPENSE_APPROVED.value  # Using approved type for rejection too
        title = f"{actor_name} declined {amount_str} expense request"

    return await ActivityService.create_activity(
        db=db,
        family_file_id=family_file_id,
        activity_type=activity_type,
        actor_id=actor_id,
        actor_name=actor_name,
        subject_type="expense",
        subject_id=expense_id,
        subject_name=expense_description,
        title=title,
        extra_data={"amount": amount, "action": action},
    )
