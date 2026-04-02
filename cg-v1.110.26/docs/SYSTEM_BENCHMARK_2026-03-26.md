# CommonGround System Benchmark — Bug Hunt Baseline

**Snapshot Date:** March 26, 2026 at 16:42 UTC
**Purpose:** Pre-bug-hunt baseline. Compare against post-hunt snapshot to measure regression/improvement.
**Bug Hunt:** CG Bug Hunter (5 families, 10 test accounts, 30-item checklist)
**Testing Period:** March 26 – April 23, 2026 (4 weeks)

---

## 1. System Health Status

| Component | Status | Notes |
|-----------|--------|-------|
| **API** | Healthy | FastAPI on Render |
| **Database** | Healthy | PostgreSQL on Supabase |
| **Redis** | Healthy | Upstash (FIXED this session — was broken since Mar 20) |
| **Overall** | Healthy | All 3 checks passing |

### Infrastructure

| Service | Provider | URL |
|---------|----------|-----|
| Backend | Render | commonground-api-a0fr.onrender.com |
| Frontend | Vercel | find-commonground.com |
| Database | Supabase | PostgreSQL 15 |
| Redis | Upstash | quick-puma-84480.upstash.io |
| Payments | Stripe | Connected |
| Video | Daily.co | Connected |
| AI | Anthropic Claude | claude-sonnet-4-5-20250514 |

---

## 2. Platform Metrics

| Metric | Value |
|--------|-------|
| Total users | 11 (10 parents + 1 admin) |
| Active family files | 6 |
| Active subscriptions | 6 (4 Plus @ $17.99, 2 Complete @ $34.99) |
| Estimated MRR | $141.94 |
| Professional accounts | 0 |
| Messages (7d) | 5 |
| ARIA interventions (7d) | 0 |
| Audit log entries | 89 |

### Bug Hunt Test Accounts

| Family | Config | Tier |
|--------|--------|------|
| Martinez & Rivera (Emma) | Good faith | Web Starter |
| Chen & Patel (Olivia, Noah) | Co-operative | Plus |
| Williams & Thompson (Ava) | Comprehensive | Complete |
| Davis & Miller (Sophia, Mason) | Good faith | Web Starter |
| Wilson & Moore (Isabella) | Co-operative | Plus |

---

## 3. API Performance Baseline (Authenticated)

Tested with admin token. 3 runs per endpoint.

| Endpoint | Run 1 | Run 2 | Run 3 | HTTP | Assessment |
|----------|-------|-------|-------|------|------------|
| `GET /health` | 1.48s | 1.08s | 1.04s | 200 | OK — includes DB+Redis ping |
| `GET /` (root) | 0.22s | 0.20s | 0.22s | 200 | Fast |
| `GET /api/v1/admin/health` | 2.30s | 2.75s | 2.30s | 200 | SLOW |
| `GET /api/v1/admin/dashboard` | 4.16s | 3.89s | 4.16s | 200 | SLOW |
| `GET /api/v1/family-files/` | 2.31s | 2.00s | 2.31s | 200 | SLOW |
| `GET /api/v1/subscriptions/current` | 1.86s | 1.46s | 1.86s | 200 | Borderline |
| `GET /api/v1/subscriptions/features` | 1.80s | 1.38s | 1.80s | 200 | Borderline |
| `GET /api/v1/auth/me` | 1.93s | **136.4s** | 1.93s | 200 | CRITICAL — connection pool spike |
| `GET /api/v1/admin/inbox/stats` | 2.36s | 2.23s | 2.36s | 200 | SLOW |
| `GET /api/v1/dashboard/summary/{ff_id}` | 3.70s | 3.84s | 4.01s | 200 | SLOW |

### Latency Targets for Post-Hunt Comparison

| Tier | Current Range | Target |
|------|---------------|--------|
| Fast (unauth) | 200-300ms | < 500ms |
| Auth overhead | ~1.5s | < 500ms |
| Standard authenticated | 1.5-2.5s | < 1s |
| Dashboard/aggregation | 3-5s | < 2s |
| Admin heavy | 4-5s | < 3s |

---

## 4. Sentry Error Baseline

**Period:** March 19-26, 2026 (7 days)

### Summary

| Metric | Value |
|--------|-------|
| Total unresolved issues | 100 |
| Total error events | 13,863 |
| Users affected | 203 |
| Unhandled exceptions | 7 |
| Critical issues (unhandled + >10 users) | 0 |
| High issues (>5 users or >50 events) | 15 |

### Error Volume Trend

```
2026-03-20:    126  ██
2026-03-21:    680  █████████
2026-03-22:    507  ███████
2026-03-23:    929  ████████████
2026-03-24:  2,826  █████████████████████████████████████
2026-03-25:  3,379  ████████████████████████████████████████████
2026-03-26:  3,877  ██████████████████████████████████████████████████
```

**Note:** The spike from Mar 24-26 is primarily from Redis being down (6,664 events). This was fixed during this session. Expect daily errors to drop to ~200-400/day within 24 hours.

