# CommonGround ⟷ Practice Management Integration Specification

**Purpose:** Define exactly what data syncs between CommonGround and legal practice management systems (MyCase, Clio, Smokeball, etc.)

**Philosophy:** CommonGround handles co-parenting operations. Practice management handles case business operations. Sync only what's mutually beneficial.

---

## Integration Principles

### 1. **Practice Management System = Source of Truth**
The PM system owns:
- Case metadata (case number, opened date, billing rates)
- All billing and invoicing
- Time tracking and trust accounting
- Full document repository
- Client intake and conflict checks
- General case notes and strategy

### 2. **CommonGround = Co-Parenting Operations**
CommonGround owns:
- ARIA communication mediation
- Compliance tracking (exchanges, support, messages)
- SharedCare Agreement
- Parent-specific documents
- Co-parenting calendar

### 3. **Sync = Strategic Intelligence + Court Evidence**
Only sync data that provides value in BOTH systems:
- Compliance insights → Help attorney prepare for court
- Court-ready reports → Evidence for case file
- Key events → Calendar coordination
- Critical alerts → Attorney awareness

---

## What Gets Synced (Bi-Directional)

### FROM Practice Management TO CommonGround

#### 1. **Case Metadata (One-Time Setup)**

**When:** Attorney links a CommonGround case to a PM case

**What Syncs:**
```json
{
  "case_number": "FL-2024-12345",
  "court": "Los Angeles County Superior Court",
  "judge": "Hon. Jennifer Rodriguez",
  "opened_date": "2024-01-15",
  "matter_type": "Custody & Support",
  "billing_rate": 350.00,
  "client_a_id": "mycase_contact_789",
  "client_b_id": "mycase_contact_790"
}
```

**Why:** Ensures case identification consistency across systems. Attorney doesn't re-enter basic case info.

**Not Synced:** Case strategy, legal theories, negotiation notes, settlement offers

---

#### 2. **Court Events (Ongoing)**

**When:** Attorney adds a court date in PM system

**What Syncs:**
```json
{
  "event_type": "court_hearing",
  "title": "Custody Modification Hearing",
  "date": "2024-03-15",
  "time": "10:00 AM",
  "location": "Department 12",
  "judge": "Hon. Jennifer Rodriguez",
  "event_id": "mycase_event_456"
}
```

**Direction:** PM → CommonGround (one-way)

**What Happens in CommonGround:**
- Event appears on professional's Case Calendar
- Event auto-shares with parents (attorney can override visibility)
- Parents receive notification: "Court hearing scheduled for 3/15"
- Reminder emails sent 7 days, 3 days, 1 day before

**Why:** Parents need to know about court dates. Attorneys shouldn't have to enter them twice.

**Not Synced:** Strategy meetings, internal deadlines, client consultations

---

#### 3. **Key Deadlines (Ongoing)**

**When:** Attorney sets a deadline in PM system with tag "share_with_parents"

**What Syncs:**
```json
{
  "event_type": "deadline",
  "title": "Submit Financial Declarations",
  "due_date": "2024-03-01",
  "assigned_to": "both_parents" // or "parent_a" or "parent_b"
}
```

**Direction:** PM → CommonGround (one-way, opt-in)

**What Happens in CommonGround:**
- Appears on Case Calendar (shared with assigned parent)
- Parent receives reminder 7 days before
- Attorney can track completion in CommonGround

**Why:** Some deadlines require parent action (submit docs, complete mediation). Auto-sync ensures parents are notified.

**Not Synced:** Internal law firm deadlines, discovery deadlines attorney handles

---

#### 4. **Documents (Selective)**

**When:** Attorney marks a document in PM system with tag "send_to_commonground"

**What Syncs:**
```json
{
  "document_name": "Court Order - Temporary Custody (FL-305)",
  "document_type": "court_order",
  "file_url": "encrypted_signed_url",
  "uploaded_date": "2024-02-10",
  "mycase_document_id": "doc_12345"
}
```

**Direction:** PM → CommonGround (one-way, opt-in)

**What Happens in CommonGround:**
- Document appears in Case Documents tab (category: Court Orders)
- If marked as "court_order", triggers OCR extraction
- Updates SharedCare Agreement with extracted terms
- Locks court-ordered fields

