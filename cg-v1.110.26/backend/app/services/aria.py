"""
ARIA Service - AI-Powered Sentiment Analysis
Analyzes parent-to-parent communication and helps prevent conflict.

V2 Sentinel Shield Architecture (4 layers):
1. Regex pattern matching (always runs) — 32-category V2 taxonomy
2. Thread Intelligence (rolling window heat + session memory)
3. LLM Deep Analysis (triggered by heat/severity/novelty) — OpenAI primary
4. V3 Proactive Intelligence (beta, toggled)

V1 fallback: When ARIA_V2_ENABLED=False, uses original 14-category flat scoring.
"""

import re
import json
import logging
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import anthropic
from openai import OpenAI
from sqlalchemy import select, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.message import Message, MessageFlag
from app.utils.sentry_helpers import capture_error, metric_increment, metric_distribution

logger = logging.getLogger(__name__)


class ToxicityLevel(Enum):
    """Levels of detected toxicity"""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    SEVERE = "severe"


class ToxicityCategory(Enum):
    """Categories of toxic communication patterns"""
    PROFANITY = "profanity"
    INSULT = "insult"
    HOSTILITY = "hostility"
    SARCASM = "sarcasm"
    BLAME = "blame"
    DISMISSIVE = "dismissive"
    THREATENING = "threatening"
    MANIPULATION = "manipulation"
    PASSIVE_AGGRESSIVE = "passive_aggressive"
    ALL_CAPS = "all_caps"
    CUSTODY_WEAPONIZATION = "custody_weaponization"
    FINANCIAL_COERCION = "financial_coercion"
    HATE_SPEECH = "hate_speech"
    SEXUAL_HARASSMENT = "sexual_harassment"


@dataclass
class SentimentAnalysis:
    """Result of ARIA sentiment analysis"""
    original_message: str
    toxicity_level: ToxicityLevel
    toxicity_score: float  # 0.0 to 1.0
    categories: List[ToxicityCategory]
    triggers: List[str]
    explanation: str
    suggestion: Optional[str]
    is_flagged: bool
    timestamp: datetime
    block_send: bool = False


