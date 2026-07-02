# CommonGround — Go-Live Readiness

**Audited 2026-07-01, updated 2026-07-02 (platform-verification + Sentry-automation pass).** Two parts: (1) launch gaps prioritized, (2) the complete API-key inventory. Plus the Sentry automation (§3) and the platform verification pass (§4). MFA enforcement and CI are deliberately deferred — tracked below but not yet worked.

---

## 1. Launch Gaps (prioritized)

### ✅ Fixed this pass
- **Background workers now wired into Render** (`backend/render.yaml`) — `aria_worker` (persistent worker) plus five cron jobs: `rolling_generator` (daily — this is the one that matters most: it keeps custody-exchange and obligation instances projected forward; it had **never run in production**, a slow-motion time bomb for the custody calendar), `expire_requests`, `bug_triage_worker`, `weekly_report_worker`, `email_monitor_worker`. Each new service still needs the shared secrets (DATABASE_URL, SECRET_KEY, SUPABASE_*, etc.) attached in the Render dashboard — an Env Group linking all services is the easiest way.
- **CORS now excludes `localhost`/`127.0.0.1` in production** — `allowed_origins_list` (`config.py`) filters them out when `ENVIRONMENT=production`.
- **ARIA dead-letter + Redis fail-open now surface distinctly in Sentry** — previously only logged; `aria_worker.py` emits a tagged `capture_message` on permanent dead-letter, and both Redis-revocation fail-open paths in `security.py` do the same (throttled to 1/min).
- **Fresh-DB migration chain verified + fixed** — ran `alembic upgrade head` against an empty Postgres DB and hit a real bug: `user_promsg_consent_20260618.py` backfills from `user_profiles.terms_accepted_at`, a column that only ever existed via undocumented prod drift (never migrated, only declared on the model). Fixed the migration to create it. Chain now runs clean, exit 0, to `head` on an empty DB.
- **Frontend console.log stripped from production builds** — `next.config.ts` now sets `compiler.removeConsole` (keeps `error`/`warn`) instead of manually touching 125 call sites.
- **Stripe webhook idempotency** — re-audited: `webhook.py` already dedupes by `event_id` (in-memory, 24h TTL) before invoking a handler, and only marks an event processed after success. Not a gap; the original doc entry was wrong.
- **DB connection pooling** — re-audited: `database.py` already sets `pool_size=15`, `max_overflow=20`, `pool_recycle=600`, `pool_pre_ping=True` via Supavisor. Not a gap; the original doc entry was wrong.
- **Mux `NotImplementedError`** — re-audited: `signed_playback_url()` has zero callers anywhere in the app (public-playback-policy assets are used throughout); it's an inert scaffold, not a live crash risk. No change needed until signed playback is actually adopted.

### 🔴 BLOCKERS — fix before any production deploy
| Gap | Where | Action |
|---|---|---|
| **Committed dev secrets** in `backend/.env` (Supabase, Anthropic, SendGrid, Daily, Stripe test, Sentry token) | `backend/.env` | **Rotate ALL keys**, purge from git history (BFG), keep only `.env.example` with placeholders. |
| **Court dev backdoor** — access code `"123456"` | `app/api/v1/endpoints/court.py:140` | Already returns `501` when `is_production` — closed for prod as shipped. Still replace with real per-professional auth before enabling the court portal in prod. |
| **`render.yaml` has no env vars** (only PORT) | `render.yaml` | Add all 15 required vars in the Render dashboard/blueprint (see §2), **and** attach them to the 6 new worker/cron services above. Set `ENVIRONMENT=production`, `DEBUG=false`. |
| **No CI** — no `.github/workflows` | repo | Deferred by user request — revisit after MFA. |

### 🟠 HIGH — before GA
- **MFA modeled but not enforced** for admins/court professionals (`security.py:269`, `models/user.py`). Deferred by user request — next up after this pass.
- **Redis fail-open**: token revocation + rate limiting silently no-op if Redis is down (`security.py:159`, `rate_limit.py:93`). Now alerts to Sentry (see above); still worth Redis HA or a DB fallback for a true fix.
- **aria_jobs dead-letter queue** — now alerts to Sentry (see above); still no replay/reprocess path for dead-lettered jobs.

### 🟡 MEDIUM
- Placeholder virus scan on uploads (`endpoints/messages.py`), holiday-override TODO (`smart_schedule.py`), intake notification TODOs.
- No deployment runbook / rollback guide.
- Per-user (email) rate limiting on auth to complement per-IP.

