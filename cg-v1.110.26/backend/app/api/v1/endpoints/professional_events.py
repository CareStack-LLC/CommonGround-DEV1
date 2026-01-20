"""
Professional Events API Endpoints.

Calendar and event management for professionals including:
- Event CRUD operations
- Conflict detection
- Date range filtering
- Case-linked events
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.professional import ProfessionalProfile
from app.schemas.professional import (
    ProfessionalEventCreate,
    ProfessionalEventUpdate,
    ProfessionalEventResponse,
    ConflictCheckResponse,
    ProfessionalEventListResponse,
    CalendarSummary,
)
from app.services.professional.events_service import events_service
from sqlalchemy import select


router = APIRouter()


async def get_professional_context(
    db: AsyncSession,
    current_user: User,
) -> ProfessionalProfile:
    """Get the professional profile for the current user."""
    result = await db.execute(
        select(ProfessionalProfile).where(ProfessionalProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professional profile not found"
        )

    if not profile.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professional profile is not active"
        )

    return profile


@router.get("/", response_model=ProfessionalEventListResponse)
async def list_events(
    start_date: Optional[datetime] = Query(None, description="Filter events starting on or after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter events ending on or before this date"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    family_file_id: Optional[str] = Query(None, description="Filter by linked case"),
    include_cancelled: bool = Query(False, description="Include cancelled events"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List calendar events for the current professional.

    Supports filtering by date range, event type, and linked case.
    """
    profile = await get_professional_context(db, current_user)

    events, total = await events_service.list_events(
        db=db,
        professional_id=str(profile.id),
        start_date=start_date,
        end_date=end_date,
        event_type=event_type,
        family_file_id=family_file_id,
        include_cancelled=include_cancelled,
        limit=limit,
        offset=offset,
    )

    # Convert to response models
    event_responses = []
    for event in events:
        response = await events_service.to_response(db, event)
        event_responses.append(response)

    return ProfessionalEventListResponse(
        events=event_responses,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: ProfessionalEventCreate,
    check_conflicts: bool = Query(True, description="Check for scheduling conflicts"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new calendar event.

    Returns the created event along with any detected conflicts.
    Conflicts are warnings, not blockers - the event is still created.
    """
    profile = await get_professional_context(db, current_user)

    # Get firm_id from first active membership if available
    firm_id = None
    if profile.firm_memberships:
        for membership in profile.firm_memberships:
            if membership.is_active:
                firm_id = str(membership.firm_id)
                break

    try:
        event, conflicts = await events_service.create_event(
            db=db,
            professional_id=str(profile.id),
            event_data=event_data,
            firm_id=firm_id,
            check_conflicts=check_conflicts,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    event_response = await events_service.to_response(db, event)

    return {
        "event": event_response,
        "conflicts": [c.model_dump() for c in conflicts],
        "has_conflicts": len(conflicts) > 0,
    }


@router.get("/upcoming", response_model=list[ProfessionalEventResponse])
async def get_upcoming_events(
    days: int = Query(7, ge=1, le=90, description="Number of days to look ahead"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get upcoming events for the next N days."""
    profile = await get_professional_context(db, current_user)

    events = await events_service.get_upcoming_events(
        db=db,
        professional_id=str(profile.id),
        days=days,
        limit=limit,
    )

    responses = []
    for event in events:
        response = await events_service.to_response(db, event)
        responses.append(response)

    return responses


@router.get("/conflicts", response_model=ConflictCheckResponse)
async def check_conflicts(
    start_time: datetime = Query(..., description="Proposed event start time"),
    end_time: datetime = Query(..., description="Proposed event end time"),
    exclude_event_id: Optional[str] = Query(None, description="Event ID to exclude (for updates)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Check for scheduling conflicts without creating an event.

    Useful for validating event times before submission.
    """
    profile = await get_professional_context(db, current_user)

    if end_time <= start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time"
        )

    conflicts = await events_service.check_conflicts(
        db=db,
        professional_id=str(profile.id),
        start_time=start_time,
        end_time=end_time,
        exclude_event_id=exclude_event_id,
    )

    return ConflictCheckResponse(
        has_conflicts=len(conflicts) > 0,
        conflicts=conflicts,
    )


@router.get("/summary", response_model=CalendarSummary)
async def get_calendar_summary(
    start_date: datetime = Query(None, description="Summary period start"),
    end_date: datetime = Query(None, description="Summary period end"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get calendar summary statistics.

    Default period is the current month if not specified.
    """
    profile = await get_professional_context(db, current_user)

    # Default to current month
    if not start_date:
        now = datetime.utcnow()
        start_date = datetime(now.year, now.month, 1)
    if not end_date:
        # End of start_date's month
        if start_date.month == 12:
            end_date = datetime(start_date.year + 1, 1, 1)
        else:
            end_date = datetime(start_date.year, start_date.month + 1, 1)

    summary = await events_service.get_calendar_summary(
        db=db,
        professional_id=str(profile.id),
        start_date=start_date,
        end_date=end_date,
    )

    return CalendarSummary(**summary)


@router.get("/case/{family_file_id}", response_model=list[ProfessionalEventResponse])
async def get_events_for_case(
    family_file_id: str,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    include_cancelled: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all professional events linked to a specific case.

    Requires the professional to have access to the case.
    """
    profile = await get_professional_context(db, current_user)

    # Verify the professional has access to this case
    from app.models.professional import CaseAssignment
    result = await db.execute(
        select(CaseAssignment).where(
            CaseAssignment.professional_id == profile.id,
            CaseAssignment.family_file_id == family_file_id,
            CaseAssignment.status == "active",
        )
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this case"
        )

    events = await events_service.get_events_for_case(
        db=db,
        family_file_id=family_file_id,
        start_date=start_date,
        end_date=end_date,
        include_cancelled=include_cancelled,
    )

    responses = []
    for event in events:
        response = await events_service.to_response(db, event)
        responses.append(response)

    return responses


@router.get("/{event_id}", response_model=ProfessionalEventResponse)
async def get_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single event by ID."""
    profile = await get_professional_context(db, current_user)

    event = await events_service.get_event(
        db=db,
        event_id=event_id,
        professional_id=str(profile.id),
    )

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    return await events_service.to_response(db, event)


@router.patch("/{event_id}", response_model=dict)
async def update_event(
    event_id: str,
    update_data: ProfessionalEventUpdate,
    check_conflicts: bool = Query(True, description="Check for scheduling conflicts"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing event.

    Returns the updated event along with any detected conflicts.
    """
    profile = await get_professional_context(db, current_user)

    try:
        event, conflicts = await events_service.update_event(
            db=db,
            event_id=event_id,
            professional_id=str(profile.id),
            update_data=update_data,
            check_conflicts=check_conflicts,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    event_response = await events_service.to_response(db, event)

    return {
        "event": event_response,
        "conflicts": [c.model_dump() for c in conflicts],
        "has_conflicts": len(conflicts) > 0,
    }


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an event permanently."""
    profile = await get_professional_context(db, current_user)

    deleted = await events_service.delete_event(
        db=db,
        event_id=event_id,
        professional_id=str(profile.id),
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )


@router.post("/{event_id}/cancel", response_model=ProfessionalEventResponse)
async def cancel_event(
    event_id: str,
    reason: Optional[str] = Query(None, description="Cancellation reason"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cancel an event (soft delete).

    The event remains in the system but is marked as cancelled.
    """
    profile = await get_professional_context(db, current_user)

    event = await events_service.cancel_event(
        db=db,
        event_id=event_id,
        professional_id=str(profile.id),
        reason=reason,
    )

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    return await events_service.to_response(db, event)
