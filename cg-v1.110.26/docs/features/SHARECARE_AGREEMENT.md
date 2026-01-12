# SharedCare Agreement v2

## Overview

SharedCare Agreement v2 introduces a simplified, more accessible approach to custody agreements. The redesigned system reduces complexity from 18 sections to 7 (or 5 for low-conflict situations), making agreements easier to complete while maintaining court usefulness.

## Design Philosophy

### Core Principles

1. **Parents don't choose complexity—ARIA does** based on conflict signals
2. **Each section answers one legal/practical question**
3. **No matrices** (holiday, travel consent)—those go in Quick Accords
4. **~6 pages when exported** (down from 20+)
5. **Court-friendly but not replacing attorneys**

### Agreement Versions

| Version | Sections | Use Case |
|---------|----------|----------|
| `v2_standard` | 7 | Default for most situations |
| `v2_lite` | 5 | Low-conflict cooperative parents |
| `v1` | 18 | ARIA Professional tier (complex cases) |

## Section Structure

### V2 Standard (7 Sections)

| # | Section | Purpose | Key Fields |
|---|---------|---------|------------|
| 1 | **Parties & Children** | Identify who | parent names, children, current arrangements |
| 2 | **Agreement Scope & Duration** | Define what/when | effective date, duration, review schedule |
| 3 | **Parenting Time Structure** | Baseline schedule | primary residence, pattern, transition times |
| 4 | **Logistics & Transitions** | Exchange details | location, transportation, communication |
| 5 | **Decision-Making & Communication** | Authority/methods | major decisions, response timeframes |
| 6 | **Expenses & Financial Cooperation** | Shared costs | split ratios, reimbursement (optional) |
| 7 | **Modification, Disputes & Acknowledgment** | Close the loop | dispute steps, signatures |

### V2 Lite (5 Sections)

For cooperative, low-conflict situations:

1. Parties & Children
2. Scope & Duration
3. Parenting Time Structure
4. Logistics & Expenses (combined)
5. Acknowledgment

## ARIA Conflict Detection

ARIA automatically assesses conflict level based on conversation signals:

```python
CONFLICT_SIGNALS = {
    "high": ["lawyer", "court order", "refuses", "hostile", "abuse", "safety"],
    "moderate": ["disagree", "frustrated", "unreliable", "ignores"],
    "low": ["amicable", "cooperative", "flexible", "agrees"]
}
```

### Conflict Assessment Flow

1. Parent starts conversation with ARIA
2. ARIA analyzes messages for conflict signals
3. Conflict level determines agreement version:
   - Low + no financial disputes → `v2_lite` (5 sections)
   - Moderate → `v2_standard` (7 sections)
   - High → Recommend `v1` (ARIA Professional)

## Quick Accords

Items that don't belong in the main agreement are handled via Quick Accords:

| Quick Accord | Description | Trigger Section |
|--------------|-------------|-----------------|
| Holiday Schedule | Detailed holiday arrangements | After Parenting Time |
| Summer Vacation | Extended summer plans | After Parenting Time |
| School Breaks | Winter/spring break schedule | After Parenting Time |
| Travel Consent | Travel notification procedures | After Logistics |
| Extracurricular Activities | Sports/lessons commitments | After Decision-Making |
| Special Occasions | Birthdays, family events | After Parenting Time |

### Quick Accord Integration

After completing relevant sections, ARIA suggests applicable Quick Accords:

```typescript
// Example suggestions after completing Parenting Time section
{
  title: "Holiday Schedule",
  description: "Detailed holiday arrangements",
  when_to_suggest: "After completing Section 3 (Parenting Time)"
}
```

## API Endpoints

### V2 Agreement Creation

```http
POST /api/v1/agreements/
Content-Type: application/json

{
  "family_file_id": "uuid",
  "title": "SharedCare Agreement",
  "agreement_type": "shared_care",
  "agreement_version": "v2_standard"  // or "v2_lite" or "v1"
}
```

### Conflict Assessment

```http
POST /api/v1/agreements/{id}/assess-conflict
Content-Type: application/json

{
  "conversation_history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "has_financial_disputes": false
}

Response:
{
  "conflict_level": "moderate",
  "recommended_version": "v2_standard",
  "signals_detected": ["disagree", "frustrated"],
  "recommendation_reason": "Moderate complexity detected..."
}
```

### V2 ARIA Conversation

