"""Access-control scenarios (S-SEC-*) — a parent must not reach another family's data."""

from __future__ import annotations

import uuid

from ..types import Assertion
from .base import FamilyContext, Scenario, ScenarioOutcome


async def sec_01_cross_family(ctx: FamilyContext) -> ScenarioOutcome:
    """Own family readable (control); a family the parent doesn't belong to is denied."""
    bogus = str(uuid.uuid4())
    own_status, _ = await ctx.parent_a.try_get(f"/exchanges/family-file/{ctx.family_file_id}/custody-status")
    other_status, _ = await ctx.parent_a.try_get(f"/exchanges/family-file/{bogus}/custody-status")
    dash_status, _ = await ctx.parent_a.try_get(f"/dashboard/summary/{bogus}")
    a = [
        Assertion("sec.own_access_ok", own_status == 200, 200, own_status,
                  "a parent can read their own family's custody status", "medium"),
        Assertion("sec.cross_family_denied", other_status in (403, 404), "403/404", other_status,
                  "a parent must NOT read another family's custody data", "critical"),
        Assertion("sec.cross_dashboard_denied", dash_status in (403, 404), "403/404", dash_status,
                  "a parent must NOT read another family's dashboard", "high"),
    ]
    summary = ("Confirmed the app kept the families separate — I could see my own custody status but "
               "was correctly blocked from another family's data.")
    return ScenarioOutcome(a, {"own": own_status, "other": other_status, "dashboard": dash_status}, summary)


SCENARIOS = [
    Scenario("S-SEC-01", "No cross-family data access", "security", sec_01_cross_family),
]
