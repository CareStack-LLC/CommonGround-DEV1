"""
The Oracle — turns API responses into ground-truth Assertions.

Everything here recomputes the expected value independently (via geo_oracle /
custody_oracle) and compares to what the API returned/stored. A failed
assertion is, by construction, a real accuracy bug.
"""

from __future__ import annotations

from typing import Any, Optional

from . import geo_oracle
from .types import Assertion

DISTANCE_TOL_M = 1.0        # Haversine parity should be near-exact
COORD_TOL_DEG = 1e-6        # stored lat/lng must echo submission
PCT_TOL = 1.0               # custody percentage tolerance (percentage points)


def _num(v: Any) -> Optional[float]:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


# ---- GPS / geofence --------------------------------------------------------
def gps_checkin_assertions(
    resp: dict, side: str, *,
    geofence_lat: float, geofence_lng: float, radius_m: float,
    sub_lat: float, sub_lng: float, sub_acc: float,
) -> list[Assertion]:
    """side ∈ {'from','to'}. Assert the API's stored GPS data matches local truth."""
    exp_in, exp_dist = geo_oracle.is_within_geofence(
        sub_lat, sub_lng, geofence_lat, geofence_lng, radius_m, sub_acc
    )
    p = f"{side}_parent"
    out: list[Assertion] = []

    actual_dist = _num(resp.get(f"{p}_distance_meters"))
    out.append(Assertion(
        name=f"{side}.distance_m",
        ok=actual_dist is not None and abs(actual_dist - exp_dist) <= DISTANCE_TOL_M,
        expected=round(exp_dist, 3), actual=actual_dist,
        detail=f"Haversine parity within {DISTANCE_TOL_M} m", severity="high",
    ))

    actual_in = resp.get(f"{p}_in_geofence")
    out.append(Assertion(
        name=f"{side}.in_geofence",
        ok=actual_in == exp_in,
        expected=exp_in, actual=actual_in,
        detail=f"effective_radius = {radius_m} + min({sub_acc},50)", severity="high",
    ))

    a_lat, a_lng = _num(resp.get(f"{p}_check_in_lat")), _num(resp.get(f"{p}_check_in_lng"))
    out.append(Assertion(
        name=f"{side}.gps_echo",
        ok=(a_lat is not None and a_lng is not None
            and abs(a_lat - sub_lat) <= COORD_TOL_DEG and abs(a_lng - sub_lng) <= COORD_TOL_DEG),
        expected={"lat": sub_lat, "lng": sub_lng}, actual={"lat": a_lat, "lng": a_lng},
        detail="stored coords echo the submission", severity="medium",
    ))

    a_acc = _num(resp.get(f"{p}_device_accuracy"))
    out.append(Assertion(
        name=f"{side}.accuracy_echo",
        ok=a_acc is not None and abs(a_acc - sub_acc) <= 0.5,
        expected=sub_acc, actual=a_acc, detail="stored accuracy echoes submission", severity="low",
    ))
    return out


def one_party_assertions(resp: dict) -> list[Assertion]:
    """After exactly one check-in: not completed, outcome one_party_present."""
    return [
        Assertion(
            name="single.not_completed", ok=resp.get("status") != "completed",
            expected="!= completed", actual=resp.get("status"),
            detail="one check-in must not complete the exchange", severity="critical",
        ),
        Assertion(
            name="single.handoff_outcome",
            ok=resp.get("handoff_outcome") in {"one_party_present", "pending", None},
            expected="one_party_present|pending", actual=resp.get("handoff_outcome"),
            detail="outcome reflects only one party present", severity="high",
        ),
    ]


def completion_assertions(resp: dict, *, require_outcome: bool = True) -> list[Assertion]:
    """After both check-ins: completed + completed_at (+ outcome when the
    responding endpoint returns it — the manual check-in endpoint does not)."""
    out = [
        Assertion(
            name="both.status_completed", ok=resp.get("status") == "completed",
            expected="completed", actual=resp.get("status"),
            detail="both check-ins must auto-complete", severity="critical",
        ),
        Assertion(
            name="both.completed_at_set", ok=bool(resp.get("completed_at")),
            expected="not null", actual=resp.get("completed_at"),
            detail="completed_at recorded", severity="high",
        ),
    ]
    if require_outcome:
        out.append(Assertion(
            name="both.handoff_outcome", ok=resp.get("handoff_outcome") == "completed",
            expected="completed", actual=resp.get("handoff_outcome"), severity="high",
        ))
    return out


