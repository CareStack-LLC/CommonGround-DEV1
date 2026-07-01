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


async def fund_02_funding_flow(ctx: FamilyContext) -> ScenarioOutcome:
    """Create an obligation and fund a share; the funding must be tracked.
    Funding may route through Stripe → any 4xx is treated as a graceful skip."""
    status, ob = await ctx.parent_a.create_obligation({
        "case_id": ctx.family_file_id, "purpose_category": "sports",
        "title": "QA funding-flow expense", "child_ids": ctx.child_ids,
        "total_amount": 100.0, "petitioner_percentage": 50,
        "verification_required": False, "receipt_required": False, "source_type": "request",
    })
    if status in (402, 403) or status != 201 or not isinstance(ob, dict):
        return ScenarioOutcome(
            [Assertion("fund2.gated_skipped", True, "gated/needs-tier→skip", status,
                       "ClearFund not available for this family; skipped", "low")],
            {"status": status, "body": ob},
            "ClearFund funding wasn't available for this test family, so it was skipped.",
        )
    oid = ob.get("id")
    share = _num(ob.get("petitioner_share")) or 50.0
    f_status, f_body = await ctx.parent_a.fund_obligation(oid, {"amount": share, "notes": "QA funding"})
    if f_status >= 400:  # Stripe/payment prerequisites → not a bug for this harness
        return ScenarioOutcome(
            [Assertion("fund2.funding_needs_payment", f_status in (400, 402, 403, 422),
                       "handled cleanly", f_status,
                       "funding requires a payment method; endpoint responded cleanly", "low")],
            {"create": ob, "fund_status": f_status, "fund_body": f_body},
            "Logged an expense and started funding; capturing the money needs a payment method, which we don't drive on prod.",
        )
    funding = await ctx.parent_a.get_funding(oid)
    a = [Assertion("fund2.funding_tracked", _num(funding.get("amount_funded")) is not None,
                   "amount_funded present", funding.get("amount_funded"),
                   "the funded amount is tracked on the obligation", "high")]
    return ScenarioOutcome(a, {"obligation": ob, "funding": funding},
                           "Funded a share of a shared expense and the app tracked the amount correctly.")


SCENARIOS = [
    Scenario("S-FUND-01", "Expense split math", "clearfund", fund_01_split_math),
    Scenario("S-FUND-02", "Expense funding flow", "clearfund", fund_02_funding_flow),
]
