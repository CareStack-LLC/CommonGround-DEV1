# Agreement Automation Verification & Enhancement Plan

**Date:** 2026-01-22
**Purpose:** Verify and enhance automatic creation of exchanges and obligations when agreements are activated

---

## Executive Summary

The CommonGround platform **DOES** automatically create custody exchanges and financial obligations when agreements are activated. However, the descriptions do NOT follow the requirement to include "Created by ARIA based on agreement [name]".

**Status:** 🟡 **Partially Complete** - Core automation exists, descriptions need updating

---

## Current State Analysis

### ✅ What's Working

#### 1. SharedCare Agreement Activation

When a SharedCare Agreement is **approved by both parents** and then **activated**, the `AgreementActivationService` automatically:

**Creates Custody Exchanges:**
- Parses `parenting_time` section structured data
- Creates recurring `CustodyExchange` records based on schedule pattern:
  - `week_on_week_off` → 1 biweekly exchange
  - `2-2-3` → 3 weekly exchanges (Mon, Wed, Fri)
  - `every_other_weekend` → 2 biweekly exchanges (Fri pickup, Sun dropoff)
  - Custom → 1 weekly exchange on transition day
- Generates 8 weeks of `CustodyExchangeInstance` records ahead
- Links each exchange to agreement via `agreement_id`
- Uses location from logistics section

**Creates Child Support Obligations:**
- Parses `child_support` section structured data
- Creates template `Obligation` with `is_recurring=True`
- Generates 6 months of individual obligation instances
- Sets proper payer/receiver based on agreement terms
- Uses iCal RRULE format for recurrence

**Sets Expense Split Ratio:**
- Locks split ratio on `FamilyFile` from expense section
- Future manual obligations use this locked ratio
- Enforces agreement terms on all new expenses

**Endpoint:** `POST /api/v1/agreements/{id}/activate`

**Service Flow:**
```
agreement_service.activate_agreement() (status → "active")
    ↓
AgreementActivationService.activate_agreement()
    ↓
    ├─→ _create_custody_exchanges() → Creates exchanges
    ├─→ _create_recurring_child_support() → Creates obligations
    └─→ _set_expense_split() → Locks split ratio
```

#### 2. QuickAccord Activation

When a QuickAccord is **approved by both parents**, the `QuickAccordService._handle_approval_side_effects()` automatically:

**Creates ScheduleEvent (for schedule-related categories):**
- Categories: `travel`, `schedule_swap`, `special_event`, `overnight`
- Creates `ScheduleEvent` with start/end times from QuickAccord
- Links to QuickAccord via `quick_accord_id`
- Uses `visibility="co_parent"` (shared)

**Creates ClearFund Obligation (if has_shared_expense):**
- Creates `Obligation` with expense details
- Calculates split based on:
  - `expense_type="reimbursement"` → 100% from other parent
  - `expense_type="shared"` → Uses agreement-locked split or 50/50
- Links to QuickAccord via `quick_accord_id`
- Sets `status="open"` (ready for payment)

**Endpoint:** `POST /api/v1/quick-accords/{id}/approve`

**Service Flow:**
```
QuickAccordService.approve_quick_accord()
    ↓ (when both parents approve)
    status → "active"
    ↓
_handle_approval_side_effects()
    ↓
    ├─→ _create_schedule_event_from_accord() → Creates event
    └─→ _create_obligation_from_accord() → Creates obligation
```

---

### ❌ What's Missing: "Created by ARIA" Descriptions

**Problem:** The descriptions on auto-created records do NOT include "Created by ARIA based on agreement [name]" as required.

#### Current Descriptions

**1. CustodyExchange (from SharedCare Agreement):**
- File: `backend/app/services/agreement_activation.py:610-630`
- Current: Uses title only (e.g., "Weekly Custody Exchange", "Monday Exchange")
- Missing: `special_instructions` field is NOT populated
- **Field Available:** `special_instructions: Mapped[Optional[str]]` (line 113 in custody_exchange.py)

**2. Child Support Obligation (from SharedCare Agreement):**
- File: `backend/app/services/agreement_activation.py:882`
- Current: `description="Recurring child support payment from agreement"`
- Missing: Doesn't mention ARIA or agreement name
- **Field Available:** `description: Mapped[Optional[str]]` (line 114 in clearfund.py)

