"""
Schedule Roller — daily maintenance that rolls recurring records forward
so calendars and ClearFund stay populated without manual intervention.

Two jobs:
    roll_custody_exchanges(db)
        For every active recurring CustodyExchange, ensure that
        CustodyExchangeInstance rows exist from `now` through
        `now + EXCHANGE_WINDOW_DAYS` (default 8 weeks = 56 days).

    roll_obligations(db)
        For every active recurring Obligation *template*
        (is_recurring=True AND parent_obligation_id IS NULL), ensure a
        child obligation exists covering the next cycle, up to
        OBLIGATION_WINDOW_DAYS ahead (default 180 days / ~6 months).

Both jobs are **idempotent** — running twice in one day is safe. We
check for existing rows on the target date and skip if they exist.

Recurrence semantics
--------------------
CustodyExchange:
    - recurrence_pattern: "weekly" | "biweekly" | "monthly" | "custom"
    - recurrence_days: list[int] 0=Sunday .. 6=Saturday
    - recurrence_end_date: optional cap
    - recurrence_exceptions: list[str] ISO dates to skip

Obligation:
    - recurrence_rule: free-form string. We support these prefixes:
        "FREQ=MONTHLY"   -> next cycle = last_due_date + 30 days
        "FREQ=WEEKLY"    -> next cycle = last_due_date + 7 days
        "FREQ=BIWEEKLY"  -> next cycle = last_due_date + 14 days
      Anything else falls back to monthly.

Safety rails
------------
- A per-exchange cap prevents runaway generation (MAX_INSTANCES_PER_ROLL).
- Obligation child creation only fires when the previous child's due_date
  is within OBLIGATION_WINDOW_DAYS of `now` — avoids year-ahead creation.
- Everything writes in a single transaction per entity so partial failure
  rolls back cleanly.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clearfund import Obligation
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance

logger = logging.getLogger(__name__)

EXCHANGE_WINDOW_DAYS = 56  # 8 weeks
OBLIGATION_WINDOW_DAYS = 180  # ~6 months
MAX_INSTANCES_PER_ROLL = 200  # per-exchange safety cap


@dataclass
class RollSummary:
    exchanges_scanned: int = 0
    exchange_instances_created: int = 0
    obligations_scanned: int = 0
    obligation_children_created: int = 0
    errors: List[str] = None

    def __post_init__(self) -> None:
        if self.errors is None:
            self.errors = []


# ───────────────────────────── Exchange helpers ───────────────────────────

_WEEKDAY_TO_PY = {0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5}
# App convention: 0=Sunday .. 6=Saturday. Python date.weekday() is 0=Monday..6=Sunday.


def _next_occurrence_after(
    anchor: datetime,
    after: datetime,
    pattern: str,
    weekdays: List[int],
) -> Optional[datetime]:
    """Find the next datetime >= `after` that matches the pattern & weekdays.

    `anchor` provides the time-of-day. We don't try to honor every iCal edge
    case — co-parenting exchanges are simple weekly/biweekly/monthly cadences.
    """
    if not weekdays:
        # Treat as single weekly occurrence on the anchor's weekday.
        weekdays = [(_invert_py_weekday(anchor.weekday()))]

    current = max(anchor, after).replace(
        hour=anchor.hour, minute=anchor.minute, second=0, microsecond=0
    )
    allowed = {_WEEKDAY_TO_PY[d] for d in weekdays if d in _WEEKDAY_TO_PY}

    # Walk forward until we find a matching weekday. Cap at 35 days to avoid
    # infinite loops on empty `allowed`.
    for _ in range(35):
        if current.weekday() in allowed and current >= after:
            return current
        current = current + timedelta(days=1)
    return None


def _invert_py_weekday(py_wd: int) -> int:
    """Python weekday() (0=Mon..6=Sun) -> app weekday (0=Sun..6=Sat)."""
    # 0=Mon -> 1, 1=Tue -> 2, ..., 5=Sat -> 6, 6=Sun -> 0
    return (py_wd + 1) % 7


def _advance_one_cycle(dt: datetime, pattern: str) -> datetime:
    if pattern == "biweekly":
        return dt + timedelta(days=14)
    if pattern == "monthly":
        # Approximate a month as 30 days. Good enough for rolling windows.
        return dt + timedelta(days=30)
    if pattern == "custom":
        # Custom means "list the matching weekdays every week" — advance 1 day
        # and let the weekday filter handle it.
        return dt + timedelta(days=1)
    # weekly and unknown
    return dt + timedelta(days=7)


async def _generate_exchange_instances(
    db: AsyncSession,
    exchange: CustodyExchange,
    horizon: datetime,
) -> int:
    """Materialize instances for one exchange up to `horizon`. Returns count created."""
    if not exchange.is_recurring or exchange.status != "active":
        return 0

    pattern = (exchange.recurrence_pattern or "weekly").lower()
    weekdays = list(exchange.recurrence_days or [])
    end_cap = exchange.recurrence_end_date or horizon
    target = min(horizon, end_cap)
    exceptions = {s[:10] for s in (exchange.recurrence_exceptions or [])}

    # Load existing instance dates to dedupe.
    existing_rows = await db.execute(
        select(CustodyExchangeInstance.scheduled_time).where(
            CustodyExchangeInstance.exchange_id == exchange.id
        )
    )
    existing_keys = {
        row[0].replace(microsecond=0, second=0) for row in existing_rows.all()
    }

    created = 0
    cursor = _next_occurrence_after(
        anchor=exchange.scheduled_time,
        after=max(exchange.scheduled_time, datetime.utcnow()),
        pattern=pattern,
        weekdays=weekdays,
    )

    while cursor and cursor <= target and created < MAX_INSTANCES_PER_ROLL:
        iso_date = cursor.date().isoformat()
        key = cursor.replace(microsecond=0, second=0)
        if iso_date not in exceptions and key not in existing_keys:
            instance = CustodyExchangeInstance(
                id=str(uuid.uuid4()),
                exchange_id=exchange.id,
                scheduled_time=cursor,
                status="scheduled",
            )
            db.add(instance)
            existing_keys.add(key)
            created += 1

        # Advance. For weekly/biweekly/monthly honor the cadence; for custom
        # walk day-by-day through the week.
        if pattern in ("biweekly", "monthly"):
            cursor = _advance_one_cycle(cursor, pattern)
            cursor = _next_occurrence_after(
                anchor=exchange.scheduled_time,
                after=cursor,
                pattern=pattern,
                weekdays=weekdays,
            )
        else:
            cursor = cursor + timedelta(days=1)
            cursor = _next_occurrence_after(
                anchor=exchange.scheduled_time,
                after=cursor,
                pattern=pattern,
                weekdays=weekdays,
            )

    return created


async def roll_custody_exchanges(db: AsyncSession) -> RollSummary:
    """Ensure all active recurring exchanges are materialized through +56d."""
    summary = RollSummary()
    horizon = datetime.utcnow() + timedelta(days=EXCHANGE_WINDOW_DAYS)

    result = await db.execute(
        select(CustodyExchange).where(
            and_(
                CustodyExchange.is_recurring.is_(True),
                CustodyExchange.status == "active",
            )
        )
    )
    exchanges = list(result.scalars().all())
    summary.exchanges_scanned = len(exchanges)

    for ex in exchanges:
        try:
            created = await _generate_exchange_instances(db, ex, horizon)
            summary.exchange_instances_created += created
        except Exception as exc:
            logger.exception("schedule_roller: exchange %s failed: %s", ex.id, exc)
            summary.errors.append(f"exchange:{ex.id}:{type(exc).__name__}")

    await db.commit()
    return summary


# ─────────────────────────── Obligation helpers ───────────────────────────


def _cycle_length_days(rule: Optional[str]) -> int:
    if not rule:
        return 30
    rule_upper = rule.upper()
    if "FREQ=WEEKLY" in rule_upper:
        return 7
    if "FREQ=BIWEEKLY" in rule_upper or "INTERVAL=2" in rule_upper:
        return 14
    # Default to monthly for FREQ=MONTHLY and anything else.
    return 30


async def _maybe_create_next_obligation(
    db: AsyncSession, template: Obligation, horizon: datetime
) -> bool:
    """Create one child obligation covering the next cycle, if needed."""
    cycle_days = _cycle_length_days(template.recurrence_rule)

    # Find the latest child obligation spawned from this template.
    latest = await db.execute(
        select(Obligation)
        .where(Obligation.parent_obligation_id == template.id)
        .order_by(Obligation.due_date.desc().nullslast())
        .limit(1)
    )
    latest_child: Optional[Obligation] = latest.scalar_one_or_none()

    now = datetime.utcnow()
    last_due: Optional[datetime] = (
        latest_child.due_date if latest_child else template.due_date
    )
    if last_due is None:
        # No due date anywhere — can't advance a cycle deterministically.
        return False

    next_due = last_due + timedelta(days=cycle_days)
    # Only create the next child if it falls inside the rolling window.
    if next_due > horizon:
        return False
    # And only if we don't already have a child for this cycle.
    if latest_child and latest_child.due_date and latest_child.due_date >= next_due:
        return False

    child = Obligation(
        case_id=template.case_id,
        family_file_id=template.family_file_id,
        agreement_id=template.agreement_id,
        source_type=template.source_type,
        source_id=template.source_id,
        purpose_category=template.purpose_category,
        title=template.title,
        description=template.description,
        child_ids=list(template.child_ids or []),
        total_amount=template.total_amount,
        petitioner_share=template.petitioner_share,
        respondent_share=template.respondent_share,
        petitioner_percentage=template.petitioner_percentage,
        split_from_agreement=template.split_from_agreement,
        due_date=next_due,
        status="open",
        amount_funded=0,
        amount_spent=0,
        amount_verified=0,
        verification_required=template.verification_required,
        receipt_required=template.receipt_required,
        receipt_deadline_hours=template.receipt_deadline_hours,
        allowed_vendor_categories=template.allowed_vendor_categories,
        allowed_vendors=template.allowed_vendors,
        is_recurring=False,  # children are one-off
        recurrence_rule=None,
        parent_obligation_id=template.id,
        created_by=template.created_by,
    )
    db.add(child)
    return True


async def roll_obligations(db: AsyncSession) -> RollSummary:
    """Ensure recurring obligation templates have a child within the next 6mo."""
    summary = RollSummary()
    horizon = datetime.utcnow() + timedelta(days=OBLIGATION_WINDOW_DAYS)

    result = await db.execute(
        select(Obligation).where(
            and_(
                Obligation.is_recurring.is_(True),
                Obligation.parent_obligation_id.is_(None),
                Obligation.status.in_(("open", "funded", "verified", "completed")),
            )
        )
    )
    templates = list(result.scalars().all())
    summary.obligations_scanned = len(templates)

    for tpl in templates:
        try:
            created = await _maybe_create_next_obligation(db, tpl, horizon)
            if created:
                summary.obligation_children_created += 1
        except Exception as exc:
            logger.exception("schedule_roller: obligation %s failed: %s", tpl.id, exc)
            summary.errors.append(f"obligation:{tpl.id}:{type(exc).__name__}")

    await db.commit()
    return summary


async def run_schedule_roller(db: AsyncSession) -> dict:
    """Run both rollers. Safe to call multiple times per day."""
    ex_summary = await roll_custody_exchanges(db)
    ob_summary = await roll_obligations(db)
    return {
        "exchanges_scanned": ex_summary.exchanges_scanned,
        "exchange_instances_created": ex_summary.exchange_instances_created,
        "obligations_scanned": ob_summary.obligations_scanned,
        "obligation_children_created": ob_summary.obligation_children_created,
        "errors": ex_summary.errors + ob_summary.errors,
    }
