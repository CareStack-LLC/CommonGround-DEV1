# CommonGround — Go-Live Readiness

**Audited 2026-07-01.** Two parts: (1) launch gaps prioritized, (2) the complete API-key inventory. Plus the Sentry auto-resolution improvements shipped this pass.

---

## 1. Launch Gaps (prioritized)

### 🔴 BLOCKERS — fix before any production deploy
| Gap | Where | Action |
|---|---|---|
| **Committed dev secrets** in `backend/.env` (Supabase, Anthropic, SendGrid, Daily, Stripe test, Sentry token) | `backend/.env` | **Rotate ALL keys**, purge from git history (BFG), keep only `.env.example` with placeholders. |
| **Court dev backdoor** — access code `"123456"` | `app/api/v1/endpoints/court.py:140` | Guarded by `is_production`, but replace with per-professional one-time codes + MFA, or disable the endpoint in prod. |
| **Background workers not launched in prod** — aria_worker, bug_triage_worker, daily_room_cleaner, etc. exist but nothing runs them on Render | `app/worker/*`, `render.yaml` | Add Render Cron/Background Worker services (or a Procfile) for each. **Without this, ARIA jobs + triage never run.** |
| **`render.yaml` has no env vars** (only PORT) | `render.yaml` | Add all 15 required vars in the Render dashboard/blueprint (see §2). Set `ENVIRONMENT=production`, `DEBUG=false`. |
| **No CI** — no `.github/workflows` | repo | Add GitHub Actions: backend `pytest`+lint, frontend `tsc`+Playwright on PRs. |

### 🟠 HIGH — before GA
- **MFA modeled but not enforced** for admins/court professionals (`security.py:269`, `models/user.py`). Enforce TOTP in the court/admin auth path.
- **Fresh-DB migrations broken** — `migration_guards.py` exists to work around drift; test the full chain on an empty DB.
- **DB connection pooling** not tuned for free-tier limits (Supabase 10 / Render) — set `pool_pre_ping`, `pool_recycle=300`, small `max_overflow`; or upgrade Supabase.
- **Redis fail-open**: token revocation + rate limiting silently no-op if Redis is down (`security.py:159`, `rate_limit.py:93`). Need Redis HA or a DB fallback.
- **CORS allows `localhost`** in `ALLOWED_ORIGINS` (`config.py:47`) — make it env-specific for prod.
- **Mux service `NotImplementedError`** (`services/mux.py`) — disable KidSpace theater recording until implemented.
- **aria_jobs dead-letter queue unmonitored** — add a Sentry alert + replay path.
- **Stripe webhooks** lack idempotency-key handling (`endpoints/webhooks.py`).

### 🟡 MEDIUM
- 101 active `console.log` in frontend (esp. `app/messages/call/page.tsx`) — strip/guard for prod.
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

**To turn auto-resolution on:** review a dry-run (`POST /admin/bugs/auto-resolve` or the next cron log), then set `SENTRY_AUTO_RESOLVE_ENABLED=true` on Render.

**Still open (future):** parse culprits → code location → AI-suggested patch/PR; duplicate fingerprint grouping; post-deploy resolution verification; Slack alerts.
