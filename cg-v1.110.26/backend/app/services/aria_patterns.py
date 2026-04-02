"""
ARIA Detection Patterns - Production Grade
Unified vocabulary for court-ready toxicity detection across ALL messaging channels:
- Parent ↔ Parent co-parenting messages
- Child ↔ Circle Contact messages
- Parent ↔ Child messages (via circle)

Every pattern is case-insensitive at compile time.
Word boundaries (\b) are used to minimize false positives.
"""

from enum import Enum

# ==============================================================================
# HATE SPEECH - ZERO TOLERANCE (Block Send)
# ==============================================================================
HATE_SPEECH_PATTERNS = [
    # RACIAL / ETHNIC (Anti-Black)
    r'\bn[i1!]gg?[ae34]r?\b', r'\bnig\b', r'\bcoon\b', r'\bjungle\s*bunny\b', 
    r'\bporch\s*monkey\b', r'\bspade\b', r'\bspearchucker\b', r'\byard\s*ape\b',
    r'\bsambo\b', r'\bjigaboo\b', r'\btar\s*baby\b',

    # Anti-White
    r'\bcracker\b', r'\bredneck\b', r'\bhillbilly\b', r'\bwhite\s*trash\b', 
    r'\btrailer\s*trash\b', r'\bhonky\b', r'\bofay\b', r'\bpeckerwood\b',

    # Anti-Hispanic
    r'\bspic\b', r'\bwetback\b', r'\bbeaner\b', r'\bgreaseball\b', 
    r'\bborder\s*jumper\b', r'\btaco\s*bender\b',

    # Anti-Asian
    r'\bchink\b', r'\bgook\b', r'\bnip\b', r'\bslant\b', r'\byellow\s*giant\b', 
    r'\bzipperhead\b', r'\bcoolie\b',

    # Anti-Semitic
    r'\bkike\b', r'\byid\b', r'\bheeb\b', r'\bhymie\b', r'\bsheeny\b', 
    r'\bshylock\b', r'\bchrist\s*killer\b', r'\bgoyim\b',

    # Anti-Arab/Muslim
    r'\braghead\b', r'\btowelhead\b', r'\bcamel\s*jockey\b', 
    r'\bsand\s*n[i1!]gg?[ae34]r?\b', r'\bdune\s*coon\b', r'\bterrorist\b',

    # Indigenous
    r'\bsquaw\b', r'\bredskin\b', r'\bprairie\s*n[i1!]gg?[ae34]r?\b', 
    r'\bwagon\s*burner\b', r'\babo\b',

    # LGBTQ+ (Anti-Gay/Trans)
    r'\bfaggot\b', r'\bfag\b', r'\bdyke\b', r'\bcarpet\s*muncher\b', 
    r'\bpillow\s*biter\b', r'\bbatty\s*boy\b', r'\bbugger\b', r'\bsodomite\b',
    r'\btranny\b', r'\bshemale\b', r'\bhe.?she\b', r'\bshim\b', 
    r'\bgender\s*bender\b', r'\btroon\b', r'\bhomo\b', r'\bgay\s*lord\b',

    # Ableism (Severe)
    r'\bretard\b', r'\btard\b', r'\bmongoloid\b', r'\bspaz\b', r'\bshort\s*bus\b',
]

# ==============================================================================
# SEXUAL HARASSMENT - ZERO TOLERANCE (Block Send)
# ==============================================================================
SEXUAL_HARASSMENT_PATTERNS = [
    # Solicitation
    r'\bsend\s*(me\s*)?nudes?\b', r'\bshow\s*(me\s*)?(ur\s*|your\s*)?tits\b', 
    r'\bshow\s*(me\s*)?(ur\s*|your\s*)?pussy\b', r'\bshow\s*(me\s*)?(ur\s*|your\s*)?dick\b',
    r'\bwanna\s*fuck\b', r'\blet\'?s\s*fuck\b', r'\bdtf\b', r'\bnetflix\s*and\s*chill\b',
    r'\bsack\s*pic\b', r'\bdick\s*pic\b',

    # Graphic Acts
    r'\bcum\b', r'\bjizz\b', r'\bbukake\b', r'\bcreampie\b', 
    r'\bdeep\s*throat\b', r'\bglory\s*hole\b', r'\bsuck\s*me\b', r'\beat\s*me\b',
    r'\bjerking\s*off\b', r'\brubbing\s*one\s*out\b', r'\bhorny\b',
    r'\blick\s*(ur\s*|your\s*|my\s*)?balls\b', r'\bsuck\s*(ur\s*|your\s*|my\s*)?dick\b',
    r'\bhump(\s*me)?\b', r'\bput\s*that\s*pussy\s*on\s*me\b',

    # Objectification
    r'\bsugar\s*tits\b', r'\bnice\s*rack\b', r'\bbutterface\b', r'\bmilf\b',
    r'\bonlyfans\b', r'\bfansly\b',
    r'\bsexy\s*body\b', r'\bsexy\s*pic\b', r'\byou\'?re\s*sexy\b',
    r'\b(ur\s*|your\s*)?titt?ies\b', r'\b(ur\s*|your\s*)?tits\b',
    r'\blet\s*me\s*see\s*(dem|them|ur|your)\s*titt?ies\b',
]

