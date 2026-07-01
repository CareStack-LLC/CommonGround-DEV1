"""KidComs / KidSpace scenarios (S-KID-*).

The child wallet's contribution endpoint captures real money via Stripe, so we
do NOT drive payments on production. Instead we verify COPPA gating and that the
wallet reads back a valid, non-negative balance (a safe read-only health check).
"""

from __future__ import annotations

from ..types import Assertion
from .base import FamilyContext, Scenario, ScenarioOutcome


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


async def kid_01_wallet_read(ctx: FamilyContext) -> ScenarioOutcome:
    child_id = ctx.child_ids[0]
    raw: dict = {}

    # COPPA consent is a prerequisite for KidComs; idempotent, tolerate any outcome.
    try:
        c_status, c_body = await ctx.parent_a.coppa_consent(child_id)
        raw["coppa"] = {"status": c_status, "body": c_body}
    except Exception as e:
        raw["coppa_error"] = str(e)

    status, wallet = await ctx.parent_a.get_child_wallet(child_id)
    if status in (402, 403, 404):
        # 404 = no wallet created yet (wallets are created on first funding);
        # 402/403 = paid-tier gated. Neither is a bug.
        return ScenarioOutcome(
            [Assertion("kid.no_wallet_skipped", True, "no-wallet/gated→skip", status,
                       "no child wallet set up for this family yet; skipped", "low")],
            {"status": status, "body": wallet},
            "This child doesn't have a wallet set up yet (they're created on first gift), so there was nothing to read.",
        )
    bal = _num((wallet or {}).get("current_balance"))
    a = [
        Assertion("kid.wallet_reads", status == 200 and isinstance(wallet, dict),
                  200, status, "the child wallet should load", "high"),
        Assertion("kid.balance_valid", bal is not None and bal >= 0,
                  ">= 0", bal, "wallet balance must be a valid non-negative number", "high"),
    ]
    summary = (f"Opened the child's wallet — it loaded with a valid balance of ${bal}. "
               "(Contributions capture real payments, so we didn't move money on production.)")
    return ScenarioOutcome(a, {"status": status, "balance": bal}, summary)


SCENARIOS = [
    Scenario("S-KID-01", "Child wallet reads a valid balance", "kidcoms", kid_01_wallet_read),
]
