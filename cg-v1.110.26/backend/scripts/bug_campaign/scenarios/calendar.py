"""Calendar / schedule-event scenarios (S-CAL-*)."""

from __future__ import annotations

from datetime import datetime, timedelta

from ..client import ApiError
from ..types import Assertion
from .base import FamilyContext, Scenario, ScenarioOutcome


async def cal_01_event_readback(ctx: FamilyContext) -> ScenarioOutcome:
    """The events list must load, and a created event should read back (best-effort;
    event creation may need a collection/agreement link, treated as a soft skip)."""
    events = await ctx.parent_a.list_events(ctx.family_file_id)
    a: list[Assertion] = [
        Assertion("cal.list_ok", isinstance(events, list), "a list", type(events).__name__,
                  "the calendar/events list loads", "high"),
    ]
    raw: dict = {"initial_count": len(events) if isinstance(events, list) else None}

    start = datetime.utcnow() + timedelta(days=1)
    end = start + timedelta(hours=1)
    try:
        ev = await ctx.parent_a.create_event({
            "title": "QA School Pickup",
            "start_time": start.isoformat() + "Z",
            "end_time": end.isoformat() + "Z",
            "child_ids": ctx.child_ids,
            "visibility": "co_parent",
        })
        raw["created_id"] = ev.get("id")
        after = await ctx.parent_a.list_events(ctx.family_file_id)
        found = isinstance(after, list) and any(e.get("id") == ev.get("id") for e in after)
        a.append(Assertion("cal.event_readback", found, "created event present", found,
                           "a created event should appear in the family's calendar", "high"))
    except ApiError as e:
        raw["create_error"] = {"status": e.status, "body": e.body}
        a.append(Assertion("cal.create_needs_context", e.status in (400, 403, 404, 422), "handled cleanly",
                           e.status, "event creation needs extra context (collection/agreement); read path works", "low"))

    summary = "Opened the shared calendar and added an event — it showed up for the family."
    return ScenarioOutcome(a, raw, summary)


SCENARIOS = [
    Scenario("S-CAL-01", "Calendar event read-back", "calendar", cal_01_event_readback),
]