# ==============================================================================
# THREATENING - SEVERE (Block Send if Physical)
# ==============================================================================
THREATENING_PATTERNS = [
    # Direct Physical Threats
    r'\bkill\s*(yo)?u\b', r'\bend\s*(yo)?u\b', r'\bput\s*(yo)?u\s*in\s*the\s*ground\b',
    r'\bslit\s*(ur\s*|your\s*)?throat\b', r'\bcurb\s*stomp\b', 
    r'\bbeat\s*(ur\s*|your\s*|yo)?\s*ass\b', r'\bbreak\s*(ur\s*|your\s*)?legs\b',
    r'\bdestroy\s*(yo)?u\b', r'\bcome\s*after\s*(yo)?u\b', r'\byou\'?re\s*dead\b',
    r'\bknock\s*(yo)?u\s*out\b', r'\bi\s*will\s*hurt\s*(yo)?u\b',
    r'\bslap\s*(ur\s*|your\s*|yo)?\s*face\b',
    r'\byou\s*(will|r|are\s*gonna|are\s*going\s*to)\s*die\b', # "You will die"
    
    # Weapons
    r'\bgot\s*a\s*gun\b', r'\bbullet\s*with\s*(ur\s*|your\s*)?name\b', 
    r'\bshoot\s*(yo)?u\b',

    # Suicide Baiting (Criminal)
    r'\bkill\s*yoursel(f|ves)\b', r'\bkys\b', r'\bgo\s*die\b', r'\bdrink\s*bleach\b',
    r'\btoaster\s*bath\b', r'\btake\s*a\s*long\s*walk\b', r'\bunalive\b',
    r'\bhope\s*(yo)?u\s*die\b', # Death Wish
    

    # Stalking
    r'\bwatching\s*(yo)?u\b', r'\bknow\s*where\s*(yo)?u\s*sleep\b', 
    r'\boutside\s*(ur\s*|your\s*)?house\b',
]

# ==============================================================================
# INTENT: CUSTODY WEAPONIZATION (High Risk)
# ==============================================================================
CUSTODY_WEAPONIZATION_PATTERNS = [
    # Gatekeeping - Access denial (allow fillers between key phrases)
    r'\b(won\'?t|never|can\'?t|cannot|not\s+gonna|not\s+going\s+to)\b.*?\bsee\b.*?\b(kids?|child(ren)?|bab[yi]es?|son|daughter|him|her|them|daddy|mommy|your\s+father|your\s+mother)\b',
    r'\btaking\b.*?\b(kids?|child(ren)?|bab[yi]es?|them)\b.*?\baway\b',
    r'\brun\s+away\s+with\b.*?\b(them|kids?|child(ren)?|bab[yi]es?)\b',
    r'\bkeeping\b.*?\b(you|them|kids?|child(ren)?)\b.*?\b(forever|away|with\s+me)\b',
    r'\bnot\s+going\s+back\s+to\b.*?\b(mom|dad|your\s+father|your\s+mother|him|her)\b',
    r'\byou\'?re?\s+(staying|living)\s+with\s+me\b',
    r'\bsay\s+goodbye\s+to\s+(daddy|mommy|your\s+father|your\s+mother)\b',
    r'\byou\s+don\'?t\s+(need|have)\s+to\s+go\s+(back|there)\b',
    r'\bwon\'?t\s+let\s+(him|her|them)\s+(see|visit|have)\s+(you|the\s+kids?)\b',
    r'\bi\'?m\s+(taking|keeping)\s+(you|the\s+kids?|them)\b',
    r'\bnever\s+let\s+(you|him|her)\s+see\b',
    r'\bblock(ing)?\b.*?\bnumber\b',

    # Coaching children / alienation through child
    r'\btell\s+the\s+judge\b.*?\b(want|stay|live)\b',
    r'\byou\s+choose\s+who\s+you\s+(live|stay)\s+with\b',
    r'\btell\s+(?:[\w\'\*]+\s+){0,3}them\s+(?:[\w\'\*]+\s+){0,3}truth\b',
    r'\bthey\s+hate\s+(yo)?u\b',
    r'\bnot\s+(?:[\w\'\*]+\s+){0,3}real\s*(dad|mom|father|mother|parent)\b',
    r'\bthey\s+don\'?t\s+want\s+to\s+come\b',

    # Legal threats / intimidation
    r'\bfull\s+custody\b', r'\bsole\s+custody\b',
    r'\bunfit\s+parent\b', r'\bterminate\s+(?:[\w\'\*]+\s+){0,3}rights\b',
    r'\bcall\s+(?:[\w\'\*]+\s+){0,3}(cps|dcf|dcfs|child\s+services)\b',
    r'\bget\s+a\s+restraining\s+order\b',
    r'\bmy\s+lawyer\s+(will|is\s+going\s+to|says)\b',
    r'\bsupervisor?ed\s+visitation\b',
    r'\byou\'?ll?\s+lose\s+(the\s+kids?|them|custody)\b',
]

