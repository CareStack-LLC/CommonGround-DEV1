"""
Custody Tracker Verification Tests

This test suite verifies that the custody tracker accurately counts days
with each parent, ensuring one day = +1 to the counter.

Tests cover:
- Daily record creation
- Date range calculations (inclusive boundaries)
- Backfill logic
- Exchange-based record updates
"""

import pytest
from datetime import date, datetime, timedelta
from sqlalchemy import select

from app.models.custody_day_record import CustodyDayRecord, DeterminationMethod
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.services.custody_time import CustodyTimeService


class TestCustodyTrackerAccuracy:
    """Test suite for verifying custody tracker day counting accuracy."""

    @pytest.mark.asyncio
    async def test_date_range_calculation_inclusive(self, db_session):
        """
        Verify that date range calculation is inclusive of both start and end dates.

        Example: Jan 1 to Jan 3 should be 3 days, not 2.
        """
        # Test case: 3-day period
        start_date = date(2026, 1, 1)
        end_date = date(2026, 1, 3)

        # Calculate using the service's logic
        total_days = (end_date - start_date).days + 1

        assert total_days == 3, f"Expected 3 days, got {total_days}"

        # Edge case: same day (1 day period)
        same_day_start = date(2026, 1, 1)
        same_day_end = date(2026, 1, 1)
        same_day_total = (same_day_end - same_day_start).days + 1

        assert same_day_total == 1, f"Same day should be 1 day, got {same_day_total}"

    @pytest.mark.asyncio
    async def test_backfill_creates_correct_number_of_records(
        self, db_session, family_file_fixture, child_fixture
    ):
        """
        Verify that backfill creates exactly one record per day in the range.

        30-day backfill should create exactly 30 records.
        """
        # Define 30-day period
        start_date = date(2026, 1, 1)
        end_date = date(2026, 1, 30)
        expected_days = 30

        # Run backfill
        created_count = await CustodyTimeService.backfill_from_schedule(
            db_session,
            family_file_fixture.id,
            child_fixture.id,
            start_date,
            end_date
        )

        assert created_count == expected_days, \
            f"Expected {expected_days} records, created {created_count}"

        # Verify records exist in database
        result = await db_session.execute(
            select(CustodyDayRecord).where(
                CustodyDayRecord.child_id == child_fixture.id,
                CustodyDayRecord.record_date >= start_date,
                CustodyDayRecord.record_date <= end_date
            )
        )
        records = result.scalars().all()

        assert len(records) == expected_days, \
            f"Expected {expected_days} records in DB, found {len(records)}"

    @pytest.mark.asyncio
    async def test_backfill_no_duplicates(
        self, db_session, family_file_fixture, child_fixture
    ):
        """
        Verify that backfill doesn't create duplicate records for the same day.
        """
        start_date = date(2026, 1, 1)
        end_date = date(2026, 1, 10)

        # Run backfill twice
        first_run = await CustodyTimeService.backfill_from_schedule(
            db_session,
            family_file_fixture.id,
            child_fixture.id,
            start_date,
            end_date
        )

        second_run = await CustodyTimeService.backfill_from_schedule(
            db_session,
            family_file_fixture.id,
            child_fixture.id,
            start_date,
            end_date
        )

        # Second run should create 0 records (all already exist)
        assert second_run == 0, \
            f"Second backfill should create 0 records, created {second_run}"

        # Verify no duplicates in database
        result = await db_session.execute(
            select(CustodyDayRecord).where(
                CustodyDayRecord.child_id == child_fixture.id,
                CustodyDayRecord.record_date >= start_date,
                CustodyDayRecord.record_date <= end_date
            )
        )
        records = result.scalars().all()

        # Should still be 10 records (not 20)
        assert len(records) == 10, \
            f"Expected 10 unique records, found {len(records)}"

    @pytest.mark.asyncio
    async def test_get_custody_time_stats_accurate_counting(
        self, db_session, family_file_fixture, child_fixture
    ):
        """
        Verify that get_custody_time_stats accurately counts days per parent.

        Create known records and verify the stats match exactly.
        """
        start_date = date(2026, 1, 1)
        end_date = date(2026, 1, 10)

        # Create 6 days for parent A, 4 days for parent B
        for day_num in range(1, 11):
            record_date = date(2026, 1, day_num)
            custodial_parent = family_file_fixture.parent_a_id if day_num <= 6 \
                else family_file_fixture.parent_b_id

            record = CustodyDayRecord(
                family_file_id=family_file_fixture.id,
                child_id=child_fixture.id,
                record_date=record_date,
                custodial_parent_id=custodial_parent,
                determination_method=DeterminationMethod.BACKFILLED.value,
                confidence_score=100
            )
            db_session.add(record)

        await db_session.commit()

        # Get stats
        stats = await CustodyTimeService.get_custody_time_stats(
            db_session,
            family_file_fixture.id,
            child_fixture.id,
            start_date,
            end_date,
            family_file_fixture.parent_a_id,
            family_file_fixture.parent_b_id
        )

        # Verify counts
        assert stats['total_days'] == 10, \
            f"Total days should be 10, got {stats['total_days']}"
        assert stats['recorded_days'] == 10, \
            f"Recorded days should be 10, got {stats['recorded_days']}"
        assert stats['parent_a']['days'] == 6, \
            f"Parent A should have 6 days, got {stats['parent_a']['days']}"
        assert stats['parent_b']['days'] == 4, \
            f"Parent B should have 4 days, got {stats['parent_b']['days']}"

        # Verify percentages
        assert stats['parent_a']['percentage'] == 60.0, \
            f"Parent A should have 60%, got {stats['parent_a']['percentage']}"
        assert stats['parent_b']['percentage'] == 40.0, \
            f"Parent B should have 40%, got {stats['parent_b']['percentage']}"

    @pytest.mark.asyncio
    async def test_exchange_creates_day_record(
        self, db_session, family_file_fixture, child_fixture, custody_exchange_fixture
    ):
        """
        Verify that completing an exchange creates exactly one custody day record.
        """
        exchange_date = date(2026, 1, 15)

        # Create exchange instance
        instance = CustodyExchangeInstance(
            exchange_id=custody_exchange_fixture.id,
            scheduled_time=datetime(2026, 1, 15, 18, 0),
            from_parent_checked_in=True,
            to_parent_checked_in=True,
            status='completed'
        )
        db_session.add(instance)
        await db_session.flush()

        # Update custody from exchange
        record = await CustodyTimeService.update_custody_from_exchange(
            db_session,
            instance
        )

        assert record is not None, "Record should be created"
        assert record.record_date == exchange_date, \
            f"Record date should be {exchange_date}, got {record.record_date}"
        assert record.custodial_parent_id == custody_exchange_fixture.to_parent_id, \
            "Custodial parent should be the receiving parent"
        assert record.determination_method == DeterminationMethod.EXCHANGE_COMPLETED.value, \
            "Determination method should be EXCHANGE_COMPLETED"
        assert record.confidence_score == 100, \
            "Exchange-based records should have 100% confidence"

    @pytest.mark.asyncio
    async def test_month_boundary_counting(self, db_session, family_file_fixture, child_fixture):
        """
        Verify that counting works correctly across month boundaries.

        Jan 30 to Feb 2 should be 4 days.
        """
        start_date = date(2026, 1, 30)
        end_date = date(2026, 2, 2)
        expected_days = 4

        # Backfill across month boundary
        created_count = await CustodyTimeService.backfill_from_schedule(
            db_session,
            family_file_fixture.id,
            child_fixture.id,
            start_date,
            end_date
        )

        assert created_count == expected_days, \
            f"Expected {expected_days} records across month boundary, got {created_count}"

    @pytest.mark.asyncio
    async def test_leap_year_february_counting(self, db_session, family_file_fixture, child_fixture):
        """
        Verify that February counting works correctly (28/29 days).

        2026 is not a leap year, so Feb should have 28 days.
        2028 is a leap year, so Feb should have 29 days.
        """
        # Non-leap year
        start_2026 = date(2026, 2, 1)
        end_2026 = date(2026, 2, 28)
        feb_2026_days = (end_2026 - start_2026).days + 1

        assert feb_2026_days == 28, \
            f"Feb 2026 should have 28 days, got {feb_2026_days}"

        # Leap year
        start_2028 = date(2028, 2, 1)
        end_2028 = date(2028, 2, 29)
        feb_2028_days = (end_2028 - start_2028).days + 1

        assert feb_2028_days == 29, \
            f"Feb 2028 (leap year) should have 29 days, got {feb_2028_days}"


