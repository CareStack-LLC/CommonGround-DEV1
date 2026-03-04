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
from app.core.websocket import manager


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
        collection_id: Optional[str],
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
        category_data: Optional[Dict[str, Any]] = None,
        # Professional calendar fields
        professional_id: Optional[str] = None,
        professional_event_type: Optional[str] = None,
        parent_visibility: Optional[str] = None,
        virtual_meeting_url: Optional[str] = None,
        reminder_minutes: Optional[int] = None,
        color: Optional[str] = None,
        notes: Optional[str] = None,
        timezone: Optional[str] = None,
        family_file_id: Optional[str] = None  # Direct family file for professional events
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
        # For professional events, collection is optional
        collection = None
        event_case_id = None
        event_family_file_id = family_file_id

        if collection_id:
            # Verify collection ownership (parent events)
            collection_result = await db.execute(
                select(MyTimeCollection).where(MyTimeCollection.id == collection_id)
            )
            collection = collection_result.scalar_one_or_none()

            if not collection:
                raise ValueError("Collection not found")

            if not professional_id and collection.owner_id != user_id:
                raise ValueError("You can only create events in your own collections")

            event_case_id = collection.case_id
            event_family_file_id = collection.family_file_id or family_file_id
        elif professional_id and family_file_id:
            # Professional event with direct family_file_id
            event_family_file_id = family_file_id
        elif not professional_id:
            raise ValueError("Collection is required for parent events")

        # Validate times
        if end_time <= start_time:
            raise ValueError("End time must be after start time")

        # Normalize datetime objects (strip timezone for PostgreSQL)
        start_time = normalize_datetime(start_time)
        end_time = normalize_datetime(end_time)

        # Determine visibility based on professional parent_visibility
        effective_visibility = visibility
        if professional_id and parent_visibility:
            # Map professional visibility to parent visibility
            if parent_visibility == "none":
                effective_visibility = "private"
            else:  # required_parent or both_parents
                effective_visibility = "co_parent"

        # Create event
        event = ScheduleEvent(
            id=str(uuid.uuid4()),
            case_id=event_case_id,
            family_file_id=event_family_file_id,
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
            visibility=effective_visibility,
            event_type=professional_event_type or "event",
            event_category=event_category,
            category_data=category_data,
            custodial_parent_id=user_id,
            status="scheduled",
            # Professional fields
            professional_id=professional_id,
            professional_event_type=professional_event_type,
            parent_visibility=parent_visibility,
            virtual_meeting_url=virtual_meeting_url,
            reminder_minutes=reminder_minutes,
            color=color,
            notes=notes,
            timezone=timezone,
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

        # WS5: Broadcast event creation for real-time updates
        if event.visibility == "co_parent" and (event.family_file_id or event.case_id):
            broadcast_id = event.family_file_id or event.case_id
            await manager.broadcast_to_case({
                "type": "event_created",
                "family_file_id": event.family_file_id,
                "case_id": event.case_id,
                "event_id": event.id,
                "event": {
                    "id": event.id,
                    "title": event.title,
                    "start_time": event.start_time.isoformat(),
                    "end_time": event.end_time.isoformat(),
                    "event_category": event.event_category,
                    "visibility": event.visibility,
                    "location": event.location if event.location_shared else None,
                },
                "timestamp": datetime.utcnow().isoformat()
            }, broadcast_id)

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

        # WS5: Broadcast event update for real-time updates
        if event.visibility == "co_parent" and (event.family_file_id or event.case_id):
            broadcast_id = event.family_file_id or event.case_id
            await manager.broadcast_to_case({
                "type": "event_updated",
                "family_file_id": event.family_file_id,
                "case_id": event.case_id,
                "event_id": event.id,
                "event": {
                    "id": event.id,
                    "title": event.title,
                    "start_time": event.start_time.isoformat(),
                    "end_time": event.end_time.isoformat(),
                    "event_category": event.event_category,
                    "visibility": event.visibility,
                    "location": event.location if event.location_shared else None,
                },
                "timestamp": datetime.utcnow().isoformat()
            }, broadcast_id)

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

        # Store broadcast data before cancelling
        should_broadcast = event.visibility == "co_parent" and (event.family_file_id or event.case_id)
        if should_broadcast:
            broadcast_id = event.family_file_id or event.case_id

        event.status = "cancelled"
        event.cancelled_at = datetime.utcnow()
        event.cancelled_by = user_id
        event.updated_at = datetime.utcnow()
        await db.flush()

        # WS5: Broadcast event deletion for real-time updates
        if should_broadcast:
            await manager.broadcast_to_case({
                "type": "event_deleted",
                "family_file_id": event.family_file_id,
                "case_id": event.case_id,
                "event_id": event.id,
                "timestamp": datetime.utcnow().isoformat()
            }, broadcast_id)

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

    # ========== SWAP REQUEST METHODS ==========

    @staticmethod
    async def create_swap_request(
        db: AsyncSession,
        user_id: str,
        family_file_id: str,
        target_date: datetime,
        child_ids: List[str],
        reason: str
    ) -> ScheduleEvent:
        """
        Create a swap request event.
        
        This creates a 'modification' event with status 'pending'.
        """
        # Create event
        start_time = datetime.combine(target_date, datetime.min.time()) # All day placeholder
        end_time = datetime.combine(target_date, datetime.max.time())
        
        event = ScheduleEvent(
            id=str(uuid.uuid4()),
            family_file_id=family_file_id,
            created_by=user_id,
            title=f"Swap Request: {reason[:30]}...",
            description=reason,
            start_time=start_time,
            end_time=end_time,
            all_day=True,
            child_ids=child_ids,
            visibility="co_parent",
            event_type="swap_request",
            event_category="general", # or 'exchange'

            status="pending",
            custodial_parent_id=user_id, # Required field, defaults to requester for swap requests
            
            # Modification flags
            is_modification=True,
            modification_requested_by=user_id,
            modification_approved=False
        )

        db.add(event)
        await db.flush()
        await db.refresh(event)

        # Notify Co-Parent (WS) - reuse generic event created
        await manager.broadcast_to_case({
            "type": "swap_request_created",
            "family_file_id": family_file_id,
            "event_id": event.id,
            "title": event.title,
            "timestamp": datetime.utcnow().isoformat()
        }, family_file_id)

        return event

    @staticmethod
    async def respond_to_swap_request(
        db: AsyncSession,
        event_id: str,
        user_id: str,
        approved: bool,
        response_note: Optional[str] = None
    ) -> ScheduleEvent:
        """
        Approve or Deny a swap request.
        """
        result = await db.execute(
            select(ScheduleEvent).where(ScheduleEvent.id == event_id)
        )
        event = result.scalar_one_or_none()
        
        if not event:
            raise ValueError("Swap request not found")
            
        if not event.is_modification:
             raise ValueError("This event is not a swap request")
             
        # Ideally check if user is the other parent
        if event.modification_requested_by == user_id:
            raise ValueError("You cannot approve your own request")

        event.modification_approved = approved
        event.modification_approved_by = user_id
        
        if approved:
            event.status = "scheduled"
            event.title = f"Swap Approved: {event.description[:30]}"
            # Here we might actually create the real schedule change or modify existing events
            # For this MVP, we just mark this request as Approved/Scheduled
        else:
            event.status = "cancelled"
            event.title = f"Swap Denied: {event.description[:30]}"
            
        if response_note:
            # Append note to description
            event.description = f"{event.description}\n\nResponse Note: {response_note}"

        event.updated_at = datetime.utcnow()
        await db.flush()
        
        # Notify requester
        await manager.broadcast_to_case({
            "type": "swap_request_updated",
            "family_file_id": event.family_file_id,
            "event_id": event.id,
            "approved": approved,
            "timestamp": datetime.utcnow().isoformat()
        }, event.family_file_id)
        
        return event

    @staticmethod
    async def check_in_with_gps(
        db: AsyncSession,
        event_id: str,
        user_id: str,
        latitude: float,
        longitude: float,
        device_accuracy: float = 0
    ) -> "ExchangeCheckIn":
        """
        WS6: GPS check-in for medical/school/sports events with geofence verification.

        Args:
            db: Database session
            event_id: Event UUID
            user_id: User checking in
            latitude: GPS latitude
            longitude: GPS longitude
            device_accuracy: Device accuracy in meters

        Returns:
            CheckIn record

        Raises:
            HTTPException: If event not found or access denied
        """
        from fastapi import HTTPException, status
        from app.models.schedule import ExchangeCheckIn
        from app.models.user import User
        from app.services.geolocation import GeolocationService
        from app.services.realtime import realtime_service

        # Get event
        result = await db.execute(
            select(ScheduleEvent).where(ScheduleEvent.id == event_id)
        )
        event = result.scalar_one_or_none()

        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )

        # Verify access
        case_or_ff_id = event.family_file_id or event.case_id
        if not case_or_ff_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Event has no associated case or family file"
            )

        has_access, _, _ = await _check_event_access(db, case_or_ff_id, user_id)
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this event"
            )

        # Parse geofence data from category_data
        geofence_lat = None
        geofence_lng = None
        geofence_radius = 100  # Default 100 meters

        if event.category_data:
            geofence_lat = event.category_data.get("geofence_lat")
            geofence_lng = event.category_data.get("geofence_lng")
            geofence_radius = event.category_data.get("geofence_radius", 100)

        # Calculate distance and geofence status
        in_geofence = False
        distance_meters = 0.0

        if geofence_lat and geofence_lng:
            in_geofence, distance_meters = GeolocationService.is_within_geofence(
                latitude, longitude,
                geofence_lat, geofence_lng,
                geofence_radius,
                device_accuracy
            )

        # Create check-in record
        check_in = ExchangeCheckIn(
            event_id=event_id,
            user_id=user_id,
            checked_in_at=datetime.utcnow(),
            check_in_method="gps",
            latitude=latitude,
            longitude=longitude,
            device_accuracy=device_accuracy,
            in_geofence=in_geofence,
            distance_from_location=distance_meters
        )

        db.add(check_in)
        await db.commit()
        await db.refresh(check_in)

        # WS6: Broadcast geofence entry notification if within geofence
        if in_geofence and event.family_file_id:
            # Get user name
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if user:
                parent_name = f"{user.first_name} {user.last_name}".strip() or "Parent"

                await realtime_service.broadcast_geofence_entry(
                    family_file_id=event.family_file_id,
                    exchange_id=event_id,  # Use event_id as exchange_id
                    parent_id=user_id,
                    parent_name=parent_name,
                    location={
                        "latitude": latitude,
                        "longitude": longitude,
                        "accuracy": device_accuracy,
                        "distance_meters": distance_meters
                    }
                )

        return check_in