**3. ScheduleEvent (from QuickAccord):**
- File: `backend/app/services/quick_accord.py:584`
- Current: `description=quick_accord.purpose_description` (from user input)
- Missing: Doesn't mention ARIA or QuickAccord name
- **Field Available:** `description: Mapped[Optional[str]]` (line in schedule.py)

**4. Obligation (from QuickAccord):**
- File: `backend/app/services/quick_accord.py:662`
- Current: `description=quick_accord.purpose_description` (from user input)
- Missing: Doesn't mention ARIA or QuickAccord name
- **Field Available:** `description: Mapped[Optional[str]]` (line 114 in clearfund.py)

---

## Implementation Plan

### Phase 1: Update Description Generation (Backend)

#### Task 1.1: Update SharedCare Agreement Exchange Creation

**File:** `backend/app/services/agreement_activation.py`

**Method:** `_create_single_exchange()` (lines 595-638)

**Change:**
```python
# Current (line 610-630):
exchange = CustodyExchange(
    id=str(uuid.uuid4()),
    # ... other fields ...
    title=title
)

# Updated:
exchange = CustodyExchange(
    id=str(uuid.uuid4()),
    # ... other fields ...
    title=title,
    special_instructions=f"Created by ARIA based on agreement: {agreement.title}"
)
```

**Impact:** All auto-created exchanges will show ARIA attribution in special instructions

---

#### Task 1.2: Update SharedCare Agreement Child Support Creation

**File:** `backend/app/services/agreement_activation.py`

**Method:** `_create_recurring_child_support()` (line 882)

**Change:**
```python
# Current:
description=f"Recurring child support payment from agreement",

# Updated:
description=f"Recurring child support payment. Created by ARIA based on agreement: {agreement.title}",
```

**Impact:** Child support obligations show ARIA attribution

---

#### Task 1.3: Update QuickAccord ScheduleEvent Creation

**File:** `backend/app/services/quick_accord.py`

**Method:** `_create_schedule_event_from_accord()` (line 584)

**Change:**
```python
# Current:
description=quick_accord.purpose_description,

# Updated:
description=(
    f"{quick_accord.purpose_description}\n\n"
    f"Created by ARIA based on QuickAccord: {quick_accord.title}"
),
```

**Impact:** Schedule events from QuickAccords show ARIA attribution

---

#### Task 1.4: Update QuickAccord Obligation Creation

**File:** `backend/app/services/quick_accord.py`

**Method:** `_create_obligation_from_accord()` (line 662)

**Change:**
```python
# Current:
description=quick_accord.purpose_description,

# Updated:
description=(
    f"{quick_accord.purpose_description}\n\n"
    f"Created by ARIA based on QuickAccord: {quick_accord.title}"
),
```

**Impact:** Obligations from QuickAccords show ARIA attribution

---

### Phase 2: Update Obligation Instance Creation

**Context:** When child support template generates individual instances, they should also have the description.

**File:** `backend/app/services/agreement_activation.py`

**Method:** `_generate_obligation_instances()` (lines 931-1030)

**Current Behavior:** Creates instances without description
**Required Change:** Copy description from template to each instance

```python
# In _generate_obligation_instances (around line 970):
instance = Obligation(
    id=str(uuid.uuid4()),
    # ... other fields ...
    description=template.description,  # ADD THIS LINE
    # ... rest of fields ...
)
```

---

### Phase 3: Verify Frontend Integration

#### Task 3.1: Verify SharedCare Agreement Activation Flow

**Frontend Files to Check:**
- `frontend/app/agreements/[id]/builder-v2/page.tsx` (agreement builder)
- `frontend/app/agreements/[id]/page.tsx` (agreement detail view)
- `frontend/lib/api.ts` (agreementsAPI.activate method)

**Verification Steps:**
1. ✅ Check that frontend calls `POST /api/v1/agreements/{id}/activate`
2. ✅ Confirm activation result shows `exchanges_created`, `recurring_obligations_created`
3. ✅ Verify user is notified of created resources
4. ✅ Check if frontend redirects to exchanges/obligations after activation

**Expected API Response:**
```json
{
  "exchanges_created": 3,
  "split_ratio_set": true,
  "exchange_location_set": true,
  "recurring_obligations_created": 1,
  "obligation_instances_created": 6,
  "errors": []
}
```

---

#### Task 3.2: Verify QuickAccord Approval Flow

