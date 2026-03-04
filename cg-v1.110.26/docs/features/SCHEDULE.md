# TimeBridge - Parenting Time & Exchange Management

**Last Updated:** January 17, 2026
**Version:** 1.5.0
**Module:** Schedule, Exchanges, Custody Time Tracking, Compliance

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Database Models](#database-models)
5. [Schedule Events](#schedule-events)
6. [Custody Exchanges](#custody-exchanges)
7. [Silent Handoff Mode](#silent-handoff-mode)
8. [Compliance Tracking](#compliance-tracking)
9. [API Reference](#api-reference)
10. [Calendar Integration](#calendar-integration)
11. [My Time Collections](#my-time-collections)
12. [Court Integration](#court-integration)
13. [Configuration](#configuration)
14. [Frontend Integration](#frontend-integration)

---

## Overview

### What is TimeBridge?

TimeBridge is CommonGround's comprehensive parenting time management system. It handles everything from calendar events and custody exchanges to compliance tracking and court-ready reporting. The system supports two modes of exchange verification: standard check-ins and Silent Handoff (GPS-verified, contactless exchanges).

### Key Features

| Feature | Description |
|---------|-------------|
| **Schedule Events** | General calendar events with privacy controls |
| **Custody Exchanges** | First-class exchange entities with recurrence |
| **Silent Handoff** | GPS-verified, contactless custody transfers |
| **QR Confirmation** | Mutual verification without direct interaction |
| **Custody Time Tracking** | Track actual parenting time with daily records |
| **Parenting Time Stats** | Visual reports showing custody distribution |
| **Compliance Tracking** | On-time metrics and trend analysis |
| **My Time Collections** | Personal calendar organization |
| **Privacy Controls** | Selective sharing of event details |
| **Court Events** | Integration with court-scheduled hearings |
| **Instance Regeneration** | Automatic generation of recurring exchange instances |

### System Principles

1. **Child-Centric** - All scheduling revolves around children's needs
2. **Verifiable** - Check-ins and exchanges create court-ready records
3. **Privacy-Aware** - Share what's needed, protect personal time
4. **Compliance-Focused** - Track and report on-time performance
5. **Flexible Recurrence** - Support complex custody patterns
6. **Contactless Options** - Silent Handoff for high-conflict situations

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TimeBridge Scheduling System                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │                    Calendar Layer                          │     │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │     │
│  │  │ My Time     │ │  Schedule   │ │  Court Events       │  │     │
│  │  │ Collections │ │   Events    │ │  (from Court API)   │  │     │
│  │  └──────┬──────┘ └──────┬──────┘ └──────────┬──────────┘  │     │
│  │         │               │                    │             │     │
│  │         └───────────────┼────────────────────┘             │     │
│  │                         ▼                                  │     │
│  │              ┌──────────────────────┐                      │     │
│  │              │   Calendar View API  │                      │     │
│  │              └──────────────────────┘                      │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │                  Exchange System                           │     │
│  │  ┌─────────────────┐    ┌─────────────────────────────┐   │     │
│  │  │ CustodyExchange │───▶│ CustodyExchangeInstance    │   │     │
│  │  │  (Template)     │    │  (Occurrence)               │   │     │
│  │  └─────────────────┘    └──────────────┬──────────────┘   │     │
│  │                                        │                   │     │
│  │                           ┌────────────┴────────────┐     │     │
│  │                           │                         │     │     │
│  │                           ▼                         ▼     │     │
│  │                    ┌────────────┐            ┌───────────┐│     │
│  │                    │  Standard  │            │  Silent   ││     │
│  │                    │  Check-In  │            │  Handoff  ││     │
│  │                    └────────────┘            │  + GPS    ││     │
│  │                                              │  + QR     ││     │
│  │                                              └───────────┘│     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │                  Compliance & Analytics                    │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │     │
│  │  │  On-Time %   │  │    Trend     │  │    Court     │     │     │
│  │  │   Metrics    │  │   Analysis   │  │   Reports    │     │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Service Components

```
app/
├── models/
│   ├── schedule.py             # ScheduleEvent, ExchangeCheckIn
│   ├── custody_exchange.py     # CustodyExchange, CustodyExchangeInstance
│   ├── my_time_collection.py   # MyTimeCollection
│   └── time_block.py           # TimeBlock for recurring time
├── schemas/
│   ├── schedule.py             # Event, check-in, compliance schemas
│   └── custody_exchange.py     # Exchange, instance, Silent Handoff
├── services/
│   ├── schedule.py             # ScheduleService
│   ├── custody_exchange.py     # CustodyExchangeService
│   ├── exchange_compliance.py  # Compliance metrics
│   └── geolocation.py          # GPS calculations
└── api/v1/endpoints/
    ├── schedule.py             # Event endpoints
    └── exchanges.py            # Exchange endpoints
```

---

## Core Components

### 1. Schedule Events

General-purpose calendar events with privacy controls and category support.

**Event Types:**
- `regular` - Standard parenting time
- `holiday` - Holiday-specific custody
- `vacation` - Vacation periods
- `makeup` - Make-up time
- `special` - Special occasions

**Event Categories (V2):**
- `general` - Default category
- `medical` - Doctor/therapy appointments
- `school` - School events
- `sports` - Sports/activities
- `exchange` - Custody exchange event

### 2. Custody Exchanges

First-class entities for pickup/dropoff scheduling with recurrence support.

**Exchange Types:**
- `pickup` - Receiving children
- `dropoff` - Transferring children
- `both` - Simultaneous pickup/dropoff

### 3. My Time Collections

Personal calendar organization allowing parents to group events.

**Privacy Model:**
- Collection owner sees full details
- Co-parent sees: time blocked, no details
- Children information always shared for custody events

### 4. Silent Handoff

GPS-verified, contactless custody transfers for high-conflict situations.

**Features:**
- Geofence-based location verification
- Time window enforcement
- QR mutual confirmation
- Zero face-to-face interaction required

---

## Database Models

### ScheduleEvent Model

```python
class ScheduleEvent(Base, UUIDMixin, TimestampMixin):
    """Schedule event - parenting time, exchanges, holidays."""

    __tablename__ = "schedule_events"

    # Context (one should be set)
    case_id: Optional[str]           # Court case context
    family_file_id: Optional[str]    # Family file context
    collection_id: Optional[str]     # My Time Collection
    created_by: Optional[str]        # Event creator

    # Event Classification
    event_type: str                  # regular, holiday, vacation, etc.
    event_category: str              # general, medical, school, etc.
    category_data: Optional[dict]    # Category-specific fields

    # Timing
    start_time: datetime
    end_time: datetime
    all_day: bool                    # All-day event flag

    # Custody Assignment
    custodial_parent_id: str         # Who has custody
    transition_from_id: Optional[str]
    transition_to_id: Optional[str]
    child_ids: list                  # Children involved

    # Details
    title: str
    description: Optional[str]
    location: Optional[str]

    # Privacy Controls
    visibility: str                  # "private" or "co_parent"
    location_shared: bool            # Share location with co-parent

    # Exchange Information
    is_exchange: bool                # Is this a custody exchange?
    exchange_location: Optional[str]
    exchange_lat: Optional[float]
    exchange_lng: Optional[float]
    grace_period_minutes: int        # Default: 15

    # Status
    status: str                      # scheduled, completed, cancelled, no_show

    # Cancellation
    cancelled_at: Optional[datetime]
    cancelled_by: Optional[str]
    cancellation_reason: Optional[str]

    # Agreement Link
    agreement_id: Optional[str]
    is_agreement_derived: bool       # Auto-generated from agreement

    # Modification Tracking
    is_modification: bool
    modification_approved: bool
    modification_requested_by: Optional[str]
    modification_approved_by: Optional[str]
```

### ExchangeCheckIn Model

```python
class ExchangeCheckIn(Base, UUIDMixin, TimestampMixin):
    """Check-in record for exchanges."""

    __tablename__ = "exchange_check_ins"

    # Links
    event_id: str                    # Link to ScheduleEvent

    # Who Checked In
    user_id: str
    parent_role: str                 # dropping_off, picking_up

    # Timing
    checked_in_at: datetime
    scheduled_time: datetime

    # Location Verification
    check_in_method: str             # gps, manual, third_party
    location_lat: Optional[float]
    location_lng: Optional[float]
    location_accuracy: Optional[float]  # Meters

    # Timeliness Metrics
    minutes_early_late: int          # Negative = early
    is_on_time: bool                 # Within 5 minutes
    is_within_grace: bool            # Within grace period

    # Notes
    notes: Optional[str]
    issues_reported: Optional[str]

    # Children Present
    children_present: list           # Child IDs actually present

    # Verification
    verification_code: Optional[str]
    verified_by_other_parent: bool
    verified_at: Optional[datetime]
```

### CustodyExchange Model

```python
class CustodyExchange(Base):
    """Scheduled custody exchange (pickup/dropoff)."""

    __tablename__ = "custody_exchanges"

    id: str                          # Primary key
    case_id: Optional[str]           # Court case context
    family_file_id: Optional[str]    # Family file context
    agreement_id: Optional[str]      # SharedCare Agreement link
    created_by: str                  # Creator

    # Exchange Classification
    exchange_type: str               # pickup, dropoff, both
    title: Optional[str]             # Display title

    # Participants
    from_parent_id: Optional[str]    # Parent transferring
    to_parent_id: Optional[str]      # Parent receiving

    # Children
    child_ids: list                  # All children (legacy)
    pickup_child_ids: list           # Children being picked up
    dropoff_child_ids: list          # Children being dropped off

    # Location
    location: Optional[str]          # Address
    location_notes: Optional[str]    # Special instructions

    # Timing
    scheduled_time: datetime         # Anchor time
    duration_minutes: int            # Default: 30

    # Recurrence
    is_recurring: bool               # Recurring exchange?
    recurrence_pattern: Optional[str]  # weekly, biweekly, monthly
    recurrence_days: Optional[list]  # [0=Sun, 1=Mon, ..., 6=Sat]
    recurrence_end_date: Optional[datetime]
    recurrence_exceptions: Optional[list]  # Dates to skip

    # Exchange Details
    items_to_bring: Optional[str]
    special_instructions: Optional[str]

    # Status
    status: str                      # active, paused, cancelled
    notes_visible_to_coparent: bool  # Share notes?

    # === Silent Handoff Settings ===
    location_lat: Optional[float]    # Geofence center
    location_lng: Optional[float]
    geofence_radius_meters: int      # Default: 100m

    check_in_window_before_minutes: int  # Default: 30
    check_in_window_after_minutes: int   # Default: 30

    silent_handoff_enabled: bool     # Enable Silent Handoff?
    qr_confirmation_required: bool   # Require QR scan?
```

### CustodyExchangeInstance Model

```python
class CustodyExchangeInstance(Base):
    """Specific occurrence of a custody exchange."""

    __tablename__ = "custody_exchange_instances"

    id: str
    exchange_id: str                 # Link to CustodyExchange

    # Scheduled Time
    scheduled_time: datetime

    # Status
    status: str                      # scheduled, completed, missed, cancelled

    # Check-In Tracking
    from_parent_checked_in: bool
    from_parent_check_in_time: Optional[datetime]
    to_parent_checked_in: bool
    to_parent_check_in_time: Optional[datetime]

    completed_at: Optional[datetime]
    notes: Optional[str]

    # Overrides
    override_location: Optional[str]
    override_time: Optional[datetime]

    # === Silent Handoff GPS Data ===

    # From Parent GPS
    from_parent_check_in_lat: Optional[float]
    from_parent_check_in_lng: Optional[float]
    from_parent_device_accuracy: Optional[float]
    from_parent_distance_meters: Optional[float]
    from_parent_in_geofence: Optional[bool]

    # To Parent GPS
    to_parent_check_in_lat: Optional[float]
    to_parent_check_in_lng: Optional[float]
    to_parent_device_accuracy: Optional[float]
    to_parent_distance_meters: Optional[float]
    to_parent_in_geofence: Optional[bool]

    # QR Confirmation
    qr_confirmation_token: Optional[str]
    qr_confirmed_at: Optional[datetime]
    qr_confirmed_by: Optional[str]

    # Outcome
    handoff_outcome: Optional[str]   # completed, missed, one_party_present, disputed

    # Window Tracking
    window_start: Optional[datetime]
    window_end: Optional[datetime]
    auto_closed: bool
    auto_closed_at: Optional[datetime]
```

---

## Schedule Events

### Event Lifecycle

```
                    ┌──────────────┐
                    │   SCHEDULED  │
                    │  (default)   │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    event time           cancel          no-show
     passes             request           check
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐     ┌───────────┐    ┌──────────┐
    │ COMPLETED│     │ CANCELLED │    │  NO_SHOW │
    └──────────┘     └───────────┘    └──────────┘
```

### Privacy Filtering

Events are filtered based on viewer relationship:

```python
def filter_event_for_viewer(event, viewer_id):
    """Filter event based on viewer's relationship."""

    is_owner = event.created_by == viewer_id

    if event.visibility == "private" and not is_owner:
        return {
            "id": event.id,
            "start_time": event.start_time,
            "end_time": event.end_time,
            "title": "Busy",              # Hide real title
            "description": None,
            "location": None,
            "is_owner": False,
            "details_hidden": True
        }

    if not event.location_shared and not is_owner:
        # Hide location if not explicitly shared
        event_data = event.to_dict()
        event_data["location"] = None
        return event_data

    return event.to_dict()
```

### Event Categories (V2)

Category-specific forms with structured data:

```python
# Medical Appointment
{
    "event_category": "medical",
    "category_data": {
        "appointment_type": "checkup",
        "provider_name": "Dr. Smith",
        "provider_phone": "555-1234",
        "insurance_info": "BCBS #12345",
        "notes_for_other_parent": "Please bring insurance card"
    }
}

# School Event
{
    "event_category": "school",
    "category_data": {
        "event_name": "Parent-Teacher Conference",
        "teacher_name": "Mrs. Johnson",
        "room_number": "204",
        "requires_both_parents": true
    }
}

# Sports Activity
{
    "event_category": "sports",
    "category_data": {
        "activity_type": "soccer_game",
        "team_name": "Tigers",
        "opponent": "Lions",
        "equipment_needed": ["cleats", "shin guards", "water bottle"]
    }
}
```

---

## Custody Exchanges

### Exchange Flow Diagram

```
                    Create Exchange
                          │
                          ▼
              ┌──────────────────────┐
              │   CustodyExchange    │
              │    (Template)        │
              └──────────┬───────────┘
                         │
           Generate Instances
           (for recurring)
                         │
          ┌──────────────┴──────────────┐
          ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │Instance 1│   │Instance 2│   │Instance N│
    │ Jan 5    │   │ Jan 12   │   │   ...    │
    └────┬─────┘   └────┬─────┘   └──────────┘
         │              │
    Check-In       Check-In
    Window         Window
         │              │
         ▼              ▼
    ┌──────────┐   ┌──────────┐
    │From Parent│   │From Parent│
    │ Checks In │   │ Checks In │
    └────┬─────┘   └───────────┘
         │
         ▼
    ┌──────────┐
    │To Parent │
    │ Checks In│
    └────┬─────┘
         │
         ▼
    ┌──────────┐
    │ COMPLETED│
    └──────────┘
```

### Recurrence Patterns

```python
# Weekly Exchange - Every Friday at 5:00 PM
{
    "is_recurring": True,
    "recurrence_pattern": "weekly",
    "recurrence_days": [5],     # Friday
    "scheduled_time": "2026-01-10T17:00:00Z"
}

# Biweekly Exchange - Every other Sunday
{
    "is_recurring": True,
    "recurrence_pattern": "biweekly",
    "recurrence_days": [0],     # Sunday
    "scheduled_time": "2026-01-05T10:00:00Z"
}

# Custom Pattern - Monday, Wednesday, Friday
{
    "is_recurring": True,
    "recurrence_pattern": "custom",
    "recurrence_days": [1, 3, 5],  # Mon, Wed, Fri
    "scheduled_time": "2026-01-06T08:00:00Z"
}

# With Exceptions - Skip holiday dates
{
    "is_recurring": True,
    "recurrence_pattern": "weekly",
    "recurrence_days": [5],
    "recurrence_exceptions": [
        "2026-12-25",    # Christmas
        "2026-01-01"     # New Year
    ]
}
```

### Instance Status Flow

```
                 ┌─────────────┐
                 │  SCHEDULED  │
                 └──────┬──────┘
                        │
       ┌────────────────┼────────────────┐
       │                │                │
   check-in         cancel          window
   received         action          closes
       │                │                │
       ▼                ▼                ▼
  ┌──────────┐    ┌───────────┐    ┌──────────┐
  │  Active  │    │ CANCELLED │    │  MISSED  │
  │(check-in │    └───────────┘    └──────────┘
  │  in prog)│
  └────┬─────┘
       │
  both parents
   check in
       │
       ▼
  ┌──────────┐
  │ COMPLETED│
  └──────────┘
```

---

## Silent Handoff Mode

### Overview

Silent Handoff enables custody exchanges without direct parent-to-parent contact, ideal for high-conflict situations. It uses GPS verification and optional QR confirmation.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     Silent Handoff Flow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. WINDOW OPENS (scheduled_time - window_before)               │
│     │                                                           │
│     ▼                                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  From Parent arrives at exchange location                 │  │
│  │  └─▶ Opens app, checks GPS location                       │  │
│  │  └─▶ Taps "Check In" - GPS captured                       │  │
│  │  └─▶ System calculates distance from geofence center      │  │
│  │  └─▶ Status: from_parent_in_geofence = true/false         │  │
│  └──────────────────────────────────────────────────────────┘  │
│     │                                                           │
│     ▼                                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  To Parent arrives (can be at same time or after)         │  │
│  │  └─▶ Opens app, sees "Exchange in progress"               │  │
│  │  └─▶ Taps "Check In" - GPS captured                       │  │
│  │  └─▶ System calculates distance                           │  │
│  │  └─▶ Status: to_parent_in_geofence = true/false           │  │
│  └──────────────────────────────────────────────────────────┘  │
│     │                                                           │
│     ▼ (Both parents checked in)                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  QR Confirmation (if required)                            │  │
│  │  └─▶ System generates QR token                            │  │
│  │  └─▶ From Parent displays QR code on screen               │  │
│  │  └─▶ To Parent scans QR code                              │  │
│  │  └─▶ System verifies token match                          │  │
│  │  └─▶ Exchange COMPLETED                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│     │                                                           │
│     ▼                                                           │
│  2. WINDOW CLOSES (scheduled_time + window_after)               │
│     └─▶ Auto-close: status based on who showed up              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Geofence Configuration

```python
# Exchange Location Setup
{
    "location": "123 Main St, Anytown, CA 90210",
    "location_lat": 34.0522,
    "location_lng": -118.2437,
    "geofence_radius_meters": 100,  # 100 meter radius
    "check_in_window_before_minutes": 30,
    "check_in_window_after_minutes": 30,
    "silent_handoff_enabled": True,
    "qr_confirmation_required": True
}
```

### GPS Check-In Request

```http
POST /api/v1/exchanges/instances/{instance_id}/check-in/gps
Authorization: Bearer <token>
Content-Type: application/json

{
    "latitude": 34.0523,
    "longitude": -118.2438,
    "device_accuracy_meters": 5.0,
    "notes": "Arrived at parking lot"
}
```

### Handoff Outcomes

| Outcome | Description |
|---------|-------------|
| `completed` | Both parents checked in within geofence, QR confirmed (if required) |
| `one_party_present` | Only one parent checked in before window closed |
| `missed` | Neither parent checked in |
| `disputed` | Both checked in but outside geofence or QR failed |
| `pending` | Exchange in progress |

### QR Confirmation Flow

```
┌─────────────────┐                    ┌─────────────────┐
│  From Parent    │                    │   To Parent     │
│                 │                    │                 │
│  1. Check in    │                    │  2. Check in    │
│     with GPS    │                    │     with GPS    │
│                 │                    │                 │
│  3. Get QR      │                    │                 │
│     token       │                    │                 │
│        │        │                    │                 │
│        ▼        │                    │                 │
│  ┌──────────┐   │                    │                 │
│  │ Display  │   │   4. Show QR to    │  5. Scan QR    │
│  │    QR    │──────▶   To Parent  ──────▶   Code      │
│  │   Code   │   │                    │        │       │
│  └──────────┘   │                    │        │       │
│                 │                    │        ▼       │
│                 │                    │  ┌──────────┐  │
│                 │     6. Verified!   │  │  Submit  │  │
│  ┌──────────┐   │◀──────────────────────│   Token  │  │
│  │ Exchange │   │                    │  └──────────┘  │
│  │ Complete │   │                    │                │
│  └──────────┘   │                    │  ┌──────────┐  │
│                 │                    │  │ Exchange │  │
│                 │                    │  │ Complete │  │
│                 │                    │  └──────────┘  │
└─────────────────┘                    └─────────────────┘
```

---

## Compliance Tracking

### Metrics Calculation

```python
class ComplianceMetrics:
    """Compliance tracking metrics."""

    user_id: str             # Parent being tracked
    case_id: str             # Case context
    total_exchanges: int     # Total in period
    on_time_count: int       # On-time (within 5 min)
    late_count: int          # Outside grace period
    no_show_count: int       # No check-in at all

    on_time_rate: float      # 0.0 - 1.0
    average_lateness_minutes: float

    trend: str               # "improving", "stable", "worsening"
    period_start: datetime
    period_end: datetime
```

### Trend Analysis

```python
async def calculate_compliance_trend(
    case_id: str,
    user_id: str,
    days: int
) -> str:
    """
    Calculate compliance trend by comparing two periods.

    Period 1: Current half (most recent)
    Period 2: Previous half (older)

    Returns:
        "improving" - Current rate > Previous rate + 10%
        "worsening" - Current rate < Previous rate - 10%
        "stable"    - Within 10% threshold
    """
    current_period = get_check_ins(days // 2, now)
    previous_period = get_check_ins(days // 2, days)

    current_rate = calculate_on_time_rate(current_period)
    previous_rate = calculate_on_time_rate(previous_period)

    if current_rate > previous_rate + 0.1:
        return "improving"
    elif current_rate < previous_rate - 0.1:
        return "worsening"
    else:
        return "stable"
```

### Timeliness Thresholds

| Status | Definition | Impact on Metrics |
|--------|------------|-------------------|
| **On Time** | Within 5 minutes | Counts as on-time |
| **Grace Period** | Within grace_period_minutes (default 15) | Counts as on-time (lenient) |
| **Late** | Beyond grace period | Counts as late |
| **No Show** | No check-in recorded | Counts as no-show |

---

## API Reference

### Schedule Event Endpoints

#### Create Event

```http
POST /api/v1/schedule/events/
Authorization: Bearer <token>
Content-Type: application/json

{
    "collection_id": "collection-uuid",
    "title": "Soccer Practice",
    "start_time": "2026-01-15T16:00:00Z",
    "end_time": "2026-01-15T18:00:00Z",
    "child_ids": ["child-uuid-1", "child-uuid-2"],
    "description": "Weekly soccer practice",
    "location": "City Park Soccer Fields",
    "location_shared": true,
    "visibility": "co_parent",
    "event_category": "sports",
    "category_data": {
        "activity_type": "practice",
        "team_name": "Tigers",
        "equipment_needed": ["cleats", "shin guards"]
    }
}
```

#### List Events

```http
GET /api/v1/schedule/events/
Authorization: Bearer <token>

Query Parameters:
- case_id: string (required) - Case or Family File ID
- start_date: datetime - Filter start
- end_date: datetime - Filter end
- event_type: string - regular, holiday, vacation, etc.
- custodial_parent_id: string - Filter by parent
```

#### Get Compliance Metrics

```http
GET /api/v1/schedule/compliance/
Authorization: Bearer <token>

Query Parameters:
- case_id: string (required)
- user_id: string (optional) - Specific parent
- days: int (default: 30) - Analysis period
```

**Response:**

```json
{
    "user_id": "parent-uuid",
    "case_id": "case-uuid",
    "total_exchanges": 8,
    "on_time_count": 7,
    "late_count": 1,
    "no_show_count": 0,
    "on_time_rate": 0.875,
    "average_lateness_minutes": 3.5,
    "trend": "stable",
    "period_start": "2025-12-11T00:00:00Z",
    "period_end": "2026-01-10T23:59:59Z"
}
```

### Custody Exchange Endpoints

#### Create Exchange

```http
POST /api/v1/exchanges/
Authorization: Bearer <token>
Content-Type: application/json

{
    "case_id": "case-uuid",
    "exchange_type": "pickup",
    "scheduled_time": "2026-01-17T17:00:00Z",
    "from_parent_id": "parent-a-uuid",
    "to_parent_id": "parent-b-uuid",
    "pickup_child_ids": ["child-1", "child-2"],
    "location": "School Parking Lot",
    "duration_minutes": 15,
    "is_recurring": true,
    "recurrence_pattern": "weekly",
    "recurrence_days": [5],
    "silent_handoff_enabled": true,
    "location_lat": 34.0522,
    "location_lng": -118.2437,
    "geofence_radius_meters": 100,
    "qr_confirmation_required": true
}
```

#### Get Upcoming Instances

```http
GET /api/v1/exchanges/case/{case_id}/upcoming
Authorization: Bearer <token>

Query Parameters:
- start_date: datetime (optional)
- end_date: datetime (optional)
- limit: int (default: 20, max: 100)
```

#### Standard Check-In

```http
POST /api/v1/exchanges/instances/{instance_id}/check-in
Authorization: Bearer <token>
Content-Type: application/json

{
    "notes": "Arrived on time"
}
```

#### GPS Check-In (Silent Handoff)

```http
POST /api/v1/exchanges/instances/{instance_id}/check-in/gps
Authorization: Bearer <token>
Content-Type: application/json

{
    "latitude": 34.0523,
    "longitude": -118.2438,
    "device_accuracy_meters": 5.0,
    "notes": "In parking lot"
}
```

**Response:**

```json
{
    "id": "instance-uuid",
    "exchange_id": "exchange-uuid",
    "scheduled_time": "2026-01-17T17:00:00Z",
    "status": "scheduled",
    "from_parent_checked_in": true,
    "from_parent_check_in_time": "2026-01-17T16:55:00Z",
    "from_parent_check_in_lat": 34.0523,
    "from_parent_check_in_lng": -118.2438,
    "from_parent_distance_meters": 15.2,
    "from_parent_in_geofence": true,
    "to_parent_checked_in": false,
    "handoff_outcome": "pending"
}
```

#### Get Window Status

```http
GET /api/v1/exchanges/instances/{instance_id}/window-status
Authorization: Bearer <token>
```

**Response:**

```json
{
    "instance_id": "instance-uuid",
    "scheduled_time": "2026-01-17T17:00:00Z",
    "window_start": "2026-01-17T16:30:00Z",
    "window_end": "2026-01-17T17:30:00Z",
    "is_within_window": true,
    "is_before_window": false,
    "is_after_window": false,
    "minutes_until_window": 0,
    "minutes_remaining": 35
}
```

#### Get QR Token

```http
GET /api/v1/exchanges/instances/{instance_id}/qr-token
Authorization: Bearer <token>
```

**Response:**

```json
{
    "token": "abc123xyz789...",
    "instance_id": "instance-uuid"
}
```

#### Confirm QR

```http
POST /api/v1/exchanges/instances/{instance_id}/confirm-qr
Authorization: Bearer <token>
Content-Type: application/json

{
    "confirmation_token": "abc123xyz789..."
}
```

#### Geocode Address

```http
POST /api/v1/exchanges/geocode
Authorization: Bearer <token>
Content-Type: application/json

{
    "address": "123 Main St, Anytown, CA 90210"
}
```

**Response:**

```json
{
    "latitude": 34.0522,
    "longitude": -118.2437,
    "formatted_address": "123 Main Street, Anytown, CA 90210, USA",
    "accuracy": "ROOFTOP"
}
```

#### Get Custody Status

```http
GET /api/v1/exchanges/family-file/{family_file_id}/custody-status
Authorization: Bearer <token>
```

**Response:**

```json
{
    "family_file_id": "ff-uuid",
    "current_custody_with": "You",
    "children": [
        {
            "id": "child-1",
            "name": "Emma",
            "current_custody_with": "You",
            "avatar": null
        },
        {
            "id": "child-2",
            "name": "Jack",
            "current_custody_with": "You",
            "avatar": null
        }
    ],
    "next_exchange": {
        "id": "instance-uuid",
        "scheduled_time": "2026-01-17T17:00:00Z",
        "exchange_type": "dropoff",
        "location": "School Parking Lot"
    },
    "hours_until_exchange": 48,
    "custody_percentage": 75
}
```

---

## Calendar Integration

### Combined Calendar Data

```http
GET /api/v1/schedule/calendar/
Authorization: Bearer <token>

Query Parameters:
- case_id: string (required)
- start_date: datetime (required)
- end_date: datetime (required)
- include_busy_periods: bool (default: true)
```

**Response:**

```json
{
    "case_id": "case-uuid",
    "events": [
        {
            "id": "event-1",
            "title": "Soccer Practice",
            "start_time": "2026-01-15T16:00:00Z",
            "end_time": "2026-01-15T18:00:00Z",
            "event_category": "sports",
            "visibility": "co_parent",
            "is_owner": true
        }
    ],
    "exchanges": [
        {
            "id": "instance-1",
            "exchange_id": "exchange-uuid",
            "exchange_type": "pickup",
            "title": "Weekly pickup",
            "scheduled_time": "2026-01-17T17:00:00Z",
            "duration_minutes": 15,
            "status": "scheduled",
            "is_owner": true
        }
    ],
    "court_events": [
        {
            "id": "court-event-1",
            "event_type": "hearing",
            "title": "Status Hearing",
            "event_date": "2026-01-20",
            "start_time": "09:00",
            "is_mandatory": true,
            "my_rsvp_status": "going",
            "is_court_event": true
        }
    ],
    "busy_periods": [
        {
            "start_time": "2026-01-16T10:00:00Z",
            "end_time": "2026-01-16T12:00:00Z",
            "label": "Busy",
            "color": "#94A3B8",
            "type": "busy",
            "details_hidden": true
        }
    ],
    "my_collections": [
        {
            "id": "collection-1",
            "name": "My Time",
            "color": "#3B82F6",
            "is_default": true,
            "is_owner": true
        }
    ],
    "start_date": "2026-01-01T00:00:00Z",
    "end_date": "2026-01-31T23:59:59Z"
}
```

### Busy Period Privacy

Co-parent's private events appear as neutral "Busy" blocks:

```json
{
    "start_time": "2026-01-16T10:00:00Z",
    "end_time": "2026-01-16T12:00:00Z",
    "label": "Busy",
    "color": "#94A3B8",
    "type": "busy",
    "details_hidden": true
}
```

---

## My Time Collections

### Collection Model

```python
class MyTimeCollection(Base):
    """Personal calendar organization."""

    id: str
    case_id: Optional[str]
    family_file_id: Optional[str]
    owner_id: str                    # Collection owner

    name: str                        # Display name
    color: str                       # Hex color code
    is_default: bool                 # Default collection

    is_active: bool
    display_order: int
```

### Privacy Model

| Viewer | What They See |
|--------|---------------|
| **Owner** | Full event details, can edit |
| **Co-Parent** | Time blocked, "Busy" label, no details |
| **Court Professional** | Full access to all events |

### Collection API

```http
# Create Collection
POST /api/v1/schedule/collections/
{
    "case_id": "case-uuid",
    "name": "Work Events",
    "color": "#F59E0B",
    "is_default": false
}

# List Collections
GET /api/v1/schedule/collections/?case_id=<uuid>

# Update Collection
PUT /api/v1/schedule/collections/{collection_id}
{
    "name": "Work Schedule",
    "color": "#10B981"
}

# Delete Collection
DELETE /api/v1/schedule/collections/{collection_id}
```

---

## Court Integration

### Court Event Visibility

Court events are always visible to both parents:

```python
class CourtEventForCalendar(BaseModel):
    """Court event for parent calendar."""

    id: str
    event_type: str              # hearing, mediation, trial, etc.
    title: str
    description: Optional[str]
    event_date: date
    start_time: Optional[str]
    end_time: Optional[str]
    location: Optional[str]
    virtual_link: Optional[str]
    is_mandatory: bool

    # RSVP tracking
    my_rsvp_status: Optional[str]     # going, not_going, maybe
    my_rsvp_required: bool
    other_parent_rsvp_status: Optional[str]

    is_court_event: bool = True       # Always true
```

### Compliance Reports for Court

```python
class ComplianceReport(BaseModel):
    """Court-ready compliance report."""

    case_id: str
    parent_id: str
    period_start: datetime
    period_end: datetime

    # Summary Statistics
    total_scheduled_exchanges: int
    completed_on_time: int
    completed_late: int
    missed: int
    cancelled_by_parent: int

    on_time_rate: float          # Percentage

    # GPS Verification (Silent Handoff)
    gps_verified_count: int
    gps_in_geofence_rate: float

    # QR Confirmation
    qr_confirmed_count: int

    # Detailed Records
    exchange_records: list[ExchangeRecord]
```

---

## Configuration

### Environment Variables

```bash
# Schedule Settings
SCHEDULE_DEFAULT_GRACE_PERIOD_MINUTES=15
SCHEDULE_DEFAULT_EXCHANGE_DURATION_MINUTES=30

# Silent Handoff
SILENT_HANDOFF_DEFAULT_GEOFENCE_METERS=100
SILENT_HANDOFF_DEFAULT_WINDOW_BEFORE_MINUTES=30
SILENT_HANDOFF_DEFAULT_WINDOW_AFTER_MINUTES=30

# Geolocation (for geocoding)
GOOGLE_MAPS_API_KEY=your-api-key

# Auto-close Settings
EXCHANGE_AUTO_CLOSE_ENABLED=true
EXCHANGE_AUTO_CLOSE_BUFFER_MINUTES=5
```

### Default Values

```python
# Schedule Event Defaults
DEFAULT_GRACE_PERIOD_MINUTES = 15
DEFAULT_VISIBILITY = "co_parent"
DEFAULT_LOCATION_SHARED = False

# Exchange Defaults
DEFAULT_EXCHANGE_DURATION = 30  # minutes
DEFAULT_GEOFENCE_RADIUS = 100   # meters
DEFAULT_WINDOW_BEFORE = 30      # minutes
DEFAULT_WINDOW_AFTER = 30       # minutes
```

---

## Frontend Integration

### Calendar Components

```typescript
// Recommended component structure
components/
├── schedule/
│   ├── CalendarView.tsx          // Month/week/day views
│   ├── EventCard.tsx             // Event display
│   ├── EventForm.tsx             // Create/edit event
│   ├── ExchangeCard.tsx          // Exchange display
│   ├── ExchangeForm.tsx          // Create/edit exchange
│   ├── SilentHandoffCheckin.tsx  // GPS check-in flow
│   ├── QRConfirmation.tsx        // QR display/scan
│   ├── ComplianceChart.tsx       // Compliance visualization
│   ├── CustodyStatus.tsx         // "Kids with You" card
│   └── CollectionsManager.tsx    // My Time Collections
```

### API Client Functions

```typescript
// lib/api.ts - Schedule API functions

export const scheduleAPI = {
  // Events
  createEvent: (data: ScheduleEventCreate) =>
    api.post('/schedule/events/', data),

  listEvents: (caseId: string, filters?: EventFilters) =>
    api.get('/schedule/events/', { params: { case_id: caseId, ...filters }}),

  // Calendar
  getCalendarData: (caseId: string, startDate: Date, endDate: Date) =>
    api.get('/schedule/calendar/', {
      params: { case_id: caseId, start_date: startDate, end_date: endDate }
    }),

  // Compliance
  getCompliance: (caseId: string, days?: number) =>
    api.get('/schedule/compliance/', { params: { case_id: caseId, days }}),

  // Collections
  listCollections: (caseId: string) =>
    api.get('/schedule/collections/', { params: { case_id: caseId }})
};

export const exchangesAPI = {
  // Exchanges
  createExchange: (data: CustodyExchangeCreate) =>
    api.post('/exchanges/', data),

  getUpcoming: (caseId: string, limit?: number) =>
    api.get(`/exchanges/case/${caseId}/upcoming`, { params: { limit }}),

  // Check-In
  checkIn: (instanceId: string, notes?: string) =>
    api.post(`/exchanges/instances/${instanceId}/check-in`, { notes }),

  checkInWithGPS: (instanceId: string, gpsData: GPSCheckIn) =>
    api.post(`/exchanges/instances/${instanceId}/check-in/gps`, gpsData),

  // QR Confirmation
  getQRToken: (instanceId: string) =>
    api.get(`/exchanges/instances/${instanceId}/qr-token`),

  confirmQR: (instanceId: string, token: string) =>
    api.post(`/exchanges/instances/${instanceId}/confirm-qr`, {
      confirmation_token: token
    }),

  // Status
  getCustodyStatus: (familyFileId: string) =>
    api.get(`/exchanges/family-file/${familyFileId}/custody-status`)
};
```

---

## Best Practices

### Creating Events

1. **Always set visibility** - Private events show as "Busy" to co-parent
2. **Share location when appropriate** - School events, activities benefit from shared location
3. **Use event categories** - Enables category-specific forms and filtering
4. **Link to agreement** - When event derives from custody agreement

### Custody Exchanges

1. **Set realistic windows** - Allow enough buffer for traffic/delays
2. **Enable Silent Handoff for high-conflict** - Reduces direct interaction
3. **Configure geofence appropriately** - 100m is typical, adjust for location type
4. **Use QR confirmation** - Provides mutual verification

### Compliance Tracking

1. **Check in promptly** - Even if within grace period
2. **Note any issues** - Document in check-in notes
3. **Review trends regularly** - Address declining compliance early
4. **Export for court** - Generate reports before hearings

---

## Document Index

| Document | Location | Description |
|----------|----------|-------------|
| **SCHEDULE.md** | `/docs/features/` | This document |
| ARIA.md | `/docs/features/` | ARIA sentiment analysis |
| KIDCOMS.md | `/docs/features/` | Child communication |
| CLEARFUND.md | `/docs/features/` | Financial obligations |
| API_REFERENCE.md | `/docs/api/` | Complete API documentation |

---

*Last Updated: January 10, 2026*
*Document Version: 1.0.0*
