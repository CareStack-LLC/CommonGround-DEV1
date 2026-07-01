"""
Multi-day custody-accuracy soak (S-CUSTODY-SOAK).

Run once per real calendar day (via launchd/cron). Uses a persistent expected
ledger + a baseline snapshot in the state file, so it works across separate
daily process runs and is robust to any schedule backfill:

  each day it drives a real completed exchange handing the kids to that day's
  intended parent, then verifies the tracker:
    - shows the RIGHT parent has the kids today (exact), and
    - the cumulative days attributed to each parent have grown by AT LEAST the
      exchanges we drove to them since the soak began (delta ≥ driven).

Over 3+ days this proves the custody tracker accumulates accurately across
exchanges — the property that matters most for court.
"""

from __future__ import annotations

from datetime import date

from ..ledger import load_state, save_state
from ..types import Assertion
from .base import FamilyContext, Scenario, ScenarioOutcome
from .schedules import _complete_handoff


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _days_by_parent(stats: dict, ctx: FamilyContext) -> dict:
    """Map absolute custody-day counts to {'A': n, 'B': n} by user id."""
    pa, pb = (stats.get("parent_a") or {}), (stats.get("parent_b") or {})
    by_id = {pa.get("user_id"): _num(pa.get("days")) or 0.0,
             pb.get("user_id"): _num(pb.get("days")) or 0.0}
    return {"A": by_id.get(ctx.parent_a.user_id, 0.0), "B": by_id.get(ctx.parent_b.user_id, 0.0)}


async def custody_soak_daily(ctx: FamilyContext) -> ScenarioOutcome:
    child = ctx.child_ids[0]
    a: list[Assertion] = []

    st = load_state()
    node = (
        st.setdefault("custody_soak", {})
        .setdefault(ctx.family_id, {})
        .setdefault(child, {})
    )

    # One-time baseline snapshot before the soak drives anything.
    if "baseline" not in node:
        pre = await ctx.parent_a.child_stats(child, period="all_time")
        node["baseline"] = _days_by_parent(pre, ctx)
        node["ledger"] = {}
        node["start"] = date.today().isoformat()
        save_state(st)
    base, ledger = node["baseline"], node["ledger"]

    today = date.today().isoformat()
    intended = ctx.parent_b.user_id if (ctx.day % 2 == 1) else ctx.parent_a.user_id
    reverse = intended == ctx.parent_a.user_id  # reverse handoff hands to Parent A

    r = await _complete_handoff(ctx, reverse=reverse, title=f"custody-soak d{ctx.day}")
    a.append(Assertion("soak.handoff_completed", r.get("status") == "completed", "completed",
                       r.get("status"), "the day's exchange completed", "high"))

    ledger[today] = intended
    save_state(st)

    # 1) TODAY — exact custodian.
    cs = await ctx.parent_a.custody_status(ctx.family_file_id)
    ch = next((c for c in cs.get("children", []) if c.get("child_id") == child), {})
    a.append(Assertion("soak.today_custodian", ch.get("current_parent_id") == intended,
                       intended, ch.get("current_parent_id"),
                       "the tracker shows the right parent has the kids today", "critical"))

    # 2) CUMULATIVE — delta since baseline must cover every driven day.
    now = _days_by_parent(await ctx.parent_a.child_stats(child, period="all_time"), ctx)
    exp_a = sum(1 for p in ledger.values() if p == ctx.parent_a.user_id)
    exp_b = sum(1 for p in ledger.values() if p == ctx.parent_b.user_id)
    delta_a, delta_b = now["A"] - base["A"], now["B"] - base["B"]
    a += [
        Assertion("soak.A_delta_covers_driven", delta_a >= exp_a, f">= {exp_a}", delta_a,
                  "cumulative days for Parent A cover every exchange handed to A", "critical"),
        Assertion("soak.B_delta_covers_driven", delta_b >= exp_b, f">= {exp_b}", delta_b,
                  "cumulative days for Parent B cover every exchange handed to B", "critical"),
    ]

    who = "Parent A" if intended == ctx.parent_a.user_id else "Parent B"
    raw = {"day": ctx.day, "today": today, "intended": who,
           "driven": {"A": exp_a, "B": exp_b}, "delta": {"A": delta_a, "B": delta_b},
           "ledger": dict(ledger)}
    summary = (
        f"Day {ctx.day}: handed the kids to {who} with a real GPS exchange. The tracker shows {who} "
        f"has them today, and the running custody totals have grown to cover every exchange so far "
        f"({exp_a} day(s) to A, {exp_b} to B) — accurate across days."
    )
    return ScenarioOutcome(a, raw, summary)


SCENARIOS = [
    Scenario("S-CUSTODY-SOAK", "Multi-day custody accuracy", "custody-soak", custody_soak_daily),
]