# ==============================================================================
# INTENT: FINANCIAL COERCION
# ==============================================================================
FINANCIAL_COERCION_PATTERNS = [
    # Refusal/Extortion
    r'\bnot\s*(gonna|going\s*to)\s*pay\b', r'\bai\'?nt\s*paying\b', 
    r'\bpay\s*up\b', r'\bwhere\'?s\s*my\s*money\b', 
    r'\bdeadbeat\b', r'\bnot\s*paying\s*a\s*dime\b', 
    r'\bsue\s*(yo)?u\s*for\s*everything\b', r'\bbleed\s*(yo)?u\s*dry\b',

    # Control
    r'\bcut\s*(yo)?u\s*off\b', r'\bstarve\s*(yo)?u\s*out\b', 
    r'\bfinancial\s*ruin\b', r'\bgarnish\b',
]

# ==============================================================================
# HOSTILITY & VERBAL ABUSE
# ==============================================================================
HOSTILITY_PATTERNS = [
    # Hate
    r'\bhate\s*(ur\s*|your\s*)?guts\b', r'\bworst\s*mistake\b', 
    r'\bwish\s*i\s*never\s*met\s*(yo)?u\b', r'\bruined\s*my\s*life\b',
    r'\bi\s*hate\s*(yo)?u\b', # Direct Hostility
    
    
    # Dismissive
    r'\bshut\s+(?:[\w\'\*]+\s+){0,3}up\b', r'\bstfu\b', r'\bshut\s*(ur\s*|your\s*)?mouth\b', 
    r'\bzip\s*it\b', r'\btalk\s*to\s*the\s*hand\b',

    # Insults (General)
    r'\bbitch\b', r'\bbastard\b', r'\basshole\b', r'\bdick\b', r'\bprick\b',
    r'\bcunt\b', # Also blocked in Hate/Sexist depending on context
    r'\btwat\b', r'\bshithead\b', r'\bfuckface\b',
    
    # Intelligence Attacks
    r'\bstupid\b', r'\bidiot\b', r'\bdumb\b', r'\bmoron\b', r'\bimbecile\b',
    r'\bautistic\b', r'\bbrain\s*dead\b',

    # Appearance/Character (Detailed)
    r'\bigly\b', r'\bfat\b', r'\bdisgusting\b', r'\bgross\b',
    r'\byou\s*a\s*funky\b', r'\bfunky\s*ass\b', r'\bbig\s*headed\s*ass\b',
    r'\bbrokey\b', r'\bdon\'?t\s*piss\s*me\s*off\b',
    r'\bdumb\s*ass\b', r'\bdumbass\b',
]

# ==============================================================================
# MODERN SLANG & INTERNET TOXICITY (Contextual)
# ==============================================================================
MODERN_SLANG_PATTERNS = [
    r'\bmid\s*parent\b', # "You're a mid parent"
    r'\bthat\'?s\s*cap\b', r'\bno\s*cap\b', # Calling liar
    r'\bgaslight(ing)?\b', # Weaponized therapy speak
    r'\bnarcissist\b', r'\bnarc\b',
    r'\bincel\b', r'\bfemcel\b',
    r'\bgroomer\b', # False accusation
    r'\bsimp\b',
    r'\bpick\s*me\b',
    r'\bkaren\b',
    r'\bboomer\b',
    r'\bclown\b',
    r'\bratio\b', # "L + ratio"
]

