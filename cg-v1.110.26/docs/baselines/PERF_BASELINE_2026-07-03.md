# Performance Baseline — 2026-07-03

Captured post-cutover (Virginia co-located API + Supabase), via
`scripts/perf_gate.py` against the live production domain
`https://api.find-commonground.com`. Two consecutive runs, both clean.

**Important finding while capturing this:** the old Oregon service
(`commonground-api-a0fr.onrender.com`) — which `CAMPAIGN_BASE_URL` and
`scripts/perf_gate.py`'s hardcoded default both still point to — now
returns **503**. The cutover to Virginia is live; monitoring scripts need
their base URL updated to `https://api.find-commonground.com` (tracked
below).

## Latency (best-of-3, ms) — 2 consecutive runs

| Endpoint | Run 1 | Run 2 | Old threshold (pre-colocation headroom) |
|---|---|---|---|
| `/health` | 156 | — | 2000 |
| `/` (root) | 112 | — | 600 |
| `/users/me/profile` | 131 | — | 2500 |
| `/family-files/` | 150 | — | 3500 |
| `/users/me/notifications` | 131 | — | 2500 |
| `/dashboard/summary/{ffid}` | 229 | — | 4500 |
| `/exchanges/case/{ffid}/upcoming` | 167 | — | 5500 |

All requests: HTTP 200, 0 regressions, 0 errors.

Compare to the pre-cutover cross-region baseline (2026-07-02, Oregon app ↔
us-east DB): dashboard 2090ms → **229ms** (9x), exchanges 3174ms → **167ms**
(19x), health 938ms → **156ms** (6x). The existing `perf_gate.py` thresholds
were deliberately loose ("headroom over the cross-region baseline... tighten
after co-location") — they are now 10-30x looser than actual performance and
should be tightened to catch real regressions.

## Not captured: concurrency / throughput ceiling

`scripts/load_test.py`'s 500-VU ramp relies on spoofing `X-Forwarded-For` per
request to get the rate limiter to treat each request as a distinct client.
That bypass was intentionally fixed (see rate-limit XFF fix, `TRUSTED_PROXY_HOPS`)
so a single-machine run now mostly produces 429s instead of a clean signal —
it needs distributed load generation (multiple real source IPs) to produce a
trustworthy capacity number post-fix. Not run here; flagged as a follow-up if
a real concurrency ceiling is wanted.

## Recommended follow-ups

1. Point `CAMPAIGN_BASE_URL` (campaign.env) and `perf_gate.py`'s hardcoded
   default at `https://api.find-commonground.com`, not the dead Oregon URL.
2. Tighten `perf_gate.py` CHECKS thresholds now that co-location is proven
   (e.g. health 2000→400, dashboard 4500→800, exchanges 5500→800) so the
   3-hourly cron actually catches regressions instead of only catastrophic ones.
3. If a real concurrency ceiling is wanted, run `load_test.py` from multiple
   source IPs (or a distributed load tool) rather than one machine.
