"""
ARIA Sentinel Shield V2 — Pattern Registry

Maps all existing patterns + new patterns to the 32-category V2 taxonomy.
Imports from aria_patterns.py (V1 patterns) and remaps them, then adds
new patterns for categories that V1 didn't cover.

All patterns are case-insensitive and use word boundaries.
"""

import re
from typing import Dict, List, Pattern

from app.services.aria_taxonomy_v2 import V2Category

# Import all V1 pattern lists
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
    COPARENTING_CONFLICT_PATTERNS,
    PARENTAL_ALIENATION_PATTERNS,
)


# ══════════════════════════════════════════════════════════════════════════════
# NEW V2-only patterns (categories that V1 didn't cover well)
# ══════════════════════════════════════════════════════════════════════════════

# -- CTRL: Coercive Control --
SCHEDULE_CONTROL_PATTERNS = [
    r'\bi\s+(decide|make\s+the\s+rules|set\s+the\s+schedule)\b',
    r'\byou\s+(don\'?t|do\s+not)\s+get\s+(a\s+say|to\s+decide|any\s+input)\b',
    r'\bi\'?m\s+not\s+asking\b.*\b(permission|you)\b',
    r'\bmy\s+house\s+my\s+rules\b',
    r'\bi\s+already\s+(decided|made\s+plans|scheduled)\b',
    r'\byou\s+have\s+no\s+(say|choice|option)\b',
    r'\bthis\s+is\s+not\s+(up\s+for|open\s+to)\s+discussion\b',
    r'\bi\s+changed\s+the\s+(schedule|plan|time)\b',
]

ISOLATION_TACTICS_PATTERNS = [
    r'\bdon\'?t\s+(talk|speak|communicate)\s+(to|with)\s+(anyone|them|her|him)\s+about\b',
    r'\bkeep\s+(this|it|everything)\s+between\s+us\b',
    r'\byour\s+(friends|family|mom|dad|lawyer)\s+(is|are)\s+(the\s+problem|making\s+this\s+worse)\b',
    r'\bstop\s+(talking|listening)\s+to\s+(your|their)\b',
    r'\bno\s+one\s+(else|will)\s+(needs?\s+to|should)\s+know\b',
    r'\byou\s+don\'?t\s+need\s+(a\s+lawyer|help|anyone\s+else)\b',
]

DECISION_OVERRIDE_PATTERNS = [
    r'\bi\s+already\s+(signed|enrolled|registered|decided)\b',
    r'\bi\s+made\s+the\s+(decision|appointment|call)\b',
    r'\byou\s+(weren\'?t|don\'?t\s+need\s+to\s+be)\s+(consulted|involved|asked)\b',
    r'\bi\s+don\'?t\s+need\s+your\s+(approval|permission|consent|input)\b',
    r'\bit\'?s\s+already\s+done\b',
    r'\btoo\s+late\s+to\s+change\b',
]

# -- PSYB: Psychological Abuse --
GASLIGHTING_PATTERNS = [
    r'\bthat\s+never\s+happened\b',
    r'\byou\'?re?\s+(crazy|imagining\s+things|making\s+things\s+up|delusional|losing\s+it)\b',
    r'\bi\s+never\s+said\s+that\b',
    r'\byou\'?re?\s+too\s+sensitive\b',
    r'\bstop\s+being\s+(dramatic|so\s+emotional|hysterical)\b',
    r'\byou\'?re?\s+overreacting\b',
    r'\bthat\'?s\s+not\s+what\s+(happened|I\s+said|I\s+meant)\b',
    r'\byou\s+always\s+twist\s+(things|everything|my\s+words)\b',
    r'\byou\s+have\s+a\s+bad\s+memory\b',
    r'\bno\s+one\s+else\s+(thinks|sees|agrees)\s+that\b',
    r'\byou\'?re?\s+confused\b',
]