# ==============================================================================
# PROFANITY (Standard)
# ==============================================================================
PROFANITY_PATTERNS = [
    r'\bfuck\w*\b', r'\bshit\w*\b', r'\bass\b', r'\bdamn\w*\b', 
    r'\bhell\b', r'\bcrap\b', r'\bpiss\w*\b', r'\bwtf\b',
]

# ==============================================================================
# EVASION TACTICS (Leetspeak / Spacing)
# ==============================================================================
EVASION_PATTERNS = [
    r'\bk\s*[\!1i]\s*ll\b', r'\bk\s*i\s*l\s*l\b',
    r'\bs\s*e\s*g\s*g\s*s\b', # seggs
    r'\bc\s*o\s*r\s*n\b', # corn (porn)
    r'\bh\s*0\s*e\b', # h0e
    r'\bb\s*[\!1i]\s*t\s*c\s*h\b',
    r'\bf\s*[v\*]\s*c\s*k\b',
    # Additional evasion
    r'f\s+u\s+c\s+k', r's\s+h\s+i\s+t', r'b\s+i\s+t\s+c\s+h',
    r'@\$\$', r'sh[!\*1]t', r'b\*tch', r'f[#\*]+k',
    r'a\s*\$\s*\$', r'f\s*[uv]\s*[ck]\s*k?',
]

# ==============================================================================
# PARENTAL ALIENATION (High Risk - Child Safety)
# ==============================================================================
PARENTAL_ALIENATION_PATTERNS = [
    # Denigrating the other parent to/around children
    r'\b(mom|dad|mommy|daddy|your\s+father|your\s+mother)\s+(doesn\'?t|does\s+not)\s+(love|care\s+about|want)\s+(you|the\s+kids?)\b',
    r'\b(he|she)\s+left\s+(because\s+of|because)\s+you\b',
    r'\byour\s+(real|new)\s+(mom|dad|father|mother)\b',
    r'\bit\'?s\s+(your|their)\s+fault\s+(we|I)\s+(divorced|split|broke\s+up|separated)\b',
    r'\b(he|she)\s+chose\s+(work|someone\s+else|a\s+new\s+family|her|him)\s+over\s+you\b',
    r'\b(mommy|daddy|mom|dad|your\s+father|your\s+mother)\s+is\s+(bad|mean|crazy|dangerous|a\s+liar|evil|sick|toxic|stupid)\b',
    r'\bdon\'?t\s+listen\s+to\s+(what|anything)\s+(he|she|they|your\s+mom|your\s+dad)\s+(say|tell)\b',
    r'\b(he|she)\s+(doesn\'?t|does\s+not)\s+(deserve|care)\s+to\s+be\s+your\s+(mom|dad|parent|father|mother)\b',
    r'\byou\'?re?\s+better\s+off\s+without\s+(him|her|them|your\s+mom|your\s+dad)\b',
    r'\bi\'?m\s+your\s+(only|real)\s+(parent|family)\b',
    r'\b(he|she)\s+is\s+(replacing|trying\s+to\s+replace)\s+(you|me|us)\b',
    r'\bif\s+(he|she|your\s+mom|your\s+dad)\s+(really|truly)\s+loved\s+you\b',
    r'\b(he|she|your\s+mom|your\s+dad)\s+is\s+(lying|not\s+telling\s+the\s+truth)\b',
    r'\byour\s+(mom|dad|father|mother)\s+(never|doesn\'?t)\s+(wanted|want)\s+you\b',
    r'\b(he|she)\s+doesn\'?t\s+even\s+(care|miss|think\s+about)\s+you\b',
    r'\byou\'?re?\s+just\s+like\s+your\s+(mom|dad|mother|father)\b',  # Said derogatorily
    r'\b(mom|dad)\s+(has|is)\s+(a\s+new|another)\s+(family|kid|child)\b',
    r'\b(he|she)\s+forgot\s+about\s+you\b',
    r'\b(mommy|daddy)\s+doesn\'?t\s+want\s+to\s+see\s+you\b',
]

