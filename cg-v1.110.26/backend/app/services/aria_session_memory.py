"""
ARIA Sentinel Shield V2 — Session Memory Engine

Provides 90-day structured memory per sender-recipient conversation pair.
Tracks recurring patterns, escalation trajectory, and session summaries
to enable cross-session pattern detection.

Uses raw SQL to avoid requiring new SQLAlchemy models (tables created via Alembic).
"""

import json
import logging
from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Session memory retention period
RETENTION_DAYS = 90


async def get_session_context(
    db: AsyncSession,
    sender_id: str,
    recipient_id: str,
    family_file_id: str,
) -> Dict[str, Any]:
    """
    Retrieve session memory context for LLM enrichment.

    Returns a summary of recent sessions between this sender-recipient pair,
    including recurring patterns and escalation trajectory.

    Returns empty dict on cold start (no prior sessions).
    """
    try:
        result = await db.execute(
            text("""
                SELECT summary, recurring_patterns, session_date
                FROM aria_session_memory
                WHERE sender_id = :sender_id
                  AND recipient_id = :recipient_id
                  AND family_file_id = :ff_id
                  AND session_date >= :cutoff
                ORDER BY session_date DESC
                LIMIT 10
            """),
            {
                "sender_id": sender_id,
                "recipient_id": recipient_id,
                "ff_id": family_file_id,
                "cutoff": (datetime.utcnow() - timedelta(days=RETENTION_DAYS)).date(),
            },
        )
        rows = result.fetchall()

        if not rows:
            return {}

        # Aggregate recurring patterns across sessions
        all_patterns: Dict[str, int] = {}
        session_heats: List[float] = []
        categories_seen: Dict[str, int] = {}

        for row in rows:
            summary = json.loads(row[0]) if isinstance(row[0], str) else (row[0] or {})
            patterns = json.loads(row[1]) if isinstance(row[1], str) else (row[1] or [])

            heat = summary.get("heat_avg", 0.0)
            session_heats.append(heat)

            for cat in summary.get("categories_detected", []):
                categories_seen[cat] = categories_seen.get(cat, 0) + 1

            for pat in patterns:
                name = pat.get("pattern", "") if isinstance(pat, dict) else str(pat)
                if name:
                    all_patterns[name] = all_patterns.get(name, 0) + 1

        # Determine escalation trajectory
        if len(session_heats) >= 3:
            recent = session_heats[:3]  # newest first
            if recent[0] > recent[-1] * 1.3:
                trajectory = "rising"
            elif recent[0] < recent[-1] * 0.7:
                trajectory = "declining"
            else:
                trajectory = "stable"
        else:
            trajectory = "insufficient_data"

        # Find patterns that recur in 3+ sessions
        recurring = [p for p, count in all_patterns.items() if count >= 3]
        frequent_categories = [c for c, count in categories_seen.items() if count >= 3]

        return {
            "session_count": len(rows),
            "escalation_trajectory": trajectory,
            "recurring_patterns": recurring,
            "frequent_categories": frequent_categories,
            "avg_heat": round(sum(session_heats) / len(session_heats), 3) if session_heats else 0.0,
            "most_recent_session": str(rows[0][2]) if rows else None,
        }

    except Exception as e:
        logger.error(f"[ARIA V2] Session memory lookup failed: {e}")
        return {}


