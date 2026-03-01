# CLAUDE OPUS AI - PROFESSIONAL PORTAL IMPLEMENTATION PROMPT

## Context

You are an expert full-stack developer building the CommonGround Professional Portal. You have two key documents:

1. **CommonGround_Professional_Portal_FINAL.md** - Business requirements and specifications
2. **PROFESSIONAL_PORTAL_ARCHITECTURE.md** - Complete UI/UX architecture and implementation blueprint

## Technology Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Storage)
- **Existing Features**: Consumer portal with family files, ARIA mediation, KidComs, messaging, calendar
- **Goal**: Transform existing professional features into a cohesive, commercial-grade operating system

## Your Mission

Build the Professional Portal systematically in 7 phases. Each phase must be complete, tested, and approved before moving to the next.

---

## PHASE 1: Core Navigation & Dashboard (Weeks 1-2)

### What to Build

#### 1.1 Top Navigation Bar (`components/professional/layout/TopNav.tsx`)

Create global navigation with these links:
- Dashboard (home icon)
- Cases (folder icon)
- Calendar (calendar icon)  
- Intake (clipboard icon)
- Messages (mail icon)
- Reports (chart icon) - NEW
- Firm (building icon)
- Notifications (bell icon with unread count) - NEW
- Profile (avatar dropdown)
  - My Profile
  - Subscription
  - Help & Support - NEW
  - Log Out

