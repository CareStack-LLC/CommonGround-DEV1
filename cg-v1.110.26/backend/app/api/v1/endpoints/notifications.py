"""
Notification inbox endpoints.

Returns the authenticated user's in-app notifications and supports
marking them read. Email delivery is handled by NotificationService at
notification-creation time, not here.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.notification import (
    NotificationListResponse,
    NotificationMarkReadRequest,
    NotificationResponse,
)
from app.services.notification_service import notification_service

router = APIRouter()


@router.get(
    "/notifications",
    response_model=NotificationListResponse,
    summary="List notifications for the current user",
)
async def list_notifications(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    """Return the authenticated user's notification inbox (newest first)."""
    items, total, unread = await notification_service.list_for_user(
        db=db,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        unread_only=unread_only,
    )
    return NotificationListResponse(
        items=[NotificationResponse.model_validate(item) for item in items],
        total=total,
        unread_count=unread,
    )


@router.get(
    "/notifications/unread-count",
    summary="Unread notification count for the current user",
)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Lightweight endpoint for navbar badges."""
    count = await notification_service.unread_count(db, current_user.id)
    return {"unread_count": count}


@router.post(
    "/notifications/mark-read",
    summary="Mark one or more notifications as read",
)
async def mark_notifications_read(
    payload: NotificationMarkReadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Mark notifications read. Omit ``notification_ids`` (or pass ``[]``)
    to mark ALL unread notifications for the current user.
    """
    updated = await notification_service.mark_read(
        db=db,
        user_id=current_user.id,
        notification_ids=payload.notification_ids,
    )
    return {"updated": updated}
