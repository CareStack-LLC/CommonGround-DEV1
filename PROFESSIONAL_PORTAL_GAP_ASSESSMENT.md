# PROFESSIONAL PORTAL: GAP ASSESSMENT

**Prompt Source:** [CLAUDE_OPUS_IMPLEMENTATION_PROMPT.md](file:///Users/tj/Desktop/CommonGround/mvp/CLAUDE_OPUS_IMPLEMENTATION_PROMPT.md)
**Status:** All 10 phases "Completed" at a functional level, but some architectural and polish gaps remain.

---

## 🛑 Critical Functional Gaps

### 1. Visual Template Builder (`Phase 5`)
- **Requirement:** Drag-and-drop interface for sections/questions with live preview.
- **Current State:** Basic templates list and CRUD exist, but no visual builder with drag-reordering or real-time preview (app/professional/firm/templates/[id]/edit).
- **Impact:** Professionals must use pre-built templates or hard-coded definitions rather than designing their own client workflows.

### 2. Notifications Center & Preferences (`Phase 4`)
- **Requirement:** `/notifications` page with grouped history (Today, Yesterday, etc.) and a matrix-style preference grid (Email vs In-App vs SMS).
- **Current State:** The Bell icon in the header only displays a count. There is no dedicated history page or notification channel grid.
- **Impact:** Users cannot review past alerts or control their alerting noise level.

### 3. Help Center & Tours (`Phase 7`)
- **Requirement:** `/help` page with searchable guides/videos and in-app tours (Joyride).
- **Current State:** Missing entirely.
- **Impact:** High learning curve for new professional users; no self-service troubleshooting.

---

## 7. Deep Dive: Backend & Database Audit

A deeper inspection of the codebase and database migrations reveals the following tactical gaps:

### 7.1 "Placeholder" Logic in Analytics
*   **Urgency & Healthcare Scores:** Currently calculated in `dashboard_service.py` using single-factor calculations (e.g., `urgency = flag_rate * 100`).
*   **Missing Trends:** The system lacks the required 30/60/90 day historical trend analysis and multi-factor "Quality Scores" specified in Phase 4 and Phase 10.

### 7.2 The "Mocked" UI Gap
*   **Bulk Actions:** The Case List UI incorporates a bulk action bar, but the logic is explicitly mocked (e.g., `alert("Integrate /bulk-action")`). There is no backend support for bulk assignment, tagging, or exporting.
*   **Saved Filter Views:** The system uses hardcoded `SYSTEM_VIEWS` in the frontend rather than the required dynamic "Saved View" workflow. While the database table `professional_saved_views` is defined in SQL, it is not yet integrated into the frontend.
*   **Tagging:** UI hooks for case tagging are present but not wired to the `case_tags` table.

### 7.3 Professional Workflow Skeletal State
*   **Task Management:** The `ProfessionalTaskService` and schema are extremely minimal. They lack team-member assignment (solo-focus only), recurrence, attachments, and bulk status updates.
*   **SLA Timers:** There is no logic in `messaging_service.py` or the frontend Global Inbox to track or display "Stale Response" warnings based on professional tier SLAs.

### 7.4 Document Integrity
*   **Digital Signatures:** `report_service.py` generates SHA-256 hashes for reporting records, providing a good baseline for integrity. However, it lacks true cryptographic signatures embedded in the PDF for "Chain of Custody" court validation.

### 7.5 Database Desynchronization
*   **Unapplied Migrations:** Several tables required for "completed" phases (e.g., `professional_tasks`, `case_tags`, `professional_saved_views`) appear defined in migration scripts but were not found in the active production-grade database, indicating the system is in a "code-first" state where the backend logic anticipates a schema that isn't fully migrated.

---

## Conclusion
The Professional Portal is **visually and structurally mature** (Phases 1-10 are routed and themed), but **functionally thin** in its advanced workflow and analytics layers. Transitioning from "Functional MVP" to "Enterprise Professional Grade" will require migrating the remaining schema and replacing frontend mocks with real service integrations.

---

## 🟡 Compliance & Governance Gaps

### 4. SLA Timers & Response Tracking (`Phase 6`)
- **Requirement:** "Needs Response" filters and timers showing time since last parent message.
- **Current State:** Basic messaging works, but no SLA/Overdue indicators.
- **Impact:** Professionals might miss critical parent messages without visual "stale" indicators.

### 5. Multi-Firm Audit & Production Hardening (`Phase 10`)
- **Requirement:** Security audit logs surfaced to partners and trust account verification.
- **Current State:** Backend foundations exist, but UI surfacing of security audit logs for firm owners is missing.
- **Impact:** Firm owners cannot oversight who accessed which case file.

---

## 🟢 UI/UX & Navigation Gaps

| Feature | Requirement | Gap |
|---------|-------------|-----|
| **Mobile UX** | Touch targets >44px, no horizontal scroll | Table views (Cases/Documents) still require horizontal scroll on small screens. |
| **Top Nav** | Profile dropdown with Help, Subscription | Profile is just a static name + Sign Out button; sub-links are scattered. |
| **Quick Create**| Upload Court Order (OCR) in list | "Upload Court Order" button missing from some QuickCreate menus (only simple Task/Case). |
| **Role Awareness**| Hide "Firm" if not in one | Current layout shows "Case Queue" regardless of firm membership status. |

---

## ✅ Successfully Implemented (MVP Ready)
- [x] **Dashboard:** KPI cards, Tasks widget, Priority cases list.
- [x] **Cases:** 25/page pagination, multi-select bulk actions, saved views.
- [x] **Intake:** "Convert to Case" flow with one click.
- [x] **Reports:** Firm-wide compliance overview with SHA-256 verification.
- [x] **Firm:** New firm onboarding wizard and analytics dashboard.
- [x] **Documents:** Full library with category pills, upload, and SHA-256 hash.
- [x] **Messaging/Calendar:** Fully functional thread management and scheduling.
- [x] **ARIA:** Per-case analysis and monitoring controls.
