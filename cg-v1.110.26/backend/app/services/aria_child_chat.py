"""
ARIA Child Chat Monitor Service

Provides content moderation for child-to-circle communication.
Designed to protect children from inappropriate content and alert parents
to concerning messages.

Categories monitored:
- Inappropriate language (profanity, slurs)
- Personal information sharing (addresses, phone numbers)
- Stranger danger signals (requests to meet, keep secrets)
- Bullying or mean behavior
- Adult/mature content references
- Emotional distress signals
"""

import re
import logging
from enum import Enum
from typing import Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class SafetyCategory(str, Enum):
    """Categories of safety concerns for child chat."""
    INAPPROPRIATE_LANGUAGE = "inappropriate_language"
    PERSONAL_INFO_SHARING = "personal_info_sharing"
    STRANGER_DANGER = "stranger_danger"
    BULLYING = "bullying"
    MATURE_CONTENT = "mature_content"
    EMOTIONAL_DISTRESS = "emotional_distress"
    SUSPICIOUS_REQUEST = "suspicious_request"


class SeverityLevel(str, Enum):
    """Severity levels for flagged content."""
    SAFE = "safe"
    MILD = "mild"  # Log for parent review
    MODERATE = "moderate"  # Alert parent
    SEVERE = "severe"  # Block and alert parent immediately


@dataclass
class ChatAnalysisResult:
    """Result of analyzing a chat message."""
    is_safe: bool
    should_flag: bool
    severity: SeverityLevel
    category: Optional[SafetyCategory] = None
    reason: Optional[str] = None
    confidence_score: float = 0.95
    suggested_rewrite: Optional[str] = None
    should_hide: bool = False
    should_notify_parents: bool = False
    matched_patterns: list = field(default_factory=list)