# ==============================================================================
# GROOMING PATTERNS (Severe - Child Safety)
# ==============================================================================
GROOMING_PATTERNS = [
    # Secret-keeping / isolation
    r'\b(this|it\'?s)\s+(is\s+)?(just\s+between|our|our\s+little)\s+(us|secret)\b',
    r'\bdon\'?t\s+tell\s+(your\s+parents?|anyone|anybody|mom|dad|mommy|daddy)\b',
    r'\bi\s+won\'?t\s+tell\s+if\s+you\s+won\'?t\b',
    r'\byou\s+can\s+trust\s+me\s+(more\s+than|not)\s+(them|your\s+parents?)\b',
    r'\bdelete\s+(this|these|our)\s+(messages?|texts?|chat)\b',
    r'\bkeep\s+(this|it)\s+(a\s+)?secret\b',
    r'\bour\s+(little\s+)?secret\b',
    r'\bnobody\s+(needs|has)\s+to\s+know\b',

    # Flattery / boundary testing
    r'\byou\'?re?\s+(so\s+)?(mature|special|different\s+from\s+other\s+kids?|grown\s+up)\b',
    r'\bage\s+is\s+just\s+a\s+number\b',
    r'\bthis\s+is\s+(normal|what\s+friends\s+do|what\s+people\s+do)\b',
    r'\byou\'?re?\s+(prettier|more\s+grown\s+up|more\s+mature)\s+than\s+(other|most)\s+(kids?|girls?|boys?)\b',
    r'\byou\s+understand\s+me\s+better\s+than\s+(adults?|anyone)\b',

    # Solicitation / meeting
    r'\bcome\s+to\s+my\s+(house|place|room|apartment)\b',
    r'\bi\s+(have|got)\s+something\s+to\s+show\s+you\b.*?\b(don\'?t|can\'?t)\s+tell\b',
    r'\bdo\s+you\s+have\s+a\s+(boyfriend|girlfriend)\b',
    r'\bsend\s+(me\s+)?(a\s+)?(pic|photo|picture|selfie)\b',  # Also in child patterns
    r'\bwhat\s+(are\s+you|r\s+u)\s+wearing\b',

    # Platform switching / isolation
    r'\blet\'?s\s+(move\s+to|talk\s+on|switch\s+to|use)\s+(a\s+different\s+app|private\s+chat|DMs?|snapchat|instagram|discord|telegram|signal|whatsapp)\b',
    r'\bdo\s+you\s+have\s+(snapchat|instagram|tiktok|discord|kik|telegram)\b',
    r'\bgive\s+me\s+your\s+(number|snap|insta|phone)\b',
    r'\bI\'?m\s+(also|only|just)\s+(\d{1,2}|a\s+kid\s+too)\b',  # Age deception
]

# ==============================================================================
# EMOTIONAL MANIPULATION (Moderate-High - All Channels)
# ==============================================================================
EMOTIONAL_MANIPULATION_PATTERNS = [
    # Guilt-tripping
    r'\bif\s+you\s+(loved|cared\s+about)\s+me\s+you\s+would\b',
    r'\byou\s+(make|made)\s+me\s+(sad|cry|angry|hurt|depressed|sick)\b',
    r'\bit\'?s\s+(all\s+)?your\s+fault\b',
    r'\bi\'?ll?\s+be\s+(sad|hurt|upset|devastated)\s+if\s+you\s+(don\'?t|go|leave)\b',
    r'\bnobody\s+(else\s+)?(will\s+)?ever\s+love\s+you\s+(like|as\s+much)\b',
    r'\bafter\s+everything\s+I\s+(did|do|sacrificed|gave\s+up)\s+for\s+you\b',
    r'\byou\s+owe\s+me\b',
    r'\byou\'?re?\s+(ungrateful|selfish)\b',
    r'\bi\s+(wish|regret)\s+(you|I\s+had\s+you|having\s+you)\b',
    r'\byou\'?re?\s+(nothing|worthless)\s+without\s+me\b',

    # Emotional blackmail
    r'\bif\s+you\s+(leave|go|don\'?t)\s+I\'?ll?\s+(hurt|kill)\s+myself\b',
    r'\byou\'?ll?\s+be\s+sorry\b',
    r'\byou\'?re?\s+going\s+to\s+regret\s+this\b',
    r'\bno\s+one\s+will\s+ever\s+want\s+you\b',
    r'\byou\'?re?\s+just\s+like\s+your\s+(mom|dad|mother|father)\b',

    # Gaslighting
    r'\bthat\s+never\s+happened\b',
    r'\byou\'?re?\s+(crazy|imagining\s+things|making\s+things\s+up|delusional|overreacting)\b',
    r'\bi\s+never\s+said\s+that\b',
    r'\byou\'?re?\s+too\s+sensitive\b',
    r'\bstop\s+being\s+(dramatic|so\s+emotional)\b',
]

