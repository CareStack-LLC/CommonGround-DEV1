"""
ARIA Sentinel Shield V2 — Rolling Window Heat Scoring

Looks at the last 3 messages from the same sender in the same conversation.
Applies decay weights [0.5, 0.75, 1.0] (oldest → newest).

window_heat = sum(msg_score × decay_weight)

LLM deep analysis is triggered when window_heat >= 3.5.
"""

import logging
from typing import List, Optional, Tuple

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message, MessageFlag

logger = logging.getLogger(__name__)

# Decay weights: oldest → newest
DECAY_WEIGHTS = [0.5, 0.75, 1.0]

# Heat threshold for triggering LLM deep analysis
LLM_TRIGGER_HEAT = 3.5


async def get_rolling_window_heat(
    db: AsyncSession,
    sender_id: str,
    family_file_id: str,
    current_score: float,
) -> Tuple[float, List[float]]:
    """
    Calculate rolling window heat for the sender's last 3 messages
    (including the current one being analyzed).

    Args:
        db: Database session
        sender_id: The message sender's user ID
        family_file_id: The family file (conversation) ID
        current_score: Toxicity score of the message currently being analyzed

    Returns:
        Tuple of (window_heat, individual_scores)
        - window_heat: weighted sum of recent scores
        - individual_scores: list of scores used [oldest..newest]
    """
    try:
        # Get the last 2 sent messages from this sender in this family file
        # (the current message is the 3rd)
        result = await db.execute(
            select(Message.id)
            .where(
                and_(
                    Message.sender_id == sender_id,
                    Message.family_file_id == family_file_id,
                )
            )
            .order_by(desc(Message.sent_at))
            .limit(2)
        )
        recent_msg_ids = [row[0] for row in result.all()]

        # Get toxicity scores from flags on those messages
        prior_scores: List[float] = []
        if recent_msg_ids:
            flag_result = await db.execute(
                select(MessageFlag.toxicity_score, MessageFlag.message_id)
                .where(MessageFlag.message_id.in_(recent_msg_ids))
                .order_by(desc(MessageFlag.created_at))
            )
            flag_rows = flag_result.all()
            # Map message_id → score (take highest if multiple flags per message)
            msg_scores = {}
            for score, msg_id in flag_rows:
                if msg_id not in msg_scores or score > msg_scores[msg_id]:
                    msg_scores[msg_id] = score

            # Order by the message order (recent_msg_ids is newest-first)
            for msg_id in reversed(recent_msg_ids):
                prior_scores.append(msg_scores.get(msg_id, 0.0))

        # Build the window: [oldest, ..., newest=current]
        # prior_scores is oldest-first, then current
        all_scores = prior_scores + [current_score]

        # Only take the last 3
        window_scores = all_scores[-3:]

        # Apply decay weights (pad with leading zeros if < 3 messages)
        padded = [0.0] * (3 - len(window_scores)) + window_scores
        weights = DECAY_WEIGHTS

        window_heat = sum(s * w for s, w in zip(padded, weights))

        return round(window_heat, 3), window_scores

    except Exception as e:
        logger.error(f"[ARIA V2] Rolling window heat calculation failed: {e}")
        # Graceful fallback: use only current score with full weight
        return round(current_score * 1.0, 3), [current_score]


def should_trigger_llm(
    window_heat: float,
    max_severity: int,
    is_new_pattern: bool = False,
) -> bool:
    """
    Decide whether to invoke LLM deep analysis.

    Triggers when ANY of:
    - window_heat >= 3.5 (sustained pattern)
    - max_severity >= 3 (single severe message)
    - is_new_pattern is True (novel behavior not in baseline)
    """
    if window_heat >= LLM_TRIGGER_HEAT:
        return True
    if max_severity >= 3:
        return True
    if is_new_pattern:
        return True
    return False
