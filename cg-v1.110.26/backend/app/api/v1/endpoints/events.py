"""
Event endpoints for schedule events with attendance tracking.

Events can be private or shared with the co-parent.
Includes RSVP/attendance management.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.schedule import (
    ScheduleEventCreate,
    ScheduleEventUpdate,
    ScheduleEventResponse,
    EventAttendanceUpdate,
    EventAttendanceResponse,
    ConflictCheckResponse,
)
from app.services.event import EventService
from app.services.activity import log_event_activity

router = APIRouter()


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=ScheduleEventResponse,
    summary="Create event",
    description="Create a schedule event with optional attendance invitations."
)
async def create_event(
    event_data: ScheduleEventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new schedule event.

    - **collection_id**: Collection to organize this event
    - **title**: Event title
    - **visibility**: "private" (only you) or "co_parent" (both see it)
    - **location_shared**: Share location with co-parent
    - **attendance_invites**: Optional list of [{parent_id, invited_role}]

    Privacy rules:
    - Creator sees full details
    - Co-parent sees based on visibility and location_shared settings
    """
    try:
        event = await EventService.create_event(
            db=db,
            collection_id=event_data.collection_id,
            user_id=current_user.id,
            title=event_data.title,
            start_time=event_data.start_time,
            end_time=event_data.end_time,
            child_ids=event_data.child_ids,
            description=event_data.description,
            location=event_data.location,
            location_shared=event_data.location_shared,
            visibility=event_data.visibility,
            all_day=event_data.all_day,
            attendance_invites=event_data.attendance_invites,
            event_category=event_data.event_category,
            category_data=event_data.category_data
        )

        # Log activity for co-parent visible events
        if event.family_file_id and event.visibility == "co_parent":
            actor_name = f"{current_user.first_name} {current_user.last_name}".strip() or "A parent"
            try:
                await log_event_activity(
                    db=db,
                    family_file_id=event.family_file_id,
                    actor_id=str(current_user.id),
                    actor_name=actor_name,
                    event_id=str(event.id),
                    event_title=event.title,
                    action="created"
                )
            except Exception as e:
                # Don't fail event creation if activity logging fails
                print(f"Failed to log event activity: {e}")

        # Filter for creator (they own it)
        filtered_data = await EventService.filter_for_coparent(
            event=event,
            viewer_id=current_user.id,
            db=db
        )

        return ScheduleEventResponse(**filtered_data)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/{event_id}",
    response_model=ScheduleEventResponse,
    summary="Get event",
    description="Get event by ID (privacy filtered)."
)
async def get_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get an event by ID.

    Privacy filtering applied:
    - Private events only shown to creator
    - Co-parent events shown to both (with filtering)
    - Location only shown if location_shared=True
    """
    event = await EventService.get_event(
        db=db,
        event_id=event_id,
        viewer_id=current_user.id
    )

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found or no access"
        )

    # Apply privacy filtering
    filtered_data = await EventService.filter_for_coparent(
        event=event,
        viewer_id=current_user.id,
        db=db
    )

    return ScheduleEventResponse(**filtered_data)


@router.get(
    "/cases/{case_id}",
    response_model=List[ScheduleEventResponse],
    summary="List events for case",
    description="Get all events for a case (privacy filtered)."
)
async def list_events(
    case_id: str,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List events for a case.

    - **start_date**: Filter events starting after this date
    - **end_date**: Filter events ending before this date

    Returns events you created plus events shared with you.
    Privacy filtering applied to each event.
    """
    try:
        events = await EventService.list_events(
            db=db,
            case_id=case_id,
            viewer_id=current_user.id,
            start_date=start_date,
            end_date=end_date
        )

        # Apply privacy filtering to each event
        filtered_events = []
        for event in events:
            filtered_data = await EventService.filter_for_coparent(
                event=event,
                viewer_id=current_user.id,
                db=db
            )
            filtered_events.append(ScheduleEventResponse(**filtered_data))

        return filtered_events

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put(
    "/{event_id}",
    response_model=ScheduleEventResponse,
    summary="Update event",
    description="Update an event (creator only)."
)
async def update_event(
    event_id: str,
    event_data: ScheduleEventUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an event.

    Only the creator can update the event.
    """
    try:
        event = await EventService.update_event(
            db=db,
            event_id=event_id,
            user_id=current_user.id,
            title=event_data.title,
            description=event_data.description,
            start_time=event_data.start_time,
            end_time=event_data.end_time,
            location=event_data.location,
            location_shared=event_data.location_shared,
            event_category=event_data.event_category,
            category_data=event_data.category_data
        )

        # Filter for creator
        filtered_data = await EventService.filter_for_coparent(
            event=event,
            viewer_id=current_user.id,
            db=db
        )

        return ScheduleEventResponse(**filtered_data)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete event",
    description="Cancel an event (creator only)."
)
async def delete_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete (cancel) an event.

    Only the creator can delete the event.
    Status changed to "cancelled".
    """
    try:
        deleted = await EventService.delete_event(
            db=db,
            event_id=event_id,
            user_id=current_user.id
        )

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )

        return None

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ========== ATTENDANCE / RSVP ENDPOINTS ==========

@router.put(
    "/{event_id}/rsvp",
    response_model=EventAttendanceResponse,
    summary="Update RSVP",
    description="Update your RSVP status for an event."
)
async def update_rsvp(
    event_id: str,
    rsvp_data: EventAttendanceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update your RSVP for an event.

    - **rsvp_status**: "going", "not_going", "maybe", "no_response"
    - **rsvp_note**: Optional note explaining your response
    """
    try:
        attendance = await EventService.update_rsvp(
            db=db,
            event_id=event_id,
            parent_id=current_user.id,
            rsvp_status=rsvp_data.rsvp_status,
            rsvp_note=rsvp_data.rsvp_note
        )

        return EventAttendanceResponse.model_validate(attendance)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/{event_id}/attendance",
    response_model=List[EventAttendanceResponse],
    summary="Get event attendance",
    description="Get all attendance records for an event."
)
async def get_event_attendance(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all attendance records for an event.

    Requires access to the event (creator or invited).
    """
    try:
        attendance_records = await EventService.get_event_attendance(
            db=db,
            event_id=event_id,
            viewer_id=current_user.id
        )

        return [
            EventAttendanceResponse.model_validate(record)
            for record in attendance_records
        ]

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/check-conflicts",
    response_model=ConflictCheckResponse,
    summary="Check event conflicts",
    description="Check if proposed event conflicts with time blocks."
)
async def check_event_conflicts(
    case_id: str = Query(...),
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if proposed event time conflicts with other parent's availability.

    ARIA integration: Returns neutral warnings without revealing details.
    """
    result = await EventService.check_event_conflicts(
        db=db,
        case_id=case_id,
        start_time=start_time,
        end_time=end_time,
        exclude_user_id=current_user.id
    )

    return ConflictCheckResponse(**result)
