# CommonGround Professional Portal - Complete Architecture Specification

## Executive Summary

This document defines the complete information architecture, navigation, workflows, and implementation requirements for the CommonGround Professional Portal. The goal is to transform the existing features into a cohesive operating system for family law firms that enables productivity within 20 minutes of signup.

---

## 1. Information Architecture Overview

### Design Principles

1. **Consistent Object Model** - Everything revolves around: Case, Intake, Document, Event, Message, Party
2. **Progressive Disclosure** - Show what's needed when it's needed
3. **Predictable Navigation** - Same structure across all pages
4. **Action-Oriented** - Clear CTAs and quick actions everywhere
5. **Role-Aware** - UI adapts to user permissions
6. **Mobile-First** - Responsive design for attorneys on the go

### Core Navigation Structure

```
Top Navigation Bar (Global)
├── Dashboard          [Home icon]
├── Cases             [Folder icon]
├── Calendar          [Calendar icon]
├── Intake            [Clipboard icon]
├── Messages          [Mail icon]
├── Reports           [Chart icon] *NEW*
├── Firm              [Building icon]
├── Notifications     [Bell icon] *NEW*
└── Profile           [Avatar]
    ├── My Profile
    ├── Subscription
    ├── Help & Support *NEW*
    └── Log Out
```

---

## 2. Page-by-Page Specifications

### 2.1 Dashboard (`/professional/dashboard`)

**Purpose:** Single source of truth for "What needs my attention today?"

#### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Welcome Back, [Attorney Name]                    [Quick Create ▼] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─── KPI CARDS (4-column grid) ─────────────────────────┐  │
│ │                                                         │  │
│ │ [📁 Active Cases]  [📋 Pending Intakes]               │  │
│ │      24                  7                              │  │
│ │   +3 this week        2 expiring soon                   │  │
│ │                                                         │  │
│ │ [💬 Unread Messages] [⚠️ Alerts]                      │  │
│ │      12                  5                              │  │
│ │   3 ARIA flagged      2 urgent                          │  │
│ │                                                         │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌─── PRIORITY CASES ──────────────────────────────────────┐ │
│ │                                                         │ │
│ │ 🔴 Martinez v. Chen                    [View Case]     │ │
│ │    Compliance: 68/100 | Hearing: Feb 28               │ │
│ │    ⚠️ 3 missed exchanges | 4 unread messages          │ │
│ │                                                         │ │
│ │ 🟡 Thompson Family                     [View Case]     │ │
│ │    Compliance: 85/100 | No upcoming events            │ │
│ │    📋 Intake completed - needs review                 │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─── UPCOMING (Next 7 Days) ──────────────────────────────┐│
│ │ Feb 22 - 10:00 AM - Martinez Custody Hearing          ││
│ │ Feb 23 - 2:00 PM  - Client Meeting: Rodriguez         ││
│ │ Feb 25 - 5:00 PM  - Discovery Deadline: Johnson       ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌─── RECENT ACTIVITY ──────────────────────────────────────┐│
│ │ 2 min ago - New message from Sarah Martinez           ││
│ │ 15 min ago - ARIA flagged hostile message (Chen case)  ││
│ │ 1 hour ago - Document uploaded (Johnson case)          ││
│ │ 3 hours ago - Intake completed: Williams consultation  ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌─── MY TASKS (NEW) ───────────────────────────────────────┐│
│ │ ☐ Review Martinez intake completion                    ││
│ │ ☐ Approve Chen agreement modifications                 ││
│ │ ☐ Generate compliance report for Thompson hearing      ││
│ │ ☐ Upload court order FL-341 for Rodriguez case         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Components Needed

**KPI Cards** (`components/professional/dashboard/KPICard.tsx`)
- Real-time counts from Supabase
- Click to filter relevant view
- Sparkline trends (optional)

**Priority Cases List** (`components/professional/dashboard/PriorityCasesList.tsx`)
- Sort by: Compliance score, upcoming events, ARIA risk, unread messages
- Visual indicators: 🔴 High risk, 🟡 Medium, 🟢 Stable
- Quick actions: View Case, Message Client, Generate Report

**Quick Create Dropdown** (`components/professional/dashboard/QuickCreateMenu.tsx`)
- New Case
- Send ARIA Intake
- Upload Court Order
- Schedule Court Event
- Create Task

**My Tasks Widget** (NEW - `components/professional/dashboard/TasksWidget.tsx`)
- Lightweight task list
- Tied to cases
- Checkbox completion
- Add task modal

#### API Endpoints Needed

```typescript
GET /api/professional/dashboard/stats
  → { activeCases, pendingIntakes, unreadMessages, alerts }

GET /api/professional/dashboard/priority-cases?limit=5
  → Case[] sorted by urgency

GET /api/professional/dashboard/upcoming-events?days=7
  → Event[] in next 7 days

GET /api/professional/dashboard/activity?limit=10
  → ActivityLog[] recent events

GET /api/professional/dashboard/tasks
  → Task[] assigned to current user
```

#### Database Schema Additions

