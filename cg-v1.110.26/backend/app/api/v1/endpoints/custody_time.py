"""
Custody Time API endpoints - Track and report parenting time.

Endpoints for custody statistics, parenting reports, and manual overrides.
"""

from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.family_file import FamilyFile
from app.models.child import Child
from app.schemas.custody_time import (
    TimePeriod,
    ChildCustodyStatsResponse,
    FamilyCustodyStatsResponse,
    ParentingReportResponse,
    CustodyOverrideRequest,
    BackfillRequest,
    BackfillResponse,
    CustodyTimelineResponse,
)
from app.services.custody_time import CustodyTimeService, get_period_dates

router = APIRouter()


# =============================================================================
# Helper Functions
# =============================================================================

async def verify_family_file_access(
    db: AsyncSession,
    family_file_id: str,
    user_id: str
) -> FamilyFile:
    """Verify user has access to family file and return it."""
    result = await db.execute(
        select(FamilyFile).where(
            and_(
                FamilyFile.id == family_file_id,
                or_(
                    FamilyFile.parent_a_id == user_id,
                    FamilyFile.parent_b_id == user_id
                )
            )
        )
    )
    family_file = result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family file not found or access denied"
        )

    return family_file


async def verify_child_access(
    db: AsyncSession,
    child_id: str,
    user_id: str
) -> Child:
    """Verify user has access to child and return it."""
    result = await db.execute(
        select(Child)
        .join(FamilyFile, Child.family_file_id == FamilyFile.id)
        .where(
            and_(
                Child.id == child_id,
                or_(
                    FamilyFile.parent_a_id == user_id,
                    FamilyFile.parent_b_id == user_id
                )
            )
        )
    )
    child = result.scalar_one_or_none()

    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found or access denied"
        )

    return child


def parse_date_or_none(date_str: Optional[str]) -> Optional[date]:
    """Parse date string or return None."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {date_str}. Expected YYYY-MM-DD"
        )


# =============================================================================
# Child Statistics Endpoints
# =============================================================================

@router.get("/child/{child_id}/stats")
async def get_child_custody_stats(
    child_id: str,
    period: TimePeriod = Query(TimePeriod.THIRTY_DAYS, description="Rolling period"),
    start_date: Optional[str] = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Custom end date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ChildCustodyStatsResponse:
    """
    Get custody time statistics for a specific child.

    Returns actual vs agreed custody percentages and variance.
    """
    # Verify access
    child = await verify_child_access(db, child_id, str(current_user.id))

    # Determine date range
    if start_date and end_date:
        start = parse_date_or_none(start_date)
        end = parse_date_or_none(end_date)
    else:
        start, end = get_period_dates(period.value)

    # Get statistics
    try:
        stats = await CustodyTimeService.compare_actual_vs_agreed(
            db, child.family_file_id, child_id, start, end
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return ChildCustodyStatsResponse(**stats)


@router.get("/child/{child_id}/timeline")
async def get_child_custody_timeline(
    child_id: str,
    period: TimePeriod = Query(TimePeriod.THIRTY_DAYS, description="Rolling period"),
    start_date: Optional[str] = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Custom end date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CustodyTimelineResponse:
    """
    Get real-time custody timeline and compliance statistics.

    Returns chronological custody sessions and minute-level compliance.
    """
    # Verify access
    child = await verify_child_access(db, child_id, str(current_user.id))

    # Determine date range
    if start_date and end_date:
        start = parse_date_or_none(start_date)
        end = parse_date_or_none(end_date)
    else:
        start, end = get_period_dates(period.value)

    # Get timeline sessions
    sessions = await CustodyTimeService.get_custody_timeline(
        db, child.family_file_id, start, end
    )

    # Get real-time stats
    stats = await CustodyTimeService.calculate_real_time_compliance(
        db, child.family_file_id, start, end
    )

    return CustodyTimelineResponse(
        sessions=sessions,
        stats=stats
    )


# =============================================================================
# Family Statistics Endpoints
# =============================================================================

@router.get("/family/{family_file_id}/stats")
async def get_family_custody_stats(
    family_file_id: str,
    period: TimePeriod = Query(TimePeriod.THIRTY_DAYS, description="Rolling period"),
    start_date: Optional[str] = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Custom end date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> FamilyCustodyStatsResponse:
    """
    Get custody time statistics for all children in a family.

    Returns per-child statistics and overall summary.
    """
    # Verify access
    await verify_family_file_access(db, family_file_id, str(current_user.id))

    # Determine date range
    if start_date and end_date:
        start = parse_date_or_none(start_date)
        end = parse_date_or_none(end_date)
    else:
        start, end = get_period_dates(period.value)

    # Get statistics
    try:
        stats = await CustodyTimeService.get_family_custody_stats(
            db, family_file_id, start, end
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return FamilyCustodyStatsResponse(**stats)


# =============================================================================
# Parenting Report Endpoints
# =============================================================================

@router.get("/family/{family_file_id}/report")
async def get_parenting_report(
    family_file_id: str,
    period: TimePeriod = Query(TimePeriod.THIRTY_DAYS, description="Rolling period"),
    start_date: Optional[str] = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Custom end date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ParentingReportResponse:
    """
    Generate comprehensive parenting report.

    Includes custody time, exchanges, events, and expenses for the period.
    """
    # Verify access
    await verify_family_file_access(db, family_file_id, str(current_user.id))

    # Determine date range
    if start_date and end_date:
        start = parse_date_or_none(start_date)
        end = parse_date_or_none(end_date)
    else:
        start, end = get_period_dates(period.value)

    # Generate report
    try:
        report = await CustodyTimeService.generate_parenting_report(
            db, family_file_id, start, end, str(current_user.id)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return ParentingReportResponse(**report)


# =============================================================================
# Manual Override Endpoints
# =============================================================================

@router.post("/family/{family_file_id}/override", status_code=status.HTTP_200_OK)
async def override_custody(
    family_file_id: str,
    data: CustodyOverrideRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Manually set custody for a day ("With Me" button).

    Allows a parent to indicate they have the child for a specific day.
    """
    # Verify access
    family_file = await verify_family_file_access(db, family_file_id, str(current_user.id))

    # Verify child belongs to this family
    child = await verify_child_access(db, data.child_id, str(current_user.id))
    if child.family_file_id != family_file_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Child does not belong to this family file"
        )

    # Verify parent_id is one of the parents
    if data.parent_id not in [family_file.parent_a_id, family_file.parent_b_id]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parent ID must be one of the family parents"
        )

    # Parse date
    record_date = parse_date_or_none(data.record_date) if data.record_date else None

    # Check if this is a Dashboard Check-in (Real-time)
    if data.reason == "Dashboard Check-in":
        from app.services.custody_exchange import CustodyExchangeService
        
        # Determine current custodial parent to set as "from_parent"
        # If we can't determine, we assume it's the other parent in the family file
        other_parent_id = family_file.parent_b_id if data.parent_id == family_file.parent_a_id else family_file.parent_a_id
        
        # Create an ad-hoc exchange
        exchange = await CustodyExchangeService.create_exchange(
            db=db,
            case_id=family_file_id,
            created_by=str(current_user.id),
            exchange_type="pickup",
            scheduled_time=datetime.utcnow(),
            title="Manual Check-in",
            from_parent_id=other_parent_id,
            to_parent_id=data.parent_id,
            child_ids=[data.child_id],
            notes_visible_to_coparent=True,
            items_to_bring="Manual Dashboard Check-in"
        )
        
        # Get the instance (it's created automatically)
        # We need to refresh to get instances if not loaded
        # create_exchange usually returns with instances loaded
        if exchange.instances:
            instance = exchange.instances[0]
            
            # Auto-complete the exchange by checking in both parents
            # We do this sequentially to ensure state updates
            await CustodyExchangeService.check_in(
                db=db,
                instance_id=str(instance.id),
                user_id=other_parent_id,
                notes="Auto-completed via Dashboard Check-in"
            )
            
            # Final check-in by the claiming parent
            completed_instance = await CustodyExchangeService.check_in(
                db=db,
                instance_id=str(instance.id),
                user_id=data.parent_id,
                notes="Dashboard Check-in"
            )
            
            if completed_instance:
                # Return success response
                # We need to fetch the day record that was created/updated internally
                # asking for the record date
                time_service_record = await CustodyTimeService.get_or_create_day_record(
                    db, family_file_id, data.child_id, completed_instance.completed_at.date()
                )
                
                await db.commit()
                
                return {
                    "success": True,
                    "record_id": time_service_record.id,
                    "record_date": time_service_record.record_date.isoformat(),
                    "custodial_parent_id": time_service_record.custodial_parent_id,
                    "exchange_id": str(exchange.id)
                }

    # Standard manual day override (historical or specific date)
    # Set override
    record = await CustodyTimeService.set_manual_override(
        db=db,
        family_file_id=family_file_id,
        child_id=data.child_id,
        parent_id=data.parent_id,
        override_by=str(current_user.id),
        record_date=record_date,
        reason=data.reason
    )

    await db.commit()

    return {
        "success": True,
        "record_id": record.id,
        "record_date": record.record_date.isoformat(),
        "custodial_parent_id": record.custodial_parent_id,
    }


