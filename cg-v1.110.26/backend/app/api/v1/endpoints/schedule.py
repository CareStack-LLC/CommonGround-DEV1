"""
Schedule endpoints for parenting time management.
"""

from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.child import Child
from app.models.court import CourtEvent
from app.models.case import Case, CaseParticipant
from app.schemas.schedule import (
    ScheduleEventCreate,
    ScheduleEventUpdate,
    ScheduleEventResponse,
    ExchangeCheckInCreate,
    ExchangeCheckInResponse,
    ComplianceMetrics,
    CalendarEvent,
    CalendarResponse,
)
from app.services.schedule import ScheduleService
from sqlalchemy import select, and_

router = APIRouter()


# RSVP Schemas
class CourtEventRSVPRequest(BaseModel):
    """Request schema for RSVP to court event."""
    status: str  # "attending", "not_attending", "maybe"
    notes: Optional[str] = None


class CourtEventResponse(BaseModel):
    """Response schema for court event."""
    id: str
    case_id: str
    event_type: str
    title: str
    description: Optional[str]
    event_date: date
    start_time: Optional[str]
    end_time: Optional[str]
    location: Optional[str]
    virtual_link: Optional[str]
    is_mandatory: bool
    status: str
    shared_notes: Optional[str]
    # RSVP info for current user
    my_rsvp_status: Optional[str]
    my_rsvp_required: bool
    my_rsvp_notes: Optional[str]
    # Other parent RSVP (visible to court)
    other_parent_rsvp_status: Optional[str]


class CourtEventListResponse(BaseModel):
    """List of court events for parent."""
    events: List[CourtEventResponse]
    total: int


