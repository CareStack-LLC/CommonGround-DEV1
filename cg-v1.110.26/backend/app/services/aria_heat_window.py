"""
ARIA Sentinel Shield V2 — Rolling Window Heat Scoring

Looks at the last 3 messages from the same sender in the same conversation.
Applies decay weights [0.5, 0.75, 1.0] (oldest → newest).

window_heat = sum(msg_score × decay_weight)

LLM deep analysis triggers on sustained heat, a single severe message, novel
patterns, OR any substantive message the regex layer can't clear with
confidence — see should_trigger_llm.
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
LLM_TRIGGER_HEAT = 1.8

# A lone message's heat can never reach LLM_TRIGGER_HEAT (it equals that
# message's own score, capped at 1.0), and subtle/paraphrased hostility scores
# low on the regex layer with severity floors of 1-2 — so on the heat/severity
# gates alone, a single hostile message the regex under-matches is silently
# passed through with no LLM second opinion. Give the LLM a look at any message
# substantive enough to carry hostility, or any message where the regex layer
# saw even a weak signal. gpt-4o-mini is cheap, the 10s deadline + circuit
# breaker bound the downside, and this is a child-safety-adjacent path where
# recall matters more than saving a model call.
LLM_MIN_WORDS = 5


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
    *,
    word_count: int = 0,
    has_regex_signal: bool = False,
) -> bool:
    """
    Decide whether to invoke LLM deep analysis.

    Triggers when ANY of:
    - window_heat >= LLM_TRIGGER_HEAT (sustained pattern)
    - max_severity >= 3 (single severe message)
    - is_new_pattern is True (novel behavior not in baseline)
    - has_regex_signal is True (regex saw any category, even weak/low-severity)
    - word_count >= LLM_MIN_WORDS (message substantive enough to carry
      hostility the regex layer may have paraphrased past)

    The last two conditions exist because the heat/severity gates alone let
    single, paraphrased hostile messages through unchecked (see LLM_MIN_WORDS).
    """
    if window_heat >= LLM_TRIGGER_HEAT:
        return True
    if max_severity >= 3:
        return True
    if is_new_pattern:
        return True
    if has_regex_signal:
        return True
    if word_count >= LLM_MIN_WORDS:
        return True
    return False
