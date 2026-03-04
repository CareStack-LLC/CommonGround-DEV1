"""
Event Service - Business logic for schedule events and attendance.

Handles:
- CRUD operations for events
- Attendance tracking (RSVP for MVP)
- Privacy filtering (co-parent view vs owner view)
- Event invitation management
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schedule import ScheduleEvent
from app.models.event_attendance import EventAttendance
from app.models.my_time_collection import MyTimeCollection
from app.models.case import CaseParticipant
from app.models.family_file import FamilyFile
from app.services.time_block import TimeBlockService, normalize_datetime


async def _check_event_access(
    db: AsyncSession,
    case_id: str,
    user_id: str
) -> tuple[bool, str, bool]:
    """
    Check if user has access via Case Participant or Family File.
    Returns (has_access, effective_case_id, is_family_file).
    """
    # First check Case Participant
    participant = await db.execute(
        select(CaseParticipant).where(
            CaseParticipant.case_id == case_id,
            CaseParticipant.user_id == user_id,
            CaseParticipant.is_active == True
        )
    )
    if participant.scalar_one_or_none():
        return True, case_id, False

    # Check Family File
    family_file_result = await db.execute(
        select(FamilyFile).where(
            FamilyFile.id == case_id,
            or_(FamilyFile.parent_a_id == user_id, FamilyFile.parent_b_id == user_id)
        )
    )
    family_file = family_file_result.scalar_one_or_none()
    if family_file:
        # If has legacy_case_id, use that for case-based queries
        if family_file.legacy_case_id:
            return True, family_file.legacy_case_id, False
        # Otherwise, use family_file_id for family-file-based queries
        return True, case_id, True

    return False, case_id, False


class EventService:
    """Service for managing events and attendance with privacy."""

    @staticmethod
    async def create_event(
        db: AsyncSession,
        collection_id: str,
        user_id: str,
        title: str,
        start_time: datetime,
        end_time: datetime,
        child_ids: List[str],
        description: Optional[str] = None,
        location: Optional[str] = None,
        location_shared: bool = False,
        visibility: str = "co_parent",
        all_day: bool = False,
        attendance_invites: Optional[List[Dict[str, str]]] = None,
        event_category: str = "general",
        category_data: Optional[Dict[str, Any]] = None
    ) -> ScheduleEvent:
        """
        Create a new event.

        Args:
            db: Database session
            collection_id: Collection UUID
            user_id: User creating event (must own collection)
            title: Event title
            start_time: Event start
            end_time: Event end
            child_ids: List of child UUIDs involved
            description: Event description (optional)
            location: Event location (optional)
            location_shared: Share location with co-parent
            visibility: "private" or "co_parent"
            all_day: Whether this is an all-day event
            attendance_invites: List of {parent_id, invited_role} (optional)

        Returns:
            Created ScheduleEvent with attendance records

        Raises:
            ValueError: If validation fails
        """
        # Verify collection ownership
        collection_result = await db.execute(
            select(MyTimeCollection).where(MyTimeCollection.id == collection_id)
        )
        collection = collection_result.scalar_one_or_none()

        if not collection:
            raise ValueError("Collection not found")

        if collection.owner_id != user_id:
            raise ValueError("You can only create events in your own collections")

        # Validate times
        if end_time <= start_time:
            raise ValueError("End time must be after start time")

        # Normalize datetime objects (strip timezone for PostgreSQL)
        start_time = normalize_datetime(start_time)
        end_time = normalize_datetime(end_time)

        # Create event - set case_id or family_file_id based on collection
        event = ScheduleEvent(
            id=str(uuid.uuid4()),
            case_id=collection.case_id,
            family_file_id=collection.family_file_id,  # Support Family File context
            collection_id=collection_id,
            created_by=user_id,
            title=title,
            description=description,
            start_time=start_time,
            end_time=end_time,
            all_day=all_day,
            child_ids=child_ids or [],
            location=location,
            location_shared=location_shared,
            visibility=visibility,
            event_type="event",  # MVP: generic events only
            event_category=event_category,  # V2: category-specific forms
            category_data=category_data,
            custodial_parent_id=user_id,
            status="scheduled"
        )

        db.add(event)
        await db.flush()

        # Create attendance records for invited parents
        if attendance_invites:
            for invite in attendance_invites:
                attendance = EventAttendance(
                    id=str(uuid.uuid4()),
                    event_id=event.id,
                    parent_id=invite["parent_id"],
                    invited_role=invite.get("invited_role", "optional"),
                    invited_at=datetime.utcnow(),
                    rsvp_status="no_response"
                )
                db.add(attendance)

        await db.flush()
        await db.refresh(event)

        return event

    @staticmethod
    async def get_event(
        db: AsyncSession,
        event_id: str,
        viewer_id: str
    ) -> Optional[ScheduleEvent]:
        """
        Get an event by ID (privacy filtered).

        Args:
            db: Database session
            event_id: Event UUID
            viewer_id: User requesting the event

        Returns:
            ScheduleEvent or None
        """
        result = await db.execute(
            select(ScheduleEvent).where(ScheduleEvent.id == event_id)
        )
        event = result.scalar_one_or_none()

        if not event:
            return None

        # Verify viewer has access - check Case or Family File
        has_access = False

        # Check Case Participant access (if event has case_id)
        if event.case_id:
            access_result = await db.execute(
                select(CaseParticipant).where(
                    CaseParticipant.case_id == event.case_id,
                    CaseParticipant.user_id == viewer_id,
                    CaseParticipant.is_active == True
                )
            )
            if access_result.scalar_one_or_none():
                has_access = True

        # Check Family File access (if event has family_file_id)
        if not has_access and event.family_file_id:
            family_file_result = await db.execute(
                select(FamilyFile).where(
                    FamilyFile.id == event.family_file_id,
                    or_(FamilyFile.parent_a_id == viewer_id, FamilyFile.parent_b_id == viewer_id)
                )
            )
            if family_file_result.scalar_one_or_none():
                has_access = True

        if not has_access:
            return None

        # Check visibility
        if event.visibility == "private" and event.created_by != viewer_id:
            return None

        return event

    @staticmethod
    async def list_events(
        db: AsyncSession,
        case_id: str,
        viewer_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[ScheduleEvent]:
        """
        List events for a case or family file (privacy filtered).

        Args:
            db: Database session
            case_id: Case UUID or Family File ID
            viewer_id: User requesting events
            start_date: Filter by start date (optional)
            end_date: Filter by end date (optional)

        Returns:
            List of ScheduleEvent (privacy filtered)
        """
        # Verify access (via case participant or family file)
        has_access, effective_id, is_family_file = await _check_event_access(db, case_id, viewer_id)
        if not has_access:
            raise ValueError("No access to this case")

        # Build query - use family_file_id for Family Files, case_id for Cases
        if is_family_file:
            query = select(ScheduleEvent).where(
                ScheduleEvent.family_file_id == effective_id,
                or_(
                    ScheduleEvent.created_by == viewer_id,
                    ScheduleEvent.visibility == "co_parent"
                )
            )
        else:
            query = select(ScheduleEvent).where(
                ScheduleEvent.case_id == effective_id,
                or_(
                    ScheduleEvent.created_by == viewer_id,
                    ScheduleEvent.visibility == "co_parent"
                )
            )

        # Add date filters (normalize to strip timezone for PostgreSQL)
        if start_date:
            start_date = normalize_datetime(start_date)
            query = query.where(ScheduleEvent.end_time >= start_date)
        if end_date:
            end_date = normalize_datetime(end_date)
            query = query.where(ScheduleEvent.start_time <= end_date)

        query = query.order_by(ScheduleEvent.start_time)

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_event(
        db: AsyncSession,
        event_id: str,
        user_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        location: Optional[str] = None,
        location_shared: Optional[bool] = None,
        event_category: Optional[str] = None,
        category_data: Optional[Dict[str, Any]] = None
    ) -> ScheduleEvent:
        """
        Update an event.

        Args:
            db: Database session
            event_id: Event UUID
            user_id: User making update (must be creator)
            title: New title (optional)
            description: New description (optional)
            start_time: New start time (optional)
            end_time: New end time (optional)
            location: New location (optional)
            location_shared: New location sharing setting (optional)

        Returns:
            Updated ScheduleEvent
        """
        result = await db.execute(
            select(ScheduleEvent).where(ScheduleEvent.id == event_id)
        )
        event = result.scalar_one_or_none()

        if not event:
            raise ValueError("Event not found")

        if event.created_by != user_id:
            raise ValueError("Only the creator can update this event")

        # Update fields
        if title is not None:
            event.title = title
        if description is not None:
            event.description = description
        if start_time is not None:
            event.start_time = start_time
        if end_time is not None:
            event.end_time = end_time
        if location is not None:
            event.location = location
        if location_shared is not None:
            event.location_shared = location_shared
        if event_category is not None:
            event.event_category = event_category
        if category_data is not None:
            event.category_data = category_data

        # Validate times
        if event.end_time <= event.start_time:
            raise ValueError("End time must be after start time")

        event.updated_at = datetime.utcnow()
        await db.flush()
        await db.refresh(event)

        return event

    @staticmethod
    async def delete_event(
        db: AsyncSession,
        event_id: str,
        user_id: str
    ) -> bool:
        """
        Delete an event (change status to cancelled).

        Args:
            db: Database session
            event_id: Event UUID
            user_id: User requesting deletion (must be creator)

        Returns:
            True if deleted
        """
        result = await db.execute(
            select(ScheduleEvent).where(ScheduleEvent.id == event_id)
        )
        event = result.scalar_one_or_none()

        if not event:
            return False

        if event.created_by != user_id:
            raise ValueError("Only the creator can delete this event")

        event.status = "cancelled"
        event.cancelled_at = datetime.utcnow()
        event.cancelled_by = user_id
        event.updated_at = datetime.utcnow()
        await db.flush()

        return True

    @staticmethod
    async def filter_for_coparent(
        event: ScheduleEvent,
        viewer_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Filter event for co-parent view.

        Privacy Rules:
        - Creator sees full details
        - Co-parent sees limited details based on visibility settings

        Args:
            event: ScheduleEvent to filter
            viewer_id: User viewing the event
            db: Database session

        Returns:
            Filtered dictionary
        """
        # Use case_id if set, otherwise use family_file_id as the identifier
        effective_case_id = event.case_id if event.case_id else event.family_file_id

        if event.created_by == viewer_id:
            # Creator sees everything
            return {
                "id": event.id,
                "case_id": effective_case_id,  # Return the effective identifier
                "family_file_id": event.family_file_id,
                "collection_id": event.collection_id,
                "created_by": event.created_by,
                "title": event.title,
                "description": event.description,
                "start_time": event.start_time.isoformat(),
                "end_time": event.end_time.isoformat(),
                "all_day": event.all_day,
                "child_ids": event.child_ids,
                "location": event.location,
                "location_shared": event.location_shared,
                "visibility": event.visibility,
                "status": event.status,
                "is_owner": True,
                "event_category": event.event_category,
                "category_data": event.category_data,
                "created_at": event.created_at.isoformat(),
                "updated_at": event.updated_at.isoformat()
            }
        else:
            # Co-parent sees limited view
            # Get viewer's attendance
            attendance_result = await db.execute(
                select(EventAttendance).where(
                    EventAttendance.event_id == event.id,
                    EventAttendance.parent_id == viewer_id
                )
            )
            attendance = attendance_result.scalar_one_or_none()

            return {
                "id": event.id,
                "case_id": effective_case_id,  # Return the effective identifier
                "family_file_id": event.family_file_id,
                "created_by": event.created_by,
                "title": event.title if event.visibility == "co_parent" else "Event",
                "description": event.description if event.visibility == "co_parent" else None,
                "start_time": event.start_time.isoformat(),
                "end_time": event.end_time.isoformat(),
                "all_day": event.all_day,
                "child_ids": event.child_ids,
                "location": event.location if event.location_shared else None,
                "visibility": event.visibility,
                "status": event.status,
                "is_owner": False,
                "event_category": event.event_category if event.visibility == "co_parent" else "general",
                "category_data": event.category_data if event.visibility == "co_parent" else None,
                "my_attendance": {
                    "invited_role": attendance.invited_role if attendance else "not_invited",
                    "rsvp_status": attendance.rsvp_status if attendance else "no_response"
                } if attendance else None,
                "created_at": event.created_at.isoformat(),
                "updated_at": event.updated_at.isoformat()
            }

    # ========== ATTENDANCE METHODS ==========

    @staticmethod
    async def update_rsvp(
        db: AsyncSession,
        event_id: str,
        parent_id: str,
        rsvp_status: str,
        rsvp_note: Optional[str] = None
    ) -> EventAttendance:
        """
        Update RSVP for an event.

        Args:
            db: Database session
            event_id: Event UUID
            parent_id: Parent updating RSVP
            rsvp_status: "going", "not_going", "maybe", "no_response"
            rsvp_note: Optional note

        Returns:
            Updated EventAttendance

        Raises:
            ValueError: If attendance record not found or invalid status
        """
        valid_statuses = ["going", "not_going", "maybe", "no_response"]
        if rsvp_status not in valid_statuses:
            raise ValueError(f"Invalid RSVP status. Must be one of: {valid_statuses}")

        # Get or create attendance record
        result = await db.execute(
            select(EventAttendance).where(
                EventAttendance.event_id == event_id,
                EventAttendance.parent_id == parent_id
            )
        )
        attendance = result.scalar_one_or_none()

        if not attendance:
            # Create new attendance record
            attendance = EventAttendance(
                id=str(uuid.uuid4()),
                event_id=event_id,
                parent_id=parent_id,
                invited_role="optional",
                invited_at=datetime.utcnow(),
                rsvp_status=rsvp_status,
                rsvp_at=datetime.utcnow(),
                rsvp_note=rsvp_note
            )
            db.add(attendance)
        else:
            # Update existing
            attendance.rsvp_status = rsvp_status
            attendance.rsvp_at = datetime.utcnow()
            if rsvp_note is not None:
                attendance.rsvp_note = rsvp_note
            attendance.updated_at = datetime.utcnow()

        await db.flush()
        await db.refresh(attendance)

        return attendance

    @staticmethod
    async def get_event_attendance(
        db: AsyncSession,
        event_id: str,
        viewer_id: str
    ) -> List[EventAttendance]:
        """
        Get all attendance records for an event.

        Args:
            db: Database session
            event_id: Event UUID
            viewer_id: User requesting (must have access to event)

        Returns:
            List of EventAttendance
        """
        # Verify event access
        event = await EventService.get_event(db, event_id, viewer_id)
        if not event:
            raise ValueError("Event not found or no access")

        # Get attendance records
        result = await db.execute(
            select(EventAttendance).where(EventAttendance.event_id == event_id)
        )

        return list(result.scalars().all())

    @staticmethod
    async def _check_overlapping_events(
        db: AsyncSession,
        case_id: str,
        start_time: datetime,
        end_time: datetime,
        exclude_user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Check for overlapping events from the other parent.

        ARIA Integration: Returns neutral warnings without revealing
        specific details about the other parent's schedule.

        Args:
            db: Database session
            case_id: Case UUID or Family File ID
            start_time: Proposed event start
            end_time: Proposed event end
            exclude_user_id: User creating the event (exclude their events)

        Returns:
            List of ARIA conflict warnings
        """
        conflicts = []

        # Normalize datetime
        start_time = normalize_datetime(start_time)
        end_time = normalize_datetime(end_time)

        # Build query for overlapping events from other parent
        # Check both case_id and family_file_id for Family File support
        query = select(ScheduleEvent).where(
            or_(
                ScheduleEvent.case_id == case_id,
                ScheduleEvent.family_file_id == case_id
            ),
            ScheduleEvent.status != "cancelled",
            ScheduleEvent.visibility == "co_parent",  # Only visible events
            ScheduleEvent.start_time < end_time,
            ScheduleEvent.end_time > start_time
        )

        if exclude_user_id:
            query = query.where(ScheduleEvent.created_by != exclude_user_id)

        result = await db.execute(query)
        overlapping_events = result.scalars().all()

        if overlapping_events:
            # Count how many events overlap
            event_count = len(overlapping_events)

            # Check if any involve children
            children_involved = any(
                event.child_ids and len(event.child_ids) > 0
                for event in overlapping_events
            )

            # ARIA-style neutral warning - don't reveal specific details
            if children_involved:
                conflicts.append({
                    "type": "event_conflict",
                    "severity": "high",
                    "message": f"There {'is an event' if event_count == 1 else f'are {event_count} events'} scheduled during this time that may involve your children.",
                    "suggestion": "Consider checking with your co-parent before scheduling to avoid conflicts.",
                    "can_proceed": True
                })
            else:
                conflicts.append({
                    "type": "event_conflict",
                    "severity": "medium",
                    "message": f"Your co-parent has {'an event' if event_count == 1 else f'{event_count} events'} scheduled during this time.",
                    "suggestion": "You may want to coordinate timing to avoid scheduling conflicts.",
                    "can_proceed": True
                })

        return conflicts

    @staticmethod
    async def check_event_conflicts(
        db: AsyncSession,
        case_id: str,
        start_time: datetime,
        end_time: datetime,
        exclude_user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Check for scheduling conflicts before creating an event.

        Checks both:
        1. Time blocks (when other parent is unavailable)
        2. Existing events (overlapping scheduled events)

        ARIA Integration: Returns neutral warnings without revealing details.

        Args:
            db: Database session
            case_id: Case UUID or Family File ID
            start_time: Proposed event start
            end_time: Proposed event end
            exclude_user_id: Don't check this user's blocks/events

        Returns:
            Dict with:
            - has_conflicts: bool
            - conflicts: List[dict] (ARIA warnings)
            - can_proceed: bool
        """
        all_conflicts = []

        # Check time block conflicts
        has_time_conflicts, time_conflicts = await TimeBlockService.check_conflicts(
            db, case_id, start_time, end_time, exclude_user_id
        )
        all_conflicts.extend(time_conflicts)

        # Check overlapping event conflicts
        event_conflicts = await EventService._check_overlapping_events(
            db, case_id, start_time, end_time, exclude_user_id
        )
        all_conflicts.extend(event_conflicts)

        return {
            "has_conflicts": len(all_conflicts) > 0,
            "conflicts": all_conflicts,
            "can_proceed": True  # MVP: conflicts are warnings, not blockers
        }
