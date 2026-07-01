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
    """A landmark/POI. Precise Mapbox coords vary by which match wins, so we test
    the app's geocode plumbing (valid coords + a valid accuracy bucket), not Mapbox precision."""
    resp = await ctx.parent_a.geocode("Central Park, New York, NY")
    lat, lng = resp.get("latitude"), resp.get("longitude")
    a = [
        Assertion("geocode.coords_present", isinstance(lat, (int, float)) and isinstance(lng, (int, float)),
                  "valid lat/lng", {"lat": lat, "lng": lng}, "geocode returns usable coordinates", "medium"),
        Assertion("geocode.bucket_valid", resp.get("accuracy") in {"exact", "approximate", "fallback"},
                  "exact|approximate|fallback", resp.get("accuracy"), "accuracy is a known bucket", "low"),
    ]
    return ScenarioOutcome(a, {"geocode": resp},
                           f"Geocoded a landmark/POI to {lat},{lng} ({resp.get('accuracy')}).")


async def geoc_03_fallback(ctx: FamilyContext) -> ScenarioOutcome:
    """Ambiguous input: any graceful outcome (400 or a valid bucket) is acceptable."""
    try:
        resp = await ctx.parent_a.geocode("Springfield")
    except ApiError as e:
        return ScenarioOutcome(
            [Assertion("geocode.ambiguous_handled", e.status == 400, "400 or a valid bucket", e.status,
                       "ambiguous address handled gracefully", "low")],
            {"geocode_error": {"status": e.status, "body": e.body}},
            "An ambiguous place name was rejected cleanly with a 400 instead of a bad guess.",
        )
    a = [Assertion(
        "geocode.ambiguous_handled",
        resp.get("accuracy") in {"exact", "approximate", "fallback"}, "a valid bucket",
        resp.get("accuracy"), "ambiguous address resolves to a known accuracy bucket", "low",
    )]
    return ScenarioOutcome(a, {"geocode": resp},
                           f"An ambiguous place name resolved with accuracy '{resp.get('accuracy')}'.")


SCENARIOS = [
    Scenario("S-GEOC-01", "Geocode exact address", "geocode", geoc_01_exact),
    Scenario("S-GEOC-02", "Geocode approximate/POI", "geocode", geoc_02_approx),
    Scenario("S-GEOC-03", "Geocode fallback/ambiguous", "geocode", geoc_03_fallback),
]
