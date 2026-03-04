"""
Time Block Service - Business logic for availability constraints.

Handles:
- CRUD operations for time blocks
- Conflict detection (ARIA integration)
- Recurrence expansion (MVP: daily/weekly only)
"""

from typing import Optional, List, Tuple
from datetime import datetime, timedelta
import uuid

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.time_block import TimeBlock
from app.models.my_time_collection import MyTimeCollection


def normalize_datetime(dt: datetime) -> datetime:
    """Convert timezone-aware datetime to naive UTC datetime for PostgreSQL."""
    if dt.tzinfo is not None:
        # Convert to UTC and remove timezone info
        return dt.replace(tzinfo=None)
    return dt


class TimeBlockService:
    """Service for managing Time Blocks and conflict detection."""

    @staticmethod
    async def create_time_block(
        db: AsyncSession,
        collection_id: str,
        user_id: str,
        title: str,
        start_time: datetime,
        end_time: datetime,
        all_day: bool = False,
        is_recurring: bool = False,
        recurrence_pattern: Optional[str] = None,
        recurrence_days: Optional[List[int]] = None,
        recurrence_end_date: Optional[datetime] = None,
        notes: Optional[str] = None
    ) -> TimeBlock:
        """
        Create a new time block.

        Args:
            db: Database session
            collection_id: Collection UUID
            user_id: User creating the block (must own collection)
            title: Private title (e.g., "Work Hours")
            start_time: Block start
            end_time: Block end
            all_day: Whether this is an all-day block
            is_recurring: Whether this repeats
            recurrence_pattern: "daily" or "weekly" (MVP)
            recurrence_days: For weekly: [0,1,2,3,4] = Mon-Fri (0=Monday)
            recurrence_end_date: When recurrence stops
            notes: Private notes

        Returns:
            Created TimeBlock

        Raises:
            ValueError: If user doesn't own collection or invalid data
        """
        # Verify collection ownership
        result = await db.execute(
            select(MyTimeCollection).where(MyTimeCollection.id == collection_id)
        )
        collection = result.scalar_one_or_none()

        if not collection:
            raise ValueError("Collection not found")

        if collection.owner_id != user_id:
            raise ValueError("You can only add time blocks to your own collections")

        # Validate recurrence
        if is_recurring:
            if not recurrence_pattern:
                raise ValueError("Recurrence pattern required for recurring blocks")
            if recurrence_pattern not in ["daily", "weekly"]:
                raise ValueError("MVP supports only 'daily' or 'weekly' recurrence")
            if recurrence_pattern == "weekly" and not recurrence_days:
                raise ValueError("Weekly recurrence requires recurrence_days")

        # Validate times
        if end_time <= start_time:
            raise ValueError("End time must be after start time")

        # Normalize datetime objects (strip timezone for PostgreSQL)
        start_time = normalize_datetime(start_time)
        end_time = normalize_datetime(end_time)
        if recurrence_end_date:
            recurrence_end_date = normalize_datetime(recurrence_end_date)

        # Create time block
        time_block = TimeBlock(
            id=str(uuid.uuid4()),
            collection_id=collection_id,
            title=title,
            start_time=start_time,
            end_time=end_time,
            all_day=all_day,
            is_recurring=is_recurring,
            recurrence_pattern=recurrence_pattern,
            recurrence_days=recurrence_days or [],
            recurrence_end_date=recurrence_end_date,
            notes=notes,
            is_active=True
        )

        db.add(time_block)
        await db.flush()
        await db.refresh(time_block)

        return time_block

    @staticmethod
    async def get_time_block(
        db: AsyncSession,
        block_id: str,
        user_id: str
    ) -> Optional[TimeBlock]:
        """
        Get a time block by ID.

        Args:
            db: Database session
            block_id: TimeBlock UUID
            user_id: User requesting (must own the block's collection)

        Returns:
            TimeBlock or None
        """
        result = await db.execute(
            select(TimeBlock).where(TimeBlock.id == block_id)
        )
        block = result.scalar_one_or_none()

        if not block:
            return None

        # Verify ownership via collection
        collection_result = await db.execute(
            select(MyTimeCollection).where(MyTimeCollection.id == block.collection_id)
        )
        collection = collection_result.scalar_one_or_none()

        if not collection or collection.owner_id != user_id:
            return None

        return block

    @staticmethod
    async def list_time_blocks(
        db: AsyncSession,
        collection_id: str,
        user_id: str
    ) -> List[TimeBlock]:
        """
        List all time blocks in a collection.

        Args:
            db: Database session
            collection_id: Collection UUID
            user_id: User requesting (must own collection)

        Returns:
            List of TimeBlock
        """
        # Verify ownership
        collection_result = await db.execute(
            select(MyTimeCollection).where(MyTimeCollection.id == collection_id)
        )
        collection = collection_result.scalar_one_or_none()

        if not collection or collection.owner_id != user_id:
            raise ValueError("No access to this collection")

        # Get blocks
        result = await db.execute(
            select(TimeBlock).where(
                TimeBlock.collection_id == collection_id,
                TimeBlock.is_active == True
            ).order_by(TimeBlock.start_time)
        )

        return list(result.scalars().all())

    @staticmethod
    async def update_time_block(
        db: AsyncSession,
        block_id: str,
        user_id: str,
        title: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        notes: Optional[str] = None
    ) -> TimeBlock:
        """
        Update a time block.

        Args:
            db: Database session
            block_id: TimeBlock UUID
            user_id: User making update (must own block)
            title: New title (optional)
            start_time: New start time (optional)
            end_time: New end time (optional)
            notes: New notes (optional)

        Returns:
            Updated TimeBlock
        """
        block = await TimeBlockService.get_time_block(db, block_id, user_id)

        if not block:
            raise ValueError("Time block not found or no access")

        # Update fields
        if title is not None:
            block.title = title
        if start_time is not None:
            block.start_time = start_time
        if end_time is not None:
            block.end_time = end_time
        if notes is not None:
            block.notes = notes

        # Validate times if both are set
        if block.end_time <= block.start_time:
            raise ValueError("End time must be after start time")

        block.updated_at = datetime.utcnow()
        await db.flush()
        await db.refresh(block)

        return block

    @staticmethod
    async def delete_time_block(
        db: AsyncSession,
        block_id: str,
        user_id: str
    ) -> bool:
        """
        Delete a time block (soft delete).

        Args:
            db: Database session
            block_id: TimeBlock UUID
            user_id: User requesting deletion

        Returns:
            True if deleted
        """
        block = await TimeBlockService.get_time_block(db, block_id, user_id)

        if not block:
            return False

        block.is_active = False
        block.updated_at = datetime.utcnow()
        await db.flush()

        return True

    @staticmethod
    async def check_conflicts(
        db: AsyncSession,
        case_id: str,
        start_time: datetime,
        end_time: datetime,
        exclude_user_id: Optional[str] = None
    ) -> Tuple[bool, List[dict]]:
        """
        Check if a time window conflicts with other parent's time blocks.

        This is used by ARIA to warn about scheduling conflicts WITHOUT
        revealing what the other parent is doing.

        Args:
            db: Database session
            case_id: Case UUID
            start_time: Proposed event start
            end_time: Proposed event end
            exclude_user_id: Don't check this user's blocks (optional)

        Returns:
            Tuple of (has_conflicts: bool, conflicts: List[dict])

            Conflicts list contains:
            - type: "time_conflict"
            - severity: "medium"
            - message: Neutral warning (no details revealed)
        """
        # Normalize datetime objects (strip timezone for PostgreSQL)
        start_time = normalize_datetime(start_time)
        end_time = normalize_datetime(end_time)

        # Get all collections in this case (excluding the requester)
        collections_query = select(MyTimeCollection).where(
            MyTimeCollection.case_id == case_id,
            MyTimeCollection.is_active == True
        )

        if exclude_user_id:
            collections_query = collections_query.where(
                MyTimeCollection.owner_id != exclude_user_id
            )

        collections_result = await db.execute(collections_query)
        collections = collections_result.scalars().all()

        if not collections:
            return False, []

        collection_ids = [c.id for c in collections]

        # Check for time block conflicts
        # A conflict exists if: start_time < block.end_time AND end_time > block.start_time
        conflicts_result = await db.execute(
            select(TimeBlock).where(
                TimeBlock.collection_id.in_(collection_ids),
                TimeBlock.is_active == True,
                TimeBlock.start_time < end_time,
                TimeBlock.end_time > start_time
            )
        )

        conflicting_blocks = conflicts_result.scalars().all()

        if not conflicting_blocks:
            # Also check recurring blocks
            recurring_conflicts = await TimeBlockService._check_recurring_conflicts(
                db, collection_ids, start_time, end_time
            )
            if recurring_conflicts:
                conflicting_blocks = recurring_conflicts

        if conflicting_blocks:
            # ARIA warning - NEUTRAL, no details revealed
            conflicts = [{
                "type": "time_conflict",
                "severity": "medium",
                "message": "This time may create a scheduling conflict for the other parent.",
                "suggestion": "Consider proposing an alternate time window or confirming availability first.",
                "can_proceed": True  # Not blocking, just a warning
            }]
            return True, conflicts

        return False, []

    @staticmethod
    async def _check_recurring_conflicts(
        db: AsyncSession,
        collection_ids: List[str],
        start_time: datetime,
        end_time: datetime
    ) -> List[TimeBlock]:
        """
        Check if proposed time conflicts with recurring time blocks.

        Args:
            db: Database session
            collection_ids: Collections to check
            start_time: Proposed start
            end_time: Proposed end

        Returns:
            List of conflicting recurring TimeBlocks
        """
        # Get all recurring blocks in these collections
        result = await db.execute(
            select(TimeBlock).where(
                TimeBlock.collection_id.in_(collection_ids),
                TimeBlock.is_recurring == True,
                TimeBlock.is_active == True,
                or_(
                    TimeBlock.recurrence_end_date.is_(None),
                    TimeBlock.recurrence_end_date >= start_time.date()
                )
            )
        )
        recurring_blocks = result.scalars().all()

        conflicts = []

        for block in recurring_blocks:
            if TimeBlockService._does_recurring_block_conflict(
                block, start_time, end_time
            ):
                conflicts.append(block)

        return conflicts

    @staticmethod
    def _does_recurring_block_conflict(
        block: TimeBlock,
        start_time: datetime,
        end_time: datetime
    ) -> bool:
        """
        Check if a recurring time block conflicts with a time window.

        MVP Implementation:
        - Daily: Conflicts if time of day overlaps
        - Weekly: Conflicts if day of week matches AND time of day overlaps

        Args:
            block: Recurring TimeBlock
            start_time: Proposed start
            end_time: Proposed end

        Returns:
            True if conflict exists
        """
        if not block.is_recurring:
            return False

        # Check if recurrence has ended
        if block.recurrence_end_date and start_time.date() > block.recurrence_end_date:
            return False

        # Get time of day for comparison
        block_start_time = block.start_time.time()
        block_end_time = block.end_time.time()
        proposed_start_time = start_time.time()
        proposed_end_time = end_time.time()

        # Check time overlap
        time_overlaps = (
            proposed_start_time < block_end_time and
            proposed_end_time > block_start_time
        )

        if not time_overlaps:
            return False

        if block.recurrence_pattern == "daily":
            # Daily recurrence - conflicts every day
            return True

        elif block.recurrence_pattern == "weekly":
            # Weekly recurrence - check day of week
            if not block.recurrence_days:
                return False

            # 0 = Monday, 6 = Sunday
            day_of_week = start_time.weekday()
            return day_of_week in block.recurrence_days

        return False

    @staticmethod
    async def get_busy_periods_for_calendar(
        db: AsyncSession,
        case_id: str,
        other_parent_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[dict]:
        """
        Get neutral "busy" periods for calendar display.

        This is what the other parent sees on the calendar - just gray
        "busy" blocks with no details revealed.

        Args:
            db: Database session
            case_id: Case UUID
            other_parent_id: The other parent's user ID
            start_date: Calendar view start
            end_date: Calendar view end

        Returns:
            List of busy period dictionaries (for frontend display)
        """
        # Get other parent's collections
        collections_result = await db.execute(
            select(MyTimeCollection).where(
                MyTimeCollection.case_id == case_id,
                MyTimeCollection.owner_id == other_parent_id,
                MyTimeCollection.is_active == True
            )
        )
        collections = collections_result.scalars().all()

        if not collections:
            return []

        collection_ids = [c.id for c in collections]

        # Normalize dates for PostgreSQL (strip timezone)
        start_date = normalize_datetime(start_date)
        end_date = normalize_datetime(end_date)

        # Get time blocks in date range
        blocks_result = await db.execute(
            select(TimeBlock).where(
                TimeBlock.collection_id.in_(collection_ids),
                TimeBlock.is_active == True,
                TimeBlock.start_time < end_date,
                TimeBlock.end_time > start_date
            )
        )
        blocks = blocks_result.scalars().all()

        # Convert to neutral busy periods
        busy_periods = []
        for block in blocks:
            busy_periods.append({
                "start_time": block.start_time.isoformat(),
                "end_time": block.end_time.isoformat(),
                "label": "Busy",  # No details
                "color": "#94A3B8",  # Neutral gray
                "type": "busy",
                "details_hidden": True
            })

        # TODO: Expand recurring blocks within date range
        # For MVP, we'll just show the base block

        return busy_periods