# ==============================================================================
# PARENT-TO-PARENT CONFLICT (Moderate - Co-Parenting Context)
# ==============================================================================
COPARENTING_CONFLICT_PATTERNS = [
    # Blame / deflection
    r'\bthis\s+is\s+(all\s+)?your\s+fault\b',
    r'\byou\s+(caused|did)\s+this\b',
    r'\bbecause\s+of\s+(what\s+)?you\s+(did|said)\b',
    r'\byou\s+always\b', r'\byou\s+never\b',  # Absolute statements
    r'\bjust\s+like\s+when\s+you\b',
    r'\bremember\s+when\s+you\b',

    # Passive-aggressive scheduling
    r'\b(oh\s+)?sure,?\s+change\s+the\s+schedule\s+again\b',
    r'\bmust\s+be\s+nice\s+to\b',
    r'\btypical\b',
    r'\bof\s+course\s+you\s+(would|did|are)\b',
    r'\bwhatever\s+you\s+say\b',
    r'\bfigures\b',
    r'\bshocker\b',

    # Guilt-tripping about children
    r'\b(the\s+)?kids?\s+(are|is)\s+suffering\s+because\s+of\s+you\b',
    r'\bthey\s+cry\s+every\s+time\b',
    r'\byou\'?re?\s+hurting\s+(the\s+)?kids?\b',
    r'\bgreat\s+parenting\b',  # Sarcastic
    r'\bparent\s+of\s+the\s+year\b',  # Sarcastic
    r'\bmother\s+of\s+the\s+year\b', r'\bfather\s+of\s+the\s+year\b',

    # Information withholding / control
    r'\byou\s+don\'?t\s+need\s+to\s+know\b',
    r'\bthat\'?s\s+none\s+of\s+your\s+business\b',
    r'\bi\'?ll?\s+tell\s+you\s+when\s+I\'?m\s+ready\b',
    r'\bnot\s+your\s+(concern|problem|business)\b',

    # Dismissive / contempt
    r'\bget\s+over\s+it\b',
    r'\bstop\s+(whining|complaining|nagging|crying)\b',
    r'\bgrow\s+up\b',
    r'\byou\'?re?\s+(pathetic|a\s+joke|worthless|useless|a\s+terrible\s+parent)\b',
    r'\bwhat\s+kind\s+of\s+(parent|mother|father)\s+(are\s+you|does\s+that)\b',
    r'\byou\s+should\s+be\s+ashamed\b',

    # Triangulation / involving others
    r'\beveryone\s+(knows|thinks|says)\s+you\'?re?\b',
    r'\bmy\s+(mom|friends?|family|sister|brother)\s+(thinks?|says?|agrees?)\b',
    r'\bthe\s+kids?\s+(told|said|think)\b.*?\b(bad|hate|don\'?t\s+like)\b',
]

# ==============================================================================
# CHILD-SPECIFIC STRANGER DANGER (Severe - Circle Contacts)
# ==============================================================================
STRANGER_DANGER_PATTERNS = [
    # Location / personal info probing
    r'\bwhere\s+do\s+you\s+live\b',
    r'\bwhat\s+(school|grade|class)\s+(are\s+you\s+in|do\s+you\s+go\s+to)\b',
    r'\bare\s+(you|your\s+parents?)\s+(asleep|in\s+bed|awake|home)\b',
    r'\bwhat\s+does\s+your\s+(house|room)\s+look\s+like\b',
    r'\bare\s+your\s+parents?\s+(home|there|around)\b',
    r'\b(alone\s+at\s+home|home\s+alone)\b',
    r'\bhow\s+old\s+are\s+you\b',
    r'\bwhat\'?s\s+your\s+(age|address)\b',

    # Meeting requests
    r'\bmeet\s+(me|up)\b',
    r'\bcome\s+over\b',
    r'\bpick\s+you\s+up\b',
    r'\blet\'?s\s+hang\s+out\b.*?\b(alone|just\s+us)\b',

    # Photo/video requests
    r'\bsend\s+(me\s+)?(a\s+)?(pic|photo|picture|video|selfie)\b',
    r'\bturn\s+on\s+(your\s+)?(camera|cam|webcam)\b',
    r'\bvideo\s+call\s+me\b.*?\balone\b',

    # Secret-keeping (also in grooming)
    r'\bdon\'?t\s+tell\b.*?\b(parents?|mom|dad|anyone)\b',
    r'\bkeep\s+(it\s+)?a?\s*secret\b',
    r'\bour\s+secret\b',
]

