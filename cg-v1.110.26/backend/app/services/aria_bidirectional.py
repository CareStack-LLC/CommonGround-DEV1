"""
ARIA Sentinel Shield V2 — Bidirectional Analysis

Analyzes conversation context to:
1. Generate context-aware coaching notes for the SENDER (the person writing)
2. Read recent messages to understand what the other parent said
3. Provide actionable, specific advice tied to the conversation flow

The coaching tip is shown to the sender when their message is flagged.
It should reference the other parent by name and summarize what they were
actually asking/saying, so the sender can respond constructively.
"""

import logging
from typing import Dict, Any, Optional, List

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message, MessageFlag

logger = logging.getLogger(__name__)

# How many recent messages to fetch for conversation context
CONTEXT_WINDOW = 5


async def get_conversation_context(
    db: AsyncSession,
    family_file_id: str,
    sender_id: str,
) -> List[Dict[str, Any]]:
    """
    Retrieve the most recent messages in this conversation for coaching context.

    Returns the last few messages (from both parents) so we can understand
    what the other parent said and generate relevant coaching.
    """
    try:
        result = await db.execute(
            select(Message.content, Message.sender_id, Message.sent_at)
            .where(
                Message.family_file_id == family_file_id,
            )
            .order_by(desc(Message.sent_at))
            .limit(CONTEXT_WINDOW)
        )
        rows = result.fetchall()

        if not rows:
            return []

        # Return in chronological order (oldest first)
        messages = [
            {
                "content": r[0][:300] if r[0] else "",
                "is_other_parent": str(r[1]) != str(sender_id),
                "sent_at": r[2],
            }
            for r in reversed(rows)
        ]
        return messages

    except Exception as e:
        logger.error(f"[ARIA V2] Conversation context lookup failed: {e}")
        return []


async def get_recipient_context(
    db: AsyncSession,
    recipient_id: str,
    family_file_id: str,
) -> Dict[str, Any]:
    """
    Retrieve the recipient's recent message behavior for context.
    (Legacy — used for flag rate tracking.)
    """
    try:
        if not recipient_id:
            return {}

        result = await db.execute(
            select(Message.content, Message.sent_at, Message.was_flagged)
            .where(
                and_(
                    Message.sender_id == recipient_id,
                    Message.family_file_id == family_file_id,
                )
            )
            .order_by(desc(Message.sent_at))
            .limit(CONTEXT_WINDOW)
        )
        rows = result.fetchall()

        if not rows:
            return {}

        flagged_count = sum(1 for r in rows if r[2])
        total = len(rows)

        return {
            "recent_messages": [r[0][:200] for r in rows],
            "flagged_count": flagged_count,
            "total_recent": total,
            "flag_rate": round(flagged_count / total, 2) if total > 0 else 0.0,
        }

    except Exception as e:
        logger.error(f"[ARIA V2] Recipient context lookup failed: {e}")
        return {}


def _summarize_other_parent_intent(messages: List[Dict[str, Any]]) -> Optional[str]:
    """
    Look at the other parent's most recent message and summarize what they're asking/saying.
    Returns a short summary of the other parent's intent, or None if no context.
    """
    # Find the most recent message from the other parent
    other_parent_messages = [m for m in messages if m["is_other_parent"]]
    if not other_parent_messages:
        return None

    last_msg = other_parent_messages[-1]["content"].strip().lower()

    # Schedule coordination
    schedule_words = ["schedule", "pickup", "drop off", "dropoff", "drop-off",
                      "swap", "switch", "trade", "coordinate", "this week",
                      "next week", "tuesday", "wednesday", "thursday", "friday",
                      "saturday", "sunday", "monday", "weekend", "tonight",
                      "tomorrow", "today", "time", "when can", "what time"]
    if any(w in last_msg for w in schedule_words):
        return "coordinate scheduling"

    # Medical/school
    if any(w in last_msg for w in ["doctor", "dentist", "appointment", "school",
                                     "teacher", "homework", "sick", "medicine",
                                     "hospital", "therapy", "prescription"]):
        return "discuss a medical or school matter"

    # Money/expenses
    if any(w in last_msg for w in ["money", "payment", "expense", "cost",
                                     "bill", "support", "pay", "clothes",
                                     "supplies", "tuition"]):
        return "discuss expenses or financial matters"

    # Kids activity
    if any(w in last_msg for w in ["practice", "game", "recital", "birthday",
                                     "party", "event", "activity", "camp",
                                     "lesson", "class"]):
        return "discuss a kids' activity or event"

    # Question
    if "?" in other_parent_messages[-1]["content"]:
        return "ask you a question"

    # General conversation
    return "communicate about the children"