# =============================================================================
# Backfill Endpoints (Admin/System)
# =============================================================================

@router.post("/family/{family_file_id}/backfill", status_code=status.HTTP_200_OK)
async def backfill_custody_records(
    family_file_id: str,
    data: BackfillRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> BackfillResponse:
    """
    Backfill custody records from agreed schedule.

    Creates records for days without check-ins based on the agreed
    parenting schedule pattern.
    """
    # Verify access
    family_file = await verify_family_file_access(db, family_file_id, str(current_user.id))

    # Parse dates
    start = parse_date_or_none(data.start_date)
    end = parse_date_or_none(data.end_date)

    if not start or not end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start and end dates are required"
        )

    if start > end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before end date"
        )

    # Get children to backfill
    if data.child_ids:
        child_ids = data.child_ids
    else:
        # Get all active children for this family
        result = await db.execute(
            select(Child).where(
                and_(
                    Child.family_file_id == family_file_id,
                    Child.is_active == True
                )
            )
        )
        children = result.scalars().all()
        child_ids = [c.id for c in children]

    # Backfill records
    total_created = 0
    for child_id in child_ids:
        count = await CustodyTimeService.backfill_from_schedule(
            db, family_file_id, child_id, start, end
        )
        total_created += count

    await db.commit()

    return BackfillResponse(
        family_file_id=family_file_id,
        records_created=total_created,
        start_date=start.isoformat(),
        end_date=end.isoformat(),
    )


@router.post("/family/{family_file_id}/backfill-from-exchanges", status_code=status.HTTP_200_OK)
async def backfill_from_exchanges(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Backfill custody records from completed exchange instances.

    Processes historical exchanges to create custody day records.
    """
    # Verify access
    await verify_family_file_access(db, family_file_id, str(current_user.id))

    # Backfill from exchanges
    count = await CustodyTimeService.backfill_from_completed_exchanges(
        db, family_file_id
    )

    await db.commit()

    return {
        "success": True,
        "family_file_id": family_file_id,
        "records_updated": count,
    }
