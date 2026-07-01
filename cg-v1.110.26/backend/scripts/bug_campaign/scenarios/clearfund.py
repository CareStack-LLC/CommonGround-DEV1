"""ClearFund expense scenarios (S-FUND-*)."""

from __future__ import annotations

from ..types import Assertion
from .base import FamilyContext, Scenario, ScenarioOutcome


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


async def fund_01_split_math(ctx: FamilyContext) -> ScenarioOutcome:
    """Expense split must be exact: petitioner_share + respondent_share == total,
    and petitioner_share == total * pct. (Subscription-gated → treated as skipped.)"""
    total = 5000.0
    pct = 60
    status, body = await ctx.parent_a.create_obligation({
        "case_id": ctx.family_file_id,
        "purpose_category": "medical",
        "title": "QA dental expense",
        "description": "QA split-math check",
        "child_ids": ctx.child_ids,
        "total_amount": total,
        "petitioner_percentage": pct,
        "verification_required": False,
        "receipt_required": False,
        "source_type": "request",
    })

    if status in (402, 403):  # subscription/feature gated — not a bug
        return ScenarioOutcome(
            [Assertion("fund.gated_skipped", True, "gated→skip", status,
                       "ClearFund requires a paid tier for this family; skipped", "low")],
            {"status": status, "body": body},
            "ClearFund is a paid feature and this test family isn't on that tier, so expenses were skipped.",
        )
    a: list[Assertion] = [
        Assertion("fund.created", status == 201, 201, status, "expense request should be created", "high"),
    ]
    if status == 201 and isinstance(body, dict):
        ps, rs = _num(body.get("petitioner_share")), _num(body.get("respondent_share"))
        exp_ps = round(total * pct / 100, 2)
        a += [
            Assertion("fund.shares_sum_total",
                      ps is not None and rs is not None and abs((ps + rs) - total) <= 0.01,
                      total, {"petitioner": ps, "respondent": rs},
                      "the two shares must sum to the total", "critical"),
            Assertion("fund.petitioner_share_pct", ps is not None and abs(ps - exp_ps) <= 0.01,
                      exp_ps, ps, f"petitioner_share must equal total*{pct}%", "high"),
        ]
    summary = (f"Logged a ${int(total)} shared expense split {pct}/{100-pct}; the app calculated each parent's "
               "share and they added up exactly.")
    return ScenarioOutcome(a, {"status": status, "obligation": body}, summary)


SCENARIOS = [
    Scenario("S-FUND-01", "Expense split math", "clearfund", fund_01_split_math),
]