**Why:** Attorney may draft/receive documents in PM system. Tagged docs auto-upload to CG so parents can access.

**Not Synced:** All documents by default (would overwhelm parents with legal strategy docs)

**Examples of What TO Sync:**
- ✅ Court orders (custody, support)
- ✅ Parenting plan agreements
- ✅ Mediation agreements
- ✅ School/medical records parents need to see

**Examples of What NOT to Sync:**
- ❌ Attorney work product
- ❌ Discovery responses
- ❌ Settlement negotiation drafts
- ❌ Opposing counsel communications

---

### FROM CommonGround TO Practice Management

#### 1. **Compliance Reports (Automatic)**

**When:** Attorney generates a compliance report in CommonGround

**What Syncs:**
```json
{
  "document_name": "Compliance Report - Smith Family (Jan-Feb 2024)",
  "document_type": "compliance_report",
  "file_url": "signed_pdf_url",
  "sha256_hash": "abc123...",
  "generated_date": "2024-02-26",
  "date_range": "2024-01-01 to 2024-02-28",
  "report_type": "full_compliance", // or "exchange_only", "support_only", "communication_only"
  "commonground_report_id": "cg_report_789"
}
```

**Direction:** CommonGround → PM (one-way, automatic)

**What Happens in PM System:**
- PDF uploads to case documents (category: Reports)
- File name includes date range for easy identification
- SHA-256 hash stored in document metadata for verification
- Linked to original CG case for reference

**Why:** These reports are court evidence. Attorney needs them in case file immediately. No manual download/upload.

**Metadata Included:**
- Exchange compliance percentage
- Support payment status
- ARIA intervention count
- Key violation dates

---

#### 2. **ARIA Analysis Reports (Automatic)**

**When:** Attorney generates an ARIA communication analysis

**What Syncs:**
```json
{
  "document_name": "ARIA Communication Analysis - Smith Family (Jan 2024)",
  "document_type": "aria_analysis",
  "file_url": "signed_pdf_url",
  "generated_date": "2024-02-26",
  "hostile_messages_detected": 14,
  "successful_rewrites": 12,
  "escalations": 2,
  "threat_level": "high"
}
```

**Direction:** CommonGround → PM (one-way, automatic)

**What Happens in PM System:**
- Uploads as document (category: Evidence or Reports)
- Metadata shows key metrics
- Attorney can cite in motions/declarations

**Why:** ARIA's intervention history is powerful court evidence. "14 hostile messages in 30 days shows pattern of high-conflict behavior."

---

#### 3. **Critical Alerts (Real-Time)**

**When:** High-priority event occurs in CommonGround

**What Syncs:**
```json
{
  "alert_type": "threat_detected", // or "missed_exchange", "overdue_support", "dv_concern"
  "case_id": "cg_case_123",
  "severity": "urgent",
  "description": "Parent A sent message containing threat language",
  "occurred_at": "2024-02-26 14:35:00",
  "aria_original_message": "If you don't let me see the kids I'll make you regret it",
  "aria_action_taken": "Message blocked, attorney notified, logged for court"
}
```

**Direction:** CommonGround → PM (one-way, real-time)

**What Happens in PM System:**
- Creates a case note/activity log entry
- Flags case for attorney review
- Can trigger task: "Review ARIA threat detection in Smith case"

**Why:** Attorney needs to know immediately if threats are detected. May need to file emergency motion for protective order.

**Triggers for Critical Alerts:**
- Threats or violence language detected
- 3+ missed exchanges in 30 days
- Support payment >60 days overdue
- Parent reports DV concern in communication
- Multiple ARIA escalations in short period

---

#### 4. **Time Entries (Optional)**

**When:** Attorney performs billable action in CommonGround

**What Syncs:**
```json
{
  "activity": "Generated compliance report for court",
  "duration_minutes": 15,
  "date": "2024-02-26",
  "billable": true,
  "billing_code": "court_preparation", // or PM system's code
  "notes": "Generated 3-month compliance report for custody modification hearing (Case: Smith Family)"
}
```

**Direction:** CommonGround → PM (one-way, opt-in)

**What Happens in PM System:**
- Creates a time entry
- Pre-filled with activity description
- Attorney can edit/approve before billing