MINIMIZATION_PATTERNS = [
    r'\bit\'?s\s+not\s+(that\s+)?(big\s+of\s+a\s+deal|a\s+big\s+deal|serious|important)\b',
    r'\byou\'?re?\s+(blowing|making)\s+(this|it)\s+out\s+of\s+proportion\b',
    r'\brelax\b',
    r'\bcalm\s+down\b',
    r'\bit\s+was\s+just\s+a\s+joke\b',
    r'\bstop\s+exaggerating\b',
    r'\byou\'?re?\s+making\s+a\s+mountain\s+out\s+of\b',
    r'\bwhy\s+(are\s+you|do\s+you)\s+(so\s+)?worked\s+up\b',
]

# -- ALNT: Alienation (supplement existing V1 patterns) --
LOYALTY_CONFLICT_PATTERNS = [
    r'\bwho\s+do\s+you\s+(love|like)\s+more\b',
    r'\bchoose\s+(me|your\s+mom|your\s+dad)\b',
    r'\bif\s+you\s+(loved|cared)\s+about\s+me\s+you\s+would(n\'?t)?\b',
    r'\byou\'?re?\s+on\s+(his|her|their)\s+side\b',
]

INFO_GATEKEEPING_PATTERNS = [
    r'\byou\s+don\'?t\s+need\s+to\s+know\b',
    r'\bthat\'?s\s+none\s+of\s+your\s+business\b',
    r'\bi\'?ll?\s+tell\s+you\s+when\s+I\'?m\s+ready\b',
    r'\bnot\s+your\s+(concern|problem|business)\b',
    r'\bask\s+(the\s+kids?|them)\s+yourself\b',
    r'\bi\s+don\'?t\s+have\s+to\s+(tell|share|inform)\s+you\b',
]

RELATIONSHIP_SABOTAGE_PATTERNS = [
    r'\bthey\s+(don\'?t\s+want|hate)\s+to\s+(go|see|visit)\s+(you|there|him|her)\b',
    r'\bthey\s+had\s+a\s+terrible\s+time\b',
    r'\bthey\s+(cried|were\s+upset)\s+(the\s+whole|all)\s+time\b',
    r'\bthey\s+told\s+me\s+they\s+(hate|don\'?t\s+like)\b',
]

# -- ESCP: Escalation --
DEMAND_ESCALATION_PATTERNS = [
    r'\bdo\s+it\s+now\b',
    r'\bi\s+(need|want|demand)\s+(an?\s+)?(answer|response)\s+(now|immediately|today|right\s+now)\b',
    r'\blast\s+(chance|warning|time)\b',
    r'\bor\s+else\b',
    r'\bfinal\s+offer\b',
    r'\bthis\s+is\s+your\s+last\b',
    r'\bi\s+won\'?t\s+ask\s+again\b',
]

BOUNDARY_VIOLATION_PATTERNS_V2 = [
    r'\bi\s+have\s+(a\s+|every\s+)?right\s+to\s+know\b',
    r'\byou\s+can\'?t\s+(stop|prevent|keep)\s+me\b',
    r'\bi\'?ll?\s+show\s+up\s+(whenever|wherever|anyway)\b',
    r'\bi\s+don\'?t\s+care\s+what\s+(the\s+)?(order|agreement|judge)\s+(says|stated)\b',
    r'\btry\s+(to\s+)?stop\s+me\b',
]

# -- MNIP: Manipulation --
FALSE_VICTIMHOOD_PATTERNS = [
    r'\bafter\s+everything\s+I\s+(did|do|sacrificed|gave\s+up)\s+for\s+you\b',
    r'\bi\'?m\s+the\s+(only\s+)?one\s+who\s+(cares|tries|does\s+anything)\b',
    r'\bno\s+one\s+appreciates\s+me\b',
    r'\byou\s+have\s+no\s+idea\s+what\s+I\s+(go|went)\s+through\b',
    r'\bi\s+do\s+everything\s+and\s+get\s+nothing\b',
    r'\bpoor\s+me\b',
]

TRIANGULATION_PATTERNS = [
    r'\beveryone\s+(knows|thinks|says|agrees)\b',
    r'\bmy\s+(mom|friends?|family|sister|brother|lawyer|therapist)\s+(thinks?|says?|agrees?)\b',
    r'\beven\s+(the\s+)?(kids?|children|teacher|counselor)\s+(thinks?|says?|agrees?)\b',
    r'\b(ask|check\s+with)\s+anyone\b',
    r'\bno\s+one\s+(is\s+on|agrees\s+with|supports)\s+your\s+side\b',
]

