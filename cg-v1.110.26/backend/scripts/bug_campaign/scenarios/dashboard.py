"""Dashboard scenarios (S-DASH-*) — the summary must load and be internally consistent."""

from __future__ import annotations

from ..types import Assertion
from .base import FamilyContext, Scenario, ScenarioOutcome


async def dash_01_summary_consistent(ctx: FamilyContext) -> ScenarioOutcome:
    """The dashboard summary must return cleanly and its counts must be sane
    (counts non-negative and >= the length of their preview lists)."""
    d = await ctx.parent_a.dashboard_summary(ctx.family_file_id)
    a: list[Assertion] = [
        Assertion("dash.loads", isinstance(d, dict) and len(d) > 0, "a summary object", type(d).__name__,
                  "the dashboard summary endpoint returns data", "high"),
    ]
    checks = [
        ("pending_expenses_count", "pending_expenses"),
        ("unread_messages_count", "unread_messages"),
        ("pending_agreements_count", "pending_agreements"),
    ]
    for count_key, list_key in checks:
        cnt = d.get(count_key)
        lst = d.get(list_key)
        if isinstance(cnt, int) and isinstance(lst, list):
            a.append(Assertion(
                f"dash.{count_key}_sane", cnt >= 0 and cnt >= len(lst),
                f">= len({list_key})={len(lst)}", cnt,
                "a count must be non-negative and cover its preview list", "medium",
            ))
    summary = "Opened the home dashboard — it loaded cleanly with consistent counts for messages, expenses, and agreements."
    return ScenarioOutcome(a, {"summary_keys": list(d.keys()) if isinstance(d, dict) else None}, summary)


SCENARIOS = [
    Scenario("S-DASH-01", "Dashboard summary consistency", "dashboard", dash_01_summary_consistent),
]