# ==============================================================================
# CHILD EMOTIONAL DISTRESS SIGNALS (Monitor - Alert Parents)
# ==============================================================================
CHILD_DISTRESS_PATTERNS = [
    # Self-harm / suicidal
    r'\bi\s+want\s+to\s+die\b',
    r'\bwant\s+to\s+hurt\s+myself\b',
    r'\bi\s+don\'?t\s+want\s+to\s+(be\s+here|live|exist)\b',
    r'\bcut(ting)?\s+myself\b',
    r'\bwish\s+I\s+was\s+dead\b',
    r'\bwish\s+I\s+was\s+never\s+born\b',

    # Loneliness / hopelessness
    r'\bnobody\s+(loves|cares\s+about|likes)\s+me\b',
    r'\bno\s+one\s+cares\b',
    r'\bi\'?m\s+(so\s+)?(sad|depressed|lonely|hopeless|worthless)\b',
    r'\bfeel\s+(hopeless|empty|numb|alone)\b',
    r'\bwhat\'?s\s+the\s+point\b',

    # Abuse indicators
    r'\b(scared|afraid)\s+(of|at)\s+(home|dad|mom|parent|step)\b',
    r'\b(hit|hurt|beat|punch|kick|slap)(s|ed|ing)?\s+me\b',
    r'\b(yell|scream|shout)(s|ed|ing)?\s+at\s+me\b',
    r'\b(locks?|locked)\s+me\s+(in|out)\b',
    r'\bwon\'?t\s+(let\s+me\s+eat|feed\s+me|give\s+me\s+food)\b',
    r'\bmakes?\s+me\s+(scared|afraid|cry)\b',
    r'\bdon\'?t\s+feel\s+safe\b',
    r'\btouch(es|ed|ing)?\s+me\b.*?\b(bad|wrong|weird|private)\b',

    # Divorce/separation distress
    r'\bis\s+it\s+my\s+fault\b',
    r'\bwhy\s+did\s+(daddy|mommy|mom|dad)\s+leave\b',
    r'\bwill\s+you\s+leave\s+(me\s+)?too\b',
    r'\bi\s+miss\s+(daddy|mommy|mom|dad)\s+so\s+much\b',
    r'\bwhy\s+can\'?t\s+(we|you|they)\s+(all\s+)?live\s+together\b',
]

# ==============================================================================
# AGE-INAPPROPRIATE CONTENT (Moderate - Child Context Only)
# ==============================================================================
# ==============================================================================
# SEXUAL COERCION / CUSTODY-SEX BARGAINING (Severe)
# ==============================================================================
SEXUAL_COERCION_PATTERNS = [
    # Conditioning custody/access on sex
    r'\b(want|wanna)\s+(to\s+)?see\s+(them|the\s+kids?|your\s+kids?)\b.*?\b(sex|fuck|head|blow\s*job|sleep\s+with)\b',
    r'\b(sex|fuck|head|blow\s*job|sleep\s+with)\b.*?\b(see|visit|have)\s+(them|the\s+kids?|your\s+kids?)\b',
    r'\bno\s+(sex|head|pussy|ass)\b.*?\bno\s+(kids?|bab[yi]es?|visit|custody|time)\b',
    r'\bno\s+(kids?|bab[yi]es?|visit|custody|time)\b.*?\bno\s+(sex|head|pussy|ass)\b',
    r'\bgive\s+me\s+(sex|head|some|pussy|ass)\b',
    r'\bif\s+you\s+(want|wanna)\b.*?\b(need|gotta|have)\s+to\b.*?\b(sex|fuck|sleep\s+with|give\s+me)\b',

    # Transactional sex demands
    r'\bno\s+head\s+no\b',  # "no head no babies"
    r'\bput\s+out\s+or\b',
    r'\bgive\s+it\s+up\b.*?\b(or|if)\b',
]

# ==============================================================================
# CONTEMPT & DISGUST (Moderate-High)
# ==============================================================================
CONTEMPT_PATTERNS = [
    # Direct contempt
    r'\b(i\'?m\s+)?sick\s+of\s+(you|this|your)\b',
    r'\b(i\'?m\s+)?tired\s+of\s+(you|this|your)\b',
    r'\b(i\'?m\s+)?done\s+with\s+(you|this|your)\b',
    r'\bcan\'?t\s+stand\s+(you|this)\b',
    r'\bdisgust(ed|ing|s)?\s*(by\s+)?(me|you|this)?\b',
    r'\bmake\s+me\s+sick\b',
    r'\byou\s+make\s+me\s+(sick|nauseous|want\s+to\s+puke)\b',
    r'\bover\s+(you|this|it)\b',
    r'\bso\s+over\s+(you|this|it)\b',

    # Weaponized exasperation
    r'\bevery\s+(single\s+)?time\b.*?\byou\b',
    r'\byou\s+(are\s+)?always\b',
    r'\byou\s+always\s+do\s+this\b',
    r'\bhere\s+you\s+(go|come)\s+again\b',
    r'\bhere\s+we\s+go\s+again\b',
    r'\boh\s+my\s+god\b.*?\b(you|this|again|sick|tired|done)\b',
    r'\bomg\b.*?\b(you|this|again|sick|tired|done)\b',
]

