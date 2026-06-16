# CommonGround Improvement Roadmap

**Created:** 2026-06-11
**Source:** Full-app reliability/safety audit (backend, frontend, AI, infra)
**Companion doc:** [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)

Goal: make the platform more reliable, stable, and valuable for every
audience — parents, kids, professionals, courts — plus AI enhancements.
Organized as Batch 1 (shipped with this doc), Batch 2 (next), and Later.

---

## Batch 1 — Reliability & child safety (IMPLEMENTED 2026-06-11)

| # | Fix | Files |
|---|-----|-------|
| 0 | Alembic migration (`email_outbox`, `aria_jobs` retry columns + `dead_letter` enum, `kidcoms_sessions.aria_report`) + `redis_lock()` helper for cross-instance job dedupe | `alembic/versions/reliability_batch1_20260611.py`, `app/core/distributed_lock.py` |
| 1 | Custody exchange auto-close race: per-instance `FOR UPDATE SKIP LOCKED` + post-lock status recheck + per-instance commits; scheduler tick deduped via Redis lock | `app/services/custody_exchange.py`, `app/services/scheduler.py` |
| 2 | ClearFund lost-update protection: obligation row locks on all mutating transitions; funding-row lock; duplicate virtual-card issuance guarded by pre-transition status | `app/services/clearfund.py` |
| 3 | Email outbox: critical emails (invitations, security alerts, expense requests, KidComs alerts, ARIA interventions) spill to a durable outbox on send failure; dispatcher retries every 2 min with exponential backoff, dead-letters after 5 attempts with Sentry capture | `app/services/email.py`, `app/services/email_outbox_dispatcher.py`, `app/models/email_outbox.py` |
| 4 | aria_jobs worker: exponential backoff via `next_attempt_at`, configurable `ARIA_JOB_MAX_RETRIES`, schema-drift fix, proper logging | `app/worker/aria_worker.py` |
| 5 | ARIA circuit breaker state shared across instances via Redis (survives restarts); local fallback when Redis is down | `app/services/aria_circuit_breaker.py`, `aria_llm_router.py`, `aria.py` |
| 6 | AI usage tracking (ALERT-ONLY — never blocks calls; child-safety ARIA must never silently stop): Redis daily token counters per provider/model, `AI_DAILY_TOKEN_BUDGET` alert, `GET /admin/ai-usage` | `app/core/ai_usage.py`, `ai_clients.py`, `endpoints/admin_ai_usage.py` |
| 7 | **KidComs post-call ARIA analysis** (child-safety gap): full-transcript report persisted to `kidcoms_sessions.aria_report`; triggered on session end + abandoned-session sweep; SEVERE findings notify both parents (websocket + durable email); `GET /kidcoms/sessions/{id}/call-report` for parents and approved professionals | `app/services/aria_call_monitor.py`, `endpoints/kidcoms.py`, `app/services/daily_room_cleaner.py` |
| 8 | Frontend error surface: Toaster renderer mounted (activates ~23 previously-invisible `toast()` call sites), global deduped toasts for network/5xx/timeout failures, `AbortSignal` support + 30s default timeout in `fetchAPI` | `components/ui/toaster.tsx`, `hooks/use-toast.ts`, `lib/api-error-notify.ts`, `lib/api.ts`, `components/app-providers.tsx` |

Product decisions locked in for Batch 1:
- **AI budget:** alert-only; no kill-switch.
- **KidComs call flags:** notify both parents on severe only; moderate flags visible in the on-demand report.
- **Email durability:** critical categories only; marketing/routine notification emails still drop on failure.

---

## Batch 2 — Next up (not yet implemented)

Reliability & correctness:
1. **Generic durable job queue** — generalize the `aria_jobs` polling-worker pattern for report generation/exports; declare a dedicated worker service in `render.yaml` once off free tier (today APScheduler runs inside both web instances).
2. **Typed exception sweep** — replace the highest-risk bare `except Exception` blocks (clearfund, stripe_service, message send paths) with typed handling + `logger.exception`; ~675 instances exist across services/endpoints.
3. **Pagination caps** on admin/professional list endpoints; fix the `recordings.py` count query (`# TODO: Add proper count query`).
4. **Sentry PII** — disable `send_default_pii` or scrub message content before capture (privacy/compliance; messages between parents are sensitive by definition).
5. **CI migration test** — `alembic upgrade head` + `downgrade` cycle against the CI Postgres so a breaking migration can't reach Render startup.

User experience & onboarding:
6. **Parent onboarding checklist** — guided first-run: create family file → add children → invite co-parent → ARIA intro (today: blank dashboard).
7. **Professional onboarding tour** — explain case management, ARIA controls, intake, exports after the credentials wizard.
8. **Form validation library (zod)** — parent register, professional onboarding, agreement builder; replaces scattered inline checks.
9. **Loading skeletons** (`loading.tsx`) for async routes that lack them; **realtime subscription cleanup** when switching family files.
10. **Professional intake auto-save** — questionnaire responses currently lost if the page closes mid-session.

Testing (largest gap):
11. Professional portal integration tests (~30: case access scoping, intake, reports).
12. ARIA e2e (analyze → block → rewrite flow); court portal e2e; child-flow e2e; axe-playwright accessibility checks; mobile viewport runs.

Notifications:
13. **Web push** — VAPID keys + `usePushNotifications` hook exist; wire end-to-end with delivery tracking.

Child safety:
14. **Age-gating** — message rate limits, call duration limits, media access tiers by age.
15. **SOS button hardening** — error states + retry when the SOS call fails (today it fails silently).

---

## Later — AI enhancements & infra backlog

AI (ranked by value given the existing data model):
1. **Schedule conflict detection** — overlapping custody blocks, holiday conflicts (`smart_schedule.py` holiday TODO), impossible-schedule detection.
2. **Expense dispute summarization** — Claude analyzes the dispute thread, extracts facts, proposes fair splits, generates a court-ready dispute summary.
3. **Court-ready AI case summaries** — synthesize communication patterns, compliance, expenses across the 5 existing report types in `services/professional/reports/`.
4. **Co-parenting health score** — monthly tone/sentiment trend for professionals (`aria_bidirectional.py`, `aria_time_signals.py` are partial).
5. **Predictive exchange-compliance alerts** — flag high-risk exchanges 24h ahead from historical check-in behavior.
6. **Multi-lingual ARIA** — Spanish first (patterns + prompts).
7. **Intake auto-draft** — pre-fill agreement sections from intake transcripts for professionals.

Infra:
- Automated DB backup exports + restore drills (document RTO/RPO).
- AI cost dashboard (extend `/admin/ai-usage` into the superadmin UI).
- PostgreSQL row-level security policies as defense-in-depth under the ORM checks.
- WebSocket connection state in Redis (today messages can drop on deploys).
- CI: promote ruff/black/mypy from `continue-on-error` to enforced.

---

## Verification commands

```bash
# Backend
cd cg-v1.110.26/backend && pytest
alembic upgrade head && alembic downgrade -1 && alembic upgrade head

# Frontend
cd cg-v1.110.26/frontend && pnpm run build && pnpm exec playwright test
```
