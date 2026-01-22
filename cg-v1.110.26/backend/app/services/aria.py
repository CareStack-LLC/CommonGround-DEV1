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

    # Pattern definitions for toxicity detection
    PROFANITY_PATTERNS = [
        r'\bfuck\w*\b', r'\bshit\w*\b', r'\bass\b', r'\basshole\b',
        r'\bbitch\w*\b', r'\bdamn\w*\b', r'\bhell\b', r'\bcrap\b',
        r'\bpiss\w*\b', r'\bbastard\b', r'\bwtf\b', r'\bstfu\b',
        r'\bhoe\b', r'\bwhore\b', r'\bslut\b',
        r'\bsuck\s+(my\s+)?dick\b', r'\bdick\b', r'\bcock\b', r'\bcunt\b',
        r'\bpussy\b', r'\btwat\b', r'\bprick\b', r'\bbollocks\b', r'\bwanker\b',
        r'\bmotherfucker\b', r'\btits\b', r'\bboobs\b',
        r'\bdouche\b', r'\bdipshit\b', r'\bjackass\b', r'\bscumbag\b',
        r'\bshithead\b', r'\bfuckface\b', r'\bmeathead\b', r'\bnumbskull\b',
        r'\bscrew\s+you\b', r'\beff\s+you\b', r'\bf\s+u\b',
        # Leetspeak / Variants
        r'\bc\.?u\.?n\.?t\b', r'\bc\*nt\b', r'\bc\@nt\b',
        r'\bf\.?u\.?c\.?k\b', r'\bf\*ck\b', r'\bf\@ck\b', r'\bfvck\b',
        r'\bs\.?h\.?i\.?t\b', r'\bsh\*t\b', r'\bsh!t\b',
    ]

    INSULT_PATTERNS = [
        r'\bstupid\b', r'\bidiot\b', r'\bdumb\b', r'\bmoron\b',
        r'\bpathetic\b', r'\bloser\b', r'\bworthless\b', r'\buseless\b',
        r'\bincompetent\b', r'\bcrazy\b', r'\binsane\b', r'\bpsycho\b',
        r'\bterrible\s+(mother|father|parent)\b', r'\bbad\s+(mother|father|parent)\b',
        r'\bdummy\b', r'\bdumb\s*(ass|as|azz)?\s*(hoe|ho)\b', r'\bstupid\s+ass\b',
        r'\bretard\w*\b', r'\bimbeccile\b', r'\bclown\b', r'\bjerk\b', 
        r'\bscum\b', r'\btrash\b', r'\bgarbage\b', r'\bfilth\b',
        # Modern Slang / Internet Toxicity
        r'\bsimp\b', r'\bincel\b', r'\bcuck\b', r'\bsoyboy\b',
        r'\bgroomer\b', r'\bpedophile\b', r'\bpedo\b', r'\bnonc(e|ing)\b',
        r'\bthot\b', r'\bskank\b', r'\brachet\b', r'\bghetto\b',
        r'\bkaren\b', r'\bboomer\b',
        r'\bgaslight(ing|er)?\b', r'\bnarcissist\b', r'\bnarc\b',
        r'\btoxic\b', r'\bdelusional\b',
        # Parenting/Character Attacks
        r'\bunfit\b', r'\bnegligent\b', r'\bdeadbeat\b', r'\blazy\b',
        r'\bchildish\b', r'\bimmature\b', r'\bdisgrace\b', r'\beinstein\b', # Sarcastic
        r'\bgenius\b', # Sarcastic
        r'\bmanic\b', r'\bbipolar\b', r'\bschizo\b', # Weaponized mental health
        r'\bdisgusting\b', r'\brepulsive\b', r'\bslob\b', r'\bpig\b',
        r'\bhypocrite\b', r'\bliar\b', r'\bcheat\b', r'\bfake\b',
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
        r'\bregret\s+meeting\s+you\b', r'\bbiggest\s+mistake\b',
        r'\bwish\s+you\s+were\s+dead\b', # Borderline threat
        r'\bdrop\s+dead\b', r'\beat\s+shit\b', r'\brot\s+in\s+hell\b',
        r'\byou\s+make\s+me\s+sick\b', r'\bcan\'?t\s+look\s+at\s+you\b',
    ]

    DISMISSIVE_PATTERNS = [
        r'\bnot\s+my\s+problem\b', r'\bdeal\s+with\s+it\b',
        r"\bthat'?s\s+your\s+(problem|issue)\b", r'\bgo\s+look\b',
        r'\bi\s+told\s+you\b', r'\bi\s+already\s+said\b',
        r'\bhow\s+many\s+times\b', r'\bfor\s+the\s+last\s+time\b',
        r'\btalk\s+to\s+the\s+hand\b', r'\bblah\s+blah\b',
        r'\bdon\'?t\s+start\b', r'\bhere\s+we\s+go\s+again\b',
        r'\bwhatever\b', r'\banyway\b', r'\bboring\b',
        r'\bnot\s+listening\b', r'\bwho\s+cares\b', r'\bso\s+what\b',
    ]

    PASSIVE_AGGRESSIVE_PATTERNS = [
        r'\bfine\.?\s*$', r'\bwhatever\s+you\s+say\b', r'\bif\s+you\s+say\s+so\b',
        r'\bsure\.?\s*$', r'\bok\s+then\.?\s*$', r'\bnice\s+try\b',
        r'\bgood\s+(luck|job)\s+with\s+that\b', r'\bthanks\s+for\s+nothing\b',
        r'\bif\s+you\s+(actually\s+)?cared\b',
        r'\bfunny\s+how\b', r'\binteresting\s+that\b',
        r'\bbless\s+your\s+heart\b', r'\bwow\b', r'\bjust\s+saying\b',
        r'\bi\s+guess\b', r'\bwhatever\s+makes\s+you\s+happy\b',
        r'\bper\s+my\s+last\s+email\b', r'\bas\s+previously\s+stated\b',
        r'\byou\s+do\s+you\b', r'\bact\s+like\s+an\s+adult\b',
    ]

    BLAME_PATTERNS = [
        r'\byou\s+made\s+me\b', r'\byou\s+caused\b', r'\bbecause\s+of\s+you\b',
        r'\bif\s+you\s+had\s+(just\s+)?(\w+)\b', r'\byou\s+should\s+have\b',
        r'\bthis\s+is\s+(all\s+)?your\s+fault\b', r'\byou\s+ruined\b',
        r'\blook\s+what\s+you\s+did\b', r'\ball\s+your\s+doing\b',
        r'\bthanks\s+to\s+you\b', r'\byou\s+always\s+ruin\b',
        r'\bnever\s+take\s+responsibility\b',
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
        r'\bfile\s+for\s+emergency\s+custody\b', r'\bcall\s+(cps|dcfs)\b',
        r'\bdeclare\s+you\s+unfit\b', r'\blose\s+your\s+rights\b',
        # Suicide Baiting (SEVERE - Treated as threat/violence)
        r'\bkys\b', r'\bkill\s+yoursel(f|ves)\b', r'\bunalive\s+yoursel(f|ves)\b',
        r'\bgo\s+die\b', r'\bbetter\s+off\s+dead\b', r'\bdrink\s+bleach\b',
        r'\bhang\s+yoursel(f|ves)\b', r'\bjump\s+off\b', r'\bhope\s+you\s+die\b',
        r'\bdo\s+the\s+world\s+a\s+favor\b', r'\bend\s+it\b',
    ]

    CUSTODY_WEAPONIZATION_PATTERNS = [
        r'\b(if|since|because)\s+you\s+(don\'?t|won\'?t|not\s+gonna)\s+pay.*see\s+(the\s+)?kids?\b',
        r'\bno\s+(money|payment|pay).*no\s+kids?\b',
        r'\bpay\s+(up|me).*or\s+(you\s+)?(won\'?t|can\'?t)\s+see\b',
        r'\byou\'?ll?\s+never\s+see\s+(the\s+)?kids?\s+again\b',
        r'\bkids?\s+(are|will\s+be|belong)\s+(all\s+)?mine\b',
        r'\btaking\s+(the\s+)?kids?\s+(away|from\s+you)\b',
        r'\bwon\'?t\s+see\s+(your\s+)?kids?\b',
        r'\bforget\s+about\s+the\s+kids?\b', r'\bnot\s+your\s+kids?\s+anymore\b',
        r'\bthey\s+hate\s+you\b', r'\bthey\s+don\'?t\s+want\s+to\s+see\s+you\b', # Weaponizing feelings
        r'\btell\s+the\s+kids?\s+what\s+you\s+did\b',
    ]

    FINANCIAL_COERCION_PATTERNS = [
        r'\bnot\s+gonna\s+pay\b', r'\bai\'?nt\s+paying\b',
        r'\bcut\s+you\s+off\b', r'\bstarve\s+you\s+out\b',
        r'\bi\s+buy\s+everything\b', r'\byou\s+pay\s+for\s+nothing\b',
        r'\bcontrol\s+the\s+money\b', r'\bmy\s+money\s+not\s+yours\b',
        r'\bbroke\s+ass\b', r'\bcan\'?t\s+afford\b', # Shaming
        r'\bchild\s+support\s+is\s+(for\s+)?me\b',
        r'\bsue\s+you\s+for\s+every\s+penny\b', r'\bbleed\s+you\s+dry\b',
    ]

    HATE_SPEECH_PATTERNS = [
        # Racial/Ethnic/Religious (CENSORED IN LOGS BUT ACTIVE IN REGEX)
        r'\btrailer\s+trash\b', r'\bwhite\s+trash\b',
        r'\bnigger\w*\b', r'\bnigga\w*\b', r'\bspic\b', r'\bwetback\b',
        r'\bchink\b', r'\bgook\b', r'\bkike\b', r'\bjewboy\b', r'\bhitler\b',
        r'\bnazi\b', r'\bterrorist\b', r'\braghead\b', r'\bsand\s+nigger\b',
        r'\bcoon\b', r'\bab(o|bo)\b', r'\bgypsy\b',
        r'\bbeaner\b', r'\bjungle\s+bunny\b', r'\bporch\s+monkey\b', r'\btowel\s+head\b',
        r'\bgoyim\b', r'\bshylock\b', r'\bheeb\b',
        r'\bmulatto\b', r'\bhalf\s+breed\b', r'\bsquaw\b', r'\bredskin\b',
        # Leetspeak / Evasion variants for N-word
        r'\bn\.?i\.?g\.?g\.?e\.?r\b', r'\bn1gger\b', r'\bn!gger\b', r'\bnigg3r\b',
        r'\bn\.?i\.?g\.?g\.?a\b', r'\bn1gga\b', r'\bn!gga\b', r'\bnigg4\b',
        r'\bn\s*i\s*g\s*g\s*e\s*r\b',
        # LGTBQ+
        r'\bfaggot\b', r'\bfag\b', r'\bdyke\b', r'\blezzie\b',
        r'\btranny\b', r'\bshe.?male\b', r'\bhe.?she\b', r'\bit\b',
        r'\bgay\s*lord\b', r'\bhomo\b',
        r'\bf\.?a\.?g\.?g\.?o\.?t\b', r'\bf4ggot\b',
        # Sexist/Gender Violence
        r'\bcum\s*dumpster\b', r'\broast\s*beef\b', r'\bdishwasher\b',
        r'\bkitchen\b', r'\bmake\s+me\s+a\s+sandwich\b', 
        r'\brape\b', r'\brapist\b', r'\bgrope\b', r'\bmolest\b',
        r'\bcunt\b', # Often considered severe misogynistic insult
    ]

    SEXUAL_HARASSMENT_PATTERNS = [
        r'\bsend\s+(me\s+)?nudes?\b', r'\bshow\s+(me\s+)?(your\s+)?(tits|boobs|pussy|dick|cock)\b',
        r'\bwanna\s+fuck\b', r'\blet\'?s\s+fuck\b', r'\bsit\s+on\s+my\s+face\b',
        r'\bsuck\s+me\b', r'\beat\s+me\b', r'\bhorny\b',
        r'\bjerking\s+off\b', r'\brubbing\s+one\s+out\b',
        r'\bthick\b', r'\bsexy\b', r'\bhot\b', # Context dependent, but flagged in co-parenting apps usually
        r'\bonlyfans\b',
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
        ToxicityCategory.CUSTODY_WEAPONIZATION: [
            "I understand you're frustrated about finances. However, parenting time and financial matters are legally separate. Let's discuss each issue on its own merits.",
            "Money and parenting time need to be discussed separately. What specific schedule concern do you have?",
        ],
        ToxicityCategory.FINANCIAL_COERCION: [
            "Let's stick to the financial agreement we have or discuss this through proper legal channels.",
            "I would like to keep our financial discussions professional and documented.",
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
        r'\bsuck\s+(my\s+)?dick\b': "I am very frustrated",

        # Custody/Financial -> Separation of issues
        r'\bno\s+(money|pay).*no\s+kids?\b': "let's discuss finances and scheduling separately",
        r'\bwon\'?t\s+see\s+(the\s+)?kids?\b': "we need to discuss the parenting schedule",
        r'\bdumb\s*(ass|as)?\s*hoe\b': "difficult to understand",
        r'\bdummy\b': "mistaken",
        r'\bstupid\s+ass\b': "unreasonable",

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
        
        # Compound Profanity/Insults -> Constructive Expression
        r'\bfuck\s+ass\b': "I am frustrated",
        r'\bpiece\s+of\s+shit\b': "I am very upset with your behavior",
        r'\bwaste\s+of\s+space\b': "I am disappointed",
        r'\bson\s+of\s+a\s+bitch\b': "I am angry",
        r'\bdumb\s*ass\b': "unreasonable",
        r'\bstupid\s*ass\b': "difficult",
        r'\bjack\s*ass\b': "difficult",
        
        # Hostile Opener Replacements
        r'\bwhy\s+are\s+you\s+so\s+stupid\b': "I don't understand your decision",
        r'\bwhat\s+is\s+wrong\s+with\s+you\b': "I am confused by your actions",
        r'\bstop\s+being\s+a\s+dick\b': "please treat me with respect",
        r'\bstop\s+being\s+an\s+asshole\b': "please be respectful",
        r'\byou\s+are\s+impossible\b': "I am finding this difficult to resolve",
        
        # New Categories - Slang & Weaponized Language
        r'\bgaslighting\b': "misrepresenting the situation",
        r'\bnarcissist\b': "unwilling to compromise",
        r'\bincel\b': "hostile",
        r'\bsimp\b': "person",
        r'\bgroomer\b': "harmful",
        
        # Coercion/Custody Specifics
        r'\bnot\s+gonna\s+pay\b': "I cannot pay right now (let's discuss a plan)",
        r'\bmy\s+money\b': "the finances",
        r'\bkeep\s+the\s+kids\b': "change the schedule",
        r'\bnever\s+see\s+them\b': "we need to resolve the schedule",
        
        # General Filler/Intensifiers (to avoid broken sentences)
        r'\bfucking\b': "very", # "You are fucking late" -> "You are very late"
        r'\bdamn\b': "very",
        r'\bloody\b': "very",
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
            ToxicityCategory.CUSTODY_WEAPONIZATION: [
                re.compile(p, re.IGNORECASE) for p in self.CUSTODY_WEAPONIZATION_PATTERNS
            ],
            ToxicityCategory.FINANCIAL_COERCION: [
                re.compile(p, re.IGNORECASE) for p in self.FINANCIAL_COERCION_PATTERNS
            ],
            ToxicityCategory.HATE_SPEECH: [
                re.compile(p, re.IGNORECASE) for p in self.HATE_SPEECH_PATTERNS
            ],
            ToxicityCategory.SEXUAL_HARASSMENT: [
                re.compile(p, re.IGNORECASE) for p in self.SEXUAL_HARASSMENT_PATTERNS
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
        # Also block HATE SPEECH and SEXUAL HARASSMENT automatically
        block_send = (
            (toxicity_level == ToxicityLevel.SEVERE and ToxicityCategory.THREATENING in categories) or
            ToxicityCategory.HATE_SPEECH in categories or
            ToxicityCategory.SEXUAL_HARASSMENT in categories
        )

        # Generate explanation
        explanation = self._generate_explanation(categories)

        # WS3: Removed suggestion generation - ARIA now only flags, does not rewrite
        # Users are responsible for their own message revisions

        return SentimentAnalysis(
            original_message=message,
            toxicity_level=toxicity_level,
            toxicity_score=toxicity_score,
            categories=categories,
            triggers=list(set(triggers)),  # Deduplicate
            explanation=explanation,
            suggestion=None,  # WS3: Always None - no more suggestions
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
            ToxicityCategory.CUSTODY_WEAPONIZATION: "uses children as leverage (courts view this extremely negatively)",
            ToxicityCategory.FINANCIAL_COERCION: "links financial matters to parenting time (legally inappropriate)",
            ToxicityCategory.HATE_SPEECH: "contains hate speech or slurs (ZERO TOLERANCE - will be blocked)",
            ToxicityCategory.SEXUAL_HARASSMENT: "contains sexual harassment or inappropriate content (ZERO TOLERANCE - will be blocked)",
        }

        issues = [explanations.get(cat, str(cat)) for cat in set(categories)]

        if len(issues) == 1:
            return f"⚠️ Court Context Warning: This message {issues[0]}."
        else:
            return f"⚠️ Court Context Warning: This message {', '.join(issues[:-1])}, and {issues[-1]}."

    # WS3: DEPRECATED - Suggestion generation removed
    # ARIA now only flags toxic language, does not rewrite messages
    # Users are responsible for their own revisions
    #
    # def _generate_suggestion(
    #     self,
    #     message: str,
    #     categories: List[ToxicityCategory],
    #     toxicity_level: ToxicityLevel
    # ) -> str:
    #     """
    #     [DEPRECATED] Generate a gentler alternative message.
    #
    #     This functionality has been removed per WS3. ARIA now only flags
    #     potentially problematic language without suggesting rewrites.
    #     """
    #     pass

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
            # WS3: Removed suggestion field - no more rewrites
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
