"""GPS / geofence Silent Handoff scenarios (S-GEO-*)."""

from __future__ import annotations

from .. import oracle
from ..types import Assertion
from .base import (
    DEFAULT_CENTER_LAT, DEFAULT_CENTER_LNG, FamilyContext, Scenario, ScenarioOutcome,
    create_handoff, offset_coord,
)

CENTER = (DEFAULT_CENTER_LAT, DEFAULT_CENTER_LNG)


def _window_assert(ws: dict) -> Assertion:
    return Assertion(
        "window.open", ws.get("is_within_window") is True, True, ws.get("is_within_window"),
        "the just-created instance must be inside its check-in window now", "high",
    )


async def _two_party_gps(
    ctx: FamilyContext, *, radius: int, dist_m: float, acc: float,
    expect_complete: bool, title: str,
) -> ScenarioOutcome:
    """Both parents GPS check-in at the same point `dist_m` from center."""
    clat, clng = CENTER
    exchange, inst = await create_handoff(ctx, radius_m=radius, title=title)
    iid = inst["id"]
    a: list[Assertion] = []

    ws = await ctx.parent_a.window_status(iid)
    a.append(_window_assert(ws))

    ci_lat, ci_lng = offset_coord(clat, clng, dist_m, bearing_deg=90) if dist_m else (clat, clng)

    r1 = await ctx.parent_a.check_in_gps(iid, ci_lat, ci_lng, acc)
    a += oracle.gps_checkin_assertions(
        r1, "from", geofence_lat=clat, geofence_lng=clng, radius_m=radius,
        sub_lat=ci_lat, sub_lng=ci_lng, sub_acc=acc,
    )
    a += oracle.one_party_assertions(r1)

    r2 = await ctx.parent_b.check_in_gps(iid, ci_lat, ci_lng, acc)
    a += oracle.gps_checkin_assertions(
        r2, "to", geofence_lat=clat, geofence_lng=clng, radius_m=radius,
        sub_lat=ci_lat, sub_lng=ci_lng, sub_acc=acc,
    )
    if expect_complete:
        a += oracle.completion_assertions(r2)
        cs = await ctx.parent_a.custody_status(ctx.family_file_id)
        a.append(oracle.custody_flip_assertion(cs, ctx.child_ids[0], ctx.parent_b.user_id))
        raw_cs = cs
    else:
        raw_cs = None

    in_fence = bool(r2.get("to_parent_in_geofence"))
    summary = (
        f"Both parents checked in {int(dist_m)} m from the pickup point "
        f"(radius {radius} m, accuracy {int(acc)} m). "
        f"{'Inside' if in_fence else 'Outside'} the geofence; "
        f"exchange {'completed and custody moved to parent B' if expect_complete else 'did not complete'}."
    )
    return ScenarioOutcome(a, {"from": r1, "to": r2, "window": ws, "custody_status": raw_cs}, summary)


async def geo_01_inside(ctx: FamilyContext) -> ScenarioOutcome:
    return await _two_party_gps(ctx, radius=100, dist_m=0, acc=5, expect_complete=True,
                                title="S-GEO-01 inside geofence")


async def geo_02_just_outside(ctx: FamilyContext) -> ScenarioOutcome:
    # 120 m out, radius 100, acc 5 -> eff 105 -> OUTSIDE, but both tap -> completes.
    return await _two_party_gps(ctx, radius=100, dist_m=120, acc=5, expect_complete=True,
                                title="S-GEO-02 just outside geofence")


async def geo_03_low_accuracy_rescued(ctx: FamilyContext) -> ScenarioOutcome:
    # 130 m out, radius 100, acc 60 -> capped 50 -> eff 150 -> INSIDE (proves the buffer).
    return await _two_party_gps(ctx, radius=100, dist_m=130, acc=60, expect_complete=True,
                                title="S-GEO-03 low-accuracy rescued by 50m buffer")


async def geo_04_accuracy_above_cap(ctx: FamilyContext) -> ScenarioOutcome:
    # 160 m out, radius 100, acc 200 -> eff 150 -> OUTSIDE (proves the cap ceiling).
    return await _two_party_gps(ctx, radius=100, dist_m=160, acc=200, expect_complete=True,
                                title="S-GEO-04 accuracy above 50m cap not rescued")