```http
POST /api/v1/agreements/{id}/aria/message-v2
Content-Type: application/json

{
  "message": "We do week-on, week-off and it works well",
  "current_section": "parenting_time"
}

Response:
{
  "response": "That's great that week-on, week-off works for you!...",
  "conversation_id": "uuid",
  "agreement_version": "v2_standard",
  "total_sections": 7,
  "current_section": "parenting_time",
  "quick_accord_suggestions": [
    {"id": "holiday_schedule", "title": "Holiday Schedule", ...}
  ]
}
```

### V2 Data Extraction

```http
POST /api/v1/agreements/{id}/extract-v2

Response:
{
  "extracted_data": {
    "parties_children": {...},
    "scope_duration": {...},
    "parenting_time": {...},
    ...
  },
  "agreement_version": "v2_standard"
}
```

## Frontend Components

### Builder V2 Page

Located at `/agreements/[id]/builder-v2`:

- 7-step wizard interface
- Progress bar with section navigation
- Quick Accord suggestions after relevant sections
- Inline section forms (no separate components)
- Acknowledgment and signature collection

### Section Forms

Each section has a dedicated form component:

- `PartiesChildrenForm` - Current arrangements notes
- `ScopeDurationForm` - Effective date, duration type, review schedule
- `ParentingTimeForm` - Primary residence, schedule pattern, transition times
- `LogisticsForm` - Exchange location, transportation, communication method
- `DecisionMakingForm` - Decision authority, response timeframes
- `ExpensesForm` - Split ratio, reimbursement window
- `AcknowledgmentForm` - Dispute resolution, acknowledgment checkbox

## Data Schema

### V2 Standard Extraction Schema

```json
{
  "parties_children": {
    "parent_a": {"name": "string", "email": "string", "phone": "string"},
    "parent_b": {"name": "string", "email": "string", "phone": "string"},
    "children": [{"name": "string", "date_of_birth": "string"}],
    "current_arrangements": "string"
  },
  "scope_duration": {
    "effective_date": "string",
    "duration_type": "indefinite|fixed_term|until_child_18",
    "review_schedule": "annual|every_6_months|as_needed"
  },
  "parenting_time": {
    "primary_residence": "parent_a|parent_b|equal",
    "schedule_pattern": "week_on_week_off|2-2-3|every_other_weekend|custom",
    "transition_day": "string",
    "transition_time": "string"
  },
  "logistics_transitions": {
    "exchange_location": "school|parent_a_home|parent_b_home|neutral_location",
    "transportation_responsibility": "picking_up_parent|dropping_off_parent|shared",
    "transition_communication": "commonground|text|email"
  },
  "decision_communication": {
    "major_decision_authority": "joint|parent_a|parent_b",
    "response_timeframe": "24_hours|48_hours|same_day_urgent"
  },
  "expenses_financial": {
    "split_ratio": "50/50|60/40|income_based",
    "reimbursement_window": "14_days|30_days"
  },
  "modification_disputes": {
    "escalation_timeframe": "7_days|14_days|30_days",
    "parent_a_acknowledgment": "boolean",
    "parent_b_acknowledgment": "boolean"
  }
}
```

## Migration Strategy

### Existing Agreements

- Existing agreements retain `agreement_version = "v1"`
- No data migration required
- V1 builder remains available at `/agreements/[id]/builder`

### New Agreements

- Default to `v2_standard`
- ARIA can recommend different version based on conflict assessment
- User can override if needed (professional tier)

## Database Schema

### Agreement Table Update

```sql
ALTER TABLE agreements
ADD COLUMN agreement_version VARCHAR(20) DEFAULT 'v2_standard';

-- Set existing agreements to v1
UPDATE agreements SET agreement_version = 'v1'
WHERE agreement_version IS NULL;
```

## Best Practices

### For Parents

1. Let ARIA guide the conversation naturally
2. Don't worry about legal language—ARIA handles that
3. Be honest about your situation for accurate version recommendation
4. Use Quick Accords for detailed schedules (holidays, vacations)

### For Implementation

1. Always use `agreement_version` field to determine which template to use
2. Route to appropriate builder (`builder` for v1, `builder-v2` for v2)
3. Suggest Quick Accords based on completed sections
4. Export PDF using version-specific templates

## Related Documentation

- [ARIA Messaging](./ARIA.md) - AI assistant details
- [Quick Accords](../api/API_REFERENCE.md#quick-accords) - Supplemental agreements
- [ClearFund](./CLEARFUND.md) - Expense tracking integration
