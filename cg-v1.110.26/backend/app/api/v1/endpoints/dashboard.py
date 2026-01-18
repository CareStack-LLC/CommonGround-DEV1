"""
Dashboard endpoints - aggregated activity data for dashboard display.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.family_file import FamilyFile
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.schedule import ScheduleEvent
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard import DashboardService
from app.services.custody_exchange import CustodyExchangeService

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


@router.get("/debug/events/{family_file_id}")
async def debug_upcoming_events(
    family_file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Debug endpoint to show all exchange and event data for a family file.
    """
    now = datetime.utcnow()
    week_later = now + timedelta(days=7)

    # Get family file
    ff_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == family_file_id)
    )
    family_file = ff_result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(status_code=404, detail="Family file not found")

    # Get ALL custody exchanges for this family file (not filtered by date)
    all_exchanges_result = await db.execute(
        select(CustodyExchange)
        .options(selectinload(CustodyExchange.instances))
        .where(
            or_(
                CustodyExchange.family_file_id == family_file_id,
                CustodyExchange.case_id == family_file.legacy_case_id
            ) if family_file.legacy_case_id else CustodyExchange.family_file_id == family_file_id
        )
    )
    all_exchanges = all_exchanges_result.scalars().all()

    # Get ALL custody exchange instances
    all_instances_result = await db.execute(
        select(CustodyExchangeInstance)
        .options(selectinload(CustodyExchangeInstance.exchange))
        .join(CustodyExchange, CustodyExchangeInstance.exchange_id == CustodyExchange.id)
        .where(
            or_(
                CustodyExchange.family_file_id == family_file_id,
                CustodyExchange.case_id == family_file.legacy_case_id
            ) if family_file.legacy_case_id else CustodyExchange.family_file_id == family_file_id
        )
    )
    all_instances = all_instances_result.scalars().all()

    # Get schedule events
    schedule_events_result = await db.execute(
        select(ScheduleEvent).where(
            ScheduleEvent.family_file_id == family_file_id
        )
    )
    schedule_events = schedule_events_result.scalars().all()

    return {
        "debug_info": {
            "current_time_utc": now.isoformat(),
            "week_later_utc": week_later.isoformat(),
            "family_file_id": family_file_id,
            "legacy_case_id": str(family_file.legacy_case_id) if family_file.legacy_case_id else None,
        },
        "custody_exchanges": [
            {
                "id": str(ex.id),
                "title": ex.title,
                "family_file_id": str(ex.family_file_id) if ex.family_file_id else None,
                "case_id": str(ex.case_id) if ex.case_id else None,
                "scheduled_time": ex.scheduled_time.isoformat() if ex.scheduled_time else None,
                "status": ex.status,
                "is_recurring": ex.is_recurring,
                "instance_count": len(ex.instances) if ex.instances else 0,
            }
            for ex in all_exchanges
        ],
        "custody_exchange_instances": [
            {
                "id": str(inst.id),
                "exchange_id": str(inst.exchange_id),
                "exchange_title": inst.exchange.title if inst.exchange else None,
                "scheduled_time": inst.scheduled_time.isoformat() if inst.scheduled_time else None,
                "status": inst.status,
                "is_in_date_range": (
                    inst.scheduled_time >= now and inst.scheduled_time <= week_later
                ) if inst.scheduled_time else False,
                "would_match_query": (
                    inst.scheduled_time >= now and
                    inst.scheduled_time <= week_later and
                    inst.status in ["scheduled", "pending"]
                ) if inst.scheduled_time else False,
            }
            for inst in all_instances
        ],
        "schedule_events": [
            {
                "id": str(ev.id),
                "title": ev.title,
                "start_time": ev.start_time.isoformat() if ev.start_time else None,
                "status": ev.status,
                "is_exchange": ev.is_exchange,
                "is_in_date_range": (
                    ev.start_time >= now and ev.start_time <= week_later
                ) if ev.start_time else False,
            }
            for ev in schedule_events
        ],
    }


@router.post("/regenerate-instances/{family_file_id}")
async def regenerate_exchange_instances(
    family_file_id: str,
    weeks_ahead: int = 8,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Regenerate future instances for all recurring custody exchanges.
    Use this if exchange instances have run out (beyond the 8-week lookahead).
    """
    # Verify user has access to family file
    ff_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == family_file_id)
    )
    family_file = ff_result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(status_code=404, detail="Family file not found")

    user_id_str = str(current_user.id)
    if user_id_str != str(family_file.parent_a_id) and user_id_str != str(family_file.parent_b_id):
        raise HTTPException(status_code=403, detail="Access denied")

    result = await CustodyExchangeService.regenerate_future_instances(
        db=db,
        family_file_id=family_file_id,
        weeks_ahead=weeks_ahead
    )

    return result


@router.post("/debug/create-test-event/{family_file_id}")
async def create_test_event(
    family_file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Debug endpoint: Create a test schedule event for tomorrow.
    This bypasses normal validation to help debug the Coming Up section.
    """
    import uuid
    from app.models.child import Child

    # Verify user has access to family file
    ff_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == family_file_id)
    )
    family_file = ff_result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(status_code=404, detail="Family file not found")

    user_id_str = str(current_user.id)
    if user_id_str != str(family_file.parent_a_id) and user_id_str != str(family_file.parent_b_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Get a child from this family file
    children_result = await db.execute(
        select(Child).where(Child.family_file_id == family_file_id).limit(1)
    )
    child = children_result.scalar_one_or_none()
    child_ids = [str(child.id)] if child else []

    # Create a test event for tomorrow at 10 AM
    now = datetime.utcnow()
    tomorrow = now + timedelta(days=1)
    start_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(hours=1)

    # Create event directly in the database
    event = ScheduleEvent(
        id=str(uuid.uuid4()),
        family_file_id=family_file_id,
        title="Test Event - Doctor Appointment",
        description="This is a test event created for debugging",
        start_time=start_time,
        end_time=end_time,
        child_ids=child_ids,
        event_category="medical",
        status="scheduled",
        visibility="co_parent",
        all_day=False,
        is_exchange=False,
        created_by=current_user.id,
    )
    db.add(event)
    await db.commit()

    return {
        "success": True,
        "event": {
            "id": str(event.id),
            "title": event.title,
            "start_time": event.start_time.isoformat(),
            "end_time": event.end_time.isoformat(),
            "event_category": event.event_category,
            "status": event.status,
            "child_ids": event.child_ids,
        },
        "message": "Test event created for tomorrow. Refresh dashboard to see it in Coming Up."
    }
