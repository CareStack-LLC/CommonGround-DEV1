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
from sqlalchemy import select, and_, text
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
        )

        return {
            ToxicityCategory.HATE_SPEECH: [
                re.compile(p, re.IGNORECASE) for p in HATE_SPEECH_PATTERNS
            ],
            ToxicityCategory.SEXUAL_HARASSMENT: [
                re.compile(p, re.IGNORECASE) for p in SEXUAL_HARASSMENT_PATTERNS
            ],
            ToxicityCategory.THREATENING: [
                re.compile(p, re.IGNORECASE) for p in THREATENING_PATTERNS
            ],
            ToxicityCategory.CUSTODY_WEAPONIZATION: [
                re.compile(p, re.IGNORECASE) for p in CUSTODY_WEAPONIZATION_PATTERNS
            ],
            ToxicityCategory.FINANCIAL_COERCION: [
                re.compile(p, re.IGNORECASE) for p in FINANCIAL_COERCION_PATTERNS
            ],
            ToxicityCategory.HOSTILITY: [
                re.compile(p, re.IGNORECASE) for p in HOSTILITY_PATTERNS
            ],
            ToxicityCategory.INSULT: [
                re.compile(p, re.IGNORECASE) for p in MODERN_SLANG_PATTERNS # Combined Slang + Insults logic
            ],
            ToxicityCategory.PROFANITY: [
                re.compile(p, re.IGNORECASE) for p in PROFANITY_PATTERNS
            ],
            # Reuse profanity/hostility for evasion detection in regex fallbacks
            ToxicityCategory.ALL_CAPS: [
                re.compile(p, re.IGNORECASE) for p in EVASION_PATTERNS
            ],
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
            print(f"FAILED TO LOG ARIA EVENT: {e}")

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
        1. Fast Regex Check (Synchronous logic)
        2. If Blocked -> Return Blocked Result & Log Event
        3. If Allowed/Flagged -> Queue for Async ML (aria_jobs) & Return Fast Result
        """
        # 1. Fast Regex Check
        regex_result = self.analyze_message(message_text, context)

        # 2. If already blocked, no need for ML
        if regex_result.block_send:
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
            print(f"FAILED TO QUEUE ARIA JOB: {e}")

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
            print(f"FAILED TO QUEUE ARIA IMAGE JOB: {e}")


    def analyze_message(
        self,
        message: str,
        context: Optional[List[str]] = None
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
        words = message.split()
        if len(words) > 3:
            caps_words = sum(1 for w in words if w.isupper() and len(w) > 1) # Ignore single letter "I" or "A"
            if caps_words / len(words) > 0.6:
                categories.append(ToxicityCategory.ALL_CAPS)
                triggers.append("EXCESSIVE CAPS")

        # Check each category of patterns
        # Check each category of patterns
        for category, patterns in self.compiled_patterns.items():
            # Skip ALL_CAPS in regex loop since we handled it manually above
            if category == ToxicityCategory.ALL_CAPS:
                continue
                
            for pattern in patterns:
                # Use finditer to get the FULL MATCH, ignoring capture groups
                # valid_triggers avoids returning just "yo" from "(yo)?u"
                matches = pattern.finditer(message)
                for match in matches:
                    full_phrase = match.group().strip()
                    if full_phrase:
                        if category not in categories:
                            categories.append(category)
                        triggers.append(full_phrase)

        # Calculate toxicity score and level
        toxicity_score = self._calculate_score(categories, triggers)
        toxicity_level = self._get_level(toxicity_score)

        # Blocking Logic: Block if SEVERE and THREATENING (physical harm)
        # Also block HATE SPEECH and SEXUAL HARASSMENT automatically
        # UPDATE: User requested zero tolerance for threats ("ill knock you out")
        block_send = (
            ToxicityCategory.THREATENING in categories or
            ToxicityCategory.HATE_SPEECH in categories or
            ToxicityCategory.SEXUAL_HARASSMENT in categories
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
            ToxicityCategory.CUSTODY_WEAPONIZATION: 0.8,  # Very high - courts hate this
            ToxicityCategory.FINANCIAL_COERCION: 0.6,
            ToxicityCategory.HATE_SPEECH: 1.0,      # ZERO TOLERANCE
            ToxicityCategory.SEXUAL_HARASSMENT: 1.0, # ZERO TOLERANCE
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

    def _generate_suggestion(
        self,
        message: str,
        categories: List[ToxicityCategory],
        toxicity_level: ToxicityLevel
    ) -> str:
        """
        Generate a gentler alternative message.
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

Analyze messages for COURT-INAPPROPRIATE content using ONLY these categories:
- PROFANITY: Using swear words or vulgar language
- INSULT: Name-calling or demeaning labels
- HOSTILITY: Aggressive, angry, or confrontational tone
- SARCASM: Mocking or biting irony
- BLAME: Accusing the other parent of fault
- DISMISSIVE: Ignoring or belittling the other's concerns
- THREATENING: Physical threats or safety concerns (CRITICAL)
- MANIPULATION: Emotional or psychological coercion
- PASSIVE_AGGRESSIVE: Indirectly aggressive or avoiding direct communication
- ALL_CAPS: Shouting or excessive emphasis
- CUSTODY_WEAPONIZATION: Using children or visitations as leverage
- FINANCIAL_COERCION: Using money/expenses as leverage
- HATE_SPEECH: Attacks based on protected characteristics
- SEXUAL_HARASSMENT: Inappropriate sexual content

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
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

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

            prompt = f"""You are ARIA, a co-parenting communication assistant for CommonGround.

THREAD CONTEXT — recent messages:
{thread_context}

The parent just tried to send this message:
"{flagged_message}"

This message was flagged for: {flag_reason}

YOUR TASK:
Rewrite this message to be calm, child-focused, and productive.

STRICT RULES:
1. Stay on the EXACT topic of the thread above — do not change the subject.
2. Do NOT translate insults or anger. Redirect to the co-parenting task instead.
3. Keep it brief (1–3 sentences).
4. {tone_instruction}
5. Start with a phrase that acknowledges the topic (e.g. "To keep us on track with the pickup schedule...")
6. Output ONLY the rewritten message — no quotes, no explanation, no prefix.

If the original message had zero constructive content (pure abuse), suggest:
"I need a moment to collect my thoughts. Let's continue this conversation later."
"""
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=256,
                messages=[{"role": "user", "content": prompt}]
            )

            rewrite = response.content[0].text.strip()
            return rewrite if rewrite else None

        except Exception as e:
            print(f"[ARIA v2] generate_contextual_rewrite (Claude) failed: {e}")
            
            # Fallback to OpenAI if Anthropic fails
            try:
                print("[ARIA v2] Attempting OpenAI fallback for contextual rewrite...")
                openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
                
                # Use a similar prompt for OpenAI
                response = openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are ARIA, a co-parenting communication assistant for CommonGround. Rewrite provided toxic messages to be calm, child-focused, and productive. Follow the BIFF method (Brief, Informative, Friendly, Firm). Output ONLY the rewritten message."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=256,
                    temperature=0.7
                )
                
                rewrite = response.choices[0].message.content.strip()
                if rewrite:
                    print("[ARIA v2] OpenAI fallback successful.")
                    return rewrite
            except Exception as oe:
                print(f"[ARIA v2] OpenAI fallback failed: {oe}")
                
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
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

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

            prompt = f"""You are ARIA, a co-parenting communication assistant for CommonGround.

THREAD CONTEXT — recent messages:
{thread_context}

An incoming message was just received:
"{incoming_message}"

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
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )

            import json as _json
            raw = response.content[0].text.strip()
            parsed = _json.loads(raw)
            return parsed.get("suggestions", [])[:2]

        except Exception as e:
            print(f"[ARIA v2] generate_reply_suggestion (Claude) failed: {e}")
            
            # Fallback to OpenAI if Anthropic fails
            try:
                print("[ARIA v2] Attempting OpenAI fallback for reply suggestions...")
                openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
                
                response = openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are ARIA, a co-parenting communication assistant for CommonGround. Provide concise, civil reply options in JSON format: {\"suggestions\": [\"reply one\", \"reply two\"]}"},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=200,
                    response_format={"type": "json_object"}
                )
                
                import json as _json
                parsed = _json.loads(response.choices[0].message.content)
                suggestions = parsed.get("suggestions", [])[:2]
                if suggestions:
                    print("[ARIA v2] OpenAI fallback successful.")
                    return suggestions
            except Exception as oe:
                print(f"[ARIA v2] OpenAI fallback failed: {oe}")
                
            return []


# Singleton instance
aria_service = ARIAService()
