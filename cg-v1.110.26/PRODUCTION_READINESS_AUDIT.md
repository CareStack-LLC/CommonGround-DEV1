# CommonGround v1.110.26 — Production Readiness Audit

**Date:** March 17, 2026
**Verdict: NOT YET PRODUCTION READY — 6 Critical Blockers, 12 High-Severity Issues**

---

## OVERALL SCORE: 65/100

| Category | Score | Notes |
|----------|-------|-------|
| Authentication & Security | 40/100 | OAuth sync vuln, no auth rate limits, debug=True |
| Reporting System | 85/100 | Real data, minor gaps in monthly/ARIA categories |
| Subscription & Feature Gating | 45/100 | UI-only gates, free users can call paid APIs |
| My Circle / KidSpace | 70/100 | Settings enforced but timezone bug, approval gaps |
| Agreement Automation | 60/100 | Creates events but no rolling generator, no birthdays |
| ARIA Monitoring | 80/100 | Strong architecture, minor category gaps |
| ClearFund / Financial | 75/100 | Complete CRUD, 6-month instance limit |
| Court Forms | 30/100 | Workflow tracking only, NO filled PDF output |
| Infrastructure | 50/100 | Sentry not initialized, no audit logging |

---

## CRITICAL BLOCKERS (Must Fix Before Launch)

### 1. OAuth Sync Endpoint — Account Takeover Vulnerability
**File:** `backend/app/api/v1/endpoints/auth.py:245-275`
`POST /auth/oauth/sync` accepts a raw `supabase_id` and issues a JWT without verifying the caller actually owns that Supabase session. Anyone can POST an arbitrary `supabase_id` and get a valid access token for that account.
**Fix:** Require the Supabase `access_token`, call `supabase.auth.get_user(token)` to verify ownership.

### 2. No Rate Limiting on Auth Endpoints
**File:** `backend/app/core/rate_limit.py`
`AUTH_LIMIT = "10/minute"` is defined but never applied to `/auth/login`, `/auth/register`, `/auth/password-reset/request`, or `/auth/magic-link`. Brute-force attacks are trivial.
**Fix:** Add `@limiter.limit(AUTH_LIMIT)` decorators to all auth endpoints.

### 3. Rate Limiter Uses In-Memory Storage
**File:** `backend/app/core/rate_limit.py:49`
`storage_uri="memory://"` — each worker has its own counter. Rate limiting is completely ineffective with multiple Render instances.
**Fix:** Change to `settings.REDIS_URL`.

### 4. Password Reset Token Not Verified
**File:** `backend/app/services/auth.py:453-473`
The `token` parameter is accepted but never passed to Supabase verification. `update_user()` is called without token context.
**Fix:** Implement proper OTP verification flow.

### 5. DEBUG Defaults to True
**File:** `backend/app/core/config.py:22`
If `DEBUG` env var is not explicitly set on Render, the app runs in debug mode exposing stack traces.
**Fix:** Change default to `DEBUG: bool = False`.

### 6. Error Messages Leak Internal Details
**File:** `backend/app/services/auth.py:161-164, 342-345`
Registration and login catch `Exception` and pass `str(e)` directly into HTTP response detail, exposing database errors and stack traces to unauthenticated users.
**Fix:** Use generic error messages.

---

## HIGH SEVERITY (Fix Before or Shortly After Launch)

### 7. Feature Gating Is UI-Only for Consumer Features
**File:** `backend/app/services/feature_gate.py`
Only `parent_video_call` and `parent_voice_call` have backend enforcement. All other paid features (QuickAccords, KidComs, Court Reporting, ClearFund fee exemption, etc.) can be accessed by free-tier users via direct API calls.
**Impact:** Revenue leak — any developer tools or mobile API client bypasses the UI gate.

### 8. No Rolling Instance Generator for Exchanges/Obligations
**File:** `backend/app/services/agreement_activation.py`
Exchange instances are generated 8 weeks ahead. Obligation instances 6 months ahead. There is NO background job to roll these forward. After those windows expire, the calendar and ClearFund go dark.
**Impact:** Core features stop working after initial window expires.

### 9. Court Form PDFs Are Not Generated
**File:** `backend/app/services/court_form.py`
The court form workflow tracks submission states and stores `form_data` as JSON, but there is zero code to fill actual CA court form PDFs (FL-300, FL-311, FL-320, FL-340). The PDF templates exist in `/docs/pdf-court-forms/` but no fill library is used.
**Impact:** The central deliverable of the court workflow feature is missing.

### 10. No JWT Token Blacklisting
**File:** `backend/app/services/auth.py:411-428`
Logout calls `supabase.auth.sign_out()` on the service-role client. Issued JWTs remain valid for their full 30-minute lifetime. Stolen tokens cannot be revoked.

### 11. Birthday Events Silently Skipped
**File:** `backend/app/services/agreement_activation.py:1059-1061`
When processing holiday events, `"birthday" in name` returns `None`, causing birthday events to be silently skipped with only an info log.