@router.post("/events", status_code=status.HTTP_201_CREATED, response_model=ScheduleEventResponse)
async def create_event(
    event_data: ScheduleEventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a schedule event.

    Args:
        event_data: Event data

    Returns:
        Created event
    """
    schedule_service = ScheduleService(db)
    event = await schedule_service.create_event(event_data, current_user)

    return ScheduleEventResponse(
        id=event.id,
        case_id=event.case_id,
        family_file_id=event.family_file_id,
        collection_id=event.collection_id,
        created_by=event.created_by,
        event_type=event.event_type,
        start_time=event.start_time,
        end_time=event.end_time,
        all_day=event.all_day,
        child_ids=event.child_ids,
        title=event.title,
        description=event.description,
        location=event.location,
        visibility=event.visibility or "co_parent",
        status=event.status,
        is_owner=event.created_by == current_user.id if event.created_by else True,
        event_category=event.event_category or "general",
        category_data=event.category_data,
        created_at=event.created_at,
        updated_at=event.updated_at,
    )


@router.get("/cases/{case_id}/events", response_model=List[ScheduleEventResponse])
async def get_case_events(
    case_id: str,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    event_type: Optional[str] = Query(None),
    custodial_parent_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get schedule events for a case.

    Args:
        case_id: ID of the case
        start_date: Optional start date filter
        end_date: Optional end date filter
        event_type: Optional event type filter
        custodial_parent_id: Optional parent filter

    Returns:
        List of events
    """
    schedule_service = ScheduleService(db)
    events = await schedule_service.get_events(
        case_id,
        current_user,
        start_date,
        end_date,
        event_type,
        custodial_parent_id
    )

    return [
        ScheduleEventResponse(
            id=e.id,
            case_id=e.case_id,
            family_file_id=e.family_file_id,
            collection_id=e.collection_id,
            created_by=e.created_by,
            event_type=e.event_type,
            start_time=e.start_time,
            end_time=e.end_time,
            all_day=e.all_day,
            child_ids=e.child_ids,
            title=e.title,
            description=e.description,
            location=e.location,
            visibility=e.visibility or "co_parent",
            status=e.status,
            is_owner=e.created_by == current_user.id if e.created_by else False,
            event_category=e.event_category or "general",
            category_data=e.category_data,
            created_at=e.created_at,
            updated_at=e.updated_at,
        )
        for e in events
    ]


@router.put("/events/{event_id}", response_model=ScheduleEventResponse)
async def update_event(
    event_id: str,
    event_data: ScheduleEventUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a schedule event.

    Args:
        event_id: ID of the event
        event_data: Update data

    Returns:
        Updated event
    """
    schedule_service = ScheduleService(db)
    event = await schedule_service.update_event(event_id, event_data, current_user)

    return ScheduleEventResponse(
        id=event.id,
        case_id=event.case_id,
        collection_id=event.collection_id,
        created_by=event.created_by,
        event_type=event.event_type,
        start_time=event.start_time,
        end_time=event.end_time,
        all_day=event.all_day,
        child_ids=event.child_ids,
        title=event.title,
        description=event.description,
        location=event.location,
        visibility=event.visibility or "co_parent",
        status=event.status,
        is_owner=event.created_by == current_user.id if event.created_by else True,
        event_category=event.event_category or "general",
        category_data=event.category_data,
        created_at=event.created_at,
        updated_at=event.updated_at,
    )


@router.post("/check-ins", status_code=status.HTTP_201_CREATED, response_model=ExchangeCheckInResponse)
async def create_check_in(
    check_in_data: ExchangeCheckInCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create an exchange check-in.

    Args:
        check_in_data: Check-in data

    Returns:
        Created check-in
    """
    schedule_service = ScheduleService(db)
    check_in = await schedule_service.create_check_in(check_in_data, current_user)

    return ExchangeCheckInResponse(
        id=check_in.id,
        event_id=check_in.event_id,
        user_id=check_in.user_id,
        parent_role=check_in.parent_role,
        checked_in_at=check_in.checked_in_at,
        scheduled_time=check_in.scheduled_time,
        check_in_method=check_in.check_in_method,
        location_lat=check_in.location_lat,
        location_lng=check_in.location_lng,
        minutes_early_late=check_in.minutes_early_late,
        is_on_time=check_in.is_on_time,
        is_within_grace=check_in.is_within_grace,
        notes=check_in.notes,
        children_present=check_in.children_present,
        verified_by_other_parent=check_in.verified_by_other_parent,
        created_at=check_in.created_at,
    )


@router.get("/events/{event_id}/check-ins", response_model=List[ExchangeCheckInResponse])
async def get_event_check_ins(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get check-ins for an event.

    Args:
        event_id: ID of the event

    Returns:
        List of check-ins
    """
    schedule_service = ScheduleService(db)
    check_ins = await schedule_service.get_check_ins(event_id, current_user)

    return [
        ExchangeCheckInResponse(
            id=c.id,
            event_id=c.event_id,
            user_id=c.user_id,
            parent_role=c.parent_role,
            checked_in_at=c.checked_in_at,
            scheduled_time=c.scheduled_time,
            check_in_method=c.check_in_method,
            location_lat=c.location_lat,
            location_lng=c.location_lng,
            minutes_early_late=c.minutes_early_late,
            is_on_time=c.is_on_time,
            is_within_grace=c.is_within_grace,
            notes=c.notes,
            children_present=c.children_present,
            verified_by_other_parent=c.verified_by_other_parent,
            created_at=c.created_at,
        )
        for c in check_ins
    ]


@router.get("/cases/{case_id}/compliance", response_model=ComplianceMetrics)
async def get_compliance_metrics(
    case_id: str,
    user_id: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get exchange compliance metrics.

    Tracks on-time performance, late arrivals, and no-shows
    to provide objective compliance data for court.

    Args:
        case_id: ID of the case
        user_id: Optional specific user to analyze (defaults to all)
        days: Number of days to analyze (1-365)

    Returns:
        Compliance metrics
    """
    schedule_service = ScheduleService(db)
    metrics = await schedule_service.get_compliance_metrics(
        case_id,
        current_user,
        user_id,
        days
    )

    return ComplianceMetrics(**metrics)


@router.get("/cases/{case_id}/calendar", response_model=CalendarResponse)
async def get_calendar_data(
    case_id: str,
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get calendar view data for frontend.

    Provides formatted event data suitable for calendar display,
    including child names and parent information.

    Args:
        case_id: ID of the case
        start_date: Start of calendar view
        end_date: End of calendar view

    Returns:
        Calendar data with formatted events
    """
    schedule_service = ScheduleService(db)
    events = await schedule_service.get_events(
        case_id,
        current_user,
        start_date,
        end_date
    )

    # Get all children for this case
    children_result = await db.execute(
        select(Child).where(Child.case_id == case_id)
    )
    children_map = {c.id: c.first_name for c in children_result.scalars().all()}

    # Format events for calendar
    calendar_events = []
    for event in events:
        child_names = [children_map.get(child_id, "Unknown") for child_id in event.child_ids]

        calendar_event = CalendarEvent(
            id=event.id,
            title=event.title,
            start=event.start_time,
            end=event.end_time,
            all_day=event.all_day,
            event_type=event.event_type,
            custodial_parent=event.custodial_parent_id,
            is_exchange=event.is_exchange,
            location=event.location or event.exchange_location,
            status=event.status,
            child_names=child_names,
        )
        calendar_events.append(calendar_event)

    # Also fetch court events for this case and date range
    # Determine user's role in the case
    participant_result = await db.execute(
        select(CaseParticipant).where(
            and_(
                CaseParticipant.case_id == case_id,
                CaseParticipant.user_id == current_user.id
            )
        )
    )
    participant = participant_result.scalar_one_or_none()

    if participant:
        is_petitioner = participant.role == "petitioner"

        # Query court events for this case and date range
        court_events_result = await db.execute(
            select(CourtEvent).where(
                and_(
                    CourtEvent.case_id == case_id,
                    CourtEvent.event_date >= start_date.date() if hasattr(start_date, 'date') else start_date,
                    CourtEvent.event_date <= end_date.date() if hasattr(end_date, 'date') else end_date,
                    CourtEvent.status != "cancelled"
                )
            )
        )
        court_events = court_events_result.scalars().all()

        # Filter to events this parent is required for
        for ce in court_events:
            if (is_petitioner and ce.petitioner_required) or (not is_petitioner and ce.respondent_required):
                # Create datetime from date and time
                if ce.start_time:
                    event_start = datetime.combine(ce.event_date, ce.start_time)
                else:
                    event_start = datetime.combine(ce.event_date, datetime.min.time())

                if ce.end_time:
                    event_end = datetime.combine(ce.event_date, ce.end_time)
                else:
                    event_end = event_start

                # Get RSVP status for this parent
                my_rsvp = ce.petitioner_rsvp_status if is_petitioner else ce.respondent_rsvp_status

                court_calendar_event = CalendarEvent(
                    id=ce.id,
                    title=f"[Court] {ce.title}",
                    start=event_start,
                    end=event_end,
                    all_day=False,
                    event_type=f"court_{ce.event_type}",
                    custodial_parent=None,
                    is_exchange=False,
                    location=ce.location or ce.virtual_link,
                    status=ce.status,
                    child_names=[],  # Court events don't have specific children
                    court_event=True,  # Extra field to identify court events
                    is_mandatory=ce.is_mandatory,
                    my_rsvp_status=my_rsvp,
                )
                calendar_events.append(court_calendar_event)

    return CalendarResponse(
        case_id=case_id,
        events=calendar_events,
        start_date=start_date,
        end_date=end_date,
    )


# ============================================================================
# Court Event Endpoints for Parents
# ============================================================================

@router.get("/cases/{case_id}/court-events", response_model=CourtEventListResponse)
async def get_court_events_for_parent(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all court events for a case that this parent is required to attend.

    Returns court events with RSVP status and ability to respond.
    """
    # Verify user is participant in case
    participant_result = await db.execute(
        select(CaseParticipant).where(
            and_(
                CaseParticipant.case_id == case_id,
                CaseParticipant.user_id == current_user.id
            )
        )
    )
    participant = participant_result.scalar_one_or_none()

    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant in this case")

    is_petitioner = participant.role == "petitioner"

    # Query court events for this case
    court_events_result = await db.execute(
        select(CourtEvent).where(
            and_(
                CourtEvent.case_id == case_id,
                CourtEvent.status != "cancelled"
            )
        ).order_by(CourtEvent.event_date.desc())
    )
    court_events = court_events_result.scalars().all()

    # Build response with appropriate RSVP info
    events = []
    for ce in court_events:
        # Only include events this parent is required for
        my_required = ce.petitioner_required if is_petitioner else ce.respondent_required
        if not my_required:
            continue

        my_rsvp_status = ce.petitioner_rsvp_status if is_petitioner else ce.respondent_rsvp_status
        my_rsvp_notes = ce.petitioner_rsvp_notes if is_petitioner else ce.respondent_rsvp_notes
        other_rsvp_status = ce.respondent_rsvp_status if is_petitioner else ce.petitioner_rsvp_status

        events.append(CourtEventResponse(
            id=ce.id,
            case_id=ce.case_id,
            event_type=ce.event_type,
            title=ce.title,
            description=ce.description,
            event_date=ce.event_date,
            start_time=str(ce.start_time) if ce.start_time else None,
            end_time=str(ce.end_time) if ce.end_time else None,
            location=ce.location,
            virtual_link=ce.virtual_link,
            is_mandatory=ce.is_mandatory,
            status=ce.status,
            shared_notes=ce.shared_notes,
            my_rsvp_status=my_rsvp_status,
            my_rsvp_required=my_required,
            my_rsvp_notes=my_rsvp_notes,
            other_parent_rsvp_status=other_rsvp_status,
        ))

    return CourtEventListResponse(events=events, total=len(events))


@router.post("/court-events/{event_id}/rsvp")
async def rsvp_to_court_event(
    event_id: str,
    rsvp_data: CourtEventRSVPRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    RSVP to a court event.

    Parents can respond with:
    - "attending": Will attend the event
    - "not_attending": Cannot attend (requires reason/notes)
    - "maybe": Uncertain, will confirm later
    """
    # Validate RSVP status
    valid_statuses = ["attending", "not_attending", "maybe"]
    if rsvp_data.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid RSVP status. Must be one of: {', '.join(valid_statuses)}"
        )

    # Get the court event
    event_result = await db.execute(
        select(CourtEvent).where(CourtEvent.id == event_id)
    )
    event = event_result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Court event not found")

    # Verify user is participant in the case
    participant_result = await db.execute(
        select(CaseParticipant).where(
            and_(
                CaseParticipant.case_id == event.case_id,
                CaseParticipant.user_id == current_user.id
            )
        )
    )
    participant = participant_result.scalar_one_or_none()

    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant in this case")

    is_petitioner = participant.role == "petitioner"

    # Check if this parent is required for this event
    if is_petitioner and not event.petitioner_required:
        raise HTTPException(status_code=400, detail="You are not required to attend this event")
    if not is_petitioner and not event.respondent_required:
        raise HTTPException(status_code=400, detail="You are not required to attend this event")

    # Require notes if not attending a mandatory event
    if event.is_mandatory and rsvp_data.status == "not_attending" and not rsvp_data.notes:
        raise HTTPException(
            status_code=400,
            detail="Notes are required when declining a mandatory court event"
        )

    # Update RSVP status
    now = datetime.utcnow()
    if is_petitioner:
        event.petitioner_rsvp_status = rsvp_data.status
        event.petitioner_rsvp_at = now
        event.petitioner_rsvp_notes = rsvp_data.notes
    else:
        event.respondent_rsvp_status = rsvp_data.status
        event.respondent_rsvp_at = now
        event.respondent_rsvp_notes = rsvp_data.notes

    await db.commit()
    await db.refresh(event)

    return {
        "success": True,
        "message": f"RSVP recorded: {rsvp_data.status}",
        "event_id": event_id,
        "rsvp_status": rsvp_data.status,
        "rsvp_at": now.isoformat()
    }
