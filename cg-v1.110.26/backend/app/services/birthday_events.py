"""
Wave 3 C15 — Birthday event generator.

For every active child with a `date_of_birth`, ensure a `ScheduleEvent`
of type "birthday" exists for the NEXT upcoming birthday within the
active family file's calendar. Idempotent — re-running the same day is
a no-op. Run from the daily scheduler.

Why we create an event rather than compute on-the-fly:
    - Birthdays show up on the shared calendar next to custody blocks
      without a special-case UI branch.
    - Parents can add notes / attendance / location per-year.
    - Court exports pick them up via the existing schedule event pipeline.

Idempotency key: (family_file_id, child_id, birthday_date.year).
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import List, Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.child import Child
from app.models.family_file import FamilyFile
from app.models.schedule import ScheduleEvent

logger = logging.getLogger(__name__)

WINDOW_DAYS = 400  # a little over a year — always covers the next birthday


def _next_birthday(today: date, dob: date) -> Optional[date]:
    """Return the next occurrence of dob's month/day on or after today."""
    if dob is None:
        return None
    try:
        candidate = dob.replace(year=today.year)
    except ValueError:
        # Feb 29 born in a non-leap year — bump to Feb 28.
        candidate = date(today.year, dob.month, 28 if dob.day == 29 else dob.day)
    if candidate < today:
        try:
            candidate = dob.replace(year=today.year + 1)
        except ValueError:
            candidate = date(today.year + 1, dob.month, 28 if dob.day == 29 else dob.day)
    return candidate


async def generate_birthday_events(db: AsyncSession) -> dict:
    """Create any missing birthday events for children across all family files."""
    today = datetime.utcnow().date()

    child_rows = await db.execute(
        select(Child).where(
            and_(
                Child.is_active.is_(True),
                Child.date_of_birth.is_not(None),
            )
        )
    )
    children: List[Child] = list(child_rows.scalars().all())

    created = 0
    skipped = 0
    errors: List[str] = []

    for child in children:
        if not child.family_file_id:
            skipped += 1
            continue

        next_bd = _next_birthday(today, child.date_of_birth)
        if next_bd is None or (next_bd - today).days > WINDOW_DAYS:
            skipped += 1
            continue

        # Confirm a birthday event for this year doesn't already exist.
        window_start = datetime.combine(next_bd, datetime.min.time())
        window_end = datetime.combine(next_bd, datetime.max.time())
        existing = await db.execute(
            select(ScheduleEvent.id).where(
                and_(
                    ScheduleEvent.family_file_id == child.family_file_id,
                    ScheduleEvent.event_type == "birthday",
                    ScheduleEvent.start_time >= window_start,
                    ScheduleEvent.start_time <= window_end,
                    ScheduleEvent.child_ids.contains([str(child.id)]),
                )
            )
        )
        if existing.first():
            skipped += 1
            continue

        ff = await db.execute(select(FamilyFile).where(FamilyFile.id == child.family_file_id))
        family_file = ff.scalar_one_or_none()
        if not family_file:
            skipped += 1
            continue

        try:
            event = ScheduleEvent(
                family_file_id=str(child.family_file_id),
                event_type="birthday",
                event_category="general",
                category_data={
                    "birthday_child_id": str(child.id),
                    "turning_age": next_bd.year - child.date_of_birth.year,
                },
                start_time=window_start,
                end_time=window_end,
                all_day=True,
                custodial_parent_id=str(family_file.parent_a_id or ""),
                child_ids=[str(child.id)],
                title=f"{child.first_name}'s birthday",
                description=None,
                visibility="co_parent",
                location_shared=False,
            )
            db.add(event)
            created += 1
        except Exception as exc:  # noqa: BLE001
            logger.exception("birthday_events: child %s failed: %s", child.id, exc)
            errors.append(f"child:{child.id}:{type(exc).__name__}")

    await db.commit()
    return {
        "scanned": len(children),
        "created": created,
        "skipped": skipped,
        "errors": errors,
    }