def generate_coaching_note(
    sender_categories: List[str],
    recipient_context: Dict[str, Any],
    conversation_context: Optional[List[Dict[str, Any]]] = None,
    other_parent_name: Optional[str] = None,
) -> Optional[str]:
    """
    Generate a context-aware coaching note for the SENDER when their message is flagged.

    This reads the conversation context to understand what the other parent said,
    then gives the sender actionable advice tied to the actual conversation.

    Args:
        sender_categories: V2 categories detected in the sender's message
        recipient_context: Recent behavior of the recipient (legacy)
        conversation_context: Recent messages from both parents
        other_parent_name: First name of the other parent

    Returns:
        A coaching note string, or None if no coaching is needed.
    """
    if not sender_categories:
        return None

    parent_name = other_parent_name or "The other parent"

    # Try to understand what the other parent was talking about
    intent = None
    if conversation_context:
        intent = _summarize_other_parent_intent(conversation_context)

    # Context-aware coaching based on detected categories + conversation intent
    if intent == "coordinate scheduling":
        if any(cat in sender_categories for cat in ["schedule_control", "custody_weaponization",
                                                       "parenting_time_interference"]):
            return (f"{parent_name} is looking to coordinate the schedule with you. "
                    f"Try letting them know if this works, or suggest another time that does.")
        if any(cat in sender_categories for cat in ["sexual_coercion", "emotional_blackmail",
                                                       "financial_control"]):
            return (f"{parent_name} is trying to set up scheduling. "
                    f"Keep the response focused on the schedule — what days and times work for you.")
        # Generic for schedule context
        return (f"{parent_name} is reaching out about the schedule. "
                f"A quick, clear reply about what works for you keeps things moving forward.")

    if intent == "discuss a medical or school matter":
        return (f"{parent_name} is sharing information about the kids' health or school. "
                f"Try acknowledging what they shared and let them know you're on the same page.")

    if intent == "discuss expenses or financial matters":
        return (f"{parent_name} is bringing up finances. "
                f"Try to keep money discussions factual — reference the agreement if needed.")

    if intent == "discuss a kids' activity or event":
        return (f"{parent_name} is talking about a kids' activity. "
                f"Try focusing your response on what's best for the kids and the logistics.")

    if intent == "ask you a question":
        return (f"{parent_name} asked you a question. "
                f"Try giving a direct, clear answer focused on the kids' needs.")

    if intent == "communicate about the children":
        return (f"{parent_name} is reaching out about the children. "
                f"A brief, friendly response focused on the kids will keep things productive.")

    # No conversation context available — fall back to category-based coaching
    # But phrase it as advice for the SENDER, not about the "other parent"
    category_coaching = {
        "gaslighting": "Take a breath before sending. Try stating just the facts without questioning anyone's reality.",
        "blame_shifting": "Try focusing on what needs to happen next instead of who's at fault.",
        "guilt_induction": "Instead of making the other parent feel guilty, try stating what you need directly.",
        "emotional_blackmail": "Pressure tactics usually backfire in co-parenting. Try a straightforward ask instead.",
        "direct_threat": "Threats can have serious legal consequences. If you have a concern, contact your attorney instead.",
        "veiled_threat": "This could be read as a threat. Consider rephrasing to focus on what you actually need.",
        "child_alienation": "Keep the kids out of the middle. They need to feel safe loving both parents.",
        "schedule_control": "Try proposing a specific plan rather than making demands about the schedule.",
        "financial_control": "Keep financial and parenting discussions separate. Focus on one topic at a time.",
        "name_calling": "Personal attacks don't help. Try focusing on the specific issue you want to resolve.",
        "character_attack": "Attacking character escalates conflict. Focus on the behavior or situation instead.",
        "manipulation": "Try being direct about what you need instead of using indirect pressure.",
        "mockery": "Sarcasm and mockery get documented. A straightforward message serves you better.",
        "invalidation": "The other parent has valid perspectives too. Try acknowledging their point before sharing yours.",
        "minimization": "Try acknowledging the other parent's concern before sharing your perspective.",
        "triangulation": "Keep the conversation between you two. Bringing in others usually escalates things.",
        "sexual_coercion": "Linking intimacy to parenting decisions is harmful. Keep these topics completely separate.",
        "contempt": "Contempt damages co-parenting relationships. Try to express what you need without the frustration.",
        "hostility": "Try to express your feelings without attacking. An 'I' statement works better than a 'you' accusation.",
    }

    for category in sender_categories:
        if category in category_coaching:
            note = category_coaching[category]
            # Add court reminder if sender has been getting flagged often
            if recipient_context.get("flag_rate", 0) > 0.3:
                note += " Remember: all messages are documented for the record."
            return note

    # Generic coaching
    return "Take a moment before sending. A brief, clear message focused on the kids will serve everyone best."
