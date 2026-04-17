"""
Admin endpoints for running maintenance jobs on demand.

Wave 1 A8: lets ops manually trigger the Daily.co room sweep for
verification without waiting 15 minutes for the scheduled tick.
"""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User
from app.services.daily_room_cleaner import cleanup_abandoned_sessions

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/daily-rooms",
    status_code=status.HTTP_200_OK,
    summary="Manually sweep abandoned Daily.co rooms",
)
async def run_daily_room_cleanup(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Dict[str, Any]:
    """
    Admin-only. Runs the KidComs abandoned-session sweeper immediately
    and returns the summary dict from `cleanup_abandoned_sessions`.

    Response shape:
        {
          "cleaned": int,
          "errors": [{"session_id": str, "room": str, "error": str}, ...],
          "duration_ms": float,
          "threshold_minutes": int
        }
    """
    logger.info(
        "admin_cleanup: manual daily-room sweep triggered by %s",
        current_user.email,
    )
    return await cleanup_abandoned_sessions(db)
