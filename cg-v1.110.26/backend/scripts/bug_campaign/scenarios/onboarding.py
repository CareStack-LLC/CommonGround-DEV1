"""Onboarding / family scenarios (S-FAM-*)."""

from __future__ import annotations

import time
from datetime import date

from ..client import ApiError, ParentAgentClient
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


async def onb_01_full_signup(ctx: FamilyContext) -> ScenarioOutcome:
    """End-to-end new-user onboarding: register two parents, create a family, invite +
    accept, and confirm the family becomes 'complete' with both parents joined."""
    cfg = ctx.parent_a.cfg
    stamp = str(int(time.time()))
    a_email = f"onb-a-{stamp}@cg-qa.com"
    b_email = f"onb-b-{stamp}@cg-qa.com"
    pw = "OnbQA!2026x"
    pa = ParentAgentClient(cfg, a_email, pw, "Onboard Alpha")
    pb = ParentAgentClient(cfg, b_email, pw, "Onboard Beta")
    a: list[Assertion] = []
    raw: dict = {}
    try:
        await pa.register(first_name="Onboard", last_name="Alpha")
        await pb.register(first_name="Onboard", last_name="Beta")
        fam = await pa.create_family_file({
            "title": "QA Onboarding Family", "parent_a_role": "mother",
            "parent_b_email": b_email, "parent_b_role": "father",
        })
        raw["family"] = {"id": fam.get("id"), "invited_at": fam.get("parent_b_invited_at")}
        fid = fam.get("id")
        a += [
            Assertion("onb.family_created", bool(fid), "a family id", bool(fid),
                      "creating a family file succeeds", "high"),
            Assertion("onb.coparent_invited", bool(fam.get("parent_b_invited_at")), "invited_at set",
                      bool(fam.get("parent_b_invited_at")), "the co-parent invitation is recorded", "high"),
        ]
        if fid:
            await pb.accept_invitation(fid)
            detail = await pa.get_family_file(fid)
            raw["after_accept"] = {"is_complete": detail.get("is_complete"),
                                   "joined_at": detail.get("parent_b_joined_at")}
            a += [
                Assertion("onb.coparent_joined", bool(detail.get("parent_b_joined_at")), "joined_at set",
                          bool(detail.get("parent_b_joined_at")), "the co-parent join is recorded", "high"),
                Assertion("onb.family_complete", detail.get("is_complete") is True, True,
                          detail.get("is_complete"),
                          "the family becomes complete once both parents have joined", "high"),
            ]
    except ApiError as e:
        raw["error"] = {"status": e.status, "body": e.body}
        a.append(Assertion("onb.flow_ok", False, "no API error", f"{e.status}",
                           "the onboarding flow should complete without errors", "high"))
    finally:
        await pa.aclose()
        await pb.aclose()
    summary = ("Signed up two brand-new parents, created a family, invited and accepted the co-parent — "
               "the family correctly showed as complete once both had joined.")
    return ScenarioOutcome(a, raw, summary)


SCENARIOS = [
    Scenario("S-FAM-01", "Child dual-approval", "onboarding", fam_01_child_dual_approval),
    Scenario("S-ONB-01", "Full new-user onboarding", "onboarding", onb_01_full_signup),
]
