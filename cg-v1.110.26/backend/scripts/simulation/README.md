# Two-Week Family Simulation — Ops Runbook

Runs the platform like a real user base for 14 consecutive days: ~50 scripted
families (~100 parents) living out coherent co-parenting lives — messages,
custody exchanges with GPS check-ins, TimeBridge events + RSVPs, expenses and
child support — with a daily expected-vs-actual system report.

**Authoritative design:** `docs/SIMULATION_2WEEK.md`
**NO-FIX POLICY:** failures become report lines, never aborts. Nothing gets
fixed until day 15; the cumulative drift log in the daily report is the fix-list.

## Layout

| File | Role |
|---|---|
| `config.py` | `SimConfig` on top of the campaign config (same prod gates) |
| `archetypes.py` | archetype tables + deterministic assignment (seed 42) |
| `family_bible.py` | per-family persistent story (seed 1000+i) |
| `timeline.py` | compiles the 14-day per-family action script (seed 2000+i) |
| `messages.py` | AI message generation (Claude Haiku) + template fallback |
| `runner.py` | daily driver: seeds/recovers cohort, executes a day, ledgers everything |
| `report.py` | daily report (5 sections) → `state/sim_reports/day_NN.{md,json}` |
| `run.py` | CLI (`--mode seed|day|report`) |
| `selftest.py` | offline determinism + expected-count matrix (no network) |

Reused from `scripts/bug_campaign`: `client.ParentAgentClient` (+ small
additive simulation wrappers at the end of the class), `admin_client`,
`config.load_config` (production gates), `ledger`, `ai.anthropic_client`,
`geo_oracle`, `custody_oracle`.

## Environment variables

Same campaign vars as the bug campaign, plus SIM_*:

```bash
# target + gates (reused verbatim from the campaign)
CAMPAIGN_BASE_URL=https://commonground-api-a0fr.onrender.com
CAMPAIGN_ENV=production            # + CAMPAIGN_ALLOW_PRODUCTION=true + --confirm-production
CAMPAIGN_ALLOW_PRODUCTION=true
CAMPAIGN_ADMIN_EMAIL=...           # superadmin login (cohort create/read)
CAMPAIGN_ADMIN_PASSWORD=...
CAMPAIGN_REQ_DELAY_MS=150          # per-request pacing (rate-limit cushion)
ANTHROPIC_API_KEY=...              # optional; template fallback without it
CAMPAIGN_AI_BUDGET=200000          # daily token cap for message generation

# simulation-specific
SIM_START_DATE=2026-07-06          # ISO; optional — defaults to seed day, recoverable
SIM_FAMILY_COUNT=50
SIM_COHORT_NAME="Family Simulation — 14-Day Run"   # exact-match server recovery key
SIM_ACTION_DELAY_MS=250            # extra pacing between simulated actions
```

## How to seed (day 1)

```bash
cd backend
.venv/bin/python -m scripts.simulation.run --mode seed --confirm-production
```

Creates the cohort (exact name `SIM_COHORT_NAME`), server-seeds 50 families
with parent credentials, then runs the day-1 script per family: SharedCare
agreement (v2_lite, sections auto-completed, submitted, dual-approved),
recurring exchange templates per custody pattern, initial TimeBridge events,
recurring child-support obligations, intro messages. Finishes with the day-1
report. Seeding is idempotent — reruns skip what already exists.

## The daily cron (days 2–14)

`render.yaml` defines cron `commonground-family-sim`
(`python -m scripts.simulation.run --mode day --confirm-production`,
daily 15:00 UTC). Set the CAMPAIGN_* + SIM_* env vars on that service (or link
the shared Environment Group) in the Render dashboard.

Stateless-safe: the cron filesystem is ephemeral, so each run recovers the
cohort from the server by exact name, derives the day as
`(today − SIM_START_DATE) + 1` (clamped 1..14), and tags every action with
`sim:{day}:{family_id}:{action_index}`. A missed or re-run day is harmless:
already-done actions are skipped when local state survives, and 4xx conflicts
are tolerated when it doesn't.

Timing note: every simulated exchange slot is scheduled 15:40 UTC with a
±120 min check-in window so the 15:00 UTC cron physically lands inside the
window. The narrative local times ("Fri 18:00") live in the exchange titles.

## Pulling the daily report

Reports land in `backend/scripts/bug_campaign/state/sim_reports/day_NN.md`
(+ `.json`) on the cron instance. To regenerate locally from the ledger:

```bash
.venv/bin/python -m scripts.simulation.run --mode report --day 6 --confirm-production
# or without API cross-checks:
.venv/bin/python -m scripts.simulation.run --mode report --day 6 --offline
```

Report sections: (1) scorecard expected-vs-actual, (2) per-endpoint p50/p95 +
errors, (3) ARIA quality sample incl. scripted-hostile that did NOT flag,
(4) custody-math spot-checks for 5 rotating families vs the shadow ledger,
(5) cumulative drift log.

## Day-15 analysis procedure

1. Collect `day_01..day_14` reports (md + json) and `state/ledger.jsonl`.
2. Start from the **day-14 drift log** — it is cumulative and IS the fix-list.
3. For each drift class, pull the ledger lines (`type=sim_action`, filter by
   `drift`) for exact request context and reproduce manually.
4. Compare week-1 vs week-2 ARIA behavior for the 5 `escalating` families
   (trend detection) and the flag-miss list for `hostile` families.
5. Verify custody stats for the spot-checked families against
   `custody_oracle.ShadowLedger` replays before filing platform bugs.
6. File bugs; only then fix. Tear down by deleting the cohort
   (`AdminClient.delete_cohort`) once analysis is complete.

## Offline verification

```bash
.venv/bin/python -m scripts.simulation.selftest   # no network, no DB
```

Asserts two compilations are identical and prints the per-archetype action
matrix plus 14-day expected totals (exchanges due, scripted misses, expected
ARIA flags, ...). Run it after ANY change to archetypes/bible/timeline —
changing compiled scripts mid-run corrupts expected-vs-actual comparisons.

## Report persistence on Render crons

The cron filesystem is ephemeral, so `state/sim_reports/` and `state/ledger.jsonl`
do NOT survive between daily runs. Two mechanisms make the data durable anyway:

1. **Every daily report is dumped in full to stdout** between
   `===== SIM DAY NN REPORT BEGIN/END =====` markers — Render keeps cron logs,
   so pull any day's report from the Render dashboard or
   `render logs <cron-service-id>`.
2. **Cross-day drift is server-sourced**: the exchange-miss drift check rebuilds
   expected counts from the deterministic timelines and reads actual missed
   instances from the server's exchange history for every family — no local
   state needed. Same-day API latency/error stats come from the run's own
   ledger (in-process, always available).

To run the report locally against the live cohort (read-only):
`python -m scripts.simulation.run --mode report --confirm-production`.
