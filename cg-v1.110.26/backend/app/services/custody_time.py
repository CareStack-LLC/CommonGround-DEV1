"""
Custody Time Service - Tracks and calculates custody time statistics.

Manages daily custody records and generates parenting time reports
comparing actual vs agreed custody percentages.
"""

import uuid
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional, List, Dict, Any, Tuple
from zoneinfo import ZoneInfo
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.custody_day_record import CustodyDayRecord, DeterminationMethod
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.agreement import Agreement, AgreementSection
from app.models.child import Child
from app.models.family_file import FamilyFile
from app.models.clearfund import Obligation
from app.models.schedule import ScheduleEvent
from app.models.user import User, UserProfile

from app.utils.sentry_helpers import capture_error
logger = logging.getLogger(__name__)

# Default timezone for custody day determination
DEFAULT_TIMEZONE = "America/Los_Angeles"


def get_date_in_timezone(dt: datetime, tz_name: str) -> date:
    """
    Convert a datetime to a specific timezone and extract the date.

    This ensures custody days are recorded correctly based on when the
    exchange happened in the parent's local time, not UTC.

    For example, an exchange at 11 PM Pacific (7 AM UTC next day) should
    be recorded as the Pacific date, not the UTC date.

    Args:
        dt: The datetime to convert (assumed UTC if naive)
        tz_name: IANA timezone name (e.g., "America/Los_Angeles")

    Returns:
        Date in the specified timezone
    """
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        # Fall back to default timezone if invalid
        logger.warning(f"Invalid timezone '{tz_name}', using {DEFAULT_TIMEZONE}")
        tz = ZoneInfo(DEFAULT_TIMEZONE)

    # If datetime is naive, assume UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    # Convert to target timezone and get date
    local_dt = dt.astimezone(tz)
    return local_dt.date()


async def get_parent_timezone(db: AsyncSession, parent_id: str) -> str:
    """
    Get the timezone setting for a parent from their profile.

    Args:
        db: Database session
        parent_id: The user ID of the parent

    Returns:
        IANA timezone string (defaults to America/Los_Angeles)
    """
    result = await db.execute(
        select(UserProfile.timezone)
        .join(User, User.id == UserProfile.user_id)
        .where(User.id == parent_id)
    )
    tz = result.scalar_one_or_none()
    return tz or DEFAULT_TIMEZONE


# Schedule pattern to custody percentage mapping
# (parent_a_percentage, parent_b_percentage)
SCHEDULE_PATTERN_PERCENTAGES: Dict[str, Tuple[int, int]] = {
    "week_on_week_off": (50, 50),
    "alternating_weeks": (50, 50),
    "2-2-3": (50, 50),
    "5-2-2-5": (50, 50),
    "every_other_weekend": (71, 29),  # Primary parent ~5 days, other ~2 days per 14-day cycle
    "every_weekend": (71, 29),
    "primary_custody": (80, 20),
    "custom": (50, 50),  # Default assumption
}