```sql
-- Tasks table (NEW)
CREATE TABLE professional_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id),
  case_id UUID REFERENCES cases(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  priority VARCHAR(20), -- 'low', 'medium', 'high', 'urgent'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Activity log table (NEW)
CREATE TABLE professional_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id),
  firm_id UUID REFERENCES firms(id),
  case_id UUID REFERENCES cases(id),
  activity_type VARCHAR(50), -- 'message', 'document', 'event', 'intake', 'aria_flag'
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 2.2 Cases (`/professional/cases`)

**Purpose:** Master list of all cases with powerful filtering and bulk actions

#### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Cases                                          [+ New Case]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─── FILTERS & SEARCH ─────────────────────────────────────┐│
│ │ 🔍 Search cases...                                       ││
│ │                                                          ││
│ │ Status: [All ▼] [Active] [Pending] [Closed]             ││
│ │ Urgency: [All ▼] [Urgent] [High] [Medium] [Low]         ││
│ │ Attorney: [All ▼] [Me] [John Smith] [Jane Doe]          ││
│ │ Court Date: [Next 30 days ▼]                            ││
│ │ ARIA Risk: [All ▼] [High] [Medium] [Low]                ││
│ │                                                          ││
│ │ Saved Views: [My Cases] [Urgent] [DV Flagged] [Court]   ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌─── CASE TABLE ───────────────────────────────────────────┐│
│ │☐ Case Name       Attorney  Status  Court Date  Actions  ││
│ │───────────────────────────────────────────────────────── ││
│ │☐ Martinez v Chen J. Smith  Active  Feb 28     [View]    ││
│ │  🔴 Compliance: 68/100 | 3 alerts                       ││
│ │                                                          ││
│ │☐ Thompson Family  J. Doe   Active  No date    [View]    ││
│ │  🟢 Compliance: 92/100                                   ││
│ │                                                          ││
│ │☐ Rodriguez Case  J. Smith  Pending Mar 15     [View]    ││
│ │  📋 Intake pending | Assigned 2 days ago                ││
│ │                                                          ││
│ │Selected: 0 cases                                        ││
│ │Bulk Actions: [Assign ▼] [Tag ▼] [Export ▼]              ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Showing 1-25 of 47 cases        [◄ 1 2 3 ►]                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Components Needed

**CasesTable** (`components/professional/cases/CasesTable.tsx`)
- Sortable columns
- Multi-select checkboxes
- Expandable rows for quick info
- Pagination

**CaseFilters** (`components/professional/cases/CaseFilters.tsx`)
- Dynamic filter chips
- Saved filter views
- Clear all filters

**BulkActions** (`components/professional/cases/BulkActionsMenu.tsx`)
- Assign to attorney
- Add tags
- Export selected
- Change status
- Archive

---

### 2.3 Case Detail (`/professional/cases/:caseId`)

**Purpose:** Complete 360° view of a single case

#### Tab Structure

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Cases                                             │
│                                                              │
│ Martinez v. Chen                          Case #MC-24-1234  │
│ Superior Court of Los Angeles                                │
│                                                              │
│ [Overview] [Timeline] [Communication] [Documents] [Portals] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [Tab content renders here - see sub-sections below]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 2.3.1 Overview Tab

```
┌─── CASE SUMMARY ─────────────────────────────────────────────┐
│ Status: Active | Assigned: John Smith | Created: Jan 15, 2026│
│                                                               │
│ Parent A: Sarah Martinez                                      │
│ Parent B: David Chen                                          │
│ Children: Emma (7), Lucas (10)                                │
│ Matter Type: Custody Modification                             │
│ Jurisdiction: Los Angeles County                              │
│                                                               │
│ [Edit Details] [Assign] [Change Status]                       │
└───────────────────────────────────────────────────────────────┘

┌─── CASE HEALTH ──────────────────────────────────────────────┐
│ Compliance Score: 68/100 🔴                                   │
│ ██████████░░░░░░░░░░  (↓ 5 points this week)                 │
│                                                               │
│ Risk Flags:                                                   │
│ ⚠️ 3 missed exchanges in last 30 days                         │
│ ⚠️ 14 ARIA interventions (high conflict pattern)              │
│ ⚠️ $2,400 in disputed expenses                                │
│                                                               │
│ [View Detailed Compliance Report]                             │
└───────────────────────────────────────────────────────────────┘

┌─── KEY DATES ────────────────────────────────────────────────┐
│ 📅 Next Hearing: Feb 28, 2026 10:00 AM                       │
│    Custody Modification - Dept 12                            │
│    [Add to Calendar] [Set Reminder]                           │
│                                                               │
│ 📅 Discovery Deadline: Feb 21, 2026                          │
│ 📅 Mediation: Mar 5, 2026 2:00 PM                            │
│                                                               │
│ [+ Add Deadline] [View All Events]                            │
└───────────────────────────────────────────────────────────────┘

┌─── QUICK ACTIONS ────────────────────────────────────────────┐
│ [📞 Call Parent A] [📞 Call Parent B] [💬 Send Message]      │
│ [📋 Generate Report] [📄 Export Case] [🔧 ARIA Controls]     │
└───────────────────────────────────────────────────────────────┘
```

#### 2.3.2 Timeline Tab

Unified event stream with filters:

```
┌─── FILTERS ──────────────────────────────────────────────────┐
│ Show: [All ▼] [Messages] [Exchanges] [Documents] [Events]   │
│       [ARIA Flags] [Agreements] [Financial]                  │
│ Date Range: [Last 30 days ▼]                                │
└───────────────────────────────────────────────────────────────┘

┌─── TIMELINE ─────────────────────────────────────────────────┐
│                                                               │
│ Today, 2:30 PM                                                │
│ 💬 Message from Sarah Martinez (ARIA flagged)                │
│    "I'm sick of you always being late..."                    │
│    ARIA: Rewrote for constructive tone                       │
│    [View Full Thread] [View ARIA Analysis]                    │
│                                                               │
│ Today, 11:00 AM                                               │
│ 📄 Document Uploaded: Doctor's Note - Emma                   │
│    Uploaded by: David Chen                                    │
│    [View Document]                                             │
│                                                               │
│ Yesterday, 6:00 PM                                            │
│ ⚠️ Missed Exchange                                            │
│    David Chen did not pick up children at 6:00 PM            │
│    Location: McDonald's Parking Lot, Anytown                 │
│    [View Exchange Details] [Add to Report]                    │
│                                                               │
│ Feb 8, 3:15 PM                                                │
│ 📅 Court Date Scheduled                                       │
│    Custody Hearing - Feb 28, 10:00 AM                        │
│    Superior Court LA - Dept 12                                │
│    [View Details]                                              │
│                                                               │
│ [Load More Events]                                             │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

#### 2.3.3 Communication Tab

Sub-tabs structure:

```
[Messages] [Calls] [Compliance Reports] [ARIA Controls]

┌─── MESSAGES ─────────────────────────────────────────────────┐
│ Conversation with: [Both Parents ▼] [Sarah Only] [David Only]│
│                                                               │
│ [Message thread display - existing component]                │
│                                                               │
│ [Templates ▼] [Attach File]                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Type your message...                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│ [Send]                                                        │
└───────────────────────────────────────────────────────────────┘
```

#### 2.3.4 Documents Tab

