"""
Service layer for CustodyExchange (Pickup/Dropoff) operations.

Handles creation, recurrence generation, and check-in logic.
"""

import uuid
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Tuple
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.case import Case, CaseParticipant
from app.models.family_file import FamilyFile
from app.services.geolocation import GeolocationService
from app.utils.timezone import strip_tz


async def _check_case_or_family_file_access(
    db: AsyncSession,
    case_id: str,
    user_id: str
) -> Tuple[bool, str, bool]:
    """
    Check if user has access via Case Participant or Family File.
    Returns (has_access, effective_id, is_family_file).

    - For Case participants: returns (True, case_id, False)
    - For Family Files with legacy_case_id: returns (True, legacy_case_id, False)
    - For Family Files without legacy_case_id: returns (True, family_file_id, True)
    """
    # First check Case Participant
    participant = await db.execute(
        select(CaseParticipant).where(
            and_(
                CaseParticipant.case_id == case_id,
                CaseParticipant.user_id == user_id,
                CaseParticipant.is_active == True
            )
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
        if family_file.legacy_case_id:
            # Has a linked case - use legacy_case_id
            return True, family_file.legacy_case_id, False
        else:
            # Pure Family File - no linked case
            return True, case_id, True

    return False, case_id, False


class CustodyExchangeService:
    """Service for managing custody exchanges."""

    @staticmethod
    async def create_exchange(
        db: AsyncSession,
        case_id: str,
        created_by: str,
        exchange_type: str,
        scheduled_time: datetime,
        title: Optional[str] = None,
        from_parent_id: Optional[str] = None,
        to_parent_id: Optional[str] = None,
        child_ids: Optional[List[str]] = None,
        pickup_child_ids: Optional[List[str]] = None,
        dropoff_child_ids: Optional[List[str]] = None,
        location: Optional[str] = None,
        location_notes: Optional[str] = None,
        duration_minutes: int = 30,
        is_recurring: bool = False,
        recurrence_pattern: Optional[str] = None,
        recurrence_days: Optional[List[int]] = None,
        recurrence_end_date: Optional[datetime] = None,
        items_to_bring: Optional[str] = None,
        special_instructions: Optional[str] = None,
        notes_visible_to_coparent: bool = True,
        # Silent Handoff settings
        location_lat: Optional[float] = None,
        location_lng: Optional[float] = None,
        geofence_radius_meters: int = 100,
        check_in_window_before_minutes: int = 30,
        check_in_window_after_minutes: int = 30,
        silent_handoff_enabled: bool = False,
        qr_confirmation_required: bool = False,
    ) -> CustodyExchange:
        """Create a new custody exchange (pickup/dropoff)."""

        # Verify user has access (via case participant or family file)
        has_access, effective_id, is_family_file = await _check_case_or_family_file_access(
            db, case_id, created_by
        )
        if not has_access:
            raise ValueError("User is not a participant in this case")

        # Determine which ID to use
        actual_case_id = None if is_family_file else effective_id
        actual_family_file_id = case_id if is_family_file else None

        # Generate title if not provided
        if not title:
            type_label = {
                "pickup": "Pickup",
                "dropoff": "Dropoff",
                "both": "Exchange"
            }.get(exchange_type, "Exchange")
            title = f"{type_label}"
            if is_recurring:
                title += " (Recurring)"

        # Convert timezone-aware datetimes to naive UTC
        scheduled_time_naive = strip_tz(scheduled_time)
        recurrence_end_naive = strip_tz(recurrence_end_date)

        # Handle child_ids based on exchange_type
        # For "pickup": all children go to pickup_child_ids
        # For "dropoff": all children go to dropoff_child_ids
        # For "both": use the explicitly provided pickup/dropoff lists
        effective_pickup_ids = pickup_child_ids or []
        effective_dropoff_ids = dropoff_child_ids or []

        if exchange_type == "pickup" and child_ids and not pickup_child_ids:
            effective_pickup_ids = child_ids
        elif exchange_type == "dropoff" and child_ids and not dropoff_child_ids:
            effective_dropoff_ids = child_ids

        # Compute combined child_ids for backward compatibility
        combined_child_ids = list(set((child_ids or []) + effective_pickup_ids + effective_dropoff_ids))

        exchange = CustodyExchange(
            id=str(uuid.uuid4()),
            case_id=actual_case_id,
            family_file_id=actual_family_file_id,
            created_by=created_by,
            exchange_type=exchange_type,
            title=title,
            from_parent_id=from_parent_id,
            to_parent_id=to_parent_id,
            child_ids=combined_child_ids,
            pickup_child_ids=effective_pickup_ids,
            dropoff_child_ids=effective_dropoff_ids,
            location=location,
            location_notes=location_notes,
            scheduled_time=scheduled_time_naive,
            duration_minutes=duration_minutes,
            is_recurring=is_recurring,
            recurrence_pattern=recurrence_pattern,
            recurrence_days=recurrence_days,
            recurrence_end_date=recurrence_end_naive,
            items_to_bring=items_to_bring,
            special_instructions=special_instructions,
            notes_visible_to_coparent=notes_visible_to_coparent,
            status="active",
            # Silent Handoff settings
            location_lat=location_lat,
            location_lng=location_lng,
            geofence_radius_meters=geofence_radius_meters,
            check_in_window_before_minutes=check_in_window_before_minutes,
            check_in_window_after_minutes=check_in_window_after_minutes,
            silent_handoff_enabled=silent_handoff_enabled,
            qr_confirmation_required=qr_confirmation_required,
        )

        db.add(exchange)
        await db.flush()

        # Generate initial instances
        await CustodyExchangeService._generate_instances(
            db=db,
            exchange=exchange,
            start_date=scheduled_time_naive,
            weeks_ahead=8  # Generate 8 weeks of instances
        )

        await db.commit()

        # Reload with instances for the response
        result = await db.execute(
            select(CustodyExchange)
            .options(selectinload(CustodyExchange.instances))
            .where(CustodyExchange.id == exchange.id)
        )
        exchange = result.scalar_one()

        return exchange

    @staticmethod
    async def _generate_instances(
        db: AsyncSession,
        exchange: CustodyExchange,
        start_date: datetime,
        weeks_ahead: int = 8
    ) -> List[CustodyExchangeInstance]:
        """Generate instances for a recurring or one-time exchange."""

        instances = []
        end_date = start_date + timedelta(weeks=weeks_ahead)

        if exchange.recurrence_end_date:
            end_date = min(end_date, exchange.recurrence_end_date)

        if not exchange.is_recurring:
            # One-time exchange - just create one instance
            instance = CustodyExchangeInstance(
                id=str(uuid.uuid4()),
                exchange_id=exchange.id,
                scheduled_time=exchange.scheduled_time,
                status="scheduled",
            )
            db.add(instance)
            instances.append(instance)
        else:
            # Recurring exchange - generate based on pattern
            current_date = start_date

            while current_date <= end_date:
                # Check if this day matches the recurrence pattern
                should_create = False

                if exchange.recurrence_pattern == "weekly":
                    # Check if day of week matches
                    if exchange.recurrence_days:
                        if current_date.weekday() in [
                            (d - 1) % 7 for d in exchange.recurrence_days
                        ]:  # Convert Sun=0 to Python's Mon=0
                            should_create = True
                    else:
                        # Same day each week
                        if current_date.weekday() == exchange.scheduled_time.weekday():
                            should_create = True

                elif exchange.recurrence_pattern == "biweekly":
                    # Every two weeks on the same day
                    days_diff = (current_date - exchange.scheduled_time).days
                    if days_diff >= 0 and days_diff % 14 == 0:
                        should_create = True

                elif exchange.recurrence_pattern == "monthly":
                    # Same day of month
                    if current_date.day == exchange.scheduled_time.day:
                        should_create = True

                elif exchange.recurrence_pattern == "custom":
                    # Use recurrence_days as specific days
                    if exchange.recurrence_days and current_date.weekday() in [
                        (d - 1) % 7 for d in exchange.recurrence_days
                    ]:
                        should_create = True

                if should_create:
                    # Create instance at the scheduled time on this day
                    instance_time = current_date.replace(
                        hour=exchange.scheduled_time.hour,
                        minute=exchange.scheduled_time.minute,
                        second=0,
                        microsecond=0
                    )

                    # Check for exceptions
                    if exchange.recurrence_exceptions:
                        date_str = current_date.strftime("%Y-%m-%d")
                        if date_str in exchange.recurrence_exceptions:
                            current_date += timedelta(days=1)
                            continue

                    instance = CustodyExchangeInstance(
                        id=str(uuid.uuid4()),
                        exchange_id=exchange.id,
                        scheduled_time=instance_time,
                        status="scheduled",
                    )
                    db.add(instance)
                    instances.append(instance)

                current_date += timedelta(days=1)

        await db.flush()
        return instances

    @staticmethod
    async def get_exchange(
        db: AsyncSession,
        exchange_id: str,
        viewer_id: str
    ) -> Optional[CustodyExchange]:
        """Get a custody exchange by ID."""

        result = await db.execute(
            select(CustodyExchange)
            .options(selectinload(CustodyExchange.instances))
            .where(CustodyExchange.id == exchange_id)
        )
        exchange = result.scalar_one_or_none()

        if not exchange:
            return None

        # Verify viewer has access via CaseParticipant or FamilyFile
        has_access = False

        # Check Case Participant if exchange has case_id
        if exchange.case_id:
            participant = await db.execute(
                select(CaseParticipant).where(
                    and_(
                        CaseParticipant.case_id == exchange.case_id,
                        CaseParticipant.user_id == viewer_id,
                        CaseParticipant.is_active == True
                    )
                )
            )
            if participant.scalar_one_or_none():
                has_access = True

        # Check Family File if exchange has family_file_id
        if not has_access and exchange.family_file_id:
            family_file_result = await db.execute(
                select(FamilyFile).where(
                    FamilyFile.id == exchange.family_file_id,
                    or_(
                        FamilyFile.parent_a_id == viewer_id,
                        FamilyFile.parent_b_id == viewer_id
                    )
                )
            )
            if family_file_result.scalar_one_or_none():
                has_access = True

        if not has_access:
            return None

        return exchange

    @staticmethod
    async def list_exchanges_for_case(
        db: AsyncSession,
        case_id: str,
        viewer_id: str,
        status: Optional[str] = None,
        include_instances: bool = False
    ) -> List[CustodyExchange]:
        """List all custody exchanges for a case."""

        # Verify viewer has access (via case participant or family file)
        has_access, effective_id, is_family_file = await _check_case_or_family_file_access(
            db, case_id, viewer_id
        )
        if not has_access:
            return []

        # Query by the appropriate field
        if is_family_file:
            query = select(CustodyExchange).where(
                CustodyExchange.family_file_id == case_id
            )
        else:
            query = select(CustodyExchange).where(
                CustodyExchange.case_id == effective_id
            )

        if status:
            query = query.where(CustodyExchange.status == status)

        if include_instances:
            query = query.options(selectinload(CustodyExchange.instances))

        query = query.order_by(CustodyExchange.scheduled_time)

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_upcoming_instances(
        db: AsyncSession,
        case_id: str,
        viewer_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 20
    ) -> List[CustodyExchangeInstance]:
        """Get upcoming exchange instances for a case."""

        # Verify viewer has access (via case participant or family file)
        has_access, effective_id, is_family_file = await _check_case_or_family_file_access(
            db, case_id, viewer_id
        )
        if not has_access:
            return []

        if not start_date:
            start_date = datetime.utcnow()

        # Build base conditions
        base_conditions = [
            CustodyExchange.status == "active",
            CustodyExchangeInstance.scheduled_time >= start_date,
            CustodyExchangeInstance.status.in_(["scheduled", "rescheduled"])
        ]

        # Add the appropriate ID filter
        if is_family_file:
            base_conditions.append(CustodyExchange.family_file_id == case_id)
        else:
            base_conditions.append(CustodyExchange.case_id == effective_id)

        query = (
            select(CustodyExchangeInstance)
            .join(CustodyExchange)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .where(and_(*base_conditions))
        )

        if end_date:
            query = query.where(CustodyExchangeInstance.scheduled_time <= end_date)

        query = query.order_by(CustodyExchangeInstance.scheduled_time).limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_exchange(
        db: AsyncSession,
        exchange_id: str,
        user_id: str,
        **updates
    ) -> Optional[CustodyExchange]:
        """Update a custody exchange."""

        exchange = await CustodyExchangeService.get_exchange(db, exchange_id, user_id)
        if not exchange:
            return None

        for key, value in updates.items():
            if value is not None and hasattr(exchange, key):
                setattr(exchange, key, value)

        exchange.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(exchange)

        return exchange

    @staticmethod
    async def check_in(
        db: AsyncSession,
        instance_id: str,
        user_id: str,
        notes: Optional[str] = None
    ) -> Optional[CustodyExchangeInstance]:
        """Record a parent check-in for an exchange instance."""

        result = await db.execute(
            select(CustodyExchangeInstance)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .where(CustodyExchangeInstance.id == instance_id)
        )
        instance = result.scalar_one_or_none()

        if not instance:
            return None

        exchange = instance.exchange

        # Determine which parent is checking in
        if user_id == exchange.from_parent_id:
            instance.from_parent_checked_in = True
            instance.from_parent_check_in_time = datetime.utcnow()
        elif user_id == exchange.to_parent_id:
            instance.to_parent_checked_in = True
            instance.to_parent_check_in_time = datetime.utcnow()
        else:
            # User is a participant but not specified as from/to
            # Allow them to check in as from_parent if not set
            if not instance.from_parent_checked_in:
                instance.from_parent_checked_in = True
                instance.from_parent_check_in_time = datetime.utcnow()
            elif not instance.to_parent_checked_in:
                instance.to_parent_checked_in = True
                instance.to_parent_check_in_time = datetime.utcnow()

        if notes:
            instance.notes = notes

        # Mark as completed if both parents checked in
        if instance.from_parent_checked_in and instance.to_parent_checked_in:
            instance.status = "completed"
            instance.completed_at = datetime.utcnow()

        instance.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(instance)

        return instance

    @staticmethod
    async def cancel_instance(
        db: AsyncSession,
        instance_id: str,
        user_id: str,
        notes: Optional[str] = None
    ) -> Optional[CustodyExchangeInstance]:
        """Cancel a specific exchange instance."""

        result = await db.execute(
            select(CustodyExchangeInstance)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .where(CustodyExchangeInstance.id == instance_id)
        )
        instance = result.scalar_one_or_none()

        if not instance:
            return None

        exchange = instance.exchange
        has_access = False

        # Verify user has access via CaseParticipant
        if exchange.case_id:
            participant = await db.execute(
                select(CaseParticipant).where(
                    and_(
                        CaseParticipant.case_id == exchange.case_id,
                        CaseParticipant.user_id == user_id,
                        CaseParticipant.is_active == True
                    )
                )
            )
            if participant.scalar_one_or_none():
                has_access = True

        # Check Family File access
        if not has_access and exchange.family_file_id:
            family_file_result = await db.execute(
                select(FamilyFile).where(
                    FamilyFile.id == exchange.family_file_id,
                    or_(
                        FamilyFile.parent_a_id == user_id,
                        FamilyFile.parent_b_id == user_id
                    )
                )
            )
            if family_file_result.scalar_one_or_none():
                has_access = True

        if not has_access:
            return None

        instance.status = "cancelled"
        if notes:
            instance.notes = notes
        instance.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(instance)

        return instance

    @staticmethod
    def filter_for_viewer(
        exchange: CustodyExchange,
        viewer_id: str,
        other_parent_name: Optional[str] = None,
        other_parent_id: Optional[str] = None
    ) -> dict:
        """Filter exchange data based on viewer permissions.

        Also calculates viewer-perspective fields:
        - viewer_role: 'pickup', 'dropoff', or 'both' from the viewer's perspective
        - viewer_pickup_child_ids: children the viewer is picking up
        - viewer_dropoff_child_ids: children the viewer is dropping off
        """

        is_owner = exchange.created_by == viewer_id
        is_creator = exchange.created_by == viewer_id

        # Effective case_id for API response
        effective_case_id = exchange.case_id if exchange.case_id else exchange.family_file_id

        # Get original child IDs from creator's perspective
        original_pickup_ids = exchange.pickup_child_ids or []
        original_dropoff_ids = exchange.dropoff_child_ids or []

        # Calculate viewer-perspective child IDs
        # If viewer is NOT the creator, we need to reverse the perspective:
        # - What creator calls "pickup" is "dropoff" for the other parent
        # - What creator calls "dropoff" is "pickup" for the other parent
        if is_creator:
            viewer_pickup_child_ids = original_pickup_ids
            viewer_dropoff_child_ids = original_dropoff_ids
        else:
            # Reverse: creator's pickup = viewer's dropoff, creator's dropoff = viewer's pickup
            viewer_pickup_child_ids = original_dropoff_ids
            viewer_dropoff_child_ids = original_pickup_ids

        # Calculate viewer's role based on what children they have to pickup/dropoff
        has_pickups = len(viewer_pickup_child_ids) > 0
        has_dropoffs = len(viewer_dropoff_child_ids) > 0

        if has_pickups and has_dropoffs:
            viewer_role = "both"
        elif has_pickups:
            viewer_role = "pickup"
        elif has_dropoffs:
            viewer_role = "dropoff"
        else:
            # Fallback to exchange_type if no child-specific data
            # But adjust based on whether viewer is the creator
            exchange_type = exchange.exchange_type
            if is_creator:
                viewer_role = exchange_type
            else:
                # Reverse the role for non-creator
                if exchange_type == "pickup":
                    viewer_role = "dropoff"
                elif exchange_type == "dropoff":
                    viewer_role = "pickup"
                else:
                    viewer_role = "both"

        data = {
            "id": exchange.id,
            "case_id": effective_case_id,
            "family_file_id": exchange.family_file_id,
            "created_by": exchange.created_by,
            "exchange_type": exchange.exchange_type,
            "title": exchange.title,
            "from_parent_id": exchange.from_parent_id,
            "to_parent_id": exchange.to_parent_id,
            "child_ids": exchange.child_ids,
            "pickup_child_ids": exchange.pickup_child_ids or [],
            "dropoff_child_ids": exchange.dropoff_child_ids or [],
            "location": exchange.location,
            "scheduled_time": exchange.scheduled_time,
            "duration_minutes": exchange.duration_minutes,
            "is_recurring": exchange.is_recurring,
            "recurrence_pattern": exchange.recurrence_pattern,
            "recurrence_days": exchange.recurrence_days,
            "recurrence_end_date": exchange.recurrence_end_date,
            "items_to_bring": exchange.items_to_bring,
            "status": exchange.status,
            "notes_visible_to_coparent": exchange.notes_visible_to_coparent,
            "is_owner": is_owner,
            "created_at": exchange.created_at,
            "updated_at": exchange.updated_at,
            # Viewer-perspective fields
            "viewer_role": viewer_role,
            "viewer_pickup_child_ids": viewer_pickup_child_ids,
            "viewer_dropoff_child_ids": viewer_dropoff_child_ids,
            "other_parent_name": other_parent_name,
            "other_parent_id": other_parent_id,
        }

        # Only show location_notes and special_instructions if visible
        if is_owner or exchange.notes_visible_to_coparent:
            data["location_notes"] = exchange.location_notes
            data["special_instructions"] = exchange.special_instructions
        else:
            data["location_notes"] = None
            data["special_instructions"] = None

        # Calculate next occurrence - only if instances are already loaded
        # Check if instances relationship is loaded to avoid async issues
        from sqlalchemy.orm import object_session
        from sqlalchemy.orm.attributes import instance_state

        state = instance_state(exchange)
        instances_loaded = 'instances' in state.dict

        if instances_loaded and exchange.instances:
            upcoming = [
                i for i in exchange.instances
                if i.status == "scheduled" and i.scheduled_time >= datetime.utcnow()
            ]
            if upcoming:
                data["next_occurrence"] = min(i.scheduled_time for i in upcoming)
            else:
                data["next_occurrence"] = None
        else:
            data["next_occurrence"] = None

        # Include Silent Handoff settings
        data["location_lat"] = exchange.location_lat
        data["location_lng"] = exchange.location_lng
        data["geofence_radius_meters"] = exchange.geofence_radius_meters
        data["check_in_window_before_minutes"] = exchange.check_in_window_before_minutes
        data["check_in_window_after_minutes"] = exchange.check_in_window_after_minutes
        data["silent_handoff_enabled"] = exchange.silent_handoff_enabled
        data["qr_confirmation_required"] = exchange.qr_confirmation_required

        return data

    @staticmethod
    async def get_other_parent_info(
        db: AsyncSession,
        exchange: CustodyExchange,
        viewer_id: str
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Get the other parent's name and ID for an exchange.

        Returns a tuple of (other_parent_name, other_parent_id).
        """
        from app.models.user import User

        other_parent_id = None
        other_parent_name = None

        # Determine other parent from the exchange's from_parent_id/to_parent_id
        if exchange.from_parent_id and exchange.to_parent_id:
            if str(viewer_id) == str(exchange.from_parent_id):
                other_parent_id = exchange.to_parent_id
            elif str(viewer_id) == str(exchange.to_parent_id):
                other_parent_id = exchange.from_parent_id

        # If not found via from/to, try via FamilyFile
        if not other_parent_id and exchange.family_file_id:
            family_file_result = await db.execute(
                select(FamilyFile).where(FamilyFile.id == exchange.family_file_id)
            )
            family_file = family_file_result.scalar_one_or_none()
            if family_file:
                if str(viewer_id) == str(family_file.parent_a_id):
                    other_parent_id = family_file.parent_b_id
                elif str(viewer_id) == str(family_file.parent_b_id):
                    other_parent_id = family_file.parent_a_id

        # If still not found, try via CaseParticipant
        if not other_parent_id and exchange.case_id:
            participants_result = await db.execute(
                select(CaseParticipant).where(
                    and_(
                        CaseParticipant.case_id == exchange.case_id,
                        CaseParticipant.is_active == True,
                        CaseParticipant.user_id != viewer_id
                    )
                )
            )
            other_participant = participants_result.scalar_one_or_none()
            if other_participant:
                other_parent_id = other_participant.user_id

        # Look up the other parent's name
        if other_parent_id:
            user_result = await db.execute(
                select(User).where(User.id == other_parent_id)
            )
            user = user_result.scalar_one_or_none()
            if user:
                other_parent_name = f"{user.first_name} {user.last_name or ''}".strip()

        return other_parent_name, other_parent_id

    # ============================================================
    # Silent Handoff Methods
    # ============================================================

    @staticmethod
    def calculate_exchange_window(
        scheduled_time: datetime,
        before_minutes: int,
        after_minutes: int
    ) -> Tuple[datetime, datetime]:
        """
        Calculate the check-in window boundaries for an exchange.

        Args:
            scheduled_time: The scheduled exchange time
            before_minutes: How many minutes before exchange to allow check-in
            after_minutes: How many minutes after exchange to allow check-in

        Returns:
            Tuple of (window_start, window_end)
        """
        window_start = scheduled_time - timedelta(minutes=before_minutes)
        window_end = scheduled_time + timedelta(minutes=after_minutes)
        return window_start, window_end

    @staticmethod
    def is_within_exchange_window(
        current_time: datetime,
        scheduled_time: datetime,
        before_minutes: int,
        after_minutes: int
    ) -> bool:
        """Check if current time is within the exchange window."""
        window_start, window_end = CustodyExchangeService.calculate_exchange_window(
            scheduled_time, before_minutes, after_minutes
        )
        return window_start <= current_time <= window_end

    @staticmethod
    async def check_in_with_gps(
        db: AsyncSession,
        instance_id: str,
        user_id: str,
        latitude: float,
        longitude: float,
        device_accuracy: float,
        notes: Optional[str] = None
    ) -> Optional[CustodyExchangeInstance]:
        """
        GPS-verified check-in for Silent Handoff.

        Records GPS coordinates, calculates distance from exchange location,
        and determines if user is within geofence.

        Privacy: This captures a single GPS fix at check-in time only,
        not continuous tracking.

        Args:
            db: Database session
            instance_id: Exchange instance ID
            user_id: User checking in
            latitude: User's GPS latitude
            longitude: User's GPS longitude
            device_accuracy: Device-reported GPS accuracy in meters
            notes: Optional check-in notes

        Returns:
            Updated CustodyExchangeInstance or None if not found
        """
        result = await db.execute(
            select(CustodyExchangeInstance)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .where(CustodyExchangeInstance.id == instance_id)
        )
        instance = result.scalar_one_or_none()

        if not instance:
            return None

        exchange = instance.exchange
        now = datetime.utcnow()

        # Calculate exchange window if not set
        if not instance.window_start or not instance.window_end:
            window_start, window_end = CustodyExchangeService.calculate_exchange_window(
                instance.scheduled_time,
                exchange.check_in_window_before_minutes,
                exchange.check_in_window_after_minutes
            )
            instance.window_start = window_start
            instance.window_end = window_end

        # Calculate distance and geofence status
        in_geofence = None
        distance_meters = None

        if exchange.location_lat is not None and exchange.location_lng is not None:
            in_geofence, distance_meters = GeolocationService.is_within_geofence(
                user_lat=latitude,
                user_lng=longitude,
                geofence_lat=exchange.location_lat,
                geofence_lng=exchange.location_lng,
                radius_meters=exchange.geofence_radius_meters,
                device_accuracy_meters=device_accuracy
            )

        # Determine which parent is checking in and record GPS data
        if user_id == exchange.from_parent_id:
            instance.from_parent_checked_in = True
            instance.from_parent_check_in_time = now
            instance.from_parent_check_in_lat = latitude
            instance.from_parent_check_in_lng = longitude
            instance.from_parent_device_accuracy = device_accuracy
            instance.from_parent_distance_meters = distance_meters
            instance.from_parent_in_geofence = in_geofence
        elif user_id == exchange.to_parent_id:
            instance.to_parent_checked_in = True
            instance.to_parent_check_in_time = now
            instance.to_parent_check_in_lat = latitude
            instance.to_parent_check_in_lng = longitude
            instance.to_parent_device_accuracy = device_accuracy
            instance.to_parent_distance_meters = distance_meters
            instance.to_parent_in_geofence = in_geofence
        else:
            # Fallback for unassigned parents - fill in order
            if not instance.from_parent_checked_in:
                instance.from_parent_checked_in = True
                instance.from_parent_check_in_time = now
                instance.from_parent_check_in_lat = latitude
                instance.from_parent_check_in_lng = longitude
                instance.from_parent_device_accuracy = device_accuracy
                instance.from_parent_distance_meters = distance_meters
                instance.from_parent_in_geofence = in_geofence
            elif not instance.to_parent_checked_in:
                instance.to_parent_checked_in = True
                instance.to_parent_check_in_time = now
                instance.to_parent_check_in_lat = latitude
                instance.to_parent_check_in_lng = longitude
                instance.to_parent_device_accuracy = device_accuracy
                instance.to_parent_distance_meters = distance_meters
                instance.to_parent_in_geofence = in_geofence

        if notes:
            if instance.notes:
                instance.notes = f"{instance.notes}\n{notes}"
            else:
                instance.notes = notes

        # Generate QR token if both parents checked in and QR required
        if (exchange.qr_confirmation_required and
            instance.from_parent_checked_in and
            instance.to_parent_checked_in and
            not instance.qr_confirmation_token):
            instance.qr_confirmation_token = secrets.token_urlsafe(32)

        # Update handoff outcome
        instance.handoff_outcome = CustodyExchangeService._determine_handoff_outcome(
            instance, exchange
        )

        # Auto-complete if both checked in and QR not required
        if (instance.from_parent_checked_in and
            instance.to_parent_checked_in and
            not exchange.qr_confirmation_required):
            instance.status = "completed"
            instance.completed_at = now

        instance.updated_at = now
        await db.commit()
        await db.refresh(instance)

        return instance

    @staticmethod
    def _determine_handoff_outcome(
        instance: CustodyExchangeInstance,
        exchange: CustodyExchange
    ) -> str:
        """Determine the handoff outcome based on check-in status."""
        both_checked_in = instance.from_parent_checked_in and instance.to_parent_checked_in

        if both_checked_in:
            if exchange.qr_confirmation_required and not instance.qr_confirmed_at:
                return "pending_qr"
            return "completed"
        elif instance.from_parent_checked_in or instance.to_parent_checked_in:
            return "one_party_present"
        else:
            return "pending"

    @staticmethod
    async def confirm_qr(
        db: AsyncSession,
        instance_id: str,
        user_id: str,
        confirmation_token: str
    ) -> Optional[CustodyExchangeInstance]:
        """
        Confirm exchange via QR code scan.

        The confirming parent scans the QR code displayed by the other parent
        to mutually verify presence at the exchange location.

        Args:
            db: Database session
            instance_id: Exchange instance ID
            user_id: User scanning the QR code
            confirmation_token: Token from the QR code

        Returns:
            Updated CustodyExchangeInstance or None

        Raises:
            ValueError: If token is invalid
        """
        result = await db.execute(
            select(CustodyExchangeInstance)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .where(CustodyExchangeInstance.id == instance_id)
        )
        instance = result.scalar_one_or_none()

        if not instance:
            return None

        # Verify token matches
        if instance.qr_confirmation_token != confirmation_token:
            raise ValueError("Invalid confirmation token")

        # Record confirmation
        now = datetime.utcnow()
        instance.qr_confirmed_at = now
        instance.qr_confirmed_by = user_id
        instance.status = "completed"
        instance.completed_at = now
        instance.handoff_outcome = "completed"
        instance.updated_at = now

        await db.commit()
        await db.refresh(instance)

        return instance

    @staticmethod
    async def get_instance_with_exchange(
        db: AsyncSession,
        instance_id: str
    ) -> Optional[CustodyExchangeInstance]:
        """Get an instance with its parent exchange loaded."""
        result = await db.execute(
            select(CustodyExchangeInstance)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .where(CustodyExchangeInstance.id == instance_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def auto_close_expired_windows(db: AsyncSession) -> int:
        """
        Auto-close exchange instances where the window has expired.

        This should be run as a background task (e.g., every 5 minutes).

        Returns:
            Count of instances closed
        """
        now = datetime.utcnow()

        result = await db.execute(
            select(CustodyExchangeInstance)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .where(
                and_(
                    CustodyExchangeInstance.status == "scheduled",
                    CustodyExchangeInstance.window_end < now,
                    CustodyExchangeInstance.auto_closed == False
                )
            )
        )
        instances = result.scalars().all()

        closed_count = 0
        for instance in instances:
            exchange = instance.exchange

            # Determine final outcome
            if instance.from_parent_checked_in and instance.to_parent_checked_in:
                if exchange.qr_confirmation_required and not instance.qr_confirmed_at:
                    instance.handoff_outcome = "disputed"  # Both present but no QR confirm
                else:
                    instance.handoff_outcome = "completed"
                    instance.status = "completed"
            elif instance.from_parent_checked_in or instance.to_parent_checked_in:
                instance.handoff_outcome = "one_party_present"
                instance.status = "missed"
            else:
                instance.handoff_outcome = "missed"
                instance.status = "missed"

            instance.auto_closed = True
            instance.auto_closed_at = now
            instance.updated_at = now
            closed_count += 1

        await db.commit()
        return closed_count

    @staticmethod
    async def get_custody_status(
        db: AsyncSession,
        family_file_id: str,
        user_id: str
    ) -> Optional[dict]:
        """
        Get current custody status for the dashboard.

        Determines where children are based on the NEXT upcoming exchange:
        - Child in dropoff_child_ids → child is WITH current user (they will drop off)
        - Child in pickup_child_ids → child is WITH other parent (user will pick up)

        Returns a dict ready to be converted to CustodyStatusResponse.
        """
        from app.models.child import Child
        from app.models.user import User

        # Get the family file
        family_file_result = await db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        family_file = family_file_result.scalar_one_or_none()

        if not family_file:
            return None

        # Verify user access
        if user_id not in [family_file.parent_a_id, family_file.parent_b_id]:
            return None

        # Determine coparent
        coparent_id = (
            family_file.parent_b_id if user_id == family_file.parent_a_id
            else family_file.parent_a_id
        )

        # Get coparent name
        coparent_name = None
        if coparent_id:
            coparent_result = await db.execute(
                select(User).where(User.id == coparent_id)
            )
            coparent = coparent_result.scalar_one_or_none()
            if coparent:
                coparent_name = f"{coparent.first_name} {coparent.last_name or ''}".strip()

        # Get children
        children_result = await db.execute(
            select(Child).where(
                and_(
                    Child.family_file_id == family_file_id,
                    Child.status == "active"
                )
            )
        )
        children = children_result.scalars().all()

        now = datetime.utcnow()
        child_statuses = []

        # First, get ALL upcoming exchanges for this family file (simpler query without child filter)
        # This avoids JSONB contains issues with JSON columns
        if family_file.legacy_case_id:
            exchange_filter = or_(
                CustodyExchange.family_file_id == family_file_id,
                CustodyExchange.case_id == family_file.legacy_case_id
            )
        else:
            exchange_filter = CustodyExchange.family_file_id == family_file_id

        all_upcoming_result = await db.execute(
            select(CustodyExchangeInstance)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .join(CustodyExchange, CustodyExchangeInstance.exchange_id == CustodyExchange.id)
            .where(
                and_(
                    exchange_filter,
                    CustodyExchangeInstance.scheduled_time > now,
                    CustodyExchangeInstance.status == "scheduled"
                )
            )
            .order_by(CustodyExchangeInstance.scheduled_time.asc())
            .limit(20)
        )
        all_upcoming_instances = all_upcoming_result.scalars().all()

        for child in children:
            child_id_str = str(child.id)

            # Find the next exchange that includes this child (filter in Python)
            next_exchange_instance = None
            child_explicitly_assigned = False
            for inst in all_upcoming_instances:
                exchange = inst.exchange
                child_ids = exchange.child_ids or []
                pickup_ids = exchange.pickup_child_ids or []
                dropoff_ids = exchange.dropoff_child_ids or []

                # Check if child is in any of the ID lists
                if (child_id_str in child_ids or
                    child_id_str in pickup_ids or
                    child_id_str in dropoff_ids):
                    next_exchange_instance = inst
                    child_explicitly_assigned = True
                    break

            # FALLBACK: If no exchange found for this specific child but exchanges exist,
            # use the first upcoming exchange and apply its exchange_type to all children
            if not next_exchange_instance and all_upcoming_instances:
                next_exchange_instance = all_upcoming_instances[0]
                child_explicitly_assigned = False

            # Determine who has the child based on upcoming exchange
            # If child is in dropoff_child_ids for user's exchange → child is WITH user
            # If child is in pickup_child_ids for user's exchange → child is WITH other parent
            with_current_user = True  # Default: assume with current user if no exchange data
            current_parent_id = user_id
            current_parent_name = "You"
            next_action = None  # 'pickup' or 'dropoff'

            if next_exchange_instance:
                exchange = next_exchange_instance.exchange
                exchange_creator = str(exchange.created_by)
                user_id_str = str(user_id)

                # Check if this child is in pickup or dropoff lists
                pickup_ids = exchange.pickup_child_ids or []
                dropoff_ids = exchange.dropoff_child_ids or []

                is_in_pickup = child_id_str in pickup_ids
                is_in_dropoff = child_id_str in dropoff_ids

                # Determine custody based on the exchange creator's perspective
                if child_explicitly_assigned:
                    # Child is explicitly assigned - use pickup/dropoff lists
                    if exchange_creator == user_id_str:
                        # User created this exchange
                        if is_in_dropoff:
                            # User is dropping off → child is WITH user now
                            with_current_user = True
                            current_parent_id = user_id
                            current_parent_name = "You"
                            next_action = "dropoff"
                        elif is_in_pickup:
                            # User is picking up → child is WITH other parent now
                            with_current_user = False
                            current_parent_id = coparent_id
                            current_parent_name = coparent_name
                            next_action = "pickup"
                    else:
                        # Coparent created this exchange - reverse logic
                        if is_in_dropoff:
                            # Coparent is dropping off → child is WITH coparent now
                            with_current_user = False
                            current_parent_id = coparent_id
                            current_parent_name = coparent_name
                            next_action = "pickup"  # From user's perspective, they're picking up
                        elif is_in_pickup:
                            # Coparent is picking up → child is WITH user now
                            with_current_user = True
                            current_parent_id = user_id
                            current_parent_name = "You"
                            next_action = "dropoff"  # From user's perspective, they're dropping off
                else:
                    # FALLBACK: Child not explicitly assigned - use exchange_type
                    exchange_type = exchange.exchange_type or "pickup"

                    if exchange_creator == user_id_str:
                        # User created this exchange - exchange_type is from their perspective
                        if exchange_type == "pickup":
                            # User is picking up → child is WITH other parent now
                            with_current_user = False
                            current_parent_id = coparent_id
                            current_parent_name = coparent_name
                            next_action = "pickup"
                        elif exchange_type == "dropoff":
                            # User is dropping off → child is WITH user now
                            with_current_user = True
                            current_parent_id = user_id
                            current_parent_name = "You"
                            next_action = "dropoff"
                        else:
                            # "both" - assume child is with other parent (more common scenario)
                            with_current_user = False
                            current_parent_id = coparent_id
                            current_parent_name = coparent_name
                            next_action = "pickup"
                    else:
                        # Coparent created this exchange - reverse the logic
                        if exchange_type == "pickup":
                            # Coparent is picking up → child is WITH user now
                            with_current_user = True
                            current_parent_id = user_id
                            current_parent_name = "You"
                            next_action = "dropoff"
                        elif exchange_type == "dropoff":
                            # Coparent is dropping off → child is WITH coparent now
                            with_current_user = False
                            current_parent_id = coparent_id
                            current_parent_name = coparent_name
                            next_action = "pickup"
                        else:
                            # "both" - assume child is with user
                            with_current_user = True
                            current_parent_id = user_id
                            current_parent_name = "You"
                            next_action = "dropoff"

            # Calculate time remaining
            hours_remaining = None
            time_with_current_hours = None
            progress_percentage = 0.0
            default_custody_period = 168.0  # 7 days in hours

            if next_exchange_instance:
                hours_remaining = (next_exchange_instance.scheduled_time - now).total_seconds() / 3600

                # Progress calculation: use default period
                if hours_remaining < default_custody_period:
                    time_with_current_hours = default_custody_period - hours_remaining
                    progress_percentage = min(100.0, (time_with_current_hours / default_custody_period) * 100)
                else:
                    time_with_current_hours = 0
                    progress_percentage = 0.0

            child_statuses.append({
                "child_id": child.id,
                "child_first_name": child.first_name,
                "child_last_name": child.last_name,
                "with_current_user": with_current_user,
                "current_parent_id": current_parent_id,
                "current_parent_name": current_parent_name,
                "next_action": next_action,  # 'pickup' or 'dropoff' from user's perspective
                "next_exchange_id": next_exchange_instance.id if next_exchange_instance else None,
                "next_exchange_time": next_exchange_instance.scheduled_time if next_exchange_instance else None,
                "next_exchange_location": (
                    next_exchange_instance.exchange.location
                    if next_exchange_instance else None
                ),
                "hours_remaining": round(hours_remaining, 1) if hours_remaining else None,
                "time_with_current_parent_hours": round(time_with_current_hours, 1) if time_with_current_hours else None,
                "progress_percentage": round(progress_percentage, 1)
            })

        # Overall status
        all_with_user = all(c["with_current_user"] for c in child_statuses) if child_statuses else False
        any_with_user = any(c["with_current_user"] for c in child_statuses) if child_statuses else False

        # FALLBACK: If no children but exchanges exist, determine custody from exchange
        if not child_statuses and all_upcoming_instances:
            first_inst = all_upcoming_instances[0]
            exchange = first_inst.exchange
            exchange_creator = str(exchange.created_by)
            user_id_str = str(user_id)
            exchange_type = exchange.exchange_type or "pickup"

            if exchange_creator == user_id_str:
                # User created this exchange
                if exchange_type == "pickup":
                    # User is picking up → kids are with coparent
                    all_with_user = False
                    any_with_user = False
                elif exchange_type == "dropoff":
                    # User is dropping off → kids are with user
                    all_with_user = True
                    any_with_user = True
                else:
                    all_with_user = False
                    any_with_user = False
            else:
                # Coparent created this exchange - reverse logic
                if exchange_type == "pickup":
                    # Coparent is picking up → kids are with user
                    all_with_user = True
                    any_with_user = True
                elif exchange_type == "dropoff":
                    # Coparent is dropping off → kids are with coparent
                    all_with_user = False
                    any_with_user = False
                else:
                    all_with_user = True
                    any_with_user = True

        # Find soonest next exchange across all children
        next_times = [c["next_exchange_time"] for c in child_statuses if c["next_exchange_time"]]
        next_exchange_time = min(next_times) if next_times else None

        # FALLBACK: If no next_exchange_time from children but exchanges exist, use first exchange directly
        if not next_exchange_time and all_upcoming_instances:
            next_exchange_time = all_upcoming_instances[0].scheduled_time

        hours_until_next = None
        next_day = None
        next_formatted = None
        if next_exchange_time:
            hours_until_next = (next_exchange_time - now).total_seconds() / 3600
            next_day = next_exchange_time.strftime("%A")  # "Wednesday"
            next_formatted = next_exchange_time.strftime("%A %-I:%M %p")  # "Wednesday 6:00 PM"

        # Calculate overall progress
        overall_progress = 0.0
        elapsed_hours = 0.0
        custody_period_hours = 168.0  # Default 7 days

        if child_statuses:
            # Use average progress across children
            progresses = [c["progress_percentage"] for c in child_statuses]
            overall_progress = sum(progresses) / len(progresses) if progresses else 0.0

            # Use the first child's time values for overall
            first_child = child_statuses[0]
            if first_child["time_with_current_parent_hours"] is not None:
                elapsed_hours = first_child["time_with_current_parent_hours"]
            if first_child["hours_remaining"] is not None:
                # If we have elapsed hours, use actual period; otherwise use default
                if elapsed_hours > 0:
                    custody_period_hours = elapsed_hours + first_child["hours_remaining"]
                else:
                    custody_period_hours = 168.0  # Default 7 days
        elif hours_until_next is not None:
            # FALLBACK: No children but we have exchange time - calculate progress from that
            if hours_until_next < custody_period_hours:
                elapsed_hours = custody_period_hours - hours_until_next
                overall_progress = min(100.0, (elapsed_hours / custody_period_hours) * 100)

        return {
            "family_file_id": family_file_id,
            "case_id": family_file.legacy_case_id,
            "current_user_id": user_id,
            "coparent_id": coparent_id,
            "coparent_name": coparent_name,
            "all_with_current_user": all_with_user,
            "any_with_current_user": any_with_user,
            "children": child_statuses,
            "next_exchange_time": next_exchange_time,
            "next_exchange_day": next_day,
            "next_exchange_formatted": next_formatted,
            "hours_until_next_exchange": round(hours_until_next, 1) if hours_until_next else None,
            "custody_period_hours": round(custody_period_hours, 1),
            "elapsed_hours": round(elapsed_hours, 1),
            "progress_percentage": round(overall_progress, 1),
            "last_manual_override": None,
            "manual_override_by": None,
            "pending_override_request": False
        }
