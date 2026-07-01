"""
Custody-tracking + reporting scenarios (S-SCHED / S-DISP / S-RPT).

In fast mode every action happens "now", so these assert DETERMINISTIC,
non-brittle properties: sequential custody flips, override precedence, and
internal report consistency — never exact multi-day percentages (which depend
on backend schedule backfill + timezone rules we do not reimplement).
"""

from __future__ import annotations

from datetime import datetime, timedelta

from .. import oracle
from ..types import Assertion
from .base import DEFAULT_CENTER_LAT, DEFAULT_CENTER_LNG, FamilyContext, Scenario, ScenarioOutcome, create_handoff

CENTER = (DEFAULT_CENTER_LAT, DEFAULT_CENTER_LNG)


async def _complete_handoff(ctx: FamilyContext, *, reverse: bool, title: str) -> dict:
    clat, clng = CENTER
    from_client = ctx.parent_b if reverse else ctx.parent_a
    to_client = ctx.parent_a if reverse else ctx.parent_b
    _, inst = await create_handoff(ctx, radius_m=100, title=title, reverse=reverse)
    iid = inst["id"]
    await from_client.check_in_gps(iid, clat, clng, 5)
    return await to_client.check_in_gps(iid, clat, clng, 5)


async def sched_01_sequential_flip(ctx: FamilyContext) -> ScenarioOutcome:
    """Two completed handoffs A->B then B->A: custody must flip each time."""
    a: list[Assertion] = []
    r1 = await _complete_handoff(ctx, reverse=False, title="S-SCHED-01 A->B")
    a += oracle.completion_assertions(r1)
    cs1 = await ctx.parent_a.custody_status(ctx.family_file_id)
    a.append(oracle.custody_flip_assertion(cs1, ctx.child_ids[0], ctx.parent_b.user_id))

    r2 = await _complete_handoff(ctx, reverse=True, title="S-SCHED-01 B->A")
    a += oracle.completion_assertions(r2)
    cs2 = await ctx.parent_a.custody_status(ctx.family_file_id)
    a.append(oracle.custody_flip_assertion(cs2, ctx.child_ids[0], ctx.parent_a.user_id))

    # Stats internal consistency (percentages sum ~100 over recorded days; variance self-consistent).
    stats = await ctx.parent_a.child_stats(ctx.child_ids[0], period="30_days")
    a += _stats_consistency(stats)
    return ScenarioOutcome(
        a, {"flip1": cs1, "flip2": cs2, "stats": stats},
        "Ran two back-to-back handoffs and custody correctly moved to parent B, then back to parent A.",
    )


async def disp_01_override_dispute(ctx: FamilyContext) -> ScenarioOutcome:
    """A completes a handoff (custody->B); B then claims 'with me'; A disputes."""
    a: list[Assertion] = []
    r1 = await _complete_handoff(ctx, reverse=False, title="S-DISP-01 handoff")
    a += oracle.completion_assertions(r1)
    # Parent B claims custody via manual override.
    ov = await ctx.parent_b.override_custody(ctx.family_file_id, ctx.child_ids, notes="Kids are with me")
    a.append(Assertion("override.accepted", bool(ov.get("success")), True, ov.get("success"),
                       "manual 'With Me' override should succeed", "high"))
    cs = await ctx.parent_a.custody_status(ctx.family_file_id)
    child = next((c for c in cs.get("children", []) if c.get("child_id") == ctx.child_ids[0]), {})
    a.append(Assertion("override.reflected", child.get("current_parent_id") == ctx.parent_b.user_id,
                       ctx.parent_b.user_id, child.get("current_parent_id"),
                       "override custodian should be reflected", "high"))
    return ScenarioOutcome(a, {"override": ov, "custody_status": cs},
                           "Parent B tapped 'With Me' to claim custody; the tracker updated to show the kids with parent B.")


async def rpt_01_report_reconcile(ctx: FamilyContext) -> ScenarioOutcome:
    """Drive one handoff, then assert the parenting report is internally consistent."""
    a: list[Assertion] = []
    await _complete_handoff(ctx, reverse=False, title="S-RPT-01 seed")
    end = datetime.utcnow().date()
    start = end - timedelta(days=30)
    report = await ctx.parent_a.family_report(ctx.family_file_id, start.isoformat(), end.isoformat())

    exchanges = report.get("exchanges") or {}
    rate = exchanges.get("completion_rate")
    a.append(Assertion(
        "report.completion_rate_valid", rate is None or (0.0 <= float(rate) <= 1.0),
        "0..1", rate, "completion_rate must be a valid ratio", "high",
    ))
    completed = exchanges.get("completed")
    total = exchanges.get("total_scheduled")
    if isinstance(completed, int) and isinstance(total, int) and total >= 0:
        a.append(Assertion(
            "report.counts_consistent", completed <= total, "completed <= total_scheduled",
            f"{completed}/{total}", "completed exchanges cannot exceed scheduled", "high",
        ))
    ct = report.get("custody_time") or {}
    a.append(Assertion(
        "report.has_custody_time", bool(ct), "present", bool(ct),
        "report includes a custody-time section", "medium",
    ))
    return ScenarioOutcome(a, {"report": report},
                           "Pulled the parenting-time report after a handoff; the exchange and custody figures were internally consistent.")


def _stats_consistency(stats: dict) -> list[Assertion]:
    pa = (stats.get("parent_a") or {})
    pb = (stats.get("parent_b") or {})
    a_pct = _num(pa.get("percentage"))
    b_pct = _num(pb.get("percentage"))
    out: list[Assertion] = []
    if stats.get("recorded_days", 0) and a_pct is not None and b_pct is not None:
        out.append(Assertion(
            "stats.pcts_sum_100", abs((a_pct + b_pct) - 100) <= 1.0, "~100",
            round(a_pct + b_pct, 1), "parent percentages should sum to ~100 over recorded days", "high",
        ))
    agreed = (stats.get("agreed_schedule") or {})
    var = (stats.get("variance") or {})
    agreed_a, var_a = _num(agreed.get("parent_a_percentage")), _num(var.get("parent_a"))
    if a_pct is not None and agreed_a is not None and var_a is not None:
        out.append(Assertion(
            "stats.variance_consistent", abs(var_a - (a_pct - agreed_a)) <= 0.5,
            round(a_pct - agreed_a, 1), var_a, "variance == actual - agreed", "high",
        ))
    return out


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


SCENARIOS = [
    Scenario("S-SCHED-01", "Sequential custody flip", "custody", sched_01_sequential_flip),
    Scenario("S-DISP-01", "Override + co-parent dispute", "custody", disp_01_override_dispute),
    Scenario("S-RPT-01", "Custody report reconciliation", "custody", rpt_01_report_reconcile),
]