# -- PAGG: Passive Aggression --
SILENT_TREATMENT_PATTERNS = [
    # These are hard to detect via regex since silence = no message.
    # We detect threats of silence or explicit withdrawal.
    r'\bi\'?m\s+done\s+talking\b',
    r'\bi\s+have\s+nothing\s+(to\s+say|more\s+to\s+say)\b',
    r'\bdon\'?t\s+(bother|expect)\s+(me\s+to\s+)?(respond|reply|answer)\b',
    r'\btalk\s+to\s+my\s+lawyer\b',
]

WEAPONIZED_COMPLIANCE_PATTERNS = [
    r'\bfine\.?\s*$',
    r'\bwhatever\s+you\s+say\b',
    r'\bif\s+that\'?s\s+what\s+you\s+want\b',
    r'\byou\'?re?\s+the\s+boss\b',
    r'\bi\s+guess\s+i\'?ll?\s+just\b',
    r'\bsure\.?\s+whatever\b',
    r'\byou\s+always\s+get\s+your\s+way\b',
]

BACKHANDED_COMPLIMENT_PATTERNS = [
    r'\bmust\s+be\s+nice\b',
    r'\bgood\s+for\s+you\b',
    r'\bi\'?m\s+sorry\s+you\s+feel\s+that\s+way\b',
    r'\bparent\s+of\s+the\s+year\b',
    r'\bmother\s+of\s+the\s+year\b',
    r'\bfather\s+of\s+the\s+year\b',
    r'\bgreat\s+parenting\b',
    r'\bwow\s+(you|you\'re)\s+so\s+(mature|responsible|thoughtful)\b',
    r'\bthat\'?s\s+real\s+(nice|mature|responsible)\b',
]

SELECTIVE_MEMORY_PATTERNS = [
    r'\bi\s+(don\'?t|do\s+not)\s+remember\s+(that|saying|agreeing)\b',
    r'\bthat\s+was(n\'?t)?\s+the\s+deal\b',
    r'\bwe\s+never\s+agreed\s+to\s+that\b',
    r'\bi\s+never\s+(said|agreed|promised)\s+that\b',
    r'\bwhen\s+did\s+(I|we)\s+(say|agree)\s+to\s+that\b',
]

# -- THRT: Veiled threats (supplement direct threats from V1) --
VEILED_THREAT_PATTERNS = [
    r'\byou\'?ll?\s+(see|find\s+out|regret)\b',
    r'\bjust\s+wait\b',
    r'\bwatch\s+(what|your)\b',
    r'\bcareful\b',
    r'\bi\s+know\s+(people|someone)\b',
    r'\bthings\s+(will|are\s+going\s+to)\s+get\s+(bad|worse|ugly)\b',
    r'\byou\s+have\s+no\s+idea\s+what\s+I\'?m\s+capable\s+of\b',
    r'\bdon\'?t\s+(test|push|try)\s+me\b',
]


# ══════════════════════════════════════════════════════════════════════════════
# Compiled pattern registry: V2Category → List[compiled regex]
# ══════════════════════════════════════════════════════════════════════════════

def _compile(patterns: list) -> List[re.Pattern]:
    """Compile a list of regex strings with IGNORECASE."""
    return [re.compile(p, re.IGNORECASE) for p in patterns]


