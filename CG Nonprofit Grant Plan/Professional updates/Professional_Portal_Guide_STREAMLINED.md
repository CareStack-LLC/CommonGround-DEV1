# CommonGround Professional Portal Guide
## Essential Features for Family Law Professionals

**Last Updated:** February 26, 2026  
**Philosophy:** Just enough case management to be effective—not a replacement for practice management software.

---

## Core Principle

**CommonGround is NOT:**
- A billing system (use Clio, MyCase, etc.)
- A document management system (use your existing DMS)
- A time tracking tool (use your practice management software)
- A CRM or lead management system

**CommonGround IS:**
- A window into your clients' co-parenting compliance
- A tool to monitor ARIA-mediated communication
- A way to generate court-ready reports
- An interface to manage custody agreements and exchanges
- A dashboard for high-conflict case oversight

---

## Navigation Structure (Simplified)

### Primary Navigation
```
1. Dashboard           → What needs attention today
2. Cases               → View/search your active cases
3. Intake Center       → ARIA intake pipeline
4. Messages            → Unified inbox across cases
5. Profile             → Your public profile + settings
```

### Case-Level Navigation (within a case)
```
1. Overview            → Case health at a glance
2. Communication       → Message history + ARIA analysis
3. Documents           → Court orders + evidence
4. Compliance          → Exchange/support/message compliance
5. Calendar            → Shared events with parents
```

**REMOVED:** Firm Calendar, Case Queue, Tasks (use your practice management system)
**WHY:** These features duplicate existing professional tools and add unnecessary complexity.

---

## 1. Dashboard (`/professional/dashboard`)

**Purpose:** See what needs your attention across all cases—right now.

### What You See

**Active Alerts (Top Priority)**
- 🔴 ARIA escalations (hostile message patterns detected)
- ⚠️ Compliance violations (missed exchanges, overdue support)
- 📋 Completed intakes awaiting review
- 📅 Court dates in next 7 days

**Case Health Summary**
- Active Cases count
- Average compliance score
- Cases with declining compliance (trend ↓)
- Cases with upcoming hearings

**Recent Activity (Last 24 Hours)**
- New messages flagged by ARIA
- Documents uploaded by parents
- Exchanges marked missed/late
- Support payments disputed

### What You Can Do

**Quick Actions:**
- Open any case
- Review flagged message
- Acknowledge alert
- Generate compliance report

**That's It.** No task lists, no firm-wide analytics, no team dashboards.

### Design Notes

- **Mobile-first:** Stack cards vertically
- **Action-oriented:** Every alert links directly to the relevant context
- **Real-time:** Updates via Supabase subscriptions
- **Minimal chrome:** No elaborate KPI visualizations—just numbers and trends

---

## 2. Cases (`/professional/cases`)

**Purpose:** Find and open your cases. Basic search and filtering only.

### What You See

**Case List Table:**
```
Case Name | Parents | Compliance | Next Event | Status | Actions
Smith/Johnson | Sarah S., Mike J. | 73% ↓ | Hearing 3/15 | Active | [Open]
Martinez Family | Ana M., Carlos M. | 91% ↑ | - | Active | [Open]
```

**Filters (Essential Only):**
- Status: Active / Closed
- Compliance: High Risk (<70%) / Medium / Healthy (>85%)
- Upcoming Court Date: Next 7 days / Next 30 days / None scheduled
- Search: Parent names, case number

**REMOVED:**
- ❌ Bulk actions (assign, tag, export multiple cases)
- ❌ Saved filter views
- ❌ Case status trends/analytics
- ❌ Team assignment features
- ❌ Advanced filtering (jurisdiction, matter type, etc.)

**WHY:** Your practice management system handles case organization. CommonGround shows compliance—that's its job.

### What You Can Do

- **Search/filter cases**
- **Open a case** (goes to Case Overview)
- **Create new case** (via manual entry OR court document upload)

### Create New Case

**Two Options:**

**Option 1: Manual Entry**
- Parent A name, email, phone
- Parent B name, email, phone
- Children (names, birthdates)
- Jurisdiction
- Case number (optional)
- Send invite to parents

**Option 2: From Court Order (OCR)**
- Upload FL-341 or similar custody order (PDF)
- System extracts parties, children, schedule, support
- Review and confirm extracted data
- System creates case + locks court-ordered terms
- Parents receive invite with pre-populated agreement

**That's it.** No elaborate case intake forms. No custom fields. No matter type taxonomies.

---

## 3. Intake Center (`/professional/intakes`)

**Purpose:** Send ARIA intake links to prospective clients and review completed intakes.

### What You See

**Pipeline Stats:**
- Sent: 12
- In Progress: 4 (33% avg complete)
- Completed: 7 (awaiting review)
- Expired: 2

**Intake List:**
```
Client | Template | Status | Sent | Expires | Actions
Sarah Williams | Custody | Completed ✅ | 2/10 | - | [Review] [Create Case]
John Davis | Child Support | In Progress (67%) | 2/15 | 2/22 | [Remind]
Maria Lopez | Initial Consult | Pending | 2/18 | 2/25 | [Resend Link]
```