class CustodyTimeService:
    """Service for managing custody time tracking and statistics."""

    # =========================================================================
    # Record Creation/Updates
    # =========================================================================

    @staticmethod
    async def get_or_create_day_record(
        db: AsyncSession,
        family_file_id: str,
        child_id: str,
        record_date: date
    ) -> CustodyDayRecord:
        """
        Get existing record for a day or create a new one.

        Args:
            db: Database session
            family_file_id: Family file ID
            child_id: Child ID
            record_date: Date of the record

        Returns:
            CustodyDayRecord (existing or newly created)
        """
        result = await db.execute(
            select(CustodyDayRecord).where(
                and_(
                    CustodyDayRecord.child_id == child_id,
                    CustodyDayRecord.record_date == record_date
                )
            )
        )
        record = result.scalar_one_or_none()

        if not record:
            record = CustodyDayRecord(
                id=str(uuid.uuid4()),
                family_file_id=family_file_id,
                child_id=child_id,
                record_date=record_date,
                determination_method=DeterminationMethod.SCHEDULED.value,
            )
            db.add(record)
        else:
            # Force update to trigger realtime events (Supabase listens to UPDATE)
            record.updated_at = datetime.utcnow()

        return record

    @staticmethod
    async def update_custody_from_exchange(
        db: AsyncSession,
        exchange_instance: CustodyExchangeInstance
    ) -> Optional[CustodyDayRecord]:
        """
        Update custody record when an exchange check-in completes.

        Called from check_in() methods in custody_exchange service.
        Sets the receiving parent as the custodial parent for that day.

        Args:
            db: Database session
            exchange_instance: The exchange instance that was checked in

        Returns:
            Updated CustodyDayRecord or None if exchange incomplete
        """
        # Both parents must check in for custody transfer to be recorded
        if not (exchange_instance.from_parent_checked_in and exchange_instance.to_parent_checked_in):
            return None

        exchange = exchange_instance.exchange
        if not exchange:
            # Load the exchange if not already loaded
            result = await db.execute(
                select(CustodyExchange).where(CustodyExchange.id == exchange_instance.exchange_id)
            )
            exchange = result.scalar_one_or_none()
            if not exchange:
                return None

        # Get family file ID
        family_file_id = exchange.family_file_id or exchange.case_id

        # Get child IDs from exchange
        child_ids = []
        if exchange.child_ids:
            child_ids = exchange.child_ids if isinstance(exchange.child_ids, list) else [exchange.child_ids]

        # Determine record date in the receiving parent's timezone
        # This ensures custody is recorded on the correct calendar day
        # (e.g., 11 PM Pacific exchange is recorded as that Pacific date, not UTC next day)
        to_parent_tz = await get_parent_timezone(db, exchange.to_parent_id)
        if isinstance(exchange_instance.scheduled_time, datetime):
            record_date = get_date_in_timezone(exchange_instance.scheduled_time, to_parent_tz)
        else:
            record_date = exchange_instance.scheduled_time

        records = []
        for child_id in child_ids:
            record = await CustodyTimeService.get_or_create_day_record(
                db, family_file_id, child_id, record_date
            )

            # The "to_parent" receives custody after exchange
            record.custodial_parent_id = exchange.to_parent_id
            record.determination_method = DeterminationMethod.EXCHANGE_COMPLETED.value
            record.source_exchange_instance_id = exchange_instance.id
            record.confidence_score = 100  # Confirmed via check-in

            records.append(record)

        await db.flush()
        return records[0] if records else None

    @staticmethod
    async def update_custody_from_checkin(
        db: AsyncSession,
        family_file_id: str,
        child_id: str,
        parent_id: str,
        record_date: date,
        exchange_instance_id: Optional[str] = None
    ) -> CustodyDayRecord:
        """
        Update custody record from a check-in action.

        Args:
            db: Database session
            family_file_id: Family file ID
            child_id: Child ID
            parent_id: Parent who checked in (now has custody)
            record_date: Date of check-in
            exchange_instance_id: Optional exchange instance ID

        Returns:
            Updated CustodyDayRecord
        """
        record = await CustodyTimeService.get_or_create_day_record(
            db, family_file_id, child_id, record_date
        )

        record.custodial_parent_id = parent_id
        record.determination_method = DeterminationMethod.CHECK_IN.value
        record.source_exchange_instance_id = exchange_instance_id
        record.confidence_score = 100

        await db.flush()
        return record

    @staticmethod
    async def set_manual_override(
        db: AsyncSession,
        family_file_id: str,
        child_id: str,
        parent_id: str,
        override_by: str,
        record_date: Optional[date] = None,
        reason: Optional[str] = None
    ) -> CustodyDayRecord:
        """
        Manually set custody for a day (e.g., "With Me" button).

        Args:
            db: Database session
            family_file_id: Family file ID
            child_id: Child ID
            parent_id: Parent who now has custody
            override_by: User who made the override
            record_date: Date (defaults to today in override user's timezone)
            reason: Optional reason for override

        Returns:
            Updated CustodyDayRecord
        """
        if record_date is None:
            # Use the override user's timezone for "today" determination
            user_tz = await get_parent_timezone(db, override_by)
            record_date = get_date_in_timezone(datetime.now(timezone.utc), user_tz)

        record = await CustodyTimeService.get_or_create_day_record(
            db, family_file_id, child_id, record_date
        )

        record.custodial_parent_id = parent_id
        record.determination_method = DeterminationMethod.MANUAL_OVERRIDE.value
        record.override_by = override_by
        record.override_at = datetime.utcnow()
        record.override_reason = reason
        record.confidence_score = 100

        await db.flush()
        return record

    # =========================================================================
    # Statistics Calculation
    # =========================================================================

    @staticmethod
    async def get_custody_time_stats(
        db: AsyncSession,
        family_file_id: str,
        child_id: str,
        start_date: date,
        end_date: date,
        parent_a_id: str,
        parent_b_id: str
    ) -> Dict[str, Any]:
        """
        Calculate custody time statistics for a child over a date range.

        Args:
            db: Database session
            family_file_id: Family file ID
            child_id: Child ID
            start_date: Start of period
            end_date: End of period
            parent_a_id: First parent's user ID
            parent_b_id: Second parent's user ID

        Returns:
            Dictionary with custody statistics
        """
        total_days = (end_date - start_date).days + 1

        # Get all records for the period
        result = await db.execute(
            select(CustodyDayRecord).where(
                and_(
                    CustodyDayRecord.child_id == child_id,
                    CustodyDayRecord.record_date >= start_date,
                    CustodyDayRecord.record_date <= end_date
                )
            )
        )
        records = result.scalars().all()

        # Count days per parent
        parent_a_days = sum(1 for r in records if r.custodial_parent_id == parent_a_id)
        parent_b_days = sum(1 for r in records if r.custodial_parent_id == parent_b_id)
        unknown_days = total_days - len(records)

        # Calculate percentages based on total days (not recorded days)
        # This ensures unknown days are properly reflected in percentages
        # and avoids inflating percentages during gaps in tracking
        recorded_days = len(records)
        if total_days > 0:
            parent_a_percentage = round((parent_a_days / total_days) * 100, 1)
            parent_b_percentage = round((parent_b_days / total_days) * 100, 1)
            unknown_percentage = round((unknown_days / total_days) * 100, 1)
        else:
            parent_a_percentage = 0
            parent_b_percentage = 0
            unknown_percentage = 0

        # Determination method breakdown for court evidence
        determination_methods: Dict[str, int] = {}
        confidence_scores: list = []
        for r in records:
            method = r.determination_method or "unknown"
            determination_methods[method] = determination_methods.get(method, 0) + 1
            if r.confidence_score is not None:
                confidence_scores.append(r.confidence_score)

        avg_confidence = round(sum(confidence_scores) / len(confidence_scores), 1) if confidence_scores else 0

        return {
            "total_days": total_days,
            "recorded_days": recorded_days,
            "unknown_days": unknown_days,
            "unknown_percentage": unknown_percentage,
            "parent_a": {
                "user_id": parent_a_id,
                "days": parent_a_days,
                "percentage": parent_a_percentage,
            },
            "parent_b": {
                "user_id": parent_b_id,
                "days": parent_b_days,
                "percentage": parent_b_percentage,
            },
            "determination_methods": determination_methods,
            "avg_confidence_score": avg_confidence,
        }

    @staticmethod
    async def get_agreed_schedule_percentages(
        db: AsyncSession,
        family_file_id: str
    ) -> Tuple[Optional[str], int, int]:
        """
        Get agreed custody percentages from active agreement.

        Args:
            db: Database session
            family_file_id: Family file ID

        Returns:
            Tuple of (schedule_pattern, parent_a_percentage, parent_b_percentage)
        """
        # Find active agreement with parenting schedule section
        result = await db.execute(
            select(AgreementSection)
            .join(Agreement)
            .where(
                and_(
                    Agreement.family_file_id == family_file_id,
                    Agreement.status == "active",
                    AgreementSection.section_type == "parenting_schedule"
                )
            )
            .order_by(Agreement.created_at.desc())
            .limit(1)
        )
        section = result.scalar_one_or_none()

        if not section or not section.structured_data:
            return None, 50, 50  # Default to 50/50

        data = section.structured_data
        schedule_pattern = data.get("schedule_pattern", "custom")

        # Check for explicit percentages in agreement first (custom or court-ordered)
        explicit_a = data.get("parent_a_percentage")
        explicit_b = data.get("parent_b_percentage")
        if explicit_a is not None and explicit_b is not None:
            try:
                pct_a = int(explicit_a)
                pct_b = int(explicit_b)
                if 0 <= pct_a <= 100 and 0 <= pct_b <= 100:
                    return schedule_pattern, pct_a, pct_b
            except (ValueError, TypeError):
                pass  # Fall through to pattern lookup

        # Also check physical_custody section for explicit percentages
        phys_result = await db.execute(
            select(AgreementSection)
            .join(Agreement)
            .where(
                and_(
                    Agreement.family_file_id == family_file_id,
                    Agreement.status == "active",
                    AgreementSection.section_type == "physical_custody"
                )
            )
            .order_by(Agreement.created_at.desc())
            .limit(1)
        )
        phys_section = phys_result.scalar_one_or_none()
        if phys_section and phys_section.structured_data:
            phys_data = phys_section.structured_data
            phys_a = phys_data.get("parent_a_percentage")
            phys_b = phys_data.get("parent_b_percentage")
            if phys_a is not None and phys_b is not None:
                try:
                    pct_a = int(phys_a)
                    pct_b = int(phys_b)
                    if 0 <= pct_a <= 100 and 0 <= pct_b <= 100:
                        return schedule_pattern, pct_a, pct_b
                except (ValueError, TypeError):
                    pass

        # Fall back to schedule pattern lookup
        percentages = SCHEDULE_PATTERN_PERCENTAGES.get(schedule_pattern, (50, 50))

        return schedule_pattern, percentages[0], percentages[1]

    @staticmethod
    async def compare_actual_vs_agreed(
        db: AsyncSession,
        family_file_id: str,
        child_id: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Compare actual custody time vs agreed schedule.

        Args:
            db: Database session
            family_file_id: Family file ID
            child_id: Child ID
            start_date: Start of period
            end_date: End of period

        Returns:
            Comparison statistics including variance
        """
        # Get family file to identify parents
        result = await db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        family_file = result.scalar_one_or_none()
        if not family_file:
            raise ValueError(f"Family file {family_file_id} not found")

        parent_a_id = family_file.parent_a_id
        parent_b_id = family_file.parent_b_id

        # Get actual stats
        actual_stats = await CustodyTimeService.get_custody_time_stats(
            db, family_file_id, child_id, start_date, end_date, parent_a_id, parent_b_id
        )

        # Get agreed percentages
        schedule_pattern, agreed_a_pct, agreed_b_pct = await CustodyTimeService.get_agreed_schedule_percentages(
            db, family_file_id
        )

        # Calculate variance
        variance_a = round(actual_stats["parent_a"]["percentage"] - agreed_a_pct, 1)
        variance_b = round(actual_stats["parent_b"]["percentage"] - agreed_b_pct, 1)

        # Generate summary
        if abs(variance_a) <= 5:
            summary = "Custody time closely matches the agreed schedule."
        elif variance_a > 0:
            summary = f"Parent A has {abs(variance_a)}% more time than agreed."
        else:
            summary = f"Parent B has {abs(variance_b)}% more time than agreed."

        # Get child info
        child_result = await db.execute(
            select(Child).where(Child.id == child_id)
        )
        child = child_result.scalar_one_or_none()

        return {
            "child_id": child_id,
            "child_name": child.display_name if child else "Unknown",
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
            **actual_stats,
            "agreed_schedule": {
                "pattern": schedule_pattern,
                "parent_a_percentage": agreed_a_pct,
                "parent_b_percentage": agreed_b_pct,
            },
            "variance": {
                "parent_a": variance_a,
                "parent_b": variance_b,
            },
            "comparison_summary": summary,
        }

    @staticmethod
    async def get_family_custody_stats(
        db: AsyncSession,
        family_file_id: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Get custody statistics for all children in a family file.

        Args:
            db: Database session
            family_file_id: Family file ID
            start_date: Start of period
            end_date: End of period

        Returns:
            Statistics for all children
        """
        # Get family file and children
        result = await db.execute(
            select(FamilyFile)
            .options(selectinload(FamilyFile.children))
            .where(FamilyFile.id == family_file_id)
        )
        family_file = result.scalar_one_or_none()
        if not family_file:
            raise ValueError(f"Family file {family_file_id} not found")

        children_stats = []
        for child in family_file.children:
            if child.is_active:
                stats = await CustodyTimeService.compare_actual_vs_agreed(
                    db, family_file_id, child.id, start_date, end_date
                )
                children_stats.append(stats)

        # Calculate overall summary
        total_variance_a = sum(s["variance"]["parent_a"] for s in children_stats) / len(children_stats) if children_stats else 0

        if abs(total_variance_a) <= 5:
            overall_summary = "Custody time closely matches the agreed schedule across all children."
        elif total_variance_a > 0:
            overall_summary = f"Overall, Parent A has about {abs(round(total_variance_a, 1))}% more time than agreed."
        else:
            overall_summary = f"Overall, Parent B has about {abs(round(total_variance_a, 1))}% more time than agreed."

        return {
            "family_file_id": family_file_id,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "total_days": (end_date - start_date).days + 1,
            },
            "parent_a_id": family_file.parent_a_id,
            "parent_b_id": family_file.parent_b_id,
            "children": children_stats,
            "summary": overall_summary,
        }

    # =========================================================================
    # Report Generation
    # =========================================================================

    @staticmethod
    async def generate_parenting_report(
        db: AsyncSession,
        family_file_id: str,
        start_date: date,
        end_date: date,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Generate comprehensive parenting report.

        Includes custody time, exchanges, events, and expenses.

        Args:
            db: Database session
            family_file_id: Family file ID
            start_date: Report start date
            end_date: Report end date
            user_id: User generating the report

        Returns:
            Complete parenting report
        """
        # Get custody stats
        custody_stats = await CustodyTimeService.get_family_custody_stats(
            db, family_file_id, start_date, end_date
        )

        # Get exchange statistics
        exchange_result = await db.execute(
            select(CustodyExchangeInstance)
            .join(CustodyExchange)
            .where(
                and_(
                    or_(
                        CustodyExchange.case_id == family_file_id,
                        CustodyExchange.family_file_id == family_file_id
                    ),
                    CustodyExchangeInstance.scheduled_time >= datetime.combine(start_date, datetime.min.time()),
                    CustodyExchangeInstance.scheduled_time <= datetime.combine(end_date, datetime.max.time())
                )
            )
        )
        exchanges = exchange_result.scalars().all()

        total_exchanges = len(exchanges)
        completed_exchanges = sum(1 for e in exchanges if e.status == "completed")
        missed_exchanges = sum(1 for e in exchanges if e.status in ["missed", "cancelled"])

        # Calculate Real-Time Compliance
        real_time_stats = await CustodyTimeService.calculate_real_time_compliance(
            db, family_file_id, start_date, end_date
        )

        # Get event statistics
        event_result = await db.execute(
            select(ScheduleEvent).where(
                and_(
                    ScheduleEvent.case_id == family_file_id,
                    ScheduleEvent.start_time >= datetime.combine(start_date, datetime.min.time()),
                    ScheduleEvent.start_time <= datetime.combine(end_date, datetime.max.time())
                )
            )
        )
        events = event_result.scalars().all()

        events_by_category: Dict[str, int] = {}
        for event in events:
            category = event.event_category or "other"
            events_by_category[category] = events_by_category.get(category, 0) + 1

        # Get expense statistics (ClearFund)
        expense_result = await db.execute(
            select(Obligation).where(
                and_(
                    Obligation.family_file_id == family_file_id,
                    Obligation.created_at >= datetime.combine(start_date, datetime.min.time()),
                    Obligation.created_at <= datetime.combine(end_date, datetime.max.time())
                )
            )
        )
        expenses = expense_result.scalars().all()

        total_expenses = len(expenses)
        total_amount = sum(float(e.total_amount or 0) for e in expenses)
        approved_count = sum(1 for e in expenses if e.status == "approved")

        return {
            "family_file_id": family_file_id,
            "generated_at": datetime.utcnow().isoformat(),
            "generated_by": user_id,
            "report_period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "total_days": (end_date - start_date).days + 1,
            },
            "report_period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "total_days": (end_date - start_date).days + 1,
            },
            "custody_time": custody_stats,
            "real_time_stats": real_time_stats,
            "exchanges": {
                "total_scheduled": total_exchanges,
                "completed": completed_exchanges,
                "missed": missed_exchanges,
                "completion_rate": round((completed_exchanges / total_exchanges) * 100, 1) if total_exchanges > 0 else 100.0,
            },
            "events": {
                "total_events": len(events),
                "by_category": events_by_category,
            },
            "expenses": {
                "total_expenses": total_expenses,
                "total_amount": round(total_amount, 2),
                "approved_count": approved_count,
            },
        }

    # =========================================================================
    # Data Migration / Backfill
    # =========================================================================

    @staticmethod
    async def backfill_from_schedule(
        db: AsyncSession,
        family_file_id: str,
        child_id: str,
        start_date: date,
        end_date: date
    ) -> int:
        """
        Backfill custody records from agreed schedule pattern.

        Used to populate historical records when no check-ins exist.
        Records are marked with lower confidence score (80).

        Args:
            db: Database session
            family_file_id: Family file ID
            child_id: Child ID
            start_date: Start date for backfill
            end_date: End date for backfill

        Returns:
            Number of records created
        """
        # Get family file
        result = await db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        family_file = result.scalar_one_or_none()
        if not family_file:
            return 0

        # Get schedule pattern
        schedule_pattern, _, _ = await CustodyTimeService.get_agreed_schedule_percentages(
            db, family_file_id
        )

        created_count = 0
        current_date = start_date

        # Determine starting parent based on a reference date
        # For simplicity, we'll alternate based on week number
        reference_date = date(2026, 1, 1)  # A known reference point

        while current_date <= end_date:
            # Check if record already exists
            existing = await db.execute(
                select(CustodyDayRecord).where(
                    and_(
                        CustodyDayRecord.child_id == child_id,
                        CustodyDayRecord.record_date == current_date
                    )
                )
            )
            if existing.scalar_one_or_none():
                current_date += timedelta(days=1)
                continue

            # Determine custody based on schedule pattern
            weeks_since_ref = (current_date - reference_date).days // 7
            day_of_week = current_date.weekday()  # 0=Monday, 6=Sunday

            # Calculate custodial parent based on pattern
            custodial_parent_id = None

            if schedule_pattern in ["week_on_week_off", "alternating_weeks"]:
                # Alternating weeks
                custodial_parent_id = family_file.parent_a_id if weeks_since_ref % 2 == 0 else family_file.parent_b_id

            elif schedule_pattern == "2-2-3":
                # 2-2-3: Mon-Tue A, Wed-Thu B, Fri-Sun alternates weekly
                if day_of_week in [0, 1]:  # Mon, Tue
                    custodial_parent_id = family_file.parent_a_id
                elif day_of_week in [2, 3]:  # Wed, Thu
                    custodial_parent_id = family_file.parent_b_id
                else:  # Fri, Sat, Sun - alternates
                    custodial_parent_id = family_file.parent_a_id if weeks_since_ref % 2 == 0 else family_file.parent_b_id

            elif schedule_pattern == "every_other_weekend":
                # Primary parent weekdays, other parent every other weekend
                if day_of_week in [5, 6] and weeks_since_ref % 2 == 0:  # Sat, Sun on alternating weeks
                    custodial_parent_id = family_file.parent_b_id
                else:
                    custodial_parent_id = family_file.parent_a_id

            else:
                # Default: alternate by week
                custodial_parent_id = family_file.parent_a_id if weeks_since_ref % 2 == 0 else family_file.parent_b_id

            # Create record
            record = CustodyDayRecord(
                id=str(uuid.uuid4()),
                family_file_id=family_file_id,
                child_id=child_id,
                record_date=current_date,
                custodial_parent_id=custodial_parent_id,
                determination_method=DeterminationMethod.BACKFILLED.value,
                confidence_score=80,  # Lower confidence for backfilled records
            )
            db.add(record)
            created_count += 1

            current_date += timedelta(days=1)

        await db.flush()
        return created_count

    @staticmethod
    async def backfill_from_completed_exchanges(
        db: AsyncSession,
        family_file_id: str
    ) -> int:
        """
        Backfill custody records from completed exchange instances.

        Processes historical exchanges to create day records.

        Args:
            db: Database session
            family_file_id: Family file ID

        Returns:
            Number of records updated
        """
        # Get all completed exchanges for this family
        result = await db.execute(
            select(CustodyExchangeInstance)
            .join(CustodyExchange)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .where(
                and_(
                    or_(
                        CustodyExchange.case_id == family_file_id,
                        CustodyExchange.family_file_id == family_file_id
                    ),
                    CustodyExchangeInstance.status == "completed"
                )
            )
            .order_by(CustodyExchangeInstance.scheduled_time)
        )
        instances = result.scalars().all()

        updated_count = 0
        for instance in instances:
            record = await CustodyTimeService.update_custody_from_exchange(db, instance)
            if record:
                updated_count += 1

        return updated_count

    # =========================================================================
    # Real-Time Custody Tracking (Minute-Level Precision)
    # =========================================================================

    @staticmethod
    async def get_custody_timeline(
        db: AsyncSession,
        family_file_id: str,
        start_date: date,
        end_date: date,
        child_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate a chronological timeline of custody sessions.

        Sessions are built from two complementary sources:

        1. **Completed exchange instances** — minute-level accuracy, highest
           confidence. A session is the duration between two completed
           exchanges.
        2. **Custody day records** — fallback for days not covered by any
           exchange session. These come from schedule projections, check-ins,
           or manual overrides, each carrying its own ``determination_method``
           and ``confidence_score``. Emitted as day-long synthetic sessions
           so the timeline feels continuous to the user.

        Days with *neither* a session nor a day record are reported as
        ``data_gaps`` so the UI can tell the user what's missing and why —
        this is the difference between a hidden "29 untracked days" banner
        and a concrete "no check-in or schedule projection on these dates"
        explanation.

        Args:
            db: Database session
            family_file_id: Family file ID
            start_date: Start of calculation period
            end_date: End of calculation period
            child_id: Optional child filter for day-record lookup. When
                provided, day records are scoped to this child; when None,
                all children in the family are considered (any record counts
                as coverage).

        Returns::

            {
              "sessions": [...],        # minute-level + day-record synthetic
              "data_gaps": [...],       # days with no signal of any kind
              "quality_score": int,     # 0-100, see ADR-001
            }
        """
        # 1. Fetch completed exchanges in the period (plus one before to establish start state)
        # We need the last exchange BEFORE the start_date to know who started with custody
        past_exchange_result = await db.execute(
            select(CustodyExchangeInstance)
            .join(CustodyExchange)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .where(
                and_(
                    or_(
                        CustodyExchange.case_id == family_file_id,
                        CustodyExchange.family_file_id == family_file_id
                    ),
                    CustodyExchangeInstance.status == "completed",
                    CustodyExchangeInstance.completed_at < datetime.combine(start_date, datetime.min.time())
                )
            )
            .order_by(CustodyExchangeInstance.completed_at.desc())
            .limit(1)
        )
        last_prior_exchange = past_exchange_result.scalar_one_or_none()

        # Fetch all completed exchanges DURING the period
        period_exchange_result = await db.execute(
            select(CustodyExchangeInstance)
            .join(CustodyExchange)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .where(
                and_(
                    or_(
                        CustodyExchange.case_id == family_file_id,
                        CustodyExchange.family_file_id == family_file_id
                    ),
                    CustodyExchangeInstance.status == "completed",
                    CustodyExchangeInstance.completed_at >= datetime.combine(start_date, datetime.min.time()),
                    CustodyExchangeInstance.completed_at <= datetime.combine(end_date, datetime.max.time())
                )
            )
            .order_by(CustodyExchangeInstance.completed_at)
        )
        period_exchanges = period_exchange_result.scalars().all()

        # Combine for processing
        all_relevant_exchanges = []
        if last_prior_exchange:
            all_relevant_exchanges.append(last_prior_exchange)
        all_relevant_exchanges.extend(period_exchanges)

        sessions = []
        period_start_dt = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        period_end_dt = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
        now = datetime.utcnow().replace(tzinfo=timezone.utc)

        # If no exchanges at all, we still need to return the canonical
        # {sessions, data_gaps, quality_score} shape — all zero/empty. The
        # rest of the function (the day-record fallback and gap filler)
        # runs unconditionally below so the caller can see exactly which
        # days are missing and why.
        if not all_relevant_exchanges:
            all_relevant_exchanges = []

        # 2. Iterate through exchanges to build sessions
        for i in range(len(all_relevant_exchanges)):
            current_exchange = all_relevant_exchanges[i]

            # `selectinload` above should always populate `.exchange`; if
            # for any reason it didn't, skip rather than crash.
            if not current_exchange.exchange:
                logger.warning(
                    "custody_timeline: exchange_instance %s has no exchange row; skipping",
                    current_exchange.id,
                )
                continue

            custodial_parent_id = current_exchange.exchange.to_parent_id

            # Court-evidence rule: an exchange with no `to_parent_id` cannot
            # be attributed to a custodial parent. We skip it (and log a
            # warning + an audit breadcrumb in the response's `data_gaps`
            # list — callers can surface that to the UI). Emitting a
            # session with `parent_id=None` would 500 via Pydantic and
            # ALSO silently pollute court exports with invalid data.
            if not custodial_parent_id:
                logger.warning(
                    "custody_timeline: exchange_instance %s completed with "
                    "NULL to_parent_id on exchange %s; skipping session — "
                    "data gap for this period",
                    current_exchange.id,
                    current_exchange.exchange.id,
                )
                continue

            session_start = current_exchange.completed_at.replace(tzinfo=timezone.utc)

            # Determine session end
            if i < len(all_relevant_exchanges) - 1:
                next_exchange = all_relevant_exchanges[i + 1]
                if next_exchange.completed_at is None:
                    # Scheduled-but-not-completed row leaked in somehow —
                    # fall through to "session until now" below.
                    session_end = min(now, period_end_dt)
                else:
                    session_end = next_exchange.completed_at.replace(tzinfo=timezone.utc)
            else:
                # If this is the last exchange, the session goes until NOW (or period end)
                session_end = min(now, period_end_dt)

            # 3. Clip session to requested date range
            effective_start = max(session_start, period_start_dt)
            effective_end = min(session_end, period_end_dt)

            if effective_end > effective_start:
                duration_seconds = (effective_end - effective_start).total_seconds()
                duration_minutes = duration_seconds / 60

                sessions.append({
                    "parent_id": custodial_parent_id,
                    "start_time": effective_start,
                    "end_time": effective_end,
                    "duration_minutes": round(duration_minutes, 1),
                    "is_current": (i == len(all_relevant_exchanges) - 1) and (session_end == now),
                    # Evidence source for this session — lets the UI tag
                    # court-grade (exchange_completed) vs lower-confidence
                    # (scheduled/backfilled) attributions distinctly.
                    "source": "exchange_completed",
                    "confidence_score": 100,
                })

        # =====================================================================
        # 2. Fill gaps with CustodyDayRecord fallback
        # =====================================================================
        # Build a set of days already covered by exchange-based sessions.
        # A session starting on day X and ending day Y covers [X..Y].
        covered_days: set[date] = set()
        for sess in sessions:
            d = sess["start_time"].date()
            end_d = sess["end_time"].date()
            while d <= end_d:
                covered_days.add(d)
                d += timedelta(days=1)

        # Load CustodyDayRecord rows for the same period.
        record_filters = [
            CustodyDayRecord.family_file_id == family_file_id,
            CustodyDayRecord.record_date >= start_date,
            CustodyDayRecord.record_date <= end_date,
        ]
        if child_id:
            record_filters.append(CustodyDayRecord.child_id == child_id)
        record_result = await db.execute(
            select(CustodyDayRecord).where(and_(*record_filters))
            .order_by(CustodyDayRecord.record_date)
        )
        day_records = record_result.scalars().all()

        # Group by date — if multiple children produce multiple records per
        # date, take the first one (all children in a family typically share
        # a custodial parent on a given day; this is a display approximation).
        records_by_date: Dict[date, CustodyDayRecord] = {}
        for rec in day_records:
            if rec.record_date not in records_by_date and rec.custodial_parent_id:
                records_by_date[rec.record_date] = rec

        # Emit synthetic day-long sessions for days covered only by records.
        for rec_date, rec in records_by_date.items():
            if rec_date in covered_days:
                continue
            day_start = datetime.combine(rec_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            day_end = datetime.combine(rec_date, datetime.max.time()).replace(tzinfo=timezone.utc)
            # Clip to period boundaries
            eff_start = max(day_start, period_start_dt)
            eff_end = min(day_end, period_end_dt, now if rec_date == now.date() else day_end)
            if eff_end <= eff_start:
                continue
            duration_minutes = (eff_end - eff_start).total_seconds() / 60
            sessions.append({
                "parent_id": rec.custodial_parent_id,
                "start_time": eff_start,
                "end_time": eff_end,
                "duration_minutes": round(duration_minutes, 1),
                "is_current": False,
                "source": rec.determination_method or "day_record",
                "confidence_score": rec.confidence_score if rec.confidence_score is not None else 50,
            })
            covered_days.add(rec_date)

        # =====================================================================
        # 3. Data gaps: days in range with no session and no day record
        # =====================================================================
        data_gaps: List[Dict[str, Any]] = []
        day = start_date
        while day <= end_date:
            if day not in covered_days:
                data_gaps.append({
                    "date": day.isoformat(),
                    "reason": "no_signal",
                    "description": (
                        "No check-in, completed exchange, or schedule "
                        "projection recorded for this day."
                    ),
                })
            day += timedelta(days=1)

        # =====================================================================
        # 4. Data quality score
        # =====================================================================
        # High confidence = came from an exchange completion, check-in, or
        # manual override; also any record with confidence_score >= 90.
        total_days_in_range = (end_date - start_date).days + 1
        high_confidence_days = 0
        for d in covered_days:
            # Find a source for this day (exchange session wins over record)
            covered_by_exchange = any(
                s["start_time"].date() <= d <= s["end_time"].date()
                and s["source"] == "exchange_completed"
                for s in sessions
            )
            if covered_by_exchange:
                high_confidence_days += 1
                continue
            rec = records_by_date.get(d)
            if rec is None:
                continue
            if rec.determination_method in (
                DeterminationMethod.CHECK_IN.value,
                DeterminationMethod.EXCHANGE_COMPLETED.value,
                DeterminationMethod.MANUAL_OVERRIDE.value,
            ) or (rec.confidence_score is not None and rec.confidence_score >= 90):
                high_confidence_days += 1

        quality_score = (
            round(100 * high_confidence_days / total_days_in_range)
            if total_days_in_range > 0 else 0
        )

        # Sort sessions chronologically so the UI renders them in order
        # regardless of which bucket (exchange vs record) they came from.
        sessions.sort(key=lambda s: s["start_time"])

        return {
            "sessions": sessions,
            "data_gaps": data_gaps,
            "quality_score": quality_score,
        }

    @staticmethod
    async def calculate_real_time_compliance(
        db: AsyncSession,
        family_file_id: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Calculate compliance percentages based on actual minute-by-minute custody time.

        Args:
            db: Database session
            family_file_id: Family file ID
            start_date: Start date
            end_date: End date

        Returns:
            Dictionary with minutes and percentages per parent
        """
        # Always return a Pydantic-valid shape. Returning `{}` used to
        # break `RealTimeComplianceStats` validation at the endpoint
        # layer and turn "no data" into an HTTP 500. For a feature that
        # has to be trusted in court, empty must mean "zero minutes,
        # marked incomplete" — never "server crashed."
        empty_stats: Dict[str, Any] = {
            "total_tracked_minutes": 0,
            "parent_a": {
                "user_id": None,
                "minutes": 0,
                "percentage": 0,
                "agreed_percentage": 0,
                "variance": 0,
            },
            "parent_b": {
                "user_id": None,
                "minutes": 0,
                "percentage": 0,
                "agreed_percentage": 0,
                "variance": 0,
            },
            "is_real_time": True,
        }

        # Get family file to identify parents
        result = await db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        family_file = result.scalar_one_or_none()
        if not family_file:
            return empty_stats

        timeline = await CustodyTimeService.get_custody_timeline(
            db, family_file_id, start_date, end_date
        )
        sessions = timeline["sessions"]

        total_minutes = sum(s["duration_minutes"] for s in sessions)
        parent_a_minutes = sum(s["duration_minutes"] for s in sessions if s["parent_id"] == family_file.parent_a_id)
        parent_b_minutes = sum(s["duration_minutes"] for s in sessions if s["parent_id"] == family_file.parent_b_id)

        if total_minutes > 0:
            parent_a_pct = round((parent_a_minutes / total_minutes) * 100, 1)
            parent_b_pct = round((parent_b_minutes / total_minutes) * 100, 1)
        else:
            parent_a_pct = 0
            parent_b_pct = 0

        # Get agreed percentages for comparison
        _, agreed_a, agreed_b = await CustodyTimeService.get_agreed_schedule_percentages(db, family_file_id)

        return {
            "total_tracked_minutes": total_minutes,
            "parent_a": {
                "user_id": family_file.parent_a_id,
                "minutes": parent_a_minutes,
                "percentage": parent_a_pct,
                "agreed_percentage": agreed_a,
                "variance": round(parent_a_pct - agreed_a, 1)
            },
            "parent_b": {
                "user_id": family_file.parent_b_id,
                "minutes": parent_b_minutes,
                "percentage": parent_b_pct,
                "agreed_percentage": agreed_b,
                "variance": round(parent_b_pct - agreed_b, 1)
            },
            "is_real_time": True
        }


# Helper function to calculate date ranges for periods
def get_period_dates(period: str) -> Tuple[date, date]:
    """
    Calculate start and end dates for a rolling period.

    Args:
        period: One of "30_days", "90_days", "ytd", "all_time"

    Returns:
        Tuple of (start_date, end_date)
    """
    today = datetime.utcnow().date()

    if period == "30_days":
        return today - timedelta(days=30), today
    elif period == "90_days":
        return today - timedelta(days=90), today
    elif period == "ytd":
        return date(today.year, 1, 1), today
    elif period == "all_time":
        return date(2020, 1, 1), today  # Reasonable start for the platform
    else:
        # Default to 30 days
        return today - timedelta(days=30), today
