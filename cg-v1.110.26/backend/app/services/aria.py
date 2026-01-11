"""
ARIA Service - AI-Powered Sentiment Analysis
Analyzes parent-to-parent communication and helps prevent conflict.

Two-tier analysis:
1. Fast regex-based pattern matching for obvious cases
2. Deep Claude AI analysis for nuanced detection
"""

import re
import json
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta
import anthropic
from openai import OpenAI
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.message import Message, MessageFlag


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

    # Pattern definitions for toxicity detection
    PROFANITY_PATTERNS = [
        r'\bfuck\w*\b', r'\bshit\w*\b', r'\bass\b', r'\basshole\b',
        r'\bbitch\w*\b', r'\bdamn\w*\b', r'\bhell\b', r'\bcrap\b',
        r'\bpiss\w*\b', r'\bbastard\b', r'\bwtf\b', r'\bstfu\b',
    ]

    INSULT_PATTERNS = [
        r'\bstupid\b', r'\bidiot\b', r'\bdumb\b', r'\bmoron\b',
        r'\bpathetic\b', r'\bloser\b', r'\bworthless\b', r'\buseless\b',
        r'\bincompetent\b', r'\bcrazy\b', r'\binsane\b', r'\bpsycho\b',
        r'\bterrible\s+(mother|father|parent)\b', r'\bbad\s+(mother|father|parent)\b',
    ]

    HOSTILITY_PATTERNS = [
        r'\bshut\s*up\b', r'\bleave\s+me\s+alone\b', r'\bget\s+out\b',
        r'\bi\s+hate\s+you\b', r'\bhate\s+you\b', r'\bcan\'?t\s+stand\s+you\b',
        r'\byou\s+never\b', r'\byou\s+always\b', r'\bevery\s+time\s+you\b',
        r'\byour\s+fault\b', r'\bblame\s+you\b', r"\bdon'?t\s+care\b",
        r'\bwhatever\b', r'\bfigure\s+it\s+out\b',
        r'\bgo\s+to\s+hell\b', r'\bfuck\s+off\b', r'\bget\s+lost\b',
        r'\bstop\s+bothering\s+me\b', r'\bwaste\s+of\s+time\b',
        r'\byou\'?re\s+(the\s+)?worst\b', r'\bcan\'?t\s+believe\s+you\b',
    ]

    DISMISSIVE_PATTERNS = [
        r'\bnot\s+my\s+problem\b', r'\bdeal\s+with\s+it\b',
        r"\bthat'?s\s+your\s+(problem|issue)\b", r'\bgo\s+look\b',
        r'\bi\s+told\s+you\b', r'\bi\s+already\s+said\b',
        r'\bhow\s+many\s+times\b', r'\bfor\s+the\s+last\s+time\b',
    ]

    PASSIVE_AGGRESSIVE_PATTERNS = [
        r'\bfine\.?\s*$', r'\bwhatever\s+you\s+say\b', r'\bif\s+you\s+say\s+so\b',
        r'\bsure\.?\s*$', r'\bok\s+then\.?\s*$', r'\bnice\s+try\b',
        r'\bgood\s+(luck|job)\s+with\s+that\b', r'\bthanks\s+for\s+nothing\b',
    ]

    BLAME_PATTERNS = [
        r'\byou\s+made\s+me\b', r'\byou\s+caused\b', r'\bbecause\s+of\s+you\b',
        r'\bif\s+you\s+had\s+(just\s+)?(\w+)\b', r'\byou\s+should\s+have\b',
        r'\bthis\s+is\s+(all\s+)?your\s+fault\b', r'\byou\s+ruined\b',
    ]

    THREATENING_PATTERNS = [
        # Legal threats
        r'\bi\'?ll?\s+(get|take)\s+(my\s+)?lawyer\b', r'\bsee\s+you\s+in\s+court\b',
        r'\btake\s+you\s+to\s+court\b', r'\bfile\s+a\s+motion\b',
        # General threats
        r'\byou\'?ll?\s+(be\s+)?sorry\b', r'\byou\'?ll?\s+regret\b',
        r'\bi\'?ll?\s+make\s+sure\b', r'\bwatch\s+(out|yourself)\b',
        r'\bdon\'?t\s+test\s+me\b', r'\bor\s+else\b',
        # Physical violence (CRITICAL)
        r'\bi\'?ll?\s+kill\s+you\b', r'\bkill\s+you\b', r'\bwanna\s+kill\b',
        r'\bi\'?ll?\s+hurt\s+you\b', r'\bhurt\s+you\b', r'\bharm\s+you\b',
        r'\bi\'?ll?\s+beat\s+you\b', r'\bbeat\s+you\s+up\b',
        r'\bi\'?ll?\s+destroy\s+you\b', r'\bcome\s+after\s+you\b',
        r'\byou\'?re\s+dead\b', r'\byou\'?re\s+gonna\s+pay\b',
        # Intimidation
        r'\bwatch\s+your\s+back\b', r'\byou\s+better\b',
        r'\bi\s+know\s+where\s+you\s+live\b', r'\bi\'?ll?\s+find\s+you\b',
        # Custody threats
        r'\byou\'?ll?\s+never\s+see\s+(the\s+)?kids?\b',
        r'\btake\s+(away\s+)?the\s+kids?\b', r'\bi\'?ll?\s+get\s+full\s+custody\b',
    ]

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
        r'\bcrazy\b': "unreasonable",
        r'\binsane\b': "difficult to understand",
    }

    def __init__(self):
        """Initialize ARIA service"""
        self.compiled_patterns = self._compile_patterns()

    def _compile_patterns(self) -> Dict[ToxicityCategory, List[re.Pattern]]:
        """Pre-compile regex patterns for performance"""
        return {
            ToxicityCategory.PROFANITY: [
                re.compile(p, re.IGNORECASE) for p in self.PROFANITY_PATTERNS
            ],
            ToxicityCategory.INSULT: [
                re.compile(p, re.IGNORECASE) for p in self.INSULT_PATTERNS
            ],
            ToxicityCategory.HOSTILITY: [
                re.compile(p, re.IGNORECASE) for p in self.HOSTILITY_PATTERNS
            ],
            ToxicityCategory.DISMISSIVE: [
                re.compile(p, re.IGNORECASE) for p in self.DISMISSIVE_PATTERNS
            ],
            ToxicityCategory.PASSIVE_AGGRESSIVE: [
                re.compile(p, re.IGNORECASE) for p in self.PASSIVE_AGGRESSIVE_PATTERNS
            ],
            ToxicityCategory.BLAME: [
                re.compile(p, re.IGNORECASE) for p in self.BLAME_PATTERNS
            ],
            ToxicityCategory.THREATENING: [
                re.compile(p, re.IGNORECASE) for p in self.THREATENING_PATTERNS
            ],
        }

    def analyze_message(
        self,
        message: str,
        context: Optional[List[str]] = None
    ) -> SentimentAnalysis:
        """
        Analyze a message for toxicity.

        Args:
            message: The message to analyze
            context: Optional list of recent messages for context

        Returns:
            SentimentAnalysis with results and suggestions
        """
        triggers = []
        categories = []

        # Check for ALL CAPS (shouting)
        words = message.split()
        if words:
            caps_words = sum(1 for w in words if w.isupper() and len(w) > 2)
            if caps_words / len(words) > 0.5:
                categories.append(ToxicityCategory.ALL_CAPS)
                triggers.append("EXCESSIVE CAPS")

        # Check each category of patterns
        for category, patterns in self.compiled_patterns.items():
            for pattern in patterns:
                matches = pattern.findall(message)
                if matches:
                    if category not in categories:
                        categories.append(category)
                    triggers.extend(matches)

        # Calculate toxicity score and level
        toxicity_score = self._calculate_score(categories, triggers)
        toxicity_level = self._get_level(toxicity_score)

        # Blocking Logic: Block if SEVERE and THREATENING (physical harm)
        block_send = (
            toxicity_level == ToxicityLevel.SEVERE and
            ToxicityCategory.THREATENING in categories
        )

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
        }

        score = sum(weights.get(cat, 0.2) for cat in set(categories))

        # Add bonus for multiple triggers (indicates pattern)
        score += len(triggers) * 0.1

        return min(1.0, score)

    def _get_level(self, score: float) -> ToxicityLevel:
        """Convert score to toxicity level"""
        if score == 0:
            return ToxicityLevel.NONE
        elif score < 0.3:
            return ToxicityLevel.LOW
        elif score < 0.6:
            return ToxicityLevel.MEDIUM
        elif score < 0.85:
            return ToxicityLevel.HIGH
        else:
            return ToxicityLevel.SEVERE

    def _generate_explanation(self, categories: List[ToxicityCategory]) -> str:
        """
        Generate human-readable explanation.

        Emphasizes that this is court documentation to encourage professional communication.
        """
        if not categories:
            return "This message is appropriate for court documentation. Professional and focused on the children's needs."

        explanations = {
            ToxicityCategory.THREATENING: "contains threatening language. Physical threats are never acceptable and could lead to legal action",
            ToxicityCategory.HOSTILITY: "includes hostile language that judges view very negatively",
            ToxicityCategory.PROFANITY: "contains profanity (unprofessional in court records)",
            ToxicityCategory.INSULT: "uses insults (reflects poorly on your co-parenting)",
            ToxicityCategory.BLAME: "places blame (courts prefer collaborative problem-solving)",
            ToxicityCategory.DISMISSIVE: "appears dismissive (courts look for good-faith effort)",
            ToxicityCategory.PASSIVE_AGGRESSIVE: "has a passive-aggressive tone (can be seen as conflict-seeking)",
            ToxicityCategory.SARCASM: "uses sarcasm (inappropriate for legal documentation)",
            ToxicityCategory.ALL_CAPS: "uses all caps (interpreted as shouting in court records)",
            ToxicityCategory.MANIPULATION: "appears manipulative (bad faith behavior)",
        }

        issues = [explanations.get(cat, str(cat)) for cat in set(categories)]

        if len(issues) == 1:
            return f"⚠️ Court Context Warning: This message {issues[0]}."
        else:
            return f"⚠️ Court Context Warning: This message {', '.join(issues[:-1])}, and {issues[-1]}."

    def _generate_suggestion(
        self,
        message: str,
        categories: List[ToxicityCategory],
        toxicity_level: ToxicityLevel
    ) -> str:
        """
        Generate a gentler alternative message.
        
        New Logic:
        1. High/Severe Toxicity -> Template Response (BIFF Method)
        2. Low/Medium Toxicity -> Intelligent Phrase Replacement
        """
        import random

        # STRATEGY 1: TEMPLATE RESPONSE (For High/Severe Toxicity)
        # If the message is highly toxic, attempting to salvage it word-by-word usually fails 
        # (e.g. "Fuck you stupid bitch" -> "you confusing").
        # Instead, we suggest a complete replacement based on the category.
        if toxicity_level in [ToxicityLevel.HIGH, ToxicityLevel.SEVERE]:
            # Prioritize categories for template selection
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
            
            # Fallback template if no specific category match
            return "I am feeling frustrated. I would like to pause this conversation and return to it later when I can be more productive."

        # STRATEGY 2: INTELLIGENT REPLACEMENT (For Low/Medium Toxicity)
        suggestion = message

        # Apply phrase-based replacements
        for pattern, replacement in self.SUGGESTIONS.items():
            suggestion = re.sub(pattern, replacement, suggestion, flags=re.IGNORECASE)

        # Remove profanity that wasn't caught by replacements
        for pattern in self.PROFANITY_PATTERNS:
            suggestion = re.sub(pattern, '', suggestion, flags=re.IGNORECASE)

        # Clean up extra spaces
        suggestion = re.sub(r'\s+', ' ', suggestion).strip()

        # If ALL CAPS, convert to normal case
        if ToxicityCategory.ALL_CAPS in categories:
            sentences = suggestion.split('. ')
            suggestion = '. '.join(s.capitalize() if s else s for s in sentences)

        # Fallback if suggesting an empty string or overly short message
        if len(suggestion) < 3:
             return "I understand your perspective. Let's discuss the logistics."

        return suggestion

    def get_intervention_message(self, analysis: SentimentAnalysis) -> Dict[str, Any]:
        """
        Format ARIA's intervention for the frontend.

        Args:
            analysis: Sentiment analysis result

        Returns:
            Formatted intervention message data
        """
        if not analysis.is_flagged:
            return {}

        level_headers = {
            ToxicityLevel.LOW: "Professional Communication Note",
            ToxicityLevel.MEDIUM: "Court Documentation Warning",
            ToxicityLevel.HIGH: "IMPORTANT: Court Review Alert",
            ToxicityLevel.SEVERE: "CRITICAL: Message Blocked",
        }

        # Court-focused reminders based on severity
        court_reminders = {
            ToxicityLevel.LOW: "Reminder: All messages may be reviewed by a judge. Keep communication professional.",
            ToxicityLevel.MEDIUM: "Warning: This language could reflect poorly in court. Judges favor collaborative, child-focused communication.",
            ToxicityLevel.HIGH: "This message could seriously damage your case in court. Judges view hostile communication negatively.",
            ToxicityLevel.SEVERE: "CRITICAL: This message has been BLOCKED. Using threats or physical violence triggers an immediate safety protocol.",
        }

        return {
            "level": analysis.toxicity_level.value,
            "header": level_headers.get(analysis.toxicity_level, "Communication Alert"),
            "explanation": analysis.explanation,
            "original_message": analysis.original_message,
            "suggestion": analysis.suggestion,
            "toxicity_score": analysis.toxicity_score,
            "categories": [cat.value for cat in analysis.categories],
            "court_reminder": court_reminders.get(analysis.toxicity_level, "Remember, this is court documentation."),
            "child_reminder": "Focus on what's best for your children. The court is watching how you communicate.",
            "block_send": analysis.block_send
        }

    async def analyze_with_ai(
        self,
        message: str,
        case_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Deep AI-powered analysis using Claude for nuanced detection.

        This is more sophisticated than regex patterns and can detect:
        - Context-dependent toxicity
        - Subtle manipulation
        - Cultural/situational inappropriateness

        Args:
            message: Message content to analyze
            case_context: Optional context (children names, agreement details, etc.)

        Returns:
            AI analysis result with detailed feedback
        """
        try:
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

            # Build context
            context_info = ""
            if case_context and "children" in case_context:
                children = case_context["children"]
                if children:
                    names = ", ".join([c.get("first_name", "") for c in children if c.get("first_name")])
                    context_info = f"\n\nContext: Communication about co-parenting {names}."

            # AI system prompt
            system_prompt = """You are ARIA, an AI assistant for co-parenting communication in CommonGround.

CRITICAL CONTEXT: All messages are COURT DOCUMENTATION that may be reviewed by judges, attorneys, and guardians ad litem. This is NOT private messaging - it's legal evidence.

Your role is to ensure communication is appropriate for court review and focused on children's welfare.

Analyze messages for COURT-INAPPROPRIATE content:
- Physical threats or violence (CRITICAL - may have criminal implications)
- Hostility, contempt, or hate speech (judges view very negatively)
- Profanity or insults (unprofessional in legal context)
- Blame, manipulation, or guilt-tripping (bad faith communication)
- Dismissiveness or passive-aggression (non-collaborative)
- All caps/shouting (appears aggressive)
- Anything a judge would view as poor co-parenting

Guidance for Suggestions:
Use the **BIFF Method** (Brief, Informative, Friendly, Firm).
- DO NOT just synonym-swap insults (e.g., "you are stupid" -> "you are confusing"). This is robotic and unhelpful.
- DO REWRITE the ENTIRE message to focus on the business of co-parenting.
- If the message is purely abuse ("fuck you"), suggest a template response like "I am feeling frustrated and will return to this later." rather than translating the insult.

SAFETY PROTOCOL:
If the message contains *physical threats* (killing, hurting, beating), mark as SEVERE [1.0] and include "THREATENING" in categories.

Respond in JSON format:
{
    "toxicity_score": 0.0-1.0,
    "categories": ["list of issues"],
    "triggers": ["specific problematic phrases"],
    "explanation": "why this is problematic for court",
    "suggestions": ["Brief, Informative, Friendly, Firm alternative"]
}"""

            # Analysis prompt
            prompt = f"""Analyze this co-parenting message:{context_info}

MESSAGE: "{message}"

Respond in JSON format."""

            # Call Claude API
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse response
            response_text = response.content[0].text
            json_match = re.search(r'\{[\s\S]*\}', response_text)

            if json_match:
                analysis = json.loads(json_match.group())
            else:
                analysis = json.loads(response_text)

            return {
                "ai_powered": True,
                "toxicity_score": float(analysis.get("toxicity_score", 0.0)),
                "categories": analysis.get("categories", []),
                "triggers": analysis.get("triggers", []),
                "explanation": analysis.get("explanation", ""),
                "suggestions": analysis.get("suggestions", []),
                "model": "claude-sonnet-4"
            }

        except Exception as e:
            # Fallback to regex analysis
            print(f"AI analysis failed: {e}")
            regex_analysis = self.analyze_message(message)
            return {
                "ai_powered": False,
                "toxicity_score": regex_analysis.toxicity_score,
                "categories": [cat.value for cat in regex_analysis.categories],
                "triggers": regex_analysis.triggers,
                "explanation": regex_analysis.explanation,
                "suggestions": [regex_analysis.suggestion] if regex_analysis.suggestion else [],
                "error": str(e)
            }

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
            client = OpenAI(api_key=settings.OPENAI_API_KEY)

            # Build context
            context_info = ""
            if case_context and "children" in case_context:
                children = case_context["children"]
                if children:
                    names = ", ".join([c.get("first_name", "") for c in children if c.get("first_name")])
                    context_info = f"\n\nContext: Communication about co-parenting {names}."

            # System prompt
            system_prompt = """You are ARIA, an AI assistant for co-parenting communication in CommonGround.

CRITICAL CONTEXT: All messages are COURT DOCUMENTATION that may be reviewed by judges, attorneys, and guardians ad litem. This is NOT private messaging - it's legal evidence.

Your role is to ensure communication is appropriate for court review and focused on children's welfare.

Analyze messages for COURT-INAPPROPRIATE content:
- Physical threats or violence (CRITICAL - may have criminal implications)
- Hostility, contempt, or hate speech (judges view very negatively)
- Profanity or insults (unprofessional in legal context)
- Blame, manipulation, or guilt-tripping (bad faith communication)
- Dismissiveness or passive-aggression (non-collaborative)
- All caps/shouting (appears aggressive)
- Anything a judge would view as poor co-parenting

Guidance for Suggestions:
Use the **BIFF Method** (Brief, Informative, Friendly, Firm).
- DO NOT just synonym-swap insults (e.g., "you are stupid" -> "you are confusing"). This is robotic and unhelpful.
- DO REWRITE the ENTIRE message to focus on the business of co-parenting.
- If the message is purely abuse ("fuck you"), suggest a template response like "I am feeling frustrated and will return to this later." rather than translating the insult.

SAFETY PROTOCOL:
If the message contains *physical threats* (killing, hurting, beating), mark as SEVERE [1.0] and include "THREATENING" in categories.

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

            # Call OpenAI API
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1024,
                response_format={"type": "json_object"}
            )

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
            print(f"OpenAI analysis failed: {e}")
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


# Singleton instance
aria_service = ARIAService()
