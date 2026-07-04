"""
Daily simulation report — the 5 sections from docs/SIMULATION_2WEEK.md:

  1. Scorecard: expected vs actual per category.
  2. API health: per-endpoint error counts + p50/p95 latency (simulator-side).
  3. ARIA quality sample: flagged messages + scripted-hostile that did NOT flag.
  4. Data integrity spot-checks: custody math for 5 rotating families vs the
     shadow ledger (read-only API calls; skipped when offline).
  5. Drift log: everything that deviated from script, cumulative across days —
     the fix-list for day 15.

Expected numbers are recompiled from the deterministic timelines — NEVER taken
from the ledger. Writes state/sim_reports/day_NN.md and .json.
"""

from __future__ import annotations

import asyncio
import json
import statistics
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Optional

from scripts.bug_campaign.admin_client import AdminClient
from scripts.bug_campaign.client import ParentAgentClient
from scripts.bug_campaign.custody_oracle import ShadowLedger
from scripts.bug_campaign.ledger import LEDGER_PATH

from . import timeline as tl
from .archetypes import assign_archetypes
from .config import SIM_REPORT_DIR, SimConfig
from .family_bible import build_bible

SPOT_CHECK_COUNT = 5

# Auth is rate-limited to 10 requests/60s per IP (app/core/rate_limit.py
# AUTH_RATE_LIMIT). The drift check logs into every family and the spot-check
# logs into 5 more from the SAME cron container (one IP) — back-to-back that
# blew through the limit and turned most of day 1's checks into 429s. Pace
# every per-family login at this rate (with headroom) so a full 50-family
# report run takes a few extra minutes instead of failing almost entirely.
_LOGIN_PACE_S = 6.5


def _load_ledger() -> list[dict]:
    if not LEDGER_PATH.exists():
        return []
    records: list[dict] = []
    with LEDGER_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return records


def _percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    values = sorted(values)
    k = max(0, min(len(values) - 1, int(round((pct / 100) * (len(values) - 1)))))
    return values[k]


def _compile_all(sim: SimConfig, start: date) -> list[list[tl.DayPlan]]:
    archetypes = assign_archetypes(sim.family_count)
    return [
        tl.compile_timeline(i, archetypes[i], build_bible(i, archetypes[i]), start)
        for i in range(sim.family_count)
    ]


def _expected_for_day(all_plans: list[list[tl.DayPlan]], day: int) -> dict[str, int]:
    total: dict[str, int] = {}
    for plans in all_plans:
        c = tl.summarize_plan([plans[day - 1]])
        for k, v in c.items():
            total[k] = total.get(k, 0) + v
    return total


def _actuals_for_day(day_records: list[dict]) -> dict[str, Any]:
    a = {
        "exchanges_attempted": 0, "exchanges_checked_in": 0,
        "exchanges_scripted_miss": 0, "exchange_instance_not_found": 0,
        "messages_sent": 0, "messages_delivered": 0, "messages_flagged": 0,
        "messages_blocked": 0, "false_positive_flags": 0, "flag_misses": 0,
        "events_created": 0, "rsvps_ok": 0, "rsvps_skipped": 0,
        "obligations_created": 0, "obligations_gated": 0,
        "fundings_ok": 0, "fundings_failed": 0,
        "disputes_ok": 0, "reports_ok": 0, "reports_failed": 0,
        "action_failures": 0, "family_crashes": 0,
    }
    for r in day_records:
        if r.get("type") == "sim_family_crash":
            a["family_crashes"] += 1
            continue
        if r.get("type") != "sim_action":
            continue
        action = r.get("action")
        ok = bool(r.get("ok"))
        if not ok:
            a["action_failures"] += 1
        if action == "ExchangeAction":
            a["exchanges_attempted"] += 1
            detail = str(r.get("detail") or "")
            if "miss_both" in detail or r.get("expected") == "missed":
                a["exchanges_scripted_miss"] += 1
            elif ok:
                a["exchanges_checked_in"] += 1
            if r.get("drift") == "instance_not_found":
                a["exchange_instance_not_found"] += 1
        elif action == "SendMessage":
            a["messages_sent"] += 1
            if r.get("status") in (201, 202):
                a["messages_delivered"] += 1
            if r.get("actual") == "flag":
                a["messages_flagged"] += 1
            if r.get("actual") == "blocked":
                a["messages_blocked"] += 1
            if r.get("drift") == "cooperative_message_flagged (false positive)":
                a["false_positive_flags"] += 1
            if r.get("drift") == "expected_flag_but_sent_clean":
                a["flag_misses"] += 1
        elif action == "CreateEvent" and ok:
            a["events_created"] += 1
        elif action == "RsvpEvent" and ok:
            a["rsvps_ok"] += 1
        elif action == "SkipRsvp":
            a["rsvps_skipped"] += 1
        elif action == "CreateObligation":
            if ok:
                a["obligations_created"] += 1
            if r.get("drift") == "clearfund_gated":
                a["obligations_gated"] += 1
        elif action == "FundObligation":
            a["fundings_ok" if ok else "fundings_failed"] += 1
        elif action == "RespondExpense":
            if "dispute" in str(r.get("endpoint") or ""):
                if ok:
                    a["disputes_ok"] += 1
            elif ok:
                a["fundings_ok"] += 1
            elif not ok:
                a["fundings_failed"] += 1
        elif action == "GenerateReport":
            a["reports_ok" if ok else "reports_failed"] += 1
    return a