# ==============================================================================
# HOSTILE EMOJIS & UNICODE GESTURES (Contextual)
# ==============================================================================
HOSTILE_EMOJI_PATTERNS = [
    # Offensive hand gestures
    r'\U0001F595',  # 🖕 middle finger
    r'\U0001F926',  # 🤦 facepalm (dismissive in context)

    # Hostile / mocking combos
    r'[\U0001F921\U0001F4A9]{2,}',  # 🤡💩 repeated clown/poop (mocking)
    r'\U0001F4A9',  # 💩 poop emoji used as insult
    r'\U0001F921',  # 🤡 clown emoji used as insult

    # Threatening gestures
    r'\U0001F52A',  # 🔪 knife
    r'\U0001F52B',  # 🔫 gun
    r'\U0001F480',  # 💀 skull (death threat context)
    r'\u2620',      # ☠ skull and crossbones

    # Sexual / inappropriate
    r'[\U0001F346\U0001F351\U0001F4A6]{2,}',  # 🍆🍑💦 combo
]

# ==============================================================================
# IMPLICIT HOSTILITY & SARCASM (Moderate)
# ==============================================================================
IMPLICIT_HOSTILITY_PATTERNS = [
    # Conditional threats with money/access
    r'\bif\s+you\s+(don\'?t|do\s+not)\s+give\s+me\b.*?\b(money|cash|pay)\b',
    r'\bgive\s+me\s+(the\s+)?(money|cash)\b.*?\b(or\s+else|or\s+you)\b',
    r'\bgive\s+me\s+(the\s+)?money\b.*?\b(won\'?t|not\s+gonna|never)\b.*?\bsee\b',

    # Dismissive / mocking sarcasm
    r'\byeah\s+okay\b',
    r'\bsure\s+jan\b',
    r'\blol\s+okay\b',
    r'\bgood\s+(luck|for\s+you)\b',
    r'\bhow\s+cute\b',
    r'\baww?\s+poor\s+(you|baby|thing)\b',
    r'\bkeep\s+telling\s+yourself\s+that\b',
    r'\bwhatever\s+helps\s+you\s+sleep\b',
    r'\bif\s+you\s+say\s+so\b',
    r'\bok\s+buddy\b',
    r'\bok\s+pal\b',
    r'\bnice\s+try\b',
    r'\bidc\b',  # "I don't care"
    r'\bidgaf\b',  # profane dismissal
    r'\blmao\s+(ok|okay|sure|right|whatever)\b',

    # "No more" access denial (catches "you won't see them no more")
    r'\b(won\'?t|not\s+gonna|never)\b.*?\bno\s+more\b',
]

AGE_INAPPROPRIATE_PATTERNS = [
    # Drugs / substances
    r'\b(drugs?|weed|marijuana|cocaine|heroin|meth|ecstasy|molly|edibles?)\b',
    r'\b(alcohol|drunk|wasted|hammered|trashed|blackout|hungover)\b',
    r'\b(cigarette|vape|vaping|smoking|juul|e-?cig|dab|blunt|joint|bong)\b',
    r'\b(high|stoned|baked|lit|faded|buzzed)\b',
    r'\b(dealer|plug|score\s+some)\b',

    # Sexual content
    r'\b(sex|porn|naked|nude|xxx|hentai|nsfw)\b',
    r'\b(boobs?|penis|vagina|breasts?)\b',
    r'\b(condom|birth\s+control|plan\s+b)\b',
    r'\b(hook\s*up|make\s*out|one\s*night\s*stand)\b',
    r'\b(onlyfans|pornhub|xvideos|xhamster)\b',

    # Violence
    r'\b(gore|blood|murder|torture|massacre)\b',
    r'\b(school\s+shoot|shoot\s+up|bomb\s+threat)\b',
    r'\b(self[\s-]?harm|cutting|anorex|bulimi)\b',
    r'\b(dark\s*web|deep\s*web)\b',

    # Gambling
    r'\b(gambling|betting|casino|slots|poker)\b.*?\b(money|win|lose|bet)\b',
]