class ARIAService:
    """
    ARIA - AI-Powered Relationship Intelligence Assistant
    Analyzes messages for toxicity and offers constructive alternatives.
    """

    def __init__(self):
        """Initialize ARIA service"""
        self.compiled_patterns = self._compile_patterns()

    def _compile_patterns(self) -> Dict[ToxicityCategory, List[re.Pattern]]:
        """Pre-compile regex patterns for performance"""
        from app.services.aria_patterns import (
            HATE_SPEECH_PATTERNS,
            SEXUAL_HARASSMENT_PATTERNS,
            THREATENING_PATTERNS,
            CUSTODY_WEAPONIZATION_PATTERNS,
            FINANCIAL_COERCION_PATTERNS,
            HOSTILITY_PATTERNS,
            MODERN_SLANG_PATTERNS,
            PROFANITY_PATTERNS,
            EVASION_PATTERNS,
            EMOTIONAL_MANIPULATION_PATTERNS,
            HOSTILE_EMOJI_PATTERNS,
            IMPLICIT_HOSTILITY_PATTERNS,
            COPARENTING_CONFLICT_PATTERNS,
            PARENTAL_ALIENATION_PATTERNS,
            SEXUAL_COERCION_PATTERNS,
            CONTEMPT_PATTERNS,
            # Extended patterns
            CONTEMPT_EXTENDED_PATTERNS,
            HOSTILITY_EXTENDED_PATTERNS,
            THREATENING_EXTENDED_PATTERNS,
            MANIPULATION_EXTENDED_PATTERNS,
            GASLIGHTING_EXTENDED_PATTERNS,
            CUSTODY_WEAPONIZATION_EXTENDED_PATTERNS,
            FINANCIAL_ABUSE_EXTENDED_PATTERNS,
            SEXUAL_HARASSMENT_EXTENDED_PATTERNS,
            PASSIVE_AGGRESSIVE_EXTENDED_PATTERNS,
            DISMISSIVE_EXTENDED_PATTERNS,
            PARENTAL_ALIENATION_EXTENDED_PATTERNS,
            HATE_SPEECH_CULTURAL_PATTERNS,
            ALL_CAPS_EXTENDED_PATTERNS,
            # Flexible patterns (shorter, word-order-flexible)
            PARENTAL_ALIENATION_FLEX_PATTERNS,
            HATE_SPEECH_FLEX_PATTERNS,
            GASLIGHTING_FLEX_PATTERNS,
            SEXUAL_HARASSMENT_FLEX_PATTERNS,
            FINANCIAL_ABUSE_FLEX_PATTERNS,
            CUSTODY_WEAPONIZATION_FLEX_PATTERNS,
            MANIPULATION_FLEX_PATTERNS,
            DISMISSIVE_FLEX_PATTERNS,
            CONTEMPT_FLEX_PATTERNS,
            HOSTILITY_FLEX_PATTERNS,
            PASSIVE_AGGRESSIVE_FLEX_PATTERNS,
            THREATENING_FLEX_PATTERNS,
            ALL_CAPS_FLEX_PATTERNS,
            # Round 2 flex patterns
            HATE_SPEECH_FLEX2_PATTERNS,
            THREATENING_FLEX2_PATTERNS,
            SEXUAL_HARASSMENT_FLEX2_PATTERNS,
            FINANCIAL_ABUSE_FLEX2_PATTERNS,
            CONTEMPT_FLEX2_PATTERNS,
            PASSIVE_AGGRESSIVE_FLEX2_PATTERNS,
            CUSTODY_WEAPONIZATION_FLEX2_PATTERNS,
            MANIPULATION_FLEX2_PATTERNS,
            DISMISSIVE_FLEX2_PATTERNS,
            GASLIGHTING_FLEX2_PATTERNS,
            # Round 3 flex patterns
            DISMISSIVE_FLEX3_PATTERNS,
            HOSTILITY_FLEX3_PATTERNS,
            GASLIGHTING_FLEX3_PATTERNS,
            ALL_CAPS_FLEX3_PATTERNS,
            CONTEMPT_FLEX3_PATTERNS,
            THREATENING_FLEX3_PATTERNS,
            SEXUAL_HARASSMENT_FLEX3_PATTERNS,
            MANIPULATION_FLEX3_PATTERNS,
            PASSIVE_AGGRESSIVE_FLEX3_PATTERNS,
            CUSTODY_WEAPONIZATION_FLEX3_PATTERNS,
            FINANCIAL_ABUSE_FLEX3_PATTERNS,
            HATE_SPEECH_FLEX3_PATTERNS,
            # Round 4 flex patterns (Corpus B)
            HOSTILITY_FLEX4_PATTERNS,
            CONTEMPT_FLEX4_PATTERNS,
            THREATENING_FLEX4_PATTERNS,
            DISMISSIVE_FLEX4_PATTERNS,
            FINANCIAL_ABUSE_FLEX4_PATTERNS,
            GASLIGHTING_FLEX4_PATTERNS,
            MANIPULATION_FLEX4_PATTERNS,
            CUSTODY_WEAPONIZATION_FLEX4_PATTERNS,
            PASSIVE_AGGRESSIVE_FLEX4_PATTERNS,
            SEXUAL_HARASSMENT_FLEX4_PATTERNS,
            HATE_SPEECH_FLEX4_PATTERNS,
            PARENTAL_ALIENATION_FLEX4_PATTERNS,
            PROFANITY_FLEX4_PATTERNS,
            ALL_CAPS_FLEX4_PATTERNS,
            # Round 5 flex patterns (Corpus B broad structural)
            THREATENING_FLEX5_PATTERNS,
            HOSTILITY_FLEX5_PATTERNS,
            DISMISSIVE_FLEX5_PATTERNS,
            FINANCIAL_ABUSE_FLEX5_PATTERNS,
            CUSTODY_WEAPONIZATION_FLEX5_PATTERNS,
            MANIPULATION_FLEX5_PATTERNS,
            CONTEMPT_FLEX5_PATTERNS,
            # Round 6 flex patterns (Corpus C targeted)
            CUSTODY_WEAPONIZATION_FLEX6_PATTERNS,
            THREATENING_FLEX6_PATTERNS,
            HATE_SPEECH_FLEX6_PATTERNS,
            FINANCIAL_ABUSE_FLEX6_PATTERNS,
            MANIPULATION_FLEX6_PATTERNS,
            DISMISSIVE_FLEX6_PATTERNS,
            CONTEMPT_FLEX6_PATTERNS,
            HOSTILITY_FLEX6_PATTERNS,
            PASSIVE_AGGRESSIVE_FLEX6_PATTERNS,
            GASLIGHTING_FLEX6_PATTERNS,
            SEXUAL_HARASSMENT_FLEX6_PATTERNS,
            PARENTAL_ALIENATION_FLEX6_PATTERNS,
            PROFANITY_FLEX6_PATTERNS,
            ALL_CAPS_FLEX6_PATTERNS,
            # Round 7 flex patterns (structural/cross-cutting)
            HOSTILITY_FLEX7_PATTERNS,
            CONTEMPT_FLEX7_PATTERNS,
            THREATENING_FLEX7_PATTERNS,
            MANIPULATION_FLEX7_PATTERNS,
            PASSIVE_AGGRESSIVE_FLEX7_PATTERNS,
            GASLIGHTING_FLEX7_PATTERNS,
            DISMISSIVE_FLEX7_PATTERNS,
            FINANCIAL_ABUSE_FLEX7_PATTERNS,
            CUSTODY_WEAPONIZATION_FLEX7_PATTERNS,
            PARENTAL_ALIENATION_FLEX7_PATTERNS,
            HATE_SPEECH_FLEX7_PATTERNS,
            SEXUAL_HARASSMENT_FLEX7_PATTERNS,
        )

        # Regex patterns for sarcasm, blame, dismissive, passive-aggressive detection
        # These provide a fallback when the LLM worker is down
        SARCASM_PATTERNS = [
            r"\byeah\s+right\b", r"\boh\s+sure\b", r"\bwhatever\b",
            r"\bthanks\s+a\s+lot\b", r"\bgreat\s+job\b.*\bnot\b",
            r"\breal\s+nice\b", r"\bhow\s+thoughtful\b",
        ]
        BLAME_PATTERNS = [
            r"\byour\s+fault\b", r"\byou\s+always\b", r"\byou\s+never\b",
            r"\bbecause\s+of\s+you\b", r"\bthanks\s+to\s+you\b",
            r"\byou\s+caused\b", r"\byou\s+ruined\b", r"\byou\s+made\s+me\b",
        ]
        DISMISSIVE_PATTERNS = [
            r"\bi\s+don'?t\s+care\b", r"\bnot\s+my\s+problem\b",
            r"\bdeal\s+with\s+it\b", r"\bget\s+over\s+it\b",
            r"\bwho\s+cares\b", r"\bnone\s+of\s+your\s+business\b",
        ]
        PASSIVE_AGGRESSIVE_PATTERNS = [
            r"\bfine\.?\s*$", r"\bwhatever\s+you\s+say\b",
            r"\bif\s+that'?s\s+what\s+you\s+want\b",
            r"\bi\s+guess\s+i'?ll\s+just\b", r"\bno\s+worries\b.*\bi\b",
            r"\bmust\s+be\s+nice\b", r"\bi'?m\s+sorry\s+you\s+feel\b",
        ]

        return {
            ToxicityCategory.HATE_SPEECH: (
                [re.compile(p, re.IGNORECASE) for p in HATE_SPEECH_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in HATE_SPEECH_CULTURAL_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in HATE_SPEECH_FLEX_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in HATE_SPEECH_FLEX2_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in HATE_SPEECH_FLEX3_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in HATE_SPEECH_FLEX4_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in HATE_SPEECH_FLEX6_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in HATE_SPEECH_FLEX7_PATTERNS]
            ),
            ToxicityCategory.SEXUAL_HARASSMENT: (
                [re.compile(p, re.IGNORECASE) for p in SEXUAL_HARASSMENT_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in SEXUAL_COERCION_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in SEXUAL_HARASSMENT_EXTENDED_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in SEXUAL_HARASSMENT_FLEX_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in SEXUAL_HARASSMENT_FLEX2_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in SEXUAL_HARASSMENT_FLEX3_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in SEXUAL_HARASSMENT_FLEX4_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in SEXUAL_HARASSMENT_FLEX6_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in SEXUAL_HARASSMENT_FLEX7_PATTERNS]
            ),
            ToxicityCategory.THREATENING: (
                [re.compile(p, re.IGNORECASE) for p in THREATENING_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in THREATENING_EXTENDED_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in THREATENING_FLEX_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in THREATENING_FLEX2_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in THREATENING_FLEX3_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in THREATENING_FLEX4_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in THREATENING_FLEX5_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in THREATENING_FLEX6_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in THREATENING_FLEX7_PATTERNS]
            ),
            ToxicityCategory.CUSTODY_WEAPONIZATION: (
                [re.compile(p, re.IGNORECASE) for p in CUSTODY_WEAPONIZATION_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CUSTODY_WEAPONIZATION_EXTENDED_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CUSTODY_WEAPONIZATION_FLEX_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CUSTODY_WEAPONIZATION_FLEX2_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CUSTODY_WEAPONIZATION_FLEX3_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CUSTODY_WEAPONIZATION_FLEX4_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CUSTODY_WEAPONIZATION_FLEX5_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CUSTODY_WEAPONIZATION_FLEX6_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CUSTODY_WEAPONIZATION_FLEX7_PATTERNS]
            ),
            ToxicityCategory.FINANCIAL_COERCION: (
                [re.compile(p, re.IGNORECASE) for p in FINANCIAL_COERCION_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in FINANCIAL_ABUSE_EXTENDED_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in FINANCIAL_ABUSE_FLEX_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in FINANCIAL_ABUSE_FLEX2_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in FINANCIAL_ABUSE_FLEX3_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in FINANCIAL_ABUSE_FLEX4_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in FINANCIAL_ABUSE_FLEX5_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in FINANCIAL_ABUSE_FLEX6_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in FINANCIAL_ABUSE_FLEX7_PATTERNS]
            ),
            ToxicityCategory.HOSTILITY: (
                [re.compile(p, re.IGNORECASE) for p in HOSTILITY_PATTERNS] +
                [re.compile(p, re.UNICODE) for p in HOSTILE_EMOJI_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CONTEMPT_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in COPARENTING_CONFLICT_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CONTEMPT_EXTENDED_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in HOSTILITY_EXTENDED_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CONTEMPT_FLEX_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in HOSTILITY_FLEX_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CONTEMPT_FLEX2_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CONTEMPT_FLEX3_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in HOSTILITY_FLEX3_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in HOSTILITY_FLEX4_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CONTEMPT_FLEX4_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in HOSTILITY_FLEX5_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CONTEMPT_FLEX5_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CONTEMPT_FLEX6_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in HOSTILITY_FLEX6_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in CONTEMPT_FLEX7_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in HOSTILITY_FLEX7_PATTERNS]
            ),
            ToxicityCategory.INSULT: [
                re.compile(p, re.IGNORECASE) for p in MODERN_SLANG_PATTERNS
            ],
            ToxicityCategory.PROFANITY: (
                [re.compile(p, re.IGNORECASE) for p in PROFANITY_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in EVASION_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in PROFANITY_FLEX4_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in PROFANITY_FLEX6_PATTERNS]
            ),
            ToxicityCategory.ALL_CAPS: (
                [re.compile(p, re.IGNORECASE) for p in EVASION_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in ALL_CAPS_EXTENDED_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in ALL_CAPS_FLEX_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in ALL_CAPS_FLEX3_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in ALL_CAPS_FLEX4_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in ALL_CAPS_FLEX6_PATTERNS]
            ),
            # Nuanced categories — regex fallback when LLM worker is unavailable
            ToxicityCategory.SARCASM: [
                re.compile(p, re.IGNORECASE) for p in SARCASM_PATTERNS
            ],
            ToxicityCategory.BLAME: (
                [re.compile(p, re.IGNORECASE) for p in BLAME_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in GASLIGHTING_EXTENDED_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in GASLIGHTING_FLEX_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in GASLIGHTING_FLEX2_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in GASLIGHTING_FLEX3_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in GASLIGHTING_FLEX4_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in GASLIGHTING_FLEX6_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in GASLIGHTING_FLEX7_PATTERNS]
            ),
            ToxicityCategory.DISMISSIVE: (
                [re.compile(p, re.IGNORECASE) for p in DISMISSIVE_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in DISMISSIVE_EXTENDED_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in DISMISSIVE_FLEX_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in DISMISSIVE_FLEX2_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in DISMISSIVE_FLEX3_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in DISMISSIVE_FLEX4_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in DISMISSIVE_FLEX5_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in DISMISSIVE_FLEX6_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in DISMISSIVE_FLEX7_PATTERNS]
            ),
            ToxicityCategory.PASSIVE_AGGRESSIVE: (
                [re.compile(p, re.IGNORECASE) for p in PASSIVE_AGGRESSIVE_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in IMPLICIT_HOSTILITY_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in PASSIVE_AGGRESSIVE_EXTENDED_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in PASSIVE_AGGRESSIVE_FLEX_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in PASSIVE_AGGRESSIVE_FLEX2_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in PASSIVE_AGGRESSIVE_FLEX3_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in PASSIVE_AGGRESSIVE_FLEX4_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in PASSIVE_AGGRESSIVE_FLEX6_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in PASSIVE_AGGRESSIVE_FLEX7_PATTERNS]
            ),
            ToxicityCategory.MANIPULATION: (
                [re.compile(p, re.IGNORECASE) for p in EMOTIONAL_MANIPULATION_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in PARENTAL_ALIENATION_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in MANIPULATION_EXTENDED_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in PARENTAL_ALIENATION_EXTENDED_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in MANIPULATION_FLEX_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in PARENTAL_ALIENATION_FLEX_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in MANIPULATION_FLEX2_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in MANIPULATION_FLEX3_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in MANIPULATION_FLEX4_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in PARENTAL_ALIENATION_FLEX4_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in MANIPULATION_FLEX5_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in MANIPULATION_FLEX6_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in PARENTAL_ALIENATION_FLEX6_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in MANIPULATION_FLEX7_PATTERNS] +
                [re.compile(p, re.IGNORECASE) for p in PARENTAL_ALIENATION_FLEX7_PATTERNS]
            ),
        }

    # Mediator Templates (BIFF Method: Brief, Informative, Friendly, Firm)
    TEMPLATES = {
        ToxicityCategory.THREATENING: [
            "I am feeling very upset right now. I need to take a break from this conversation. I will respond when I am calm.",
            "This conversation is becoming unproductive. Let's pause and continue this later within the app.",
        ],
        ToxicityCategory.HOSTILITY: [
            "I'm finding it hard to discuss this productively right now. Can we focus solely on the logistics for [Child's Name]?",
            "Let's keep our communication focused on the schedule and the children.",
        ],
        ToxicityCategory.PROFANITY: [
            "I am frustrated, but I want to keep this professional. Let's discuss the specific issue at hand.",
            "Please let me know what specific information you need regarding the schedule.",
        ],
        ToxicityCategory.INSULT: [
            "I disagree with your assessment, but I am willing to discuss the specific issue regarding the children.",
            "Let's move past personal comments and focus on the decision we need to make.",
        ],
        ToxicityCategory.BLAME: [
            "I see this situation differently. Let's focus on how to solve the problem moving forward.",
            "Rather than assigning blame, can we work together to find a solution?",
        ],
        ToxicityCategory.DISMISSIVE: [
            "I understand you might be busy, but I need a clear answer on this for the children's planning.",
            "Please let me know if you are available to discuss this, as I need to finalize the plan.",
        ],
    }

    # Context-Aware Phrase Replacements (Gentler, Mediator-style)
    SUGGESTIONS = {
        # Profanity and hostility -> De-escalation
        r'\bwhat\s+type\s+of\s+stupid\s+shit\s+is\s+that\b': "I don't understand the reasoning behind this request",
        r'\bshut\s*up\b': "I would appreciate a break from this conversation",
        r'\bfuck\s+off\b': "I am not willing to continue this conversation right now",
        r'\bgo\s+to\s+hell\b': "I am very upset",
        r'\bget\s+lost\b': "Please give me some space",
        r'\bfuck\s+you\b': "I am angry",
        r'\byou\s+are\s+a\s+bitch\b': "I am finding your behavior difficult",
        r'\bstop\s+being\s+a\s+bitch\b': "Please stop communicating this way",

        # Hate and contempt -> I-statements
        r'\bi\s+hate\s+you\b': "I am feeling very hostile towards you right now",
        r'\bhate\s+you\b': "I am struggling with our relationship",
        r'\bcan\'?t\s+stand\s+you\b': "I find interacting with you challenging",

        # Absolutes -> Observations
        r'\byou\s+never\b': "It seems that often",
        r'\byou\s+always\b': "I feel that frequently",
        r'\bevery\s+time\s+you\b': "When this happens",

        # Dismissive -> Engagement
        r'\bwhatever\b': "I hear you",
        r'\bfigure\s+it\s+out\b': "please clarify what you mean",
        r'\bnot\s+my\s+problem\b': "this is an issue we share",
        r'\bdeal\s+with\s+it\b': "we need to resolve this",
        r'\bgo\s+look\b': "the information is in the calendar",

        # Blame -> Shared Problem Solving
        r'\byour\s+fault\b': "the result of this situation",
        r'\bblame\s+you\b': "I feel this is responsible",
        
        # Insults -> Description of Behavior (not person)
        r'\bstupid\b': "unclear",
        r'\bidiot\b': "confused", 
        r'\bmoron\b': "mistaken",
        r'\bdumb\b': "ill-advised",
        r'\bdumbass\b': "unprofessional",
        r'\bcrazy\b': "unreasonable",
        r'\binsane\b': "difficult to understand",
    }
    def map_categories(self, ai_categories: List[str]) -> List[ToxicityCategory]:
        """Safe mapping of AI strings to ToxicityCategory enum."""
        valid_cats = []
        for cat in ai_categories:
            cat_lower = str(cat).lower().strip().replace(" ", "_")
            try:
                # Try direct value match
                valid_cats.append(ToxicityCategory(cat_lower))
            except ValueError:
                # Try to find a partial match or common aliases
                for member in ToxicityCategory:
                    if member.value in cat_lower or cat_lower in member.value:
                        valid_cats.append(member)
                        break
        return list(set(valid_cats))  # Unique members

    async def log_event(
        self,
        db: AsyncSession,
        user_id: str,
        family_file_id: Optional[str],
        message_id: str,
        content_type: str,
        analysis: SentimentAnalysis,
        context_data: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log an intervention event to DB (Synchronous/Blocking logging).
        Critical for reporting on blocked messages that never hit the Message table.
        """
        try:
            # Serialize generic labels/categories
            labels = [{"name": cat.value, "score": 1.0} for cat in analysis.categories]
            
            stmt = text("""
                INSERT INTO aria_events (
                    message_id, user_id, family_file_id, content_type,
                    classification_source, model_version,
                    toxicity_score, severity_level, labels,
                    action_taken, intervention_text, explanation,
                    context_data, original_content
                ) VALUES (
                    :msg_id, :uid, :ff_id, :ctype,
                    'regex', 'v3-hybrid',
                    :score, :severity, :labels,
                    :action, :intervention, :explanation,
                    :ctx_data, :orig_content
                )
            """)
            
            await db.execute(stmt, {
                "msg_id": message_id,
                "uid": user_id,
                "ff_id": family_file_id,
                "ctype": content_type,
                "score": analysis.toxicity_score,
                "severity": analysis.toxicity_level.value,
                "labels": json.dumps(labels),
                "action": "blocked" if analysis.block_send else "flagged",
                "intervention": "Action blocked by Safety Shield", # Generic for log
                "explanation": analysis.explanation,
                "ctx_data": json.dumps(context_data) if context_data else None,
                "orig_content": analysis.original_message
            })
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to log ARIA event: {e}")
            capture_error(e, tags={"service": "aria", "operation": "log_event"})

    async def analyze_message_hybrid(
        self,
        db: AsyncSession,
        message_id: str,
        message_text: str,
        user_id: str,
        family_file_id: Optional[str],
        context: Optional[List[str]] = None
    ) -> SentimentAnalysis:
        """
        Hybrid Analysis Flow (V3):
        1. Look up family file DV/sensitivity settings
        2. Fast Regex Check (Synchronous logic) with sensitivity offset
        3. If Blocked -> Return Blocked Result & Log Event
        4. If Allowed/Flagged -> Queue for Async ML (aria_jobs) & Return Fast Result
        """
        # 0. Look up DV sensitivity offset from family file
        sensitivity_offset = 0.0
        if family_file_id:
            from app.models.family_file import FamilyFile
            result = await db.execute(
                select(FamilyFile.is_dv_case, FamilyFile.aria_sensitivity_level)
                .where(FamilyFile.id == family_file_id)
            )
            row = result.first()
            if row:
                is_dv, level = row
                if is_dv or level == "maximum":
                    sensitivity_offset = 0.15
                elif level == "elevated":
                    sensitivity_offset = 0.08

        # 1. Fast Regex Check
        regex_result = self.analyze_message(message_text, context, sensitivity_offset)

        # Track ARIA metrics
        from app.utils.sentry_helpers import metric_increment, metric_distribution
        metric_increment("aria.analysis.total", tags={"method": "regex"})
        if regex_result.toxicity_score > 0:
            metric_distribution("aria.toxicity_score", regex_result.toxicity_score,
                                unit="none", tags={"method": "regex"})

        # 2. If already blocked, no need for ML
        if regex_result.block_send:
            metric_increment("aria.blocks", tags={
                "toxicity": regex_result.toxicity_level.value if regex_result.toxicity_level else "unknown",
            })
            # LOG IT Synchronously because application will raise 400 and drop it
            await self.log_event(
                db=db,
                user_id=user_id,
                family_file_id=family_file_id,
                message_id=message_id,
                content_type="text",
                analysis=regex_result,
                context_data={"preceding_messages": context}
            )
            return regex_result

        # 3. Queue for Async ML (Fire & Forget logic)
        try:
            # Prepare context with metadata for worker
            job_context = {
                "lines": context or [],
                "user_id": user_id,
                "family_file_id": family_file_id
            }
            context_json = json.dumps(job_context)
            
            stmt = text("""
                INSERT INTO aria_jobs (message_id, message_text, context, status)
                VALUES (:msg_id, :msg_text, :ctx, 'pending')
            """)
            
            await db.execute(stmt, {
                "msg_id": message_id,
                "msg_text": message_text,
                "ctx": context_json
            })
            await db.commit() 
            
        except Exception as e:
            logger.error(f"Failed to queue ARIA job: {e}")
            capture_error(e, tags={"service": "aria", "operation": "queue_job"})

        return regex_result

    async def analyze_image_job_hybrid(
        self,
        db: AsyncSession,
        message_id: str,
        image_url: str,
        user_id: str,
        family_file_id: Optional[str],
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Queue an image analysis job (Vision).
        """
        try:
            # Prepare context for the job
            job_context = context or {}
            job_context["type"] = "image"
            job_context["image_url"] = image_url
            job_context["user_id"] = user_id
            job_context["family_file_id"] = family_file_id
            
            context_json = json.dumps(job_context)
            
            # Using 'pending' status. We use message_text strictly as a label here since images have no text.
            stmt = text("""
                INSERT INTO aria_jobs (message_id, message_text, context, status)
                VALUES (:msg_id, '[IMAGE_ATTACHMENT]', :ctx, 'pending')
            """)
            
            await db.execute(stmt, {
                "msg_id": message_id,
                "ctx": context_json
            })
            await db.commit() 
            
        except Exception as e:
            logger.error(f"Failed to queue ARIA image job: {e}")
            capture_error(e, tags={"service": "aria", "operation": "queue_image_job"})


    @staticmethod
    def _normalize_text(text: str) -> str:
        """Normalize leetspeak, txtspeak, censored words, and common evasions for pattern matching."""
        normalized = text

        # Censored/masked profanity expansion (f**k, sh*t, b*tch, etc.)
        censored_words = [
            (r'\bf[\*\#]{1,3}k\w*\b', 'fuck'),
            (r'\bs[\*\#]{1,2}t\b', 'shit'),
            (r'\bsh[\*\#]t\b', 'shit'),
            (r'\bb[\*\#]{1,2}ch\b', 'bitch'),
            (r'\bb[\*\#]tch\b', 'bitch'),
            (r'\ba[\*\#]{1,2}hole\b', 'asshole'),
            (r'\ba[\*\#]s\b', 'ass'),
            (r'\bd[\*\#]mn\b', 'damn'),
            (r'\bd[\*\#]{1,2}n\b', 'damn'),
            (r'\bh[\*\#]ll\b', 'hell'),
            (r'\bb[\*\#]stard\b', 'bastard'),
            (r'\bcr[\*\#]p\b', 'crap'),
            (r'\bwh[\*\#]re\b', 'whore'),
            (r'\bsl[\*\#]t\b', 'slut'),
            (r'\bp[\*\#]ss\b', 'piss'),
            (r'\bd[\*\#]ck\w*\b', 'dick'),
            (r'\bc[\*\#]{1,2}k\b', 'cock'),
            (r'\bpr[\*\#]ck\b', 'prick'),
            (r'\bp[\*\#]thetic\b', 'pathetic'),
        ]
        for pattern, replacement in censored_words:
            normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)

        # Leetspeak → letters (only when adjacent to letters, not standalone numbers)
        leet_map = {
            '0': 'o', '3': 'e', '4': 'a', '5': 's',
            '7': 't', '@': 'a', '$': 's',
        }
        for leet, letter in leet_map.items():
            normalized = re.sub(
                rf'(?<=[a-zA-Z]){re.escape(leet)}|{re.escape(leet)}(?=[a-zA-Z])',
                letter, normalized
            )

        # Toxic emoji → text
        emoji_map = {
            '💩': ' shit ', '🖕': ' fuck you ', '🤡': ' clown ',
            '🐍': ' snake ', '🗑': ' trash ', '🗑️': ' trash ',
            '💀': ' dead ', '🤮': ' disgusting ',
        }
        for emoji, text_val in emoji_map.items():
            normalized = normalized.replace(emoji, text_val)

        # Common txtspeak → full words
        txtspeak = [
            (r'\bur\b', 'your'), (r'\bu\b', 'you'), (r'\byr\b', 'your'),
            (r'\bda\b', 'the'), (r'\bw/', 'with'), (r'\bb/c\b', 'because'),
            (r'\bwont\b', "won't"), (r'\bdont\b', "don't"), (r'\bcant\b', "can't"),
            (r'\bwanna\b', 'want to'), (r'\bgonna\b', 'going to'),
            (r'\bgotta\b', 'got to'), (r'\bimo\b', 'in my opinion'),
            (r'\btho\b', 'though'), (r'\bthru\b', 'through'),
            (r'\bcuz\b', 'because'), (r'\bwut\b', 'what'), (r'\bdat\b', 'that'),
            (r'\bdem\b', 'them'), (r'\bdis\b', 'this'), (r'\bnuthin\b', 'nothing'),
            (r'\bnothin\b', 'nothing'), (r'\bsumthin\b', 'something'),
            (r'\bsomethin\b', 'something'), (r'\bwutever\b', 'whatever'),
            (r'\bwhatevr\b', 'whatever'), (r'\bwatever\b', 'whatever'),
            (r'\byew\b', 'you'), (r'\byu\b', 'you'), (r'\byer\b', 'your'),
            (r'\bma\b', 'my'), (r'\btat\b', 'that'), (r'\bwif\b', 'with'),
            (r'\blyke\b', 'like'), (r'\bwen\b', 'when'), (r'\bwit\b', 'with'),
            (r'\bnaw\b', 'no'), (r'\bder\b', 'their'), (r'\bde\b', 'the'),
            (r'\btha\b', 'the'), (r'\bn\b', 'and'), (r'\bthnk\b', 'think'),
            (r'\bthk\b', 'think'), (r'\bknw\b', 'know'),
        ]
        for pattern, replacement in txtspeak:
            normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)

        # Collapse repeated characters (e.g., "stopp" → "stop", "riight" → "right")
        normalized = re.sub(r'(.)\1{2,}', r'\1\1', normalized)  # 3+ → 2
        # Common doubled-letter typos (careful not to break valid doubles like "ll", "ss", "ee")
        normalized = re.sub(r'\b(\w*?)([^lsetnr])\2(\w*)\b',
                           lambda m: m.group(1) + m.group(2) + m.group(3) if len(m.group(0)) > 3 else m.group(0),
                           normalized)

        return normalized

    def analyze_message(
        self,
        message: str,
        context: Optional[List[str]] = None,
        sensitivity_offset: float = 0.0
    ) -> SentimentAnalysis:
        """
        Analyze a message for toxicity (Regex Pattern Engine).

        Args:
            message: The message to analyze
            context: Optional list of recent messages for context

        Returns:
            SentimentAnalysis with results and suggestions
        """
        triggers = []
        categories = []

        # Check for ALL CAPS (shouting)
        # TWEAK: Only trigger if message is reasonably long (>3 words) to avoid "LOL" or "OKAY" false positives
        # TWEAK: Require > 60% caps to be safer
        # Also check character-level: >60% uppercase alpha chars with >3 words catches mixed-case shouting
        words = message.split()
        is_caps = False
        if len(words) > 3:
            caps_words = sum(1 for w in words if w.isupper() and len(w) > 1) # Ignore single letter "I" or "A"
            if caps_words / len(words) > 0.6:
                is_caps = True
            else:
                # Character-level check for mixed-case shouting (e.g., "STOP talking to ME like THAT")
                alpha_chars = [c for c in message if c.isalpha()]
                if len(alpha_chars) > 10:
                    upper_ratio = sum(1 for c in alpha_chars if c.isupper()) / len(alpha_chars)
                    if upper_ratio > 0.6:
                        is_caps = True
        if is_caps:
                categories.append(ToxicityCategory.ALL_CAPS)
                triggers.append("EXCESSIVE CAPS")

        # Normalize text for evasion-resistant matching (leetspeak, txtspeak)
        normalized = self._normalize_text(message)
        texts_to_check = [message] if normalized == message else [message, normalized]

        # Check each category of patterns
        for category, patterns in self.compiled_patterns.items():
            # Skip ALL_CAPS in regex loop since we handled it manually above
            if category == ToxicityCategory.ALL_CAPS:
                continue

            for text_variant in texts_to_check:
                for pattern in patterns:
                    # Use finditer to get the FULL MATCH, ignoring capture groups
                    # valid_triggers avoids returning just "yo" from "(yo)?u"
                    matches = pattern.finditer(text_variant)
                    for match in matches:
                        full_phrase = match.group().strip()
                        if full_phrase:
                            if category not in categories:
                                categories.append(category)
                            triggers.append(full_phrase)

        # Calculate toxicity score and level
        toxicity_score = self._calculate_score(categories, triggers)
        # DV-mode: apply sensitivity offset to tighten thresholds
        # sensitivity_offset=0.15 means all thresholds are lowered by 0.15
        toxicity_level = self._get_level(toxicity_score, sensitivity_offset)

        # Blocking Logic: Block if SEVERE and THREATENING (physical harm)
        # Also block HATE SPEECH and SEXUAL HARASSMENT automatically
        # UPDATE: User requested zero tolerance for threats ("ill knock you out")
        # DV-mode: also block HIGH severity messages (not just SEVERE)
        block_send = (
            ToxicityCategory.THREATENING in categories or
            ToxicityCategory.HATE_SPEECH in categories or
            ToxicityCategory.SEXUAL_HARASSMENT in categories
        )
        if sensitivity_offset > 0 and toxicity_level in [ToxicityLevel.HIGH, ToxicityLevel.SEVERE]:
            block_send = True

        # Generate explanation
        explanation = self._generate_explanation(categories)

        # Generate suggestion if needed
        suggestion = None
        if toxicity_level != ToxicityLevel.NONE:
            suggestion = self._generate_suggestion(message, categories, toxicity_level)

        return SentimentAnalysis(
            original_message=message,
            toxicity_level=toxicity_level,
            toxicity_score=toxicity_score,
            categories=categories,
            triggers=list(set(triggers)),  # Deduplicate
            explanation=explanation,
            suggestion=suggestion, 
            is_flagged=toxicity_level != ToxicityLevel.NONE,
            block_send=block_send,
            timestamp=datetime.utcnow()
        )

    def _calculate_score(
        self,
        categories: List[ToxicityCategory],
        triggers: List[str]
    ) -> float:
        """
        Calculate toxicity score from 0.0 to 1.0

        IMPORTANT: This is for COURT DOCUMENTATION.
        We use stricter scoring because all communication may be reviewed by a judge.
        """
        if not categories:
            return 0.0

        # Weight by category severity (stricter for court context)
        weights = {
            ToxicityCategory.THREATENING: 0.95,     # Physical threats = SEVERE
            ToxicityCategory.HOSTILITY: 0.6,        # "I hate you" = High Risk
            ToxicityCategory.PROFANITY: 0.4,        # Swearing = unprofessional
            ToxicityCategory.INSULT: 0.5,           # Name-calling = unprofessional
            ToxicityCategory.BLAME: 0.4,            # Blame = conflict escalation
            ToxicityCategory.DISMISSIVE: 0.3,       # Dismissive = non-collaborative
            ToxicityCategory.PASSIVE_AGGRESSIVE: 0.3,  # PA = conflict escalation
            ToxicityCategory.SARCASM: 0.3,          # Sarcasm = unprofessional
            ToxicityCategory.ALL_CAPS: 0.2,         # Shouting = aggressive
            ToxicityCategory.MANIPULATION: 0.5,     # Manipulation = bad faith
            ToxicityCategory.CUSTODY_WEAPONIZATION: 0.8,  # Very high - courts hate this
            ToxicityCategory.FINANCIAL_COERCION: 0.6,
            ToxicityCategory.HATE_SPEECH: 1.0,      # ZERO TOLERANCE
            ToxicityCategory.SEXUAL_HARASSMENT: 1.0, # ZERO TOLERANCE
        }

        score = sum(weights.get(cat, 0.2) for cat in set(categories))

        # Add bonus for multiple triggers (indicates pattern)
        score += len(triggers) * 0.1

        return min(1.0, score)

    def _get_level(self, score: float, sensitivity_offset: float = 0.0) -> ToxicityLevel:
        """Convert score to toxicity level.

        Args:
            score: Toxicity score 0.0-1.0
            sensitivity_offset: Lowers all thresholds by this amount.
                DV cases use 0.15, meaning LOW triggers at 0.15 instead of 0.3.
        """
        if score == 0:
            return ToxicityLevel.NONE
        elif score < (0.3 - sensitivity_offset):
            return ToxicityLevel.LOW
        elif score < (0.6 - sensitivity_offset):
            return ToxicityLevel.MEDIUM
        elif score < (0.85 - sensitivity_offset):
            return ToxicityLevel.HIGH
        else:
            return ToxicityLevel.SEVERE

    def _generate_suggestion(
        self,
        message: str,
        categories: List[ToxicityCategory],
        toxicity_level: ToxicityLevel,
        conversation_context: Optional[List[str]] = None,
    ) -> str:
        """
        Generate a gentler alternative message.

        Args:
            message: The flagged message
            categories: Detected toxicity categories
            toxicity_level: Overall toxicity level
            conversation_context: Optional list of recent message strings for context-aware rewrites.
                When provided (future use), can be used to make suggestions more relevant
                to the conversation topic.
        """
        import random

        # STRATEGY 1: TEMPLATE RESPONSE (For High/Severe Toxicity)
        if toxicity_level in [ToxicityLevel.HIGH, ToxicityLevel.SEVERE]:
            priority_order = [
                ToxicityCategory.THREATENING,
                ToxicityCategory.HOSTILITY,
                ToxicityCategory.INSULT,
                ToxicityCategory.PROFANITY,
                ToxicityCategory.BLAME
            ]

            for category in priority_order:
                if category in categories and category in self.TEMPLATES:
                    return random.choice(self.TEMPLATES[category])

            return "I am feeling frustrated. I would like to pause this conversation and return to it later when I can be more productive."

        # STRATEGY 2: INTELLIGENT REPLACEMENT (For Low/Medium Toxicity)
        suggestion = message

        # Apply phrase-based replacements
        for pattern, replacement in self.SUGGESTIONS.items():
            suggestion = re.sub(pattern, replacement, suggestion, flags=re.IGNORECASE)

        # Clean up extra spaces
        suggestion = re.sub(r'\s+', ' ', suggestion).strip()

        # Fallback
        if len(suggestion) < 3:
             return "I understand your perspective. Let's discuss the logistics."

        return suggestion

    def _generate_explanation(self, categories: List[ToxicityCategory]) -> str:
        """
        Generate human-readable explanation.
        """
        if not categories:
            return "This message is appropriate for court documentation."

        explanations = {
            ToxicityCategory.THREATENING: "contains threatening language",
            ToxicityCategory.HOSTILITY: "includes hostile language",
            ToxicityCategory.PROFANITY: "contains profanity",
            ToxicityCategory.INSULT: "uses insults",
            ToxicityCategory.BLAME: "places blame",
            ToxicityCategory.DISMISSIVE: "appears dismissive",
            ToxicityCategory.PASSIVE_AGGRESSIVE: "has a passive-aggressive tone",
            ToxicityCategory.SARCASM: "uses sarcasm",
            ToxicityCategory.ALL_CAPS: "uses all caps (shouting)",
            ToxicityCategory.MANIPULATION: "appears manipulative",
            ToxicityCategory.CUSTODY_WEAPONIZATION: "uses children as leverage",
            ToxicityCategory.FINANCIAL_COERCION: "links finances to parenting time",
            ToxicityCategory.HATE_SPEECH: "contains hate speech (ZERO TOLERANCE)",
            ToxicityCategory.SEXUAL_HARASSMENT: "contains inappropriate content (ZERO TOLERANCE)",
        }

        issues = [explanations.get(cat, str(cat)) for cat in set(categories)]

        if len(issues) == 1:
            return f"⚠️ Court Context Warning: This message {issues[0]}."
        else:
            return f"⚠️ Court Context Warning: This message {', '.join(issues[:-1])}, and {issues[-1]}."

    def get_intervention_message(self, analysis: SentimentAnalysis) -> Dict[str, Any]:
        """
        Format ARIA's intervention for the frontend with NUDGE logic.
        
        Instead of rewriting, we pause the user to consider the court/child impact.
        """
        if not analysis.is_flagged:
            return {}

        level_headers = {
            ToxicityLevel.LOW: "Pause & Reflect",
            ToxicityLevel.MEDIUM: "Court Risk Warning",
            ToxicityLevel.HIGH: "High Risk Alert",
            ToxicityLevel.SEVERE: "Message Blocked",
        }

        # NUDGE: Child-Centric Pauses
        # We select the most severe category to tailor the nudge
        primary_category = analysis.categories[0] if analysis.categories else None
        
        nudges = {
            ToxicityCategory.HOSTILITY: "This message reads as hostile. Judges look for parents who can communicate professionally despite conflict. Takes a moment to rephrase?",
            ToxicityCategory.INSULT: "Name-calling can damage your credibility in court. Try describing the behavior, not the person.",
            ToxicityCategory.PROFANITY: "Profanity is unprofessional in legal documentation. Keeping it clean protects your case.",
            ToxicityCategory.CUSTODY_WEAPONIZATION: "Using access to children as leverage is viewed very negatively by courts. Focus on the schedule.",
            ToxicityCategory.FINANCIAL_COERCION: "Courts prefer financial and parenting issues to be kept separate. Focus on the parenting logistics.",
            ToxicityCategory.BLAME: "Focusing on blame rarely solves the problem. Suggest a specific solution instead.",
            ToxicityCategory.THREATENING: "Threatening language is never acceptable. This message has been flagged for safety review.",
        }
        
        # Default nudge if no specific category match
        child_reminder = nudges.get(
            primary_category, 
            "Does this message help your co-parenting relationship? Keep it business-like and child-focused."
        )

        return {
            "level": analysis.toxicity_level.value,
            "header": level_headers.get(analysis.toxicity_level, "Communication Alert"),
            "explanation": analysis.explanation,
            "original_message": analysis.original_message,
            "toxicity_score": analysis.toxicity_score,
            "categories": [cat.value for cat in analysis.categories],
            "court_reminder": "Remember: This message is permanent legal documentation.",
            "child_reminder": child_reminder,
            "block_send": analysis.block_send
        }

    async def analyze_with_ai(
        self,
        message: str,
        case_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Deep AI-powered analysis using OpenAI (default) for nuanced detection.

        Delegates to analyze_with_openai to ensure consistency across the platform.

        Args:
            message: Message content to analyze
            case_context: Optional context (children names, agreement details, etc.)

        Returns:
            AI analysis result with detailed feedback
        """
        return await self.analyze_with_openai(message, case_context)


    async def analyze_with_openai(
        self,
        message: str,
        case_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Deep AI-powered analysis using OpenAI GPT-4 for nuanced detection.

        Alternative to Claude - uses OpenAI's GPT-4 model.

        Args:
            message: Message content to analyze
            case_context: Optional context (children names, agreement details, etc.)

        Returns:
            AI analysis result with detailed feedback
        """
        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=30.0)

            # Build context
            context_info = ""
            if case_context and "children" in case_context:
                children = case_context["children"]
                if children:
                    names = ", ".join([c.get("first_name", "") for c in children if c.get("first_name")])
                    context_info = f"\n\nContext: Communication about co-parenting {names}."

            # System prompt
            system_prompt = """You are ARIA, an AI safety filter for co-parenting communication in CommonGround.

CRITICAL CONTEXT: All messages are COURT DOCUMENTATION reviewed by judges, attorneys, and guardians ad litem. This is NOT private messaging — it is LEGAL EVIDENCE. Your job is to FLAG anything a judge would find inappropriate, hostile, or harmful.

ERR ON THE SIDE OF FLAGGING. It is far worse to let a hostile message through than to flag a borderline one. If in doubt, flag it.

Analyze messages for COURT-INAPPROPRIATE content using these categories:
- PROFANITY: Swear words, vulgar language, crude references
- INSULT: Name-calling, demeaning labels, character attacks
- HOSTILITY: Aggressive, angry, confrontational, contemptuous, or exasperated tone. Includes "I'm sick of you", "I'm done with you", "every time you...", "here you go again", "oh my god" + frustration
- SARCASM: Mocking, biting irony, rhetorical dismissal
- BLAME: Accusing the other parent — "you always", "you never", "every time you", "because of you"
- DISMISSIVE: Belittling, minimizing, ignoring concerns
- THREATENING: Physical threats, veiled threats about "last time they see you", intimidation
- MANIPULATION: Emotional coercion, guilt-tripping, gaslighting
- PASSIVE_AGGRESSIVE: Indirect aggression, weaponized compliance
- CUSTODY_WEAPONIZATION: Using children/visitation as leverage, gatekeeping, conditional access
- FINANCIAL_COERCION: Using money as leverage, withholding support
- HATE_SPEECH: Attacks on protected characteristics
- SEXUAL_HARASSMENT: Sexual content, sexual coercion, conditioning custody/access on sex (e.g., "no head no babies", "if you want to see them we need to have sex")

EXAMPLES THAT MUST BE FLAGGED:
- "You're always doing this to me" → BLAME (0.4) — accusatory absolute statement
- "Oh my god I'm sick of you" → HOSTILITY (0.5) — contempt and disgust
- "If you want to see them we need to have sex" → SEXUAL_HARASSMENT + CUSTODY_WEAPONIZATION (0.9) — sexual coercion tied to custody
- "No head no babies simple as that" → SEXUAL_HARASSMENT (0.85) — transactional sex demand
- "Keep acting like that and it will be the last time they see you" → THREATENING + CUSTODY_WEAPONIZATION (0.7) — veiled threat about access
- "Every time I try to move on here you come with this" → BLAME + HOSTILITY (0.4) — accusatory, contemptuous

A message does NOT need profanity to be hostile. Contempt, disgust, exasperation directed at the other parent is HOSTILITY. Absolute statements ("you always", "you never", "every time") are BLAME.

Guidance for Suggestions:
Use the BIFF Method (Brief, Informative, Friendly, Firm).
- REWRITE the ENTIRE message to focus on co-parenting business.
- If purely abusive, suggest: "I am feeling frustrated and will return to this later."

SAFETY PROTOCOL:
Physical threats, sexual coercion, or hate speech → score 0.85-1.0.
Contempt, blame, hostility → score 0.3-0.6.
Passive-aggressive, dismissive → score 0.2-0.4.

Respond in JSON format only."""

            # Analysis prompt
            prompt = f"""Analyze this co-parenting message:{context_info}

MESSAGE: "{message}"

Respond in JSON format:
{{
    "toxicity_score": 0.0-1.0,
    "categories": ["list of issues"],
    "triggers": ["specific problematic phrases"],
    "explanation": "why this is problematic for court",
    "suggestions": ["Brief, Informative, Friendly, Firm alternative"]
}}"""

            # Call OpenAI API with Sentry AI span
            from app.utils.sentry_helpers import ai_span
            with ai_span("message_analysis", "gpt-4", "openai") as span:
                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.2,
                    max_tokens=1024,
                    response_format={"type": "json_object"}
                )
                if hasattr(response, 'usage') and response.usage:
                    span.set_data("input_tokens", response.usage.prompt_tokens)
                    span.set_data("output_tokens", response.usage.completion_tokens)

            # Parse response
            response_text = response.choices[0].message.content
            analysis = json.loads(response_text)

            return {
                "ai_powered": True,
                "provider": "openai",
                "toxicity_score": float(analysis.get("toxicity_score", 0.0)),
                "categories": analysis.get("categories", []),
                "triggers": analysis.get("triggers", []),
                "explanation": analysis.get("explanation", ""),
                "suggestions": analysis.get("suggestions", []),
                "model": "gpt-4"
            }

        except Exception as e:
            # Fallback to regex analysis
            logger.error(f"OpenAI analysis failed: {e}")
            capture_error(e, tags={"service": "aria", "operation": "openai_analysis"})
            regex_analysis = self.analyze_message(message)
            return {
                "ai_powered": False,
                "provider": "regex",
                "toxicity_score": regex_analysis.toxicity_score,
                "categories": [cat.value for cat in regex_analysis.categories],
                "triggers": regex_analysis.triggers,
                "explanation": regex_analysis.explanation,
                "suggestions": [regex_analysis.suggestion] if regex_analysis.suggestion else [],
                "error": str(e)
            }

    async def calculate_good_faith_metrics(
        self,
        db: AsyncSession,
        user_id: str,
        case_id: str,
        period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Calculate good faith communication metrics for a user.

        Tracks:
        - Total messages sent
        - How many were flagged by ARIA
        - Flag rate percentage
        - Average toxicity score
        - Suggestion acceptance rate
        - Communication trend (improving/stable/worsening)

        Args:
            db: Database session
            user_id: User to analyze
            case_id: Case context
            period_days: Analysis period (default: 30 days)

        Returns:
            Comprehensive good faith metrics
        """
        cutoff_date = datetime.utcnow() - timedelta(days=period_days)

        # Get all messages from user in period
        result = await db.execute(
            select(Message).where(
                and_(
                    Message.sender_id == user_id,
                    Message.case_id == case_id,
                    Message.sent_at >= cutoff_date
                )
            )
        )
        messages = result.scalars().all()

        if not messages:
            return {
                "user_id": user_id,
                "case_id": case_id,
                "period_days": period_days,
                "total_messages": 0,
                "compliance_score": "insufficient_data"
            }

        # Get flagged messages
        flag_result = await db.execute(
            select(MessageFlag)
            .join(Message, MessageFlag.message_id == Message.id)
            .where(
                and_(
                    Message.sender_id == user_id,
                    Message.case_id == case_id,
                    Message.sent_at >= cutoff_date
                )
            )
        )
        flags = flag_result.scalars().all()

        flagged_count = len(flags)
        total = len(messages)
        flag_rate = (flagged_count / total * 100) if total > 0 else 0

        # Calculate average toxicity
        toxicity_scores = [f.toxicity_score for f in flags if f.toxicity_score]
        avg_toxicity = sum(toxicity_scores) / len(toxicity_scores) if toxicity_scores else 0.0
        # Suggestion acceptance rates
        accepted = sum(1 for f in flags if f.user_action == "accepted")
        modified = sum(1 for f in flags if f.user_action == "modified")
        rejected = sum(1 for f in flags if f.user_action == "rejected")
        sent_anyway = sum(1 for f in flags if f.user_action == "sent_anyway")

        total_interventions = accepted + modified + rejected + sent_anyway
        acceptance_rate = (accepted / total_interventions * 100) if total_interventions > 0 else 0

        # Trend analysis (first half vs second half)
        midpoint = cutoff_date + timedelta(days=period_days // 2)
        first_half = [f for f in flags if f.created_at < midpoint]
        second_half = [f for f in flags if f.created_at >= midpoint]

        first_rate = len(first_half) / (total / 2) if total > 0 else 0
        second_rate = len(second_half) / (total / 2) if total > 0 else 0

        if second_rate < first_rate * 0.8:
            trend = "improving"
        elif second_rate > first_rate * 1.2:
            trend = "worsening"
        else:
            trend = "stable"

        # Compliance score
        if acceptance_rate >= 70 and flag_rate < 20:
            compliance = "excellent"
        elif acceptance_rate >= 50 and flag_rate < 40:
            compliance = "good"
        elif acceptance_rate >= 30 and flag_rate < 60:
            compliance = "fair"
        else:
            compliance = "needs_improvement"

        return {
            "user_id": user_id,
            "case_id": case_id,
            "period_start": cutoff_date.isoformat(),
            "period_end": datetime.utcnow().isoformat(),
            "total_messages": total,
            "flagged_messages": flagged_count,
            "flag_rate": round(flag_rate, 2),
            "suggestions_accepted": accepted,
            "suggestions_modified": modified,
            "suggestions_rejected": rejected,
            "sent_anyway": sent_anyway,
            "acceptance_rate": round(acceptance_rate, 2),
            "average_toxicity": round(avg_toxicity, 3),
            "trend": trend,
            "compliance_score": compliance
        }

    async def get_conversation_health(
        self,
        db: AsyncSession,
        case_id: str,
        period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Get overall conversation health for a case (both parents).

        Args:
            db: Database session
            case_id: Case to analyze
            period_days: Analysis period

        Returns:
            Overall health metrics for the case
        """
        cutoff_date = datetime.utcnow() - timedelta(days=period_days)

        # Get all messages
        result = await db.execute(
            select(Message).where(
                and_(
                    Message.case_id == case_id,
                    Message.sent_at >= cutoff_date
                )
            )
        )
        messages = result.scalars().all()

        if not messages:
            return {
                "case_id": case_id,
                "health_status": "insufficient_data",
                "total_messages": 0
            }

        # Get unique senders
        senders = list(set(msg.sender_id for msg in messages))

        # Calculate per-parent metrics
        parent_metrics = {}
        for sender_id in senders:
            metrics = await self.calculate_good_faith_metrics(
                db, sender_id, case_id, period_days
            )
            parent_metrics[sender_id] = metrics

        # Overall statistics
        total_flagged = sum(m["flagged_messages"] for m in parent_metrics.values())
        overall_flag_rate = (total_flagged / len(messages) * 100) if messages else 0

        avg_scores = [m["average_toxicity"] for m in parent_metrics.values() if m["average_toxicity"] > 0]
        overall_toxicity = sum(avg_scores) / len(avg_scores) if avg_scores else 0

        # Health determination
        if overall_flag_rate < 15 and overall_toxicity < 0.3:
            health = "excellent"
        elif overall_flag_rate < 30 and overall_toxicity < 0.5:
            health = "good"
        elif overall_flag_rate < 50 and overall_toxicity < 0.7:
            health = "fair"
        else:
            health = "concerning"

        return {
            "case_id": case_id,
            "period_days": period_days,
            "total_messages": len(messages),
            "total_flagged": total_flagged,
            "overall_flag_rate": round(overall_flag_rate, 2),
            "overall_toxicity": round(overall_toxicity, 3),
            "health_status": health,
            "parent_metrics": parent_metrics,
            "last_activity": max(msg.sent_at for msg in messages).isoformat() if messages else None
        }

    # =========================================================================
    # ARIA v2 — Context-Aware Rewriting & Reply Suggestions
    # =========================================================================

    async def generate_contextual_rewrite(
        self,
        flagged_message: str,
        thread_history: List[str],
        flag_reason: str,
        aria_mode: str = "standard"
    ) -> Optional[str]:
        """
        ARIA v2: Rewrite a flagged outgoing message using conversation thread context.

        Unlike the old nudge approach, ARIA now rewrites the entire message to be:
        - On-topic with the thread (not a generic rephrase)
        - Calm and child-focused
        - Productive rather than escalating

        Args:
            flagged_message: The toxic message the parent tried to send
            thread_history: Recent messages in the thread (newest last)
            flag_reason: Human-readable reason(s) why it was flagged
            aria_mode: 'standard' or 'strict'

        Returns:
            The rewritten message string, or None if rewrite fails
        """
        try:
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=30.0)

            thread_context = ""
            if thread_history:
                # Show up to the last 10 messages for context
                recent = thread_history[-10:]
                thread_context = "\n".join(f"- {msg}" for msg in recent)
            else:
                thread_context = "No prior messages in this thread."

            tone_instruction = (
                "Use a firm but neutral tone."
                if aria_mode == "strict"
                else "Use a warm, collaborative tone."
            )

            system_prompt = f"""You are ARIA, a co-parenting communication assistant for CommonGround.

YOUR TASK:
Rewrite flagged messages to be calm, child-focused, and productive.

STRICT RULES:
1. Stay on the EXACT topic of the thread — do not change the subject.
2. Do NOT translate insults or anger. Redirect to the co-parenting task instead.
3. Keep it brief (1–3 sentences).
4. {tone_instruction}
5. Start with a phrase that acknowledges the topic (e.g. "To keep us on track with the pickup schedule...")
6. Output ONLY the rewritten message — no quotes, no explanation, no prefix.

If the original message had zero constructive content (pure abuse), suggest:
"I need a moment to collect my thoughts. Let's continue this conversation later."
"""
            user_prompt = f"""THREAD CONTEXT — recent messages:
{thread_context}

The parent just tried to send this message:
"{flagged_message}"

This message was flagged for: {flag_reason}
"""
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=256,
                system=[{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}],
                messages=[{"role": "user", "content": user_prompt}]
            )

            rewrite = response.content[0].text.strip()
            return rewrite if rewrite else None

        except Exception as e:
            logger.error(f"[ARIA v2] generate_contextual_rewrite (Claude) failed: {e}")
            capture_error(e, tags={"service": "aria", "operation": "contextual_rewrite"})
            
            # Fallback to OpenAI if Anthropic fails
            try:
                logger.info("[ARIA v2] Attempting OpenAI fallback for contextual rewrite...")
                openai_client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=30.0)

                # Use a similar prompt for OpenAI
                response = openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are ARIA, a co-parenting communication assistant for CommonGround. Rewrite provided toxic messages to be calm, child-focused, and productive. Follow the BIFF method (Brief, Informative, Friendly, Firm). Output ONLY the rewritten message."},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=256,
                    temperature=0.7
                )
                
                rewrite = response.choices[0].message.content.strip()
                if rewrite:
                    logger.info("[ARIA v2] OpenAI fallback successful.")
                    return rewrite
            except Exception as oe:
                logger.error(f"[ARIA v2] OpenAI fallback failed: {oe}")
                
            return None

    async def generate_reply_suggestion(
        self,
        incoming_message: str,
        thread_history: List[str],
        aria_mode: str = "standard"
    ) -> List[str]:
        """
        ARIA v2: Generate 1–2 ready-to-use civil reply suggestions for an incoming message.

        These are offered to the RECIPIENT as optional starter replies. The goal is
        to keep the conversation productive and child-focused.

        Args:
            incoming_message: The message that was just received
            thread_history: Recent messages in the thread
            aria_mode: 'standard' or 'strict'

        Returns:
            List of 1–2 suggestion strings. Empty list on failure or if ARIA is off.
        """
        if aria_mode == "off":
            return []

        try:
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=30.0)

            thread_context = ""
            if thread_history:
                recent = thread_history[-10:]
                thread_context = "\n".join(f"- {msg}" for msg in recent)
            else:
                thread_context = "No prior messages in this thread."

            tone_instruction = (
                "Replies should be formal and neutral."
                if aria_mode == "strict"
                else "Replies should be friendly and collaborative."
            )

            system_prompt = f"""You are ARIA, a co-parenting communication assistant for CommonGround.

YOUR TASK:
Write 1–2 concise, civil reply options the recipient could use.

STRICT RULES:
1. Replies must stay relevant to the thread topic.
2. Never suggest a reply that escalates conflict.
3. Each reply should be 1–2 sentences maximum.
4. {tone_instruction}
5. Do NOT explain the suggestions. Just provide the reply text.

Respond in valid JSON only:
{{"suggestions": ["reply one", "reply two"]}}
"""
            user_prompt = f"""THREAD CONTEXT — recent messages:
{thread_context}

An incoming message was just received:
"{incoming_message}"
"""
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=200,
                system=[{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}],
                messages=[{"role": "user", "content": user_prompt}]
            )

            import json as _json
            raw = response.content[0].text.strip()
            parsed = _json.loads(raw)
            return parsed.get("suggestions", [])[:2]

        except Exception as e:
            logger.error(f"[ARIA v2] generate_reply_suggestion (Claude) failed: {e}")
            capture_error(e, tags={"service": "aria", "operation": "reply_suggestion"})

            # Fallback to OpenAI if Anthropic fails
            try:
                logger.info("[ARIA v2] Attempting OpenAI fallback for reply suggestions...")
                openai_client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=30.0)

                response = openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are ARIA, a co-parenting communication assistant for CommonGround. Provide concise, civil reply options in JSON format: {\"suggestions\": [\"reply one\", \"reply two\"]}"},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=200,
                    response_format={"type": "json_object"}
                )

                import json as _json
                parsed = _json.loads(response.choices[0].message.content)
                suggestions = parsed.get("suggestions", [])[:2]
                if suggestions:
                    logger.info("[ARIA v2] OpenAI fallback successful.")
                    return suggestions
            except Exception as oe:
                logger.error(f"[ARIA v2] OpenAI fallback failed: {oe}")

            return []

    # =========================================================================
    # ARIA V2 Sentinel Shield — Full Pipeline
    # =========================================================================

    async def analyze_message_v2(
        self,
        db: AsyncSession,
        message_text: str,
        sender_id: str,
        recipient_id: str,
        family_file_id: str,
        sensitivity_offset: float = 0.0,
        other_parent_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        ARIA V2 Sentinel Shield — 4-Layer Analysis Pipeline.

        Layer 1: Regex (32-category taxonomy with confidence scoring)
        Layer 2: Thread Intelligence (rolling window heat + session memory)
        Layer 3: LLM Deep Analysis (triggered by heat/severity/novelty)
        Layer 4: V3 Proactive Intelligence (beta, if enabled)

        Returns a dict compatible with ARIAAnalysisResponse (V1 fields + V2 enrichment).
        Falls back to V1 analysis on any critical failure.
        """
        from app.services.aria_confidence import score_categories, get_triggers_for_categories
        from app.services.aria_taxonomy_v2 import (
            calculate_v2_score, get_max_severity, get_reporting_tags,
            get_domain_scores, v2_categories_to_v1_labels,
        )
        from app.services.aria_heat_window import get_rolling_window_heat, should_trigger_llm
        from app.services.aria_session_memory import (
            get_session_context, update_session_memory, format_session_context_for_llm,
        )
        from app.services.aria_baseline import get_baseline, update_baseline, check_deviation
        from app.services.aria_bidirectional import get_recipient_context, get_conversation_context, generate_coaching_note
        from app.services.aria_time_signals import detect_time_signals
        from app.services.aria_llm_router import (
            run_llm_deep_analysis, run_llm_severity_analysis, merge_regex_and_llm_results,
        )

        try:
            # ── Layer 1: Regex with V2 Taxonomy ──
            metric_increment("aria.v2.analysis.total")
            category_confidence = score_categories(message_text)
            triggers = get_triggers_for_categories(message_text, category_confidence)

            # Also check ALL CAPS (not regex-based)
            words = message_text.split()
            if len(words) > 3:
                caps_words = sum(1 for w in words if w.isupper() and len(w) > 1)
                if caps_words / len(words) > 0.6:
                    from app.services.aria_taxonomy_v2 import V2Category
                    category_confidence[V2Category.ANGER_ESCALATION] = max(
                        category_confidence.get(V2Category.ANGER_ESCALATION, 0.0), 0.7
                    )
                    triggers.append("EXCESSIVE CAPS")

            # Calculate V2 score
            v2_score = calculate_v2_score(category_confidence)
            max_severity = get_max_severity(list(category_confidence.keys()))

            # Apply sensitivity offset for DV cases
            if sensitivity_offset > 0:
                v2_score = min(1.0, v2_score + sensitivity_offset)

            # ── Layer 2: Thread Intelligence ──
            window_heat, window_scores = await get_rolling_window_heat(
                db, sender_id, family_file_id, v2_score,
            )

            session_context = await get_session_context(
                db, sender_id, recipient_id, family_file_id,
            )
            session_context_str = format_session_context_for_llm(session_context)

            # Baseline check
            baseline = await get_baseline(db, sender_id, family_file_id)
            baseline_deviation = None
            is_new_pattern = False
            if baseline:
                baseline_deviation = check_deviation(
                    baseline, len(message_text), v2_score,
                )
                if baseline_deviation:
                    is_new_pattern = True

            # ── Layer 3: LLM Deep Analysis (conditional) ──
            llm_result = None
            if should_trigger_llm(window_heat, max_severity, is_new_pattern):
                metric_increment("aria.v2.llm_triggered")
                baseline_info = ""
                if baseline_deviation:
                    baseline_info = f"Deviation from baseline: {json.dumps(baseline_deviation)}"

                time_signals = await detect_time_signals(
                    db, sender_id, family_file_id,
                )

                if max_severity >= 4:
                    llm_result = await run_llm_severity_analysis(
                        message_text, session_context_str,
                    )
                else:
                    llm_result = await run_llm_deep_analysis(
                        message_text, session_context_str, baseline_info, time_signals,
                    )

                # Merge regex + LLM results
                if llm_result:
                    category_confidence = merge_regex_and_llm_results(
                        category_confidence, llm_result,
                    )
                    # Re-calculate score after merge
                    v2_score = calculate_v2_score(category_confidence)
                    max_severity = get_max_severity(list(category_confidence.keys()))
                    if llm_result.get("triggers"):
                        triggers = list(set(triggers + llm_result["triggers"]))
            else:
                time_signals = await detect_time_signals(
                    db, sender_id, family_file_id,
                )

            # ── Bidirectional analysis + sender coaching ──
            recipient_context = await get_recipient_context(
                db, recipient_id, family_file_id,
            )
            conversation_context = await get_conversation_context(
                db, family_file_id, sender_id,
            )
            v2_cat_names = [cat.value for cat in category_confidence.keys()]
            coaching_note = generate_coaching_note(
                v2_cat_names, recipient_context,
                conversation_context=conversation_context,
                other_parent_name=other_parent_name,
            )

            # ── Update session memory and baseline (fire-and-forget) ──
            try:
                await update_session_memory(
                    db, sender_id, recipient_id, family_file_id,
                    v2_cat_names, v2_score,
                )
                await update_baseline(
                    db, sender_id, family_file_id,
                    len(message_text), v2_score,
                )
            except Exception as e:
                logger.error(f"[ARIA V2] Memory/baseline update failed: {e}")

            # ── Layer 4: V3 Beta (if enabled) ──
            draft_coaching = None
            pattern_forecast = None
            legal_flags = None
            if getattr(settings, 'ARIA_V3_BETA_ENABLED', False):
                from app.services.aria_v3_beta import (
                    detect_legal_language, generate_draft_coaching,
                    generate_pattern_forecast,
                )
                legal_flags = detect_legal_language(message_text)
                draft_coaching = generate_draft_coaching(
                    message_text, v2_cat_names, v2_score,
                )
                pattern_forecast = generate_pattern_forecast(session_context)

            # ── Build response ──
            # V1 compatible fields
            v1_categories = v2_categories_to_v1_labels(list(category_confidence.keys()))
            reporting_tags = get_reporting_tags(list(category_confidence.keys()))
            domain_scores = get_domain_scores(category_confidence)

            # Determine toxicity level (V1 compatible)
            effective_offset = sensitivity_offset
            if v2_score == 0:
                toxicity_level = "none"
            elif v2_score < (0.3 - effective_offset):
                toxicity_level = "low"
            elif v2_score < (0.6 - effective_offset):
                toxicity_level = "medium"
            elif v2_score < (0.85 - effective_offset):
                toxicity_level = "high"
            else:
                toxicity_level = "severe"

            is_flagged = v2_score > 0.3

            # Generate explanation
            explanation = self._generate_explanation(
                [cat for cat in self._v2_to_v1_categories(category_confidence)]
            )
            if llm_result and llm_result.get("explanation"):
                explanation = llm_result["explanation"]

            # Generate suggestion
            suggestion = None
            if is_flagged:
                if llm_result and llm_result.get("suggestion"):
                    suggestion = llm_result["suggestion"]
                else:
                    v1_cats = self._v2_to_v1_categories(category_confidence)
                    suggestion = self._generate_suggestion(
                        message_text, v1_cats,
                        ToxicityLevel(toxicity_level) if toxicity_level != "none" else ToxicityLevel.LOW,
                    )

            # Block logic
            from app.services.aria_taxonomy_v2 import V2Category
            block_send = (
                V2Category.DIRECT_THREAT in category_confidence or
                V2Category.CHILD_THREAT in category_confidence or
                V2Category.BOUNDARY_VIOLATION in category_confidence and
                any(cat.value in ["direct_threat", "child_threat"] for cat in category_confidence)
            )
            # Also check for hate speech / sexual harassment via high severity
            if max_severity >= 5:
                block_send = True
            if sensitivity_offset > 0 and toxicity_level in ["high", "severe"]:
                block_send = True

            metric_distribution("aria.v2.toxicity_score", v2_score, unit="none")
            if is_flagged:
                metric_increment("aria.v2.flagged")

            return {
                # V1 fields
                "toxicity_level": toxicity_level,
                "toxicity_score": round(v2_score, 3),
                "categories": v1_categories,
                "triggers": triggers,
                "explanation": explanation,
                "suggestion": suggestion,
                "is_flagged": is_flagged,
                "block_send": block_send,
                # V2 enrichment
                "category_confidence": {cat.value: conf for cat, conf in category_confidence.items()},
                "window_heat_score": window_heat,
                "domain_scores": domain_scores,
                "session_patterns": session_context.get("recurring_patterns", []),
                "baseline_deviation": baseline_deviation,
                "time_frequency_flags": time_signals,
                "recipient_coaching": coaching_note,
                "reporting_tags": reporting_tags,
                # V3 beta
                "draft_coaching": draft_coaching,
                "pattern_forecast": pattern_forecast,
                "legal_flags": legal_flags,
            }

        except Exception as e:
            logger.error(f"[ARIA V2] Pipeline failed, falling back to V1: {e}")
            capture_error(e, tags={"service": "aria_v2", "operation": "analyze_message_v2"})
            # Fall back to V1 analysis
            v1_result = self.analyze_message(message_text, sensitivity_offset=sensitivity_offset)
            return {
                "toxicity_level": v1_result.toxicity_level.value,
                "toxicity_score": v1_result.toxicity_score,
                "categories": [cat.value for cat in v1_result.categories],
                "triggers": v1_result.triggers,
                "explanation": v1_result.explanation,
                "suggestion": v1_result.suggestion,
                "is_flagged": v1_result.is_flagged,
                "block_send": v1_result.block_send,
                "category_confidence": None,
                "window_heat_score": None,
                "domain_scores": None,
                "session_patterns": None,
                "baseline_deviation": None,
                "time_frequency_flags": None,
                "recipient_coaching": None,
                "reporting_tags": None,
                "draft_coaching": None,
                "pattern_forecast": None,
                "legal_flags": None,
            }

    def _v2_to_v1_categories(self, category_confidence: Dict) -> List['ToxicityCategory']:
        """Convert V2 category confidence dict to V1 ToxicityCategory list for existing methods."""
        from app.services.aria_taxonomy_v2 import V2_TO_V1_MAP
        v1_cats = set()
        for v2_cat in category_confidence.keys():
            v1_label = V2_TO_V1_MAP.get(v2_cat)
            if v1_label:
                try:
                    v1_cats.add(ToxicityCategory(v1_label))
                except ValueError:
                    pass
        return list(v1_cats)


# Singleton instance
aria_service = ARIAService()