class ARIAChildChatMonitor:
    """
    ARIA service for monitoring child chat messages.

    Uses pattern matching for immediate detection and can optionally
    use AI for more nuanced analysis.
    """

    def __init__(self):
        self._compile_patterns()

    def _compile_patterns(self):
        """Compile regex patterns for content detection."""

        # Inappropriate language patterns (child-appropriate filter)
        self.profanity_patterns = [
            re.compile(r'\b(shit|damn|hell|crap|ass|stupid|idiot|dumb)\b', re.IGNORECASE),
            re.compile(r'\b(hate\s+you|i\s+hate)\b', re.IGNORECASE),
            re.compile(r'\b(shut\s+up|go\s+away)\b', re.IGNORECASE),
        ]

        # Severe profanity (block immediately)
        self.severe_profanity_patterns = [
            re.compile(r'\bf+[u\*@]+c*k+\b', re.IGNORECASE),
            re.compile(r'\bb+[i\*]+t+c+h+\b', re.IGNORECASE),
            re.compile(r'\ba+s+s+h+o+l+e+\b', re.IGNORECASE),
        ]

        # Personal information patterns
        self.personal_info_patterns = [
            # Phone numbers
            re.compile(r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b'),
            re.compile(r'\b\d{10}\b'),
            # Addresses
            re.compile(r'\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|court|ct)\b', re.IGNORECASE),
            # Email patterns
            re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            # Social media handles
            re.compile(r'@[A-Za-z0-9_]{3,}'),
            # School names (generic pattern)
            re.compile(r'\b(my\s+school\s+is|i\s+go\s+to)\s+\w+', re.IGNORECASE),
        ]

        # Stranger danger patterns
        self.stranger_danger_patterns = [
            re.compile(r'\b(don\'?t\s+tell|keep\s+(it\s+)?a?\s*secret|our\s+secret)\b', re.IGNORECASE),
            re.compile(r'\b(meet\s+(me|up)|come\s+over|where\s+do\s+you\s+live)\b', re.IGNORECASE),
            re.compile(r'\b(send\s+(me\s+)?(a\s+)?(pic|photo|picture))\b', re.IGNORECASE),
            re.compile(r'\b(how\s+old\s+are\s+you|what\'?s\s+your\s+age)\b', re.IGNORECASE),
            re.compile(r'\b(are\s+your\s+parents\s+home|alone\s+at\s+home|home\s+alone)\b', re.IGNORECASE),
        ]

        # Bullying patterns
        self.bullying_patterns = [
            re.compile(r'\b(you\'?re?\s+(so\s+)?(ugly|fat|stupid|dumb|weird|loser))\b', re.IGNORECASE),
            re.compile(r'\b(no\s+one\s+likes\s+you|everyone\s+hates\s+you)\b', re.IGNORECASE),
            re.compile(r'\b(kill\s+yourself|go\s+die|you\s+should\s+die)\b', re.IGNORECASE),
            re.compile(r'\b(i\'?ll?\s+(beat|hurt|hit)\s+(you|u))\b', re.IGNORECASE),
        ]

        # Emotional distress signals
        self.distress_patterns = [
            re.compile(r'\b(i\s+want\s+to\s+die|want\s+to\s+hurt\s+myself)\b', re.IGNORECASE),
            re.compile(r'\b(nobody\s+loves\s+me|no\s+one\s+cares)\b', re.IGNORECASE),
            re.compile(r'\b(i\'?m\s+so\s+sad|really\s+depressed|feel\s+hopeless)\b', re.IGNORECASE),
            re.compile(r'\b(scared|afraid)\s+(of|at)\s+(home|dad|mom|parent)\b', re.IGNORECASE),
            re.compile(r'\b(hit\s+me|hurt\s+me|yell(s|ed)?\s+at\s+me)\b', re.IGNORECASE),
        ]

        # Mature content references
        self.mature_content_patterns = [
            re.compile(r'\b(sex|porn|naked|nude)\b', re.IGNORECASE),
            re.compile(r'\b(drugs?|weed|marijuana|alcohol|drunk|high)\b', re.IGNORECASE),
            re.compile(r'\b(cigarette|vape|vaping|smoking)\b', re.IGNORECASE),
        ]

    def analyze_message(
        self,
        content: str,
        sender_type: str = "child",
        sender_name: str = "",
        context: Optional[str] = None
    ) -> ChatAnalysisResult:
        """
        Analyze a chat message for child safety concerns.

        Args:
            content: The message content to analyze
            sender_type: "child" or "circle_contact"
            sender_name: Name of the sender
            context: Optional previous conversation context

        Returns:
            ChatAnalysisResult with safety assessment
        """
        matched_patterns = []

        # Check for severe issues first (block immediately)
        for pattern in self.severe_profanity_patterns:
            if pattern.search(content):
                matched_patterns.append(("severe_profanity", pattern.pattern))
                return ChatAnalysisResult(
                    is_safe=False,
                    should_flag=True,
                    severity=SeverityLevel.SEVERE,
                    category=SafetyCategory.INAPPROPRIATE_LANGUAGE,
                    reason="Message contains inappropriate language",
                    confidence_score=0.99,
                    should_hide=True,
                    should_notify_parents=True,
                    matched_patterns=matched_patterns,
                )

        # Check for bullying/threats (especially severe ones)
        for pattern in self.bullying_patterns:
            match = pattern.search(content)
            if match:
                matched_text = match.group()
                matched_patterns.append(("bullying", matched_text))

                # "Kill yourself" and similar are severe
                if any(x in matched_text.lower() for x in ["kill", "die", "beat", "hurt", "hit"]):
                    return ChatAnalysisResult(
                        is_safe=False,
                        should_flag=True,
                        severity=SeverityLevel.SEVERE,
                        category=SafetyCategory.BULLYING,
                        reason="Message contains threatening or harmful content",
                        confidence_score=0.98,
                        should_hide=True,
                        should_notify_parents=True,
                        matched_patterns=matched_patterns,
                    )

        # Check for stranger danger signals (high priority for circle contacts)
        if sender_type == "circle_contact":
            for pattern in self.stranger_danger_patterns:
                match = pattern.search(content)
                if match:
                    matched_patterns.append(("stranger_danger", match.group()))
                    return ChatAnalysisResult(
                        is_safe=False,
                        should_flag=True,
                        severity=SeverityLevel.SEVERE,
                        category=SafetyCategory.STRANGER_DANGER,
                        reason="Message contains potentially concerning request",
                        confidence_score=0.95,
                        should_hide=False,
                        should_notify_parents=True,
                        matched_patterns=matched_patterns,
                    )

        # Check for personal information sharing (from children)
        if sender_type == "child":
            for pattern in self.personal_info_patterns:
                match = pattern.search(content)
                if match:
                    matched_patterns.append(("personal_info", match.group()))
                    return ChatAnalysisResult(
                        is_safe=False,
                        should_flag=True,
                        severity=SeverityLevel.MODERATE,
                        category=SafetyCategory.PERSONAL_INFO_SHARING,
                        reason="Message may contain personal information",
                        confidence_score=0.90,
                        should_hide=False,
                        should_notify_parents=True,
                        suggested_rewrite="[Personal information removed for safety]",
                        matched_patterns=matched_patterns,
                    )

        # Check for emotional distress signals
        for pattern in self.distress_patterns:
            match = pattern.search(content)
            if match:
                matched_patterns.append(("distress", match.group()))
                return ChatAnalysisResult(
                    is_safe=True,  # Don't block, but alert parents
                    should_flag=True,
                    severity=SeverityLevel.MODERATE,
                    category=SafetyCategory.EMOTIONAL_DISTRESS,
                    reason="Message may indicate emotional distress - parent review recommended",
                    confidence_score=0.85,
                    should_hide=False,
                    should_notify_parents=True,
                    matched_patterns=matched_patterns,
                )

        # Check for mature content
        for pattern in self.mature_content_patterns:
            match = pattern.search(content)
            if match:
                matched_patterns.append(("mature_content", match.group()))
                return ChatAnalysisResult(
                    is_safe=False,
                    should_flag=True,
                    severity=SeverityLevel.MODERATE,
                    category=SafetyCategory.MATURE_CONTENT,
                    reason="Message references mature content",
                    confidence_score=0.92,
                    should_hide=True,
                    should_notify_parents=True,
                    matched_patterns=matched_patterns,
                )

        # Check for mild profanity
        for pattern in self.profanity_patterns:
            match = pattern.search(content)
            if match:
                matched_patterns.append(("mild_profanity", match.group()))
                return ChatAnalysisResult(
                    is_safe=True,
                    should_flag=True,
                    severity=SeverityLevel.MILD,
                    category=SafetyCategory.INAPPROPRIATE_LANGUAGE,
                    reason="Message contains mild inappropriate language",
                    confidence_score=0.88,
                    should_hide=False,
                    should_notify_parents=False,  # Just log, don't actively alert
                    matched_patterns=matched_patterns,
                )

        # Check for mild bullying (insults without threats)
        for pattern in self.bullying_patterns:
            match = pattern.search(content)
            if match:
                matched_patterns.append(("mild_bullying", match.group()))
                return ChatAnalysisResult(
                    is_safe=True,
                    should_flag=True,
                    severity=SeverityLevel.MILD,
                    category=SafetyCategory.BULLYING,
                    reason="Message contains unkind language",
                    confidence_score=0.85,
                    should_hide=False,
                    should_notify_parents=False,
                    matched_patterns=matched_patterns,
                )

        # Message is safe
        return ChatAnalysisResult(
            is_safe=True,
            should_flag=False,
            severity=SeverityLevel.SAFE,
            confidence_score=0.95,
            matched_patterns=[],
        )

    def get_child_safe_warning(self, result: ChatAnalysisResult) -> str:
        """
        Get a child-appropriate warning message for flagged content.

        Args:
            result: The analysis result

        Returns:
            A friendly warning message appropriate for children
        """
        if result.severity == SeverityLevel.SAFE:
            return ""

        category_messages = {
            SafetyCategory.INAPPROPRIATE_LANGUAGE: "Oops! Let's use kind words when we talk to others. 😊",
            SafetyCategory.PERSONAL_INFO_SHARING: "Remember, we keep personal information like addresses and phone numbers private! 🏠",
            SafetyCategory.STRANGER_DANGER: "Something doesn't seem quite right. Let's talk to a parent! 👨‍👩‍👧",
            SafetyCategory.BULLYING: "Let's be kind to each other! Words can hurt feelings. 💙",
            SafetyCategory.MATURE_CONTENT: "This topic is better to discuss with a grown-up. 🌟",
            SafetyCategory.EMOTIONAL_DISTRESS: "It sounds like you might be having a hard time. It's okay to talk to a trusted adult. 💜",
            SafetyCategory.SUSPICIOUS_REQUEST: "When something feels weird, it's always good to check with a parent! 🛡️",
        }

        if result.category:
            return category_messages.get(
                result.category,
                "Let's make sure our messages are friendly and safe! 🌈"
            )

        return "Let's make sure our messages are friendly and safe! 🌈"


# Global singleton instance
aria_child_chat_monitor = ARIAChildChatMonitor()
