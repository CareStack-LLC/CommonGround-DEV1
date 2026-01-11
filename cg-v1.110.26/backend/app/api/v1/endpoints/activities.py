"""
Activity Feed endpoints.

Provides endpoints for viewing and managing the activity feed,
which shows recent events in a family file (messages, profile updates, etc.)
"""

from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.activity import (
    ActivityList,
    ActivityUnreadCount,
    ActivityMarkReadRequest,
    ActivityMarkReadResponse,
    RecentActivities,
)
from app.services.activity import ActivityService

router = APIRouter()


@router.get(
    "/family-files/{family_file_id}/activities",
    response_model=ActivityList,
    summary="Get activities for a family file",
    description="Returns paginated list of activities with user-aware read status.",
)
async def get_activities(
    family_file_id: str,
    limit: int = Query(20, ge=1, le=100, description="Maximum activities to return"),
    offset: int = Query(0, ge=0, description="Number of activities to skip"),
    category: Optional[str] = Query(
        None,
        description="Filter by category: communication, custody, schedule, financial, system",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get activities for a family file.

    Returns paginated list of activities with read status for the current user.
    Activities are sorted by most recent first.
    """
    return await ActivityService.get_activities(
        db=db,
        family_file_id=family_file_id,
        user=current_user,
        limit=limit,
        offset=offset,
        category=category,
    )


@router.get(
    "/family-files/{family_file_id}/activities/recent",
    response_model=RecentActivities,
    summary="Get recent activities for dashboard",
    description="Returns recent activities (excluding user's own) for dashboard display.",
)
async def get_recent_activities(
    family_file_id: str,
    limit: int = Query(10, ge=1, le=20, description="Maximum activities to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get recent activities for dashboard display.

    Returns simplified activity items for the dashboard feed.
    Excludes activities created by the current user (they don't need
    to see notifications about their own actions).
    """
    return await ActivityService.get_recent_activities(
        db=db,
        family_file_id=family_file_id,
        user=current_user,
        limit=limit,
    )


@router.get(
    "/family-files/{family_file_id}/activities/unread-count",
    response_model=ActivityUnreadCount,
    summary="Get unread activity count",
    description="Returns the count of unread activities for the current user.",
)
async def get_unread_count(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get count of unread activities for the current user.

    Used for notification badges.
    """
    count = await ActivityService.get_unread_count(
        db=db,
        family_file_id=family_file_id,
        user=current_user,
    )
    return ActivityUnreadCount(unread_count=count)


@router.post(
    "/family-files/{family_file_id}/activities/{activity_id}/read",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Mark activity as read",
    description="Marks a single activity as read by the current user.",
)
async def mark_activity_as_read(
    family_file_id: str,
    activity_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a single activity as read.

    The activity's read status is tracked per-user, so marking it as read
    for one parent doesn't affect the other parent's view.
    """
    await ActivityService.mark_as_read(
        db=db,
        activity_id=activity_id,
        user=current_user,
    )
    return None


@router.post(
    "/family-files/{family_file_id}/activities/read-all",
    response_model=ActivityMarkReadResponse,
    summary="Mark all activities as read",
    description="Marks all unread activities as read for the current user.",
)
async def mark_all_as_read(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark all activities as read.

    Returns the count of activities that were marked as read.
    """
    count = await ActivityService.mark_all_as_read(
        db=db,
        family_file_id=family_file_id,
        user=current_user,
    )
    return ActivityMarkReadResponse(marked_count=count)
