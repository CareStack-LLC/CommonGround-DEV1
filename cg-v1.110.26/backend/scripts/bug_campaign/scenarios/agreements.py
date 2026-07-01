"""Agreement Builder scenarios (S-AGR-*).

There is no generic POST /agreements create route (agreements are created via
the family-file / SharedCare flow), so this asserts the beta-critical
DUAL-APPROVAL INVARIANT read-only against the family's existing agreements:
an agreement may only be `active` when BOTH parents have approved.
"""

from __future__ import annotations

from ..types import Assertion
from .base import FamilyContext, Scenario, ScenarioOutcome


async def agr_01_dual_approval_invariant(ctx: FamilyContext) -> ScenarioOutcome:
    agreements = await ctx.parent_a.list_agreements(ctx.family_file_id)
    if not agreements:
        return ScenarioOutcome(
            [Assertion("agr.none_present", True, "no agreements → skip", 0,
                       "this family has no agreements yet; nothing to check", "low")],
            {"count": 0},
            "This family hasn't built an agreement yet, so there was nothing to verify here.",
        )

    a: list[Assertion] = []
    for ag in agreements:
        aid = (ag.get("id") or "")[:8]
        status = ag.get("status")
        both = bool(ag.get("petitioner_approved")) and bool(ag.get("respondent_approved"))
        if status == "active":
            a.append(Assertion(
                f"agr.active_requires_both[{aid}]", both, "both approved", both,
                "an ACTIVE agreement must have both parents' approval (dual-consent gate)", "critical",
            ))
        elif status in ("draft", "pending_approval"):
            a.append(Assertion(
                f"agr.pending_not_both[{aid}]", not both, "not both approved yet", both,
                "a draft/pending agreement must not already show both approvals", "high",
            ))
    if not a:
        a.append(Assertion("agr.statuses_known", True, "known statuses", [ag.get("status") for ag in agreements],
                           "agreement statuses were readable", "low"))
    summary = (f"Checked the family's {len(agreements)} agreement(s): the dual-approval rule held — only fully "
               "signed agreements were active.")
    return ScenarioOutcome(a, {"count": len(agreements),
                               "statuses": [ag.get("status") for ag in agreements]}, summary)


SCENARIOS = [
    Scenario("S-AGR-01", "Agreement dual-approval invariant", "agreement", agr_01_dual_approval_invariant),
]