async def geo_05_way_outside(ctx: FamilyContext) -> ScenarioOutcome:
    """Check in in a different city — asserts data accuracy over a huge distance."""
    clat, clng = CENTER
    radius = 100
    exchange, inst = await create_handoff(ctx, radius_m=radius, title="S-GEO-05 wrong city")
    iid = inst["id"]
    a: list[Assertion] = []
    ws = await ctx.parent_a.window_status(iid)
    a.append(_window_assert(ws))
    # New York City
    nyc_lat, nyc_lng = 40.7128, -74.0060
    r1 = await ctx.parent_a.check_in_gps(iid, nyc_lat, nyc_lng, 10)
    a += oracle.gps_checkin_assertions(
        r1, "from", geofence_lat=clat, geofence_lng=clng, radius_m=radius,
        sub_lat=nyc_lat, sub_lng=nyc_lng, sub_acc=10,
    )
    # distance should be ~4,000 km and clearly out of fence
    a.append(Assertion(
        "far.distance_large", (r1.get("from_parent_distance_meters") or 0) > 1_000_000,
        "> 1000 km", r1.get("from_parent_distance_meters"),
        "a wrong-city check-in must record a very large distance", "high",
    ))
    summary = ("A parent checked in from a different city entirely. The system recorded the "
               "true distance and marked it outside the geofence — but note it still accepts "
               "the check-in without warning (possible UX gap).")
    return ScenarioOutcome(a, {"from": r1, "window": ws}, summary)


async def geo_06_one_party(ctx: FamilyContext) -> ScenarioOutcome:
    """Only the from-parent checks in; must NOT complete or CHANGE custody.

    Scenarios share family state, so we capture the custodian BEFORE the check-in
    and assert it is UNCHANGED afterward (not merely 'not parent B')."""
    clat, clng = CENTER
    radius = 100
    cs_before = await ctx.parent_a.custody_status(ctx.family_file_id)
    child_before = next((c for c in cs_before.get("children", []) if c.get("child_id") == ctx.child_ids[0]), {})
    custodian_before = child_before.get("current_parent_id")

    exchange, inst = await create_handoff(ctx, radius_m=radius, title="S-GEO-06 one party only")
    iid = inst["id"]
    a: list[Assertion] = []
    r1 = await ctx.parent_a.check_in_gps(iid, clat, clng, 5)
    a += oracle.gps_checkin_assertions(
        r1, "from", geofence_lat=clat, geofence_lng=clng, radius_m=radius,
        sub_lat=clat, sub_lng=clng, sub_acc=5,
    )
    a += oracle.one_party_assertions(r1)
    cs = await ctx.parent_a.custody_status(ctx.family_file_id)
    child = next((c for c in cs.get("children", []) if c.get("child_id") == ctx.child_ids[0]), {})
    a.append(Assertion(
        "custody.unchanged", child.get("current_parent_id") == custodian_before,
        custodian_before, child.get("current_parent_id"),
        "a single-party (incomplete) handoff must not change the custodian", "high",
    ))
    summary = "Only one parent showed up and checked in. The exchange stayed open and custody did not change."
    return ScenarioOutcome(a, {"from": r1, "custody_before": cs_before, "custody_status": cs}, summary)


async def geo_08_mixed_sources(ctx: FamilyContext) -> ScenarioOutcome:
    """From-parent GPS (in-fence) + to-parent manual tap -> completes."""
    clat, clng = CENTER
    radius = 100
    exchange, inst = await create_handoff(ctx, radius_m=radius, title="S-GEO-08 mixed sources")
    iid = inst["id"]
    a: list[Assertion] = []
    r1 = await ctx.parent_a.check_in_gps(iid, clat, clng, 5)
    a += oracle.gps_checkin_assertions(
        r1, "from", geofence_lat=clat, geofence_lng=clng, radius_m=radius,
        sub_lat=clat, sub_lng=clng, sub_acc=5,
    )
    r2 = await ctx.parent_b.check_in_manual(iid, notes="Tapped to confirm at the door")
    # The manual check-in endpoint does not return handoff_outcome, so don't require it.
    a += oracle.completion_assertions(r2, require_outcome=False)
    cs = await ctx.parent_a.custody_status(ctx.family_file_id)
    a.append(oracle.custody_flip_assertion(cs, ctx.child_ids[0], ctx.parent_b.user_id))
    summary = "One parent used a silent GPS check-in and the other tapped to confirm; the exchange still completed cleanly."
    return ScenarioOutcome(a, {"from": r1, "to": r2, "custody_status": cs}, summary)


SCENARIOS = [
    Scenario("S-GEO-01", "Silent handoff inside geofence", "exchange", geo_01_inside),
    Scenario("S-GEO-02", "Just outside geofence", "exchange", geo_02_just_outside),
    Scenario("S-GEO-03", "Low-accuracy rescued by 50m buffer", "exchange", geo_03_low_accuracy_rescued),
    Scenario("S-GEO-04", "Accuracy above cap not rescued", "exchange", geo_04_accuracy_above_cap),
    Scenario("S-GEO-05", "Way outside (wrong city)", "exchange", geo_05_way_outside),
    Scenario("S-GEO-06", "One parent only", "exchange", geo_06_one_party),
    Scenario("S-GEO-08", "Mixed sources complete", "exchange", geo_08_mixed_sources),
]