def _api_health(day_records: list[dict]) -> list[dict]:
    by_ep: dict[str, dict] = {}
    for r in day_records:
        if r.get("type") != "sim_action":
            continue
        ep = r.get("endpoint")
        if not ep:
            continue
        b = by_ep.setdefault(ep, {"endpoint": ep, "count": 0, "errors": 0,
                                  "latencies": [], "samples": []})
        b["count"] += 1
        if not r.get("ok"):
            b["errors"] += 1
            if len(b["samples"]) < 3:
                b["samples"].append({
                    "status": r.get("status"), "family": r.get("family_index"),
                    "detail": str(r.get("detail") or "")[:160],
                })
        lat = r.get("latency_ms")
        if isinstance(lat, (int, float)):
            b["latencies"].append(float(lat))
    out = []
    for b in sorted(by_ep.values(), key=lambda x: -x["count"]):
        lats = b.pop("latencies")
        b["p50_ms"] = int(statistics.median(lats)) if lats else None
        b["p95_ms"] = int(_percentile(lats, 95)) if lats else None
        out.append(b)
    return out


def _aria_sample(day_records: list[dict]) -> dict:
    flagged, misses = [], []
    for r in day_records:
        if r.get("type") != "sim_action" or r.get("action") != "SendMessage":
            continue
        entry = {
            "family": r.get("family_index"),
            "expected": r.get("expected"), "actual": r.get("actual"),
            "detail": str(r.get("detail") or "")[:240],
        }
        if r.get("actual") in ("flag", "blocked"):
            flagged.append(entry)
        if r.get("drift") == "expected_flag_but_sent_clean":
            misses.append(entry)
    return {"flagged": flagged[:25], "scripted_hostile_not_flagged": misses}


def _drift_log(all_records: list[dict], upto_day: int) -> list[dict]:
    out = []
    for r in all_records:
        day = r.get("day")
        if not isinstance(day, int) or day > upto_day:
            continue
        if r.get("type") == "sim_family_crash":
            out.append({"day": day, "family": r.get("family_index"),
                        "drift": "family_crash", "detail": str(r.get("error"))[:200]})
        elif r.get("type") == "sim_action" and r.get("drift"):
            out.append({"day": day, "family": r.get("family_index"),
                        "action": r.get("action"), "drift": r.get("drift"),
                        "detail": str(r.get("detail") or "")[:200]})
    return out


async def _server_families(sim: SimConfig, admin: AdminClient) -> list[dict]:
    """Recover the sim cohort's families from the server (source of truth)."""
    cohorts = await admin.list_cohorts(limit=100)
    items = cohorts.get("items", cohorts) if isinstance(cohorts, dict) else cohorts
    cohort_id = next((c["id"] for c in items or []
                      if c.get("name") == sim.cohort_name), None)
    if not cohort_id:
        return []
    dash = await admin.get_cohort(cohort_id)
    families = [f for f in dash.get("families", []) if f.get("family_file_id")]
    families.sort(key=lambda f: f["id"])
    return families