### ✅ Already in place
- `scripts/preflight_launch_check.py` (env + migrations + E2E gate), `docs/LAUNCH_QA_CHECKLIST.md` (blockers marked fixed 2026-04-18), `docs/DEPLOYMENT_STATUS.md`.
- Mature Sentry instrumentation + AI bug-triage (now with auto-resolution — §3).
- The QA bug-campaign harness (`scripts/bug_campaign/`) — 27 prod-verified scenarios + custody soak.

---

## 2. API Keys / Environment (complete inventory)

**71 env vars total; 15 required for prod; 26 are secrets.** Full detail was audited; the launch-critical set:

### Required for production (15)
| Key | Provider | Secret | Notes |
|---|---|---|---|
| `SECRET_KEY` | App | ✅ | ≥32 random bytes |
| `ENVIRONMENT` / `DEBUG` | App | – | `production` / `false` |
| `FRONTEND_URL` / `ALLOWED_ORIGINS` | App | – | prod domain only |
| `DATABASE_URL` | Supabase Postgres | ✅ | asyncpg URL |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Supabase | anon=public | backend + frontend |
| `SUPABASE_SERVICE_KEY` | Supabase | ✅ | backend only |
| `REDIS_URL` | Upstash/Redis | ✅ | cache + rate-limit + revocation |
| `ANTHROPIC_API_KEY` | Anthropic | ✅ | ARIA (core) |
| `NEXT_PUBLIC_API_URL` | Frontend | – | backend base URL |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | Frontend | anon=public | client auth |

### Feature integrations (enable as features go live)
| Provider | Keys | Needed for |
|---|---|---|
| **Stripe** | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Payments / subscriptions / ClearFund funding |
| **Daily.co** | `DAILY_API_KEY`, `DAILY_WEBHOOK_SECRET` | KidComs video calls |
| **Mapbox** | `MAPBOX_API_KEY` + `NEXT_PUBLIC_MAPBOX_TOKEN` (public `pk.*`) | Silent Handoff geofencing |
| **SendGrid** | `SENDGRID_API_KEY` (+ `EMAIL_ENABLED=true`, list IDs) | Transactional + marketing email |
| **Sentry** | `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | Error tracking + bug triage/auto-resolve |
| **Web Push** | `VAPID_PRIVATE_KEY` + `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push notifications |
| **Mux** | `MUX_TOKEN_ID/SECRET/WEBHOOK_SECRET` | KidSpace theater (currently NotImplemented) |
| **OpenAI / Gemini** | `OPENAI_API_KEY` / `GEMINI_API_KEY` | ARIA fallback |
| **Google OAuth / GA4** | `GOOGLE_OAUTH_*`, `GA4_*` | Email monitor + analytics (optional) |
| **E-sign** | `SIGNING_PRIVATE_KEY_PEM` (Ed25519) | Tamper-proof agreement signatures — set a real key (ephemeral in dev) |

**Config gaps:** `render.yaml` sets none of these (all must be in the Render dashboard); Vercel env must hold the `NEXT_PUBLIC_*` set.

---

## 3. Sentry: error-checking + automatic resolution (shipped this pass)

The AI bug-triage existed (fetch → categorize → AI-triage → sprint → email) but **never wrote back to Sentry**, and the **worker was broken** (bad `save_sprint` args + dict-as-list) so it failed every run. Fixed + added auto-resolution:

- **Fixed `bug_triage_worker.py`** — correct `save_sprint` args, real counts, working summary email.
- **Write-back to Sentry** — `update_sentry_issue()` (org issues API).
- **Guarded auto-resolution** — `auto_resolve_issues()` **auto-MUTES** (never auto-"resolves") two safe classes: known-noise fingerprints (`ResizeObserver`, `NEXT_REDIRECT`, extension/network noise…) and issues the AI classified `action="ignore"` at low/medium severity. Default **dry-run** (logs what it would do); enable with `SENTRY_AUTO_RESOLVE_ENABLED=true`; capped by `SENTRY_AUTO_RESOLVE_MAX_PER_RUN`.
- **New-critical alerting** — `recent_critical_issues()` highlights critical/high issues first-seen in the last 48h in the summary email + subject.
- **On-demand admin endpoint** — `POST /admin/bugs/auto-resolve?dry_run=true|false` (superadmin) to preview/apply from the DevOps hub.