### Top 20 Issues at Snapshot Time

| # | Events | Users | Issue | Unhandled | Status |
|---|--------|-------|-------|-----------|--------|
| 1 | 6,664 | 2 | Redis unavailable during token blacklist check | No | **FIXED** (Redis connected to Upstash) |
| 2 | 1,517 | 4 | Stripe: "thin event notification" to Webhook.construct_event | No | OPEN — Stripe webhook config issue |
| 3 | 1,517 | 4 | ValueError: thin event notification | No | OPEN — duplicate of #2 |
| 4 | 839 | 4 | Token verification failed: 401 | No | OPEN — expired/invalid JWT tokens |
| 5 | 824 | 4 | HTTPException: Could not validate credentials | No | OPEN — duplicate of #4 |
| 6 | 401 | 16 | request_completed logging error | No | OPEN — logging format issue |
| 7 | 236 | 4 | Stripe SignatureVerificationError | No | OPEN — webhook secret mismatch |
| 8 | 235 | 4 | Webhook handler: signature mismatch | No | OPEN — duplicate of #7 |
| 9 | 209 | 3 | DBAPIError: asyncpg connection error | **Yes** | OPEN — DB connection pool issue |
| 10 | 118 | 2 | RuntimeError: generator didn't stop | **Yes** | OPEN — async generator issue |
| 11 | 107 | 2 | Stripe: No such customer 'cus_UCpxdnyV...' | No | OPEN — stale customer ref |
| 12 | 91 | 3 | Anthropic BadRequestError 400 | **Yes** | OPEN — AI request issue |
| 13 | 61 | 7 | Failed proactive Stripe sync | No | OPEN — Stripe SDK issue |
| 14 | 61 | 7 | AttributeError: get (Stripe) | No | OPEN — Stripe SDK v14 compat |
| 15 | 47 | 1 | Consecutive DB Queries (N+1) | No | INFO — performance warning |
| 16 | 44 | 1 | Stripe authentication failed | No | OPEN — intermittent key issue |
| 17 | 40 | 9 | Anthropic BadRequestError 400 | **Yes** | OPEN — AI token limit |
| 18 | 37 | 4 | Stripe: No such customer 'cus_UD1jph63...' | No | OPEN — stale customer ref |
| 19 | 32 | 2 | Email analysis failed (Anthropic 400) | No | OPEN — AI email analysis |
| 20 | 28 | 2 | Traceback in logs | No | OPEN — needs investigation |

### Issues by Category

| Category | Count | Events | Root Cause |
|----------|-------|--------|------------|
| **Redis** | 1 | 6,664 | **FIXED** — connected Upstash |
| **Stripe webhooks** | 4 | 3,505 | Webhook config: thin events + signature mismatch |
| **Stripe SDK** | 4 | 310 | SDK v14 compatibility + stale customer refs |
| **Auth/JWT** | 2 | 1,663 | Expired tokens, expected behavior |
| **Database** | 2 | 256 | Connection pool exhaustion (asyncpg) |
| **AI/Anthropic** | 3 | 163 | BadRequestError 400 — token limits or malformed |
| **Other** | 4 | 302 | Logging, async generators, misc |

---

## 5. Sentry Performance Baseline (7-Day)

### API Endpoints — Top 25 by Volume

| # | Endpoint | Requests | p75 | p95 | Fail% | Flag |
|---|----------|----------|-----|-----|-------|------|
| 1 | health_check | 36,588 | 833ms | 994ms | 0.0% | OK |
| 2 | admin.get_platform_health | 3,233 | 2.3s | 3.4s | 61.8% | SLOW + FAILING |
| 3 | middleware GET | 1,869 | 153ms | 421ms | 0.0% | OK |
| 4 | AsyncExitStackMiddleware | 844 | 1.3s | **743s** | 57.5% | CRITICAL |
| 5 | webhook.handle_stripe_webhook | 548 | 17ms | 1.4s | 86.5% | FAILING |
| 6 | kidcoms.get_incoming_calls | 482 | 1.0s | 1.2s | 49.4% | FAILING |
| 7 | admin_inbox.get_inbox_stats | 337 | 3.3s | 4.7s | 36.8% | SLOW + FAILING |
| 8 | subscriptions.get_current | 311 | 2.8s | 4.5s | 10.3% | SLOW + FAILING |
| 9 | admin.get_current_bugs | 294 | 3.7s | 4.6s | 0.7% | SLOW |
| 10 | family_files.list | 293 | 2.9s | 3.7s | 4.1% | SLOW |
| 11 | subscriptions.list_features | 267 | 2.8s | 4.3s | 12.7% | SLOW + FAILING |
| 12 | admin.get_admin_dashboard | 255 | 5.3s | 6.7s | 34.9% | VERY SLOW + FAILING |
| 13 | admin.get_growth_stats | 249 | 3.1s | 4.7s | 33.7% | SLOW + FAILING |
| 14 | activities.get_unread_count | 222 | 2.6s | 4.2s | 0.0% | SLOW |
| 15 | users.get_user_profile | 197 | 2.5s | 3.1s | 0.5% | SLOW |
| 16 | auth.get_current_user_info | 186 | 1.7s | 2.2s | 24.7% | SLOW + FAILING |
| 17 | partners.get_my_partner_access | 163 | 2.5s | 3.3s | 0.6% | SLOW |
| 18 | admin.get_ai_summary | 127 | 4.7s | 5.8s | 37.8% | VERY SLOW + FAILING |
| 19 | RateLimitMiddleware | 105 | 464ms | 986ms | 96.2% | FAILING (expected — 429s) |
| 20 | family_files.list_agreements | 98 | 2.9s | 4.0s | 1.0% | SLOW |