**Why:** Compliance report generation is billable work. Auto-log saves attorney from manually entering time.

**Billable Activities:**
- Generate compliance report (0.25 hrs typical)
- Generate ARIA analysis report (0.25 hrs)
- Review completed intake (0.5 hrs)
- Upload court order via OCR (0.25 hrs)
- Review ARIA critical alert (0.1 hrs)

**Not Billable:**
- Viewing case dashboard
- Reading parent messages
- Checking compliance score
- Navigating interface

**Setting:** Attorney can toggle "Auto-log time entries to MyCase" on/off

---

#### 5. **Key Case Events (Activity Log)**

**When:** Significant event occurs in CommonGround

**What Syncs:**
```json
{
  "event_type": "missed_exchange",
  "date": "2024-02-25",
  "time": "18:00:00",
  "description": "Parent B (Mike Johnson) failed to pick up children at scheduled exchange",
  "location": "McDonald's - 123 Main St",
  "evidence_url": "gps_verification_screenshot.png",
  "parent_responsible": "parent_b"
}
```

**Direction:** CommonGround → PM (one-way, automatic)

**What Happens in PM System:**
- Creates case activity/note
- Timestamps for legal timeline
- Links to evidence file

**Why:** Builds a legal timeline automatically. Attorney doesn't manually copy events from CG to PM.

**Events That Sync:**
- Missed exchanges
- Late exchanges (>15 minutes)
- Support payments (received, missed, disputed)
- Agreement modifications
- Document uploads by parents
- ARIA escalations
- Court order uploads (OCR processed)

**Events That DON'T Sync:**
- Every message sent
- Every calendar view
- Every dashboard visit
- Minor activity that isn't legally relevant

---

#### 6. **Compliance Score Updates (Weekly)**

**When:** Weekly compliance calculation completes

**What Syncs:**
```json
{
  "overall_compliance": 73,
  "exchange_compliance": 82,
  "support_compliance": 67,
  "communication_compliance": 71,
  "trend": "declining", // or "improving" or "stable"
  "risk_level": "medium", // or "low" or "high"
  "calculation_period": "last_30_days"
}
```

**Direction:** CommonGround → PM (one-way, weekly digest)

**What Happens in PM System:**
- Updates custom field "CG_Compliance_Score"
- Can be used in reporting/dashboards
- Attorney sees at-a-glance case health

**Why:** Attorney preparing for court can quickly see: "Compliance dropped from 85% to 73% this month" without logging into CG.

---

## What Does NOT Sync (Explicitly)

### 1. **No Billing/Financial Data**
- ❌ No invoice amounts
- ❌ No payment records (attorney fees)
- ❌ No trust account balances
- ❌ No billing rates
- ❌ No retainer agreements

**Why:** Billing is completely separate from co-parenting operations. CG never touches money between attorney and client.

---

### 2. **No Attorney Work Product**
- ❌ No case strategy notes
- ❌ No draft pleadings
- ❌ No legal research memos
- ❌ No settlement negotiation notes
- ❌ No privilege logs

**Why:** Attorney-client privilege. This content never goes to CommonGround where parents might see it.

---

### 3. **No Opposing Counsel Communications**
- ❌ No emails with opposing counsel
- ❌ No settlement offers
- ❌ No discovery exchanges
- ❌ No meet-and-confer notes

**Why:** Not relevant to parent compliance monitoring.

---

### 4. **No Other Client Data**
- ❌ No data from other cases
- ❌ No firm-wide analytics
- ❌ No client database exports

**Why:** CG integration is case-by-case only. Privacy firewall.

---

## Integration Architecture

### Setup Flow

**Step 1: One-Time OAuth Connection**
```
Attorney clicks: "Connect MyCase" in Profile → Integrations
→ Redirects to MyCase login
→ MyCase asks: "Allow CommonGround to access your case data?"
→ Attorney approves (scoped permissions)
→ OAuth token stored securely in CommonGround
→ Connection status: ✅ Connected
```

**Step 2: Link Specific Cases**
```
Attorney in CommonGround case: Smith Family
→ Clicks: "Link to MyCase"
→ Searches MyCase cases: "Smith"
→ Selects: "Smith v. Johnson - FL-2024-12345"
→ Confirms link
→ Case status: ⟷ Synced with MyCase
```

