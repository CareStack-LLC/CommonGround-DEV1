# CommonGround — launch QA checklist

> Fill this out on test day. Two reviewers should split the list and run
> sections in parallel. A GO verdict requires every box checked, every
> issue logged as a GitHub issue (or dismissed with a reason), and zero
> new Sentry errors during the run.
>
> Run date: `____________________`
> Commit SHA: `____________________` (output of `git rev-parse --short HEAD`)
> Environment: `dev` / `staging` (delete one)
> Backend URL: `____________________`
> Frontend URL: `____________________`
>
> **GO / NO-GO (fill last): `____________________`**

---

## Pre-run gates

Must be GREEN before you start the manual walk.

| # | Check | Owner | Result |
|---|-------|-------|--------|
| P1 | `ALLOW_DESTRUCTIVE_PREFLIGHT=true python backend/scripts/preflight_launch_check.py` exited 0 with `GO` | | |
| P2 | `pytest backend/tests/e2e/test_full_system_e2e.py -v` — 12 real stages PASS, 1 (test_99) intentionally SKIP | | |
| P3 | `cd frontend && npx playwright test` — 5 specs green | | |
| P4 | Sentry dashboard open, zero new errors since preflight | | |

If any of P1–P4 is red, STOP. Fix it before the manual pass — otherwise the
manual results aren't trustworthy.

Stripe CLI listener (`stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe`)
is only required when running a full Stripe-funded obligation flow; the
current stage 06 uses the manual-funding path which doesn't require webhook
forwarding. Start the listener if/when you add real-card PaymentIntent
testing.

### Launch-blockers found during the first test run — ALL FIXED 2026-04-18

1. ✅ **`POST /messages/` 500** — root cause turned out to be
   `UndefinedTableError: aria_sender_baseline does not exist`. The ARIA V2
   Phase 3 migration was merged into the 8-head merge but never applied to
   this Supabase project. Fixed two layers:
   - Backfilled the missing tables via direct SQL (`aria_session_memory`,
     `aria_sender_baseline`, plus three columns on `message_flags`).
   - Added the same `CREATE TABLE IF NOT EXISTS` / `ALTER … ADD COLUMN IF
     NOT EXISTS` DDL to `app/main.py` startup lifespan so other deployments
     that stamped past the merge self-heal on boot.
   - Added `await db.rollback()` to every `except Exception` in the 5
     ARIA V2 helper modules (`aria_baseline`, `aria_bidirectional`,
     `aria_time_signals`, `aria_session_memory`) so a future DB hiccup
     doesn't poison the session and cascade-fail subsequent queries.
   - Wrapped the outer V2→V1 fallback in messages.py with a rollback too.

2. ✅ **`settings` undefined in `AuthService.register_user`** — inner
   `from app.core.config import settings` inside a conditional branch
   was shadowing the module-level import throughout the whole function.
   Fix: removed the inner import; module-level import covers it.

3. ✅ **SendGrid 403** — `FROM_EMAIL=noreply@commonground.family` wasn't a
   verified sender on this SendGrid account. Verified senders (queried via
   `GET /v3/verified_senders`): `support@`, `noreply@`, `info@`, `hello@
   find-commonground.com`. Fix: `FROM_EMAIL=noreply@find-commonground.com`.

4. 📝 **Backend cold-start ~130s** — profiled: 22s module-import +
   ALTER-TABLE lifespan work + Redis TLS handshake. Acceptable on the $25
   paid tier where the service stays warm. Documented.

### Known non-blockers surfaced by the second run (file + fix, not urgent)

- **SendGrid Marketing Contacts 400** — `invalid custom field names or
  ID's supplied - e1_T,e2_T,e4_T,e6_T,e7_T`. Those custom fields aren't
  defined in the SendGrid Marketing Contacts schema. Either create them in
  the dashboard or strip them in `email_service.add_marketing_contact()`.
  Log-only failure; doesn't affect transactional email delivery.
- **`send_report_ready()` got unexpected kwarg `report_highlights`** —
  stale call-site in parent-reports. Report PDF still generates fine; the
  post-generation notification email just doesn't send.

---

## Section A — Email delivery

For each row, trigger the event in the UI (or via API if noted) and confirm:
- Received in inbox within 2 min
- Renders correctly on desktop Gmail web + Gmail iOS
- Not in spam
- Links resolve to the correct frontend URL

| # | Trigger | Recipient | Subject seen | Inbox | Not spam | Links OK | Reviewer / time |
|---|---------|-----------|--------------|-------|----------|----------|-----------------|
| A1 | Parent registration → welcome email | parent email | | ☐ | ☐ | ☐ | |
| A2 | Invite co-parent | parent B email | | ☐ | ☐ | ☐ | |
| A3 | Invite professional | pro email | | ☐ | ☐ | ☐ | |
| A4 | Invite circle contact | contact email | | ☐ | ☐ | ☐ | |
| A5 | Agreement ready for approval | the other parent | | ☐ | ☐ | ☐ | |
| A6 | Agreement finalized | both parents | | ☐ | ☐ | ☐ | |
| A7 | Exchange reminder (24h pre) | both parents | | ☐ | ☐ | ☐ | |
| A8 | Parent report ready | requesting parent | | ☐ | ☐ | ☐ | |

Notes / issues found: ____________________________________________________

---

## Section B — Real-time communication (video, chat, push)

Tests that cross external infrastructure (Daily.co, FCM/APNs) — can't be
automated in Playwright.

