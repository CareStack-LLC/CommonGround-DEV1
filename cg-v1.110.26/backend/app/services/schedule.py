"""
Schedule service for parenting time management and compliance tracking.

Supports both Cases and Family Files for access control.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.schedule import ScheduleEvent, ExchangeCheckIn
from app.models.case import Case, CaseParticipant
from app.models.child import Child
from app.models.family_file import FamilyFile
from app.models.my_time_collection import MyTimeCollection
from app.models.user import User
from app.schemas.schedule import (
    ScheduleEventCreate,
    ScheduleEventUpdate,
    ExchangeCheckInCreate,
)
from app.services.access_control import check_case_or_family_file_access


class ScheduleService:
    """Service for handling schedule operations."""

    def __init__(self, db: AsyncSession):
        """
        Initialize schedule service.

        Args:
            db: Database session
        """
        self.db = db

    async def create_event(
        self,
        event_data: ScheduleEventCreate,
        user: User
    ) -> ScheduleEvent:
        """
        Create a schedule event.

        Args:
            event_data: Event data with collection_id
            user: User creating the event

        Returns:
            Created event

        Raises:
            HTTPException: If creation fails
        """
        # Get the collection first
        collection_result = await self.db.execute(
            select(MyTimeCollection).where(MyTimeCollection.id == event_data.collection_id)
        )
        collection = collection_result.scalar_one_or_none()

        if not collection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found"
            )

        # Determine case_id - use family_file_id if case_id is not set
        case_or_ff_id = collection.case_id or collection.family_file_id
        if not case_or_ff_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Collection must belong to a case or family file"
            )

        # Verify access to case or family file
        access = await check_case_or_family_file_access(
            self.db, case_or_ff_id, user.id
        )
        if not access.has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this case"
            )

        # Verify children belong to case/family file
        await self._verify_children(case_or_ff_id, event_data.child_ids, access.is_family_file)

        # Create event - set case_id or family_file_id based on access type
        # Use collection owner as custodial parent, event_category determines exchange status
        event = ScheduleEvent(
            case_id=access.effective_case_id if not access.is_family_file else None,
            family_file_id=case_or_ff_id if access.is_family_file else None,
            collection_id=event_data.collection_id,
            created_by=user.id,
            event_type="regular",  # Default event type
            event_category=event_data.event_category,
            category_data=event_data.category_data,
            start_time=event_data.start_time,
            end_time=event_data.end_time,
            all_day=event_data.all_day,
            custodial_parent_id=collection.owner_id,  # Collection owner is the custodial parent
            child_ids=event_data.child_ids,
            title=event_data.title,
            description=event_data.description,
            location=event_data.location,
            visibility=event_data.visibility,
            location_shared=event_data.location_shared,
            agreement_id=event_data.agreement_id,
            is_exchange=event_data.event_category == "exchange",  # Exchange category implies exchange event
        )

        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)

        return event

    async def get_events(
        self,
        case_id: str,
        user: User,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_type: Optional[str] = None,
        custodial_parent_id: Optional[str] = None
    ) -> List[ScheduleEvent]:
        """
        Get schedule events for a case or family file.

        Args:
            case_id: ID of the case or family file
            user: User requesting events
            start_date: Optional start date filter
            end_date: Optional end date filter
            event_type: Optional event type filter
            custodial_parent_id: Optional parent filter

        Returns:
            List of events
        """
        # Verify access
        access = await check_case_or_family_file_access(self.db, case_id, user.id)
        if not access.has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this case"
            )

        # Build query - check case_id or family_file_id based on access type
        if access.is_family_file:
            query = (
                select(ScheduleEvent)
                .where(ScheduleEvent.family_file_id == case_id)
                .order_by(ScheduleEvent.start_time)
            )
        else:
            query = (
                select(ScheduleEvent)
                .where(ScheduleEvent.case_id == access.effective_case_id)
                .order_by(ScheduleEvent.start_time)
            )

        if start_date:
            query = query.where(ScheduleEvent.start_time >= start_date)

        if end_date:
            query = query.where(ScheduleEvent.end_time <= end_date)

        if event_type:
            query = query.where(ScheduleEvent.event_type == event_type)

        if custodial_parent_id:
            query = query.where(ScheduleEvent.custodial_parent_id == custodial_parent_id)

        result = await self.db.execute(query)
        events = result.scalars().all()

        return list(events)

    async def update_event(
        self,
        event_id: str,
        event_data: ScheduleEventUpdate,
        user: User
    ) -> ScheduleEvent:
        """
        Update a schedule event.

        Args:
            event_id: ID of the event
            event_data: Update data
            user: User updating the event

        Returns:
            Updated event

        Raises:
            HTTPException: If not found or no access
        """
        # Get event
        result = await self.db.execute(
            select(ScheduleEvent).where(ScheduleEvent.id == event_id)
        )
        event = result.scalar_one_or_none()

        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )

        # Verify access to case (event.case_id is always the effective case_id)
        access = await check_case_or_family_file_access(self.db, event.case_id, user.id)
        if not access.has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this case"
            )

        # Update fields
        if event_data.start_time is not None:
            event.start_time = event_data.start_time
        if event_data.end_time is not None:
            event.end_time = event_data.end_time
        if event_data.location is not None:
            event.location = event_data.location
        if event_data.exchange_location is not None:
            event.exchange_location = event_data.exchange_location
        if event_data.status is not None:
            event.status = event_data.status
        if event_data.cancellation_reason is not None:
            event.cancellation_reason = event_data.cancellation_reason
            event.cancelled_at = datetime.utcnow()
            event.cancelled_by = user.id

        await self.db.commit()
        await self.db.refresh(event)

        return event

    async def create_check_in(
        self,
        check_in_data: ExchangeCheckInCreate,
        user: User
    ) -> ExchangeCheckIn:
        """
        Create an exchange check-in.

        Args:
            check_in_data: Check-in data
            user: User checking in

        Returns:
            Created check-in

        Raises:
            HTTPException: If creation fails
        """
        # Get event
        result = await self.db.execute(
            select(ScheduleEvent).where(ScheduleEvent.id == check_in_data.event_id)
        )
        event = result.scalar_one_or_none()

        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )

        # Verify access to case
        access = await check_case_or_family_file_access(self.db, event.case_id, user.id)
        if not access.has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this case"
            )

        # Calculate timeliness
        now = datetime.utcnow()
        scheduled_time = event.start_time
        minutes_diff = int((now - scheduled_time).total_seconds() / 60)

        is_on_time = abs(minutes_diff) <= 5  # Within 5 minutes
        is_within_grace = abs(minutes_diff) <= event.grace_period_minutes

        # Create check-in
        check_in = ExchangeCheckIn(
            event_id=check_in_data.event_id,
            user_id=user.id,
            parent_role=check_in_data.parent_role,
            checked_in_at=now,
            scheduled_time=scheduled_time,
            check_in_method=check_in_data.check_in_method,
            location_lat=check_in_data.location_lat,
            location_lng=check_in_data.location_lng,
            location_accuracy=check_in_data.location_accuracy,
            minutes_early_late=minutes_diff,
            is_on_time=is_on_time,
            is_within_grace=is_within_grace,
            notes=check_in_data.notes,
            children_present=check_in_data.children_present,
        )

        self.db.add(check_in)
        await self.db.commit()
        await self.db.refresh(check_in)

        # Update event status if both parents checked in
        await self._update_event_status(event)

        return check_in

    async def get_check_ins(
        self,
        event_id: str,
        user: User
    ) -> List[ExchangeCheckIn]:
        """
        Get check-ins for an event.

        Args:
            event_id: ID of the event
            user: User requesting check-ins

        Returns:
            List of check-ins
        """
        # Get event to verify access
        result = await self.db.execute(
            select(ScheduleEvent).where(ScheduleEvent.id == event_id)
        )
        event = result.scalar_one_or_none()

        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )

        # Verify access
        access = await check_case_or_family_file_access(self.db, event.case_id, user.id)
        if not access.has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this case"
            )

        # Get check-ins
        result = await self.db.execute(
            select(ExchangeCheckIn)
            .where(ExchangeCheckIn.event_id == event_id)
            .order_by(ExchangeCheckIn.checked_in_at)
        )
        check_ins = result.scalars().all()

        return list(check_ins)

    async def get_compliance_metrics(
        self,
        case_id: str,
        user: User,
        user_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get exchange compliance metrics.

        Args:
            case_id: ID of the case
            user: User requesting metrics
            user_id: Optional specific user to analyze
            days: Number of days to analyze

        Returns:
            Compliance metrics
        """
        # Verify access
        access = await check_case_or_family_file_access(self.db, case_id, user.id)
        if not access.has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this case"
            )
        # Use effective_case_id for queries
        effective_case_id = access.effective_case_id

        since = datetime.utcnow() - timedelta(days=days)

        # Get exchange events in period
        events_query = (
            select(ScheduleEvent)
            .where(
                and_(
                    ScheduleEvent.case_id == effective_case_id,
                    ScheduleEvent.is_exchange == True,
                    ScheduleEvent.start_time >= since
                )
            )
        )

        events_result = await self.db.execute(events_query)
        events = events_result.scalars().all()

        # Get check-ins
        event_ids = [e.id for e in events]
        if event_ids:
            check_ins_result = await self.db.execute(
                select(ExchangeCheckIn).where(ExchangeCheckIn.event_id.in_(event_ids))
            )
            check_ins = check_ins_result.scalars().all()
        else:
            check_ins = []

        # Filter by user if specified
        if user_id:
            check_ins = [c for c in check_ins if c.user_id == user_id]

        # Calculate metrics
        total_exchanges = len(events)
        on_time_count = len([c for c in check_ins if c.is_on_time])
        late_count = len([c for c in check_ins if not c.is_within_grace])
        no_show_count = total_exchanges - len(set(c.event_id for c in check_ins))

        on_time_rate = on_time_count / total_exchanges if total_exchanges > 0 else 0.0

        # Calculate average lateness (only for late check-ins)
        late_check_ins = [c for c in check_ins if c.minutes_early_late > 0]
        avg_lateness = (
            sum(c.minutes_early_late for c in late_check_ins) / len(late_check_ins)
            if late_check_ins else 0.0
        )

        # Determine trend (use effective_case_id for query)
        trend = await self._calculate_compliance_trend(effective_case_id, user_id, days)

        return {
            "user_id": user_id or "all",
            "case_id": effective_case_id,
            "total_exchanges": total_exchanges,
            "on_time_count": on_time_count,
            "late_count": late_count,
            "no_show_count": no_show_count,
            "on_time_rate": on_time_rate,
            "average_lateness_minutes": avg_lateness,
            "trend": trend,
            "period_start": since,
            "period_end": datetime.utcnow(),
        }

    # Helper methods

    async def _verify_participant(self, case_id: str, user_id: str, is_family_file: bool = False):
        """Verify user is a participant in the case or family file."""
        if is_family_file:
            # Check family file participants
            result = await self.db.execute(
                select(FamilyFile).where(
                    FamilyFile.id == case_id,
                    or_(
                        FamilyFile.parent_a_id == user_id,
                        FamilyFile.parent_b_id == user_id
                    )
                )
            )
            family_file = result.scalar_one_or_none()
            if not family_file:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User is not a participant in this family file"
                )
        else:
            # Check case participants
            result = await self.db.execute(
                select(CaseParticipant)
                .where(
                    and_(
                        CaseParticipant.case_id == case_id,
                        CaseParticipant.user_id == user_id,
                        CaseParticipant.is_active == True
                    )
                )
            )
            participant = result.scalar_one_or_none()

            if not participant:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User is not a participant in this case"
                )

    async def _verify_children(self, case_id: str, child_ids: List[str], is_family_file: bool = False):
        """Verify children belong to case or family file."""
        for child_id in child_ids:
            if is_family_file:
                # Check child belongs to family file
                result = await self.db.execute(
                    select(Child).where(
                        and_(
                            Child.id == child_id,
                            Child.family_file_id == case_id,
                            Child.is_active == True
                        )
                    )
                )
            else:
                # Check child belongs to case
                result = await self.db.execute(
                    select(Child).where(
                        and_(
                            Child.id == child_id,
                            Child.case_id == case_id,
                            Child.is_active == True
                        )
                    )
                )
            child = result.scalar_one_or_none()

            if not child:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Child {child_id} not found in case"
                )

    async def _update_event_status(self, event: ScheduleEvent):
        """Update event status based on check-ins"""
        # Get all check-ins for this event
        result = await self.db.execute(
            select(ExchangeCheckIn).where(ExchangeCheckIn.event_id == event.id)
        )
        check_ins = result.scalars().all()

        if not check_ins:
            return

        # Check if all required parties checked in
        all_on_time = all(c.is_within_grace for c in check_ins)
        any_late = any(not c.is_within_grace for c in check_ins)

        if all_on_time:
            event.status = "completed"
        elif any_late:
            event.status = "completed"  # Still completed, but late

        await self.db.commit()

    async def _calculate_compliance_trend(
        self,
        case_id: str,
        user_id: Optional[str],
        days: int
    ) -> str:
        """Calculate compliance trend"""
        # Get data for two periods (current and previous)
        current_start = datetime.utcnow() - timedelta(days=days//2)
        previous_start = datetime.utcnow() - timedelta(days=days)

        # Current period check-ins
        current_events = await self.db.execute(
            select(ScheduleEvent).where(
                and_(
                    ScheduleEvent.case_id == case_id,
                    ScheduleEvent.is_exchange == True,
                    ScheduleEvent.start_time >= current_start
                )
            )
        )
        current_event_ids = [e.id for e in current_events.scalars().all()]

        if current_event_ids:
            current_check_ins = await self.db.execute(
                select(ExchangeCheckIn).where(ExchangeCheckIn.event_id.in_(current_event_ids))
            )
            current_checks = current_check_ins.scalars().all()
            if user_id:
                current_checks = [c for c in current_checks if c.user_id == user_id]
        else:
            current_checks = []

        # Previous period check-ins
        previous_events = await self.db.execute(
            select(ScheduleEvent).where(
                and_(
                    ScheduleEvent.case_id == case_id,
                    ScheduleEvent.is_exchange == True,
                    ScheduleEvent.start_time >= previous_start,
                    ScheduleEvent.start_time < current_start
                )
            )
        )
        previous_event_ids = [e.id for e in previous_events.scalars().all()]

        if previous_event_ids:
            previous_check_ins = await self.db.execute(
                select(ExchangeCheckIn).where(ExchangeCheckIn.event_id.in_(previous_event_ids))
            )
            previous_checks = previous_check_ins.scalars().all()
            if user_id:
                previous_checks = [c for c in previous_checks if c.user_id == user_id]
        else:
            previous_checks = []

        # Calculate on-time rates
        current_rate = (
            len([c for c in current_checks if c.is_on_time]) / len(current_checks)
            if current_checks else 0.0
        )
        previous_rate = (
            len([c for c in previous_checks if c.is_on_time]) / len(previous_checks)
            if previous_checks else 0.0
        )

        # Determine trend
        if current_rate > previous_rate + 0.1:
            return "improving"
        elif current_rate < previous_rate - 0.1:
            return "worsening"
        else:
            return "stable"
