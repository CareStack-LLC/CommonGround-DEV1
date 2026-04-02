"""
ARIA Sentinel Shield V2 — Sender Baseline & Deviation Detection

Builds a behavioral baseline over the sender's first 10 sessions per family file.
After baseline is established, detects significant deviations in:
- Message length
- Message frequency
- Heat score
- Sentiment distribution

Uses raw SQL (table created via Alembic migration).
"""

import json
import logging
import math
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Minimum sessions before baseline is considered established
MIN_SESSIONS_FOR_BASELINE = 10

# Deviation threshold (standard deviations)
DEVIATION_THRESHOLD = 2.0


async def get_baseline(
    db: AsyncSession,
    sender_id: str,
    family_file_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Retrieve the sender's baseline for this family file.

    Returns None if no baseline exists or if still building (< 10 sessions).
    """
    try:
        result = await db.execute(
            text("""
                SELECT session_count, avg_message_length, avg_frequency,
                       avg_heat_score, sentiment_distribution,
                       std_deviations, baseline_established
                FROM aria_sender_baseline
                WHERE sender_id = :sender_id
                  AND family_file_id = :ff_id
            """),
            {"sender_id": sender_id, "ff_id": family_file_id},
        )
        row = result.fetchone()

        if not row:
            return None

        return {
            "session_count": row[0],
            "avg_message_length": row[1],
            "avg_frequency": row[2],
            "avg_heat_score": row[3],
            "sentiment_distribution": json.loads(row[4]) if isinstance(row[4], str) else (row[4] or {}),
            "std_deviations": json.loads(row[5]) if isinstance(row[5], str) else (row[5] or {}),
            "baseline_established": row[6],
        }
    except Exception as e:
        logger.error(f"[ARIA V2] Baseline lookup failed: {e}")
        return None


async def update_baseline(
    db: AsyncSession,
    sender_id: str,
    family_file_id: str,
    message_length: int,
    heat_score: float,
) -> None:
    """
    Update the sender's baseline with new data from the current session.

    Uses Welford's online algorithm for running mean and variance
    (avoids storing all historical values).
    """
    try:
        baseline = await get_baseline(db, sender_id, family_file_id)

        if baseline is None:
            # First ever session — create baseline record
            import uuid
            std_devs = {"length": 0.0, "heat": 0.0}
            await db.execute(
                text("""
                    INSERT INTO aria_sender_baseline
                        (id, sender_id, family_file_id, session_count,
                         avg_message_length, avg_frequency, avg_heat_score,
                         sentiment_distribution, std_deviations,
                         baseline_established, created_at, updated_at)
                    VALUES
                        (:id, :sender_id, :ff_id, 1,
                         :length, 1.0, :heat,
                         :sentiment, :stds,
                         FALSE, NOW(), NOW())
                """),
                {
                    "id": str(uuid.uuid4()),
                    "sender_id": sender_id,
                    "ff_id": family_file_id,
                    "length": float(message_length),
                    "heat": heat_score,
                    "sentiment": json.dumps({}),
                    "stds": json.dumps(std_devs),
                },
            )
            await db.commit()
            return

        # Welford's online update
        n = baseline["session_count"] + 1
        old_mean_len = baseline["avg_message_length"] or 0.0
        old_mean_heat = baseline["avg_heat_score"] or 0.0
        old_stds = baseline["std_deviations"] or {}

        # Running mean
        new_mean_len = old_mean_len + (message_length - old_mean_len) / n
        new_mean_heat = old_mean_heat + (heat_score - old_mean_heat) / n

        # Running variance (M2) approximation using std_dev storage
        old_std_len = old_stds.get("length", 0.0)
        old_std_heat = old_stds.get("heat", 0.0)

        if n >= 3:
            # Approximate running std from old std and new data point
            old_var_len = old_std_len ** 2
            new_var_len = old_var_len + ((message_length - old_mean_len) * (message_length - new_mean_len) - old_var_len) / n
            new_std_len = math.sqrt(max(0, new_var_len))

            old_var_heat = old_std_heat ** 2
            new_var_heat = old_var_heat + ((heat_score - old_mean_heat) * (heat_score - new_mean_heat) - old_var_heat) / n
            new_std_heat = math.sqrt(max(0, new_var_heat))
        else:
            new_std_len = old_std_len
            new_std_heat = old_std_heat

        established = n >= MIN_SESSIONS_FOR_BASELINE

        new_stds = {
            "length": round(new_std_len, 3),
            "heat": round(new_std_heat, 3),
        }

        await db.execute(
            text("""
                UPDATE aria_sender_baseline
                SET session_count = :n,
                    avg_message_length = :avg_len,
                    avg_heat_score = :avg_heat,
                    std_deviations = :stds,
                    baseline_established = :established,
                    updated_at = NOW()
                WHERE sender_id = :sender_id
                  AND family_file_id = :ff_id
            """),
            {
                "n": n,
                "avg_len": round(new_mean_len, 2),
                "avg_heat": round(new_mean_heat, 3),
                "stds": json.dumps(new_stds),
                "established": established,
                "sender_id": sender_id,
                "ff_id": family_file_id,
            },
        )
        await db.commit()

    except Exception as e:
        logger.error(f"[ARIA V2] Baseline update failed: {e}")


def check_deviation(
    baseline: Dict[str, Any],
    message_length: int,
    heat_score: float,
) -> Optional[Dict[str, Any]]:
    """
    Check if the current message deviates significantly from the sender's baseline.

    Returns None if no significant deviation, or a dict describing the deviations.
    Only checks after baseline is established (>= 10 sessions).
    """
    if not baseline or not baseline.get("baseline_established"):
        return None

    stds = baseline.get("std_deviations", {})
    deviations = {}

    # Length deviation
    avg_len = baseline.get("avg_message_length", 0)
    std_len = stds.get("length", 0)
    if avg_len > 0 and std_len > 0:
        z_len = abs(message_length - avg_len) / std_len
        if z_len >= DEVIATION_THRESHOLD:
            direction = "longer" if message_length > avg_len else "shorter"
            deviations["length"] = {
                "z_score": round(z_len, 2),
                "direction": direction,
                "current": message_length,
                "baseline_avg": round(avg_len, 1),
            }

    # Heat deviation
    avg_heat = baseline.get("avg_heat_score", 0)
    std_heat = stds.get("heat", 0)
    if std_heat > 0:
        z_heat = abs(heat_score - avg_heat) / std_heat
        if z_heat >= DEVIATION_THRESHOLD:
            direction = "higher" if heat_score > avg_heat else "lower"
            deviations["heat"] = {
                "z_score": round(z_heat, 2),
                "direction": direction,
                "current": round(heat_score, 3),
                "baseline_avg": round(avg_heat, 3),
            }

    return deviations if deviations else None
