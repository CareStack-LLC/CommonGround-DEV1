"""Onboarding / family scenarios (S-FAM-*)."""

from __future__ import annotations

from datetime import date

from ..client import ApiError
from ..types import Assertion
from .base import FamilyContext, Scenario, ScenarioOutcome


async def fam_01_child_dual_approval(ctx: FamilyContext) -> ScenarioOutcome:
    """A child added by one parent must stay pending until the co-parent approves."""
    a: list[Assertion] = []
    raw: dict = {}
    child = await ctx.parent_a.add_child(ctx.family_file_id, {
        "first_name": "QA", "last_name": "Child",
        "date_of_birth": date(2016, 5, 4).isoformat(), "gender": "female",
    })
    raw["added"] = child
    cid = child.get("id")
    a.append(Assertion("fam.child_pending", child.get("status") == "pending_approval",
                       "pending_approval", child.get("status"),
                       "a child added while both parents are on file must await co-parent approval", "high"))
    if not cid:
        return ScenarioOutcome(a, raw, "Added a child but got no id back.")

    # Co-parent approves → should flip to active.
    try:
        raw["approve"] = await ctx.parent_b.approve_child(ctx.family_file_id, cid)
    except ApiError as e:
        raw["approve_error"] = {"status": e.status, "body": e.body}

    after = await ctx.parent_a.get_child(cid)
    raw["after"] = {"status": after.get("status"),
                    "approved_by_a": after.get("approved_by_a"), "approved_by_b": after.get("approved_by_b")}
    a.append(Assertion("fam.child_active_after_both", after.get("status") == "active",
                       "active", after.get("status"),
                       "the child becomes active only after both parents approve", "high"))
    summary = ("Added a child to the family: it correctly showed as pending until the co-parent approved, "
               "then became active.")
    return ScenarioOutcome(a, raw, summary)


SCENARIOS = [
    Scenario("S-FAM-01", "Child dual-approval", "onboarding", fam_01_child_dual_approval),
]
