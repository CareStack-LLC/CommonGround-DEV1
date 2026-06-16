"""
Daily.co Room Cleaner — sweeps abandoned KidComs sessions.

At 300 concurrent users, orphaned Daily.co rooms (participants dropped
mid-call, never hit POST /sessions/{id}/end) risk quota exhaustion.
Daily.co's server-side TTL is ~2h; this sweeper runs every 15 minutes
and closes out rows whose `started_at` (or `created_at` if never started)
is older than the configured abandon threshold.

NOTE: `SessionStatus` does not have an `ABANDONED` member. Per Wave 1 A8
spec we fall back to `COMPLETED` and document it here so ops can still
distinguish these rows by `ended_at` + no explicit end event in logs.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import sentry_sdk
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.kidcoms import KidComsSession, SessionStatus
from app.services.daily_video import daily_service

logger = logging.getLogger(__name__)


# Statuses considered "in-flight" — safe to sweep once past the threshold.
_ACTIVE_STATUSES = (
    SessionStatus.ACTIVE.value,
    SessionStatus.RINGING.value,
    SessionStatus.WAITING.value,
)

# Commit in modest batches to keep transactions short and avoid holding
# row locks for long. 50 matches the spec.
_COMMIT_BATCH_SIZE = 50


def _abandon_threshold_minutes() -> int:
    """Read the abandon threshold from settings, defaulting to 60 min."""
    return int(getattr(settings, "DAILY_ROOM_ABANDON_THRESHOLD_MIN", 60))


async def cleanup_abandoned_sessions(db: AsyncSession) -> Dict[str, Any]:
    """
    Find KidComs sessions that look abandoned and release their Daily rooms.

    Criteria:
        - status IN (ACTIVE, RINGING, WAITING)
        - AND daily_room_name IS NOT NULL  (solo theater sessions skipped)
        - AND (started_at < now - threshold
               OR (created_at < now - threshold AND started_at IS NULL))

    For each match we:
        1. Call `daily_service.delete_room(...)` — errors are swallowed and
           logged + reported to Sentry so one bad row cannot block the sweep.
        2. Mark the session `COMPLETED` and set `ended_at = utcnow()`.
        3. Commit in batches of up to 50 rows.

    Args:
        db: An open async SQLAlchemy session (the scheduler opens a fresh
            one per run; HTTP callers pass their request-scoped session).

    Returns:
        Observability dict:
            {
                "cleaned": int,
                "errors": List[{"session_id": str, "room": str, "error": str}],
                "duration_ms": float,
                "threshold_minutes": int,
            }
    """
    start = time.perf_counter()
    threshold_min = _abandon_threshold_minutes()
    cutoff = datetime.utcnow() - timedelta(minutes=threshold_min)

    stmt = (
        select(KidComsSession)
        .where(KidComsSession.status.in_(_ACTIVE_STATUSES))
        .where(KidComsSession.daily_room_name.is_not(None))
        .where(
            or_(
                KidComsSession.started_at < cutoff,
                (KidComsSession.started_at.is_(None))
                & (KidComsSession.created_at < cutoff),
            )
        )
    )

    result = await db.execute(stmt)
    candidates: List[KidComsSession] = list(result.scalars().all())

    cleaned = 0
    errors: List[Dict[str, Any]] = []
    in_batch = 0

    for session in candidates:
        room_name: Optional[str] = session.daily_room_name

        # 1) Best-effort delete on Daily.co side. We always mark the DB row
        #    closed even if the API call fails — the room will still expire
        #    via Daily's TTL, and leaving our row ACTIVE is worse.
        try:
            if room_name:
                await daily_service.delete_room(room_name)
        except Exception as exc:  # noqa: BLE001 — swallow + report
            logger.warning(
                "daily_room_cleaner: delete_room(%s) failed: %s",
                room_name,
                exc,
            )
            sentry_sdk.capture_exception(exc)
            errors.append(
                {
                    "session_id": session.id,
                    "room": room_name,
                    "error": str(exc),
                }
            )

        # 2) Close the session row. SessionStatus has no ABANDONED variant,
        #    so we use COMPLETED (see module docstring).
        session.status = SessionStatus.COMPLETED.value
        session.ended_at = datetime.utcnow()
        if session.started_at and session.duration_seconds is None:
            session.duration_seconds = int(
                (session.ended_at - session.started_at).total_seconds()
            )

        cleaned += 1
        in_batch += 1

        # 3) Flush in batches so a crash mid-sweep doesn't lose all progress.
        if in_batch >= _COMMIT_BATCH_SIZE:
            await db.commit()
            in_batch = 0

    if in_batch > 0:
        await db.commit()

    # Post-call ARIA analysis for sessions that ended without hitting the
    # /end endpoint (covers the BackgroundTasks trigger gap). Best-effort;
    # analyze_and_report_kidcoms_session never raises and opens its own
    # session, so a failure here cannot affect the sweep result.
    if candidates:
        from app.services.aria_call_monitor import analyze_and_report_kidcoms_session
        for session in candidates:
            await analyze_and_report_kidcoms_session(session.id)

    duration_ms = round((time.perf_counter() - start) * 1000, 2)

    summary: Dict[str, Any] = {
        "cleaned": cleaned,
        "errors": errors,
        "duration_ms": duration_ms,
        "threshold_minutes": threshold_min,
    }

    if cleaned or errors:
        logger.info(
            "daily_room_cleaner: swept %d abandoned session(s) in %.1fms "
            "(%d error(s), threshold=%dmin)",
            cleaned,
            duration_ms,
            len(errors),
            threshold_min,
        )
    else:
        logger.debug(
            "daily_room_cleaner: no abandoned sessions (threshold=%dmin, %.1fms)",
            threshold_min,
            duration_ms,
        )

    return summary