```
┌─── DOCUMENT LIBRARY ─────────────────────────────────────────┐
│ [+ Upload Document] [+ Upload Court Order]                   │
│                                                               │
│ Filter by Type: [All] [Agreements] [Court Orders] [Evidence] │
│                 [Financial] [Medical] [School] [Other]       │
│                                                               │
│ 📁 Court Orders (3 documents)                                │
│   ├─ FL-341 - Custody Order (Feb 2024)    [View] [Download] │
│   ├─ FL-150 - Income Declaration           [View] [Download] │
│   └─ FL-342 - Child Support Order          [View] [Download] │
│                                                               │
│ 📁 Agreements (2 documents)                                  │
│   ├─ SharedCare Agreement v1.0 (ACTIVE)    [View] [Edit]    │
│   └─ SharedCare Agreement v0.9 (Draft)     [View]           │
│                                                               │
│ 📁 Evidence (5 documents)                                    │
│   ├─ Text message screenshots               [View]           │
│   ├─ Email exchange - Jan 2026             [View]           │
│   └─ ...                                                      │
│                                                               │
│ [Export All] [Create Case Packet]                            │
└───────────────────────────────────────────────────────────────┘
```

#### 2.3.5 Portals Tab (NEW - Big Differentiator)

These are scoped workspaces that drill into specific aspects:

```
┌─── SUB-PORTALS ──────────────────────────────────────────────┐
│                                                               │
│ [Compliance Dashboard] [ClearFund] [Agreement Review]         │
│ [Exchange Schedule] [Parent Communications Analysis]          │
│                                                               │
│ ┌─ Currently Viewing: Compliance Dashboard ───────────────┐ │
│ │                                                          │ │
│ │ Exchange Compliance: 89% (25/28 on-time)                │ │
│ │ Financial Compliance: 75% ($600 disputed)               │ │
│ │ Communication Compliance: 65% (14 ARIA flags)           │ │
│ │                                                          │ │
│ │ [Detailed Breakdown] [Export Report] [Set Alerts]       │ │
│ │                                                          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### 2.4 Calendar (`/professional/calendar`)

**Purpose:** All time-sensitive items in one view

```
┌─────────────────────────────────────────────────────────────┐
│ Calendar                            [+ New Event] [Sync ▼]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [Month] [Week] [Day]                    February 2026       │
│                                                              │
│ Filter by: [All Types ▼] [My Cases ▼] [All Attorneys ▼]    │
│                                                              │
│  Sun    Mon    Tue    Wed    Thu    Fri    Sat             │
│         10     11     12     13     14     15               │
│                2PM                                           │
│                Mtg                                           │
│                                                              │
│  16     17     18     19     20     21     22               │
│  3PM                                      10AM               │
│  Call                                     Hrg                │
│                                                              │
│  23     24     25     26     27     28     29               │
│                      5PM          10AM                       │
│                      DL           Hearing                    │
│                                                              │
│ ┌─── UPCOMING EVENTS ──────────────────────────────────────┐│
│ │ Feb 22, 10:00 AM - Martinez Custody Hearing             ││
│ │ Feb 23, 2:00 PM  - Client Meeting: Rodriguez            ││
│ │ Feb 25, 5:00 PM  - Discovery Deadline: Johnson          ││
│ │ [View All]                                               ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Event Types Color Coding

- 🟦 Court Hearing (blue)
- 🟩 Meeting (green)
- 🟥 Deadline (red)
- 🟨 Intake (yellow)
- 🟪 Exchange (purple)
- ⬜ Follow-up (gray)

#### New Event Modal

```
┌─── NEW EVENT ────────────────────────────────────────────────┐
│                                                               │
│ Event Type: [Court Hearing ▼]                                │
│ Title: [Custody Modification Hearing]                        │
│ Date: [Feb 28, 2026]  Time: [10:00 AM]                      │
│ Duration: [2 hours]                                          │
│                                                               │
│ Location: Superior Court LA - Dept 12                        │
│ Judge: Hon. Jennifer Rodriguez                               │
│                                                               │
│ Link to Case: [Martinez v. Chen ▼]                           │
│                                                               │
│ Notify: ☑ Sarah Martinez ☑ David Chen ☑ Me                  │
│                                                               │
│ Reminders: ☑ 1 week before ☑ 3 days ☑ 1 day ☑ 1 hour       │
│                                                               │
│ Description:                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Hearing on mother's request to modify custody schedule │ │
│ │ from 50/50 to 70/30 primary custody.                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ [Create Event] [Cancel]                                       │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### 2.5 Intake (`/professional/intake`)

**Purpose:** Intake pipeline management + ARIA intake sessions

```
┌─────────────────────────────────────────────────────────────┐
│ Intake Pipeline                         [+ New ARIA Intake] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─── PIPELINE STATS ───────────────────────────────────────┐│
│ │ Sent: 45 | Pending: 12 | In Progress: 7 | Completed: 26 ││
│ │ Completion Rate: 58% | Avg Time: 35 min                 ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Status: [All] [Sent] [Pending] [In Progress] [Completed]   │
│ Template: [All Types] [Custody] [Child Support] [DV]       │
│                                                              │
│ ┌─── INTAKE TABLE ─────────────────────────────────────────┐│
│ │ Client        Template    Status      Sent    Expires   ││
│ │────────────────────────────────────────────────────────  ││
│ │ Sarah Williams Custody    Completed  Feb 10  [View]     ││
│ │ 📋 Ready to convert to case                             ││
│ │ [Create Case] [Review Intake] [Download]                ││
│ │                                                          ││
│ │ John Rodriguez Initial    In Progress Feb 15 Feb 22     ││
│ │ ⏱️ 45% complete | Last active: 2 hours ago              ││
│ │ [View Progress] [Send Reminder]                         ││
│ │                                                          ││
│ │ Maria Garcia   Child Supp Pending    Feb 16  Feb 23     ││
│ │ ⚠️ Link sent, not opened yet                            ││
│ │ [Resend Link] [Cancel Intake]                           ││
│ │                                                          ││
│ │ David Lee      Custody    Expired    Jan 30  Feb 6      ││
│ │ ❌ Never completed                                       ││
│ │ [Resend] [Archive]                                       ││
│ │                                                          ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### New Intake Wizard (3-Step Process)

**Step 1: Choose Template**

```
┌─── NEW ARIA INTAKE - Step 1 of 3 ───────────────────────────┐
│ Choose Intake Template                                       │
│                                                               │
│ [Template selector grid - from your existing design]         │
│                                                               │
│ ✅ Selected: Comprehensive Custody Agreement (17 sections)   │
│    Estimated time: 45 minutes                                │
│                                                               │
│ [Cancel] [Next: Configure Recipients →]                      │
└───────────────────────────────────────────────────────────────┘
```