**Frontend Files to Check:**
- `frontend/app/family-files/[id]/quick-accord/new/page.tsx` (ARIA creation)
- `frontend/app/family-files/[id]/quick-accord/[accordId]/page.tsx` (detail view)
- `frontend/lib/api.ts` (quickAccordsAPI.approve method)

**Verification Steps:**
1. ✅ Check that frontend calls `POST /api/v1/quick-accords/{id}/approve`
2. ✅ Confirm approval response shows `is_approved: true` when both parents approve
3. ✅ Verify user sees message "QuickAccord is now active!"
4. ✅ Check if side effects (schedule event, obligation) are communicated to user

**Expected API Response:**
```json
{
  "id": "qa-123",
  "status": "active",
  "is_approved": true,
  "message": "QuickAccord is now active!",
  // ... other QuickAccord fields ...
}
```

**Note:** The response does NOT include side effect details. Frontend must query separately.

---

#### Task 3.3: Verify Exchange and Obligation Display

**Files to Check:**
- `frontend/app/schedule/page.tsx` (displays exchanges)
- `frontend/app/payments/page.tsx` (displays obligations)
- `frontend/components/schedule/exchange-form.tsx`
- `frontend/components/clearfund/obligation-details.tsx`

**Verification:**
1. ✅ Exchanges show `special_instructions` field (ARIA attribution)
2. ✅ Obligations show `description` field (ARIA attribution)
3. ✅ UI makes it clear these were auto-created from agreement
4. ✅ Consider adding an icon/badge for "Auto-created from Agreement"

---

### Phase 4: End-to-End Testing

#### Test Scenario 1: SharedCare Agreement with Exchanges

**Setup:**
1. Create SharedCare Agreement via ARIA
2. Include parenting schedule: "Week on/week off, Monday at 6pm"
3. Submit for approval
4. Both parents approve
5. Activate agreement

**Expected Results:**
- ✅ 1 biweekly `CustodyExchange` created
- ✅ 8 weeks of instances generated
- ✅ Exchange has `special_instructions`: "Created by ARIA based on agreement: [agreement_name]"
- ✅ Exchange appears in schedule page
- ✅ WebSocket broadcast sent for exchange creation

**SQL Verification:**
```sql
SELECT
    ce.id, ce.title, ce.special_instructions, ce.agreement_id,
    a.title as agreement_title
FROM custody_exchanges ce
JOIN agreements a ON ce.agreement_id = a.id
WHERE ce.family_file_id = 'test-family-file-id';
```

---

#### Test Scenario 2: SharedCare Agreement with Child Support

**Setup:**
1. Create SharedCare Agreement via ARIA
2. Include child support: "$500/month, due on 1st, Parent A pays Parent B"
3. Submit for approval
4. Both parents approve
5. Activate agreement

**Expected Results:**
- ✅ 1 template `Obligation` created with `is_recurring=True`
- ✅ 6 individual obligation instances created (6 months ahead)
- ✅ Template has `description`: "Recurring child support payment. Created by ARIA based on agreement: [agreement_name]"
- ✅ Each instance has same description
- ✅ Obligations appear in ClearFund page
- ✅ WebSocket broadcast sent for obligation creation

**SQL Verification:**
```sql
-- Template
SELECT id, title, description, is_recurring, status, agreement_id
FROM obligations
WHERE family_file_id = 'test-family-file-id'
  AND is_recurring = true;

-- Instances
SELECT id, title, description, status, parent_obligation_id, due_date
FROM obligations
WHERE parent_obligation_id = '[template-id]'
ORDER BY due_date;
```

---

#### Test Scenario 3: QuickAccord with Schedule and Expense

**Setup:**
1. Create QuickAccord via ARIA: "Thursday at 6pm, pick up from school to go to movies, need $20 for ticket"
2. Set:
   - `purpose_category`: "special_event"
   - `event_date`: Next Thursday 6pm
   - `has_shared_expense`: true
   - `estimated_amount`: 20
   - `purpose_description`: "Pickup from school for movie night"
3. Submit for approval
4. Both parents approve

**Expected Results:**
- ✅ 1 `ScheduleEvent` created
- ✅ Event has `description`: "Pickup from school for movie night\n\nCreated by ARIA based on QuickAccord: [quickaccord_title]"
- ✅ 1 `Obligation` created with `status="open"`
- ✅ Obligation has same description format with ARIA attribution
- ✅ Obligation uses agreement-locked split ratio (if set) or 50/50
- ✅ Event appears in schedule page
- ✅ Obligation appears in ClearFund page
- ✅ WebSocket broadcasts sent for both

