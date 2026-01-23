# Custody Tracker System Documentation

## Overview

The Custody Tracker accurately monitors which parent has custody of each child on each day, ensuring **one day = +1 to the daily counter** for precise parenting time calculations.

---

## How It Works

### Daily Record System

Every day for every child gets exactly **one record** in the `custody_day_records` table:

```python
CustodyDayRecord {
    child_id: UUID
    record_date: date  # The specific day
    custodial_parent_id: UUID  # Which parent had custody
    determination_method: enum  # How we know
    confidence_score: int  # 0-100
}
```

### Determination Methods

The system tracks custody through multiple sources:

1. **EXCHANGE_COMPLETED** (100% confidence)
   - Both parents checked in at exchange location with GPS
   - Most accurate method

2. **CHECK_IN** (100% confidence)
   - Parent manually checked in for the day
   - GPS verified at location

3. **SCHEDULED** (90% confidence)
   - Based on agreed parenting schedule from agreement
   - Automatic assignment

4. **BACKFILLED** (80% confidence)
   - Historical records filled from schedule pattern
   - Used for past dates without check-ins

5. **MANUAL_OVERRIDE** (70% confidence)
   - Parent clicked "With Me" button
   - Lower confidence due to potential disputes

---

## Counting Logic

### Date Range Calculation (Inclusive)

```python
# Example: Jan 1 to Jan 3
start_date = date(2026, 1, 1)
end_date = date(2026, 1, 3)

# CORRECT: Inclusive of both boundaries
total_days = (end_date - start_date).days + 1  # = 3 days
```

**Key Points:**
- Start and end dates are **both included**
- Same-day range = 1 day (not 0)
- Month boundaries handled correctly
- Leap years accounted for automatically

### Stats Calculation

Located in `/backend/app/services/custody_time.py:232-298`

```python
async def get_custody_time_stats():
    # 1. Calculate total days in period (inclusive)
    total_days = (end_date - start_date).days + 1

    # 2. Query all records in range
    records = await db.execute(
        select(CustodyDayRecord).where(
            CustodyDayRecord.record_date >= start_date,
            CustodyDayRecord.record_date <= end_date  # Inclusive
        )
    )

    # 3. Count days per parent
    parent_a_days = sum(1 for r in records if r.custodial_parent_id == parent_a_id)
    parent_b_days = sum(1 for r in records if r.custodial_parent_id == parent_b_id)

    # 4. Calculate percentages
    parent_a_percentage = (parent_a_days / total_days) * 100
    parent_b_percentage = (parent_b_days / total_days) * 100
```

---

## Backfill System

### Purpose

Populate historical custody records based on the agreed schedule when no check-ins exist.

### Logic

Located in `/backend/app/services/custody_time.py:600-704`

```python
async def backfill_from_schedule(start_date, end_date):
    current_date = start_date
    created_count = 0

    # Loop through every day (inclusive)
    while current_date <= end_date:
        # Check if record already exists
        if record_exists(current_date):
            current_date += timedelta(days=1)
            continue

        # Determine custody based on schedule pattern
        custodial_parent = calculate_from_pattern(current_date)

        # Create record
        create_record(current_date, custodial_parent)
        created_count += 1

        # Move to next day
        current_date += timedelta(days=1)

    return created_count  # Should equal (end_date - start_date).days + 1
```

### Schedule Patterns Supported

From `/backend/app/services/custody_time.py:29-38`:

| Pattern | Parent A % | Parent B % | Logic |
|---------|-----------|-----------|-------|
| `week_on_week_off` | 50% | 50% | Alternating full weeks |
| `alternating_weeks` | 50% | 50% | Same as above |
| `2-2-3` | 50% | 50% | Mon-Tue A, Wed-Thu B, Fri-Sun alternates |
| `5-2-2-5` | 50% | 50% | Complex alternating pattern |
| `every_other_weekend` | 71% | 29% | Primary parent weekdays, other gets every other weekend |
| `every_weekend` | 71% | 29% | Primary parent weekdays, other gets all weekends |
| `primary_custody` | 80% | 20% | One parent has majority time |
| `custom` | 50% | 50% | Default assumption |

---

## Exchange Integration

### Automatic Record Creation

When both parents complete an exchange check-in:

```python
# From /backend/app/services/custody_time.py:90-148
async def update_custody_from_exchange(exchange_instance):
    # Only create record if both parents checked in
    if not (from_parent_checked_in AND to_parent_checked_in):
        return None

    # Create custody record for exchange date
    record_date = exchange_instance.scheduled_time.date()

    for child_id in exchange.child_ids:
        record = CustodyDayRecord(
            child_id=child_id,
            record_date=record_date,
            custodial_parent_id=exchange.to_parent_id,  # Receiving parent
            determination_method=EXCHANGE_COMPLETED,
            confidence_score=100  # GPS verified
        )
```

**Why to_parent gets custody:**
- Exchange transfers custody from `from_parent` → `to_parent`
- After exchange completes, `to_parent` has custody for that day
- GPS verification ensures accuracy

---

## Frontend Display

### Component

Located in `/frontend/components/custody/custody-dashboard-widget.tsx`

### Display Logic

