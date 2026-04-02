"""
ARIA Sentinel Shield V3 — Beta Features (All Behind Toggle)

- Pre-send draft coaching: Analyze draft before send, suggest tone improvements
- Pattern forecasting: Based on session memory, predict likely escalation
- Legal language detection: Flag court-relevant language patterns
- Longitudinal tone coaching: Periodic summary of communication trends

All features are individually toggleable via ARIA_V3_FEATURES config.
"""

import re
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

# Legal language patterns that courts care about
LEGAL_LANGUAGE_PATTERNS = [
    (re.compile(r'\b(full|sole)\s+custody\b', re.IGNORECASE), "custody_claim"),
    (re.compile(r'\bunfit\s+(parent|mother|father)\b', re.IGNORECASE), "fitness_allegation"),
    (re.compile(r'\b(cps|dcf|dcfs|child\s+services|child\s+protective)\b', re.IGNORECASE), "cps_reference"),
    (re.compile(r'\brestraining\s+order\b', re.IGNORECASE), "restraining_order"),
    (re.compile(r'\bsupervisor?ed\s+visitation\b', re.IGNORECASE), "supervised_visitation"),
    (re.compile(r'\bterminate\b.*?\brights\b', re.IGNORECASE), "termination_rights"),
    (re.compile(r'\bcontempt\s+of\s+court\b', re.IGNORECASE), "contempt_reference"),
    (re.compile(r'\bviolat\w*\s+(the\s+)?(order|agreement|decree)\b', re.IGNORECASE), "violation_claim"),
    (re.compile(r'\b(abuse|neglect|endanger)\b.*?\b(child|kids?|son|daughter)\b', re.IGNORECASE), "abuse_allegation"),
    (re.compile(r'\bpolice\s+report\b', re.IGNORECASE), "police_reference"),
    (re.compile(r'\bevidence\b', re.IGNORECASE), "evidence_mention"),
    (re.compile(r'\bwitness\b', re.IGNORECASE), "witness_mention"),
]


def detect_legal_language(message: str) -> List[str]:
    """
    Detect legal language patterns in a message.

    Returns list of legal flag types detected.
    """
    flags = []
    for pattern, flag_type in LEGAL_LANGUAGE_PATTERNS:
        if pattern.search(message):
            flags.append(flag_type)
    return flags


def generate_draft_coaching(
    message: str,
    detected_categories: List[str],
    toxicity_score: float,
) -> Optional[str]:
    """
    Pre-send coaching: analyze a draft message and suggest improvements
    BEFORE the user hits send.

    Only provides coaching if there's something constructive to say.
    """
    if toxicity_score < 0.1 and not detected_categories:
        return None  # Message looks fine

    coaching_parts = []

    # Score-based coaching
    if toxicity_score >= 0.6:
        coaching_parts.append(
            "This message may come across as aggressive. Consider rewriting "
            "to focus on what you need for the children, not how you feel about the other parent."
        )
    elif toxicity_score >= 0.3:
        coaching_parts.append(
            "Some phrases in this message could be interpreted negatively in court. "
            "Try using 'I' statements instead of 'you' accusations."
        )

    # Category-specific coaching
    if "blame_shifting" in detected_categories or "guilt_induction" in detected_categories:
        coaching_parts.append(
            "Tip: Replace blame ('you always/never...') with specific requests "
            "('Could we discuss the pickup time for Thursday?')."
        )

    if "all_caps" in detected_categories or "anger_escalation" in detected_categories:
        coaching_parts.append(
            "Tip: Writing in ALL CAPS reads as shouting in court documents. "
            "Normal case conveys your point just as effectively."
        )

    if not coaching_parts:
        return None

    return " ".join(coaching_parts)


def generate_pattern_forecast(
    session_context: Dict[str, Any],
) -> Optional[str]:
    """
    Based on session memory patterns, forecast likely escalation.

    Returns a forecast string or None if insufficient data.
    """
    if not session_context:
        return None

    trajectory = session_context.get("escalation_trajectory")
    recurring = session_context.get("recurring_patterns", [])
    avg_heat = session_context.get("avg_heat", 0)

    if trajectory == "rising" and avg_heat > 0.5:
        pattern_str = ", ".join(recurring[:3]) if recurring else "general conflict"
        return (
            f"Pattern Alert: Communication tension has been rising over recent sessions. "
            f"Common patterns: {pattern_str}. "
            f"Consider proactively suggesting a structured discussion format."
        )

    if trajectory == "rising":
        return (
            "Mild upward trend detected in communication tension. "
            "Maintaining calm, factual responses can help prevent escalation."
        )

    return None
