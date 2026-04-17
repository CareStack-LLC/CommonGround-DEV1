"""
APScheduler wrapper for background maintenance jobs.

Currently registers a single job:
    - daily_room_cleanup: sweeps abandoned KidComs sessions every
      DAILY_ROOM_CLEANUP_INTERVAL_MIN minutes (default 15).

The scheduler is started from the FastAPI lifespan startup hook and
stopped on shutdown. Each job runs in the event loop with its own
AsyncSessionLocal() session — there is no request context here.

Env knobs (read from app.core.config.settings with sensible fallbacks):
    DAILY_ROOM_CLEANUP_INTERVAL_MIN   How often the sweep runs (minutes).
    DAILY_ROOM_ABANDON_THRESHOLD_MIN  How old a session must be before
                                      it is considered abandoned.
"""

from __future__ import annotations

import logging
from typing import Optional

import sentry_sdk
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.services.daily_room_cleaner import cleanup_abandoned_sessions
from app.services.aria_session_memory import cleanup_old_sessions as aria_cleanup_old_sessions
from app.services.birthday_events import generate_birthday_events
from app.services.schedule_roller import run_schedule_roller
from app.services.custody_exchange import CustodyExchangeService

logger = logging.getLogger(__name__)


# Module-level singleton. Created lazily so test processes that never
# call start_scheduler() do not spin up a background loop.
_scheduler: Optional[AsyncIOScheduler] = None


def _interval_minutes() -> int:
    """Cron interval in minutes — default 15."""
    return int(getattr(settings, "DAILY_ROOM_CLEANUP_INTERVAL_MIN", 15))


async def _run_birthday_event_generator() -> None:
    """Wave 3 C15: ensure upcoming birthday events exist for each active child."""
    try:
        async with AsyncSessionLocal() as db:
            try:
                summary = await generate_birthday_events(db)
            except Exception:
                await db.rollback()
                raise
        logger.info("scheduler: birthday_events result=%s", summary)
    except Exception as exc:  # noqa: BLE001
        logger.exception("scheduler: birthday_events failed: %s", exc)
        sentry_sdk.capture_exception(exc)


async def _run_aria_memory_cleanup() -> None:
    """Wave 3 C12: purge ARIA session-memory rows older than 90 days.

    Idempotent — re-running the same day deletes 0 additional rows.
    """
    try:
        async with AsyncSessionLocal() as db:
            try:
                removed = await aria_cleanup_old_sessions(db)
            except Exception:
                await db.rollback()
                raise
        logger.info("scheduler: aria_memory_cleanup removed=%d rows", removed)
    except Exception as exc:  # noqa: BLE001
        logger.exception("scheduler: aria_memory_cleanup failed: %s", exc)
        sentry_sdk.capture_exception(exc)


async def _run_schedule_roller() -> None:
    """Rolls custody exchanges (+8w) and recurring obligations (+6mo) forward.

    Idempotent — running twice in one day is safe; existing rows are skipped.
    Any exception is logged + reported; never re-raised.
    """
    try:
        async with AsyncSessionLocal() as db:
            try:
                summary = await run_schedule_roller(db)
            except Exception:
                await db.rollback()
                raise
        logger.info("scheduler: schedule_roller result=%s", summary)
    except Exception as exc:  # noqa: BLE001
        logger.exception("scheduler: schedule_roller failed: %s", exc)
        sentry_sdk.capture_exception(exc)


async def _run_auto_close_expired_exchanges() -> None:
    """
    Court-ready custody tracking: auto-close exchange instances whose
    check-in window has expired.

    Without this, instances stay in ``scheduled`` forever and never get a
    final outcome — compliance totals are perpetually incomplete. Runs
    every 5 minutes so a missed handoff is surfaced quickly on the
    dashboard.

    Promotion to ``completed`` passes through ``_guard_completion`` (see
    ADR-001 / the court_ready_exchange_integrity migration), so any row
    that fails the evidence chain falls through to ``disputed`` with an
    audit breadcrumb instead of silently sliding to ``completed``.
    """
    try:
        async with AsyncSessionLocal() as db:
            try:
                # auto_close_expired_windows commits internally.
                closed = await CustodyExchangeService.auto_close_expired_windows(db)
            except Exception:
                await db.rollback()
                raise
        if closed:
            logger.info("scheduler: auto_close_expired_exchanges closed=%d", closed)
    except Exception as exc:  # noqa: BLE001 — never kill the scheduler
        logger.exception("scheduler: auto_close_expired_exchanges failed: %s", exc)
        sentry_sdk.capture_exception(exc)