**Step 2: Configure Recipients & Settings**

```
┌─── NEW ARIA INTAKE - Step 2 of 3 ───────────────────────────┐
│ Configure Intake                                             │
│                                                               │
│ Client Name: [Sarah Williams]                                │
│ Client Email: [sarah.williams@email.com]                     │
│ Client Phone: [(555) 123-4567]                              │
│                                                               │
│ Link to Existing Case: [None ▼] or [Create new case]        │
│                                                               │
│ Expiration: [7 days ▼] or [Custom date]                     │
│                                                               │
│ Reminders:                                                    │
│ ☑ Send reminder 3 days before expiration                    │
│ ☑ Send reminder 1 day before expiration                     │
│ ☑ Notify me when completed                                  │
│                                                               │
│ Custom Introduction Message (optional):                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Hi Sarah, please complete this intake before our       │ │
│ │ consultation on Feb 25th. It should take about 45 min. │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ [← Back] [Next: Review & Send →]                             │
└───────────────────────────────────────────────────────────────┘
```

**Step 3: Review & Send**

```
┌─── NEW ARIA INTAKE - Step 3 of 3 ───────────────────────────┐
│ Review & Send                                                │
│                                                               │
│ Template: Comprehensive Custody Agreement                    │
│ Client: Sarah Williams (sarah.williams@email.com)            │
│ Expires: Feb 25, 2026 11:59 PM                              │
│ Linked Case: None (will create upon completion)             │
│                                                               │
│ Preview Link:                                                │
│ https://app.commonground.com/intake/a1b2c3d4e5f6            │
│ [Copy Link]                                                   │
│                                                               │
│ Email Preview:                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Subject: Complete Your Family Law Intake - John Smith  │ │
│ │                                                         │ │
│ │ Hi Sarah,                                               │ │
│ │                                                         │ │
│ │ Please complete this intake before our consultation    │ │
│ │ on Feb 25th. It should take about 45 minutes.          │ │
│ │                                                         │ │
│ │ [Start Intake] button                                   │ │
│ │                                                         │ │
│ │ This link expires on Feb 25, 2026.                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ [← Back] [Send Intake]                                       │
└───────────────────────────────────────────────────────────────┘
```

---

### 2.6 Messages (`/professional/messages`) - NEW UNIFIED INBOX

**Purpose:** Central inbox across all cases with triage

```
┌─────────────────────────────────────────────────────────────┐
│ Messages                                   [Compose New]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─── SAVED VIEWS ──────────────────────────────────────────┐│
│ │ [All] [Unread (12)] [ARIA Flagged (3)] [High Conflict]  ││
│ │ [DV Risk] [Assigned to Me] [Needs Response]             ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Filter: [All Cases ▼] [Last 30 days ▼] [All Types ▼]       │
│                                                              │
│ ┌─── MESSAGE LIST ─────────────────────────────────────────┐│
│ │                                                          ││
│ │ 🔴 ARIA FLAGGED                          2 min ago      ││
│ │ Martinez v. Chen - Sarah Martinez                       ││
│ │ "I'm sick of you always being late..."                 ││
│ │ [View Thread] [Mark Read] [Escalate]                    ││
│ │                                                          ││
│ │ ⚪ UNREAD                                 15 min ago     ││
│ │ Thompson Family - Emily Thompson                        ││
│ │ "Can we switch next weekend?"                           ││
│ │ [View Thread] [Mark Read] [Reply]                       ││
│ │                                                          ││
│ │ ✅ READ                                   1 hour ago     ││
│ │ Rodriguez Case - Maria Rodriguez                        ││
│ │ "Thanks for the update on the hearing"                  ││
│ │ [View Thread] [Archive]                                 ││
│ │                                                          ││
│ │ [Load More]                                             ││
│ │                                                          ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Bulk Triage Actions

- Mark as Read/Unread
- Assign to team member
- Add to case report
- Export thread
- Archive

---

### 2.7 Reports (`/professional/reports`) - NEW REPORTS CENTER

**Purpose:** Generate, view, and manage all reports

```
┌─────────────────────────────────────────────────────────────┐
│ Reports Center                         [+ Generate Report]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [Case Reports] [Firm Reports] [Export History]              │
│                                                              │
│ ┌─── REPORT TYPES ─────────────────────────────────────────┐│
│ │                                                          ││
│ │ 📊 Compliance Reports                                   ││
│ │    Exchange, Communication, Financial compliance        ││
│ │    [Generate]                                            ││
│ │                                                          ││
│ │ 📋 Discovery Packages                                   ││
│ │    Complete case documentation for court                ││
│ │    [Generate]                                            ││
│ │                                                          ││
│ │ 📈 Case Timeline Reports                                ││
│ │    Chronological event summary with evidence            ││
│ │    [Generate]                                            ││
│ │                                                          ││
│ │ 💬 Communication Analysis                               ││
│ │    ARIA flags, sentiment trends, conflict patterns      ││
│ │    [Generate]                                            ││
│ │                                                          ││
│ │ 💰 Financial Summary                                    ││
│ │    ClearFund transactions, disputed amounts, arrears    ││
│ │    [Generate]                                            ││
│ │                                                          ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌─── RECENT REPORTS ───────────────────────────────────────┐│
│ │ Feb 15 - Martinez Compliance Report (PDF)  [Download]   ││
│ │ Feb 10 - Thompson Discovery Package (ZIP)   [Download]   ││
│ │ Feb 8  - Rodriguez Timeline Report (PDF)    [Download]   ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Report Generation Wizard