**REMOVED:**
- ❌ Advanced analytics (drop-off rates, avg completion time, confidence distributions)
- ❌ Custom intake builder (use pre-built templates only)
- ❌ SLA tracking for intakes
- ❌ Convert to "lead" vs "case" distinction

**WHY:** Intake is a data collection tool, not a CRM. Keep it simple.

### What You Can Do

**Send New Intake:**
1. Choose template (6 standard templates available)
2. Enter client email/phone
3. Set expiration (default: 7 days)
4. Send link

**Review Completed Intake:**
1. View all answers organized by section
2. See ARIA's summary and risk flags
3. Click "Create Case" → auto-populates case data
4. Send parent invites

**Resend/Extend:**
- Resend link if not opened
- Extend expiration if needed
- Cancel link if client no longer interested

### Standard Intake Templates

1. **Comprehensive Custody** (17 sections) - Full custody agreement
2. **Custody Only** (10 sections) - No financial questions
3. **Child Support Only** (8 sections) - Financial focus
4. **Initial Consultation** (5 sections) - Quick overview
5. **Modification Request** (6 sections) - What changed since last order
6. **Move-Away/Relocation** (7 sections) - Relocation-specific questions

**No custom templates in MVP.** These 6 cover 95% of use cases.

---

## 4. Messages (`/professional/messages`)

**Purpose:** Unified inbox for parent-to-professional messages across all your cases.

### What You See

**Simple Inbox:**
```
Case | From | Preview | Time | Status
Smith/Johnson | Sarah | "Can we change next weekend?" | 2h ago | Unread
Martinez | Carlos | "I uploaded the medical bill" | 1d ago | Read
```

**Filters:**
- All / Unread
- ARIA Flagged (hostile messages rewritten)
- Last 7 days / 30 days / All time

**REMOVED:**
- ❌ "Needs Response" SLA timers
- ❌ Saved message views
- ❌ Bulk actions
- ❌ Team assignment features
- ❌ Complex threading UI

**WHY:** This is a monitoring tool. Deep conversations happen in your email or practice management system.

### What You Can Do

- **View message thread** (opens in modal or full page)
- **Reply to parent(s)** (sends via CommonGround, logged for court)
- **Export thread** (PDF for court submission)
- **Jump to case** (opens Case Communication tab)

**Design Note:** Keep this lightweight. Attorneys don't want to switch between systems for every message. This is for oversight, not primary communication.

---

## 5. Profile & Firm Management (`/professional/profile`)

**Purpose:** Manage your public directory presence (marketing tool) and account settings.

### What You See

**Public Profile (Individual or Firm):**
- Firm name + logo (if part of a firm)
- Individual headshot + name + title
- Firm/individual bio (500 chars max)
- Practice areas (select from list)
- Jurisdictions served
- Languages spoken
- Years of experience
- Bar number (verified)
- Services offered with descriptions
- Contact email/phone
- Office locations (if multiple)

**Live Preview:** Shows how parents see your profile when searching the directory

**Settings Tabs:**
- Profile (edit public listing)
- Team (firm accounts only)
- Integrations (MyCase, Clio, etc.)
- Notifications
- Directory Visibility (On/Off/Featured)
- Account & Billing

### Firm Profile Features

**If you're part of a firm, you can:**

**Manage Firm Profile:**
- Firm name, logo, brand color
- Firm bio (500 chars)
- Office locations
- Practice areas
- Contact information
- Website link

**Manage Team Roster:**
- Add team members (attorneys, mediators, paralegals)
- Each member has:
  - Name, headshot, title, bio (200 chars)
  - Individual practice areas
  - Individual services offered
  - Languages spoken
  - Bar number (if attorney)
- Set team member visibility (show in directory or not)
- Designate "Featured" team members (highlighted in directory)

**Services Offered:**
Each team member can list services with descriptions:
- Initial Consultation ($200, 30 min)
- Custody Mediation ($350/hr)
- Document Review ($250 flat)
- Court Representation ($400/hr)
- High-Conflict Case Management ($500/hr)
- Custom service descriptions

**Example Firm Directory Listing:**
```
Smith & Associates Family Law
Los Angeles, CA | Pasadena, CA

Practice Areas: Custody, Support, Divorce, DV Cases
Languages: English, Spanish, Mandarin

Team (5 attorneys):
- John Smith (Partner) - Custody, High-Conflict [Featured]
- Jane Doe (Partner) - DV Cases, Mediation [Featured]
- Maria Garcia (Associate) - Spanish-speaking clients
- David Chen (Associate) - Mandarin-speaking clients
- Sarah Johnson (Paralegal)

[View Full Profile] [Invite to My Case]
```

### Why This Matters (Marketing Value)

**Problem:** Parents searching for attorneys don't know who specializes in their specific situation.

**Solution:** Rich profiles with team bios, practice areas, and services help parents find the RIGHT attorney for their case type.