**SQL Verification:**
```sql
-- Schedule Event
SELECT
    se.id, se.title, se.description, se.quick_accord_id,
    qa.title as quickaccord_title
FROM schedule_events se
JOIN quick_accords qa ON se.quick_accord_id = qa.id
WHERE se.family_file_id = 'test-family-file-id';

-- Obligation
SELECT
    o.id, o.title, o.description, o.quick_accord_id,
    qa.title as quickaccord_title
FROM obligations o
JOIN quick_accords qa ON o.quick_accord_id = qa.id
WHERE o.family_file_id = 'test-family-file-id';
```

---

### Phase 5: API Endpoint Documentation

#### Endpoint 1: Activate SharedCare Agreement

**POST** `/api/v1/agreements/{agreement_id}/activate`

**Auth Required:** Yes (current_user must be case participant)

**Preconditions:**
- Agreement status must be "approved" (both parents approved)
- Both `parent_a_approved` and `parent_b_approved` must be true
- Agreement must have `family_file_id` or `case_id`

**Request:** No body

**Response:**
```json
{
  "exchanges_created": 3,
  "split_ratio_set": true,
  "exchange_location_set": true,
  "recurring_obligations_created": 1,
  "obligation_instances_created": 6,
  "errors": []
}
```

**Side Effects:**
1. Agreement status → "active"
2. Agreement `effective_date` set to current time
3. Other active agreements for same case → status "superseded"
4. Custody exchanges created (if parenting schedule exists)
5. Child support obligations created (if child support exists)
6. Expense split ratio locked on family file
7. WebSocket broadcast: `agreement_approved`

**Frontend Integration:**
- File: `frontend/lib/api.ts` → `agreementsAPI.activate(id)`
- Component: `frontend/app/agreements/[id]/page.tsx`

---

#### Endpoint 2: Approve QuickAccord

**POST** `/api/v1/quick-accords/{quick_accord_id}/approve`

**Auth Required:** Yes (current_user must be family file parent)

**Preconditions:**
- QuickAccord status must be "draft" or "pending_approval"
- Current user has not already approved

**Request Body:**
```json
{
  "approved": true,
  "notes": "Looks good to me" // optional
}
```

**Response:**
```json
{
  "id": "qa-123",
  "status": "active", // or "pending_approval" if waiting for other parent
  "parent_a_approved": true,
  "parent_b_approved": true,
  "is_approved": true,
  "message": "QuickAccord is now active!",
  // ... full QuickAccord fields ...
}
```

**Side Effects (when both parents approve):**
1. QuickAccord status → "active"
2. If schedule-related category → ScheduleEvent created
3. If has_shared_expense → Obligation created
4. Both records linked via `quick_accord_id`

**Frontend Integration:**
- File: `frontend/lib/api.ts` → `quickAccordsAPI.approve(id, approved, notes)`
- Component: `frontend/app/family-files/[id]/quick-accord/[accordId]/page.tsx`

---

## Database Schema Verification

### CustodyExchange Model

**Table:** `custody_exchanges`

**Relevant Fields:**
```python
agreement_id: Mapped[Optional[str]]  # Links to agreement
title: Mapped[Optional[str]]  # Auto-generated title
special_instructions: Mapped[Optional[str]]  # ARIA attribution goes here
is_recurring: Mapped[bool]
recurrence_pattern: Mapped[Optional[str]]  # "weekly", "biweekly"
recurrence_days: Mapped[Optional[List[int]]]  # [0=Sun, 1=Mon, ...]
```

**Verify:**
- ✅ `agreement_id` foreign key exists
- ✅ `special_instructions` field available for ARIA attribution

---

### Obligation Model

**Table:** `obligations`

**Relevant Fields:**
```python
agreement_id: Mapped[Optional[str]]  # Links to agreement
quick_accord_id: Mapped[Optional[str]]  # Links to QuickAccord
description: Mapped[Optional[str]]  # ARIA attribution goes here
is_recurring: Mapped[bool]
recurrence_rule: Mapped[Optional[str]]  # iCal RRULE format
parent_obligation_id: Mapped[Optional[str]]  # Links instance to template
```

