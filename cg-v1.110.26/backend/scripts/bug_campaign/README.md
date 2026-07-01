# AI-Agent Bug Campaign — Custody Tracker & GPS Handoff

AI agents that drive the **real parent API** as synthetic families, independently
recompute the expected results (the **Oracle**), and auto-file mismatches as bugs
into the existing bug-hunt dashboard. Proves the custody tracker reports correctly
and the Mapbox/GPS Silent Handoff stores **accurate** data.

Plan: `/Users/tj/.claude/plans/that-worked-now-we-serene-jellyfish.md`

## How it proves accuracy
`geo_oracle.py` is an independent mirror of `app/services/geolocation.py`. For every
GPS check-in the harness recomputes the Haversine distance + geofence membership and
asserts the API's stored `*_distance_meters` / `*_in_geofence` match within 1 m, that
custody flips to the receiving parent on completion, and that reports are internally
consistent. A failed assertion is, by construction, a real bug.

## Setup
Run from `backend/` in the venv. Requires `httpx` (installed) and optionally
`anthropic` (AI degrades gracefully if missing).

```bash
export CAMPAIGN_BASE_URL="https://commonground-api-a0fr.onrender.com"   # or http://localhost:8000
export CAMPAIGN_ENV="production"                 # development | staging | production
export CAMPAIGN_ALLOW_PRODUCTION="true"          # required prod gate #2
export CAMPAIGN_FAMILY_COUNT="4"                 # <= 6 on prod
export CAMPAIGN_ADMIN_EMAIL="<superadmin email>" # creates cohort + seeds families
export CAMPAIGN_ADMIN_PASSWORD="<superadmin pw>"
export ANTHROPIC_API_KEY="<key>"                 # optional (AI narrator/judge/rollup)
```

## Commands
```bash
python -m scripts.bug_campaign.run --check                          # offline: list scenarios
python -m scripts.bug_campaign.run --mode smoke --confirm-production # 1 family, S-GEO-01, real ingestion
python -m scripts.bug_campaign.run --mode fast  --confirm-production # full 13-scenario matrix, all families
python -m scripts.bug_campaign.run --mode soak  --confirm-production # one campaign day (schedule via launchd/cron)
python -m scripts.bug_campaign.run --teardown   --confirm-production # delete cohort + seeded Supabase users
```
`--dry-run` runs scenarios + Oracle but posts nothing to the dashboard.
Prod requires all three gates: `CAMPAIGN_ENV=production` + `CAMPAIGN_ALLOW_PRODUCTION=true` + `--confirm-production`.

## Reading results
- **Ground truth:** `state/ledger.jsonl` — every assertion with expected vs actual.
- **Human view:** `superadmin/bug-hunts/[id]` (bugs / notes / feedback) + the AI overview.

## 14-day soak (schedule)
Run `--mode soak` a few times/day (e.g. launchd/cron at 09:00/13:00/17:00). Each run is
idempotent (`day:family:scenario`). Day 7 auto-refreshes the tester tokens (7-day expiry).

## Backend dependency
Requires the superadmin `assign-tester` / `resend` endpoints to return `access_token`
(added in `app/api/v1/endpoints/admin.py`) so the harness can retrieve the token without
the emailed magic link. Deploy that change before running against prod.
```