**Parent Search Experience:**
1. Parent searches: "Custody attorney Los Angeles Spanish speaking"
2. Results show: Firms/attorneys matching criteria
3. Parent views: Firm profile with team roster
4. Parent sees: Maria Garcia specializes in Spanish-speaking custody cases
5. Parent clicks: "Invite to My Case"
6. Invitation goes to firm's Case Queue
7. Firm dispatcher assigns to Maria Garcia
8. Maria reviews case and accepts

**This turns CommonGround into a lead generation tool for attorneys.**

### Integrations Tab

**Purpose:** Connect CommonGround cases to your practice management system for seamless data flow.

**Supported Integrations (Phase 2):**
- MyCase
- Clio
- Smokeball
- PracticePanther
- CosmoLex

### How It Works

**One-Time Setup:**
1. Navigate to Profile → Integrations
2. Click "Connect MyCase" (or other platform)
3. Authorize CommonGround via OAuth
4. Select sync preferences

**Sync Options:**

**FROM Practice Management TO CommonGround:**
- Case metadata (client names, case number, jurisdiction)
- Court dates → Auto-create events in Case Calendar
- Documents → Option to pull into CommonGround Documents tab

**FROM CommonGround TO Practice Management:**
- Compliance reports → Auto-upload to case files in MyCase
- ARIA analysis reports → Upload as document
- Time entries → Log "Report Generation" time (if enabled)
- Case notes → Sync key events (missed exchange, ARIA escalation)

**Case Linking:**
```
MyCase Case #FL-2024-12345 ⟷ CommonGround Case "Smith Family"
```

Once linked:
- Reports generated in CommonGround → Appear in MyCase documents
- Court dates added in MyCase → Appear in CommonGround case calendar
- Activity logged in both systems (two-way sync)

### What This Solves

**Problem:** Attorneys have to manually copy compliance reports from CommonGround into their case management system.

**Solution:** Generate report in CommonGround → Click "Upload to MyCase" → Report appears in case file automatically.

**Time Saved:** 5-10 minutes per report × 3-5 reports per case = 15-50 minutes per case

### Important: What We DON'T Sync

- ❌ Billing/invoicing (stays in practice management system)
- ❌ Time tracking (stays in practice management system)
- ❌ Trust accounting (stays in practice management system)
- ❌ Client intake forms unrelated to custody (stays in PM system)
- ❌ All firm documents (only CommonGround-generated reports sync)

**Why:** CommonGround is a specialized co-parenting tool, not a replacement for practice management. We sync what's relevant: compliance data and court reports.

### Privacy & Security

