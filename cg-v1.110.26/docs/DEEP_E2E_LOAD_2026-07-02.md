# Deep E2E + Load Test Findings — 2026-07-02

Deeper than the prior verification: real end-user flows + a load test to answer
"will it break when people start using it?" **Headline: functionally it works;
under load it will not — the app is slow even unloaded because compute and
database are on opposite coasts. That is the #1 thing to fix before real users.**

New repeatable harnesses added: `scripts/load_test.py`, `scripts/deep_verify.py`
(both prod-safe, reusable over time).

---

## 1. LOAD / PERFORMANCE — the blocker

### What broke, and the fix already shipped
- First load run: the API returned hard **HTTP 503s at ~30 concurrent users.**
  Root cause was `--limit-concurrency 20` in the Dockerfile (2 workers ≈ 40
  in-flight max, everything else rejected). **Fixed → 120/worker, deployed.**
- After the fix: no more 503s, but the real ceiling showed through — at 50
  concurrent, **p50 6.5s, p95 11s, throughput ~10 req/s.** Raising the cap turned
  hard rejections into severe slowness. The server genuinely can't process much
  concurrency.

### Why it's slow — measured, not guessed
Baseline latency with **zero load, one request at a time:**

| Route | Latency | What it does |
|---|---|---|
| raw TCP connect | 17 ms | network is fine |
| `/` (static JSON) | 147 ms | app overhead, no I/O |
| `/health` | **1,103 ms** | one DB check + one Redis check |
| `/users/me/profile` | ~1,300 ms | auth + 1 query |
| `/dashboard/summary` | ~2,400 ms | aggregates many queries |
| `/exchanges/case/{id}/upcoming` | ~3,850 ms | heavy query |

`/health` doing almost nothing takes **1.1 s** — that ~950 ms is DB + Redis
round-trips, and **every authenticated request pays it before its own query.**

### Root cause: compute and data are on opposite coasts
- **Render app → Oregon (us-west)**
- **Supabase DB → `aws-1-us-east-1` (us-east)** — ~3,000 miles / ~60-80 ms each way
- Compounded by `pool_pre_ping=True` (a `SELECT 1` round-trip before *every*
  query) and the rate limiter's per-request Redis (Upstash) call.

Every DB round-trip crosses the country; multi-query endpoints multiply it into
seconds. **This is the dominant cause of both the slowness and the low
concurrency ceiling.**

### Verdict
Current real capacity ≈ **10 req/s, a few dozen concurrent users** before it
degrades badly. It will NOT carry 300 users. Fixes, by leverage:
1. **Co-locate compute + DB in one region** (move Render to us-east near Supabase,
   or move Supabase/Upstash to us-west). Biggest single win — cuts the per-query
   cross-country latency that's on every request. *(Infra change — recreating a
   Render service in a new region gives a new URL; a decision for you.)*
2. Cut per-request round-trips: reconsider `pool_pre_ping`, cache/short-circuit
   the rate-limiter Redis call, add response caching on hot reads (dashboard).
3. Profile & fix the heavy queries (`dashboard/summary`, `exchanges/upcoming` —
   likely N+1s).
4. Then scale out: `numInstances` is 1 (render.yaml intends 2), raise DB pool to
   match concurrency, and re-run `scripts/load_test.py` to confirm.

---

## 2. DEEP FUNCTIONAL E2E — what works (verified live)

| Check | Result | Evidence |
|---|---|---|
| Safe message NOT flagged by ARIA | ✅ | `/messages/analyze` → flagged=false, score 0.0 |
| Hostile message IS flagged + rewrite | ✅ | flagged=true, score 0.595 |
| **My Circle contact message monitored by ARIA** | ✅ | `/circle-messages/analyze` → flagged=true, score **0.92**, categories [inappropriate_language, hostility, bullying] |
| Paid-feature entitlement gating | ✅ | free-tier KidComs create → 403 "Upgrade to Complete" (correct) |
| **Frontend end-user flow (live site)** | ✅ | Playwright: real register → UI login → all 10 parent pages, no 5xx / error boundary (slow ~2s/page but works) |

### Needs attention (functional)
- **Severe-threat preview scored 0.0.** `/messages/analyze` flagged an explicit
  threat ("...make you regret this, you will be sorry") as **not toxic (0.0)**,
  while a milder hostile message scored 0.595. The *enforcement* path (send →
  HTTP 403 Safety Shield) is separately verified by the bug-campaign, so threats
  ARE blocked on send — but the compose-time **preview** isn't warning on threats,
  which is a safety-UX gap. Needs a threshold/category review.