async def _exchange_drift_from_server(
    sim: SimConfig, day: int, start: date,
    all_plans: list[list[tl.DayPlan]], admin: Optional[AdminClient],
) -> list[dict]:
    """
    Cross-day drift, server-sourced: for every family, compare the number of
    missed exchange instances the SERVER has recorded (all days <= today)
    against the number the timeline scripted. Both sides rebuild from durable
    sources (server DB + deterministic timeline), so this survives the cron's
    ephemeral filesystem — unlike the local ledger.
    """
    if admin is None:
        return [{"skipped": "offline — server drift check needs the API"}]
    try:
        families = await _server_families(sim, admin)
    except Exception as exc:  # noqa: BLE001
        return [{"skipped": f"cohort lookup failed: {exc}"}]
    if not families:
        return [{"skipped": "sim cohort not found on server"}]

    drift: list[dict] = []
    n = min(len(families), sim.family_count)
    for idx in range(n):
        fam = families[idx]
        # Scripted misses up to today (deterministic recompile)
        expected_missed = sum(
            1
            for plan in all_plans[idx][:day]
            for a in plan.actions
            if isinstance(a, tl.ExchangeAction)
            and a.behavior in ("miss_one_party", "miss_both")
        )
        pa = ParentAgentClient(sim.campaign, fam["parent_a_email"],
                               fam["parent_a_password"], "drift-check")
        try:
            await asyncio.sleep(_LOGIN_PACE_S)
            await pa.login()
            history = await pa.get_exchange_history(
                fam["family_file_id"], days=day + 1, upcoming_days=0
            )
            instances = history if isinstance(history, list) else (
                history.get("instances") or history.get("items") or []
            )
            actual_missed = sum(
                1 for i in instances if (i or {}).get("status") == "missed"
            )
            if actual_missed != expected_missed:
                drift.append({
                    "family_index": idx,
                    "family_id": fam["id"],
                    "drift": "exchange_miss_mismatch",
                    "expected_missed": expected_missed,
                    "server_missed": actual_missed,
                    "detail": (
                        "server recorded more misses than scripted — "
                        "platform lost check-ins or auto-close misfired"
                        if actual_missed > expected_missed
                        else "server recorded fewer misses than scripted — "
                        "auto-close may not be marking expired windows"
                    ),
                })
        except Exception as exc:  # noqa: BLE001
            drift.append({"family_index": idx, "drift": "drift_check_error",
                          "detail": repr(exc)[:200]})
        finally:
            try:
                await pa.aclose()
            except Exception:
                pass
    if not drift:
        drift.append({"ok": True,
                      "detail": f"all {n} families match scripted miss counts"})
    return drift


async def _integrity_spot_checks(
    sim: SimConfig, day: int, start: date,
    all_plans: list[list[tl.DayPlan]], admin: Optional[AdminClient],
) -> list[dict]:
    """Custody math for 5 rotating families vs the shadow ledger (read-only)."""
    if admin is None:
        return [{"skipped": "offline — no admin client (read-only checks need the API)"}]
    checks: list[dict] = []
    try:
        state_families = await _server_families(sim, admin)
        if not state_families:
            return [{"skipped": "sim cohort not found on server"}]
    except Exception as exc:  # noqa: BLE001
        return [{"skipped": f"cohort lookup failed: {exc}"}]

    n = min(len(state_families), sim.family_count)
    if n == 0:
        return [{"skipped": "no families on server"}]

    for k in range(SPOT_CHECK_COUNT):
        idx = (day * SPOT_CHECK_COUNT + k) % n
        fam = state_families[idx]
        check: dict[str, Any] = {"family_index": idx, "family_id": fam["id"]}
        pa = ParentAgentClient(sim.campaign, fam["parent_a_email"],
                               fam["parent_a_password"], "spot-check")
        try:
            await asyncio.sleep(_LOGIN_PACE_S)
            await pa.login()
            children = await pa.get_children(fam["family_file_id"])
            child_ids = [c["id"] for c in children if c.get("id")]
            check["children"] = len(child_ids)

            # Shadow ledger: replay this family's completed handoffs to date.
            shadow = ShadowLedger()
            plans = all_plans[idx]
            for plan in plans[:day]:
                for a in plan.actions:
                    if isinstance(a, tl.ExchangeAction) and a.behavior in ("on_time", "late"):
                        to_parent = "B" if a.direction == "AB" else "A"
                        shadow.record(child_ids, to_parent,
                                      start + timedelta(days=plan.day - 1))
            if child_ids:
                cid = child_ids[0]
                stats = await pa.child_stats(cid, period="30_days")
                check["child_stats_ok"] = isinstance(stats, dict)
                custody = await pa.custody_status(fam["family_file_id"])
                check["custody_status_ok"] = isinstance(custody, dict)
                check["shadow_expected_custodian"] = shadow.current_of(cid)
                check["shadow_split_pct"] = shadow.window_percentages(cid, "A", "B")
            upcoming = await pa.list_upcoming(fam["family_file_id"], limit=50)
            check["upcoming_exchanges"] = len(upcoming or [])
            unread = await pa.notifications_unread_count()
            check["notifications_unread"] = (unread or {}).get("count", unread)
        except Exception as exc:  # noqa: BLE001
            check["error"] = repr(exc)[:200]
        finally:
            try:
                await pa.aclose()
            except Exception:
                pass
        checks.append(check)
    return checks