**Verify:**
- ✅ `agreement_id` foreign key exists
- ✅ `quick_accord_id` foreign key exists
- ✅ `description` field available for ARIA attribution
- ✅ `parent_obligation_id` links instances to template

---

### ScheduleEvent Model

**Table:** `schedule_events`

**Relevant Fields:**
```python
quick_accord_id: Mapped[Optional[str]]  # Links to QuickAccord
description: Mapped[Optional[str]]  # ARIA attribution goes here
visibility: Mapped[str]  # "co_parent" for shared events
```

**Verify:**
- ✅ `quick_accord_id` foreign key exists
- ✅ `description` field available for ARIA attribution

---

## Risk Assessment

### High Risk

1. **Breaking Changes:** Updating descriptions could break existing frontend displays
   - **Mitigation:** Test all pages that display exchanges/obligations
   - **Rollback:** Descriptions are display-only, can be reverted easily

2. **Long Descriptions:** Adding "Created by ARIA..." might make descriptions too long for UI
   - **Mitigation:** Use `\n\n` separator, allow frontend to truncate
   - **Rollback:** Adjust format to be shorter

### Medium Risk

1. **Missing Automation:** Some agreement sections might not trigger creation
   - **Mitigation:** Add comprehensive logging in activation services
   - **Verification:** SQL queries to verify all created records

2. **WebSocket Notifications:** Users might not see real-time updates for created records
   - **Mitigation:** Verify `exchange_created`, `obligation_created` broadcasts exist
   - **Testing:** Use WebSocket test client to monitor broadcasts

### Low Risk

1. **Performance:** Creating many records at once might be slow
   - **Mitigation:** Activation is already async, should be fine
   - **Monitor:** Add timing logs to track activation duration

---

## Success Criteria

### ✅ Phase 1 Complete When:
- [ ] All 4 description generation methods updated
- [ ] Backend code passes TypeScript compilation
- [ ] No breaking changes to existing API responses

### ✅ Phase 2 Complete When:
- [ ] Obligation instances inherit template description
- [ ] SQL verification shows correct descriptions

### ✅ Phase 3 Complete When:
- [ ] Frontend displays ARIA attribution on exchanges
- [ ] Frontend displays ARIA attribution on obligations
- [ ] Frontend displays ARIA attribution on schedule events
- [ ] UI shows clear indication of "Auto-created from Agreement"

### ✅ Phase 4 Complete When:
- [ ] All 3 test scenarios pass end-to-end
- [ ] SQL verification queries return expected results
- [ ] WebSocket broadcasts confirmed for all events

### ✅ Phase 5 Complete When:
- [ ] API documentation updated with side effects
- [ ] Frontend integration verified for both endpoints
- [ ] Postman/API test collection includes activation tests

---

## Timeline Estimate

| Phase | Effort | Duration |
|-------|--------|----------|
| Phase 1: Backend Updates | 2 hours | 1 day |
| Phase 2: Instance Description | 1 hour | Same day |
| Phase 3: Frontend Verification | 3 hours | 1 day |
| Phase 4: End-to-End Testing | 4 hours | 1 day |
| Phase 5: Documentation | 1 hour | Same day |
| **Total** | **11 hours** | **2-3 days** |

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize phases** (can Phase 3 run in parallel with Phase 1-2?)
3. **Assign developers** to each phase
4. **Set up test environment** with sample family files
5. **Create SQL test scripts** for verification
6. **Begin Phase 1** backend updates

---

## Appendix: Files to Modify

### Backend Files

1. `/backend/app/services/agreement_activation.py` (Lines 595-638, 882, 970)
2. `/backend/app/services/quick_accord.py` (Lines 584, 662)

### Frontend Files (Verification Only)

1. `/frontend/app/agreements/[id]/builder-v2/page.tsx`
2. `/frontend/app/agreements/[id]/page.tsx`
3. `/frontend/app/family-files/[id]/quick-accord/new/page.tsx`
4. `/frontend/app/family-files/[id]/quick-accord/[accordId]/page.tsx`
5. `/frontend/app/schedule/page.tsx`
6. `/frontend/app/payments/page.tsx`
7. `/frontend/lib/api.ts`

### Database Models (Reference Only)

1. `/backend/app/models/custody_exchange.py`
2. `/backend/app/models/clearfund.py`
3. `/backend/app/models/schedule.py`
4. `/backend/app/models/agreement.py`

---

**End of Plan**
