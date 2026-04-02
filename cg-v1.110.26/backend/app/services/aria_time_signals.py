"""
ARIA Sentinel Shield V2 — Time & Frequency Signal Analysis

Detects temporal patterns that indicate problematic behavior:
- Late-night messaging (10pm - 5am sender local time)
- Message storms (>5 messages in 10 minutes)
- Silence-to-flood (48+ hours silence then 5+ in 1 hour)
- Sustained campaign (elevated heat across 3+ consecutive days)

Time signals add context metadata — they do NOT directly increase toxicity_score.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from sqlalchemy import text, func
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def detect_time_signals(
    db: AsyncSession,
    sender_id: str,
    family_file_id: str,
    message_sent_at: Optional[datetime] = None,
) -> List[str]:
    """
    Analyze temporal patterns for the sender's recent messages.

    Args:
        db: Database session
        sender_id: The sender's user ID
        family_file_id: The family file ID
        message_sent_at: When the current message was sent (defaults to now)

    Returns:
        List of signal flags (e.g., ["late_night", "message_storm"])
    """
    signals = []
    now = message_sent_at or datetime.utcnow()

    try:
        # ── Late-night detection ──
        # Check if message is sent between 10pm and 5am UTC
        # (A more precise implementation would use the sender's timezone,
        # but UTC is a reasonable approximation for now)
        hour = now.hour
        if hour >= 22 or hour < 5:
            signals.append("late_night")

        # ── Message storm detection ──
        # >5 messages in the last 10 minutes from this sender
        storm_window = now - timedelta(minutes=10)
        result = await db.execute(
            text("""
                SELECT COUNT(*) FROM messages
                WHERE sender_id = :sender_id
                  AND family_file_id = :ff_id
                  AND sent_at >= :window_start
            """),
            {
                "sender_id": sender_id,
                "ff_id": family_file_id,
                "window_start": storm_window,
            },
        )
        storm_count = result.scalar() or 0
        if storm_count >= 5:
            signals.append("message_storm")

        # ── Silence-to-flood detection ──
        # No messages for 48+ hours, then 5+ in the last hour
        flood_window = now - timedelta(hours=1)
        silence_check_start = now - timedelta(hours=49)
        silence_check_end = now - timedelta(hours=1)

        # Count messages in the last hour
        result = await db.execute(
            text("""
                SELECT COUNT(*) FROM messages
                WHERE sender_id = :sender_id
                  AND family_file_id = :ff_id
                  AND sent_at >= :flood_start
            """),
            {
                "sender_id": sender_id,
                "ff_id": family_file_id,
                "flood_start": flood_window,
            },
        )
        flood_count = result.scalar() or 0

        if flood_count >= 5:
            # Check if there was silence in the 48 hours before the flood
            result = await db.execute(
                text("""
                    SELECT COUNT(*) FROM messages
                    WHERE sender_id = :sender_id
                      AND family_file_id = :ff_id
                      AND sent_at >= :silence_start
                      AND sent_at < :silence_end
                """),
                {
                    "sender_id": sender_id,
                    "ff_id": family_file_id,
                    "silence_start": silence_check_start,
                    "silence_end": silence_check_end,
                },
            )
            silence_count = result.scalar() or 0
            if silence_count == 0:
                signals.append("silence_to_flood")

        # ── Sustained campaign detection ──
        # Elevated heat (any flagged messages) across 3+ consecutive days
        result = await db.execute(
            text("""
                SELECT DISTINCT DATE(m.sent_at) as msg_date
                FROM messages m
                JOIN message_flags mf ON mf.message_id = m.id
                WHERE m.sender_id = :sender_id
                  AND m.family_file_id = :ff_id
                  AND m.sent_at >= :window_start
                  AND mf.toxicity_score > 0.3
                ORDER BY msg_date DESC
                LIMIT 7
            """),
            {
                "sender_id": sender_id,
                "ff_id": family_file_id,
                "window_start": now - timedelta(days=7),
            },
        )
        flagged_dates = [row[0] for row in result.fetchall()]

        if len(flagged_dates) >= 3:
            # Check for 3 consecutive days
            consecutive = 1
            max_consecutive = 1
            for i in range(1, len(flagged_dates)):
                if (flagged_dates[i - 1] - flagged_dates[i]).days == 1:
                    consecutive += 1
                    max_consecutive = max(max_consecutive, consecutive)
                else:
                    consecutive = 1
            if max_consecutive >= 3:
                signals.append("sustained_campaign")

    except Exception as e:
        logger.error(f"[ARIA V2] Time signal detection failed: {e}")

    return signals


def format_time_signals_for_display(signals: List[str]) -> List[Dict[str, str]]:
    """Format time signals for frontend display with human-readable descriptions."""
    descriptions = {
        "late_night": {
            "label": "Late Night",
            "description": "Message sent during late-night hours",
            "icon": "moon",
        },
        "message_storm": {
            "label": "Message Storm",
            "description": "Multiple messages sent in rapid succession",
            "icon": "zap",
        },
        "silence_to_flood": {
            "label": "Silence to Flood",
            "description": "Long silence followed by sudden burst of messages",
            "icon": "alert-triangle",
        },
        "sustained_campaign": {
            "label": "Sustained Pattern",
            "description": "Elevated conflict across multiple consecutive days",
            "icon": "trending-up",
        },
    }
    return [descriptions.get(s, {"label": s, "description": s, "icon": "flag"}) for s in signals]
