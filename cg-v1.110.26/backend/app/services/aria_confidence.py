"""
ARIA Sentinel Shield V2 — Confidence Scoring Engine

Assigns per-category confidence 0.0–1.0 based on regex match strength,
then applies modifiers for negation and hypothetical framing.

Only categories with confidence >= 0.6 are considered "detected".
"""

import re
import logging
from typing import Dict, List, Tuple

from app.services.aria_taxonomy_v2 import V2Category
from app.services.aria_patterns_v2 import V2_PATTERN_REGISTRY

logger = logging.getLogger(__name__)

# Confidence threshold — categories below this are discarded
CONFIDENCE_THRESHOLD = 0.6

# ── Negation patterns ──
# If the message contains these NEAR (within 5 words of) the trigger,
# reduce confidence by 0.4
NEGATION_PHRASES = [
    re.compile(r'\b(i\s+would\s+never|i\'?m\s+not\s+saying|i\s+didn\'?t|i\s+don\'?t\s+mean|not\s+trying\s+to|never\s+meant\s+to|i\s+wasn\'?t)\b', re.IGNORECASE),
]

# ── Hypothetical framing patterns ──
# Reduce confidence by 0.2 when the statement is framed as hypothetical
HYPOTHETICAL_PHRASES = [
    re.compile(r'\b(what\s+if|hypothetically|in\s+theory|just\s+saying|suppose|imagine\s+if|for\s+example|let\'?s\s+say)\b', re.IGNORECASE),
]


def _has_negation_near(message: str, match_start: int, match_end: int) -> bool:
    """Check if a negation phrase appears within ~60 chars before the match."""
    window_start = max(0, match_start - 60)
    window = message[window_start:match_start]
    return any(pat.search(window) for pat in NEGATION_PHRASES)


def _has_hypothetical_framing(message: str) -> bool:
    """Check if the entire message uses hypothetical framing."""
    return any(pat.search(message) for pat in HYPOTHETICAL_PHRASES)


def score_categories(
    message: str,
) -> Dict[V2Category, float]:
    """
    Run all V2 regex patterns against the message and assign confidence per category.

    Confidence for a category is determined by:
    - Base: 0.85 for a single match, +0.05 per additional match (cap 1.0)
    - Negation modifier: -0.4 if a negation phrase appears near the trigger
    - Hypothetical modifier: -0.2 if the message is framed hypothetically

    Returns:
        Dict mapping each detected V2Category to its confidence score.
        Only categories with confidence >= CONFIDENCE_THRESHOLD are included.
    """
    is_hypothetical = _has_hypothetical_framing(message)
    raw_scores: Dict[V2Category, List[Tuple[float, str]]] = {}

    for category, patterns in V2_PATTERN_REGISTRY.items():
        for pattern in patterns:
            for match in pattern.finditer(message):
                full_phrase = match.group().strip()
                if not full_phrase:
                    continue

                # Base confidence for a regex hit
                conf = 0.85

                # Negation reduction
                if _has_negation_near(message, match.start(), match.end()):
                    conf -= 0.4

                # Hypothetical reduction
                if is_hypothetical:
                    conf -= 0.2

                conf = max(0.0, conf)

                if category not in raw_scores:
                    raw_scores[category] = []
                raw_scores[category].append((conf, full_phrase))

    # Aggregate: take max confidence per category, bonus for multiple matches
    result: Dict[V2Category, float] = {}
    for category, hits in raw_scores.items():
        if not hits:
            continue
        max_conf = max(h[0] for h in hits)
        # Small bonus for multiple distinct triggers (evidence accumulation)
        bonus = min(0.15, (len(hits) - 1) * 0.05)
        final_conf = min(1.0, max_conf + bonus)

        if final_conf >= CONFIDENCE_THRESHOLD:
            result[category] = round(final_conf, 3)

    return result


def get_triggers_for_categories(
    message: str,
    detected_categories: Dict[V2Category, float],
) -> List[str]:
    """Extract the actual trigger phrases for detected categories."""
    triggers = set()
    for category in detected_categories:
        patterns = V2_PATTERN_REGISTRY.get(category, [])
        for pattern in patterns:
            for match in pattern.finditer(message):
                phrase = match.group().strip()
                if phrase:
                    triggers.add(phrase)
    return sorted(triggers)