**Step 3: Configure Sync Settings**
```
Attorney sets preferences:
☑ Auto-upload compliance reports to MyCase
☑ Sync court dates from MyCase to CG
☑ Send critical alerts to MyCase
☑ Create time entries for billable actions
☐ Sync all parent-uploaded documents (unchecked by default)
```

### Ongoing Sync

**Real-Time Events:**
- Critical alerts (threats, DV concerns) → Instant
- Compliance reports generated → Instant
- Court dates added in MyCase → Within 5 minutes

**Scheduled Syncs:**
- Compliance score updates → Weekly (Monday 6am)
- Activity log batch → Daily (midnight)
- Document sync (if enabled) → Hourly

**Manual Triggers:**
- Attorney clicks "Sync Now" → Immediate full sync
- Attorney clicks "Upload to MyCase" on specific report → Instant

---

## API Endpoints (Technical Spec)

### CommonGround Provides

```typescript
// Webhook endpoint for PM systems to notify CG of changes
POST /api/integrations/webhook/:integration_type
Body: {
  event: 'court_date_added' | 'document_uploaded' | 'case_updated',
  case_id: 'mycase_case_123',
  data: { ... }
}

// OAuth callback
GET /api/integrations/oauth/callback/:integration_type
Query: { code, state }

// Manual sync trigger
POST /api/integrations/sync/:case_id
Body: { direction: 'push' | 'pull' | 'both' }
```

### CommonGround Consumes

```typescript
// MyCase API endpoints we call
GET /api/v1/cases/:case_id
GET /api/v1/cases/:case_id/events
GET /api/v1/cases/:case_id/documents
POST /api/v1/cases/:case_id/documents (upload report)
POST /api/v1/cases/:case_id/activities (log event)
POST /api/v1/cases/:case_id/time_entries (optional)

// Clio API endpoints we call
GET /api/v4/matters/:matter_id
GET /api/v4/calendar_entries
POST /api/v4/documents (upload report)
POST /api/v4/activities (log event)
POST /api/v4/time_entries (optional)
```

---

## Error Handling

### Sync Failures

**Scenario 1: OAuth token expired**
```
Action: Notify attorney via email + in-app banner
Message: "MyCase connection expired. Please reconnect."
Button: [Reconnect MyCase]
Fallback: Manual export/upload still works
```

**Scenario 2: Case deleted in PM system**
```
Action: Show warning in CG case
Message: "⚠️ This case no longer exists in MyCase. Sync disabled."
Option: [Unlink Case] or [Select Different MyCase Case]
```

**Scenario 3: API rate limit hit**
```
Action: Queue sync requests, retry with exponential backoff
Notify: Only if sync delayed >4 hours
Message: "MyCase sync delayed. Reports will upload when system available."
```

**Scenario 4: Document upload fails**
```
Action: Retry 3 times, then manual fallback
Message: "Couldn't upload report to MyCase. [Download PDF] [Try Again]"
Store: Keep record of failed syncs for troubleshooting
```

---

## Security & Privacy

### 1. **Scoped OAuth Permissions**
CommonGround requests ONLY:
- Read case metadata (names, numbers, dates)
- Read calendar events
- Write documents (upload reports)
- Write activities (log events)
- Optional: Write time entries

CommonGround does NOT request:
- ❌ Access to billing/invoicing
- ❌ Access to trust accounts
- ❌ Access to other clients' data
- ❌ Admin permissions
- ❌ Delete permissions

### 2. **Case-Level Isolation**
- Each case links individually (explicit opt-in)
- Unlinking a case stops all sync for that case
- No bulk data exports
- No cross-case queries

### 3. **Audit Trail**
Every sync action logged:
```
2024-02-26 14:35:00 - Uploaded compliance report to MyCase (Case: Smith)
2024-02-26 14:35:05 - Created time entry in MyCase (0.25 hrs)
2024-02-26 14:36:00 - Synced court date from MyCase (Hearing 3/15)
```

Attorney can view full sync log in Integrations settings.

### 4. **Data Retention**
- Sync logs: 2 years
- OAuth tokens: Encrypted at rest, rotated every 90 days
- If attorney disconnects: Synced data remains in PM system (not deleted)

---

## User Experience

### In CommonGround