### 12. My Circle Time Restrictions Use UTC, Not User Timezone
**Files:** `backend/app/services/circle_call.py:79-85`, `circle_messages.py:124-154`
All time window checks use `datetime.utcnow()`. A parent setting "calls 3pm-7pm" gets UTC enforcement, not local time. No timezone is stored per-family or per-permission.

### 13. Child-Initiated Calls Skip Approval Check
**File:** `backend/app/api/v1/endpoints/kidcoms.py:729-747`
Child-initiated calls to circle contacts check `is_active` but NOT `can_communicate(approval_mode)`. A child can call a contact that hasn't been approved by both parents.

### 14. Sentry Configured But Never Initialized
**File:** `backend/app/core/config.py:110`
`SENTRY_DSN` config exists but `sentry_sdk.init()` is never called. Production errors go only to stdout.

### 15. No User Account Deletion Endpoint
The `User` model has `is_deleted` and `deleted_at` fields but there is no `DELETE /users/me` endpoint. GDPR/CCPA non-compliant.

### 16. Contact Verification Invites Are Stubbed
**File:** `backend/app/api/v1/endpoints/circle.py:545-557`
Token is generated but email/SMS delivery code is `TODO`. Function hardcodes `email_sent = True` without actually sending anything.

### 17. File Uploads Trust Client Content-Type
**File:** `backend/app/services/storage.py:415-444`
`validate_attachment()` only checks the `content_type` string from the client, not file magic bytes. Malicious files can be uploaded with spoofed MIME types.

### 18. Static /uploads/ Mount Has No Auth
**File:** `backend/app/main.py:136`
Files in the local `uploads/` directory are publicly accessible via `GET /uploads/<path>` without authentication.

---

## MEDIUM SEVERITY (Fix Within 30 Days)

### 19. smart_analytics.py Returns Hardcoded Zeros
**File:** `backend/app/api/v1/endpoints/smart_analytics.py:56-57`
`/analytics/custody-time` returns `0.0` for actual custody percentages. Placeholder logic, not connected to real data.

### 20. Monthly Reports Not Persisted
**File:** `backend/app/services/reports/monthly_report_service.py:220`
Monthly reports never call `_persist_report()` — they're not saved to storage and can't be verified via `/verify`.

### 21. Grant Tier Hardcoded to "plus"
**File:** `backend/app/services/feature_gate.py:139`
`get_effective_tier()` returns `"plus"` for all grant users regardless of `granted_plan_code`. A "complete"-tier grant gets Plus features only.

### 22. Password Reset Redirects to Wrong Domain
**File:** `backend/app/services/auth.py:444`
Hardcoded `"https://commonground.app/reset-password"` instead of `settings.FRONTEND_URL`.

### 23. CORS Allows All Methods/Headers
**File:** `backend/app/main.py:58-63`
`allow_methods=["*"]` and `allow_headers=["*"]` — should be restricted to actual methods used.

### 24. Email Verification Not Enforced
`email_verified` field exists but no endpoint checks it before allowing sensitive operations.

### 25. No Delete Endpoint for Schedule Events
Parents cannot remove individual calendar events once created.

### 26. ARIA Nuanced Categories Have No Regex Fallback
Sarcasm, blame, dismissiveness, manipulation, passive-aggressive rely solely on LLM detection. If the ARIA worker is down, these categories are invisible.

### 27. Missing Database Cascades on Legacy Tables
Initial schema `ForeignKeyConstraint` entries lack `ondelete="CASCADE"`. Deleting a FamilyFile could cause FK violations.

### 28. Audit Logging Nearly Absent
`AuditLog` is only written in admin, court, and professional services. No logging for: login, registration, password changes, message sends, export generation.

---

## 20 ADDITIONAL VERIFICATION QUESTIONS

1. **Can a parent actually see the ARIA intervention history for their child's circle calls?** Is there a dedicated UI that shows the timeline of flags, strikes, and terminations?

2. **When the ARIA worker crashes or falls behind, are pending jobs retried?** Is there a dead-letter queue or do failed analysis jobs stay as `status='failed'` forever?

3. **Does the custody time tracker accurately calculate overnights vs daytime hours?** Or does it only track exchange events without actual time computation?

4. **Can both parents edit the same agreement simultaneously without conflicts?** Is there any optimistic locking or versioning on agreement sections?

5. **When a professional requests access to a family file, does the notification actually reach both parents?** Are push notifications and emails both sent?

6. **Is the Stripe webhook endpoint idempotent?** If Stripe retries a `customer.subscription.created` event, does it create duplicate records?

7. **When a message attachment is uploaded, is it scanned for malware?** Or does it go straight to Supabase Storage?

8. **Can a court professional actually download a court-ready export package?** Does the export PDF contain all sections (communications, exchanges, GPS data, financials)?