async def _run_alert_evaluator_tick() -> None:
    """Wave 6 Phase C: evaluate all enabled AlertRules every 5 minutes.

    The evaluator opens its own session internally; we just log results
    and swallow exceptions so APScheduler continues scheduling future
    runs even if the alert system is temporarily broken.
    """
    try:
        from app.services.alert_evaluator import run_alert_evaluator
        summary = await run_alert_evaluator()
        if summary.get("transitions", 0) > 0 or summary.get("errors"):
            logger.info("scheduler: alert_evaluator result=%s", summary)
    except Exception as exc:  # noqa: BLE001
        logger.exception("scheduler: alert_evaluator failed: %s", exc)
        sentry_sdk.capture_exception(exc)


async def _run_daily_room_cleanup() -> None:
    """
    Scheduled wrapper around cleanup_abandoned_sessions.

    Opens a fresh AsyncSessionLocal() per tick (the scheduler has no
    request context). Any exception is logged + reported to Sentry; we
    never re-raise so APScheduler keeps scheduling future runs.
    """
    try:
        async with AsyncSessionLocal() as db:
            try:
                summary = await cleanup_abandoned_sessions(db)
            except Exception:
                await db.rollback()
                raise
        # cleanup_abandoned_sessions already logs — only log here at DEBUG
        # so we don't double up in normal conditions.
        logger.debug("scheduler: daily_room_cleanup result=%s", summary)
    except Exception as exc:  # noqa: BLE001 — never kill the scheduler
        logger.exception("scheduler: daily_room_cleanup failed: %s", exc)
        sentry_sdk.capture_exception(exc)


def start_scheduler(app) -> AsyncIOScheduler:  # noqa: ARG001 — FastAPI app kept for symmetry
    """
    Start the process-wide AsyncIOScheduler and register jobs.

    Called from FastAPI lifespan startup. Idempotent: calling twice is a
    no-op (returns the existing scheduler).
    """
    global _scheduler

    if _scheduler is not None and _scheduler.running:
        logger.debug("scheduler: already running, skipping start")
        return _scheduler

    interval_min = _interval_minutes()

    _scheduler = AsyncIOScheduler(timezone="UTC")
    _scheduler.add_job(
        _run_daily_room_cleanup,
        trigger=IntervalTrigger(minutes=interval_min),
        id="daily_room_cleanup",
        name="KidComs abandoned-session sweeper",
        replace_existing=True,
        # Coalesce missed runs and allow only one concurrent instance so
        # a slow sweep can't pile up ticks when the server is busy.
        coalesce=True,
        max_instances=1,
    )
    # Wave 2 B9: daily roll-forward of recurring custody exchanges + obligations.
    # Runs at 03:00 UTC — off-peak, idempotent.
    _scheduler.add_job(
        _run_schedule_roller,
        trigger=CronTrigger(hour=3, minute=0),
        id="schedule_roller",
        name="Recurring exchange/obligation roller",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    # Wave 3 C12: ARIA session-memory TTL cleanup. Runs daily at 03:30 UTC.
    _scheduler.add_job(
        _run_aria_memory_cleanup,
        trigger=CronTrigger(hour=3, minute=30),
        id="aria_memory_cleanup",
        name="ARIA session-memory 90-day TTL purge",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    # Wave 3 C15: birthday event generator. Runs daily at 04:00 UTC.
    _scheduler.add_job(
        _run_birthday_event_generator,
        trigger=CronTrigger(hour=4, minute=0),
        id="birthday_event_generator",
        name="Upcoming-birthday calendar event generator",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    # Court-ready custody tracking: auto-close expired exchange windows
    # every 5 minutes so missed/incomplete handoffs get a final outcome
    # quickly. Idempotent — already-closed rows are skipped.
    _scheduler.add_job(
        _run_auto_close_expired_exchanges,
        trigger=IntervalTrigger(minutes=5),
        id="auto_close_expired_exchanges",
        name="Custody exchange window auto-closer",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    # Wave 6 Phase C: alert rule evaluator — every 5 minutes, evaluate every
    # enabled AlertRule and fire notifications on state transitions.
    _scheduler.add_job(
        _run_alert_evaluator_tick,
        trigger=IntervalTrigger(minutes=5),
        id="alert_evaluator",
        name="Superadmin alert rule evaluator",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    _scheduler.start()
    logger.info(
        "scheduler: started (daily_room_cleanup every %d min, "
        "abandon threshold=%d min; schedule_roller daily @ 03:00 UTC)",
        interval_min,
        int(getattr(settings, "DAILY_ROOM_ABANDON_THRESHOLD_MIN", 60)),
    )
    return _scheduler


def stop_scheduler() -> None:
    """
    Shut the scheduler down on FastAPI lifespan exit.

    Uses `wait=False` so shutdown does not block on an in-flight sweep —
    the DB session opened by the job is self-contained and will be closed
    when the coroutine unwinds.
    """
    global _scheduler
    if _scheduler is None:
        return
    try:
        if _scheduler.running:
            _scheduler.shutdown(wait=False)
            logger.info("scheduler: stopped")
    except Exception as exc:  # noqa: BLE001
        logger.warning("scheduler: error during shutdown: %s", exc)
    finally:
        _scheduler = None