- **Daily room create/teardown not exercised live.** Entitlement gating correctly
  blocked the free-tier test account, so the actual room lifecycle needs a
  **Complete-tier seed account**. The code path (create room → `end` → delete room
  + status=completed, plus a 15-min scheduler sweep for abandoned rooms) is
  mapped and unit-tested; recommend seeding one paid test family to verify live.

---

## 3. GPS / CUSTODY / EXPORTS — bug-campaign oracle

The bug-campaign's `geo_oracle.py` is an independent re-implementation of the
geofence math: for every GPS check-in it recomputes the Haversine distance and
geofence membership and asserts the API's stored `*_distance_meters` /
`*_in_geofence` match within 1 metre, that custody flips to the receiving parent
on completion, and that reports reconcile. A failed assertion is, by
construction, a real bug — this is the strongest GPS evidence available.

**Evidence (most recent verified runs):**
- **GPS geofence accuracy** — GEO scenarios S-GEO-01..08 passed with the oracle
  matching stored distance/geofence to within 1 m: inside-geofence completes,
  just-outside handled, low-accuracy rescued by the buffer, way-outside fails,
  one-parent + mixed-source (QR + GPS) paths. Dropoff location + distance stored
  and independently re-verified. (Full 27-scenario matrix, last green run.)
- **Check-in-enabled events + custody flip** — exchange check-in flips custody to
  the receiving parent; the custody-time stats reconcile against the actual
  check-ins (custody soak).
- **Custody soak (today, day 2, PROD)** — `S-CUSTODY-SOAK` **PASSED**: multi-day
  cumulative custody accuracy held; now runs 3×/day as the `commonground-custody-soak`
  Render cron (laptop-independent).
- Known review items from the campaign judge (advisory, not accuracy failures):
  a handoff-completion response omitting GPS/proximity echo on one path, and the
  geocode "exact" label on city-centroid results — worth tightening.

**Fresh full run completed this session (2026-07-02, PROD, 2 families): 27/27
scenarios PASSED, 0 failures.** Notably S-RPT-01 (custody report reconciliation)
and S-SCHED-01 (custody flip) — flaky in the July 1 runs — are now green:

- GPS/geofence: S-GEO-01..08 ✅ (inside, just-outside, low-accuracy buffer,
  accuracy cap, way-outside, one-parent, mixed QR+GPS) — oracle matched stored
  distance/geofence to 1 m.
- Check-in → custody flip + stats: S-SCHED-01 ✅ · report reconciliation S-RPT-01 ✅
- ARIA: tone triage S-ARIA-01 ✅ · **threat intercepted on send S-ARIA-03 ✅**
- Court export SHA-256 integrity S-EXP-01 ✅ · cross-family isolation S-SEC-01 ✅
- Agreements, ClearFund split+funding, onboarding, wallet, dashboard,
  notifications, calendar, geocoding — all ✅

19 advisory notes were filed against otherwise-passing scenarios (6 high / 9 med
/ 4 low) — API-quality observations, not functional breakage. The recurring high
one: the handoff-completion **response** doesn't echo GPS coordinates/proximity
(the data IS stored correctly — that's what the oracle verifies — the response
just doesn't return it). Worth adding to the response for client-side proof.

Note the per-scenario durations (20-70s each) — a direct symptom of the §1
cross-region latency.

---

## 4. SECURITY

- **X-Forwarded-For rate-limit bypass** (`rate_limit._get_client_ip` trusts the
  client-controlled leftmost XFF). Anyone can bypass all per-IP rate limits + IP
  bans by spoofing the header. Spawned as a tracked fix (needs care — a wrong fix
  could throttle all users as one; verify Render's proxy behavior first).

---

## 5. Bottom line for launch

- **Functionally**, the core safety mechanisms work: ARIA flags hostile parent
  and circle messages, entitlement gating holds, and the real frontend works
  end-to-end for a user.
- **Operationally**, it will fall over under real concurrent use until the
  region split is fixed. For a **tiny hand-picked beta (a handful of families,
  not concurrent)** it's usable today. For anything resembling 50+ concurrent
  users, fix the region co-location first — it's the single highest-leverage
  change and everything else (query tuning, caching, scaling) builds on it.
