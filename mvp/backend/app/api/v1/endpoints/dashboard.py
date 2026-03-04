"""
Dashboard endpoints - aggregated activity data for dashboard display.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard import DashboardService

router = APIRouter()


@router.get("/summary/{family_file_id}", response_model=DashboardSummary)
async def get_dashboard_summary(
    family_file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> DashboardSummary:
    """
    Get aggregated dashboard data for a family file.

    Returns:
    - Pending expenses (obligations with status='open' where user is debtor)
    - Unread messages (read_at is NULL, user is recipient)
    - Agreements needing approval (pending_approval, user hasn't approved)
    - Court notifications (unread by user)
    - Upcoming events (next 7 days, all categories)
    """
    return await DashboardService.get_dashboard_summary(
        db=db,
        family_file_id=family_file_id,
        user=current_user
    )
