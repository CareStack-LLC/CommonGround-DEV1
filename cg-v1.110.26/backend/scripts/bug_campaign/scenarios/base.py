"""Scenario base types + shared helpers (exchange creation, geo offsets)."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Awaitable, Callable, Optional

from ..client import ParentAgentClient
from ..tester_client import TesterClient
from ..types import Assertion

# A fixed, neutral test location (a park). All handoff scenarios geofence here.
DEFAULT_CENTER_LAT = 37.7749
DEFAULT_CENTER_LNG = -122.4194


@dataclass
class FamilyContext:
    family_id: str
    family_file_id: str
    parent_a: ParentAgentClient          # creator / "from" parent
    parent_b: ParentAgentClient          # "to" parent
    child_ids: list[str]
    tester: Optional[TesterClient] = None
    day: int = 0
    label: str = ""

    @property
    def case_id(self) -> str:
        return self.family_file_id


@dataclass
class ScenarioOutcome:
    assertions: list[Assertion] = field(default_factory=list)
    raw: dict = field(default_factory=dict)
    summary: str = ""                     # plain-language outcome for the narrator


@dataclass
class Scenario:
    id: str
    title: str
    feature: str
    run: Callable[[FamilyContext], Awaitable[ScenarioOutcome]]


# ---- geo helper ------------------------------------------------------------
def offset_coord(lat: float, lng: float, dist_m: float, bearing_deg: float = 0.0) -> tuple[float, float]:
    """Return a coordinate `dist_m` meters from (lat,lng) along `bearing_deg`."""
    R = 6371000.0
    d = dist_m / R
    brng = math.radians(bearing_deg)
    phi1 = math.radians(lat)
    lam1 = math.radians(lng)
    phi2 = math.asin(math.sin(phi1) * math.cos(d) + math.cos(phi1) * math.sin(d) * math.cos(brng))
    lam2 = lam1 + math.atan2(
        math.sin(brng) * math.sin(d) * math.cos(phi1),
        math.cos(d) - math.sin(phi1) * math.sin(phi2),
    )
    return round(math.degrees(phi2), 7), round(math.degrees(lam2), 7)


# ---- exchange creation helper ---------------------------------------------
async def create_handoff(
    ctx: FamilyContext, *,
    center_lat: float = DEFAULT_CENTER_LAT, center_lng: float = DEFAULT_CENTER_LNG,
    radius_m: int = 100, scheduled_offset_min: int = 0,
    window_before: int = 60, window_after: int = 60,
    silent: bool = True, title: str = "QA handoff", reverse: bool = False,
) -> tuple[dict, dict]:
    """
    Create a silent-handoff exchange timed to now and return (exchange,
    instance). Default direction is A -> B; reverse=True makes it B -> A.
    Creating the exchange auto-generates an instance at the scheduled time; we
    fetch it so it can be checked into immediately.
    """
    from_client = ctx.parent_b if reverse else ctx.parent_a
    to_client = ctx.parent_a if reverse else ctx.parent_b
    scheduled = datetime.utcnow() + timedelta(minutes=scheduled_offset_min)
    payload = {
        "case_id": ctx.family_file_id,
        "exchange_type": "both",
        "title": title,
        "from_parent_id": from_client.user_id,
        "to_parent_id": to_client.user_id,
        "pickup_child_ids": ctx.child_ids,
        "location": "QA Test Location",
        "location_lat": center_lat,
        "location_lng": center_lng,
        "geofence_radius_meters": radius_m,
        "check_in_window_before_minutes": window_before,
        "check_in_window_after_minutes": window_after,
        "silent_handoff_enabled": silent,
        "scheduled_time": scheduled.isoformat() + "Z",
        "duration_minutes": 30,
        "is_recurring": False,
    }
    exchange = await from_client.create_exchange(payload)
    instances = await from_client.list_upcoming(ctx.case_id, limit=50)
    match = [i for i in instances if i.get("exchange_id") == exchange["id"]]
    if not match:
        # Fall back to history (covers past-scheduled instances)
        hist = await from_client.get_exchange_history(ctx.case_id, days=1, upcoming_days=1)
        match = [i for i in hist if i.get("exchange_id") == exchange["id"]]
    if not match:
        raise RuntimeError(f"No instance generated for exchange {exchange['id']}")
    match.sort(key=lambda i: i.get("scheduled_time", ""))
    return exchange, match[0]