9. **Is the WebSocket connection properly authenticated?** Can an unauthenticated client connect to the WebSocket and receive real-time updates?

10. **When a parent blocks a circle contact, are all existing scheduled calls cancelled?** Or do they remain on the calendar?

11. **Does the exchange GPS geofence verification actually prevent check-in from incorrect locations?** Or does it just log the location?

12. **Is the KidsCubbie item photo chain-of-custody maintained?** When an item condition photo is uploaded during an exchange, is the timestamp and location captured?

13. **Can two users register with the same email address?** Is there a unique constraint and proper error handling?

14. **When an agreement is deactivated, are the auto-created events and obligations cleaned up?** Or do they persist as orphaned records?

15. **Is the Daily.co video call room properly secured?** Can someone with the room URL join without a valid token?

16. **Are push notification subscriptions cleaned up when a user logs out?** Or do stale subscriptions accumulate?

17. **Does the partner program dashboard show real metrics or synthetic data?** Check if `PartnerMetric` records are actually created from real usage.

18. **When a parent deletes a message, is it actually soft-deleted?** Or does it disappear from the court evidence trail?

19. **Is the Mapbox GPS verification using a reasonable geofence radius?** What tolerance is set for exchange check-in locations?

20. **Can the system handle concurrent ARIA analysis of multiple calls?** Is there proper isolation between call sessions in the violation tracker?

---

## WHAT NEEDS TO HAPPEN FOR 100% PRODUCTION READY

### Phase 1 — Security Critical (1-2 weeks)
1. Fix OAuth sync verification (item 1)
2. Add rate limiting to auth endpoints + switch to Redis storage (items 2, 3)
3. Fix password reset token verification (item 4)
4. Set DEBUG=False default (item 5)
5. Sanitize error messages (item 6)
6. Remove/auth-gate static uploads mount (item 18)

### Phase 2 — Revenue & Core Functionality (2-3 weeks)
7. Add backend feature gate enforcement to all paid endpoints (item 7)
8. Build rolling instance generator (Celery task or cron) for exchanges and obligations (item 8)
9. Fix birthday event creation (item 11)
10. Fix timezone handling in My Circle time restrictions (item 12)
11. Fix child-initiated call approval check (item 13)
12. Fix grant tier hardcoding (item 21)
13. Fix password reset redirect URL (item 22)

### Phase 3 — Compliance & Observability (1-2 weeks)
14. Initialize Sentry (item 14)
15. Add user account deletion endpoint (item 15)
16. Implement contact verification email/SMS delivery (item 16)
17. Implement comprehensive audit logging (item 28)
18. Add JWT blacklisting on logout (item 10)
19. Add file magic byte validation (item 17)

### Phase 4 — Feature Completeness (2-4 weeks)
20. Implement court form PDF filling (item 9) — biggest feature gap
21. Fix smart_analytics placeholder data (item 19)
22. Add monthly report persistence (item 20)
23. Add schedule event deletion endpoint (item 25)
24. Add database cascade constraints to legacy tables (item 27)
25. Enforce email verification on sensitive operations (item 24)

### Phase 5 — Polish & Hardening (1 week)
26. Tighten CORS (item 23)
27. Add ARIA regex fallback for nuanced categories (item 26)
28. Add Redis health check to /health endpoint
29. Add request ID tracing middleware
30. Consolidate JWT secret key configuration

---

## ESTIMATED TIMELINE TO 100% PRODUCTION READY

| Phase | Duration | Blockers Resolved |
|-------|----------|-------------------|
| Phase 1 (Security) | 1-2 weeks | 6 critical blockers |
| Phase 2 (Core) | 2-3 weeks | 7 high-severity issues |
| Phase 3 (Compliance) | 1-2 weeks | 5 high-severity issues |
| Phase 4 (Features) | 2-4 weeks | 6 medium-severity issues |
| Phase 5 (Polish) | 1 week | 5 nice-to-haves |

**Total: 7-12 weeks to fully production-ready**
**Minimum viable launch: 3-4 weeks (Phase 1 + critical items from Phase 2)**

---

## WHAT WORKS WELL (Production Strengths)

- **Reporting system** — All 5 parent report types use 100% real DB data, zero mocks
- **ARIA text analysis** — Hybrid regex+LLM pipeline is solid, 14 toxicity categories
- **ARIA call monitoring** — 3-strike system with SELECT FOR UPDATE locking, court-ready reports
- **ARIA child safety** — All circle conversations monitored and flagged
- **Professional portal** — Proper tier gating with FastAPI dependencies
- **Stripe integration** — Real, not stubbed. Full subscription lifecycle handled
- **Recording audit trail** — Legal hold, chain of custody, evidence export all implemented
- **Agreement activation** — Creates exchanges, obligations, holidays, activity events
- **Verify endpoint** — Works with real data, SHA-256 hash verification
- **Kids event creation** — Full end-to-end, events appear on shared parent calendar
