# Two-Week Family Simulation — Design

**Goal:** run the platform like a real user base for 14 consecutive days —
~100 parent testers across ~50 family files, every family living out a
coherent, scripted co-parenting life (messages, custody exchanges, expenses,
child support, TimeBridge events) — and collect a daily system report.
**Nothing gets fixed until the run completes**; the point is longitudinal data.

Out of scope (tested manually): KidSpace video/audio calls.

## Cohort shape

50 families × 2 parents = 100 testers. Every family gets an **archetype** that
fixes its custody pattern, reliability, financial profile, and communication
tone. Archetypes are deliberately unevenly distributed to mirror reality.

### Custody patterns (drop-off cadence)

| Pattern | Families | Description |
|---|---|---|
| `every_weekend` | 10 | Parent B has kids Fri 18:00 → Sun 18:00 every week |
| `alternating_weekends` | 10 | Same but every other weekend + Wed dinner exchange |
| `2_2_3` | 10 | Mon-Tue A / Wed-Thu B / Fri-Sun alternating |
| `week_on_week_off` | 10 | Handoff every Monday 08:00 |
| `3_4_4_3` | 5 | Wed + Sat handoffs, alternating long half |
| `split_week_5_2` | 5 | Weekdays A, weekends B, Sun-evening return |

### Reliability profiles (exchange + event behavior)

| Profile | Families | Behavior |
|---|---|---|
| `always_reliable` | 15 | Never misses an exchange or TimeBridge event; checks in on time, GPS inside geofence |
| `mostly_reliable` | 20 | ~10% missed/late exchanges (scripted, not random — specific days), events occasionally ignored |
| `one_flaky_parent` | 10 | Parent A perfect; Parent B misses ~25% of exchanges + most TimeBridge events |
| `chaotic` | 5 | Both parents late/missing frequently; reschedule requests; no-shows |

Misses are **scripted into the timeline** (deterministic day/slot), so the
expected numbers are known in advance and the daily report can compare
*expected vs recorded* — any drift is a platform bug, not test noise.

### Financial profiles

| Profile | Families | Behavior |
|---|---|---|
| `recurring_support` | 20 | Monthly child-support obligation (recurring), payer marks paid on schedule; 5 of these pay late |
| `one_off_expenses` | 15 | 2-4 one-off expense requests over the fortnight (school supplies, medical copay, cleats…), approve/decline mix |
| `both` | 10 | Recurring support + occasional expense requests |
| `disputed` | 5 | Expense requests that get declined + argued about in messages |

### Communication tone

| Tone | Families | Message behavior |
|---|---|---|
| `cooperative` | 20 | Polite logistics, zero expected ARIA flags |
| `tense` | 15 | Mostly fine; 2-3 scripted borderline messages/wk (passive-aggressive, blame) — some should flag |
| `hostile` | 10 | Regular hostility/blame; ARIA should flag + suggest rewrites; sender sometimes accepts rewrite, sometimes sends anyway |
| `escalating` | 5 | Week 1 cooperative → week 2 increasingly hostile (tests trend detection) |

**Message coherence requirement:** each family has a persistent story
(children's names/ages, school, activities, the actual custody schedule they're
living). Messages are generated per-family from that context so threads read
like real conversations — replies reference earlier messages, exchanges that
actually happened, expenses that were actually requested. Generation uses the
campaign's AI machinery (Claude) with the family bible as context; a curated
template pool is the fallback if AI generation fails on a given day.

## 14-day timeline

Each family's timeline is **compiled once at seed time** into per-day action
lists (deterministic, seeded RNG keyed by family index — reruns produce the
same script). A day's actions:

- **Exchanges:** per custody pattern; the receiving/handing parent checks in
  (GPS inside geofence) or deliberately doesn't (scripted miss). Late check-ins
  are +20-90 min.
- **Messages:** 2-8/day/family, tone-appropriate, thread-coherent. Includes
  reactions to that day's events ("you missed pickup again" after a scripted
  miss in `one_flaky_parent` families).
- **TimeBridge events:** each family maintains 3-6 upcoming events (dentist,
  recital, parent-teacher night). Some archetypes RSVP/acknowledge all; flaky
  ones let them pass unacknowledged (missed).
- **Money:** per financial profile — obligation created day 1-2, payments on
  scripted days; expense requests spread across the fortnight with
  approve/decline responses 0-2 days later.
- **Weekly reports:** on days 7 and 14 a subset of parents generate parent
  reports (custody_time / communication / expense) to exercise reporting under
  organic data.

System-wide calendar highlights:
- **Day 1:** cohort seeding (accounts, families, children, agreements/schedules, obligations).
- **Days 2-13:** daily life per timelines; volumes vary by weekday (weekends heavier on exchanges, weekdays heavier on messages/expenses).
- **Day 7:** mid-run surge — all 50 families active within a 2-hour window (mini load bump), week-1 report pulls.
- **Day 14:** final day + full report sweep; run summary generated.

## Execution model

- **Runner:** `python -m scripts.simulation.run --confirm-production` — a daily
  Render cron (same pattern as the custody soak). Stateless-safe: cohort is
  recovered from the server by deterministic naming; the day index is
  `(today - SIM_START_DATE).days + 1`, so a missed/rerun cron day is harmless
  and idempotent (actions are tagged, already-done actions are skipped).
- **Pacing:** actions spread over the cron's window with the campaign's pacing
  helpers to stay under per-IP rate limits; the runner is a *user simulator*,
  not a load test.
- **No-fix policy:** the runner only records; failures become report lines, not
  aborts. A hard failure of one family's action never stops other families.

## Daily report

`python -m scripts.simulation.report` (also run automatically at the end of
each daily cron; artifacts uploaded to the reports storage bucket +
`docs/sim_reports/DAY_NN.md` committed by the user if desired). Contents:

1. **Scorecard:** expected vs actual per category — exchanges (due / checked-in
   / scripted-miss / UNEXPECTED-miss), messages (sent / delivered / expected
   flags / actual flags / false-positive flags), TimeBridge (events due /
   acknowledged / missed), money (obligations due / paid / late, expense
   requests / responses), reports generated OK/failed.
2. **API health:** per-endpoint error counts + p50/p95 latency as seen by the
   simulator; HTTP failures with samples.
3. **ARIA quality sample:** the day's flagged messages with scores +
   categories, and the scripted-hostile messages that did NOT flag (misses).
4. **Data integrity spot-checks:** custody-day math for 5 rotating families vs
   the oracle; obligation balances vs expected ledger.
5. **Drift log:** anything that deviated from script, accumulated across days
   (this is the fix-list for day 15).

## Env / config

`SIM_START_DATE` (ISO date), `SIM_FAMILY_COUNT` (default 50),
`CAMPAIGN_BASE_URL`, `CAMPAIGN_ADMIN_EMAIL/PASSWORD`, `ANTHROPIC_API_KEY`
(message generation), `SIM_CONFIRM=1` + `--confirm-production` gate.
