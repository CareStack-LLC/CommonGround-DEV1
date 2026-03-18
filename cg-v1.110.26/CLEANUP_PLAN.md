# CommonGround v1.110.26 — Codebase Cleanup Plan

**Date:** March 17, 2026
**Scope:** Dead files, unused scripts, bucket standardization, link/slug consistency, folder cleanup

---

## TABLE OF CONTENTS

1. [Root-Level Junk Files](#1-root-level-junk-files)
2. [Backend Root Test/Debug Scripts](#2-backend-root-testdebug-scripts)
3. [Backend Scripts Folder (76 files)](#3-backend-scripts-folder)
4. [Supabase Bucket Standardization](#4-supabase-bucket-standardization)
5. [URL / Slug / Link Inconsistencies](#5-url--slug--link-inconsistencies)
6. [Dead Frontend Assets](#6-dead-frontend-assets)
7. [Unused Frontend Components](#7-unused-frontend-components)
8. [Phase Completion Reports](#8-phase-completion-reports)
9. [SQL Migration Cleanup](#9-sql-migration-cleanup)
10. [Filename Inconsistencies](#10-filename-inconsistencies)
11. [.gitignore & Tracked Artifacts](#11-gitignore--tracked-artifacts)
12. [Mobile App Files (KEEP)](#12-mobile-app-files-keep)
13. [Docs Folder Audit](#13-docs-folder-audit)

---

## 1. ROOT-LEVEL JUNK FILES

**Location:** `/cg-v1.110.26/` (project root)
**Action:** DELETE — These are one-off JS debug scripts, not used anywhere.

| File | What it is | Verdict |
|------|-----------|---------|
| `balancer_temp.js` | Temp balancer debug | DELETE |
| `block_nesting.js` | Nesting validator | DELETE |
| `check_balance.js` | Balance checker | DELETE |
| `check_strings.js` | String validator | DELETE |
| `check_tags.js` | Tag checker v1 | DELETE |
| `check_tags_v2.js` | Tag checker v2 | DELETE |
| `context_braces.js` | Brace matching debug | DELETE |
| `dump_nesting.js` | Nesting dump | DELETE |
| `final_fix.js` | One-off fix script | DELETE |
| `find_quote.js` | Quote finder v1 | DELETE |
| `find_quote_v2.js` | Quote finder v2 | DELETE |
| `locate_braces.js` | Brace locator | DELETE |
| `track_nesting.js` | Nesting tracker | DELETE |
| `ultimate_fix.js` | One-off fix script | DELETE |
| `generate_hash.py` | Password hash generator | DELETE |
| `generate_demo_sql.py` | Demo data generator | KEEP (useful) |
| `create_demo_accounts.sql` | Demo account SQL | KEEP (useful) |

**Total: 15 files to delete**

---

## 2. BACKEND ROOT TEST/DEBUG SCRIPTS

**Location:** `/cg-v1.110.26/backend/` (backend root, NOT in tests/)
**Action:** DELETE — These are ad-hoc test scripts that duplicate what's in tests/.

| File | What it is | Verdict |
|------|-----------|---------|
| `test_aria_stress.py` | ARIA stress test | DELETE |
| `test_aria_v3.py` | ARIA v3 test | DELETE |
| `test_async_db.py` | Async DB test | DELETE |
| `test_auth.py` | Auth test | DELETE |
| `test_db.py` | DB connection test | DELETE |
| `test_inference.py` | AI inference test | DELETE |
| `test_rest.py` | REST API test | DELETE |
| `test_rewrite.py` | Schema rewrite test | DELETE |
| `test_users.py` | User endpoint test | DELETE |
| `apply_aria_schema.py` | Schema apply utility | DELETE |
| `check_db.py` | DB status check | DELETE |
| `check_requests.py` | Request inspector | DELETE |
| `debug_intake_data.py` | Intake debugger | DELETE |
| `query_firm.py` | Firm data query | DELETE |
| `app.db` | SQLite test database | DELETE |

**Total: 15 files to delete**

---

## 3. BACKEND SCRIPTS FOLDER

**Location:** `/cg-v1.110.26/backend/scripts/` (76+ files)
**Action:** REVIEW — Many are one-off scripts. Keep only actively useful ones.

### KEEP (Operational Scripts)
- `seed_*.py` — Data seeding (needed for deploys)
- `initialize_storage.py` — Bucket initialization
- `setup_demo_*.py` — Demo environment setup

### CANDIDATES FOR DELETE (One-Off Debug Scripts)
- `debug_*.py` (12+ files) — Various debug utilities
- `verify_*.py` (8+ files) — One-time verification scripts
- `test_*.py` (6+ files) — Ad-hoc test scripts
- `generate_*.py` (report generation scripts, if superseded)
- `fix_*.py` — One-time fix scripts

**Recommendation:** Review each, keep ~15 operational scripts, delete ~60 one-off scripts.

---

## 4. SUPABASE BUCKET STANDARDIZATION

### Current Bucket Names (INCONSISTENT)

| Bucket Constant | Actual Name | Naming Style | Status |
|----------------|-------------|-------------|--------|
| `AVATARS` | `avatars` | lowercase | OK |
| `CHILDREN` | `children` | lowercase | OK |
| `CUBBIE` | `cubbie` | lowercase | OK |
| `RECEIPTS` | `receipts` | lowercase | OK |
| `DOCUMENTS` | `documents` | lowercase | OK |
| `KIDCOMS` | `kidcoms` | lowercase | OK |
| `MESSAGE_ATTACHMENTS` | `message_attachments` | underscore | INCONSISTENT |
| `CALL_RECORDINGS` | `call_recordings` | underscore | INCONSISTENT |
| `PROFESSIONAL_MEDIA` | `professional-media` | **HYPHEN** | INCONSISTENT |
| `REPORTS` | `reports` | lowercase | OK |
| *(missing)* | `aria-frame-evidence` | **HYPHEN, hardcoded** | BROKEN |

### Issues to Fix

**CRITICAL — `aria-frame-evidence` bucket:**
- Hardcoded in `backend/app/services/aria_vision_monitor.py:290`
- NOT defined in `StorageBucket` class (`backend/app/services/storage.py`)
- NOT created in `initialize_storage.py`
- **Fix:** Add `ARIA_FRAME_EVIDENCE = "aria-frame-evidence"` to StorageBucket, update aria_vision_monitor.py to use constant, add to initialize_storage.py

**HIGH — Hardcoded bucket name in professional service:**
- `backend/app/services/professional/communications_service.py:384`
- Uses `"message_attachments"` string literal instead of `StorageBucket.MESSAGE_ATTACHMENTS`
- **Fix:** Replace with `StorageBucket.MESSAGE_ATTACHMENTS`

**MEDIUM — Naming convention inconsistency:**
- Decision needed: standardize on **underscores** or **hyphens** for multi-word bucket names
- Current mix: `message_attachments` (underscore), `call_recordings` (underscore), `professional-media` (hyphen), `aria-frame-evidence` (hyphen)
- **Recommendation:** Standardize on **hyphens** (kebab-case) since Supabase convention uses hyphens, then rename constants accordingly

### Proposed Standard Bucket Names

| Current | Proposed (kebab-case) | Change? |
|---------|----------------------|---------|
| `avatars` | `avatars` | No |
| `children` | `children` | No |
| `cubbie` | `cubbie` | No |
| `receipts` | `receipts` | No |
| `documents` | `documents` | No |
| `kidcoms` | `kidcoms` | No |
| `message_attachments` | `message-attachments` | YES |
| `call_recordings` | `call-recordings` | YES |
| `professional-media` | `professional-media` | No |
| `reports` | `reports` | No |
| `aria-frame-evidence` | `aria-frame-evidence` | Add to constants |

**NOTE:** Renaming buckets requires creating new ones + migrating data. If buckets have production data, we may want to keep existing names and just standardize the constants.

---

## 5. URL / SLUG / LINK INCONSISTENCIES

### Backend Routes (Mostly Consistent — kebab-case)

All route prefixes correctly use kebab-case:
- `/api/v1/family-files`, `/api/v1/quick-accords`, `/api/v1/my-circle`
- `/api/v1/parent-calls`, `/api/v1/circle-calls`, `/api/v1/circle-messages`
- `/api/v1/custody-time`, `/api/v1/time-blocks`, `/api/v1/parent-reports`

**ONE INCONSISTENCY FOUND:**

| Endpoint | Current Path | Standard Pattern | Fix |
|----------|-------------|-----------------|-----|
| Recordings | `/family/{family_file_id}` | `/family-file/{family_file_id}` | Update recordings.py |

**Location:** `backend/app/api/v1/endpoints/recordings.py`
**All other endpoints** use `/family-file/{family_file_id}` pattern.

### Frontend Routes (Consistent)

Frontend Next.js routes match backend prefixes:
- `/dashboard`, `/messages`, `/family-files`, `/payments`, `/schedule`
- `/professional/*`, `/court-portal/*`, `/agreements/*`
- `/kidcoms/*`, `/kids/*`, `/settings/*`, `/superadmin/*`

### Frontend-to-Backend API Calls

**Location:** `frontend/lib/api.ts` (249KB — massive file)
- All API calls use kebab-case paths matching backend
- No inconsistencies detected between frontend API calls and backend routes

---

## 6. DEAD FRONTEND ASSETS

### Missing Files Referenced in Code

| Referenced Path | Where Referenced | Status |
|----------------|-----------------|--------|
| `/assets/grain.png` | `(marketing)/grant-partnership/page.tsx`, `dashboard/partners/[slug]/components/ImpactBoard.tsx` | MISSING |
| `/commonground-logo.svg` | `my-circle/contact/terms/page.tsx` | MISSING |
| `/integrations/mycase.svg` | `professional/firm/page.tsx` | MISSING |
| `/integrations/silo.svg` | `professional/firm/page.tsx` | MISSING |
| `/assets/marketing/demo-partner-logo.png` | Hardcoded in partner config | MISSING |
| `/assets/marketing/interval-house-hero.jpg` | Partner hero images | MISSING |
| `/assets/marketing/jenesse-hero.jpg` | Partner hero images | MISSING |

**Action:** Either create these assets or remove the references from code.

### Duplicate Assets

| File 1 | File 2 | Action |
|--------|--------|--------|
| `kidsComms/PDFs/Luna and Midnight.pdf` | `kidsComms/PDFs/Luna_And_Midnight_.pdf` | Delete older duplicate |

### Potentially Unused Assets (Need Verification)

| Asset | Location | Notes |
|-------|----------|-------|
| `Site images/` folder (45 pexels stock photos) | `frontend/public/Site images/` | Check if any are actually used |
| `kidsComms/Design inso/` (3 files) | `frontend/public/kidsComms/Design inso/` | Design reference only? |
| Next.js defaults (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`) | `frontend/public/` | Default Next.js — safe to delete |

---

## 7. UNUSED FRONTEND COMPONENTS

### Candidates for Review (Low/No Import Count)

| Component | Location | Notes |
|-----------|----------|-------|
| `feature-gate.tsx` | `components/` | Legacy feature gating — may be replaced by `use-feature-gate.ts` hook |
| `locked-feature-card.tsx` | `components/` | May be unused if feature gating changed |
| `mini-mega/MiniMegaGame.tsx` | `components/mini-mega/` | Arcade game — verify usage |
| `cg-badge.tsx` | `components/cg/` | Check import count |
| `cg-input.tsx` | `components/cg/` | Check import count |
| `custody/parenting-time-card.tsx` | `components/custody/` | Single dashboard reference? |

**Action:** Run import analysis to confirm which are truly unused before deleting.

---

## 8. PHASE COMPLETION REPORTS

**Location:** `/cg-v1.110.26/` (project root)
**Action:** MOVE to `docs/phases/` or DELETE

| File | Size | Verdict |
|------|------|---------|
| `PHASE_1_COMPLETION_REPORT.md` | varies | MOVE to docs/phases/ |
| `PHASE_2_COMPLETION_REPORT.md` | varies | MOVE to docs/phases/ |
| `PHASE_3_COMPLETION_REPORT.md` | varies | MOVE to docs/phases/ |
| `PHASE_4_COMPLETION_REPORT.md` | varies | MOVE to docs/phases/ |
| `PHASE_5_COMPLETION_REPORT.md` | varies | MOVE to docs/phases/ |
| `PHASE_6_COMPLETION_REPORT.md` | varies | MOVE to docs/phases/ |
| `PHASE_7_COMPLETION_REPORT.md` | varies | MOVE to docs/phases/ |
| `PHASE_8_COMPLETION_REPORT.md` | varies | MOVE to docs/phases/ |
| `PHASE_9_COMPLETION_REPORT.md` | varies | MOVE to docs/phases/ |
| `PHASE_10_COMPLETION_REPORT.md` | varies | MOVE to docs/phases/ |
| `DEPLOYMENT_STATUS.md` | varies | MOVE to docs/ |
| `CUSTODY_TRACKING_TEST_PROGRESS.md` | varies | MOVE to docs/ |

---

## 9. SQL MIGRATION CLEANUP

**Location:** `/cg-v1.110.26/backend/migrations/`

### Duplicate/Versioned Auth Setup Files

| File | Verdict |
|------|---------|
| `supabase_auth_setup.sql` | DELETE (superseded by v5) |
| `supabase_auth_setup_v2.sql` | DELETE (superseded by v5) |
| `supabase_auth_setup_v3.sql` | DELETE (superseded by v5) |
| `supabase_auth_setup_v4.sql` | DELETE (superseded by v5) |
| `supabase_auth_setup_v5_dynamic.sql` | KEEP (current) |
| `ensure_partners_and_setup_auth.sql` | DELETE (superseded by v3) |
| `ensure_partners_and_setup_auth_v2.sql` | DELETE (superseded by v3) |
| `ensure_partners_and_setup_auth_v3.sql` | KEEP (current) |
| `update_partner_demo_creds.sql` | DELETE (superseded by v2) |
| `update_partner_demo_creds_v2.sql` | KEEP (current) |
| `update_partner_demo_creds_template.sql` | KEEP (template) |

**Total: 6 superseded SQL files to delete**

---

## 10. FILENAME INCONSISTENCIES

### Spaces in Filenames

| Current Name | Location | Fix |
|-------------|----------|-----|
| `pdf court forms/` | `docs/pdf court forms/` | Rename to `pdf-court-forms/` |
| `Design inso/` | `frontend/public/kidsComms/Design inso/` | Rename to `design-inspo/` or delete |
| `Site images/` | `frontend/public/Site images/` | Rename to `site-images/` |
| `Soap Boat.pdf` | `frontend/public/kidsComms/PDFs/` | Rename to `soap-boat.pdf` |
| `Johnny Express.mp4` | `frontend/public/kidsComms/MP4s/` | Check code refs, rename |
| `The Bread.mp4` | `frontend/public/kidsComms/MP4s/` | Check code refs, rename |
| `Super Marios Bros.mp4` | `frontend/public/kidsComms/MP4s/` | Check code refs, rename |
| `Sonic The Hedgehog.mp4` | `frontend/public/kidsComms/MP4s/` | Check code refs, rename |

### Mixed Case in Folder Names

| Current | Recommended | Location |
|---------|------------|----------|
| `kidsComms/` | Keep (too many refs) | `frontend/public/` |
| `PDFs/` | `pdfs/` | `frontend/public/kidsComms/` |
| `MP4s/` | `mp4s/` | `frontend/public/kidsComms/` |

**NOTE:** Renaming media files requires updating `frontend/lib/theater-content.ts` references.

---

## 11. .GITIGNORE & TRACKED ARTIFACTS

### Current `.gitignore` (Only 1 entry!)
```
.vercel
```

### Tracked Files That Shouldn't Be

| File/Pattern | Count | Action |
|-------------|-------|--------|
| `.DS_Store` | 14 files | Add to .gitignore, remove from tracking |
| `__pycache__/` | multiple | Add to .gitignore, remove from tracking |
| `.next/` | if tracked | Add to .gitignore |
| `node_modules/` | if tracked | Add to .gitignore |
| `.env` files | if tracked | Add to .gitignore |
| `app.db` | 1 file | Add to .gitignore, delete |

### Proposed `.gitignore` Additions
```
# OS files
.DS_Store
Thumbs.db

# Python
__pycache__/
*.py[cod]
*.so

# Node
node_modules/
.next/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# Build
coverage/
*.tsbuildinfo
*.log
```

---

## 12. MOBILE APP FILES (KEEP — DO NOT DELETE)

The following are related to mobile app planning and should be preserved:

| File | Location | Why Keep |
|------|----------|---------|
| `MOBILE_MULTIAPP_ARCHITECTURE.md` | `docs/architecture/` | Future mobile roadmap |
| `scripts/fix-expo-deps.js` | `scripts/` | Expo dependency management |
| Daily.co integration code | Various | Supports future native apps |
| Service Worker (`sw.js`) | Frontend | PWA capabilities |

---

## 13. DOCS FOLDER AUDIT

**Location:** `/cg-v1.110.26/docs/` (83 files across 16 subdirectories)

### KEEP (Active Documentation)
- `architecture/` — System design docs
- `api/` — API reference
- `features/` — Feature documentation
- `guides/` — Setup and onboarding
- `client_docs/` — Email templates (actively used)
- `operations/` — Security, monitoring
- `pdf court forms/` — Court form templates (rename folder)

### REVIEW (Possibly Stale)
- `plans/calendar-unification-plan.md` — Is this still active?
- `PROGRESS_UPDATE_2026-01-22.md` — Old progress updates
- `PROGRESS_UPDATE_2026-01-23.md` — Old progress updates
- `marketing/campaign_dv_safety_2026.md` — Still relevant?

---

## EXECUTION PRIORITY

### Phase 1 — Quick Wins (Safe Deletes)
1. Delete 15 root-level junk JS scripts
2. Delete 15 backend root test/debug scripts
3. Delete `app.db` SQLite file
4. Delete 6 superseded SQL migration files
5. Update `.gitignore` and remove `.DS_Store` files from tracking

### Phase 2 — Bucket Standardization
1. Add `ARIA_FRAME_EVIDENCE` to `StorageBucket` class
2. Fix hardcoded bucket reference in `communications_service.py`
3. Update `initialize_storage.py` to include all buckets
4. Decide: standardize bucket naming to kebab-case or keep as-is

### Phase 3 — URL/Slug Fix
1. Fix recordings endpoint path (`/family/` → `/family-file/`)
2. Update any frontend API calls if needed

### Phase 4 — Asset Cleanup
1. Fix or remove dead asset references (7 missing files)
2. Delete duplicate `Luna and Midnight.pdf`
3. Remove unused Next.js default SVGs

### Phase 5 — Organization
1. Move phase reports to `docs/phases/`
2. Rename folders with spaces in names
3. Clean up backend scripts/ folder (delete ~60 one-off scripts)
4. Verify and remove unused frontend components

---

## SUMMARY COUNTS

| Category | Files to Delete | Files to Move | Files to Fix |
|----------|----------------|---------------|-------------|
| Root junk scripts | 15 | 0 | 0 |
| Backend test scripts | 15 | 0 | 0 |
| Superseded SQL migrations | 6 | 0 | 0 |
| Backend scripts/ cleanup | ~60 | 0 | 0 |
| Phase reports | 0 | 12 | 0 |
| Dead asset references | 0 | 0 | 7 |
| Bucket fixes | 0 | 0 | 3 |
| URL slug fix | 0 | 0 | 1 |
| .gitignore + artifacts | 14 (.DS_Store) | 0 | 1 (.gitignore) |
| **TOTAL** | **~110** | **12** | **12** |