def _render_md(day: int, sim_date: date, expected: dict, actual: dict,
               health: list[dict], aria: dict, integrity: list[dict],
               drift: list[dict]) -> str:
    lines = [
        f"# Family Simulation — Day {day:02d} Report ({sim_date.isoformat()})",
        "",
        "## 1. Scorecard — expected vs actual",
        "",
        "| Category | Expected (script) | Actual (recorded) |",
        "|---|---|---|",
        f"| Exchanges due | {expected.get('exchanges_due', 0)} | attempted {actual['exchanges_attempted']} |",
        f"| Exchanges checked in | {expected.get('exchanges_due', 0) - expected.get('scripted_miss_both', 0)} slots w/ ≥1 check-in | {actual['exchanges_checked_in']} |",
        f"| Scripted misses (one-party / both) | {expected.get('scripted_miss_one_party', 0)} / {expected.get('scripted_miss_both', 0)} | {actual['exchanges_scripted_miss']} recorded no-shows |",
        f"| UNEXPECTED instance-not-found | 0 | {actual['exchange_instance_not_found']} |",
        f"| Messages sent | {expected.get('messages', 0)} | {actual['messages_sent']} (delivered {actual['messages_delivered']}) |",
        f"| Expected ARIA flags | {expected.get('expected_flags', 0)} | {actual['messages_flagged']} flagged, {actual['messages_blocked']} blocked |",
        f"| Flag misses (scripted hostile, not flagged) | 0 | {actual['flag_misses']} |",
        f"| False-positive flags (cooperative flagged) | 0 | {actual['false_positive_flags']} |",
        f"| TimeBridge events created | {expected.get('events_created', 0)} | {actual['events_created']} |",
        f"| RSVPs (responded / scripted-skipped) | {expected.get('rsvps', 0)} / {expected.get('rsvp_skips', 0)} | {actual['rsvps_ok']} / {actual['rsvps_skipped']} |",
        f"| Obligations created (recurring / one-off) | {expected.get('obligations_recurring', 0)} / {expected.get('obligations_one_off', 0)} | {actual['obligations_created']} (gated {actual['obligations_gated']}) |",
        f"| Payments recorded | {expected.get('fundings', 0) + expected.get('expense_approvals', 0)} | {actual['fundings_ok']} (failed {actual['fundings_failed']}) |",
        f"| Expense disputes | {expected.get('expense_disputes', 0)} | {actual['disputes_ok']} |",
        f"| Parent reports | {expected.get('reports', 0)} | {actual['reports_ok']} ok / {actual['reports_failed']} failed |",
        f"| Action failures (any) | 0 | {actual['action_failures']} |",
        f"| Family crashes | 0 | {actual['family_crashes']} |",
        "",
        "## 2. API health (as seen by the simulator)",
        "",
        "| Endpoint | Calls | Errors | p50 ms | p95 ms |",
        "|---|---|---|---|---|",
    ]
    for h in health:
        lines.append(f"| `{h['endpoint']}` | {h['count']} | {h['errors']} | "
                     f"{h['p50_ms'] if h['p50_ms'] is not None else '—'} | "
                     f"{h['p95_ms'] if h['p95_ms'] is not None else '—'} |")
    if not health:
        lines.append("| (no API calls recorded) | — | — | — | — |")
    err_samples = [s for h in health for s in h.get("samples", [])]
    if err_samples:
        lines += ["", "Failure samples:", ""]
        for s in err_samples[:10]:
            lines.append(f"- status={s['status']} family=f{s['family']}: {s['detail']}")

    lines += ["", "## 3. ARIA quality sample", ""]
    if aria["flagged"]:
        lines.append(f"{len(aria['flagged'])} flagged/blocked message(s) today (sample):")
        for e in aria["flagged"][:10]:
            lines.append(f"- f{e['family']}: expected={e['expected']} actual={e['actual']} — {e['detail']}")
    else:
        lines.append("No messages flagged today.")
    lines.append("")
    if aria["scripted_hostile_not_flagged"]:
        lines.append("**Scripted-hostile messages that did NOT flag (misses):**")
        for e in aria["scripted_hostile_not_flagged"]:
            lines.append(f"- f{e['family']}: {e['detail']}")
    else:
        lines.append("No scripted-hostile misses today.")

    lines += ["", "## 4. Data integrity spot-checks (5 rotating families)", ""]
    for c in integrity:
        lines.append(f"- {json.dumps(c, default=str)}")

    lines += ["", f"## 5. Drift log (cumulative through day {day:02d}) — fix-list for day 15", ""]
    # Two shapes land here: local per-action drift (day/family/action/drift/
    # detail — always present) and server-sourced cross-day drift entries
    # (family_index/drift/detail, or a no-key "skipped"/"ok" sentinel when
    # there's nothing to report). Render each by what it actually has instead
    # of assuming every entry carries the local shape's keys.
    real_drift = [d for d in drift if "drift" in d]
    if real_drift:
        for d in real_drift:
            tag = f"day {d['day']:>2} f{d.get('family')}" if "day" in d else f"f{d.get('family_index', d.get('family', '?'))}"
            action = d.get("action", d["drift"])
            lines.append(f"- {tag}: [{action}] {d['drift']} — {d.get('detail', '')}")
    else:
        lines.append("No drift recorded. The script and the platform agree so far.")
    skipped = [d.get("skipped") for d in drift if "skipped" in d]
    if skipped:
        lines.append("")
        lines.append("(server-sourced checks skipped: " + "; ".join(dict.fromkeys(skipped)) + ")")
    lines.append("")
    return "\n".join(lines)


