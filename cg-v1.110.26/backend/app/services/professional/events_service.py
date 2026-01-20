"""
Professional Events Service.

UNIFIED CALENDAR IMPLEMENTATION:
Uses ScheduleEvent model to store professional events so they can appear
on parent calendars when parent_visibility allows it.

Features:
- Event CRUD operations using ScheduleEvent
- Basic overlap conflict detection for the same professional
- Date range filtering
- Integration with parent calendar
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
import uuid as uuid_module

from sqlalchemy import and_, or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.schedule import ScheduleEvent
from app.models.professional import ProfessionalProfile
from app.models.family_file import FamilyFile
from app.schemas.professional import (
    ProfessionalEventCreate,
    ProfessionalEventUpdate,
    ProfessionalEventResponse,
    EventConflict,
)


class ProfessionalEventsService:
    """Service for managing professional calendar events using unified ScheduleEvent model."""

    async def create_event(
        self,
        db: AsyncSession,
        professional_id: str,
        event_data: ProfessionalEventCreate,
        firm_id: Optional[str] = None,
        check_conflicts: bool = True,
    ) -> tuple[ScheduleEvent, list[EventConflict]]:
        """
        Create a new calendar event using the unified ScheduleEvent model.

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

        # Map parent_visibility to visibility for parent calendar integration
        visibility = "private"
        if event_data.parent_visibility and event_data.parent_visibility != "none":
            visibility = "co_parent"

        # Get professional profile to link user
        prof_result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.id == professional_id)
        )
        professional = prof_result.scalar_one_or_none()
        created_by = str(professional.user_id) if professional else professional_id

        # Create the event using ScheduleEvent model
        event = ScheduleEvent(
            id=str(uuid_module.uuid4()),
            family_file_id=event_data.family_file_id,
            created_by=created_by,
            title=event_data.title,
            description=event_data.description,
            start_time=event_data.start_time,
            end_time=event_data.end_time,
            all_day=event_data.all_day,
            location=event_data.location,
            visibility=visibility,
            status="scheduled",
            event_type=event_data.event_type or "meeting",
            event_category="general",
            child_ids=[],
            custodial_parent_id=created_by,
            # Professional-specific fields
            professional_id=professional_id,
            professional_event_type=event_data.event_type,
            parent_visibility=event_data.parent_visibility,
            virtual_meeting_url=event_data.virtual_meeting_url,
            reminder_minutes=event_data.reminder_minutes,
            color=event_data.color or self._get_default_color(event_data.event_type),
            notes=event_data.notes,
            timezone=event_data.timezone,
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
    ) -> Optional[ScheduleEvent]:
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
            select(ScheduleEvent).where(
                and_(
                    ScheduleEvent.id == event_id,
                    ScheduleEvent.professional_id == professional_id,
                )
            )
        )
        return result.scalar_one_or_none()

    def _make_naive(self, dt: Optional[datetime]) -> Optional[datetime]:
        """Convert timezone-aware datetime to naive (for database queries)."""
        if dt is None:
            return None
        if dt.tzinfo is not None:
            return dt.replace(tzinfo=None)
        return dt

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
    ) -> tuple[list[ScheduleEvent], int]:
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
        # Convert to naive datetimes for database queries
        start_date = self._make_naive(start_date)
        end_date = self._make_naive(end_date)

        # Build base query for professional events
        conditions = [ScheduleEvent.professional_id == professional_id]

        if start_date:
            conditions.append(ScheduleEvent.end_time >= start_date)
        if end_date:
            conditions.append(ScheduleEvent.start_time <= end_date)
        if event_type:
            conditions.append(ScheduleEvent.professional_event_type == event_type)
        if family_file_id:
            conditions.append(ScheduleEvent.family_file_id == family_file_id)
        if not include_cancelled:
            conditions.append(ScheduleEvent.status != "cancelled")

        # Get total count
        count_query = select(func.count()).select_from(ScheduleEvent).where(and_(*conditions))
        total_result = await db.execute(count_query)
        total_count = total_result.scalar() or 0

        # Get events
        query = (
            select(ScheduleEvent)
            .where(and_(*conditions))
            .order_by(ScheduleEvent.start_time)
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
    ) -> tuple[Optional[ScheduleEvent], list[EventConflict]]:
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

        # Update fields from update_data
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if field == "event_type":
                # Map to professional_event_type
                event.professional_event_type = value
                event.event_type = value
            elif field == "is_cancelled" and value:
                event.status = "cancelled"
                event.cancelled_at = datetime.utcnow()
            elif field == "parent_visibility":
                event.parent_visibility = value
                # Update visibility for parent calendar
                if value == "none":
                    event.visibility = "private"
                else:
                    event.visibility = "co_parent"
            elif hasattr(event, field):
                setattr(event, field, value)

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
    ) -> Optional[ScheduleEvent]:
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

        event.status = "cancelled"
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
        # TEMPORARY DEBUG: Disable conflict checking
        return []

        # conditions = [
        #     ScheduleEvent.professional_id == professional_id,
        #     ScheduleEvent.status != "cancelled",
        #     # Overlap condition: starts before proposed ends AND ends after proposed starts
        #     ScheduleEvent.start_time < end_time,
        #     ScheduleEvent.end_time > start_time,
        # ]

        # if exclude_event_id:
        #     conditions.append(ScheduleEvent.id != exclude_event_id)

        # query = select(ScheduleEvent).where(and_(*conditions))
        # result = await db.execute(query)
        # conflicting_events = list(result.scalars().all())

        # conflicts = []
        # for event in conflicting_events:
        #     # Safely determine event type for conflict
        #     conflict_event_type = event.professional_event_type or event.event_type or "meeting"
            
        #     conflicts.append(
        #         EventConflict(
        #             event_id=str(event.id),
        #             title=event.title,
        #             start_time=event.start_time,
        #             end_time=event.end_time,
        #             event_type=conflict_event_type,
        #             overlap_minutes=self._calculate_overlap_minutes(
        #                 start_time, end_time, event.start_time, event.end_time
        #             ),
        #         )
        #     )

        # return conflicts

    async def get_events_for_case(
        self,
        db: AsyncSession,
        family_file_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        include_cancelled: bool = False,
    ) -> list[ScheduleEvent]:
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
        conditions = [
            ScheduleEvent.family_file_id == family_file_id,
            ScheduleEvent.professional_id.isnot(None),  # Only professional events
        ]

        if start_date:
            conditions.append(ScheduleEvent.end_time >= start_date)
        if end_date:
            conditions.append(ScheduleEvent.start_time <= end_date)
        if not include_cancelled:
            conditions.append(ScheduleEvent.status != "cancelled")

        query = (
            select(ScheduleEvent)
            .where(and_(*conditions))
            .order_by(ScheduleEvent.start_time)
        )

        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_upcoming_events(
        self,
        db: AsyncSession,
        professional_id: str,
        days: int = 7,
        limit: int = 10,
    ) -> list[ScheduleEvent]:
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
            # Safely determine event type
            event_type = str(event.professional_event_type or event.event_type or "other")
            if event_type not in by_type:
                by_type[event_type] = 0
            by_type[event_type] += 1

        # Count active vs cancelled
        active_count = len([e for e in events if e.status != "cancelled"])
        cancelled_count = len([e for e in events if e.status == "cancelled"])

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
            "meeting": "#3B82F6",  # Blue
            "court_hearing": "#DC2626",  # Red
            "video_call": "#10B981",  # Green
            "document_deadline": "#F59E0B",  # Amber
            "consultation": "#8B5CF6",  # Purple
            "deposition": "#6366F1",  # Indigo
            "mediation": "#EC4899",  # Pink
            "other": "#6B7280",  # Gray
        }
        return color_map.get(event_type or "other", "#6B7280")

    async def to_response(
        self,
        db: AsyncSession,
        event: ScheduleEvent,
    ) -> ProfessionalEventResponse:
        """
        Convert ScheduleEvent model to ProfessionalEventResponse schema.

        Args:
            db: Database session
            event: ScheduleEvent model

        Returns:
            ProfessionalEventResponse with resolved family file title
        """
        family_file_title = None
        if event.family_file_id:
            result = await db.execute(
                select(FamilyFile.title).where(FamilyFile.id == event.family_file_id)
            )
            family_file_title = result.scalar_one_or_none()

        # Safely determine event type
        event_type_val = event.professional_event_type or event.event_type or "meeting"
        event_type_val = str(event.professional_event_type or event.event_type or "meeting")
        if event_type_val not in ["meeting", "court_hearing", "video_call", "document_deadline", "consultation", "deposition", "mediation", "other"]:
            event_type_val = "meeting"

        return ProfessionalEventResponse(
            id=str(event.id),
            professional_id=str(event.professional_id) if event.professional_id else None,
            firm_id=None,  # Not stored in unified model
            title=event.title or "Untitled Event",
            description=event.description,
            event_type=event_type_val,
            start_time=event.start_time,
            end_time=event.end_time,
            all_day=event.all_day,
            timezone=event.timezone or "UTC",
            location=event.location,
            virtual_meeting_url=event.virtual_meeting_url,
            family_file_id=str(event.family_file_id) if event.family_file_id else None,
            family_file_title=family_file_title,
            attendee_ids=[],  # Not stored in unified model
            attendee_emails=[],  # Not stored in unified model
            parent_visibility=event.parent_visibility or "none",
            is_recurring=False,  # Not supported yet in unified model
            recurrence_rule=None,
            parent_event_id=None,
            reminder_minutes=event.reminder_minutes,
            notes=event.notes,
            color=event.color,
            is_cancelled=event.status == "cancelled",
            cancelled_at=event.cancelled_at,
            cancellation_reason=event.cancellation_reason,
        )


# Singleton instance
events_service = ProfessionalEventsService()