**20 of 25 top endpoints exceed 2-second p95 latency.**
**13 of 25 top endpoints have >5% failure rate.**

### Slowest Transactions (p95)

| Transaction | p95 | Notes |
|-------------|-----|-------|
| AsyncExitStackMiddleware | 743s | Connection pool exhaustion |
| POST /api/help-chat | 398s | Stuck query |
| admin_leads.generate_landing_page | 53s | AI generation |
| blog.generate_blog_post | 51s | AI generation |
| admin.generate_bug_hunt_data | 36s | AI generation |
| /wallet | 28s | Payment queries |
| /agreements/:id | 22s | Complex joins |
| /dashboard | 19s | Aggregation |
| admin.run_bug_triage | 17s | Sentry + AI pipeline |

---

## 6. Known Issues at Baseline

### FIXED During This Session
- [x] **Redis disconnected** — Connected Upstash via `REDIS_URL` env var on Render. Token blacklisting and rate limiting now functional.

### Active Issues Requiring Fixes

#### P0 — Critical
1. **DB connection pool exhaustion** — AsyncExitStack p95 of 743s indicates connections aren't being returned. Causes cascading slowness and the 136s auth/me spike.
2. **Stripe webhook misconfigured** — 86.5% failure rate. Receiving "thin event notifications" instead of full events. Webhook signing secret may also be wrong.

#### P1 — High
3. **Redis connection not pooled** — Every authenticated request creates a new TLS connection to Upstash via `redis.from_url()`. Adds ~0.5-1s overhead to all auth'd requests.
4. **Stripe SDK v14 compatibility** — `AttributeError: get` on Stripe Account objects (61 events, 7 users).
5. **Admin dashboard 62% failure rate** — `get_platform_health` polled constantly, failing majority of the time.
6. **Anthropic API 400 errors** — 131 events across 3 issues. Likely hitting token limits or sending malformed requests.

#### P2 — Medium
7. **All authenticated endpoints >1.5s** — General auth + DB overhead makes every endpoint slow.
8. **N+1 query warnings** — "Consecutive DB Queries" info events from Sentry performance monitoring.
9. **Stale Stripe customer references** — 144 events referencing customers that no longer exist.
10. **KidComs incoming calls 49.4% failure** — Needs investigation.

---

## 7. Rate Limits

| Category | Limit | Paths |
|----------|-------|-------|
| Auth | 10 req/min per IP | login, register, password reset |
| Payments | 10 req/min per IP | /wallet, /payment, /stripe, /subscription |
| Exports | 5 req/min per IP | /export, /report, /download-report |
| Uploads | 10 req/min per IP | /upload, /attachment |
| General | 100 req/min per IP | Everything else |

Rate limiter is in-memory (not Redis-dependent). The 96.2% "failure rate" in Sentry is expected — it means rate limiting is working and returning 429 responses.

---

## 8. How to Run Post-Hunt Comparison

After the 4-week bug hunt, run the same audit to compare:

```bash
# From the backend directory, or use the Sentry audit script:
# 1. Check health
curl https://commonground-api-a0fr.onrender.com/health

# 2. Run authenticated endpoint tests (get fresh admin token first)
# Test each endpoint from Section 3 above, 3 runs each

# 3. Compare Sentry metrics
# - Total unresolved issues (baseline: 100)
# - Total error events 7d (baseline: 13,863)
# - Users affected (baseline: 203)
# - Daily error rate (baseline: 3,877/day, expected to drop to ~300/day)
# - p95 latency per endpoint
# - Failure rates per endpoint

# 4. Compare platform metrics
# - Total users, active users, MRR
# - Messages sent, ARIA interventions
```

### Success Criteria

| Metric | Baseline | Good | Great |
|--------|----------|------|-------|
| Daily errors | 3,877 | < 500 | < 100 |
| Unresolved issues | 100 | < 50 | < 20 |
| Auth'd endpoint p95 | 2-5s | < 1.5s | < 800ms |
| Dashboard p95 | 3.8s | < 2s | < 1s |
| Endpoints >5% failure | 13 | < 5 | 0 |
| Redis status | Healthy | Healthy | Healthy |
| Connection pool spikes | Yes (136s) | None | None |

---

*Generated by Claude Code — Sentry org: commonground-s0, project: commonground*