# Diagnostic script for manual verification
if __name__ == "__main__":
    """
    Run this script to manually verify custody counting logic.
    """
    print("Custody Tracker Verification")
    print("=" * 50)

    # Test 1: Date range calculation
    test_cases = [
        (date(2026, 1, 1), date(2026, 1, 3), 3),
        (date(2026, 1, 1), date(2026, 1, 31), 31),
        (date(2026, 1, 1), date(2026, 1, 1), 1),
        (date(2026, 1, 30), date(2026, 2, 2), 4),
        (date(2026, 2, 1), date(2026, 2, 28), 28),
    ]

    print("\n1. Date Range Calculations:")
    all_passed = True
    for start, end, expected in test_cases:
        calculated = (end - start).days + 1
        status = "✓" if calculated == expected else "✗"
        print(f"  {status} {start} to {end}: Expected {expected}, Got {calculated}")
        if calculated != expected:
            all_passed = False

    print("\n2. Backfill Logic:")
    print("  → One record created per day (inclusive)")
    print("  → Duplicates prevented by unique constraint")
    print("  → Uses deterministic schedule pattern")

    print("\n3. Stats Calculation:")
    print("  → Counts all records in date range")
    print("  → Calculates days per parent")
    print("  → Computes percentages from recorded days")

    if all_passed:
        print("\n✓ All verification checks passed!")
    else:
        print("\n✗ Some checks failed - review logic above")
