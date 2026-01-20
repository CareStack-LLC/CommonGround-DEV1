# Calendar Unification Plan

## Problem Statement

The professional calendar and parent calendar are completely separate systems:
- **Parent Calendar**: Uses `ScheduleEvent` model, `/events` API, works well
- **Professional Calendar**: Uses `ProfessionalEvent` model, `/professional/events` API, has issues

This causes:
1. CORS issues from trailing slash redirects
2. 422 validation errors from schema mismatches
3. No visibility between professional and parent calendars
4. Professional events never appear on parent calendars even when they should

## Proposed Solution

**Extend the parent calendar system** to support professional use cases rather than maintaining two separate systems.

### Phase 1: Extend Parent Event Schema (Backend)

Add professional-specific fields to `ScheduleEvent`:

```python
# New fields for ScheduleEvent model
professional_id: Optional[str]        # Link to professional who created it
professional_event_type: Optional[str]  # meeting, court_hearing, etc.
parent_visibility: Optional[str]      # none, required_parent, both_parents
virtual_meeting_url: Optional[str]
reminder_minutes: Optional[int]
color: Optional[str]
notes: Optional[str]                  # Private notes (professional only)
timezone: Optional[str]
```

### Phase 2: Add Professional Event Endpoints (Backend)

Create wrapper endpoints that use the parent event system:

```python
# /api/v1/professional/calendar/events
# These endpoints wrap the parent event system but:
# 1. Auto-set professional_id from current user's profile
# 2. Filter to only show events where professional_id matches
# 3. Handle the different visibility model

@router.post("/events")
async def create_professional_event(data: ProfessionalEventCreate, ...):
    # Transform professional schema to parent schema
    parent_event_data = ScheduleEventCreate(
        title=data.title,
        start_time=data.start_time,
        end_time=data.end_time,
        family_file_id=data.family_file_id,
        # Map professional visibility to parent visibility
        visibility="co_parent" if data.parent_visibility != "none" else "private",
        # Store professional-specific data
        professional_id=current_professional.id,
        professional_event_type=data.event_type,
        # ...etc
    )
    # Use parent event service
    return await events_service.create_event(db, parent_event_data)
```

### Phase 3: Update Frontend to Use Unified API

The professional calendar frontend should call the same API patterns as the parent calendar:

```typescript
// Instead of custom /professional/events
// Use /events with professional context

// Create event - same API, different fields
await api.post('/events', {
  title: data.title,
  start_time: data.start_time,
  end_time: data.end_time,
  family_file_id: data.family_file_id,
  // Professional-specific fields
  professional_event_type: data.event_type,
  parent_visibility: data.parent_visibility,
  ...
});

// List events with professional filter
await api.get('/events', {
  params: {
    professional_id: currentProfessionalId,
    family_file_id: selectedCase
  }
});
```

### Phase 4: Display Professional Events on Parent Calendar

When a professional creates an event with `parent_visibility: "both_parents"`:
1. Event is stored in `schedule_events` table
2. Event has `professional_id` set to the creator
3. Event has `visibility: "co_parent"` so parents can see it
4. Parents see it on their TimeBridge calendar with special styling (e.g., "Court Hearing - Added by Attorney")

## Implementation Steps

### Step 1: Database Migration

```sql
ALTER TABLE schedule_events ADD COLUMN professional_id UUID REFERENCES professional_profiles(id);
ALTER TABLE schedule_events ADD COLUMN professional_event_type VARCHAR(50);
ALTER TABLE schedule_events ADD COLUMN parent_visibility VARCHAR(20);
ALTER TABLE schedule_events ADD COLUMN virtual_meeting_url TEXT;
ALTER TABLE schedule_events ADD COLUMN reminder_minutes INTEGER;
ALTER TABLE schedule_events ADD COLUMN color VARCHAR(10);
ALTER TABLE schedule_events ADD COLUMN notes TEXT;
ALTER TABLE schedule_events ADD COLUMN timezone VARCHAR(50);
```

### Step 2: Update ScheduleEvent Model

Add new fields to `/backend/app/models/schedule.py`

### Step 3: Update Schemas

Extend `/backend/app/schemas/schedule.py` with:
- Optional professional fields in ScheduleEventCreate
- Professional fields in ScheduleEventResponse

### Step 4: Update Events Service

Modify `/backend/app/services/event.py` to:
- Handle professional_id when creating events
- Filter by professional_id when listing
- Apply parent_visibility rules

### Step 5: Create Professional Calendar Wrapper Endpoints

Create `/backend/app/api/v1/endpoints/professional_calendar.py` that:
- Accepts ProfessionalEventCreate schema
- Transforms to parent event format
- Calls parent event service
- Returns data in professional-friendly format

### Step 6: Update Professional Calendar Frontend

Modify `/frontend/app/professional/calendar/page.tsx` to:
- Call the new unified endpoints
- Use the same patterns as parent calendar
- Display events with professional styling

## Benefits

1. **Single source of truth** - All events in one table
2. **Automatic visibility** - Professional events appear on parent calendars when appropriate
3. **Consistent behavior** - Same conflict detection, timezone handling, etc.
4. **Simpler maintenance** - One event system to maintain
5. **Better UX** - Parents see their attorney's court hearings on their calendar

## Migration Path

1. Deploy schema changes with new columns (non-breaking)
2. Deploy new professional calendar wrapper endpoints
3. Update frontend to use new endpoints
4. Deprecate old /professional/events endpoints
5. Migrate any existing professional events to parent table

## Timeline Estimate

- Phase 1 (Schema): 1 day
- Phase 2 (Backend): 2 days
- Phase 3 (Frontend): 1 day
- Phase 4 (Integration): 1 day
- Testing: 1 day

Total: ~1 week for full unification