```
┌─── GENERATE REPORT ──────────────────────────────────────────┐
│                                                               │
│ Report Type: [Compliance Report ▼]                           │
│                                                               │
│ For Case: [Martinez v. Chen ▼]                               │
│                                                               │
│ Date Range: [Jan 1, 2026] to [Feb 15, 2026]                 │
│                                                               │
│ Include:                                                      │
│ ☑ Exchange Compliance Summary                                │
│ ☑ Communication Metrics (ARIA interventions)                 │
│ ☑ Financial Compliance (ClearFund)                           │
│ ☑ Message History (flagged messages only)                    │
│ ☑ Raw Data Appendix                                          │
│                                                               │
│ Format: [PDF ▼] [Word] [Excel]                              │
│                                                               │
│ Include SHA-256 Verification: ☑ Yes                          │
│                                                               │
│ [Cancel] [Generate Report]                                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### 2.8 Firm (`/professional/firm`)

**Purpose:** Firm-level settings and management

#### Sub-Navigation

```
[Firm Settings] [Team] [Templates] [Integrations] [Audit Log]
```

#### 2.8.1 Firm Settings

```
┌─── FIRM PROFILE ─────────────────────────────────────────────┐
│ Firm Name: [Smith & Associates Family Law]                   │
│ Address: [123 Main St, Los Angeles, CA 90012]               │
│ Phone: [(555) 123-4567]                                      │
│ Website: [www.smithfamilylaw.com]                           │
│ Timezone: [Pacific Time (PT) ▼]                             │
│                                                               │
│ [Save Changes]                                                │
└───────────────────────────────────────────────────────────────┘

