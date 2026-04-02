"""
ARIA Sentinel Shield V2 — Bidirectional Analysis

Analyzes BOTH sender and recipient messages to:
1. Detect reactive patterns (Parent B escalates after Parent A's controlling message)
2. Generate coaching notes for the protected parent (recipient)
3. Provide context-aware suggestions

Never blames the recipient — only coaches.
"""

import logging
from typing import Dict, Any, Optional, List

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message, MessageFlag

logger = logging.getLogger(__name__)

# How many recent recipient messages to analyze
RECIPIENT_WINDOW = 5


async def get_recipient_context(
    db: AsyncSession,
    recipient_id: str,
    family_file_id: str,
) -> Dict[str, Any]:
    """
    Retrieve the recipient's recent message behavior for context.

    Returns:
        Dict with recipient's recent communication patterns, or empty on failure.
    """
    try:
        result = await db.execute(
            select(Message.content, Message.sent_at, Message.was_flagged)
            .where(
                and_(
                    Message.sender_id == recipient_id,
                    Message.family_file_id == family_file_id,
                )
            )
            .order_by(desc(Message.sent_at))
            .limit(RECIPIENT_WINDOW)
        )
        rows = result.fetchall()

        if not rows:
            return {}

        flagged_count = sum(1 for r in rows if r[2])
        total = len(rows)

        return {
            "recent_messages": [r[0][:200] for r in rows],  # Truncated for context
            "flagged_count": flagged_count,
            "total_recent": total,
            "flag_rate": round(flagged_count / total, 2) if total > 0 else 0.0,
        }

    except Exception as e:
        logger.error(f"[ARIA V2] Recipient context lookup failed: {e}")
        return {}


def generate_coaching_note(
    sender_categories: List[str],
    recipient_context: Dict[str, Any],
) -> Optional[str]:
    """
    Generate a coaching note for the recipient based on the incoming message analysis.

    This helps the protected parent respond constructively rather than reactively.
    Never blames the recipient.

    Args:
        sender_categories: V2 categories detected in the incoming message
        recipient_context: Recent behavior of the recipient

    Returns:
        A coaching note string, or None if no coaching is needed.
    """
    if not sender_categories:
        return None

    # Map detected categories to coaching advice
    coaching_map = {
        "gaslighting": "The other parent may be questioning your reality. Trust your records and documentation. Respond with facts, not emotion.",
        "blame_shifting": "You're receiving blame-heavy language. A calm, factual response works best. Stick to specifics about the children.",
        "guilt_induction": "This message uses guilt as leverage. You don't need to justify yourself. Focus your response on the logistics.",
        "emotional_blackmail": "This message contains emotional pressure tactics. You're not responsible for the other parent's emotions. Keep your response brief and focused on the children.",
        "direct_threat": "This message contains threatening language. Do not engage. Document this and consider contacting your attorney.",
        "veiled_threat": "This message contains implied threats. Stay calm and document. Respond only about the children's needs.",
        "child_alienation": "The other parent may be trying to influence the children's perception. Document this. Respond with warmth toward the children, not defensiveness.",
        "schedule_control": "The other parent is trying to control the schedule unilaterally. Calmly reference the agreement. Don't argue — state the plan.",
        "financial_control": "Financial pressure is being used. Keep financial and parenting discussions separate. Reference the agreement.",
        "name_calling": "Personal attacks don't require a personal response. Redirect to the topic at hand.",
        "character_attack": "Your character is being questioned. The best response is to model the behavior you want documented for court.",
        "manipulation": "This message uses manipulation tactics. Take a moment before responding. Keep it brief, informative, friendly, and firm (BIFF).",
        "mockery": "Sarcasm or mockery detected. Don't match the tone — your measured response will contrast well in documentation.",
        "invalidation": "Your concerns are being dismissed. Restate them calmly and specifically. You have a right to be heard.",
        "minimization": "Your valid concerns are being downplayed. State facts without emotional language. Your perspective matters.",
        "triangulation": "Third parties are being brought in to pressure you. Focus your response on the direct issue between co-parents.",
    }

    # Find the most relevant coaching note
    for category in sender_categories:
        if category in coaching_map:
            note = coaching_map[category]

            # Add pattern-awareness if recipient has been getting flagged too
            if recipient_context.get("flag_rate", 0) > 0.3:
                note += " Remember: your responses are court documentation too. Stay above the conflict."

            return note

    # Generic coaching for any flagged message
    return "Take a moment before responding. A brief, factual reply focused on the children will serve you best."