**Requirements:**
- Highlight active route
- Role-aware (hide "Firm" if user isn't in a firm)
- Mobile responsive with hamburger menu
- Unread counts on Messages and Notifications

#### 1.2 Dashboard Page (`app/professional/dashboard/page.tsx`)

Build dashboard with these sections:

**KPI Cards (4-column grid)**
- Active Cases (count + trend)
- Pending Intakes (count + "expiring soon" warning)
- Unread Messages (count + "ARIA flagged" count)
- Alerts (count + urgency indicators)

**Priority Cases List**
- Show top 5 cases sorted by:
  - Compliance score (lowest first)
  - Upcoming court dates
  - ARIA risk level
  - Unread message count
- Visual indicators: 🔴 High risk, 🟡 Medium, 🟢 Stable
- Quick actions: [View Case] [Message Client] [Generate Report]

**Upcoming Events (Next 7 Days)**
- Court hearings, deadlines, meetings
- Link to case
- Add to calendar option

**Recent Activity Feed**
- Last 10 events across all cases
- Types: messages, ARIA flags, documents uploaded, intakes completed
- Clickable to go to relevant context

**My Tasks Widget** - NEW
- Lightweight checklist
- Tied to cases
- Add/complete/delete tasks
- Filter by due date/priority

**Quick Create Dropdown** - NEW
- New Case
- Send ARIA Intake
- Upload Court Order  
- Schedule Court Event
- Create Task

### Database Schema

```sql
-- Tasks table
CREATE TABLE professional_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tasks_professional ON professional_tasks(professional_id);
CREATE INDEX idx_tasks_case ON professional_tasks(case_id);
CREATE INDEX idx_tasks_due_date ON professional_tasks(due_date);

-- Activity log table  
CREATE TABLE professional_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id),
  firm_id UUID REFERENCES firms(id),
  case_id UUID REFERENCES cases(id),
  activity_type VARCHAR(50), -- message, document, event, intake, aria_flag, assignment
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_professional ON professional_activity_log(professional_id);
CREATE INDEX idx_activity_firm ON professional_activity_log(firm_id);
CREATE INDEX idx_activity_case ON professional_activity_log(case_id);
CREATE INDEX idx_activity_created ON professional_activity_log(created_at DESC);
```

### API Endpoints

```typescript
// app/api/professional/dashboard/stats/route.ts
GET /api/professional/dashboard/stats
Response: {
  activeCases: number,
  pendingIntakes: number,
  expiringIntakesSoon: number,
  unreadMessages: number,
  ariaFlaggedMessages: number,
  alerts: number,
  urgentAlerts: number
}

// app/api/professional/dashboard/priority-cases/route.ts
GET /api/professional/dashboard/priority-cases?limit=5
Response: Case[]

// app/api/professional/dashboard/upcoming-events/route.ts
GET /api/professional/dashboard/upcoming-events?days=7
Response: Event[]

// app/api/professional/dashboard/activity/route.ts
GET /api/professional/dashboard/activity?limit=10
Response: ActivityLog[]

// app/api/professional/dashboard/tasks/route.ts
GET /api/professional/dashboard/tasks
Response: Task[]

POST /api/professional/dashboard/tasks
Body: { title, description, caseId?, dueDate?, priority }
Response: Task

PATCH /api/professional/dashboard/tasks/:id
Body: { completed: boolean }
Response: Task
```

### Components to Create

```
components/professional/
├── layout/
│   ├── TopNav.tsx
│   ├── MobileNav.tsx
│   └── ProfileDropdown.tsx
├── dashboard/
│   ├── KPICard.tsx
│   ├── PriorityCasesList.tsx
│   ├── PriorityCaseCard.tsx
│   ├── UpcomingEvents.tsx
│   ├── ActivityFeed.tsx
│   ├── ActivityItem.tsx
│   ├── TasksWidget.tsx
│   ├── TaskItem.tsx
│   ├── QuickCreateMenu.tsx
│   └── AddTaskModal.tsx
```

### Definition of Done (Phase 1)

- [ ] Navigation renders on all professional pages
- [ ] Dashboard shows real data from Supabase
- [ ] KPI cards update in real-time
- [ ] Priority cases list sorts correctly
- [ ] Quick Create menu works for all actions
- [ ] Tasks can be created, completed, and deleted
- [ ] Activity feed shows last 10 events
- [ ] Clicking items navigates to correct context
- [ ] Mobile responsive (hamburger menu works)
- [ ] Role-based features hidden appropriately
- [ ] Loading states and error handling

---

## PHASE 2: Cases List & Case Detail (Weeks 3-4)

### What to Build

#### 2.1 Cases List Page (`app/professional/cases/page.tsx`)

**Filter Bar**
- Search by case name, parent name, case number
- Status filter: All, Active, Pending, Closed
- Urgency filter: All, Urgent, High, Medium, Low  
- Attorney filter: All, Me, [Team member names]
- Court date filter: All, Next 7 days, Next 30 days, Custom range
- ARIA risk filter: All, High, Medium, Low
- Saved views: My Cases, Urgent, DV Flagged, Court This Week

**Cases Table**
- Columns: Checkbox, Case Name, Attorney, Status, Next Court Date, Actions
- Expandable rows showing quick info (compliance, alerts)
- Multi-select checkboxes
- Sort by any column
- Pagination (25 per page)

**Bulk Actions**
- Assign to attorney
- Add tags
- Export selected
- Change status
- Archive

#### 2.2 Case Detail Page (`app/professional/cases/[caseId]/page.tsx`)

**Tab Structure:**
- Overview
- Timeline
- Communication (sub-tabs: Messages, Calls, Compliance Reports, ARIA Controls)
- Documents
- Portals (sub-views: Compliance Dashboard, ClearFund, Agreement Review, Exchange Schedule, Parent Communications)

**Overview Tab:**
- Case summary card
- Case health (compliance score with visual progress bar)
- Risk flags
- Key dates
- Quick actions bar

**Timeline Tab:**
- Unified event stream
- Filters by type (messages, exchanges, documents, events, ARIA flags, agreements, financial)
- Date range selector
- Load more pagination

**Communication Tab:**
See existing components but ensure they're integrated into tab structure

**Documents Tab:**
- Document library with type filters
- Upload document button
- Upload court order button (triggers OCR)
- View inline (PDF viewer)
- Download
- Tag/categorize
- Export all / Create case packet

**Portals Tab:** (NEW - This is the differentiator)
- Sub-portal selector: [Compliance Dashboard] [ClearFund] [Agreement Review] [Exchange Schedule] [Parent Communications]
- Each portal is a scoped workspace with consistent header
- Export button for each portal view

### Database Schema Additions

```sql
-- Case tags
CREATE TABLE case_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  created_by UUID REFERENCES professionals(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_case_tags_case ON case_tags(case_id);
CREATE INDEX idx_case_tags_tag ON case_tags(tag);

-- Saved filter views
CREATE TABLE professional_saved_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  view_type VARCHAR(50), -- cases, messages, etc.
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_saved_views_professional ON professional_saved_views(professional_id);
```

### API Endpoints

```typescript
// Cases list
GET /api/professional/cases?status=&urgency=&attorney=&courtDate=&ariaRisk=&search=&page=&limit=
Response: { cases: Case[], total: number, page: number, totalPages: number }

POST /api/professional/cases/bulk-action
Body: { action: 'assign' | 'tag' | 'export' | 'status' | 'archive', caseIds: string[], payload: any }
Response: { success: boolean, updated: number }

// Case detail
GET /api/professional/cases/:caseId
Response: Case with full details

GET /api/professional/cases/:caseId/timeline?type=&startDate=&endDate=&limit=
Response: Event[]

GET /api/professional/cases/:caseId/documents?type=
Response: Document[]

// Portals
GET /api/professional/cases/:caseId/portals/compliance
Response: ComplianceData

GET /api/professional/cases/:caseId/portals/clearfund
Response: FinancialData

GET /api/professional/cases/:caseId/portals/agreement
Response: AgreementData

GET /api/professional/cases/:caseId/portals/exchanges
Response: ExchangeData

GET /api/professional/cases/:caseId/portals/communications
Response: CommunicationAnalysis
```

### Components to Create

```
components/professional/cases/
├── CasesTable.tsx
├── CaseRow.tsx
├── CaseFilters.tsx
├── SavedViews.tsx
├── BulkActionsMenu.tsx
├── CaseDetailTabs.tsx
├── overview/
│   ├── CaseSummaryCard.tsx
│   ├── CaseHealthCard.tsx
│   ├── KeyDatesCard.tsx
│   └── QuickActionsBar.tsx
├── timeline/
│   ├── TimelineView.tsx
│   ├── TimelineFilters.tsx
│   └── TimelineEvent.tsx
├── documents/
│   ├── DocumentLibrary.tsx
│   ├── DocumentListItem.tsx
│   ├── UploadDocumentModal.tsx
│   └── UploadCourtOrderModal.tsx
└── portals/
    ├── PortalSelector.tsx
    ├── ComplianceDashboard.tsx
    ├── ClearFundPortal.tsx
    ├── AgreementReviewPortal.tsx
    ├── ExchangeSchedulePortal.tsx
    └── CommunicationsAnalysisPortal.tsx
```

### Definition of Done (Phase 2)

- [ ] Cases list loads with all filters working
- [ ] Search, sort, and pagination work correctly
- [ ] Bulk actions function on selected cases
- [ ] Saved views can be created and loaded
- [ ] Case detail page shows all tabs
- [ ] Timeline loads events with filters
- [ ] Documents can be uploaded and viewed
- [ ] Court order upload triggers OCR flow
- [ ] All 5 portals render with real data
- [ ] Quick actions on case detail work
- [ ] Mobile responsive
- [ ] Loading states and error handling

---

## PHASE 3: Intake Pipeline (Weeks 5-6)

### What to Build

#### 3.1 Intake List Page (`app/professional/intake/page.tsx`)

**Pipeline Stats**
- Sent, Pending, In Progress, Completed counts
- Completion rate percentage
- Average completion time

**Intake Table**
- Columns: Client Name, Template Type, Status, Sent Date, Expires Date, Actions
- Status indicators: Sent, Pending, In Progress (with % complete), Completed, Expired
- Filter by status and template type

**Actions per Intake:**
- Completed: [Review Intake] [Create Case] [Download]
- In Progress: [View Progress] [Send Reminder]
- Pending: [Resend Link] [Cancel]
- Expired: [Resend] [Archive]

#### 3.2 New Intake Wizard (`app/professional/intake/new/page.tsx`)

**3-Step Process:**

**Step 1: Choose Template**
- Display template grid (from your existing intake templates)
- Show: name, icon, description, estimated time, sections count
- Tier-gate paid templates with upgrade prompt

**Step 2: Configure Recipients & Settings**
- Client name, email, phone
- Link to existing case (optional dropdown)
- Expiration date (default 7 days)
- Reminder settings (checkboxes for 3 days before, 1 day before)
- Custom introduction message (optional)

**Step 3: Review & Send**
- Summary of all selections
- Preview of email that will be sent
- Copy intake link
- [Send Intake] button

#### 3.3 Intake Review Page (`app/professional/intake/[intakeId]/review/page.tsx`)

- Display all completed answers organized by section
- Highlight concerning answers (DV flags, substance abuse, etc.)
- Case quality score
- [Create Case from Intake] button
- [Download PDF] button
- [Send Follow-up Email] button

### Database Schema Additions

```sql
-- Intake sessions (expand existing)
ALTER TABLE intake_sessions ADD COLUMN client_name VARCHAR(255);
ALTER TABLE intake_sessions ADD COLUMN client_phone VARCHAR(50);
ALTER TABLE intake_sessions ADD COLUMN custom_intro TEXT;
ALTER TABLE intake_sessions ADD COLUMN reminder_3_days BOOLEAN DEFAULT true;
ALTER TABLE intake_sessions ADD COLUMN reminder_1_day BOOLEAN DEFAULT true;
ALTER TABLE intake_sessions ADD COLUMN quality_score INTEGER;
ALTER TABLE intake_sessions ADD COLUMN risk_flags JSONB;

-- Intake reminders
CREATE TABLE intake_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intake_id UUID REFERENCES intake_sessions(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50), -- 3_days, 1_day, custom
  scheduled_for TIMESTAMP NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reminders_intake ON intake_reminders(intake_id);
CREATE INDEX idx_reminders_scheduled ON intake_reminders(scheduled_for);
```

### API Endpoints

```typescript
// Intake list
GET /api/professional/intake?status=&template=&page=&limit=
Response: { intakes: IntakeSession[], total: number, stats: PipelineStats }

// New intake
POST /api/professional/intake/create
Body: { templateId, clientName, clientEmail, clientPhone, caseId?, expiresAt, reminders, customIntro }
Response: { intakeId, link }

// Send intake
POST /api/professional/intake/:id/send
Response: { success: boolean, emailSent: boolean }

// Intake details
GET /api/professional/intake/:id
Response: IntakeSession with full responses

// Create case from intake
POST /api/professional/intake/:id/create-case
Response: { caseId }

// Send reminder
POST /api/professional/intake/:id/remind
Response: { success: boolean }

// Resend intake
POST /api/professional/intake/:id/resend
Response: { success: boolean, newExpiresAt }
```

### Components to Create

```
components/professional/intake/
├── IntakeTable.tsx
├── IntakeRow.tsx
├── IntakeStats.tsx
├── IntakeFilters.tsx
├── NewIntakeWizard/
│   ├── Step1TemplateSelector.tsx
│   ├── Step2Configure.tsx
│   └── Step3ReviewSend.tsx
├── IntakeReview.tsx
├── IntakeSection.tsx
├── IntakeQualityScore.tsx
├── CreateCaseButton.tsx
└── SendReminderButton.tsx
```

### Definition of Done (Phase 3)

- [ ] Intake list shows all intakes with correct status
- [ ] Pipeline stats calculate correctly
- [ ] New intake wizard completes all 3 steps
- [ ] Intake link generates and can be copied
- [ ] Email sends with correct content
- [ ] Reminders schedule correctly
- [ ] Intake review page displays all answers
- [ ] Create case from intake auto-populates data
- [ ] Quality score calculates with risk flags
- [ ] Resend and reminder actions work
- [ ] Mobile responsive
- [ ] Error handling for failed emails

---

## PHASE 4: Reports & Notifications (Weeks 7-8)

### What to Build

#### 4.1 Reports Center (`app/professional/reports/page.tsx`)

**Report Types Grid:**
- Compliance Reports (exchange, communication, financial)
- Discovery Packages (complete case documentation)
- Case Timeline Reports (chronological with evidence)
- Communication Analysis (ARIA flags, sentiment)
- Financial Summary (ClearFund transactions)

**Recent Reports List:**
- Date, Report Name, Type, Case, Download link
- Filter by type and date range

#### 4.2 Report Generation Wizard (`app/professional/reports/generate/page.tsx`)

**Form Fields:**
- Report Type (dropdown)
- For Case (dropdown)
- Date Range (start/end date pickers)
- Include options (checkboxes based on report type)
- Format (PDF, Word, Excel)
- Include SHA-256 verification (checkbox, default checked)

**Generate Flow:**
1. User fills form
2. Click [Generate Report]
3. Show progress indicator
4. Generate PDF/Word/Excel with proper formatting
5. Calculate SHA-256 hash
6. Store report in database
7. Show download link

#### 4.3 Notifications Center (`app/professional/notifications/page.tsx`)

**Notification List:**
- Group by date (Today, Yesterday, This Week, Older)
- Each notification shows:
  - Icon based on type
  - Title
  - Brief description
  - Time ago
  - [View] [Dismiss] actions
- Unread notifications highlighted
- [Mark All Read] button

**Notification Types:**
- 🔴 ARIA Alerts (hostile message flagged)
- 📋 Intake Completed
- 💬 New Message
- 📅 Deadline Reminder (3 days, 1 day, today)
- 👥 Case Assignment
- 📄 Document Uploaded
- ⚠️ Missed Exchange
- ✅ Task Completed

#### 4.4 Notification Preferences (`app/professional/notifications/preferences/page.tsx`)

**Settings Table:**
```
Notification Type    | Email | In-App | Push | SMS
─────────────────────|───────|────────|──────|────
ARIA Alerts          |   ✓   |   ✓    |  ✓   |  -
New Messages         |   ✓   |   ✓    |  -   |  -
Intake Completed     |   ✓   |   ✓    |  ✓   |  -
Court Deadlines      |   ✓   |   ✓    |  ✓   |  ✓
Case Assigned        |   ✓   |   ✓    |  -   |  -
Team Mentions        |   ✓   |   ✓    |  ✓   |  -
Document Uploaded    |   -   |   ✓    |  -   |  -
Missed Exchange      |   ✓   |   ✓    |  ✓   |  -
```

**Additional Settings:**
- Quiet hours (start/end time)
- Weekend notifications (all, urgent only, none)

### Database Schema Additions

```sql
-- Reports table
CREATE TABLE professional_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  generated_by UUID REFERENCES professionals(id),
  report_type VARCHAR(50), -- compliance, discovery, timeline, communication, financial
  date_range_start DATE,
  date_range_end DATE,
  format VARCHAR(10), -- pdf, docx, xlsx
  file_url TEXT NOT NULL,
  file_size INTEGER,
  sha256_hash VARCHAR(64),
  metadata JSONB,
  generated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_case ON professional_reports(case_id);
CREATE INDEX idx_reports_generated_by ON professional_reports(generated_by);

-- Notifications table
CREATE TABLE professional_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  notification_type VARCHAR(50),
  title TEXT NOT NULL,
  description TEXT,
  action_url TEXT,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_professional ON professional_notifications(professional_id);
CREATE INDEX idx_notifications_read ON professional_notifications(read);
CREATE INDEX idx_notifications_created ON professional_notifications(created_at DESC);

-- Notification preferences
CREATE TABLE professional_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  notification_type VARCHAR(50),
  email BOOLEAN DEFAULT true,
  in_app BOOLEAN DEFAULT true,
  push BOOLEAN DEFAULT false,
  sms BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  weekend_mode VARCHAR(20) DEFAULT 'all', -- all, urgent, none
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(professional_id, notification_type)
);

CREATE INDEX idx_notif_prefs_professional ON professional_notification_preferences(professional_id);
```

### API Endpoints

```typescript
// Reports
GET /api/professional/reports?caseId=&type=&page=&limit=
Response: { reports: Report[], total: number }

POST /api/professional/reports/generate
Body: { reportType, caseId, dateRangeStart, dateRangeEnd, include, format, includeSHA256 }
Response: { reportId, downloadUrl, sha256Hash }

GET /api/professional/reports/:id/download
Response: File download

// Notifications
GET /api/professional/notifications?read=&type=&page=&limit=
Response: { notifications: Notification[], unreadCount: number }

PATCH /api/professional/notifications/:id/read
Body: { read: boolean }
Response: { success: boolean }

POST /api/professional/notifications/mark-all-read
Response: { updated: number }

// Notification preferences
GET /api/professional/notifications/preferences
Response: NotificationPreferences[]

PUT /api/professional/notifications/preferences
Body: NotificationPreferences[]
Response: { success: boolean }
```

### Components to Create

```
components/professional/
├── reports/
│   ├── ReportTypeCard.tsx
│   ├── ReportTypeGrid.tsx
│   ├── RecentReportsList.tsx
│   ├── ReportListItem.tsx
│   ├── GenerateReportForm.tsx
│   └── ReportProgressIndicator.tsx
└── notifications/
    ├── NotificationsList.tsx
    ├── NotificationItem.tsx
    ├── NotificationFilters.tsx
    ├── PreferencesTable.tsx
    └── QuietHoursSettings.tsx
```

### Definition of Done (Phase 4)

- [ ] Reports center shows all report types
- [ ] Recent reports list loads correctly
- [ ] Generate report wizard completes successfully
- [ ] PDF generation works with proper formatting
- [ ] SHA-256 hash calculates correctly
- [ ] Word and Excel exports work
- [ ] Reports download successfully
- [ ] Notifications center loads all notifications
- [ ] Notifications group by date correctly
- [ ] Mark as read/unread works
- [ ] Mark all read works
- [ ] Notification preferences save correctly
- [ ] Bell icon shows unread count
- [ ] Clicking notification navigates to context
- [ ] Mobile responsive

---

## PHASE 5: Firm Management (Weeks 9-10)

### What to Build

#### 5.1 Firm Settings (`app/professional/firm/settings/page.tsx`)

**Firm Profile Section:**
- Firm name, address, phone, website
- Timezone selector
- Logo upload
- Brand color picker

**Branding & Visibility:**
- Directory visibility toggle (visible, opt out, featured)
- Custom intake email template
- Client portal branding (if white-label tier)

#### 5.2 Team Management (`app/professional/firm/team/page.tsx`)

**Team Members Table:**
- Name, Role, Cases Assigned, Status, Actions
- Roles: Owner, Admin, Attorney, Paralegal, Intake Coordinator, Read Only
- [+ Invite Team Member] button

**Invite Team Member Modal:**
- Email input
- Role dropdown (with permission descriptions)
- Send welcome email checkbox

**Pending Invitations Section:**
- Email, Role, Sent Date, [Resend] [Cancel] actions

**Edit Member:**
- Change role
- Deactivate/Activate
- Remove from firm

#### 5.3 Templates Library (`app/professional/firm/templates/page.tsx`)

**Template List:**
- Template cards showing: name, type, sections count, times used
- [+ Create Template] [Import Template] buttons

**Template Actions:**
- [Edit] - opens template builder
- [Duplicate] - copies template
- [Export] - downloads JSON
- [Delete] - soft delete with confirmation

#### 5.4 Visual Template Builder (`app/professional/firm/templates/[id]/edit/page.tsx`)

**Builder Interface:**
- Template metadata (name, description, estimated time)
- Sections list (draggable to reorder)
- Each section has:
  - Title, description
  - Questions list (draggable)
  - [+ Add Question] button
  - [▲▼] Move section
  - [✎] Edit section
  - [✕] Delete section
- [+ Add Section] button
- Live preview pane showing how ARIA will ask questions
- [Save Draft] [Publish] [Test] buttons

**Validation:**
- Template must have at least 1 section
- Each section must have at least 1 question
- No duplicate section/question IDs
- Show validation errors clearly

#### 5.5 Case Queue (`app/professional/firm/queue/page.tsx`)

**For Firms with Dispatcher Role:**

**Unassigned Cases Section:**
- Cases/intakes waiting for assignment
- Show: client name, type, county, urgency, DV flags
- Filter by: urgency, DV, language, county
- [Assign to ▼] dropdown per case

**Recently Assigned Section:**
- Show last 10 assignments
- Who assigned to whom and when

**Auto-Assignment Rules** (optional feature):
- Create routing rules
- Examples: "DV cases → Jane Doe", "Orange County → Mike Johnson"
- Enable/disable auto-assignment toggle

### Database Schema Additions

```sql
-- Firms table (if not exists)
CREATE TABLE IF NOT EXISTS firms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  website VARCHAR(255),
  logo_url TEXT,
  brand_color VARCHAR(7) DEFAULT '#2E75B6',
  directory_visible BOOLEAN DEFAULT true,
  directory_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Firm members (expand professionals table)
ALTER TABLE professionals ADD COLUMN firm_id UUID REFERENCES firms(id);
ALTER TABLE professionals ADD COLUMN firm_role VARCHAR(50); -- owner, admin, attorney, paralegal, intake, read_only

-- Team invitations
CREATE TABLE firm_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by UUID REFERENCES professionals(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, expired
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invitations_firm ON firm_invitations(firm_id);
CREATE INDEX idx_invitations_token ON firm_invitations(token);

-- Template versioning
ALTER TABLE intake_templates ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE intake_templates ADD COLUMN parent_template_id UUID REFERENCES intake_templates(id);
ALTER TABLE intake_templates ADD COLUMN is_draft BOOLEAN DEFAULT false;
ALTER TABLE intake_templates ADD COLUMN published_at TIMESTAMP;

-- Auto-assignment rules
CREATE TABLE case_assignment_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  rule_name VARCHAR(100),
  condition_type VARCHAR(50), -- dv, county, language, matter_type
  condition_value TEXT,
  assign_to UUID REFERENCES professionals(id),
  priority INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_assignment_rules_firm ON case_assignment_rules(firm_id);
```

### API Endpoints

```typescript
// Firm settings
GET /api/professional/firm/settings
Response: Firm

PUT /api/professional/firm/settings
Body: Partial<Firm>
Response: Firm

// Team management
GET /api/professional/firm/team
Response: { members: Professional[], invitations: Invitation[] }

POST /api/professional/firm/team/invite
Body: { email, role }
Response: Invitation

DELETE /api/professional/firm/team/:professionalId
Response: { success: boolean }

PATCH /api/professional/firm/team/:professionalId/role
Body: { role }
Response: Professional

// Templates
GET /api/professional/firm/templates
Response: IntakeTemplate[]

POST /api/professional/firm/templates
Body: IntakeTemplate
Response: IntakeTemplate

PUT /api/professional/firm/templates/:id
Body: IntakeTemplate
Response: IntakeTemplate

POST /api/professional/firm/templates/:id/duplicate
Response: IntakeTemplate

DELETE /api/professional/firm/templates/:id
Response: { success: boolean }

// Case queue
GET /api/professional/firm/queue?filter=
Response: { unassigned: Case[], recentlyAssigned: Assignment[] }

POST /api/professional/firm/queue/assign
Body: { caseId, professionalId }
Response: { success: boolean }

// Auto-assignment rules
GET /api/professional/firm/rules
Response: AssignmentRule[]

POST /api/professional/firm/rules
Body: AssignmentRule
Response: AssignmentRule

PUT /api/professional/firm/rules/:id
Body: Partial<AssignmentRule>
Response: AssignmentRule

DELETE /api/professional/firm/rules/:id
Response: { success: boolean }
```

### Components to Create

```
components/professional/firm/
├── settings/
│   ├── FirmProfileForm.tsx
│   ├── BrandingSettings.tsx
│   └── DirectoryVisibilityToggle.tsx
├── team/
│   ├── TeamMembersTable.tsx
│   ├── TeamMemberRow.tsx
│   ├── InviteTeamMemberModal.tsx
│   ├── PendingInvitationsList.tsx
│   └── EditMemberRoleModal.tsx
├── templates/
│   ├── TemplatesList.tsx
│   ├── TemplateCard.tsx
│   ├── TemplateBuilder.tsx
│   ├── TemplateMetadataForm.tsx
│   ├── SectionEditor.tsx
│   ├── QuestionEditor.tsx
│   ├── TemplatePreview.tsx
│   └── ValidationErrors.tsx
└── queue/
    ├── UnassignedCasesList.tsx
    ├── AssignCaseDropdown.tsx
    ├── RecentAssignmentsList.tsx
    ├── AutoAssignmentRules.tsx
    └── AddRuleModal.tsx
```

### Definition of Done (Phase 5)

- [ ] Firm settings save correctly
- [ ] Logo upload works
- [ ] Team invitations send emails
- [ ] Team members can be added/removed
- [ ] Roles can be changed
- [ ] Permission matrix enforces correctly
- [ ] Templates library displays all templates
- [ ] Template builder creates/edits templates
- [ ] Section and question reordering works
- [ ] Template validation prevents invalid saves
- [ ] Live preview updates as template changes
- [ ] Duplicate template works
- [ ] Case queue shows unassigned cases
- [ ] Cases can be assigned to team members
- [ ] Auto-assignment rules can be created
- [ ] Auto-assignment executes correctly
- [ ] Mobile responsive

---

## PHASE 6: Calendar & Messages (Weeks 11-12)

### What to Build

#### 6.1 Professional Calendar (`app/professional/calendar/page.tsx`)

**View Options:**
- Month, Week, Day toggle
- Today button
- Previous/Next navigation

**Event Display:**
- Color-coded by type: Court (blue), Meeting (green), Deadline (red), Intake (yellow), Exchange (purple)
- Click event to view details
- Hover shows quick preview

**Filters:**
- All Types / specific event types
- My Cases / All Cases
- My Events / All Team Events

**New Event Button:**
- Opens modal
- Event type, title, date, time, duration
- Location, case link, attendees
- Reminders (checkboxes)
- Description field

**Upcoming Events Sidebar:**
- Next 7 days list view
- Quick links to each event

#### 6.2 Unified Messages Inbox (`app/professional/messages/page.tsx`)

**Saved Views (Tabs):**
- All
- Unread (with count)
- ARIA Flagged (with count)
- High Conflict
- DV Risk
- Assigned to Me
- Needs Response

**Message List:**
- From, Case, Preview, Time
- Unread indicator (bold + dot)
- ARIA flag badge if applicable
- Click to view full thread

**Message Thread View:**
- Opens in right panel or full page
- Shows conversation history
- Reply form at bottom
- [Mark Read/Unread] [Escalate] [Export Thread] [Archive] actions

**Bulk Actions:**
- Select multiple messages
- Mark as read/unread
- Assign to team member
- Add to case report
- Export threads
- Archive

**SLA Timers** (optional enhancement):
- Show how long since last response
- Highlight overdue responses

### Database Schema Additions

```sql
-- Calendar events (expand existing)
ALTER TABLE events ADD COLUMN color VARCHAR(7);
ALTER TABLE events ADD COLUMN recurrence_rule TEXT; -- for recurring events
ALTER TABLE events ADD COLUMN reminder_times INTEGER[]; -- minutes before: [10080, 4320, 1440, 60]

-- Message views
CREATE TABLE professional_message_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_message_views_professional ON professional_message_views(professional_id);
```

### API Endpoints

```typescript
// Calendar
GET /api/professional/calendar/events?start=&end=&type=&case=
Response: Event[]

POST /api/professional/calendar/events
Body: Event
Response: Event

PUT /api/professional/calendar/events/:id
Body: Partial<Event>
Response: Event

DELETE /api/professional/calendar/events/:id
Response: { success: boolean }

// Messages
GET /api/professional/messages?view=&case=&read=&ariaFlagged=&page=&limit=
Response: { threads: MessageThread[], total: number, unreadCount: number }

GET /api/professional/messages/:threadId
Response: Message[]

PATCH /api/professional/messages/:threadId/read
Body: { read: boolean }
Response: { success: boolean }

POST /api/professional/messages/bulk-action
Body: { action, threadIds, payload }
Response: { success: boolean, updated: number }

// Message views
GET /api/professional/messages/views
Response: MessageView[]

POST /api/professional/messages/views
Body: MessageView
Response: MessageView
```

### Components to Create

```
components/professional/
├── calendar/
│   ├── CalendarView.tsx
│   ├── MonthView.tsx
│   ├── WeekView.tsx
│   ├── DayView.tsx
│   ├── EventCard.tsx
│   ├── EventModal.tsx
│   ├── EventForm.tsx
│   ├── CalendarFilters.tsx
│   └── UpcomingEventsSidebar.tsx
└── messages/
    ├── MessageInbox.tsx
    ├── SavedViews.tsx
    ├── MessageList.tsx
    ├── MessageListItem.tsx
    ├── MessageThread.tsx
    ├── MessageForm.tsx
    ├── MessageFilters.tsx
    ├── BulkMessageActions.tsx
    └── SLATimer.tsx
```

### Definition of Done (Phase 6)

- [ ] Calendar renders in month/week/day views
- [ ] Events display with correct colors
- [ ] New event modal creates events successfully
- [ ] Events link to cases correctly
- [ ] Reminders schedule properly
- [ ] Filters work (type, case, team member)
- [ ] Messages inbox loads all threads
- [ ] Saved views filter correctly
- [ ] Unread count displays accurately
- [ ] ARIA flagged messages highlighted
- [ ] Message thread view shows full conversation
- [ ] Reply functionality works
- [ ] Bulk actions execute correctly
- [ ] Mark as read/unread works
- [ ] Mobile responsive

---

## PHASE 7: First-Time Setup & Polish (Weeks 13-14)

### What to Build

#### 7.1 Setup Wizard (`app/professional/onboarding/page.tsx`)

**5-Step Wizard:**

**Step 1: Firm Profile**
- Firm name, address, phone, timezone
- Primary practice areas (checkboxes)
- [Skip] [Continue] buttons

**Step 2: Invite Team**
- Add team member form (email, role)
- [+ Add Another] button
- Show list of added members
- [Skip] [Send Invitations] buttons

**Step 3: Intake Templates**
- Pre-select recommended templates
- Show: Comprehensive Custody, Custody Only, Child Support, Initial Consultation
- Option to add DV Screening, Modification, etc.
- [Continue] button

**Step 4: Configure Settings**
- ARIA defaults (rewrite strictness)
- Document retention rules
- Notification preferences
- [Continue] button

**Step 5: Test Drive**
- "We've created a sample case for you"
- [Open Sample Case] button creates demo case with:
  - Sample parents and children
  - Sample messages (some ARIA-flagged)
  - Sample documents
  - Sample events
  - Sample compliance data
- [Skip] [Finish Setup] buttons

**After Completion:**
- Mark onboarding as complete in database
- Redirect to dashboard
- Show success message with "🎉 Your firm is ready!"

#### 7.2 Help & Documentation (`app/professional/help/page.tsx`)

**Help Center Sections:**
- Getting Started Guide
- Feature Guides (how to use each major feature)
- FAQs
- Video Tutorials (embed YouTube/Vimeo)
- Contact Support
- Release Notes / What's New

**Search Bar:**
- Search help articles
- Live search results

**In-App Tours:**
- Use a library like react-joyride
- Tours for:
  - Dashboard overview
  - Creating your first intake
  - Managing cases
  - Generating reports
  - Using ARIA controls

#### 7.3 Mobile Responsiveness Pass

**Test and fix on:**
- iPhone (375px, 390px, 414px widths)
- Android (360px, 384px, 412px widths)
- Tablet (768px, 1024px widths)

**Key screens to optimize:**
- Dashboard (stack KPI cards)
- Cases list (horizontal scroll for table, or card view)
- Case detail (tabs become dropdown)
- Calendar (switch to list view on mobile)
- Messages (full width threads)
- Forms (full width inputs, larger touch targets)

#### 7.4 Performance Optimization

**Implement:**
- React.lazy() for code splitting
- Image optimization (next/image)
- Supabase query optimization (indexes, select only needed fields)
- Infinite scroll for long lists instead of pagination
- Debounce search inputs
- Cache frequently accessed data (React Query)
- Loading skeletons for all async content
- Error boundaries

#### 7.5 Role-Based UI Filtering

**Ensure UI adapts to role:**
- Paralegals can't see ARIA controls
- Read-only users see [View] instead of [Edit]
- Intake coordinators don't see firm settings
- Non-firm members don't see "Firm" nav item
- Hide "Assign" buttons for non-dispatchers

### Database Schema Additions

```sql
-- Onboarding progress
CREATE TABLE professional_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  current_step INTEGER DEFAULT 1,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Help articles
CREATE TABLE help_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(100),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  video_url TEXT,
  tags TEXT[],
  published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_help_articles_category ON help_articles(category);
CREATE INDEX idx_help_articles_tags ON help_articles USING GIN(tags);

-- Feature tours
CREATE TABLE professional_tours_completed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  tour_name VARCHAR(100),
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(professional_id, tour_name)
);
```

### API Endpoints

```typescript
// Onboarding
GET /api/professional/onboarding/status
Response: { completed: boolean, currentStep: number }

POST /api/professional/onboarding/complete-step
Body: { step: number, data: any }
Response: { nextStep: number }

POST /api/professional/onboarding/create-sample-case
Response: { caseId }

POST /api/professional/onboarding/complete
Response: { success: boolean }

// Help
GET /api/professional/help/articles?category=&search=
Response: Article[]

GET /api/professional/help/articles/:id
Response: Article

POST /api/professional/help/articles/:id/view
Response: { success: boolean }

// Tours
GET /api/professional/tours/completed
Response: { tours: string[] }

POST /api/professional/tours/complete
Body: { tourName }
Response: { success: boolean }
```

### Components to Create

```
components/professional/
├── onboarding/
│   ├── SetupWizard.tsx
│   ├── Step1FirmProfile.tsx
│   ├── Step2InviteTeam.tsx
│   ├── Step3ChooseTemplates.tsx
│   ├── Step4ConfigureSettings.tsx
│   ├── Step5TestDrive.tsx
│   └── StepIndicator.tsx
├── help/
│   ├── HelpCenter.tsx
│   ├── HelpSearch.tsx
│   ├── ArticleList.tsx
│   ├── ArticleCard.tsx
│   ├── ArticleView.tsx
│   └── VideoEmbed.tsx
└── tours/
    ├── DashboardTour.tsx
    ├── IntakeTour.tsx
    ├── CaseTour.tsx
    └── ReportsTour.tsx
```

### Definition of Done (Phase 7)

- [ ] Setup wizard completes all 5 steps
- [ ] Onboarding progress saves after each step
- [ ] Sample case generates with realistic data
- [ ] Skipping steps works correctly
- [ ] Wizard only shows once (or when manually triggered)
- [ ] Help center loads all articles
- [ ] Help search finds relevant articles
- [ ] Video tutorials embed correctly
- [ ] In-app tours run smoothly
- [ ] Tours can be dismissed and don't repeat
- [ ] All pages render correctly on mobile
- [ ] Touch targets are 44px minimum
- [ ] No horizontal scroll on mobile
- [ ] Loading states render quickly
- [ ] Images optimized and lazy-loaded
- [ ] Role-based UI hides/shows correctly
- [ ] Permission checks work server-side
- [ ] Error boundaries catch and display errors gracefully
- [ ] Full QA pass completed

---

## CROSS-CUTTING REQUIREMENTS (All Phases)

### Code Quality

- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Fix all warnings
- **Prettier**: Format all code
- **Comments**: Document complex logic and business rules
- **Component Props**: Define interfaces for all props
- **API Responses**: Define TypeScript types for all API responses

### Error Handling

- **Try-Catch**: Wrap all async operations
- **Error Messages**: User-friendly, actionable messages
- **Error Boundaries**: React error boundaries on all major sections
- **Toast Notifications**: Show success/error toasts for actions
- **Loading States**: Show loading spinners/skeletons during async operations

### Security

- **RLS Policies**: Supabase Row Level Security on all tables
- **Permission Checks**: Server-side checks before any mutation
- **Input Validation**: Validate all user inputs on backend
- **SQL Injection**: Use parameterized queries only
- **CSRF Protection**: Next.js handles this by default
- **Audit Logging**: Log all important actions

### Accessibility

- **ARIA Labels**: Add to all interactive elements
- **Keyboard Navigation**: All actions keyboard-accessible
- **Focus Management**: Clear focus indicators
- **Color Contrast**: WCAG AA compliance
- **Screen Readers**: Test with screen reader

### Testing

After each phase:
- **Manual Testing**: Test all features manually
- **Edge Cases**: Test error states, empty states, loading states
- **Role Testing**: Test with each role type
- **Mobile Testing**: Test on actual devices
- **Browser Testing**: Test on Chrome, Firefox, Safari

---

## REPORTING PROGRESS

After completing each phase, provide:

1. **What Was Built**: List of components, pages, API endpoints created
2. **Database Changes**: New tables, columns, indexes added
3. **Testing Results**: What was tested and results
4. **Known Issues**: Any bugs or limitations discovered
5. **Screenshots**: Show key screens working
6. **Next Steps**: What to review before Phase N+1

---

## DEFINITION OF COMPLETE PROFESSIONAL PORTAL

The portal is complete when a firm can:

1. ✅ Complete onboarding wizard in <20 minutes
2. ✅ Create custom intake templates visually
3. ✅ Send ARIA intake and track completion rate
4. ✅ Convert completed intake to case with one click
5. ✅ Upload court order and auto-populate via OCR
6. ✅ Monitor ARIA-controlled communication
7. ✅ Track exchanges and expenses automatically
8. ✅ Generate compliance reports with SHA-256 verification
9. ✅ Export discovery packages (ZIP with all docs)
10. ✅ Manage team with proper roles and permissions
11. ✅ Route cases via queue or auto-assignment
12. ✅ View firm-wide analytics
13. ✅ Audit all actions in audit log
14. ✅ Use on mobile without friction

---

## ADDITIONAL GUIDANCE

- **Follow Existing Patterns**: Look at existing consumer portal code for patterns (components, hooks, utils)
- **Reuse Existing Components**: Don't rebuild what exists (KidComs calls, ARIA mediation, etc.)
- **Supabase Realtime**: Use for live updates (new messages, notifications)
- **Consistent Styling**: Use Tailwind consistently, no custom CSS
- **Component Library**: If time permits, abstract common components (Button, Input, Modal, Card, etc.)
- **File Organization**: Keep related files together (feature folders)
- **API Routes**: Follow Next.js App Router conventions (app/api/...)
- **Server Components**: Use when possible for performance
- **Client Components**: Use only when needed (forms, interactivity)

---

## START WITH PHASE 1

Begin by building Phase 1: Core Navigation & Dashboard.

Once Phase 1 is complete and approved, I will provide detailed instructions for Phase 2.

Good luck! 🚀