async def generate_daily_report(
    sim: SimConfig, day: int, start: date, admin: Optional[AdminClient] = None,
) -> tuple[Path, Path]:
    """Build day-N report from the ledger (+ optional read-only API cross-checks)."""
    sim_date = start + timedelta(days=day - 1)
    all_records = _load_ledger()
    day_records = [r for r in all_records if r.get("day") == day
                   and r.get("type") in ("sim_action", "sim_family_crash")]

    all_plans = _compile_all(sim, start)
    expected = _expected_for_day(all_plans, day)
    actual = _actuals_for_day(day_records)
    health = _api_health(day_records)
    aria = _aria_sample(day_records)
    drift = _drift_log(all_records, day)
    # Server-sourced cross-day drift: survives the cron's ephemeral filesystem
    # (the local ledger only ever holds the current run's records).
    server_drift = await _exchange_drift_from_server(sim, day, start, all_plans, admin)
    drift = drift + [{"source": "server", **d} for d in server_drift]
    integrity = await _integrity_spot_checks(sim, day, start, all_plans, admin)

    SIM_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    md_path = SIM_REPORT_DIR / f"day_{day:02d}.md"
    json_path = SIM_REPORT_DIR / f"day_{day:02d}.json"
    md_text = _render_md(day, sim_date, expected, actual, health, aria, integrity, drift)
    md_path.write_text(md_text, encoding="utf-8")
    json_path.write_text(json.dumps({
        "day": day, "sim_date": sim_date.isoformat(),
        "expected": expected, "actual": actual, "api_health": health,
        "aria": aria, "integrity": integrity, "drift": drift,
    }, indent=2, default=str), encoding="utf-8")
    print(f"  report written: {md_path}")

    # Dump the full report to stdout: Render keeps cron logs, so every daily
    # report stays retrievable from the dashboard/CLI even though the cron's
    # filesystem (state/sim_reports/) is thrown away after the run.
    print(f"\n===== SIM DAY {day:02d} REPORT BEGIN =====")
    print(md_text)
    print(f"===== SIM DAY {day:02d} REPORT END =====\n")
    return md_path, json_path