**Connected Case Badge:**
```
Smith v. Johnson Family
⟷ Synced with MyCase (Case #FL-2024-12345)
Last sync: 5 minutes ago
[Sync Settings] [View in MyCase]
```

**When Generating Report:**
```
[Generate Compliance Report]
↓
Report generated successfully! ✅

Options:
[Download PDF]
[✅ Upload to MyCase] ← Auto-checked if sync enabled
[Email to Court]

*Report will appear in MyCase documents within 1 minute*
```

**Sync Status Indicator:**
```
Header: MyCase ✅ Connected | Last sync: 2m ago
(or)
Header: MyCase ⚠️ Sync Error | [Fix Connection]
(or)
Header: MyCase ⏸️ Not Connected | [Connect Now]
```

---

### In MyCase/Clio

**Linked Case Indicator:**
```
Case: Smith v. Johnson (FL-2024-12345)
📊 CommonGround Connected
View co-parenting compliance →
```

**Documents Tab:**
```
Documents:
├─ Court Orders
│  └─ FL-341 Custody Order.pdf (uploaded by attorney)
├─ Reports
│  ├─ 📊 Compliance Report - Jan 2024.pdf (from CommonGround)
│  ├─ 📊 Compliance Report - Feb 2024.pdf (from CommonGround)
│  └─ 📊 ARIA Analysis - Feb 2024.pdf (from CommonGround)
└─ Evidence
   └─ Parent Communications.pdf (uploaded by attorney)
```

**Activity Log:**
```
Feb 26, 2024 - 2:35 PM
[CommonGround] Missed exchange detected
Parent B failed to pick up children at scheduled time (6:00 PM)
Location: McDonald's - 123 Main St
Evidence: GPS verification screenshot

Feb 26, 2024 - 2:40 PM  
[CommonGround] Compliance report generated
3-month compliance summary for court hearing
Score: 73% (declining trend)
```

---

## ROI for Attorneys

### Time Saved Per Case

**Without Integration:**
1. Generate report in CG (2 min)
2. Download PDF (30 sec)
3. Log into MyCase (30 sec)
4. Navigate to case documents (30 sec)
5. Upload file (1 min)
6. Add metadata (1 min)
7. Manually log time entry (2 min)
8. Copy key events to case notes (5 min)

**Total: 12.5 minutes per report × 5 reports/case = 62.5 minutes/case**

**With Integration:**
1. Generate report in CG (2 min)
2. Click "Upload to MyCase" (auto-checked)
3. Done.

**Total: 2 minutes per report × 5 reports/case = 10 minutes/case**

**Time Saved: 52.5 minutes per case**

At $350/hr billing rate: **$306 value per case**

Multiply by 20 cases: **$6,120 annual value**

Integration cost: $0 (included in CommonGround subscription)

**ROI: Infinite** ♾️

---

## Implementation Priority

### Phase 8A: MyCase Integration (Weeks 17-18)
- OAuth connection
- Case linking
- Auto-upload compliance reports
- Sync court dates (PM → CG)
- Critical alerts (CG → PM)

### Phase 8B: Time Entry & Activity Logging (Week 19)
- Billable time entries (CG → PM)
- Activity log sync (CG → PM)
- Compliance score sync (weekly)

### Phase 8C: Document Sync (Week 20)
- Selective document sync (PM → CG)
- Tagging system in PM system
- OCR trigger on court order sync

### Phase 8D: Additional Integrations (Future)
- Clio (same pattern as MyCase)
- Smokeball (same pattern)
- PracticePanther (same pattern)
- CosmoLex (same pattern)

**Note:** Once MyCase integration is built, other PM integrations are 80% code reuse with different OAuth/API endpoints.

---

## Summary: Integration Philosophy

**CommonGround + Practice Management = Better Together**

```
Practice Management          CommonGround               Result
─────────────────────────────────────────────────────────────────
Case metadata          →     Case setup            =   No double entry
Court dates            →     Parent notifications  =   Parents informed
Attorney action        ←     Compliance reports    =   Court evidence ready
Time tracking          ←     Billable actions      =   Accurate billing
Case timeline          ←     Key events            =   Legal timeline built
Strategic decisions    ←     Compliance insights   =   Data-driven strategy
```

**Each system does what it does best. Integration makes both more powerful.**
