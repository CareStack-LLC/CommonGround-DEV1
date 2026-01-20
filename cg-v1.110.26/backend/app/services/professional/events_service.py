"""
Professional Events Service.

Handles calendar event management for professionals including:
- Event CRUD operations
- Basic overlap conflict detection for the same professional
- Date range filtering
- Recurring event support
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import and_, or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.professional import (
    ProfessionalEvent,
    ProfessionalProfile,
    EventType,
    EventVisibility,
)
from app.models.family_file import FamilyFile
from app.schemas.professional import (
    ProfessionalEventCreate,
    ProfessionalEventUpdate,
    ProfessionalEventResponse,
    EventConflict,
    ConflictCheckResponse,
)


class ProfessionalEventsService:
    """Service for managing professional calendar events."""

    async def create_event(
        self,
        db: AsyncSession,
        professional_id: str,
        event_data: ProfessionalEventCreate,
        firm_id: Optional[str] = None,
        check_conflicts: bool = True,
    ) -> tuple[ProfessionalEvent, list[EventConflict]]:
        """
        Create a new calendar event.

        Args:
            db: Database session
            professional_id: ID of the professional creating the event
            event_data: Event creation data
            firm_id: Optional firm context
            check_conflicts: Whether to check for scheduling conflicts

        Returns:
            Tuple of (created event, list of conflicts if any)
        """
        # Validate times
        if event_data.end_time <= event_data.start_time:
            raise ValueError("End time must be after start time")

        # Check for conflicts if requested
        conflicts = []
        if check_conflicts:
            conflicts = await self.check_conflicts(
                db=db,
                professional_id=professional_id,
                start_time=event_data.start_time,
                end_time=event_data.end_time,
            )

        # Create the event
        event = ProfessionalEvent(
            professional_id=professional_id,
            firm_id=firm_id,
            title=event_data.title,
            description=event_data.description,
            event_type=event_data.event_type,
            start_time=event_data.start_time,
            end_time=event_data.end_time,
            all_day=event_data.all_day,
            timezone=event_data.timezone,
            location=event_data.location,
            virtual_meeting_url=event_data.virtual_meeting_url,
            family_file_id=event_data.family_file_id,
            attendee_ids=event_data.attendee_ids,
            attendee_emails=event_data.attendee_emails,
            parent_visibility=event_data.parent_visibility,
            is_recurring=event_data.is_recurring,
            recurrence_rule=event_data.recurrence_rule,
            reminder_minutes=event_data.reminder_minutes,
            notes=event_data.notes,
            color=event_data.color or self._get_default_color(event_data.event_type),
        )

        db.add(event)
        await db.commit()
        await db.refresh(event)

        return event, conflicts

    async def get_event(
        self,
        db: AsyncSession,
        event_id: str,
        professional_id: str,
    ) -> Optional[ProfessionalEvent]:
        """
        Get a single event by ID.

        Args:
            db: Database session
            event_id: Event ID
            professional_id: Professional ID for access check

        Returns:
            Event if found and accessible, None otherwise
        """
        result = await db.execute(
            select(ProfessionalEvent).where(
                and_(
                    ProfessionalEvent.id == event_id,
                    ProfessionalEvent.professional_id == professional_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_events(
        self,
        db: AsyncSession,
        professional_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_type: Optional[str] = None,
        family_file_id: Optional[str] = None,
        include_cancelled: bool = False,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[ProfessionalEvent], int]:
        """
        List events for a professional with optional filters.

        Args:
            db: Database session
            professional_id: Professional ID
            start_date: Filter events starting on or after this date
            end_date: Filter events ending on or before this date
            event_type: Filter by event type
            family_file_id: Filter by linked case
            include_cancelled: Include cancelled events
            limit: Max events to return
            offset: Pagination offset

        Returns:
            Tuple of (list of events, total count)
        """
        # Build base query
        conditions = [ProfessionalEvent.professional_id == professional_id]

        if start_date:
            conditions.append(ProfessionalEvent.end_time >= start_date)
        if end_date:
            conditions.append(ProfessionalEvent.start_time <= end_date)
        if event_type:
            conditions.append(ProfessionalEvent.event_type == event_type)
        if family_file_id:
            conditions.append(ProfessionalEvent.family_file_id == family_file_id)
        if not include_cancelled:
            conditions.append(ProfessionalEvent.is_cancelled == False)

        # Get total count
        count_query = select(func.count()).select_from(ProfessionalEvent).where(and_(*conditions))
        total_result = await db.execute(count_query)
        total_count = total_result.scalar() or 0

        # Get events
        query = (
            select(ProfessionalEvent)
            .where(and_(*conditions))
            .order_by(ProfessionalEvent.start_time)
            .offset(offset)
            .limit(limit)
        )

        result = await db.execute(query)
        events = list(result.scalars().all())

        return events, total_count

    async def update_event(
        self,
        db: AsyncSession,
        event_id: str,
        professional_id: str,
        update_data: ProfessionalEventUpdate,
        check_conflicts: bool = True,
    ) -> tuple[Optional[ProfessionalEvent], list[EventConflict]]:
        """
        Update an existing event.

        Args:
            db: Database session
            event_id: Event ID to update
            professional_id: Professional ID for access check
            update_data: Fields to update
            check_conflicts: Whether to check for scheduling conflicts

        Returns:
            Tuple of (updated event or None if not found, list of conflicts)
        """
        # Get existing event
        event = await self.get_event(db, event_id, professional_id)
        if not event:
            return None, []

        # Check for conflicts if time is being changed
        conflicts = []
        new_start = update_data.start_time or event.start_time
        new_end = update_data.end_time or event.end_time

        if check_conflicts and (update_data.start_time or update_data.end_time):
            if new_end <= new_start:
                raise ValueError("End time must be after start time")

            conflicts = await self.check_conflicts(
                db=db,
                professional_id=professional_id,
                start_time=new_start,
                end_time=new_end,
                exclude_event_id=event_id,
            )

        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if hasattr(event, field):
                setattr(event, field, value)

        # Handle cancellation
        if update_data.is_cancelled and not event.cancelled_at:
            event.cancelled_at = datetime.utcnow()

        await db.commit()
        await db.refresh(event)

        return event, conflicts

    async def delete_event(
        self,
        db: AsyncSession,
        event_id: str,
        professional_id: str,
    ) -> bool:
        """
        Delete an event.

        Args:
            db: Database session
            event_id: Event ID to delete
            professional_id: Professional ID for access check

        Returns:
            True if deleted, False if not found
        """
        event = await self.get_event(db, event_id, professional_id)
        if not event:
            return False

        await db.delete(event)
        await db.commit()
        return True

    async def cancel_event(
        self,
        db: AsyncSession,
        event_id: str,
        professional_id: str,
        reason: Optional[str] = None,
    ) -> Optional[ProfessionalEvent]:
        """
        Cancel an event (soft delete).

        Args:
            db: Database session
            event_id: Event ID to cancel
            professional_id: Professional ID for access check
            reason: Optional cancellation reason

        Returns:
            Cancelled event or None if not found
        """
        event = await self.get_event(db, event_id, professional_id)
        if not event:
            return None

        event.is_cancelled = True
        event.cancelled_at = datetime.utcnow()
        event.cancellation_reason = reason

        await db.commit()
        await db.refresh(event)
        return event

    async def check_conflicts(
        self,
        db: AsyncSession,
        professional_id: str,
        start_time: datetime,
        end_time: datetime,
        exclude_event_id: Optional[str] = None,
    ) -> list[EventConflict]:
        """
        Check for scheduling conflicts with existing events.

        Uses overlap detection: Event A overlaps with Event B if
        A starts before B ends AND A ends after B starts.

        Args:
            db: Database session
            professional_id: Professional ID
            start_time: Proposed event start
            end_time: Proposed event end
            exclude_event_id: Event ID to exclude (for updates)

        Returns:
            List of conflicting events
        """
        conditions = [
            ProfessionalEvent.professional_id == professional_id,
            ProfessionalEvent.is_cancelled == False,
            # Overlap condition: starts before proposed ends AND ends after proposed starts
            ProfessionalEvent.start_time < end_time,
            ProfessionalEvent.end_time > start_time,
        ]

        if exclude_event_id:
            conditions.append(ProfessionalEvent.id != exclude_event_id)

        query = select(ProfessionalEvent).where(and_(*conditions))
        result = await db.execute(query)
        conflicting_events = list(result.scalars().all())

        conflicts = []
        for event in conflicting_events:
            conflicts.append(
                EventConflict(
                    event_id=str(event.id),
                    title=event.title,
                    start_time=event.start_time,
                    end_time=event.end_time,
                    event_type=event.event_type,
                    overlap_minutes=self._calculate_overlap_minutes(
                        start_time, end_time, event.start_time, event.end_time
                    ),
                )
            )

        return conflicts

    async def get_events_for_case(
        self,
        db: AsyncSession,
        family_file_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        include_cancelled: bool = False,
    ) -> list[ProfessionalEvent]:
        """
        Get all professional events linked to a specific case.

        Args:
            db: Database session
            family_file_id: Family file ID
            start_date: Filter start date
            end_date: Filter end date
            include_cancelled: Include cancelled events

        Returns:
            List of events for the case
        """
        conditions = [ProfessionalEvent.family_file_id == family_file_id]

        if start_date:
            conditions.append(ProfessionalEvent.end_time >= start_date)
        if end_date:
            conditions.append(ProfessionalEvent.start_time <= end_date)
        if not include_cancelled:
            conditions.append(ProfessionalEvent.is_cancelled == False)

        query = (
            select(ProfessionalEvent)
            .where(and_(*conditions))
            .order_by(ProfessionalEvent.start_time)
        )

        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_upcoming_events(
        self,
        db: AsyncSession,
        professional_id: str,
        days: int = 7,
        limit: int = 10,
    ) -> list[ProfessionalEvent]:
        """
        Get upcoming events for a professional.

        Args:
            db: Database session
            professional_id: Professional ID
            days: Number of days to look ahead
            limit: Maximum number of events

        Returns:
            List of upcoming events
        """
        now = datetime.utcnow()
        end_date = now + timedelta(days=days)

        events, _ = await self.list_events(
            db=db,
            professional_id=professional_id,
            start_date=now,
            end_date=end_date,
            include_cancelled=False,
            limit=limit,
        )

        return events

    async def get_calendar_summary(
        self,
        db: AsyncSession,
        professional_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> dict:
        """
        Get calendar summary statistics.

        Args:
            db: Database session
            professional_id: Professional ID
            start_date: Summary period start
            end_date: Summary period end

        Returns:
            Dictionary with event counts by type and status
        """
        events, total = await self.list_events(
            db=db,
            professional_id=professional_id,
            start_date=start_date,
            end_date=end_date,
            include_cancelled=True,
            limit=1000,
        )

        # Count by type
        by_type = {}
        for event in events:
            event_type = event.event_type
            if event_type not in by_type:
                by_type[event_type] = 0
            by_type[event_type] += 1

        # Count active vs cancelled
        active_count = len([e for e in events if not e.is_cancelled])
        cancelled_count = len([e for e in events if e.is_cancelled])

        return {
            "total_events": total,
            "active_events": active_count,
            "cancelled_events": cancelled_count,
            "events_by_type": by_type,
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat(),
        }

    def _calculate_overlap_minutes(
        self,
        start1: datetime,
        end1: datetime,
        start2: datetime,
        end2: datetime,
    ) -> int:
        """Calculate the number of overlapping minutes between two time ranges."""
        overlap_start = max(start1, start2)
        overlap_end = min(end1, end2)

        if overlap_end > overlap_start:
            return int((overlap_end - overlap_start).total_seconds() / 60)
        return 0

    def _get_default_color(self, event_type: str) -> str:
        """Get default color for an event type."""
        color_map = {
            EventType.MEETING.value: "#3B82F6",  # Blue
            EventType.COURT_HEARING.value: "#DC2626",  # Red
            EventType.VIDEO_CALL.value: "#10B981",  # Green
            EventType.DOCUMENT_DEADLINE.value: "#F59E0B",  # Amber
            EventType.CONSULTATION.value: "#8B5CF6",  # Purple
            EventType.DEPOSITION.value: "#6366F1",  # Indigo
            EventType.MEDIATION.value: "#EC4899",  # Pink
            EventType.OTHER.value: "#6B7280",  # Gray
        }
        return color_map.get(event_type, "#6B7280")

    async def to_response(
        self,
        db: AsyncSession,
        event: ProfessionalEvent,
    ) -> ProfessionalEventResponse:
        """
        Convert event model to response schema with resolved fields.

        Args:
            db: Database session
            event: Event model

        Returns:
            Event response with resolved family file title
        """
        family_file_title = None
        if event.family_file_id:
            result = await db.execute(
                select(FamilyFile.title).where(FamilyFile.id == event.family_file_id)
            )
            family_file_title = result.scalar_one_or_none()

        return ProfessionalEventResponse(
            id=str(event.id),
            professional_id=str(event.professional_id),
            firm_id=str(event.firm_id) if event.firm_id else None,
            title=event.title,
            description=event.description,
            event_type=event.event_type,
            start_time=event.start_time,
            end_time=event.end_time,
            all_day=event.all_day,
            timezone=event.timezone,
            location=event.location,
            virtual_meeting_url=event.virtual_meeting_url,
            family_file_id=str(event.family_file_id) if event.family_file_id else None,
            family_file_title=family_file_title,
            attendee_ids=event.attendee_ids,
            attendee_emails=event.attendee_emails,
            parent_visibility=event.parent_visibility,
            is_recurring=event.is_recurring,
            recurrence_rule=event.recurrence_rule,
            parent_event_id=str(event.parent_event_id) if event.parent_event_id else None,
            reminder_minutes=event.reminder_minutes,
            notes=event.notes,
            color=event.color,
            is_cancelled=event.is_cancelled,
            cancelled_at=event.cancelled_at,
            cancellation_reason=event.cancellation_reason,
        )


# Singleton instance
events_service = ProfessionalEventsService()