def custody_flip_assertion(custody_status: dict, child_id: str, expected_parent_id: str) -> Assertion:
    """After a completed exchange, the child's current custodian must be `to_parent`."""
    child = next((c for c in custody_status.get("children", []) if c.get("child_id") == child_id), None)
    actual = child.get("current_parent_id") if child else None
    return Assertion(
        name="custody.flip", ok=actual == expected_parent_id,
        expected=expected_parent_id, actual=actual,
        detail="completed exchange transfers custody to the receiving parent", severity="critical",
    )


def no_flip_assertion(custody_status: dict, child_id: str, prior_parent_id: Optional[str]) -> Assertion:
    child = next((c for c in custody_status.get("children", []) if c.get("child_id") == child_id), None)
    actual = child.get("current_parent_id") if child else None
    return Assertion(
        name="custody.no_flip", ok=(prior_parent_id is None) or (actual == prior_parent_id),
        expected=prior_parent_id, actual=actual,
        detail="an incomplete handoff must NOT transfer custody", severity="high",
    )


# ---- geocode ---------------------------------------------------------------
def geocode_assertions(resp: dict, *, exp_lat: float, exp_lng: float,
                       tol_m: float, exp_accuracy: Optional[str]) -> list[Assertion]:
    a_lat, a_lng = _num(resp.get("latitude")), _num(resp.get("longitude"))
    out: list[Assertion] = []
    if a_lat is None or a_lng is None:
        out.append(Assertion("geocode.coords", False, "coords", resp, "no coordinates returned", "medium"))
        return out
    dist = geo_oracle.haversine_m(a_lat, a_lng, exp_lat, exp_lng)
    out.append(Assertion(
        name="geocode.coords_near", ok=dist <= tol_m,
        expected=f"<= {tol_m} m from ({exp_lat},{exp_lng})", actual=round(dist, 1),
        detail="geocoded point close to known ground truth", severity="medium",
    ))
    if exp_accuracy:
        out.append(Assertion(
            name="geocode.accuracy_bucket", ok=resp.get("accuracy") == exp_accuracy,
            expected=exp_accuracy, actual=resp.get("accuracy"), severity="low",
        ))
    return out


# ---- custody reporting -----------------------------------------------------
def custody_stats_assertions(stats: dict, *, exp_a_pct: float, exp_b_pct: float) -> list[Assertion]:
    pa = (stats.get("parent_a") or {})
    pb = (stats.get("parent_b") or {})
    agreed = (stats.get("agreed_schedule") or {})
    variance = (stats.get("variance") or {})
    a_pct, b_pct = _num(pa.get("percentage")), _num(pb.get("percentage"))

    out = [
        Assertion(
            name="stats.parent_a_pct",
            ok=a_pct is not None and abs(a_pct - exp_a_pct) <= PCT_TOL,
            expected=exp_a_pct, actual=a_pct, detail=f"within ±{PCT_TOL} pt", severity="high",
        ),
        Assertion(
            name="stats.parent_b_pct",
            ok=b_pct is not None and abs(b_pct - exp_b_pct) <= PCT_TOL,
            expected=exp_b_pct, actual=b_pct, detail=f"within ±{PCT_TOL} pt", severity="high",
        ),
    ]

    # Variance must equal (actual - agreed) using the API's OWN agreed baseline.
    agreed_a = _num(agreed.get("parent_a_percentage"))
    var_a = _num(variance.get("parent_a"))
    if a_pct is not None and agreed_a is not None and var_a is not None:
        out.append(Assertion(
            name="stats.variance_consistent",
            ok=abs(var_a - (a_pct - agreed_a)) <= 0.5,
            expected=round(a_pct - agreed_a, 1), actual=var_a,
            detail="variance == actual - agreed (self-consistent)", severity="high",
        ))
    return out


def quality_score_assertion(timeline: dict, expected: int) -> Assertion:
    actual = timeline.get("quality_score")
    return Assertion(
        name="timeline.quality_score",
        ok=isinstance(actual, int) and abs(actual - expected) <= 1,
        expected=expected, actual=actual,
        detail="fully-driven days should score court-grade", severity="high",
    )