| # | Scenario | Devices | A/V both directions | Push banner seen | Reviewer / time |
|---|----------|---------|---------------------|------------------|-----------------|
| B1 | KidComs parent↔circle video call | iOS Safari + desktop Firefox | ☐ / ☐ | n/a | |
| B2 | KidComs 3-way call (parent + contact + child) | iPhone + Pixel + Mac | ☐ / ☐ / ☐ | n/a | |
| B3 | Parent→parent message triggers in-app push | iOS Safari w/ PWA installed | n/a | ☐ | |
| B4 | Parent→parent message triggers OS push (Android) | Pixel Chrome | n/a | ☐ | |
| B5 | KidComs incoming call ring (parent device) | iOS Safari | n/a | ☐ | |

---

## Section C — PDF visual review

Generate each report type, open the PDF on desktop, confirm:

| # | Report type | Branding/header | Data correct | Signatures (where applicable) | Page breaks clean | Reviewer / time |
|---|-------------|-----------------|--------------|-------------------------------|-------------------|-----------------|
| C1 | Custody time | ☐ | ☐ | n/a | ☐ | |
| C2 | Communication summary | ☐ | ☐ | n/a | ☐ | |
| C3 | Expense summary | ☐ | ☐ | n/a | ☐ | |
| C4 | Schedule history | ☐ | ☐ | n/a | ☐ | |
| C5 | KidSpace communication | ☐ | ☐ | n/a | ☐ | |
| C6 | Court export package | ☐ | ☐ | ☐ | ☐ | |

Notes: _______________________________________________________________

---

## Section D — Mobile responsive spot check

Walk these surfaces on two viewports. Focus on: no horizontal scroll, all
CTAs reachable, forms usable.

| # | Surface | iPhone 14 (390×844) | Pixel 7 (412×915) | Reviewer / time |
|---|---------|---------------------|-------------------|-----------------|
| D1 | Parent dashboard | ☐ | ☐ | |
| D2 | Messages thread | ☐ | ☐ | |
| D3 | Agreement builder | ☐ | ☐ | |
| D4 | Exchange check-in (silent handoff) | ☐ | ☐ | |
| D5 | KidSpace child dashboard | ☐ | ☐ | |
| D6 | Professional case timeline | ☐ | ☐ | |

---

## Section E — Rate limit + abuse smoke

| # | Scenario | Expected | Observed | Reviewer / time |
|---|----------|----------|----------|-----------------|
| E1 | 10 rapid `/auth/register` from one IP | HTTP 429 on #6+ | | |
| E2 | 30 rapid `/messages/` from one user | 429 or queue | | |
| E3 | Image upload >10 MB | 413 | | |
| E4 | SQL-injection probe in family-file title `' OR 1=1 --` | 400/422 or stored verbatim | | |

---

## Section F — Parent-facing mock-data sweep

Confirm no sample / placeholder / lorem content is user-visible on parent
pages. Superadmin pages are allowed to show `is_sample: true` banners; all
other surfaces must show real data or an empty state.

```bash
# Run from repo root:
grep -r -E "is_sample|is_estimate|mock|placeholder|lorem|TODO" \
    frontend/app \
    --exclude-dir superadmin \
    --include="*.tsx" --include="*.ts"
```

List any hits the reviewer decides are parent-visible below, and file a
GitHub issue for each:

- ________________________________________________________________
- ________________________________________________________________
- ________________________________________________________________

---

## Section G — Data deletion verification

After the full test day, re-run the wipe and confirm it's clean.

```bash
cd backend
ALLOW_DESTRUCTIVE_PREFLIGHT=true python scripts/cleanup_all_test_data.py
```

| # | Check | Expected | Observed | Reviewer / time |
|---|-------|----------|----------|-----------------|
| G1 | `SELECT count(*) FROM users WHERE email <> 'thomas.wilform@gmail.com'` | 0 | | |
| G2 | Supabase dashboard → Auth → Users shows only admin | yes | | |
| G3 | Stripe dashboard → Customers shows no `@commonground.test` | yes | | |
| G4 | Supabase Storage buckets empty (except demo assets) | yes | | |
| G5 | Orphan Daily.co rooms listed in `reports/daily_rooms_created.txt` | logged for cleanup | | |

---

## Section H — Sentry + logs review

| # | Check | Result | Notes |
|---|-------|--------|-------|
| H1 | Zero new error events in Sentry during the run window | ☐ | |
| H2 | No `CRITICAL` or `ERROR` lines in Render logs during the run | ☐ | |
| H3 | Stripe CLI terminal shows no `error` or `failed` payloads | ☐ | |
| H4 | No Supabase `policy_violation` log entries | ☐ | |

---

## Sign-off

| Reviewer | Role | Date/time | Verdict | Notes |
|----------|------|-----------|---------|-------|
| | Eng #1 | | GO / NO-GO | |
| | Eng #2 / QA | | GO / NO-GO | |
| | Product / launch lead | | GO / NO-GO | |

> A NO-GO from any reviewer blocks launch until the issue is triaged.
> File every failure as a GitHub issue tagged `launch-blocker` or
> `launch-nice-to-have`, link them below:
>
> - `____________________________`
> - `____________________________`
> - `____________________________`

---

## Out of scope (intentional)

- **Load testing** — deferred until Render Standard + Supabase Pro are in place
  (free tier caps at 0.1 CPU / 500 MB DB; can't carry 300 concurrent users).
- **Stripe Issuing live activation** — gated on `card_issuing` capability
  approval from Stripe; code ships inert until then.
- **Legal / PCI-DSS compliance review** — separate engagement.
- **Deliberate RLS evasion security audit** — separate engagement.