┌─── BRANDING ─────────────────────────────────────────────────┐
│ Logo: [Upload Logo]  [Current: smith-logo.png] [Remove]     │
│ Brand Color: [#2E75B6] [Color picker]                       │
│                                                               │
│ Directory Visibility:                                         │
│ ⚪ Visible in directory                                       │
│ ⚪ Opt out (referrals only)                                  │
│ ⚪ Featured placement (Mid-Size tier+)                       │
│                                                               │
│ [Save Changes]                                                │
└───────────────────────────────────────────────────────────────┘
```

#### 2.8.2 Team Management

```
┌─── TEAM MEMBERS ─────────────────────────────────────────────┐
│ [+ Invite Team Member]                                       │
│                                                               │
│ Name           Role            Cases   Status    Actions     │
│───────────────────────────────────────────────────────────── │
│ John Smith    Owner/Attorney    24     Active   [Edit]       │
│ Jane Doe      Attorney          18     Active   [Edit]       │
│ Mike Johnson  Paralegal         12     Active   [Edit]       │
│ Sarah Lee     Intake Coord       0     Active   [Edit]       │
│                                                               │
│ Pending Invitations:                                         │
│ emma@law.com  (Attorney)  Sent: Feb 10  [Resend] [Cancel]  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Invite Team Member Modal**

```
┌─── INVITE TEAM MEMBER ───────────────────────────────────────┐
│                                                               │
│ Email: [new.attorney@email.com]                              │
│ Role: [Attorney ▼]                                           │
│                                                               │
│ Permissions:                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Owner/Admin  - Everything + billing                     │ │
│ │ Attorney     - Manage cases, ARIA controls, reports     │ │
│ │ Paralegal    - Documents, timeline, limited editing     │ │
│ │ Intake Coord - Intake pipeline, create cases from intake│ │
│ │ Read Only    - View only                                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Send welcome email: ☑ Yes                                    │
│                                                               │
│ [Cancel] [Send Invitation]                                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

#### 2.8.3 Templates (ARIA Intake Templates)

```
┌─── ARIA INTAKE TEMPLATES ────────────────────────────────────┐
│ [+ Create Template] [Import Template]                        │
│                                                               │
│ Template Name        Type      Sections  Used  Actions       │
│───────────────────────────────────────────────────────────── │
│ Comprehensive        Custody       17     45   [Edit] [Dup]  │
│ Child Support Only   Financial      8     12   [Edit] [Dup]  │
│ DV Screening         Safety         7      3   [Edit] [Dup]  │
│ Quick Consultation   Initial        5     28   [Edit] [Dup]  │
│                                                               │
│ ⚠️ Custom templates available on Solo plan and above         │
│ [Upgrade to Solo Plan]                                        │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Template Editor** (NEW - Visual Builder)

```
┌─── EDIT TEMPLATE: Custom DV Screening ──────────────────────┐
│ [← Back to Templates]                          [Save] [Test] │
│                                                               │
│ Template Name: [Custom DV Screening]                         │
│ Description: [Sensitive intake for DV cases]                 │
│ Estimated Time: [30] minutes                                 │
│                                                               │
│ ┌─── SECTIONS ─────────────────────────────────────────────┐│
│ │                                                          ││
│ │ ✓ Section 1: Safety Assessment           [▲ ▼ ✎ ✕]     ││
│ │   Questions:                                             ││
│ │   1. Are you currently in a safe location?              ││
│ │   2. Can you complete this privately?                    ││
│ │   3. Do you have a safety plan?                         ││
│ │   [+ Add Question]                                       ││
│ │                                                          ││
│ │ ✓ Section 2: Current Protective Orders  [▲ ▼ ✎ ✕]     ││
│ │   Questions:                                             ││
│ │   1. Do you have a restraining order?                   ││
│ │   2. When does it expire?                               ││
│ │   [+ Add Question]                                       ││
│ │                                                          ││
│ │ [+ Add Section]                                          ││
│ │                                                          ││
│ └──────────────────────────────────────────────────────────┘│
│                                                               │
│ ┌─── PREVIEW ──────────────────────────────────────────────┐│
│ │ [Live preview of how ARIA will ask these questions]     ││
│ └──────────────────────────────────────────────────────────┘│
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### 2.9 Notifications (`/professional/notifications`) - NEW

**Purpose:** Central notification center with preferences

```
┌─────────────────────────────────────────────────────────────┐
│ Notifications                        [Mark All Read] [⚙️]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Filter: [All] [Unread] [ARIA Alerts] [Deadlines] [Mentions]│
│                                                              │
│ Today                                                        │
│ ┌───────────────────────────────────────────────────────────│
│ │ 🔴 ARIA Alert - Martinez Case                2 min ago   │
│ │ Hostile message flagged and rewritten                    │
│ │ [View Message] [Dismiss]                                  │
│ │                                                           │
│ │ 📋 Intake Completed - Williams                15 min ago │
│ │ Sarah Williams completed intake (58 min)                 │
│ │ [Review Intake] [Dismiss]                                 │
│ │                                                           │
│ │ 💬 New Message - Thompson Case                1 hour ago │
│ │ "Can we switch next weekend?"                            │
│ │ [View Thread] [Dismiss]                                   │
│ └───────────────────────────────────────────────────────────│
│                                                              │
│ Yesterday                                                    │
│ │ 📅 Deadline Reminder - Rodriguez             Yesterday   │
│ │ Discovery deadline in 3 days (Feb 25)                    │
│ │ [View Case] [Dismiss]                                     │
│ │                                                           │
│ │ 👥 Team Assignment - Johnson Case             Yesterday  │
│ │ John Smith assigned you to Johnson case                  │
│ │ [View Case] [Dismiss]                                     │
│ └───────────────────────────────────────────────────────────│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Notification Preferences** (Settings icon)

```
┌─── NOTIFICATION PREFERENCES ─────────────────────────────────┐
│                                                               │
│                              Email  In-App  Push  SMS        │
│ ──────────────────────────────────────────────────────────── │
│ ARIA Alerts                    ✓      ✓      ✓     -        │
│ New Messages                   ✓      ✓      -     -        │
│ Intake Completed               ✓      ✓      ✓     -        │
│ Court Deadlines                ✓      ✓      ✓     ✓        │
│ Case Assigned                  ✓      ✓      -     -        │
│ Team Mentions                  ✓      ✓      ✓     -        │
│ Document Uploaded              -      ✓      -     -        │
│ Missed Exchange                ✓      ✓      ✓     -        │
│                                                               │
│ Quiet Hours: [9:00 PM] to [7:00 AM]  ☑ Enabled              │
│ Weekend Notifications: [Emergency only ▼]                    │
│                                                               │
│ [Save Preferences]                                            │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### 2.10 Case Queue (`/professional/firm/queue`) - For Firms

**Purpose:** Dispatcher assigns incoming cases to team members

```
┌─────────────────────────────────────────────────────────────┐
│ Case Queue                              [Auto-Assign: Off ▼]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─── UNASSIGNED CASES ─────────────────────────────────────┐│
│ │                                                          ││
│ │ Filter by: [All] [DV] [Urgent] [Language] [County]      ││
│ │                                                          ││
│ │ ☐ Williams Initial Consultation                         ││
│ │   Intake completed 2 hours ago                          ││
│ │   Type: Custody | County: LA | Urgency: Medium          ││
│ │   [Assign to ▼] [View Details] [Convert to Case]        ││
│ │                                                          ││
│ │ ☐ Garcia Child Support                                  ││
│ │   Referral from court 1 day ago                         ││
│ │   Type: Financial | County: Orange | Urgency: High      ││
│ │   ⚠️ DV flags in notes                                   ││
│ │   [Assign to ▼] [View Details]                          ││
│ │                                                          ││
│ │ [Load More]                                             ││
│ │                                                          ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌─── RECENTLY ASSIGNED ────────────────────────────────────┐│
│ │ Rodriguez → John Smith (30 min ago)                     ││
│ │ Martinez → Jane Doe (2 hours ago)                       ││
│ │ Thompson → John Smith (5 hours ago)                     ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Auto-Assignment Rules** (If enabled)

```
┌─── AUTO-ASSIGNMENT RULES ────────────────────────────────────┐
│                                                               │
│ Route cases automatically based on:                          │
│                                                               │
│ Rule 1: DV Cases → Jane Doe (DV specialist)                 │
│ Rule 2: Orange County → Mike Johnson (licensed there)        │
│ Rule 3: Spanish-speaking → Sarah Lee (bilingual)             │
│ Rule 4: High urgency → On-call attorney rotation             │
│ Rule 5: Default → Round-robin all attorneys                  │
│                                                               │
│ [+ Add Rule] [Edit Rules] [Disable Auto-Assign]              │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. First-Time Setup Wizard (Critical for Onboarding)

**Purpose:** Get firms productive in 20 minutes

### Wizard Flow

**Welcome Screen**
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│              Welcome to CommonGround Professional            │
│                                                              │
│   Let's get your firm set up in just a few minutes          │
│                                                              │
│   Steps:                                                     │
│   1. Confirm firm profile                                    │
│   2. Invite your team                                        │
│   3. Choose intake templates                                 │
│   4. Configure case settings                                 │
│   5. Run a test case                                         │
│                                                              │
│              [Get Started] [Skip Setup]                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Step 1: Firm Profile**
```
┌─── STEP 1 OF 5: Firm Profile ───────────────────────────────┐
│                                                               │
│ Firm Name: [Smith & Associates Family Law]                   │
│ Address: [123 Main St, Los Angeles, CA 90012]               │
│ Phone: [(555) 123-4567]                                      │
│ Timezone: [Pacific Time ▼]                                   │
│                                                               │
│ Primary Practice Areas: (check all that apply)               │
│ ☑ Custody & Visitation                                       │
│ ☑ Child Support                                              │
│ ☑ Divorce                                                    │
│ ☑ Domestic Violence                                          │
│ ☐ Adoption                                                   │
│                                                               │
│ [Skip] [Continue →]                                          │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Step 2: Invite Team**
```
┌─── STEP 2 OF 5: Invite Your Team ───────────────────────────┐
│                                                               │
│ Add team members now, or skip and invite later              │
│                                                               │
│ [+ Add Team Member]                                           │
│                                                               │
│ Email                    Role                                │
│ jane@firm.com           Attorney                [Remove]     │
│ mike@firm.com           Paralegal              [Remove]     │
│                                                               │
│ [+ Add Another]                                               │
│                                                               │
│ [← Back] [Skip] [Send Invitations →]                         │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Step 3: Choose Intake Templates**
```
┌─── STEP 3 OF 5: Intake Templates ───────────────────────────┐
│                                                               │
│ Select templates to add to your library (you can customize   │
│ these later):                                                │
│                                                               │
│ ☑ Comprehensive Custody Agreement (17 sections)              │
│ ☑ Custody Only (6 sections)                                 │
│ ☑ Child Support Only (8 sections)                           │
│ ☑ Initial Consultation (5 sections)                         │
│ ☐ DV Screening (7 sections) - Recommended for DV cases      │
│ ☐ Modification Request (5 sections)                         │
│                                                               │
│ ✨ Pro tip: Start with the first 4, add more as needed       │
│                                                               │
│ [← Back] [Continue →]                                         │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Step 4: Configure Settings**
```
┌─── STEP 4 OF 5: Case Settings ──────────────────────────────┐
│                                                               │
│ ARIA Mediation Defaults:                                     │
│ Rewrite Strictness: [Medium ▼]                              │
│ Auto-flag hostile messages: ☑ Yes                           │
│                                                               │
│ Document Retention:                                           │
│ Keep documents for: [7 years ▼]                             │
│ Auto-archive closed cases after: [2 years ▼]                │
│                                                               │
│ Notification Defaults:                                        │
│ Notify on ARIA alerts: ☑ Email + In-App                     │
│ Notify on intake completion: ☑ Email + In-App               │
│                                                               │
│ [← Back] [Continue →]                                         │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Step 5: Test Case**
```
┌─── STEP 5 OF 5: Test Drive ─────────────────────────────────┐
│                                                               │
│ We've created a sample case for you to explore:             │
│                                                               │
│ ✅ Sample Case: "Demo Family"                                │
│    - View case timeline                                      │
│    - See ARIA in action                                      │
│    - Generate a sample report                                │
│    - Try the calendar features                               │
│                                                               │
│ [Open Sample Case] [Skip] [Finish Setup]                     │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 4. Role & Permission Model

### Permission Matrix

| Feature | Owner | Admin | Attorney | Paralegal | Intake | Read Only |
|---------|-------|-------|----------|-----------|--------|-----------|
| Billing | ✓ | - | - | - | - | - |
| Firm Settings | ✓ | ✓ | - | - | - | - |
| Invite/Remove Users | ✓ | ✓ | - | - | - | - |
| Create Templates | ✓ | ✓ | ✓ | - | - | - |
| Manage Assigned Cases | ✓ | ✓ | ✓ | View | View | View |
| ARIA Controls | ✓ | ✓ | ✓ | - | - | - |
| Generate Reports | ✓ | ✓ | ✓ | ✓ | - | - |
| Court Exports | ✓ | ✓ | ✓ | ✓ | - | - |
| Upload Documents | ✓ | ✓ | ✓ | ✓ | - | - |
| Send Intake | ✓ | ✓ | ✓ | - | ✓ | - |
| Create Cases | ✓ | ✓ | ✓ | - | ✓ | - |
| View Firm Analytics | ✓ | ✓ | ✓ | - | - | - |
| Assign Cases | ✓ | ✓ | ✓ (own) | - | - | - |

### Key Rules

1. **ARIA Controls** = Attorney/Owner/Admin only (safety lever)
2. **Billing** = Owner only
3. **Read Only** = Good for auditors, outside counsel, interns
4. **Intake Coordinator** = Can create cases from completed intakes, manage intake pipeline

---

## 5. Core Workflows (End-to-End)

### Workflow A: Intake → Case → Agreement

```
1. Professional sends ARIA Intake link
   ↓
2. Client completes intake (ARIA guides through 17 sections)
   ↓
3. Notification: "Intake completed - Sarah Williams"
   ↓
4. Professional reviews intake dashboard
   ↓
5. Click "Create Case from Intake"
   ↓
6. System auto-populates:
   - Parties (Parent A, Parent B)
   - Children
   - Suggested schedule skeleton
   - Risk flags (DV, substance abuse, etc.)
   ↓
7. Case created with status "Draft"
   ↓
8. Professional edits SharedCare Agreement
   ↓
9. Professional approves → Agreement published to parents
   ↓
10. Parents can view/accept agreement in their portal
```

### Workflow B: Court Order OCR → Compliance

```
1. Professional uploads court order PDF (FL-341)
   ↓
2. OCR detects form type
   ↓
3. System extracts:
   - Exchange schedule
   - Child support obligations
   - Communication rules
   - Custody split (50/50, etc.)
   ↓
4. Professional reviews extracted data
   ↓
5. If confidence low → Alert "Please review carefully"
   ↓
6. Professional approves
   ↓
7. System auto-populates:
   - Exchange Schedule (calendar)
   - ClearFund obligations
   - Compliance dashboard rules
   ↓
8. Fields locked with "🔒 Locked by Case-#"
   ↓
9. Parents notified: "Court order has been filed"
   ↓
10. Compliance tracking begins automatically
```

### Workflow C: Conflict Escalation → ARIA Controls

```
1. Parent sends hostile message to other parent
   ↓
2. ARIA detects threat/harassment pattern
   ↓
3. ARIA rewrites message to constructive tone
   ↓
4. System logs ARIA intervention
   ↓
5. Alert appears in Professional Dashboard
   ↓
6. Professional views case timeline → sees flag
   ↓
7. Professional opens ARIA Controls:
   - Option 1: Tighten rewrite strictness
   - Option 2: Switch to "structured-only" messages
   - Option 3: Enable silent handoff mode
   - Option 4: Request mediation
   ↓
8. Professional adjusts ARIA guardrails
   ↓
9. Change logged in case timeline
   ↓
10. Automatically included in next Compliance Report
```

---

## 6. Data Model (Core Objects)

### Standardized Objects Across Portal

```typescript
// Core entities that every screen should read/write consistently

interface Firm {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  logo_url: string;
  brand_color: string;
  directory_visible: boolean;
  created_at: Date;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'attorney' | 'paralegal' | 'intake' | 'read_only';
  firm_id: string;
  bar_number: string;
  verified: boolean;
  avatar_url: string;
}

interface Case {
  id: string;
  case_number: string;
  firm_id: string;
  assigned_attorney_id: string;
  status: 'pending' | 'active' | 'closed';
  matter_type: string;
  jurisdiction: string;
  parent_a_id: string;
  parent_b_id: string;
  children: Child[];
  compliance_score: number;
  risk_flags: string[];
  created_at: Date;
  next_court_date?: Date;
}

interface Party {
  id: string;
  case_id: string;
  role: 'parent_a' | 'parent_b';
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Child {
  id: string;
  case_id: string;
  name: string;
  birthdate: Date;
  age: number;
  school: string;
  special_needs?: string;
}

interface IntakeSession {
  id: string;
  template_id: string;
  professional_id: string;
  client_email: string;
  client_name: string;
  status: 'sent' | 'pending' | 'in_progress' | 'completed' | 'expired';
  case_id?: string;
  responses: Record<string, any>;
  completion_percentage: number;
  sent_at: Date;
  expires_at: Date;
  completed_at?: Date;
}

interface IntakeTemplate {
  id: string;
  firm_id: string;
  name: string;
  description: string;
  sections: IntakeSection[];
  form_targets: string[];
  estimated_time: number;
  tier: 'free' | 'paid';
}

interface MessageThread {
  id: string;
  case_id: string;
  participants: string[];
  created_at: Date;
  last_message_at: Date;
  unread_count: number;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_type: 'professional' | 'parent_a' | 'parent_b';
  content: string;
  aria_flagged: boolean;
  aria_original_content?: string;
  aria_analysis?: Record<string, any>;
  attachments: Attachment[];
  sent_at: Date;
  read_by: Record<string, Date>;
}

interface Event {
  id: string;
  case_id?: string;
  professional_id: string;
  event_type: 'hearing' | 'deadline' | 'meeting' | 'intake' | 'exchange' | 'followup';
  title: string;
  description: string;
  start_time: Date;
  end_time: Date;
  location: string;
  attendees: string[];
  reminders: Date[];
  created_at: Date;
}

interface Document {
  id: string;
  case_id: string;
  uploaded_by: string;
  type: 'agreement' | 'court_order' | 'evidence' | 'financial' | 'medical' | 'school' | 'other';
  name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  version: number;
  tags: string[];
  ocr_processed: boolean;
  ocr_data?: Record<string, any>;
  uploaded_at: Date;
}

interface Exchange {
  id: string;
  case_id: string;
  scheduled_time: Date;
  location: string;
  pickup_parent_id: string;
  dropoff_parent_id: string;
  status: 'scheduled' | 'completed' | 'missed' | 'late';
  gps_verified: boolean;
  notes: string;
  completed_at?: Date;
}

interface FinancialObligation {
  id: string;
  case_id: string;
  type: 'child_support' | 'medical' | 'extracurricular' | 'other';
  payer_id: string;
  payee_id: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'one_time';
  due_date: Date;
  status: 'pending' | 'paid' | 'overdue' | 'disputed';
}

interface Transaction {
  id: string;
  obligation_id: string;
  amount: number;
  paid_by: string;
  paid_at: Date;
  payment_method: string;
  receipt_url?: string;
}

interface Report {
  id: string;
  case_id: string;
  generated_by: string;
  report_type: 'compliance' | 'discovery' | 'timeline' | 'communication' | 'financial';
  date_range_start: Date;
  date_range_end: Date;
  file_url: string;
  sha256_hash: string;
  generated_at: Date;
}

interface AuditLog {
  id: string;
  firm_id: string;
  user_id: string;
  case_id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, any>;
  ip_address: string;
  user_agent: string;
  created_at: Date;
}

interface Task {
  id: string;
  professional_id: string;
  case_id?: string;
  title: string;
  description: string;
  due_date?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  completed: boolean;
  completed_at?: Date;
  created_at: Date;
}
```

---

## 7. Implementation Checklist

### Phase 1: Core Navigation & Dashboard (Week 1-2)
- [ ] Implement top navigation with all sections
- [ ] Build Dashboard with KPI cards
- [ ] Priority Cases list with urgency sorting
- [ ] Upcoming events widget
- [ ] Recent activity feed
- [ ] My Tasks widget (NEW)
- [ ] Quick Create dropdown

### Phase 2: Cases & Case Detail (Week 3-4)
- [ ] Cases list with filters and search
- [ ] Case table with sorting and bulk actions
- [ ] Saved filter views
- [ ] Case detail Overview tab
- [ ] Case detail Timeline tab
- [ ] Case detail Communication tab
- [ ] Case detail Documents tab
- [ ] Case detail Portals tab (NEW)

### Phase 3: Intake Pipeline (Week 5-6)
- [ ] Intake list/table
- [ ] New intake wizard (3 steps)
- [ ] Template selector
- [ ] Intake link generation
- [ ] Status tracking (sent, pending, in progress, completed)
- [ ] One-click "Create Case from Intake"
- [ ] Intake quality scoring

### Phase 4: Reports & Notifications (Week 7-8)
- [ ] Reports Center (NEW)
- [ ] Report type selector
- [ ] Report generation wizard
- [ ] Report download with SHA-256
- [ ] Export history
- [ ] Notifications Center (NEW)
- [ ] Notification preferences
- [ ] In-app notification bell with count

### Phase 5: Firm Management (Week 9-10)
- [ ] Firm settings page
- [ ] Team management (invite, roles, permissions)
- [ ] Template library
- [ ] Visual template builder (NEW)
- [ ] Template versioning
- [ ] Case queue (for firms)
- [ ] Auto-assignment rules (optional)

### Phase 6: Calendar & Messages (Week 11-12)
- [ ] Professional calendar (month/week/day)
- [ ] New event modal
- [ ] Event reminders
- [ ] Unified messages inbox (NEW)
- [ ] Message triage actions
- [ ] Saved message views

### Phase 7: First-Time Setup & Polish (Week 13-14)
- [ ] Setup wizard (5 steps)
- [ ] Sample case generation
- [ ] Help & documentation (NEW)
- [ ] In-app tours/tooltips
- [ ] Mobile responsive pass
- [ ] Performance optimization
- [ ] Role-based UI filtering

---

## 8. Success Metrics

A firm should be able to:

1. ✅ Create custom intake templates
2. ✅ Send ARIA intake and track completion
3. ✅ Convert completed intake to case with one click
4. ✅ Upload court order and auto-populate schedule/obligations via OCR
5. ✅ Run ARIA-controlled communication between parents
6. ✅ Track exchanges and expenses automatically
7. ✅ Generate compliance reports with court-ready formatting
8. ✅ Export discovery packages (ZIP with all relevant docs)
9. ✅ Manage team roles and case routing
10. ✅ View firm-wide analytics and audit logs

When these 10 workflows are smooth end-to-end, you have a **commercial-grade Professional Portal**.

---

## 9. High-Impact "Quick Wins" to Prioritize

If you want the portal to feel complete fast, build these first:

### Priority 1: Setup Wizard
- Reduces time-to-productivity from "confusing" to "20 minutes"
- Makes everything else feel guided

### Priority 2: Reports Center
- Core value prop for attorneys is "court-ready documentation"
- Visible ROI

### Priority 3: Notifications Center
- Keeps professionals informed without overwhelming them
- Reduces email fatigue

### Priority 4: Visual Template Builder
- Removes JSON intimidation factor
- Enables non-technical staff to create intakes

### Priority 5: Unified Messages Inbox
- Professionals hate switching between cases for messages
- Central triage = time savings

Build these 5 and the entire portal will feel "mature" overnight.

---

## END OF SPECIFICATION

This document defines the complete Professional Portal architecture. Use it as the blueprint for implementation with Claude Opus AI.