- **OAuth 2.0:** Industry-standard authorization (no password sharing)
- **Scoped Access:** CommonGround only accesses case files you explicitly link
- **Audit Log:** Every sync action logged with timestamp
- **Revocable:** Disconnect integration anytime (doesn't delete data)

### Future Integrations (Phase 3)

- Google Drive (export reports directly)
- Dropbox (document storage)
- Outlook Calendar (sync court dates)
- Zoom (schedule parent meetings)

**Note:** Integrations are optional. You can use CommonGround standalone without connecting any external systems.

**What to notify me about:**
- ☑ ARIA flags (hostile messages)
- ☑ Compliance violations (missed exchanges, overdue support)
- ☑ Completed intakes
- ☑ Court date reminders (3 days before)
- ☐ Every new message (off by default—too noisy)

**How to notify:**
- ☑ Email
- ☑ In-app (bell icon)
- ☐ SMS (optional, costs extra)

**Quiet Hours:** 9 PM - 7 AM (no notifications except urgent)

**That's it.** No complex notification matrix. No per-notification-type channel selection.

---

## 5A. Case Queue (`/professional/queue`) - Firm Feature

**Purpose:** Manage incoming case invitations from the directory and assign to team members.

**Who Sees This:** Firm owners and dispatchers only. Individual practitioners don't have a queue—invites go directly to them.

### What You See

**Queue Stats:**
- Pending Invitations: 5
- Assigned (awaiting acceptance): 3
- Accepted (last 7 days): 12

**Invitation List:**
```
Parent | Case Type | Source | Received | Actions
Sarah Martinez | Custody | Directory | 2h ago | [View] [Assign]
John Davis | Child Support | Referral | 1d ago | [View] [Assign]
Maria Lopez | Modification | ARIA Intake | 3d ago | [View] [Assign]
```

### Parent Invitation Flow

**From Parent's Perspective:**
1. Parent searches directory: "Custody attorney Los Angeles Spanish"
2. Finds: Smith & Associates (Maria Garcia speaks Spanish)
3. Clicks: "Invite to My Case"
4. Fills brief form:
   - Name, email, phone
   - Case type (custody, support, divorce, etc.)
   - Brief description (optional)
   - Preferred attorney (optional: "I'd like to work with Maria Garcia")
5. Submits invitation

**From Firm's Perspective:**
1. Invitation appears in Case Queue
2. Dispatcher sees:
   - Parent name & contact
   - Case type
   - Description: "Need help with custody modification, Spanish speaking preferred"
   - Requested attorney: Maria Garcia
3. Dispatcher options:
   - **Assign to Maria Garcia** → Maria receives notification
   - **Assign to different attorney** → That attorney receives notification
   - **Decline** (with reason: "Outside our jurisdiction")
   - **Request More Info** → Send ARIA intake link for detailed information

**After Assignment:**
4. Assigned attorney receives notification:
   - "New case invitation from Sarah Martinez (Custody - Spanish speaking)"
   - [View Details] [Accept] [Decline]
5. Attorney reviews and clicks "Accept"
6. System creates case and sends parent invite to join

### Why This Matters

**Problem:** Parents invite firm, but firm has 5 attorneys. Who handles it?

**Solution:** Firm dispatcher (or office manager) reviews incoming invites and assigns to the right team member based on:
- Language match
- Practice area specialty
- Current workload
- Client preference

**This is NOT complex case routing.** It's simple triage: "This invite goes to Maria, that one goes to John."

### Queue Actions

**View Invitation:**
- See parent contact info
- Read case description
- View ARIA intake results (if they completed one)
- See practice area tags

**Assign to Team Member:**
- Select attorney from dropdown
- Add internal note (optional)
- Notify attorney
- Move from "Pending" to "Assigned"

**Decline Invitation:**
- Select reason: Outside jurisdiction / Conflict of interest / Not accepting new clients / Other
- Optional: Suggest another firm (community goodwill)
- Parent receives: "Thank you for your interest. Unfortunately, we're unable to take your case at this time."

**Request More Info:**
- Send ARIA intake link to parent
- Parent completes intake
- Results appear in queue with invitation
- Now you have detailed case info to assign intelligently

### SLA Tracking (Optional)

**Default SLA:** Respond to invitations within 48 hours

**After 48 Hours:**
- Invitation badge turns yellow (⚠️ approaching SLA)
- After 72 hours: Turns red (🔴 SLA breached)
- Firm admin receives notification

**Why:** Parents expect timely responses. Ignoring invites = poor directory reputation.

### No Complex Routing Rules

**We're NOT building:**
- ❌ Auto-assignment based on availability
- ❌ Round-robin distribution
- ❌ Workload balancing algorithms
- ❌ Territory-based routing
- ❌ Skill-matching AI

**We ARE building:**
- ✅ Simple list of invitations
- ✅ Manual assignment to team members
- ✅ SLA tracking (respond within 48hrs)
- ✅ Decline with reason

**Why:** Firms know their team's strengths and capacity better than an algorithm. Keep it simple.

---

## 6. Case Overview (`/professional/cases/:caseId`)

**Purpose:** Case health at a glance. See compliance, recent activity, and quick access to sub-sections.

### What You See

**Case Header:**
```
Smith v. Johnson Family
Case #: FL-2024-12345
Jurisdiction: Los Angeles County Superior Court
Status: Active | Attorney: You
```

**Parties & Children:**
- Parent A: Sarah Smith (sarah@email.com)
- Parent B: Mike Johnson (mike@email.com)
- Children: Emma (7), Lucas (10)

**Compliance Score (Prominent):**
```
Overall Compliance: 73% ↓ (down 8% this month)

Exchange Compliance: 82% (9 of 11 on-time)
Support Compliance: 67% ($800 overdue)
Communication Compliance: 71% (14 ARIA flags)
```

**Recent Activity (Last 7 Days):**
- Yesterday: Missed exchange at 6pm (Mike didn't pick up)
- 2 days ago: ARIA flagged hostile message from Sarah
- 3 days ago: Mike uploaded school report card
- 5 days ago: Support payment $400 received (partial)

**Quick Actions (Jump To):**
- [View Messages] → Communication tab
- [View Documents] → Documents tab
- [View Calendar] → Shared calendar
- [Generate Report] → Compliance report for court

**REMOVED:**
- ❌ Case tasks panel
- ❌ Elaborate metrics dashboard
- ❌ Trend charts
- ❌ Custom quick actions
- ❌ Export case packet

**WHY:** You need to see case health and jump to details. That's it. Your practice management system has the full case file.

---

## 7. Case Communication (`/professional/cases/:caseId/communication`)

**Purpose:** View message history between parents and see ARIA's intervention summary.

### What You See

**Message Stream:**
- All parent-to-parent messages (chronological)
- Messages rewritten by ARIA highlighted with badge: "✏️ Rewritten"
- Click badge to see original hostile message

**ARIA Analysis Panel (Right Side):**
```
Last 30 Days:
- 14 hostile messages intercepted
- 12 successfully rewritten and sent
- 2 escalated (threats detected)
- Conflict trend: ↑ Increasing

Common patterns:
- Late pickup accusations (5x)
- Blaming language (8x)
- All-caps messages (3x)
```

**REMOVED:**
- ❌ Message composer (reply to parents)
- ❌ Call scheduling
- ❌ Call logs
- ❌ Staff notes
- ❌ Message templates

**WHY:** This tab is for MONITORING parent communication, not conducting it. If you need to message parents, use Messages section or your email.

### What You Can Do

- **View full message history**
- **See ARIA interventions** (before/after comparison)
- **Export thread** (PDF for court)
- **Generate communication report** (ARIA flags + patterns for court)

**Design Note:** Make ARIA's value visible. Show attorneys that hostile communication is being intercepted and neutralized—protecting their clients and the children.

---

## 8. Case Documents (`/professional/cases/:caseId/documents`)

**Purpose:** View court orders and evidence uploaded by parents. Upload additional documents if needed.

### What You See

**Document Library (Simple Categories):**
- **Court Orders** (3 docs)
  - FL-341 Custody Order (Feb 2024) - 🔒 Controlling Document
  - FL-150 Income Declaration (Jan 2024)
- **Medical** (2 docs)
  - Emma's prescription (uploaded by Sarah)
  - Doctor's note (uploaded by Mike)
- **School** (1 doc)
  - Report card Q2 (uploaded by Mike)
- **Financial** (4 docs)
  - Medical bill $180 (uploaded by Sarah)
  - Receipt - sports fees (uploaded by Mike)
- **Evidence** (0 docs)
- **Other** (1 doc)

**REMOVED:**
- ❌ Custom folders
- ❌ Tagging system
- ❌ Advanced search
- ❌ Version control
- ❌ Collaborative editing
- ❌ OCR for searchable text (except for court order ingestion)

**WHY:** This is a lightweight document viewer, not a DMS. Store your full case file in your practice management system.

### What You Can Do

- **View documents** (inline PDF viewer)
- **Download documents**
- **Upload document** (assign to category)
- **Upload Court Order** (triggers OCR extraction → updates case rules)
- **Export all documents** (ZIP for discovery or court submission)

### Court Order Upload (Special Action)

When you upload a document marked as "Court Order":
1. System detects form type (FL-341, FL-311, etc.)
2. Extracts schedule, support obligations, restrictions
3. Shows extracted data for your review
4. Updates case with court-ordered terms
5. **Locks those fields** from parent editing (🔒 badge appears)
6. Parents notified: "Court order filed - some settings are now locked"

**This is the core value:** Court orders automatically update the family's SharedCare Agreement and lock terms, ensuring compliance.

---

## 9. Case Compliance (`/professional/cases/:caseId/compliance`)

**Purpose:** Detailed compliance breakdown for court reporting.

### What You See

**Exchange Compliance:**
```
Last 30 Days: 9 of 11 exchanges completed on-time (82%)

Missed Exchanges:
- Feb 15, 6:00 PM - Mike Johnson (pickup)
- Feb 22, 6:00 PM - Mike Johnson (pickup)

Late Exchanges:
- Feb 8, 6:15 PM - Sarah Smith (dropoff, 15 min late)
```

**Support Compliance:**
```
Current Status: $800 overdue (2 months)

Payment History:
- Feb 1: $400 (partial payment, $400 short)
- Jan 1: $0 (missed)
- Dec 1: $800 (on-time)
```

**Communication Compliance:**
```
Last 30 Days: 14 ARIA interventions (71% compliance)

Top Issues:
- Hostile language (8 messages)
- Accusations/blaming (5 messages)
- All-caps shouting (3 messages)
- Threats (2 messages - escalated)
```

**REMOVED:**
- ❌ Custom compliance metrics
- ❌ Trend analysis
- ❌ Benchmarking against other cases
- ❌ Predictive analytics

**WHY:** Judges want simple, factual compliance data. Show what happened, not complex analysis.

### What You Can Do

- **Generate Compliance Report** (PDF)
  - Executive summary
  - Exchange compliance table
  - Support payment history
  - Communication violations
  - SHA-256 verification code (court-ready)
  - Download or email to court

**Design Note:** One-click report generation is the killer feature. Attorneys spend hours compiling this data manually today.

---

## 10. Case Calendar (`/professional/cases/:caseId/calendar`)

**Purpose:** Shared calendar with parents for court dates, calls, and reminders.

### What You See

**Month/Week/Day View:**
- 📅 Court dates (blue)
- 📞 Scheduled calls (green)
- 📋 Reminders (yellow)
- 🔁 Exchanges (gray, read-only—pulled from schedule)

**Event List (Next 30 Days):**
```
Mar 15, 10:00 AM - Custody Hearing (Dept 12) [Shared with both parents]
Mar 10, 2:00 PM - Check-in call with Sarah [Private]
Mar 5, 5:00 PM - Reminder: Submit financial docs [Shared with Mike only]
```

**REMOVED:**
- ❌ Firm-wide calendar
- ❌ Team scheduling
- ❌ Availability booking
- ❌ Calendar sync (Google, Outlook, etc.)
- ❌ Recurring events

**WHY:** This is a case-specific shared calendar, not a practice management calendar. Use your existing calendar system for firm scheduling.

### What You Can Do

- **Create Event:**
  - Title, date, time, location
  - Type: Court / Call / Reminder
  - Visibility: Private (attorney only) / Shared with Parent A / Shared with Parent B / Shared with both
  - Reminders: 1 week, 3 days, 1 day before (optional)

- **Edit/Delete Event**
- **View Event Details**

**When "Shared" is checked:** Parents see the event on their calendar and receive email reminders.

**Design Note:** Keep event creation simple. 5 fields max. No elaborate recurring rules or attendee management.

---

## 11. Create Case via Court Order (OCR)

**Purpose:** The fastest way to create a case—upload the judge's order and let the system extract everything.

### User Flow

1. **Cases → Create New Case → From Court Order**
2. **Upload PDF** (FL-341, FL-311, FL-312, FL-150, FL-342, or similar)
3. **System Extracts:**
   - Parent names, addresses, emails (if present)
   - Child names, birthdates
   - Case number, jurisdiction
   - Custody split (50/50, 70/30, etc.)
   - Parenting schedule (weekdays, weekends, holidays)
   - Child support amount, frequency, due date
   - Special restrictions (supervised visits, communication limits)

4. **Review Extracted Data:**
   - Green highlight = High confidence (95%+)
   - Yellow highlight = Medium confidence (75-95%) - verify
   - Red highlight = Low confidence (<75%) - manually correct

5. **Confirm & Create:**
   - Click "Create Case"
   - System creates Family File with parents + children
   - Populates SharedCare Agreement with extracted terms
   - **Locks court-ordered fields** (schedule, support, restrictions)
   - Sends parent invites

6. **Parents Receive:**
   - Email: "Your attorney has set up CommonGround for your case"
   - SharedCare Agreement pre-filled with court order
   - Locked fields show: 🔒 "Set by court order"

### What Gets Locked

**From Custody Orders:**
- Parenting schedule (days, times, exchanges)
- Legal custody designation
- Physical custody percentage
- Holiday schedule
- Transportation rules
- Special restrictions

**From Support Orders:**
- Support amount
- Payment frequency
- Due date
- Medical expense split
- Extracurricular split

**Why Locking Matters:**
- Parents can't unilaterally change court-ordered terms
- Reduces conflict over "what the order says"
- Ensures compliance tracking is accurate
- Changes require new court order upload (audit trail)

### Professional Override

**If you need to unlock a field:**
1. Click 🔒 icon
2. Enter reason: "Parties agreed to temporary modification" or "New order pending"
3. Field unlocks (logged with timestamp + reason)
4. Parents notified: "Attorney unlocked [field]"

**Use sparingly.** Courts trust locked fields. Frequent unlocking undermines that trust.

---

## 12. What We're NOT Building (And Why)

### ❌ Full Practice Management
**Not Building:**
- Billing & time tracking
- Trust accounting
- Client CRM & lead management (beyond directory)
- Matter management (case lifecycle beyond compliance)
- Document assembly
- E-signatures
- Conflict checks

**Why:** Attorneys already use Clio, MyCase, PracticePanther, etc.

**What We ARE Building:** 
- **Integrations** with these systems (MyCase, Clio, Smokeball) to sync compliance reports and court dates
- This is Phase 2 - connect existing cases to pull/push relevant data
- **NOT replacing** practice management - complementing it

**What We Provide Instead:** A focused window into co-parenting compliance that syncs key data back to your PM system.

---

### ❌ Elaborate Team Collaboration
**Not Building:**
- Team chat / Slack alternative
- Complex task assignment workflows
- Time tracking per team member
- Automated case routing rules
- Capacity planning
- Workload balancing algorithms

**Why:** Law firms have established workflows. We're not changing how firms operate internally.

**What We ARE Building:**
- Firm profiles for directory marketing
- Simple case queue for incoming invitations
- Manual assignment to team members
- Team roster management (who's visible in directory)

**What We Provide Instead:** Simple case invitation triage, not complex workflow automation.

---

### ❌ Advanced Analytics & Reporting
**Not Building:**
- Firm-wide dashboards
- Revenue analytics
- Case profitability
- Time allocation reports
- Client acquisition metrics
- Predictive analytics

**Why:** Practice management systems provide this. Adding it here creates maintenance burden and feature bloat.

**What We Provide Instead:** Compliance reports for court (exchange, support, communication) with SHA-256 verification. That's our lane.

---

### ❌ Marketing & Client Acquisition Tools
**Not Building:**
- Website builder
- SEO tools
- Ad campaign management
- Lead magnets / content marketing
- Email marketing automation
- Client testimonial collection
- Review management

**Why:** Attorneys use specialized legal marketing services (Avvo, FindLaw, etc.). We're not a marketing platform.

**What We ARE Building:**
- **Rich directory profiles** (firm + team roster + services + practice areas)
- **Parent search** (find attorneys by specialty, language, location)
- **Direct invitations** from parents to attorneys via directory
- This is lead generation through discoverability, not marketing automation

**What We Provide Instead:** A searchable directory that helps parents find you and invite you directly. Think "Yelp for custody attorneys" not "HubSpot for law firms."

---

### ❌ Deep Customization & Configuration
**Not Building:**
- Custom fields on cases
- Workflow builder
- Form builder beyond ARIA intake templates (6 standard templates only)
- Custom report templates (compliance reports are standardized)
- White-label branding (Phase 1)
- Full API for external developers (Phase 1)

**Why:** Every custom feature adds complexity and maintenance. We're building a focused product, not a platform.

**What We ARE Building:**
- **Practice management integrations** (connect cases, sync reports)
- Standard, court-accepted compliance report format
- Team member customization (bios, services, practice areas)

**What We Provide Instead:** Opinionated, best-practice workflows that work for 80% of family law cases. If you need custom features beyond this, use your practice management system.

---

## 13. Design Principles

### Principle 1: Read-Only by Default
**Most views are READ-ONLY.** Professionals are monitoring compliance, not managing every detail.

**Example:** Communication tab shows message history but doesn't have an inline reply box. If you need to message parents, use the Messages section or your email.

**Why:** Reduces cognitive load. Each page has one clear purpose.

---

### Principle 2: One Click to Court-Ready
**Every compliance metric should export to PDF in one click.**

**Example:** Compliance tab has "Generate Report" button. Clicking it produces a SHA-256-verified PDF ready for court filing.

**Why:** Attorneys bill $300-500/hour. Saving 2 hours of report compilation = $600-1000 value per case.

---

### Principle 3: No Duplicate Features
**If your practice management system does it, we don't.**

**Example:** We don't have a calendar sync with Google Calendar. Use your existing calendar. CommonGround's case calendar is for SHARED events with parents only.

**Why:** Reduces confusion about "which calendar to use" and keeps us focused.

---

### Principle 4: Mobile = View, Desktop = Act
**Mobile optimized for viewing and quick actions. Full editing requires desktop.**

**Example:** On mobile, you can view case compliance and acknowledge an ARIA alert. To generate a full compliance report, use desktop.

**Why:** Attorneys review on mobile, work on desktop. Optimize for each context.

---

### Principle 5: ARIA is the Differentiator
**Every feature should highlight ARIA's value: conflict prevention.**

**Example:** Dashboard shows "14 hostile messages rewritten this month" prominently. Communication tab has before/after comparison.

**Why:** ARIA is our competitive advantage. Make its impact visible and measurable.

---

## 14. Information Architecture Summary

### Global Navigation (Always Visible)
```
Dashboard | Cases | Intake Center | Messages | Queue* | Profile

*Queue only visible to firm owners/dispatchers
```

### Case Navigation (When Inside a Case)
```
Overview | Communication | Documents | Compliance | Calendar
```

### Maximum Depth: 3 Clicks
- Home → Cases → Case Overview (2 clicks)
- Case Overview → Compliance → Generate Report (3 clicks)

**No feature should be buried deeper than 3 clicks from the home screen.**

---

## 15. Success Metrics (How We Know This Works)

### For Attorneys
- **Time Saved:** <5 minutes to generate court-ready compliance report (vs 2 hours manually)
- **Conflict Visibility:** See ARIA interventions at a glance
- **Case Health:** Compliance score updates daily, no manual tracking
- **Court Acceptance:** Reports admitted as evidence without challenge

### For CommonGround (Product)
- **Adoption:** >70% of attorneys log in weekly
- **Engagement:** Average 3-5 cases per attorney monitored actively
- **Retention:** <5% monthly churn
- **NPS:** >50 (attorneys recommend to colleagues)

### What We're NOT Measuring
- ❌ Time spent in platform (we want them IN and OUT fast)
- ❌ Number of features used (fewer is better if needs are met)
- ❌ Daily active users (weekly is fine for professional tools)

---

## 16. Implementation Priority (MVP + Growth)

### Phase 1: Core Monitoring (Weeks 1-4) - MVP
- [ ] Dashboard (alerts + case health summary)
- [ ] Cases list + case overview
- [ ] Communication tab (message history + ARIA analysis)
- [ ] Compliance tab + one-click report generation
- [ ] Profile (individual directory listing only)

**Launch Criteria:** Attorneys can view case compliance and generate reports.

---

### Phase 2: Court Order Ingestion (Weeks 5-6) - MVP
- [ ] Create case via OCR (upload court order)
- [ ] Field locking system
- [ ] Professional override with audit log
- [ ] Documents tab (upload + categorization)

**Launch Criteria:** Attorneys can create cases from court orders in <5 minutes.

---

### Phase 3: Intake Pipeline (Weeks 7-8) - MVP
- [ ] Intake Center (send links + review completed)
- [ ] 6 standard ARIA templates
- [ ] Convert intake to case (auto-populate)
- [ ] Intake expiration + reminders

**Launch Criteria:** Attorneys can onboard new clients with zero data entry.

---

### Phase 4: Shared Calendar (Weeks 9-10) - MVP
- [ ] Case calendar (court dates + calls + reminders)
- [ ] Visibility toggle (private vs shared with parents)
- [ ] Parent notifications for shared events
- [ ] Simple event creation (5 fields max)

**Launch Criteria:** Attorneys can share court dates and deadlines with parents.

---

### Phase 5: Messages (Weeks 11-12) - MVP
- [ ] Unified inbox across cases
- [ ] Message thread view
- [ ] Reply to parents (logged for court)
- [ ] Export thread (PDF)

**Launch Criteria:** Attorneys can communicate with parents without email (if desired).

---

### Phase 6: Polish (Weeks 13-14) - MVP COMPLETE
- [ ] Mobile responsive (all views)
- [ ] Error handling + loading states
- [ ] Help documentation
- [ ] Performance optimization

**Launch Criteria:** Production-ready for pilot program.

---

### Phase 7: Firm Profiles & Directory (Weeks 15-16) - GROWTH
- [ ] Firm profile creation and management
- [ ] Team roster management (add attorneys, set visibility)
- [ ] Services offered (descriptions + optional pricing)
- [ ] Enhanced directory search (by specialty, language, location)
- [ ] Parent invitation flow ("Invite to My Case" button)
- [ ] Case Queue (firm owners/dispatchers only)
- [ ] Manual case assignment to team members
- [ ] SLA tracking on invitations (48hr response time)

**Launch Criteria:** Firms can use CommonGround as lead generation tool. Parents can find and invite attorneys directly.

**Why Phase 7:** This is a growth/monetization feature, not core case management. MVP works for solo practitioners without it.

---

### Phase 8: Practice Management Integrations (Weeks 17-20) - GROWTH
- [ ] MyCase OAuth connection
- [ ] Case linking (MyCase case ⟷ CG case)
- [ ] Sync compliance reports → MyCase documents
- [ ] Sync court dates → MyCase calendar
- [ ] Time entry logging (optional)
- [ ] Clio integration (same pattern)
- [ ] Smokeball integration (same pattern)
- [ ] Integration settings page in Profile

**Launch Criteria:** Attorneys using MyCase/Clio can sync cases and auto-upload reports without manual export.

**Why Phase 8:** Integrations add significant complexity (OAuth, API versioning, error handling). MVP works standalone. This is optimization for power users.

---

### Phase 9: Advanced Features (Weeks 21-24) - FUTURE
- [ ] White-label branding (Enterprise tier)
- [ ] API access for custom integrations
- [ ] Multi-office firm support
- [ ] Custom intake template builder
- [ ] Advanced analytics dashboard

**Launch Criteria:** Enterprise features for large firms.

**Why Phase 9:** These are nice-to-haves for specialized use cases. Not required for core product-market fit.

---

## 17. Out of Scope (Phase 1 MVP Only)

**Explicitly NOT building in MVP (Phases 1-6):**
- [ ] Firm profiles & team roster (Phase 7)
- [ ] Case Queue for firm invitations (Phase 7)
- [ ] Practice management integrations (MyCase, Clio, etc.) (Phase 8)
- [ ] Custom intake template builder (Phase 9)
- [ ] Advanced analytics dashboard (Phase 9)
- [ ] White-label branding (Phase 9)
- [ ] API access for developers (Phase 9)
- [ ] Multi-office firm support (Phase 9)
- [ ] Mobile app (responsive web only)
- [ ] Calendar sync (Google, Outlook) (Phase 8)

**Why Delayed, Not Cancelled:**
- **Firm features (Phase 7):** Lead generation is valuable, but solo practitioners need MVP first
- **Integrations (Phase 8):** Complex OAuth/API work that can come after core product proves value
- **Advanced features (Phase 9):** Nice-to-haves for power users, not required for product-market fit

**Phase 1-6 (14 weeks) = Fully functional professional portal for solo practitioners and small firms**

**Phase 7-8 (8 weeks) = Growth features: directory marketing + practice management integration**

**Phase 9 (4 weeks) = Enterprise features for large firms**

---

## 18. Appendix: Terminology

**Case** = A family (Parent A + Parent B + children) that an attorney is monitoring on CommonGround

**Family File** = The parent-facing side of a case (what parents see and interact with)

**SharedCare Agreement** = The digital custody agreement (18 sections) that defines the co-parenting arrangement

**ARIA** = AI that mediates parent communication, rewrites hostile messages, and flags escalations

**Compliance** = How well parents are following the agreement (exchanges, support, communication)

**Court-Locked** = Fields set by court order that parents cannot edit (schedule, support amount, etc.)

**Intake** = ARIA-guided questionnaire sent to prospective clients to gather case information

**Professional** = Attorney, mediator, GAL, or other legal professional using this portal

---

## Questions or Feedback?

This guide is a living document. If something is unclear or you see opportunities to simplify further, please provide feedback.

**Core principle reminder:** We're building just enough case management to make attorneys effective, not replacing their existing practice management system.
