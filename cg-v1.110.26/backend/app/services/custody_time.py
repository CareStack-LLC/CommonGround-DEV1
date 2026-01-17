"""
Custody Time Service - Tracks and calculates custody time statistics.

Manages daily custody records and generates parenting time reports
comparing actual vs agreed custody percentages.
"""

import uuid
import logging
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
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

logger = logging.getLogger(__name__)


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

        record_date = exchange_instance.scheduled_date.date() if isinstance(
            exchange_instance.scheduled_date, datetime
        ) else exchange_instance.scheduled_date

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
            record_date: Date (defaults to today)
            reason: Optional reason for override

        Returns:
            Updated CustodyDayRecord
        """
        if record_date is None:
            record_date = date.today()

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

        # Calculate percentages based on recorded days
        recorded_days = len(records)
        if recorded_days > 0:
            parent_a_percentage = round((parent_a_days / recorded_days) * 100, 1)
            parent_b_percentage = round((parent_b_days / recorded_days) * 100, 1)
        else:
            parent_a_percentage = 0
            parent_b_percentage = 0

        return {
            "total_days": total_days,
            "recorded_days": recorded_days,
            "unknown_days": unknown_days,
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

        # Get percentages from mapping
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
                    CustodyExchangeInstance.scheduled_date >= start_date,
                    CustodyExchangeInstance.scheduled_date <= end_date
                )
            )
        )
        exchanges = exchange_result.scalars().all()

        total_exchanges = len(exchanges)
        completed_exchanges = sum(1 for e in exchanges if e.status == "completed")
        missed_exchanges = sum(1 for e in exchanges if e.status in ["missed", "cancelled"])

        # Get event statistics
        event_result = await db.execute(
            select(ScheduleEvent).where(
                and_(
                    ScheduleEvent.case_id == family_file_id,
                    ScheduleEvent.event_date >= start_date,
                    ScheduleEvent.event_date <= end_date
                )
            )
        )
        events = event_result.scalars().all()

        events_by_category: Dict[str, int] = {}
        for event in events:
            category = event.category or "other"
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
        total_amount = sum(float(e.amount or 0) for e in expenses)
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
            "custody_time": custody_stats,
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
            .order_by(CustodyExchangeInstance.scheduled_date)
        )
        instances = result.scalars().all()

        updated_count = 0
        for instance in instances:
            record = await CustodyTimeService.update_custody_from_exchange(db, instance)
            if record:
                updated_count += 1

        return updated_count


# Helper function to calculate date ranges for periods
def get_period_dates(period: str) -> Tuple[date, date]:
    """
    Calculate start and end dates for a rolling period.

    Args:
        period: One of "30_days", "90_days", "ytd", "all_time"

    Returns:
        Tuple of (start_date, end_date)
    """
    today = date.today()

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