**To turn auto-resolution on:** review a dry-run (`POST /admin/bugs/auto-resolve` or the next cron log), then set `SENTRY_AUTO_RESOLVE_ENABLED=true` on Render — **and issue a Sentry token with `event:write`** (see §4; the current token is read-only, so write-back cannot apply).

### Shipped 2026-07-02 (automation expansion)
- **Correct Sentry org/project defaults** — config pointed at `commonground` / `commonground-frontend`, which don't exist; the real account is org `commonground-s0`, project `commonground`. Every triage run 404'd unless overridden. Fixed in `config.py`; `SENTRY_PROJECT_SLUGS` (csv) adds multi-project support.
- **Token scope verification** (`verify_token_scopes()`) — worker + admin surface now detect a read-only token and say so instead of silently failing every write-back. Current dev token scopes: `event:read, project:read` → auto-mute/reopen **cannot work** until a token with `event:write` is issued.
- **Duplicate fingerprint grouping** (`group_duplicate_issues()`) — collapses per-entity clones (same error type + culprit + normalized title) into one root cause before AI triage; auto-mute now mutes grouped siblings together.
- **Culprit → code location mapping** (`culprit_to_code_location()`) — `app.api.v1.endpoints.messages.send_message` → `app/api/v1/endpoints/messages.py:send_message`, fed into the AI prompt, email, and stored recommendations.
- **AI-suggested fixes** — triage now asks for a concrete `suggested_fix` (+ code location) per resolve item; the summary email lists them.
- **Regression detection** (`detect_regressions()` / `reopen_regressions()`) — muted issues that are *still firing* are flagged in every run + email subject, and can be auto-reopened (same dry-run/cap guardrails). On-demand: `GET /admin/bugs/health`, `POST /admin/bugs/regressions/reopen`.
- **Endpoint health sweep** (`scripts/endpoint_sweep.py`) — synthetic monitoring: enumerates all ~450 registered routes, exercises each (GET-only by default, paced under the rate limit), asserts nothing 5xxes, and reports failures to Sentry (`source=endpoint_sweep`). Wired as a twice-daily Render cron (`commonground-endpoint-sweep`).

**Still open (future):** AI-suggested patch → PR automation; post-deploy resolution verification; Slack alerts.

---

## 4. Platform verification pass (2026-07-02)

Full-surface check: every backend route + full frontend build, plus live Sentry triage of prod errors. **Real prod bugs found and fixed:**

| Bug | Evidence | Fix |
|---|---|---|
| **Agreement activation crashed in prod** — `ModuleNotFoundError: No module named 'dateutil'` (89 unhandled events) | Sentry | `python-dateutil` added to `requirements.txt` (was only a transitive dep locally) |
| **Anthropic 404s across ARIA/demo/bug-hunt** — 4 dead model IDs in code: `claude-sonnet-4-5-20250514` (never existed), `claude-3-5-sonnet-20241022` + `claude-3-5-haiku-20241022` (retired), `claude-sonnet-4-20250514` (retired 2026-06-15) | Sentry | All swapped to active aliases `claude-sonnet-4-5` / `claude-haiku-4-5` (18 call sites) |
| **AI calls timing out** — `ai_clients.py` had a 15s client timeout; any 4096-token generation (triage, bug-hunt overview, blog) always timed out, then fell back to an OpenAI key literally set to `"placeholder"` | reproduced locally | timeout raised to 120s |
| **Unauthenticated court-settings endpoint** — `GET /court/settings/case/{id}` had **no auth** (read internal notes/history for any case + get-or-create DB writes for arbitrary ids → prod 500s) | endpoint sweep vs prod | now requires authenticated user with a case role |

**Verification results:** frontend `npm run build` green (272 pages); backend unit tests 32/32 + 53 other non-e2e tests pass (failures are env-dependent: need live server/DB); in-process sweep 452 routes — all alive; prod sweep confirmed routes respond correctly (401/404/422 unauthenticated, no 5xx except the court-settings bug above, now fixed).

**Ops issues surfaced (not code — need dashboard action):**
- **Anthropic quota 429s** (June 30–Jul 1) — prod key ran out of credits; ARIA circuit breaker did its job. Key works as of this pass; set up billing alerts.
- **OPENAI_API_KEY is `"placeholder"`** — the AI fallback chain is dead. Set a real key (or remove the fallback claim).
- **SendGrid 401 on bug-hunt invite email + 403 on Marketing Contacts** — key invalid or missing scopes; rotate + grant Marketing access.
- **Sentry token read-only** — issue a token with `event:write` for auto-mute/reopen.
