"""Notification scenarios (S-NOTIF-*)."""

from __future__ import annotations

from ..types import Assertion
from .base import FamilyContext, Scenario, ScenarioOutcome


async def notif_01_list_and_read(ctx: FamilyContext) -> ScenarioOutcome:
    """The notification centre must load, report a valid unread count, and accept mark-read."""
    lst = await ctx.parent_a.list_notifications(limit=10)
    cnt = await ctx.parent_a.notifications_unread_count()
    unread = (cnt or {}).get("unread_count")
    a = [
        Assertion("notif.list_ok", isinstance(lst, dict) and "items" in lst, "an items list",
                  type(lst).__name__, "the notifications endpoint returns a list", "medium"),
        Assertion("notif.count_valid", isinstance(unread, int) and unread >= 0, ">= 0", unread,
                  "unread count is a valid non-negative number", "medium"),
    ]
    mr = await ctx.parent_a.mark_notifications_read([])  # empty = mark all read
    a.append(Assertion("notif.mark_read_ok", isinstance(mr, dict) and "updated" in mr,
                       "an 'updated' count", mr, "mark-read returns a result", "low"))
    summary = f"Opened notifications ({unread} unread) and marked them read without any errors."
    return ScenarioOutcome(a, {"unread": unread, "mark_read": mr}, summary)


SCENARIOS = [
    Scenario("S-NOTIF-01", "Notifications list + mark-read", "notifications", notif_01_list_and_read),
]