async def update_session_memory(
    db: AsyncSession,
    sender_id: str,
    recipient_id: str,
    family_file_id: str,
    categories_detected: List[str],
    heat_score: float,
    message_count: int = 1,
) -> None:
    """
    Update session memory after message analysis.

    Creates or updates today's session summary for this sender-recipient pair.
    """
    try:
        today = date.today()

        # Check if a session record exists for today
        result = await db.execute(
            text("""
                SELECT id, summary, recurring_patterns
                FROM aria_session_memory
                WHERE sender_id = :sender_id
                  AND recipient_id = :recipient_id
                  AND family_file_id = :ff_id
                  AND session_date = :today
            """),
            {
                "sender_id": sender_id,
                "recipient_id": recipient_id,
                "ff_id": family_file_id,
                "today": today,
            },
        )
        existing = result.fetchone()

        if existing:
            # Update existing session
            old_summary = json.loads(existing[1]) if isinstance(existing[1], str) else (existing[1] or {})
            old_patterns = json.loads(existing[2]) if isinstance(existing[2], str) else (existing[2] or [])

            # Merge categories
            existing_cats = set(old_summary.get("categories_detected", []))
            existing_cats.update(categories_detected)

            # Running average heat
            old_count = old_summary.get("message_count", 1)
            old_heat = old_summary.get("heat_avg", 0.0)
            new_count = old_count + message_count
            new_heat = ((old_heat * old_count) + heat_score) / new_count

            updated_summary = {
                "categories_detected": sorted(existing_cats),
                "heat_avg": round(new_heat, 3),
                "message_count": new_count,
                "escalation_trend": "rising" if heat_score > old_heat * 1.2 else "stable",
            }

            # Update recurring patterns
            pattern_counts = {}
            for p in old_patterns:
                name = p.get("pattern", "") if isinstance(p, dict) else str(p)
                freq = p.get("frequency", 1) if isinstance(p, dict) else 1
                if name:
                    pattern_counts[name] = freq
            for cat in categories_detected:
                pattern_counts[cat] = pattern_counts.get(cat, 0) + 1

            updated_patterns = [
                {"pattern": name, "frequency": freq}
                for name, freq in pattern_counts.items()
            ]

            await db.execute(
                text("""
                    UPDATE aria_session_memory
                    SET summary = :summary,
                        recurring_patterns = :patterns,
                        updated_at = NOW()
                    WHERE id = :id
                """),
                {
                    "id": existing[0],
                    "summary": json.dumps(updated_summary),
                    "patterns": json.dumps(updated_patterns),
                },
            )
        else:
            # Create new session record
            import uuid

            summary = {
                "categories_detected": sorted(set(categories_detected)),
                "heat_avg": round(heat_score, 3),
                "message_count": message_count,
                "escalation_trend": "new_session",
            }

            patterns = [
                {"pattern": cat, "frequency": 1}
                for cat in categories_detected
            ]

            await db.execute(
                text("""
                    INSERT INTO aria_session_memory
                        (id, sender_id, recipient_id, family_file_id,
                         session_date, summary, recurring_patterns, created_at, updated_at)
                    VALUES
                        (:id, :sender_id, :recipient_id, :ff_id,
                         :session_date, :summary, :patterns, NOW(), NOW())
                """),
                {
                    "id": str(uuid.uuid4()),
                    "sender_id": sender_id,
                    "recipient_id": recipient_id,
                    "ff_id": family_file_id,
                    "session_date": today,
                    "summary": json.dumps(summary),
                    "patterns": json.dumps(patterns),
                },
            )

        await db.commit()

    except Exception as e:
        logger.error(f"[ARIA V2] Session memory update failed: {e}")
        # Don't crash the message flow


async def cleanup_old_sessions(db: AsyncSession) -> int:
    """Remove session memory records older than 90 days. Returns count deleted."""
    try:
        cutoff = (datetime.utcnow() - timedelta(days=RETENTION_DAYS)).date()
        result = await db.execute(
            text("DELETE FROM aria_session_memory WHERE session_date < :cutoff"),
            {"cutoff": cutoff},
        )
        await db.commit()
        return result.rowcount or 0
    except Exception as e:
        logger.error(f"[ARIA V2] Session cleanup failed: {e}")
        return 0


def format_session_context_for_llm(context: Dict[str, Any]) -> str:
    """Format session memory context into a string for the LLM system prompt."""
    if not context:
        return ""

    parts = []
    if context.get("recurring_patterns"):
        parts.append(f"Recurring patterns in past {context.get('session_count', '?')} sessions: {', '.join(context['recurring_patterns'])}")
    if context.get("frequent_categories"):
        parts.append(f"Frequently detected: {', '.join(context['frequent_categories'])}")
    if context.get("escalation_trajectory") and context["escalation_trajectory"] != "insufficient_data":
        parts.append(f"Escalation trajectory: {context['escalation_trajectory']}")
    if context.get("avg_heat", 0) > 0:
        parts.append(f"Average session heat: {context['avg_heat']}")

    return "\n".join(parts)