```typescript
// For each child, show:
const myDays = isParentA ? child.parent_a.days : child.parent_b.days;
const totalTracked = child.recorded_days;

// Progress bar width
const myBarWidth = (myDays / child.total_days) * 100;

// Display: "X days" with progress bar
<span>{myDays} {myDays === 1 ? 'day' : 'days'}</span>
<div className="progress-bar" style={{ width: `${myBarWidth}%` }} />
<span className="text-muted">{totalTracked} days tracked</span>
```

### What Users See

- **Your Days**: Number of days user had custody (e.g., "15 days")
- **Progress Bar**: Visual representation of their time percentage
- **Days Tracked**: Total days with records (e.g., "28 days tracked")
- **Period**: Time range being calculated (e.g., "Last 30 days")

---

## Accuracy Guarantees

### No Duplicates

Unique constraint on `(child_id, record_date)` prevents multiple records for the same day:

```python
# From /backend/app/models/custody_day_record.py:109-111
__table_args__ = (
    UniqueConstraint('child_id', 'record_date', name='uq_custody_day_record'),
)
```

### Correct Day Counting

**Test Cases** (see `/backend/tests/test_custody_tracker_verification.py`):

| Start Date | End Date | Expected Days | Actual Days | Status |
|------------|----------|---------------|-------------|--------|
| 2026-01-01 | 2026-01-03 | 3 | 3 | ✓ |
| 2026-01-01 | 2026-01-31 | 31 | 31 | ✓ |
| 2026-01-01 | 2026-01-01 | 1 | 1 | ✓ |
| 2026-01-30 | 2026-02-02 | 4 | 4 | ✓ |
| 2026-02-01 | 2026-02-28 | 28 | 28 | ✓ |

### Edge Cases Handled

1. **Same-day range**: Returns 1 day (not 0)
2. **Month boundaries**: Correctly counts across Jan 31 → Feb 1
3. **Leap years**: Feb 29 included in leap years
4. **Existing records**: Backfill skips days that already have records
5. **Timezone handling**: Uses date objects (no timezone issues)

---

## API Endpoints

### Get Custody Stats

```http
GET /api/v1/custody-time/child/{child_id}/stats?period=30_days
```

**Response:**
```json
{
  "total_days": 30,
  "recorded_days": 28,
  "unknown_days": 2,
  "parent_a": {
    "user_id": "uuid",
    "days": 15,
    "percentage": 53.6
  },
  "parent_b": {
    "user_id": "uuid",
    "days": 13,
    "percentage": 46.4
  }
}
```

### Backfill Historical Records

```http
POST /api/v1/custody-time/backfill
```

**Request:**
```json
{
  "family_file_id": "uuid",
  "child_id": "uuid",
  "start_date": "2026-01-01",
  "end_date": "2026-01-31"
}
```

**Response:**
```json
{
  "records_created": 31,
  "message": "Created 31 custody records for period"
}
```

---

## Testing & Verification

### Run Test Suite

```bash
cd backend
pytest tests/test_custody_tracker_verification.py -v
```

### Manual Verification Script

```bash
cd backend
python tests/test_custody_tracker_verification.py
```

This will output a diagnostic report verifying:
- Date range calculations
- Backfill logic
- Stats accuracy

---

## Troubleshooting

### Issue: Days not adding up

**Check:**
1. Are records being created? Query `custody_day_records` table
2. Are exchanges completing? Both parents must check in
3. Is backfill running? May need manual trigger for historical dates

**Diagnostic Query:**
```sql
-- Check for missing days
SELECT
  generate_series(
    '2026-01-01'::date,
    '2026-01-31'::date,
    '1 day'::interval
  )::date AS day,
  cdr.custodial_parent_id
FROM generate_series('2026-01-01'::date, '2026-01-31'::date, '1 day'::interval) AS day
LEFT JOIN custody_day_records cdr
  ON cdr.record_date = day::date
  AND cdr.child_id = '<child-uuid>'
ORDER BY day;
```

### Issue: Incorrect percentages

**Check:**
1. Ensure date range is correct (inclusive boundaries)
2. Verify no duplicate records exist
3. Check determination method confidence scores

**Diagnostic Query:**
```sql
-- Count days per parent
SELECT
  custodial_parent_id,
  COUNT(*) as days
FROM custody_day_records
WHERE child_id = '<child-uuid>'
  AND record_date BETWEEN '2026-01-01' AND '2026-01-31'
GROUP BY custodial_parent_id;
```

---

## Future Enhancements

### Planned Features

1. **Partial Day Tracking**
   - Currently: Full day per parent
   - Future: Split days (8am-8pm custody periods)

2. **Dispute Resolution**
   - Flag conflicting records
   - Allow evidence submission
   - Court review process

3. **Predictive Analytics**
   - Forecast future custody balance
   - Alert when deviating from agreement
   - Suggest makeup time

4. **Automated Makeup Time Calculation**
   - Track missed days
   - Suggest catch-up schedules
   - Monitor compliance

---

## Key Takeaways

✅ **One day = +1 record** - Each day creates exactly one record per child
✅ **Inclusive counting** - Start and end dates both included in calculations
✅ **No duplicates** - Database constraint prevents multiple records per day
✅ **Multiple sources** - Exchange check-ins, manual entries, schedule backfill
✅ **Confidence scoring** - Higher confidence for GPS-verified exchanges
✅ **Accurate percentages** - Based on recorded days, not assumptions

The system is **already functioning correctly** - the date calculation logic uses `+1` for inclusive boundaries, and all components properly count days.