def build_v2_pattern_registry() -> Dict[V2Category, List[re.Pattern]]:
    """
    Build the complete V2 pattern registry by:
    1. Remapping all V1 patterns to V2 categories
    2. Adding new V2-only patterns
    """
    registry: Dict[V2Category, List[re.Pattern]] = {cat: [] for cat in V2Category}

    # ── Remap V1 patterns ──

    # THRT: Direct threats (from V1 THREATENING)
    registry[V2Category.DIRECT_THREAT].extend(_compile(THREATENING_PATTERNS))

    # THRT: Veiled threats (new)
    registry[V2Category.VEILED_THREAT].extend(_compile(VEILED_THREAT_PATTERNS))

    # THRT: Legal weaponization (from V1 CUSTODY parts)
    # The legal threat patterns from custody weaponization
    legal_threat_patterns = [
        r'\bfull\s+custody\b', r'\bsole\s+custody\b',
        r'\bunfit\s+parent\b', r'\bterminate\s+(?:[\w\'\*]+\s+){0,3}rights\b',
        r'\bcall\s+(?:[\w\'\*]+\s+){0,3}(cps|dcf|dcfs|child\s+services)\b',
        r'\bget\s+a\s+restraining\s+order\b',
        r'\bmy\s+lawyer\s+(will|is\s+going\s+to|says)\b',
        r'\bsupervisor?ed\s+visitation\b',
        r'\byou\'?ll?\s+lose\s+(the\s+kids?|them|custody)\b',
    ]
    registry[V2Category.LEGAL_WEAPONIZATION].extend(_compile(legal_threat_patterns))

    # THRT: Child threats (specific subset)
    child_threat_patterns = [
        r'\btaking\b.*?\b(kids?|child(ren)?|bab[yi]es?|them)\b.*?\baway\b',
        r'\brun\s+away\s+with\b.*?\b(them|kids?|child(ren)?|bab[yi]es?)\b',
        r'\bsay\s+goodbye\s+to\s+(daddy|mommy|your\s+father|your\s+mother)\b',
    ]
    registry[V2Category.CHILD_THREAT].extend(_compile(child_threat_patterns))

    # CTRL: Schedule control
    registry[V2Category.SCHEDULE_CONTROL].extend(_compile(SCHEDULE_CONTROL_PATTERNS))
    # Also include gatekeeping patterns from V1 custody
    gatekeeping_patterns = [
        r'\b(won\'?t|never|can\'?t|cannot|not\s+gonna|not\s+going\s+to)\b.*?\bsee\b.*?\b(kids?|child(ren)?|bab[yi]es?|son|daughter|him|her|daddy|mommy|your\s+father|your\s+mother)\b',
        r'\bkeeping\b.*?\b(you|them|kids?|child(ren)?)\b.*?\b(forever|away|with\s+me)\b',
        r'\bnot\s+going\s+back\s+to\b.*?\b(mom|dad|your\s+father|your\s+mother|him|her)\b',
        r'\bwon\'?t\s+let\s+(him|her|them)\s+(see|visit|have)\s+(you|the\s+kids?)\b',
        r'\bi\'?m\s+(taking|keeping)\s+(you|the\s+kids?|them)\b',
        r'\bnever\s+let\s+(you|him|her)\s+see\b',
    ]
    registry[V2Category.SCHEDULE_CONTROL].extend(_compile(gatekeeping_patterns))

    # CTRL: Financial control (from V1 FINANCIAL_COERCION)
    registry[V2Category.FINANCIAL_CONTROL].extend(_compile(FINANCIAL_COERCION_PATTERNS))

    # CTRL: Isolation tactics
    registry[V2Category.ISOLATION_TACTICS].extend(_compile(ISOLATION_TACTICS_PATTERNS))

    # CTRL: Decision override
    registry[V2Category.DECISION_OVERRIDE].extend(_compile(DECISION_OVERRIDE_PATTERNS))

    # PSYB: Gaslighting
    registry[V2Category.GASLIGHTING].extend(_compile(GASLIGHTING_PATTERNS))

    # PSYB: Blame shifting (from V1 blame patterns + coparenting conflict)
    blame_patterns = [
        r'\byour\s+fault\b', r'\byou\s+always\b', r'\byou\s+never\b',
        r'\bbecause\s+of\s+you\b', r'\bthanks\s+to\s+you\b',
        r'\byou\s+caused\b', r'\byou\s+ruined\b', r'\byou\s+made\s+me\b',
        r'\bthis\s+is\s+(all\s+)?your\s+fault\b',
        r'\byou\s+(caused|did)\s+this\b',
    ]
    registry[V2Category.BLAME_SHIFTING].extend(_compile(blame_patterns))

    # PSYB: Minimization
    registry[V2Category.MINIMIZATION].extend(_compile(MINIMIZATION_PATTERNS))

    # PSYB: Invalidation (from V1 dismissive patterns)
    invalidation_patterns = [
        r'\bi\s+don\'?t\s+care\b', r'\bnot\s+my\s+problem\b',
        r'\bdeal\s+with\s+it\b', r'\bget\s+over\s+it\b',
        r'\bwho\s+cares\b', r'\bnone\s+of\s+your\s+business\b',
        r'\bstop\s+(whining|complaining|nagging|crying)\b',
        r'\bgrow\s+up\b',
    ]
    registry[V2Category.INVALIDATION].extend(_compile(invalidation_patterns))

    # CONT: Name calling (from V1 hostility + modern slang insults)
    name_calling_patterns = [
        r'\bbitch\b', r'\bbastard\b', r'\basshole\b', r'\bdick\b', r'\bprick\b',
        r'\bcunt\b', r'\btwat\b', r'\bshithead\b', r'\bfuckface\b',
        r'\bstupid\b', r'\bidiot\b', r'\bdumb\b', r'\bmoron\b', r'\bimbecile\b',
        r'\bbrain\s*dead\b', r'\bdumbass\b', r'\bdumb\s*ass\b',
        r'\bclown\b', r'\bincel\b', r'\bfemcel\b', r'\bsimp\b', r'\bkaren\b',
    ]
    registry[V2Category.NAME_CALLING].extend(_compile(name_calling_patterns))
    # Also add hate speech patterns (zero tolerance insults)
    registry[V2Category.NAME_CALLING].extend(_compile(HATE_SPEECH_PATTERNS))

    # CONT: Character attack
    character_attack_patterns = [
        r'\byou\'?re?\s+(pathetic|a\s+joke|worthless|useless|a\s+terrible\s+parent)\b',
        r'\bwhat\s+kind\s+of\s+(parent|mother|father)\s+(are\s+you|does\s+that)\b',
        r'\byou\s+should\s+be\s+ashamed\b',
        r'\bunfit\s+parent\b',
        r'\bnot\s+(?:[\w\'\*]+\s+){0,3}real\s*(dad|mom|father|mother|parent)\b',
    ]
    registry[V2Category.CHARACTER_ATTACK].extend(_compile(character_attack_patterns))

    # CONT: Mockery (from V1 sarcasm)
    mockery_patterns = [
        r'\byeah\s+right\b', r'\boh\s+sure\b',
        r'\bthanks\s+a\s+lot\b', r'\bgreat\s+job\b.*\bnot\b',
        r'\bhow\s+thoughtful\b', r'\bof\s+course\s+you\s+(would|did|are)\b',
        r'\bshocker\b', r'\bfigures\b', r'\btypical\b',
    ]
    registry[V2Category.MOCKERY].extend(_compile(mockery_patterns))

    # CONT: Disgust expression (profanity + extreme hostility)
    registry[V2Category.DISGUST_EXPRESSION].extend(_compile(PROFANITY_PATTERNS))
    registry[V2Category.DISGUST_EXPRESSION].extend(_compile(EVASION_PATTERNS))
    disgust_extras = [
        r'\bhate\s*(ur\s*|your\s*)?guts\b', r'\bworst\s*mistake\b',
        r'\bwish\s*i\s*never\s*met\s*(yo)?u\b', r'\bruined\s*my\s*life\b',
        r'\bi\s*hate\s*(yo)?u\b', r'\bdisgusting\b', r'\bgross\b',
        r'\bshut\s+(?:[\w\'\*]+\s+){0,3}up\b', r'\bstfu\b',
    ]
    registry[V2Category.DISGUST_EXPRESSION].extend(_compile(disgust_extras))

    # ALNT: Child alienation (from V1 parental alienation)
    registry[V2Category.CHILD_ALIENATION].extend(_compile(PARENTAL_ALIENATION_PATTERNS))
    # Also include coaching children patterns from custody
    coaching_patterns = [
        r'\btell\s+the\s+judge\b.*?\b(want|stay|live)\b',
        r'\byou\s+choose\s+who\s+you\s+(live|stay)\s+with\b',
        r'\bthey\s+hate\s+(yo)?u\b',
    ]
    registry[V2Category.CHILD_ALIENATION].extend(_compile(coaching_patterns))

    # ALNT: Loyalty conflict
    registry[V2Category.LOYALTY_CONFLICT].extend(_compile(LOYALTY_CONFLICT_PATTERNS))

    # ALNT: Info gatekeeping
    registry[V2Category.INFO_GATEKEEPING].extend(_compile(INFO_GATEKEEPING_PATTERNS))

    # ALNT: Relationship sabotage
    registry[V2Category.RELATIONSHIP_SABOTAGE].extend(_compile(RELATIONSHIP_SABOTAGE_PATTERNS))

    # ESCP: Anger escalation (ALL CAPS is handled separately in code, but add verbal)
    anger_patterns = [
        r'\bdon\'?t\s+piss\s+me\s+off\b',
        r'\bi\s+swear\s+to\s+god\b',
        r'\bi\'?m\s+(so\s+)?(sick|tired|done|fed\s+up)\s+(of|with)\s+(this|you|your)\b',
    ]
    registry[V2Category.ANGER_ESCALATION].extend(_compile(anger_patterns))

    # ESCP: Demand escalation
    registry[V2Category.DEMAND_ESCALATION].extend(_compile(DEMAND_ESCALATION_PATTERNS))

    # ESCP: Boundary violation
    registry[V2Category.BOUNDARY_VIOLATION].extend(_compile(BOUNDARY_VIOLATION_PATTERNS_V2))
    # Sexual harassment = extreme boundary violation
    registry[V2Category.BOUNDARY_VIOLATION].extend(_compile(SEXUAL_HARASSMENT_PATTERNS))

    # ESCP: Pattern acceleration is detected algorithmically, not via regex

    # MNIP: Guilt induction
    guilt_patterns = [
        r'\bif\s+you\s+(loved|cared\s+about)\s+me\s+you\s+would\b',
        r'\byou\s+(make|made)\s+me\s+(sad|cry|angry|hurt|depressed|sick)\b',
        r'\bit\'?s\s+(all\s+)?your\s+fault\b',
        r'\byou\s+owe\s+me\b',
        r'\byou\'?re?\s+(ungrateful|selfish)\b',
        r'\bi\s+(wish|regret)\s+(you|I\s+had\s+you|having\s+you)\b',
    ]
    registry[V2Category.GUILT_INDUCTION].extend(_compile(guilt_patterns))

    # MNIP: Emotional blackmail
    blackmail_patterns = [
        r'\bif\s+you\s+(leave|go|don\'?t)\s+I\'?ll?\s+(hurt|kill)\s+myself\b',
        r'\byou\'?ll?\s+be\s+sorry\b',
        r'\byou\'?re?\s+going\s+to\s+regret\s+this\b',
        r'\bno\s+one\s+will\s+ever\s+want\s+you\b',
        r'\byou\'?re?\s+(nothing|worthless)\s+without\s+me\b',
        r'\bnobody\s+(else\s+)?(will\s+)?ever\s+love\s+you\b',
    ]
    registry[V2Category.EMOTIONAL_BLACKMAIL].extend(_compile(blackmail_patterns))

    # MNIP: False victimhood
    registry[V2Category.FALSE_VICTIMHOOD].extend(_compile(FALSE_VICTIMHOOD_PATTERNS))

    # MNIP: Triangulation
    registry[V2Category.TRIANGULATION].extend(_compile(TRIANGULATION_PATTERNS))

    # PAGG: Silent treatment
    registry[V2Category.SILENT_TREATMENT].extend(_compile(SILENT_TREATMENT_PATTERNS))

    # PAGG: Weaponized compliance
    registry[V2Category.WEAPONIZED_COMPLIANCE].extend(_compile(WEAPONIZED_COMPLIANCE_PATTERNS))

    # PAGG: Backhanded compliment
    registry[V2Category.BACKHANDED_COMPLIMENT].extend(_compile(BACKHANDED_COMPLIMENT_PATTERNS))

    # PAGG: Selective memory
    registry[V2Category.SELECTIVE_MEMORY].extend(_compile(SELECTIVE_MEMORY_PATTERNS))

    # Remove empty categories (no patterns = algorithmic detection only)
    return {cat: patterns for cat, patterns in registry.items() if patterns}


# Singleton — built once at import
V2_PATTERN_REGISTRY = build_v2_pattern_registry()
