"""Geocode accuracy scenarios (S-GEOC-*). Feature tag 'geocode' so the runner
can skip them when Mapbox is unavailable."""

from __future__ import annotations

from .. import oracle
from ..client import ApiError
from ..types import Assertion
from .base import FamilyContext, Scenario, ScenarioOutcome


async def geoc_01_exact(ctx: FamilyContext) -> ScenarioOutcome:
    resp = await ctx.parent_a.geocode("1600 Amphitheatre Parkway, Mountain View, CA 94043")
    a = oracle.geocode_assertions(resp, exp_lat=37.4224, exp_lng=-122.0842,
                                  tol_m=250, exp_accuracy="exact")
    return ScenarioOutcome(a, {"geocode": resp},
                           f"Geocoded a precise street address to {resp.get('latitude')},{resp.get('longitude')} ({resp.get('accuracy')}).")


async def geoc_02_approx(ctx: FamilyContext) -> ScenarioOutcome:
    resp = await ctx.parent_a.geocode("Central Park, New York, NY")
    # POI relevance varies; assert coords near truth, accuracy bucket is soft (low severity).
    a = oracle.geocode_assertions(resp, exp_lat=40.7829, exp_lng=-73.9654,
                                  tol_m=1500, exp_accuracy=None)
    return ScenarioOutcome(a, {"geocode": resp},
                           f"Geocoded a landmark/POI to {resp.get('latitude')},{resp.get('longitude')} ({resp.get('accuracy')}).")


async def geoc_03_fallback(ctx: FamilyContext) -> ScenarioOutcome:
    """Ambiguous input: either a graceful 400 or a 'fallback' bucket is acceptable."""
    try:
        resp = await ctx.parent_a.geocode("Springfield")
    except ApiError as e:
        ok = e.status == 400
        return ScenarioOutcome(
            [Assertion("geocode.ambiguous_handled", ok, "400 or fallback", e.status,
                       "ambiguous address handled gracefully", "low")],
            {"geocode_error": {"status": e.status, "body": e.body}},
            "An ambiguous place name was rejected cleanly with a 400 instead of a bad guess.",
        )
    a = [Assertion(
        "geocode.ambiguous_handled",
        resp.get("accuracy") in {"approximate", "fallback"}, "approximate|fallback",
        resp.get("accuracy"), "ambiguous address returns a low-confidence bucket", "low",
    )]
    return ScenarioOutcome(a, {"geocode": resp},
                           f"An ambiguous place name resolved with accuracy '{resp.get('accuracy')}'.")


SCENARIOS = [
    Scenario("S-GEOC-01", "Geocode exact address", "geocode", geoc_01_exact),
    Scenario("S-GEOC-02", "Geocode approximate/POI", "geocode", geoc_02_approx),
    Scenario("S-GEOC-03", "Geocode fallback/ambiguous", "geocode", geoc_03_fallback),
]
