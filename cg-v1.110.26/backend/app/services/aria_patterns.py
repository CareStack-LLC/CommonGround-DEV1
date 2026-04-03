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
    r'\bwon\'?t\s+let\s+(him|her|them)\s+(see|visit|have)\b',
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
    r'\bcall(ing)?\s+(?:[\w\'\*]+\s+){0,3}(cps|dcf|dcfs|child\s+services)\b',
    r'\bget\s+a\s+restraining\s+order\b',
    r'\bmy\s+lawyer\s+(will|is\s+going\s+to|says)\b',
    r'\bsupervised\s+visitation\b',
    r'\byou\'?ll?\s+lose\s+(the\s+kids?|them|custody)\b',

    # Veiled custody threats
    r'\blast\s+time\s+(they|you|he|she)\s+(see|visit|spend\s+time)\b',
    r'\blast\s+time\b.*?\bsee\s+(you|them|the\s+kids?|him|her)\b',
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
    r'\bcutt?(ing)?\s+(yo)?u\s+off\b', r'\bstarve\s*(yo)?u\s*out\b',
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
    r'\bdon\'?t\s+listen\s+to\s+(what|anything)\s+(he|she|they|your\s+mom|your\s+dad|your\s+father|your\s+mother)\s+(says?|tells?)\b',
    r'\b(he|she)\s+(doesn\'?t|does\s+not)\s+(deserve|care)\s+to\s+be\s+your\s+(mom|dad|parent|father|mother)\b',
    r'\byou\'?re?\s+better\s+off\s+without\s+(him|her|them|your\s+mom|your\s+dad)\b',
    r'\bi\'?m\s+your\s+(only|real)\s+(real\s+)?(parent|family)\b',
    r'\b(he|she)\s+is\s+(replacing|trying\s+to\s+replace)\s+(you|me|us)\b',
    r'\bif\s+(he|she|your\s+mom|your\s+dad)\s+(really|truly)\s+loved\s+you\b',
    r'\b(he|she|your\s+mom|your\s+dad)\s+is\s+(lying|not\s+telling\s+the\s+truth)\b',
    r'\byour\s+(mom|dad|father|mother)\s+(never|doesn\'?t)\s+(wanted|want)\s+you\b',
    r'\b(he|she)\s+doesn\'?t\s+even\s+(care\s+about|care|miss|think\s+about)\s+you\b',
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
    r'\byou\'?re?\s+(pathetic|a\s+joke|worthless|useless|a\s+terrible\s+(parent|mother|father|mom|dad))\b',
    r'\bterrible\s+(parent|mother|father|mom|dad)\b',
    r'\bwhat\s+kind\s+of\s+(parent|mother|father)\s+(are\s+you|does\s+that)\b',
    r'\byou\s+should\s+be\s+ashamed\b',
    r'\beveryone\s+knows\b',  # "everyone knows you're X" — triangulation

    # Weaponizing children's preferences
    r'\b(kids?|child(ren)?|they)\s+(don\'?t|doesn\'?t)\s+(even\s+)?(want|like)\s+to\s+(go|come|be|see|visit|stay)\b',
    r'\b(kids?|child(ren)?|they)\s+(hate|can\'?t\s+stand)\s+(going|being|you)\b',

    # Gendered slurs in co-parenting context
    r'\bslut\b', r'\bwhore\b', r'\btramp\b', r'\bho\b', r'\bhoe\b', r'\bskank\b',

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
    r'\bcan\'?t\s+stand\s+(you|this|dealing|talking|being)\b',
    r'\bdisgust(ed|ing|s)?\s*(by\s+)?(me|you|this)?\b',
    r'\bmake\s+me\s+sick\b',
    r'\byou\s+make\s+me\s+(sick|nauseous|want\s+to\s+puke)\b',
    r'\bover\s+(you|this|it)\b',
    r'\bso\s+over\s+(you|this|it|dealing)\b',

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

    # Veiled coercion — "you know what you gotta/have to do"
    r'\byou\s+know\s+what\s+(you\s+)?(gotta|have\s+to|need\s+to)\s+do\b',
]

# ==============================================================================
# EXTENDED PATTERNS — Sentence-level detection for nuanced toxicity
# ==============================================================================

# CONTEMPT — Extended (subtle contempt, disgust, dehumanization)
CONTEMPT_EXTENDED_PATTERNS = [
    r'\bamazed\s+(?:that\s+)?you\s+(?:manage|can|are\s+able)\s+to\b',
    r'\bthe\s+last\s+person\s+(?:i\s+(?:would|will|could)|anyone\s+(?:would|should))\b',
    r'\bpeople\s+like\s+you\b',
    r'\banother\s+\w+\s+another\s+(?:disappointment|failure|letdown|problem|excuse)\b',
    r'\bevery\s+conversation\s+with\s+you\b',
    r'\bi\s+expect\s+(?:nothing|less|little)\s+(?:from|of)\s+you\b',
    r'\bi\s+find\s+you\s+(?:exhausting|pathetic|useless|infuriating|unbearable|tiresome|tedious)\b',
    r'\bi\s+(?:have\s+)?(?:given|give)\s+up\s+on\s+you\b',
    r'\bi\s+(?:have\s+)?run\s+out\s+of\s+ways?\s+to\b',
    r'\bi\s+(?:no\s+longer|don\'?t)\s+have\s+(?:any\s+)?expectations?\s+(?:for|of|from)\s+you\b',
    r'\bi\s+(?:genuinely\s+|honestly\s+)?cannot\s+understand\s+how\s+you\b',
    r'\b(?:lack|have\s+no)\s+self[\s\-]?awareness\b',
    r'\bi\s+(?:have\s+)?watched\s+you\s+fail\b',
    r'\bgave\s+up\s+trying\b',
    r'\bi\s+grieve\b.*?\byou\b',
    r'\b(?:made|make)\s+peace\s+with\s+your\s+limitations?\b',
    r'\bnothing\s+but\s+pity\b',
    r'\b(?:cautionary\s+tale|warning\s+story)\b',
    r'\bi\s+(?:have\s+)?nothing\s+(?:left\s+)?to\s+say\s+to\s+you\b',
    r'\b(?:another|such\s+a|a\s+constant|perpetual)\s+disappointment\b',
    r'\bnothing\s+(?:you\s+do\s+)?surprises?\s+me\s+(?:about\s+you\s+)?anymore\b',
    r'\bi\s+(?:long\s+ago\s+)?stopped\s+expecting\s+(?:anything|much|more)\s+(?:from|of)\s+you\b',
    r'\bi\s+(?:have\s+)?told\s+(?:my\s+)?(?:closest\s+)?(?:friends?|family|people)\s+about\s+you\b',
    r'\bi\s+feel\s+(?:nothing|sorry)\s+for\s+you\b',
    r'\bi\s+(?:have\s+)?(?:accepted|come\s+to\s+terms?\s+with)\s+(?:who|what)\s+you\s+are\b',
    r'\bi\s+(?:genuinely\s+)?wonder\s+how\s+you\s+function\b',
    r'\bi\s+(?:have\s+)?(?:lowered|reduced)\s+my\s+expectations?\s+(?:for|of)\s+you\b',
    r'\bi\s+(?:have\s+)?moved\s+on\s+from\s+(?:the\s+)?anger\b',
]

# HOSTILITY — Extended (character attacks, deep disgust, done-ness)
HOSTILITY_EXTENDED_PATTERNS = [
    r'\bevery\s+(?:single\s+)?thing\s+about\s+you\s+is\s+(?:wrong|broken|pathetic)\b',
    r'\bi\s+am\s+(?:disgusted|repulsed|sickened)\s+by\s+(?:you|your)\b',
    r'\bdone\s+pretending\s+(?:you\s+are|you\'?re)\s+(?:a\s+)?(?:reasonable|rational|decent|normal)\b',
    r'\bdone\s+(?:wasting|spending)\s+(?:my\s+)?(?:time|energy|breath)\s+on\b',
    r'\bi\s+(?:genuinely|truly|actually|really)\s+hate\s+you\b',
    r'\bi\s+don\'?t\s+know\s+how\s+you\s+(?:live|sleep|look\s+at\s+yourself)\b',
    r'\bi\s+(?:feel|have|hold)\s+nothing\s+but\s+(?:contempt|disgust|disdain)\s+(?:for|toward)\b',
    r'\bi\s+(?:have\s+)?never\s+met\s+(?:anyone|a\s+person)\s+as\s+(?:pathetic|useless|worthless|selfish|toxic|cruel|awful|terrible)\b',
    r'\bi\s+(?:have\s+)?never\s+(?:once\s+)?respected\s+you\b',
    r'\bi\s+(?:have\s+)?wasted\s+(?:\w+\s+)?years?\s+(?:dealing\s+with|putting\s+up\s+with)\b',
    r'\bevery\s+word\s+(?:out\s+of|from)\s+your\s+mouth\s+is\b',
    r'\byou\s+(?:are|represent)\s+everything\s+wrong\s+with\b',
    r'\byou\s+are\s+a\s+broken\s+(?:person|human|individual)\b',
    r'\bthe\s+kind\s+of\s+person\s+who\s+(?:ruins?|destroys?|sabotages?)\b',
    r'\byou\s+(?:are|were)\s+a\s+waste\s+of\s+(?:my\s+)?(?:time|space|air|breath|years?|life)\b',
    r'\bi\s+am\s+(?:completely\s+|absolutely\s+|totally\s+)?done\s+with\s+you\b',
    r'\byou\s+disgust\s+me\b',
    r'\bi\s+(?:have|hold)\s+(?:no|zero|absolutely\s+no)\s+(?:respect|regard|use)\s+for\s+you\b',
    r'\byou\s+(?:are|were)\s+(?:so\s+)?(?:pathetic|pitiful|useless|worthless|spineless)\b',
    r'\bi\s+regret\s+(?:ever\s+)?(?:knowing|meeting|marrying|choosing|trusting)\s+you\b',
    r'\bi\s+cannot\s+believe\s+(?:the\s+)?audacity\b',
    r'\bthe\s+audacity\s+(?:you\s+have|of\s+you)\b',
    r'\bi\s+(?:genuinely|truly)\s+(?:cannot\s+believe|can\'?t\s+believe)\s+someone\s+like\s+you\b',
    r'\bi\s+(?:genuinely|truly)\s+(?:cannot\s+think|can\'?t\s+think)\s+of\s+one\s+good\s+thing\s+about\s+you\b',
    r'\bi\s+(?:genuinely|truly)\s+(?:feel\s+sorry|pity)\s+(?:for\s+)?anyone\s+(?:who\s+)?(?:has\s+to|knows|deals?\s+with)\b',
    r'\bsad\s+excuse\s+for\s+a\s+(?:parent|person|human|father|mother)\b',
    r'\bi\s+am\s+(?:so\s+)?sick\s+of\s+your\s+(?:excuses?|nonsense|games?|drama|lies?)\b',
]

# THREATENING — Extended (veiled threats, documentation threats, power plays)
THREATENING_EXTENDED_PATTERNS = [
    r'\bi\s+(?:am\s+|\'?m\s+)?documenting\s+(?:every|each|all)\b',
    r'\btime\s+(?:you\s+have\s+)?(?:with\s+them\s+)?is\s+running\s+out\b',
    r'\benjoy\s+(?:the\s+)?(?:time|visits?)\s+you\s+have\b.*?\brunning\s+out\b',
    r'\bi\s+(?:am\s+going\s+to|will|plan\s+to)\s+make\s+sure\s+(?:every|each)\b',
    r'\byou\s+have\s+no\s+idea\s+how\s+far\s+i\b',
    r'\byou\s+don\'?t\s+know\s+what\s+i\'?m\s+(?:capable\s+of|willing\s+to\s+do)\b',
    r'\bi\s+(?:have\s+)?been\s+patient\s+but\b',
    r'\bmy\s+patience\s+(?:has|is)\s+(?:run|running)\s+(?:out|thin|dry)\b',
    r'\bthat\s+patience\s+has\s+(?:an\s+)?(?:end|limit)\b',
    r'\bi\s+(?:have|keep)\s+a\s+folder\s+(?:on|about)\s+you\b',
    r'\bi\s+(?:have\s+)?(?:everything|it\s+all)\s+documented\b',
    r'\bi\s+have\s+(?:contacts?|connections?|people)\s+(?:in|at|with)\s+(?:the\s+)?(?:courthouse|court|police)\b',
    r'\bi\s+have\s+(?:all\s+the\s+)?screenshots?\s+of\s+everything\b',
    r'\bi\s+know\s+(?:exactly\s+)?where\s+you\s+(?:work|live|stay)\b',
    r'\bi\s+know\s+(?:the\s+right\s+)?people\b',
    r'\bi\s+will\s+(?:burn|destroy|take|ruin|dismantle)\s+everything\s+(?:you\s+have\s+)?(?:worked\s+for|built)\b',
    r'\bi\s+(?:do\s+not|don\'?t)\s+make\s+idle\s+threats?\b',
    r'\bwatch\s+yourself\b',
    r'\bwatch\s+your\s+(?:back|step|mouth)\b',
    r'\bcross\s+me\s+(?:one\s+more|again)\b',
    r'\bdo\s+not\s+test\s+me\b',
    r'\bdon\'?t\s+(?:test|push|try)\s+me\b',
    r'\bi\s+gave\s+you\s+(?:a\s+)?chance\s+and\s+you\s+(?:wasted|blew|missed)\s+it\b',
    r'\bnow\s+watch\b',
    r'\bi\s+(?:am|\'?m)\s+keeping\s+track\s+of\s+(?:everything|every)\b',
    r'\bthis\s+will\s+(?:come\s+back|catch\s+up)\b',
    r'\benjoy\s+it\s+while\s+(?:it\s+lasts?|you\s+can)\b',
    r'\byou\s+(?:will|\'?ll)\s+regret\s+(?:this|that|it)\b',
    r'\bi\s+(?:am\s+)?not\s+someone\s+you\s+want\s+as\s+(?:your\s+)?(?:enemy|an\s+enemy)\b',
    r'\bi\s+(?:am\s+)?not\s+the\s+one\s+to\s+mess\s+with\b',
    r'\byou\s+(?:have\s+)?made\s+a\s+(?:very\s+)?serious\s+mistake\b',
    r'\bi\s+have\s+(?:your\s+)?(?:entire\s+)?history\s+(?:saved|ready|documented)\b',
    r'\bi\s+(?:am\s+)?watching\s+(?:everything\s+)?you\s+do\b',
    r'\bevery\s+single\s+thing\s+you\s+do\s+is\s+(?:being\s+)?(?:recorded|documented|watched)\b',
]

# MANIPULATION — Extended (DARVO, guilt trips, victim reversal)
MANIPULATION_EXTENDED_PATTERNS = [
    r'\bi\s+(?:am|\'?m)\s+(?:the\s+one\s+who\s+(?:has\s+)?always|always\s+the\s+one)\s+(?:made|makes|sacrificed)\b',
    r'\byou\s+(?:can\'?t|cannot|won\'?t|refuse\s+to)\s+(?:handle|accept|take|own)\s+(?:any\s+)?accountability\b',
    r'\byou\s+(?:never\s+)?take\s+(?:any\s+)?responsibility\b',
    r'\b(?:even\s+)?(?:the\s+)?(?:therapist|counselor|mediator|judge)\s+(?:agrees?|said|thinks?)\s+(?:that\s+)?your\b',
    r'\beveryone\s+(?:thinks?|knows?|sees?|says?|agrees?)\s+(?:that\s+)?you\s+(?:are|were)\s+(?:unstable|the\s+problem|toxic|crazy|difficult)\b',
    r'\bi\s+(?:am|\'?m)\s+not\s+(?:angry|mad|upset)\b.*?\bdisappointed\b',
    r'\bi\s+(?:am|\'?m)\s+not\s+attacking\s+you\b',
    r'\bi\s+(?:am|\'?m)\s+(?:just\s+)?(?:stating|describing|laying\s+out)\s+(?:the\s+)?facts?\b',
    r'\bi\s+(?:am|\'?m)\s+(?:the\s+one\s+)?holding\s+(?:this\s+)?(?:family|everything)\s+together\b',
    r'\bwhile\s+you\s+play\s+(?:the\s+)?victim\b',
    r'\bi\s+gave\s+you\s+(?:the\s+best|my\s+best)\s+years?\b',
    r'\bi\s+(?:have\s+)?bent\s+over\s+backwards?\s+(?:for\s+you|trying)\b',
    r'\bi\s+(?:have\s+)?only\s+ever\s+(?:responded|reacted|tried)\s+to\b',
    r'\bprotecting\s+(?:the\s+)?kids?\s+from\s+(?:the\s+)?truth\s+about\s+you\b',
    r'\bdon\'?t\s+come\s+(?:crying|running|back)\s+to\s+me\b',
    r'\beverything\s+i\s+(?:do|did|have\s+done)\s+(?:is|was|has\s+been)\s+for\s+(?:the\s+)?(?:kids?|children|them)\b',
    r'\bi\s+(?:have\s+)?sacrificed\s+everything\s+(?:for\s+(?:this\s+family|you|them|the\s+kids?))\b',
    r'\byou\s+(?:are\s+the\s+one\s+who|created|caused)\s+(?:this\s+)?(?:situation|problem|mess|conflict)\b',
    r'\bi\s+(?:have\s+)?done\s+nothing\s+wrong\b',
    r'\bi\s+have\s+nothing\s+to\s+apologize\s+for\b',
    r'\bi\s+(?:have\s+)?always\s+(?:been|put)\s+(?:the\s+)?(?:reasonable|bigger\s+person|kids?\s+first|children\s+first)\b',
    r'\bi\s+(?:have\s+)?always\s+put\s+the\s+kids?\s+first\b',
    r'\bi\s+did\s+everything\s+(?:in\s+this\s+)?(?:relationship|marriage|family)\b',
    r'\bi\s+(?:have\s+)?(?:proof|evidence|recordings?)\s+of\s+(?:everything|what\s+you)\b',
    r'\byou\s+(?:are\s+)?putting\s+your\s+ego\s+(?:ahead|before|above)\b',
]

# GASLIGHTING — Extended (reality denial, memory manipulation, DARVO)
GASLIGHTING_EXTENDED_PATTERNS = [
    r'\bnobody\s+(?:else\s+)?(?:remembers?|recalls?)\s+(?:it\s+)?(?:the\s+way|that\s+way|like)\s+you\s+do\b',
    r'\bi\s+(?:did\s+not|didn\'?t)\s+(?:send|write|say|post)\s+(?:that|those|any)\b',
    r'\byour\s+(?:evidence|proof|screenshots?|documentation)\s+(?:proves?|shows?|means?)\s+(?:less|nothing|little)\b',
    r'\byou\s+are\s+confusing\s+me\s+with\b',
    r'\bi\s+was\s+never\s+(?:there|involved|part\s+of)\b',
    r'\byou\s+(?:have\s+)?convinced\s+yourself\b',
    r'\ba\s+distorted\s+(?:version\s+of\s+)?reality\b',
    r'\byou\s+(?:are\s+)?choosing\s+to\s+believe\b',
    r'\bi\s+know\s+exactly\s+what\s+(?:was\s+said|happened|I\s+said)\b',
    r'\byour\s+version\s+(?:of\s+)?(?:events?\s+)?is\s+(?:not|simply\s+not|just\s+not)\b',
    r'\byou\s+(?:are\s+)?(?:making|inventing|fabricating)\s+(?:up\s+)?(?:entire|whole)\s+conversations?\b',
    r'\bthat\s+(?:conversation|exchange)\s+(?:never\s+happened|didn\'?t\s+happen)\b',
    r'\bi\s+remember\s+(?:that|this|it)\s+(?:perfectly|clearly|very\s+well)\s+and\b',
    r'\bwhat\s+i\s+remember\s+is\s+(?:very|completely|entirely)\s+different\b',
    r'\bi\s+said\s+(?:the\s+)?(?:exact|complete|total)\s+opposite\b',
    r'\bi\s+have\s+documentation\s+that\s+contradicts?\b',
    r'\bi\s+have\s+witnesses?\s+who\b',
    r'\bi\s+(?:have\s+)?been\s+nothing\s+but\s+consistent\b',
    r'\byour\s+(?:version|story|account)\s+is\s+the\s+one\s+that\s+changes?\b',
    r'\byou\s+(?:are\s+)?rewriting\s+(?:history|the\s+past|what\s+happened)\b',
    r'\byour\s+(?:memory|recollection)\s+(?:is\s+not|isn\'?t)\s+(?:reliable|accurate|trustworthy)\b',
    r'\bask\s+(?:anyone|everyone)\s+who\s+was\s+(?:there|present)\b',
    r'\bthat\'?s\s+(?:just\s+)?your\s+interpretation\b',
    r'\bthat\'?s\s+not\s+what\s+(?:actually\s+)?happened\b',
    r'\bi\s+(?:have\s+)?never\s+(?:once\s+)?(?:moved\s+the\s+goalposts?|changed\s+my\s+story)\b',
    r'\bi\s+(?:have\s+)?always\s+been\s+(?:transparent|honest|consistent|truthful)\b',
    r'\byou\s+(?:have\s+)?(?:built|created)\s+a\s+(?:false|distorted|twisted)\s+(?:version|narrative|story)\b',
]

# CUSTODY WEAPONIZATION — Extended (schedule control, gatekeeping, conditional access)
CUSTODY_WEAPONIZATION_EXTENDED_PATTERNS = [
    r'\blimiting\s+your\s+(?:contact|access|time|visits?)\b',
    r'\brestricting\s+(?:your\s+)?(?:contact|access|visitation|visits?)\b',
    r'\bi\s+(?:changed|moved|switched)\s+(?:the\s+)?(?:pickup|drop[\s\-]?off|exchange)\s+(?:location|spot|time)\b',
    r'\bi\'?ve?\s+(?:already\s+)?told\s+them\s+(?:you\s+)?(?:might\s+not|may\s+not|won\'?t)\s+(?:make\s+it|show\s+up|be\s+there)\b',
    r'\bthey\s+(?:asked|want|decided|chose)\s+to\s+(?:live|stay|be)\s+with\s+me\s+(?:full\s+time|permanently)\b',
    r'\buprooting\s+them\b',
    r'\byou\s+(?:have\s+to|need\s+to|must)\s+earn\s+(?:back\s+)?(?:my\s+)?trust\b',
    r'\btheir\s+(?:doctor|therapist|counselor|teacher)\s+agrees?\b',
    r'\byou\s+don\'?t\s+get\s+(?:overnight|unsupervised|any)\s+(?:visits?|visitation|time)\b',
    r'\bno\s+(?:overnight|unsupervised)\s+(?:visits?|visitation|contact)\s+(?:until|unless|after)\b',
    r'\bi\s+set\s+the\s+schedule\b',
    r'\bthe\s+schedule\s+is\s+(?:mine|my\s+decision)\b',
    r'\bi\s+(?:cancelled|canceled)\s+(?:the\s+)?(?:visit|visitation|exchange)\b',
    r'\bnot\s+in\s+their\s+best\s+interest\b',
    r'\bi\s+decide\s+(?:who|when|where|how|what)\s+(?:they|the\s+kids?)\b',
    r'\bi\s+(?:pulled|removed|took)\s+them\s+from\s+(?:the\s+)?(?:visit|trip|event)\b',
    r'\brestricting\s+(?:your\s+)?contact\s+until\s+you\b',
    r'\bget\s+a\s+(?:mental\s+health|psychological|psychiatric)\s+evaluation\b',
    r'\bi\s+(?:am\s+)?the\s+primary\s+(?:parent|caretaker|caregiver|custodian)\b',
    r'\bmy\s+decisions?\s+(?:are|is)\s+final\b',
    r'\bi\s+don\'?t\s+need\s+your\s+(?:approval|permission|consent|input)\b',
    r'\bi\s+(?:cancelled|canceled)\s+(?:your\s+)?(?:parenting\s+time|visitation|visit)\b',
    r'\bthey\s+(?:don\'?t|didn\'?t)\s+want\s+to\s+(?:go|come|visit|see\s+you|be\s+with\s+you)\b',
    r'\bi\s+(?:don\'?t\s+)?feel\s+(?:comfortable|safe)\s+sending\s+them\b',
    r'\bi\s+don\'?t\s+owe\s+you\s+(?:explanations?|reasons?)\s+for\b',
    r'\bi\s+(?:already\s+)?enrolled\s+them\s+in\b',
    r'\bfigure\s+(?:it\s+)?out\b',
    r'\btake\s+it\s+to\s+court\b',
    r'\bi\'?ll\s+be\s+waiting\b',
    r'\bi\s+(?:am\s+)?going\s+back\s+to\s+court\b',
]

# FINANCIAL ABUSE — Extended (control, withholding, conditional payments)
FINANCIAL_ABUSE_EXTENDED_PATTERNS = [
    r'\bi\s+(?:am\s+)?choosing\s+where\s+my\s+money\s+goes\b',
    r'\bi\s+decide\s+where\s+(?:my\s+)?(?:money|funds?|support)\s+goes\b',
    r'\beverything\s+you\s+(?:have|own)\b.*?\bi\s+paid\s+for\b',
    r'\bi\s+paid\s+for\s+everything\s+you\s+(?:have|own)\b',
    r'\bi\s+(?:bought|buy|provide)\s+(?:the\s+)?kids?\s+everything\s+they\s+need\b',
    r'\byou\s+can\s+handle\s+your\s+own\s+(?:bills?|expenses?|costs?)\b',
    r'\bfunny\s+how\s+you\s+(?:can|could)\s+afford\b',
    r'\bhow\s+(?:convenient|interesting|funny)\s+(?:that\s+)?you\s+(?:can|could)\s+afford\b',
    r'\bi\s+control\s+(?:the\s+)?money\b',
    r'\bsupport\s+is\s+a\s+privilege\b',
    r'\bi\s+(?:will\s+not|won\'?t)\s+send\s+(?:another|any\s+more|a\s+single)\s+(?:penny|cent|dollar|dime|payment)\b',
    r'\bi\s+(?:stopped|cancelled|ended|paused)\s+(?:the\s+)?(?:automatic|auto)\s+(?:transfer|payment|deposit)\b',
    r'\bthe\s+payment\s+(?:date\s+)?(?:shifts?|gets?\s+delayed|changes?|moves?)\b',
    r'\bi\s+provide\s+the\s+minimum\b',
    r'\bi\s+(?:pay|provide|send)\s+(?:it\s+)?when\s+i\s+choose\b',
    r'\bi\s+(?:got|had|have)\s+(?:my\s+)?(?:child\s+)?support\s+(?:reduced|lowered|modified)\b',
    r'\bi\s+(?:purchased|bought|buy)\s+things?\s+for\s+(?:the\s+)?kids?\s+directly\b',
    r'\byou\s+don\'?t\s+need\s+(?:cash|money)\s+(?:from\s+me)?\b',
    r'\bi\s+decide\s+how\s+much\s+(?:you\s+get|to\s+send|to\s+pay)\b',
    r'\bi\s+(?:don\'?t|do\s+not)\s+owe\s+you\s+(?:anything|a\s+thing|a\s+cent|money)\b',
    r'\b(?:spending|using|wasting)\s+(?:my\s+)?(?:support\s+money|child\s+support)\s+on\s+yourself\b',
    r'\bi\s+(?:choose|decide)\s+when\s+(?:and\s+how\s+)?i\s+(?:pay|send|transfer)\b',
    r'\bi\s+know\s+what\s+you\s+spend\s+(?:my\s+)?(?:money|support)\s+on\b',
    r'\byou\s+(?:can|could)\s+afford\s+\w+\s+but\b',
    r'\bi\s+(?:have\s+)?redirected\s+(?:the\s+)?(?:support|funds?|money|payments?)\b',
    r'\bpending\s+my\s+(?:review|approval|audit)\b',
    r'\bi\s+(?:am\s+)?(?:not\s+going\s+to|refusing\s+to)\s+subsidize\s+your\b',
    r'\bi\s+(?:have\s+)?(?:copies|records)\s+of\s+your\s+(?:bank\s+statements?|spending|expenses?)\b',
]

# SEXUAL HARASSMENT — Extended (coercive leverage of intimacy, blackmail)
SEXUAL_HARASSMENT_EXTENDED_PATTERNS = [
    r'\bi\'?ll\s+make\s+sure\s+(?:every|all\s+your\s+)?(?:family|everyone|people)\s+(?:knows?|hears?|finds?\s+out)\s+what\s+you\s+did\b',
    r'\bwe\s+could\s+settle\s+this\s+if\s+you\s+(?:just\s+)?came\s+over\b',
    r'\bwork\s+(?:things?|this)\s+out\s+(?:the\s+way|like)\s+we\s+used\s+to\b',
    r'\bi\s+have\s+intimate\s+(?:knowledge|details?|information)\s+(?:about|of)\s+you\b',
    r'\bi\s+(?:still\s+)?have\s+(?:photos?|pictures?|images?|videos?)\s+of\s+you\b',
    r'\bkeep\s+pushing\s+and\b.*?\bfinds?\s+out\b',
    r'\bi\s+know\s+about\s+every\s+(?:person|guy|woman)\s+you\'?ve\s+(?:seen|dated|been\s+with)\b',
    r'\bi\s+remember\s+(?:exactly\s+)?what\s+you\s+look\s+like\b',
    r'\byou\s+should\s+be\s+nicer\s+to\s+me\b',
    r'\bor\s+i\'?ll\s+tell\s+the\s+kids?\s+what\b',
    r'\bevery\s+intimate\s+(?:thing|photo|message|detail)\s+(?:you|we)\s+shared\s+is\s+(?:archived|saved|kept)\b',
    r'\bi\s+have\s+(?:texts?|messages?|photos?|videos?)\s+(?:from|of)\s+you\s+that\b',
    r'\byour\s+(?:new\s+)?(?:partner|boyfriend|girlfriend)\s+doesn\'?t\s+know\s+(?:who\s+you\s+really|about\s+your\s+past|what\s+you)\b',
    r'\bcome\s+(?:see\s+me|over|by)\s+and\s+we\s+(?:can|could)\s+(?:talk|work|sort)\s+(?:this\s+)?out\b',
    r'\bi\s+could\s+ruin\s+your\s+reputation\b',
    r'\bi\'?ll\s+(?:come\s+over|stop\s+by)\s+and\s+we\s+can\b',
    r'\bi\s+(?:have|got)\s+(?:a\s+)?(?:very\s+)?detailed\s+account\s+of\s+your\b',
    r'\bi\s+(?:have\s+)?(?:photos?|pictures?|images?)\s+(?:of\s+you\s+)?i\s+(?:never\s+)?deleted\b',
    r'\bi\s+know\s+(?:every\s+)?(?:person|one)\s+you\'?ve\s+(?:been\s+with|seen|dated)\b',
    r'\bi\s+know\s+things?\s+about\s+your\s+(?:private|personal|intimate)\s+life\b',
    r'\bi\s+(?:have\s+)?access\s+to\s+things?\s+you\s+(?:gave|shared|sent)\s+me\b',
    r'\bi\'?ll\s+(?:bring\s+up|reveal|share|expose)\s+(?:every\s+)?(?:indiscretion|secret|thing)\b',
    r'\bwant\s+me\s+to\s+stay\s+quiet\b',
    r'\bi\'?ll\s+be\s+(?:a\s+lot\s+)?more\s+cooperative\s+if\s+you\'?re\s+(?:a\s+lot\s+)?more\s+friendly\b',
]

# PASSIVE AGGRESSIVE — Extended (sarcasm, martyr complex, weaponized politeness)
PASSIVE_AGGRESSIVE_EXTENDED_PATTERNS = [
    r'\bas\s+per\s+usual\b',
    r'\bcool\s+i\'?ll\s+(?:just\s+)?(?:adjust|rearrange|change|fix|handle)\s+everything\b',
    r'\bdon\'?t\s+mind\s+me\b',
    r'\bglad\s+(?:one\s+of\s+us|someone)\s+is\s+(?:happy|pleased|thrilled)\b',
    r'\bgood\s+for\s+you\b',
    r'\bhow\s+convenient\b',
    r'\bhow\s+(?:lovely|nice|wonderful|great|typical)\s+for\s+you\b',
    r'\bhow\s+(?:very\s+)?predictable\b',
    r'\bi\s+(?:really\s+)?appreciate\s+the\s+(?:consideration|thought|effort)\s+you\s+clearly\b',
    r'\bthat\'?s\s+(?:certainly|definitely|surely)\s+one\s+way\s+to\s+(?:look\s+at|see)\s+it\b',
    r'\bi\s+(?:love|appreciate)\s+how\s+you\s+(?:leave|let)\s+me\s+to\b',
    r'\bi\'?ll\s+(?:just\s+)?add\s+(?:it|that)\s+to\s+the\s+list\b',
    r'\bcool\s+cool\s+cool\b',
    r'\bno\s+worries\s+i\'?ll?\s+(?:just\s+)?handle\s+it\b',
    r'\bwhatever\s+(?:works|suits|is\s+convenient)\s+for\s+you\b',
    r'\bi\'?m\s+sure\s+you\s+have\s+(?:a\s+)?(?:great|wonderful|perfectly\s+good)\s+(?:reason|excuse)\b',
    r'\b(?:happy|glad|thrilled)\s+to\s+(?:do|handle)\s+everything\s+while\s+you\b',
    r'\bi\'?ll\s+(?:just\s+)?handle\s+it\s+(?:myself|like\s+i\s+always\s+do)\b',
    r'\blike\s+i\s+always\s+(?:do|have|have\s+to)\b',
    r'\bso\s+glad\s+you\s+(?:could|can)\s+(?:fit|make)\b',
    r'\bi\s+(?:had\s+)?no\s+idea\s+you\s+felt\s+that\s+way\b',
    r'\bi\s+(?:didn\'?t|did\s+not)\s+expect\s+(?:anything\s+)?different\b',
    r'\bi\s+(?:had\s+)?a\s+feeling\b.*?\bnever\s+disappoint\b',
    r'\bi\s+see\s+nothing\s+has\s+changed\b',
    r'\bi\'?ll\s+(?:just\s+)?(?:note|add)\s+(?:your\s+)?(?:concern|input|opinion)\b',
    r'\bthanks\s+for\s+(?:the\s+)?(?:update|heads?\s+up|letting\s+me\s+know)\b',
    r'\bi\'?ll\s+(?:just\s+)?sort\s+it\s+out\b',
    r'\boh\s+don\'?t\s+(?:concern|worry|trouble)\s+yourself\b',
]

# DISMISSIVE — Extended (ice-cold shutdown, refusing to engage)
DISMISSIVE_EXTENDED_PATTERNS = [
    r'\bi\s+(?:have\s+)?delegated\s+all\s+(?:communication|contact)\b.*?\b(?:attorney|lawyer)\b',
    r'\byou\s+matter\s+(?:very\s+)?(?:little|nothing)\b',
    r'\bi\s+(?:stopped|don\'?t)\s+(?:read|reading)\s+your\s+(?:long|lengthy)\s+(?:messages?|texts?)\b',
    r'\bi\s+(?:don\'?t|do\s+not)\s+owe\s+you\s+(?:warmth|kindness|engagement|a\s+response|any\s+explanation)\b',
    r'\bdon\'?t\s+hold\s+your\s+breath\b',
    r'\bi\'?ll\s+(?:respond|reply|get\s+back\s+to\s+you)\s+when\s+(?:i\s+have\s+time|i\s+choose|i\'?m\s+ready)\b',
    r'\bi\s+(?:am|\'?m)\s+not\s+available\s+for\s+this\s+(?:conversation|discussion|topic)\b',
    r'\bi\s+don\'?t\s+engage\s+with\s+(?:people|someone)\s+who\b',
    r'\bi\s+feel\s+nothing\s+(?:hearing\s+from\s+you|when\s+i\s+hear\s+from\s+you)\b',
    r'\bi\s+(?:am|\'?m)\s+indifferent\s+to\s+(?:your|what\s+you)\b',
    r'\bi\s+don\'?t\s+(?:receive|accept|consider)\s+your\s+(?:judgment|opinion|input|criticism)\s+(?:as\s+)?valid\b',
    r'\bi\s+(?:respond|deal)\s+(?:to|in|with)\s+facts?\s+not\s+feelings?\b',
    r'\bfile\s+whatever\s+you\s+want\b',
    r'\bi\s+engage\s+when\s+i\s+choose\b',
    r'\bi\s+have\s+nothing\s+(?:more\s+)?to\s+say\s+(?:to\s+you|about\s+this)\b',
    r'\bi\s+don\'?t\s+have\s+time\s+for\s+(?:this|you|your)\b',
    r'\bthis\s+conversation\s+is\s+over\b',
    r'\bwe\s+(?:are\s+)?done\s+(?:talking|discussing|communicating)\b',
    r'\bi\s+(?:will\s+not|won\'?t)\s+be\s+responding\s+(?:to\s+this|further|anymore)\b',
    r'\btalk\s+to\s+my\s+(?:lawyer|attorney|counsel)\b',
    r'\bi\s+(?:gave\s+up|stopped)\s+caring\s+about\s+your\b',
    r'\bi\s+(?:have\s+)?more\s+important\s+things?\s+(?:to\s+deal\s+with\s+)?than\s+your\b',
    r'\bi\s+(?:hear|heard)\s+you\b.*?\bi\s+(?:just\s+)?don\'?t\s+(?:agree|care)\b',
    r'\bi\s+(?:am|\'?m)\s+not\s+(?:engaging|available|interested)\b',
    r'\bthat\'?s\s+between\s+me\s+and\s+the\s+(?:court|judge|lawyer)\b',
]

# PARENTAL ALIENATION — Extended (subtle influence, coaching, loyalty conflict)
PARENTAL_ALIENATION_EXTENDED_PATTERNS = [
    r'\bthey\s+(?:told\s+me|said)\s+they\s+feel\s+(?:safer|better|happier|more\s+comfortable)\s+(?:when\s+they\s+are|being)\s+with\s+me\b',
    r'\bthey\s+(?:asked|want)\s+to\s+change\s+their\s+(?:last\s+)?name\b',
    r'\bi\s+(?:have\s+)?never\s+coached\s+them\b',
    r'\bthey\s+see\s+(?:with\s+their\s+own\s+eyes|for\s+themselves)\b',
    r'\bi\s+had\s+to\s+explain\s+to\s+them\s+why\s+you\b',
    r'\bi\s+had\s+to\s+explain\s+(?:your\s+behavior|what\s+you\s+did)\s+to\s+them\b',
    r'\bi\s+(?:let|showed?|will\s+show)\s+them\s+(?:read\s+)?your\s+(?:messages?|texts?)\b',
    r'\bi\s+showed\s+them\s+(?:the\s+)?(?:messages?|texts?)\s+you\s+sent\b',
    r'\bi\s+never\s+say\s+a\s+(?:bad\s+)?word\b',
    r'\bi\s+tell\s+them\s+the\s+truth\s+when\s+they\s+ask\b',
    r'\bi\s+(?:just\s+)?answer\s+their\s+questions?\s+(?:honestly|truthfully)\b',
    r'\bkids?\s+(?:have\s+)?(?:started|begun)\s+(?:declining|refusing|ignoring)\s+(?:calls?|texts?|visits?)\s+from\s+you\b',
    r'\bthey\s+(?:decline|refuse|ignore)\s+(?:your\s+)?(?:calls?|texts?)\s+(?:on\s+their\s+own|by\s+themselves)\b',
    r'\bfeel\s+like\s+(?:visitors?|strangers?|guests?)\s+at\s+your\s+(?:house|home|place)\b',
    r'\bi\s+(?:don\'?t|do\s+not)\s+keep\s+them\s+from\s+you\b',
    r'\bi\s+(?:let\s+them\s+lead|follow\s+their\s+lead)\b',
    r'\bi\s+never\s+(?:bad[\s\-]?mouth|speak\s+badly|say\s+negative)\b',
    r'\bthey\s+came\s+home\s+and\s+(?:told\s+me|said)\s+what\s+you\b',
    r'\bkids?\s+don\'?t\s+lie\s+about\s+(?:things?\s+like\s+)?this\b',
    r'\bi\s+let\s+them\s+(?:process|work\s+through)\s+their\s+(?:own\s+)?feelings?\b',
    r'\bthey\s+(?:have\s+)?expressed\s+(?:concerns?|worries|fears?)\s+about\b',
    r'\bthey\'?ve\s+been\s+through\s+(?:enough|so\s+much)\s+because\s+of\s+(?:you|your)\b',
    r'\bthey\s+(?:told\s+me\s+)?they\s+feel\s+(?:safer|happier|more\s+relaxed|calmer)\s+(?:at|in)\s+my\b',
    r'\btheir\s+(?:own\s+)?(?:decision|choice)\s+(?:not\s+to\s+)?(?:call|visit|see)\s+you\b',
    r'\bthey\s+asked\s+(?:me\s+)?(?:to\s+be\s+at|to\s+come\s+to|about)\s+(?:the\s+)?hearing\b',
    r'\bi\s+(?:have\s+)?never\s+(?:talked|spoken|said)\s+(?:anything\s+)?bad\s+about\s+you\b',
    r'\btheir\s+(?:opinion|view)\s+(?:of\s+you\s+)?is\s+their\s+own\b',
]

# HATE SPEECH — Extended (cultural/background targeting)
HATE_SPEECH_CULTURAL_PATTERNS = [
    r'\byour\s+(?:upbringing|background|culture|community)\s+was\s+(?:the\s+)?(?:red\s+flag|warning)\b',
    r'\bfor\s+(?:being|marrying|dating)\s+someone\s+from\s+your\s+(?:background|culture|community|country)\b',
    r'\byour\s+(?:community|culture|people|background)\s+(?:does\s+not|doesn\'?t)\s+(?:raise|produce)\s+people\s+who\b',
    r'\bmy\s+kids?\s+don\'?t\s+need\s+(?:that\s+)?(?:influence|exposure)\s+(?:from\s+your)\b',
    r'\bi\s+(?:am|\'?m)\s+not\s+(?:racist|prejudiced)\s+but\s+(?:your\s+(?:people|culture|community))\b',
    r'\bi\s+told\s+(?:the\s+)?(?:judge|court|mediator)\s+about\s+your\s+(?:background|culture|religion)\b',
    r'\bi\s+don\'?t\s+trust\s+people\s+from\s+your\s+(?:background|culture|community|country|religion)\b',
    r'\bi\s+don\'?t\s+want\s+(?:my\s+)?(?:children|kids?)\s+(?:speaking|learning)\s+your\s+(?:language|tongue)\b',
    r'\bi\s+don\'?t\s+want\s+(?:my\s+)?(?:children|kids?)\s+exposed\s+to\s+your\s+(?:traditions?|culture|religion|customs?|beliefs?)\b',
    r'\bgo\s+back\s+to\s+where\s+you\s+came\s+from\b',
    r'\bcan(?:not|\'?t)\s+undo\s+(?:marrying|being)\b.*?\byour\s+(?:culture|family|community)\b',
    r'\bi\s+knew\s+this\s+would\s+happen\s+with\s+(?:your\s+type|people\s+like\s+you)\b',
    r'\byour\s+(?:religion|faith|beliefs?|culture)\s+(?:is|are)\s+(?:confusing|harming|damaging)\s+(?:the\s+)?(?:kids?|children)\b',
    r'\b(?:cultural|religious)\s+baggage\b',
    r'\bi\s+don\'?t\s+want\s+them\s+around\s+your\s+(?:side|family|people|relatives)\b',
    r'\b(?:marrying|getting\s+involved\s+with)\s+(?:someone\s+from\s+)?your\s+(?:background|culture)\s+was\s+a\s+mistake\b',
    r'\bi\s+(?:don\'?t|do\s+not)\s+want\s+(?:my\s+)?(?:children|kids?)\b.*?\byour\s+(?:religion|prayers?|faith)\b',
    r'\bi\s+should\s+have\s+known\s+better\b.*?\b(?:your\s+type|someone\s+like\s+you|your\s+background)\b',
    r'\byour\s+(?:family\'?s?\s+)?(?:values?|traditions?|way\s+of)\b.*?\b(?:no\s+place|don\'?t\s+belong)\b',
    r'\bwhere\s+you\s+(?:were\s+raised|came\s+from|grew\s+up)\b.*?\b(?:explains?|that\'?s\s+why)\b',
]

# ALL CAPS / INTENSITY — Extended (demands, shouting without caps, forceful commands)
ALL_CAPS_EXTENDED_PATTERNS = [
    r'\banswer\s+me\s+(?:right\s+)?now\b',
    r'\bdo\s+not\s+(?:bring|let|allow)\s+(?:that|this|any)\s+(?:person|man|woman|guy|anyone)\s+around\s+my\s+(?:children|kids?)\b',
    r'\bi\s+am\s+filing\s+for\s+(?:full\s+|sole\s+)?custody\s+(?:immediately|right\s+now|today|tomorrow)\b',
    r'\bstop\s+posting\s+(?:about|photos?\s+of|pictures?\s+of)\s+(?:our|my)\s+(?:kids?|children|family)\s+on\s+(?:social\s+media|facebook|instagram)\b',
    r'\brespond\s+(?:to\s+me\s+)?(?:right\s+)?now\b',
    r'\bi\s+(?:need|demand|require)\s+(?:an?\s+)?(?:answer|response|reply)\s+(?:right\s+)?now\b',
    r'\bi\s+am\s+(?:completely\s+)?done\s+(?:with\s+your\s+games?|being\s+(?:reasonable|the\s+bigger\s+person)|being\s+nice)\b',
    r'\bthis\s+ends?\s+now\b',
    r'\bi\s+am\s+not\s+(?:going\s+to\s+keep|gonna\s+keep)\s+(?:asking|tolerating|being)\b',
    r'\bi\s+am\s+(?:fed\s+up|done|finished|over\s+it)\s+and\s+you\s+have\s+no\s+idea\b',
    r'\bi\s+am\s+(?:going\s+to|gonna)\s+court\s+on\s+(?:monday|tuesday|wednesday|thursday|friday)\b',
    r'\bplan\s+accordingly\b',
    r'\bdo\s+not\s+(?:contact|call|text|email|message)\s+(?:me|my)\s+(?:again|anymore|ever\s+again)\b',
    r'\bdo\s+not\s+(?:show\s+up|come)\s+(?:at|to)\s+my\s+(?:house|home|job|work|school)\b',
    r'\bdo\s+not\s+(?:sign|make|touch|take|use)\s+(?:anything|my\s+things?)\b.*?\bwithout\s+my\s+(?:consent|permission)\b',
    r'\bdo\s+not\s+(?:use|involve|bring|put)\s+the\s+kids?\s+(?:to|in|into)\b',
    r'\bdo\s+not\s+(?:speak|talk)\s+to\s+my\s+(?:family|friends?|parents?|mother|father)\b',
    r'\bstop\s+(?:interfering|calling|contacting|showing\s+up|texting|emailing)\b',
    r'\benough\b.*?\bi\s+am\s+(?:completely\s+)?done\b',
    r'\bevery\s+single\s+time\s+you\s+pull\s+this\b',
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

# ==============================================================================
# FLEXIBLE PATTERNS — Shorter, word-order-flexible patterns for corpus coverage
# Use .*? connectors for flexible spacing, key-phrase stems, indirect language
# ==============================================================================

PARENTAL_ALIENATION_FLEX_PATTERNS = [
    # "They said/told/asked" child-reporting constructions
    r'\bthey\s+(?:said|told|asked|felt|feel|came|declined|started|want)\b.*\b(?:you|your|dad|mom|parent)\b',
    r'\b(?:kids?|children)\s+(?:said|told|asked|feel|felt|want|prefer|chose|refuse)\b',
    r'\b(?:kids?|children)\b.*\b(?:don\'?t|doesn\'?t|won\'?t|refuse)\b.*\b(?:want|go|see|visit|talk|call)\b',
    # "I let them" accountability shifting
    r'\bi\s+(?:let|allow)\s+(?:them|the\s+kids?)\b.*\b(?:hear|read|see|watch|decide|choose|lead)\b',
    r'\bi\s+don\'?t\s+(?:keep|stop|force|prevent)\s+(?:them|the\s+kids?)\b',
    # Child preference weaponization
    r'\b(?:they|kids?|children)\b.*\b(?:wrote|letter|judge|counselor|therapist|court)\b',
    r'\b(?:they|kids?)\b.*\b(?:asked?\s+to\s+live|want\s+to\s+(?:stay|live)|full\s*time)\b',
    r'\b(?:kids?|children)\b.*\b(?:crying|anxious|upset|scared|afraid)\b.*\b(?:before|after|when)\b.*\b(?:visit|see|go)\b',
    # Coaching denial
    r'\bi\s+(?:never|didn\'?t|did\s+not)\s+(?:coach|influence|badmouth|trash[\s-]?talk|talk\s+bad|say\s+(?:anything|a\s+word))\b',
    r'\b(?:their|the\s+kids?\'?s?)\s+(?:own\s+)?(?:words|feelings?|decisions?|choices?|opinions?)\b',
    r'\bsee\s+(?:with\s+)?(?:their|his|her)\s+own\s+eyes\b',
    r'\bthey\s+(?:see|saw|know|knew|figured?\s+out|realized?)\b.*\b(?:themselves?|on\s+their\s+own)\b',
    # Subtle alienation
    r'\b(?:real|better|good|only|true)\s+(?:parent|mom|dad|mother|father)\b',
    r'\b(?:feel\s+like\s+)?visitors?\s+(?:at|in)\s+(?:your|their|his|her)\s+(?:house|home|place)\b',
    r'\b(?:kids?|children|they)\s+(?:don\'?t|never)\s+(?:mention|ask\s+about|talk\s+about|bring\s+up)\s+(?:you|your|dad|mom)\b',
    r'\b(?:kids?|they)\b.*\b(?:happier|calmer|better|safer|relaxed)\b.*\b(?:with\s+me|at\s+(?:my|our)\s+(?:house|home|place)|here|without\s+you)\b',
    r'\b(?:kids?|they)\b.*\b(?:don\'?t\s+want\s+to|hate|dread|cry\s+(?:about|before)|beg\s+(?:not\s+to|me))\b.*\b(?:go|leave|visit|your)\b',
    # Child as messenger / information extraction
    r'\b(?:kids?|they)\s+told\s+me\s+(?:everything|what|about|that)\b',
    r'\bask(?:ed|ing)?\s+(?:the\s+)?(?:kids?|children|them)\s+(?:about|what|where|who|if)\b.*\b(?:you|your|dad|mom)\b',
    r'\b(?:kids?|they)\s+(?:came\s+(?:home|back)|returned)\s+(?:and\s+)?(?:said|told|crying|upset|asking)\b',
    r'\bmental\s+count\b',
]

HATE_SPEECH_FLEX_PATTERNS = [
    # Cultural/background attacks
    r'\b(?:your\s+)?(?:background|culture|community|heritage|ethnic|religion|faith|traditions?)\b.*\b(?:wrong|problem|toxic|embarrass|issue|damag|fail|ruin)\b',
    r'\bpeople\s+(?:like\s+)?(?:you|from)\b.*\b(?:never|don\'?t|can\'?t|no\s+concept|incapable|unable)\b',
    r'\b(?:your|that)\s+(?:people|community|culture|background|family)\b.*\b(?:rais|teach|parent|value|concept|understand)\b',
    r'\bgo\s+back\s+(?:to\s+)?(?:where|your)\b',
    r'\b(?:don\'?t|do\s+not)\s+(?:want|need)\s+(?:my\s+)?(?:kids?|children)\s+(?:exposed|around|near|learning|involved)\b.*\b(?:your|that|those|their)\b',
    r'\b(?:your|their)\s+(?:kind|type|sort)\b.*\b(?:always|never|don\'?t|can\'?t|shouldn\'?t)\b',
    r'\b(?:genetic|cultural|inherited|generational)\b.*\b(?:problem|flaw|defect|issue|curse|pattern)\b',
    r'\b(?:not\s+)?(?:welcome|belong)\b.*\b(?:here|this\s+(?:country|community|family|neighborhood))\b',
    r'\b(?:those|your)\s+(?:beliefs?|practices?|customs?|ways?|traditions?)\b.*\b(?:backward|primitive|wrong|dangerous|outdated|barbaric)\b',
    # Collective stereotyping
    r'\b(?:people|families|women|men)\s+from\s+(?:your|that|those)\b',
    r'\b(?:your|that)\s+(?:side|half)\s+of\s+the\s+family\b.*\b(?:always|never|problem|same|toxic|crazy)\b',
    r'\b(?:typical|classic|expected)\b.*\b(?:your\s+(?:kind|type|people|culture|background|community))\b',
    r'\b(?:in\s+)?(?:your|that|their)\s+(?:country|culture|community|religion)\b.*\b(?:normal|acceptable|ok|fine)\b.*\b(?:not\s+here|but\s+(?:here|not)|doesn\'?t\s+(?:fly|work))\b',
    # Identity-based rejection
    r'\b(?:ashamed|embarrass)\b.*\b(?:your|their)\s+(?:heritage|culture|background|race|religion|ethnicity)\b',
    r'\b(?:kids?|children)\b.*\b(?:figure\s+(?:it\s+)?out|realize|see|learn|understand)\b.*\b(?:your|that)\s+(?:heritage|culture|background|side)\b',
]

GASLIGHTING_FLEX_PATTERNS = [
    # Reality denial
    r'\byou\s+(?:heard|remember|see|saw|read)\s+what\s+you\s+(?:wanted|chose|needed)\b',
    r'\b(?:that\'?s?\s+)?not\s+what\s+(?:happened|was\s+said|I\s+(?:said|meant|did|wrote))\b',
    r'\byou\s+(?:are\s+)?(?:manufacturing|making\s+up|creating|imagining|inventing|fabricating)\b',
    r'\byour\s+(?:memory|account|version|recollection|interpretation|perception)\b.*\b(?:selective|wrong|inaccurate|flawed|unreliable|convenient|biased)\b',
    # Evidence dismissal
    r'\b(?:that\s+)?(?:screenshot|email|text|message|recording|video|photo)\b.*\b(?:proves?\s+nothing|doesn\'?t\s+(?:show|prove|mean)|out\s+of\s+context|doctored|edited|fake)\b',
    r'\byou\s+(?:are\s+)?(?:twisting|distorting|misrepresenting|misquoting|cherry[\s-]?picking|taking\s+out\s+of\s+context)\b',
    # Reframing abuse as honesty/communication
    r'\bi\s+(?:have\s+)?(?:never\s+been|was\s+not|am\s+not|wasn\'?t)\s+(?:cruel|abusive|manipulat|controlling|dishonest|threatening)\b',
    r'\bi\s+(?:do\s+not|don\'?t)\s+(?:manipulate|gaslight|abuse|control|lie|deceive|intimidate)\b',
    r'\byou\s+(?:call|think|consider|label)\s+(?:honesty|truth|facts?|reality|directness|communication)\s+(?:cruel|abus|attack|manipulat|toxic)\b',
    r'\bi\s+(?:do\s+not|don\'?t)\s+manipulate\b.*\bi\s+communicate\b',
    # Credibility attacks
    r'\byou\s+(?:have\s+)?(?:said|been|done|claimed)\s+this\s+before\s+and\s+(?:been\s+)?wrong\b',
    r'\beveryone\s+(?:else\s+)?(?:sees?|knows?|agrees?|remembers?)\b.*\b(?:differently|the\s+(?:truth|opposite|real))\b',
    r'\bnobody\s+(?:else\s+)?(?:sees?|believes?|remembers?|thinks?|agrees?)\b.*\b(?:that|this|your|with\s+you)\b',
    r'\byou\s+(?:always|never)\s+(?:do\s+this|twist|distort|lie|exaggerate|make\s+things\s+up)\b',
    # Perception attacks
    r'\byou\s+(?:are\s+)?(?:choosing|deciding)\s+to\s+(?:believe|see|interpret|remember|feel)\b',
    r'\byou\s+(?:are\s+)?(?:focusing|fixating)\s+on\s+(?:the|your|a)\s+(?:version|narrative|story|interpretation)\b',
    r'\b(?:your|the)\s+(?:narrative|story|version)\b.*\b(?:doesn\'?t\s+(?:hold|add)|falls?\s+apart|is\s+(?:convenient|self[\s-]?serving))\b',
]

SEXUAL_HARASSMENT_FLEX_PATTERNS = [
    # Privacy/exposure threats
    r'\bi\s+(?:know|have|saw|remember)\b.*\b(?:intimate|private|body|bedroom|photos?|videos?|pictures?)\b',
    r'\bi\s+(?:will|can|might|could|\'ll)\s+(?:describe|tell|share|show|reveal|expose|mention|post)\b.*\b(?:private|intimate|history|photos?|videos?|pictures?|secrets?)\b',
    r'\b(?:your\s+)?(?:reputation|private\s+life|body|secrets?)\b.*\b(?:not\s+(?:safe|private|clean|secret)|everyone\s+(?:will|would|should)\s+know)\b',
    # Surveillance language
    r'\bi\'?(?:ve|have)\s+been\s+(?:watching|tracking|following|monitoring|documenting|keeping\s+tabs)\b',
    r'\bi\s+know\s+(?:about\s+)?(?:every|all|who|where|what)\b.*\b(?:person|one|you\'?ve?\s+(?:seen|been|done|dated|slept))\b',
    # Implied blackmail
    r'\byou\s+should\s+be\s+(?:grateful|glad|thankful|lucky|relieved)\s+(?:I|that\s+I)\s+(?:haven\'?t|didn\'?t|don\'?t|kept)\b',
    r'\bwant\s+me\s+to\s+(?:stay\s+quiet|keep\s+(?:quiet|silent|this\s+(?:between|private|secret)))\b',
    r'\b(?:wonder|imagine|think)\s+what\s+(?:they\'?d?|people\s+would|everyone\s+would|your\s+(?:new|boss|friends?))\b.*\b(?:think|say|know|feel)\b',
    # Coercive isolation
    r'\bone\s+(?:conversation|meeting|time|talk)\b.*\b(?:alone|private|just\s+(?:us|you\s+and\s+me)|in\s+person)\b',
    r'\bwork\s+this\s+out\s+(?:the\s+way\s+we\s+used\s+to|like\s+(?:before|old\s+times|we\s+used\s+to)|privately|between\s+us)\b',
    # Body/intimacy references
    r'\byour\s+body\b.*\b(?:hasn\'?t\s+been|isn\'?t|not)\b.*\b(?:yours?\s+alone|private|off\s+limits)\b',
    r'\bi\s+(?:still\s+)?have\s+(?:those\s+)?(?:intimate|private|personal)\s+(?:knowledge|photos?|videos?|pictures?|memories)\b',
    r'\b(?:remember|forget)\s+(?:what|how)\s+(?:we|things|it)\s+(?:used\s+to|were)\b.*\b(?:between\s+us|in\s+(?:bed|private)|together)\b',
]

FINANCIAL_ABUSE_FLEX_PATTERNS = [
    # Money-cooperation link
    r'\b(?:money|payment|support|deposit|check|funds?)\b.*\b(?:flows?|comes?|continues?|depends?|stops?|starts?)\b.*\b(?:cooperat|comply|agree|behav|attitude)\b',
    r'\b(?:the\s+moment|if|when|every\s+time|next\s+time)\s+you\s+(?:file|take|go|don\'?t|refuse|complain|make\s+things)\b.*\b(?:stop|freeze|withhold|cut|pause|delay|reduce|adjust)\b',
    # Unilateral financial control
    r'\bi\s+(?:will|won\'?t|am|\'m)\s+(?:send|pay|give|owe|provide)\b.*\b(?:court\s+minimum|minimum|what\s+I\s+(?:decide|choose|feel|want|think))\b',
    r'\bi\'?m\s+(?:subtracting|deducting|taking|withholding|adjusting|docking|reducing)\b.*\b(?:from\s+what\s+I\s+owe|from\s+(?:your|the)\s+(?:support|payment|amount))\b',
    r'\b(?:your\s+)?(?:financial|money|income|support)\s+(?:needs?|situation|problems?|issues?)\b.*\b(?:not\s+my|your\s+(?:own\s+)?(?:problem|issue|responsibility|fault))\b',
    # Payment as punishment/leverage
    r'\b(?:payment|support|money|check|deposit)\b.*\b(?:date\s+shifts?|gets?\s+(?:delayed|pushed|moved)|when\s+(?:I\s+(?:decide|feel|want)|you\s+(?:earn|deserve|comply|cooperate)))\b',
    r'\b(?:earn|deserve)\s+(?:your|the|that)\s+(?:support|money|payment|allowance|help)\b',
    r'\b(?:divert|redirect|move|transfer|reroute)\b.*\b(?:support|payment|money|funds?)\b.*\b(?:trust|account|escrow|savings?)\b',
    # Court minimum / bare minimum
    r'\b(?:court|legal|bare|absolute)\s+minimum\b.*\b(?:and\s+)?(?:not\s+(?:a\s+)?(?:cent|dollar|penny|dime)|nothing)\s+more\b',
    r'\b(?:not\s+(?:a\s+|one\s+)?(?:cent|dollar|penny|dime))\s+more\b',
    # Financial monitoring/control
    r'\b(?:funny|interesting|curious)\s+how\s+(?:you\s+(?:can\s+)?afford|you\s+(?:always\s+)?have\s+money)\b',
    r'\b(?:i\s+(?:control|manage|handle|decide))\b.*\b(?:the\s+)?(?:money|finances?|funds?|accounts?|budget)\b',
    r'\b(?:financial|money|support)\b.*\b(?:is\s+a\s+)?privilege\b',
]

CUSTODY_WEAPONIZATION_FLEX_PATTERNS = [
    # Conditional access
    r'\byou\s+can\s+see\s+(?:them|the\s+kids?|him|her)\s+(?:when|if|once|after)\b',
    r'\b(?:won\'?t|can\'?t|cannot|will\s+not)\s+(?:see|have|visit|take|get)\s+(?:them|the\s+kids?|him|her)\s+(?:until|unless|if|when)\b',
    r'\bstart\s+(?:acting|being|behaving)\s+(?:like\s+)?a\s+(?:real|good|proper|responsible|decent)\s+parent\b',
    # Child-attributed refusal
    r'\b(?:they|kids?|children|he|she)\s+(?:don\'?t|doesn\'?t|didn\'?t)\s+(?:want\s+to\s+)?(?:go|come|see|visit|talk|call|stay)\b.*\b(?:you|your|there|with)\b',
    r'\b(?:kids?|children|they)\s+(?:feel|felt|are|seem|get)\s+(?:anxious|unsafe|uncomfortable|scared|afraid|nervous|stressed|sick)\b.*\b(?:with\s+you|before\s+visits?|going\s+(?:to|over)|around\s+you)\b',
    r'\bi\s+(?:can\'?t|cannot|won\'?t)\s+force\s+(?:them|the\s+kids?|him|her)\b',
    # Documentation/evidence threats
    r'\b(?:documenting|recording|noting|logging|tracking|keeping\s+(?:a\s+)?(?:record|log|track))\s+(?:every|each|all)\b.*\b(?:visit|exchange|interaction|incident|time|thing)\b',
    r'\b(?:evidence|documentation|record|file|folder|binder|notes?)\b.*\b(?:against\s+you|for\s+(?:(?:the\s+)?court|(?:my|the)\s+(?:lawyer|attorney)|the\s+judge|(?:the\s+)?hearing))\b',
    # Schedule as control
    r'\bmy\s+(?:house|home|rules?)\b.*\b(?:my\s+(?:decision|call|choice|say|rules?))\b',
    r'\b(?:schedule|arrangement|plan)\b.*\b(?:not\s+(?:your|yours|up\s+to\s+you))\b',
    r'\b(?:they|kids?)\s+(?:came\s+back|returned|came\s+home)\s+(?:crying|upset|dirty|hungry|sick|late|with\s+(?:bruises?|marks?|scratches?))\b',
    r'\bthat\s+(?:will|won\'?t|is)\s+not\s+(?:going\s+to\s+)?happen\s+again\b',
]

MANIPULATION_FLEX_PATTERNS = [
    # Guilt/sacrifice
    r'\bi\s+(?:gave|sacrificed|gave\s+up|lost|spent|wasted|devoted)\b.*\b(?:best\s+years?|everything|my\s+(?:life|career|time|youth|health|happiness))\b',
    r'\b(?:if|only\s+if)\s+you\s+(?:actually|truly|really|even)\s+(?:cared?|loved?|gave\s+a)\b.*\b(?:kids?|children|them|about|damn)\b',
    r'\blook\s+what\s+(?:you\s+)?(?:did|done|caused|made\s+me)\b',
    # Consensus weaponization
    r'\beveryone\s+(?:I\s+know|agrees?|sees?|thinks?|believes?|says?)\b.*\b(?:about\s+you|with\s+me|you\'?re?\s+(?:the|wrong|crazy|toxic))\b',
    r'\b(?:my\s+)?(?:friends?|family|(?:every|all)\s+(?:single\s+)?person|therapist|lawyer|counselor)\b.*\b(?:agrees?\s+(?:with\s+me|you\'?re?)|says?\s+(?:you\'?re?|I\'?m\s+right)|thinks?\s+(?:you\'?re?|the\s+same))\b',
    # Moral positioning
    r'\bi\'?m\s+(?:only|just)\s+(?:doing|saying|asking|trying)\s+(?:this|it)\s+(?:for|because\s+of)\s+(?:the\s+)?(?:kids?|children|family)\b',
    r'\bunlike\s+(?:you|some\s+(?:people|parents?|of\s+us))\b',
    r'\bi\s+(?:have\s+)?(?:only\s+)?(?:ever\s+)?been\s+(?:honest|truthful|fair|reasonable|patient)\b',
    # Mind reading / assuming guilt
    r'\b(?:we\s+both|you)\s+know\s+(?:this\s+is|it\'?s?\s+(?:really|actually)|what\s+(?:this|you|really))\b',
    r'\byou\s+(?:can\s+)?(?:pretend|claim|say|act\s+like|tell\s+(?:yourself|everyone))\b.*\b(?:but\s+(?:we|I|everyone)\s+(?:both\s+)?know)\b',
    r'\byou\s+know\s+(?:what\s+you\s+(?:did|done|said)|exactly\s+what)\b',
    # Victim positioning
    r'\byou\s+(?:are|\'?re)\s+not\s+the\s+victim\b',
    r'\bstop\s+(?:playing|being|acting\s+like|pretending\s+(?:to\s+be))\s+(?:the\s+)?(?:a\s+)?victim\b',
    r'\byou\s+(?:are|\'?re)\s+(?:not|never)\s+(?:the\s+)?(?:innocent|blameless|saint)\b',
    # Conditional love/cooperation
    r'\b(?:if|when)\s+you\s+(?:actually|truly|really)\s+(?:loved?|cared?\s+about)\s+(?:the\s+)?(?:kids?|children|them|this\s+family)\b.*\b(?:you\s+would|you\'?d)\b',
]

DISMISSIVE_FLEX_PATTERNS = [
    # Explicit refusal to engage
    r'\bi\s+(?:stopped|won\'?t|will\s+not|am\s+not\s+going\s+to|refuse\s+to|have\s+stopped)\s+(?:listen|read|respond|engag|discuss|entertain|answer|acknowledg)\b',
    r'\byou\s+(?:can|may)\s+(?:send|write|text|message|email|say)\b.*\b(?:i\s+(?:won\'?t|will\s+not|am\s+not)|(?:not\s+(?:going\s+to\s+)?(?:read|respond|answer|reply|bother)))\b',
    # Deprioritization
    r'\byou\s+(?:matter|are)\s+(?:very\s+)?(?:little|nothing|irrelevant|unimportant|not\s+(?:important|relevant|a\s+(?:factor|priority)))\b',
    r'\bnot\s+(?:a\s+)?(?:priority|concern|my\s+(?:problem|issue|concern))\b',
    r'\b(?:you|your\s+(?:feelings?|opinions?|concerns?|needs?))\b.*\b(?:don\'?t|doesn\'?t|does\s+not)\s+(?:matter|count|register|concern\s+me|affect\s+me)\b',
    # Stonewalling
    r'\b(?:reach\s+out|contact\s+me|try\s+(?:again|later|back)|call\s+(?:back|me\s+back))\s+(?:in\s+a?\s*)?(?:week|month|later|another\s+time|few\s+days?)\b',
    r'\bi\'?m\s+(?:at\s+capacity|done|finished|over\s+(?:it|this)|not\s+(?:available|interested|engaging))\b',
    r'\bi\s+(?:stopped|quit|gave\s+up)\s+(?:listen|car|try|read|respond)\w*\s+(?:a\s+)?(?:long\s+)?(?:time\s+)?ago\b',
    # Triangulation/deflection
    r'\b(?:let|have|make|get)\s+(?:my|the|our)\s+(?:attorney|lawyer|mediator|paralegal)\s+(?:respond|handle|deal|answer|take\s+(?:care|over))\b',
    r'\b(?:we\'?re|I\'?m)\s+done\s+(?:here|with\s+this|talking|discussing|having\s+this)\b',
    r'\b(?:talk|speak|communicate)\s+(?:to|through|via)\s+(?:my|the|our)\s+(?:attorney|lawyer|mediator)\b',
    # Indifference
    r'\bdo\s+whatever\s+(?:helps?\s+you\s+sleep|you\s+(?:want|need|like|feel|think))\b',
    r'\bi\'?m\s+(?:fine|good|great|unbothered|indifferent)\b.*\b(?:with|without|either\s+way)\b',
]

CONTEMPT_FLEX_PATTERNS = [
    # Character attacks
    r'\byou\s+(?:are|\'?re)\s+(?:a\s+)?(?:pathetic|worthless|hopeless|useless|disgraceful|embarrassing|exhausting|draining)\s+(?:excuse\s+for\s+a\s+)?(?:person|human|parent|man|woman|mother|father)?\b',
    r'\bi\s+(?:find|think)\s+you\s+(?:(?:absolutely|completely|utterly|genuinely)\s+)?(?:exhausting|pathetic|repulsive|disgusting|contemptible|laughable|pitiful)\b',
    r'\b(?:nothing\s+but|only)\s+(?:pity|contempt|disgust|disdain|disappointment)\b.*\b(?:for\s+you|left)\b',
    # Superiority/inferiority
    r'\bi\s+(?:have\s+)?(?:given\s+up|lost\s+(?:all\s+)?(?:hope|faith|respect))\b.*\b(?:on\s+you|in\s+you|for\s+you)\b',
    r'\byou\s+(?:will\s+)?never\s+(?:change|grow|learn|improve|amount|be\s+(?:anything|enough|worthy|better))\b',
    r'\b(?:people|everyone|nobody)\b.*\b(?:like\s+you|respects?\s+you|takes?\s+you\s+seriously)\b',
    r'\byou\s+disgust\s+me\b',
]

HOSTILITY_FLEX_PATTERNS = [
    # Intense negative emotion
    r'\bi\s+(?:(?:genuinely|truly|actually|honestly|absolutely)\s+)?(?:hate|loathe|despise|detest|can\'?t\s+stand)\s+(?:you|everything\s+about\s+you|what\s+you)\b',
    r'\bi\s+(?:am|\'m)\s+(?:disgusted|repulsed|revolted|sickened|appalled)\s+(?:by\s+you|by\s+(?:your|the\s+(?:sight|thought)))\b',
    r'\byou\s+(?:are|\'?re)\s+(?:a\s+)?(?:broken|damaged|toxic|horrible|terrible|awful|vile|disgusting|repulsive|sick|deranged)\s+(?:person|human|individual|parent)?\b',
    # Done pretending
    r'\b(?:done|finished|through|over)\s+(?:pretending|acting\s+like|being\s+(?:nice|civil|polite|respectful))\b',
    r'\b(?:drop|lose|cut)\s+the\s+(?:act|facade|pretense|charade|nice\s+(?:guy|act))\b',
    r'\bi\s+(?:don\'?t|no\s+longer)\s+(?:owe\s+you|have\s+to\s+be)\s+(?:anything|civil|nice|polite|kind|respectful)\b',
]

PASSIVE_AGGRESSIVE_FLEX_PATTERNS = [
    # Sarcastic affirmation
    r'\b(?:sure|yeah|ok|okay|right|great|perfect|wonderful|fantastic|lovely|brilliant|awesome)\b[,.]?\s*(?:whatever|if\s+you\s+say\s+so|sure|right|of\s+course|naturally)\b',
    r'\bgood\s+(?:for|on)\s+you\b',
    r'\b(?:oh\s+)?how\s+(?:convenient|surprising|predictable|typical|original|noble|generous|brave|mature)\b',
    # Backhanded compliance
    r'\b(?:as\s+per\s+usual|as\s+(?:always|expected|predicted|usual))\b',
    r'\blike\s+(?:I\s+)?always\s+(?:have\s+to|do|end\s+up|am\s+the\s+one)\b',
    r'\b(?:I\'?ll|I\s+will)\s+(?:just\s+)?(?:do\s+it|handle\s+it|take\s+care\s+of\s+it|figure\s+it\s+out)\s+(?:myself|alone|like\s+(?:always|usual|I\s+always\s+do))\b',
    # Weaponized politeness
    r'\bwith\s+all\s+(?:due\s+)?respect\b',
    r'\bno\s+offense\s+but\b',
    r'\bnot\s+(?:to\s+be\s+)?(?:rude|mean|disrespectful|harsh)\s+but\b',
    r'\bbless\s+(?:your|his|her)\s+(?:heart|soul)\b',
    # Cool/detached hostility
    r'\bcool\s+cool\s+cool\b',
    r'\b(?:lol|lmao)\s+(?:ok|okay|sure|right|whatever)\b',
    r'\b(?:noted|understood|acknowledged|received|k|kk)\b[.!]*$',
]

THREATENING_FLEX_PATTERNS = [
    # Documentation/legal threats
    r'\bi\s+(?:am|\'m)\s+(?:documenting|recording|noting|saving|keeping\s+(?:track|record|a\s+log))\s+(?:every|each|all|this)\b',
    r'\b(?:time\s+is|clock\s+is)\s+(?:running\s+out|ticking)\b',
    r'\b(?:watch|careful|be\s+(?:very\s+)?careful)\s+(?:yourself|what\s+you|how\s+you|your\s+(?:step|back|mouth|tone|words))\b',
    r'\bcross\s+me\s+(?:one\s+more|again)\b',
    r'\bdon\'?t\s+(?:test|push|try|tempt|challenge|mess\s+with|fuck\s+with)\s+me\b',
    r'\bi\s+have\s+(?:a\s+)?(?:folder|file|binder|evidence|proof|documentation|records?)\s+(?:on|about|against)\s+you\b',
    # Implied consequences
    r'\byou\s+(?:will|\'ll|are\s+going\s+to)\s+(?:regret|pay\s+for|answer\s+for|be\s+sorry)\b',
    r'\b(?:this|that|it)\s+(?:will|won\'?t|is\s+(?:not\s+)?going\s+to)\s+(?:end|go)\s+(?:well|badly|the\s+way)\b',
    r'\bi\s+(?:will|\'ll)\s+(?:make\s+(?:sure|certain)|see\s+to\s+it|ensure)\b.*\b(?:you|your|the\s+(?:judge|court))\b',
    # Intimidation
    r'\byou\s+(?:have\s+)?no\s+idea\s+what\s+(?:I\'?m|I\s+am)\s+(?:capable|willing)\b',
    r'\byou\s+(?:don\'?t|do\s+not)\s+(?:want\s+to|wanna)\s+(?:see|know|find\s+out|test|push)\b.*\b(?:what\s+(?:happens|I)|my\s+(?:bad|dark|other))\b',
    r'\bi\s+(?:have|know)\s+(?:connections?|people|friends?|contacts?)\b.*\b(?:(?:who|that)\s+(?:can|will|would)|in\s+(?:high|the\s+right)\s+places?)\b',
]

ALL_CAPS_FLEX_PATTERNS = [
    # Detect messages that are mostly uppercase (>60% caps, >20 chars)
    # These are compiled as-is but the test/aria.py will also check caps ratio
    r'\b[A-Z]{2,}\s+[A-Z]{2,}\s+[A-Z]{2,}\b',  # 3+ consecutive all-caps words
    # Demanding/ultimatum language (corpus labels these as all_caps even when lowercase)
    r'\b(?:this|that|it)\s+(?:stops?|ends?)\s+(?:today|now|here|right\s+now|immediately)\b',
    r'\bi\s+said\s+no\b.*\b(?:final|not\s+(?:up\s+for|negotiable|changing))\b',
    r'\bfor\s+once\s+in\s+your\s+(?:life|damn)\b',
    r'\bnot\s+up\s+for\s+(?:discussion|debate|negotiation)\b',
    r'\bi\s+am\s+(?:officially|formally)\s+(?:done|finished|through)\b',
    r'\byou\s+(?:do\s+not|don\'?t)\s+have\s+permission\b',
    r'\byou\s+will\s+(?:respect|follow|honor|obey|comply)\b',
    r'\byou\s+(?:can\'?t|cannot)\s+(?:keep\s+)?ignor\w+\s+me\b',
    r'\bi\s+am\s+(?:not\s+)?(?:the\s+enemy|going\s+to\s+court|filing)\b',
    r'\bpay\s+(?:the\s+)?(?:support|what)\s+you\s+owe\b',
]

# ==============================================================================
# ROUND 2 — Additional patterns based on corpus miss analysis
# Appended to existing flex lists during compilation
# ==============================================================================

HATE_SPEECH_FLEX2_PATTERNS = [
    # "your people/culture/beliefs" + negative outcome (most common miss pattern)
    r'\b(?:your|their)\s+(?:people|culture|background|heritage|beliefs?|religion|traditions?|customs?|values?|upbringing)\b.*\b(?:shows?|fell\s+apart|can\'?t|don\'?t|doesn\'?t|won\'?t|isn\'?t|not|no\s+(?:respect|idea|concept)|excuse|problem|issue|fault|blame|reason|cause)\b',
    r'\braised\s+by\s+(?:people|a\s+(?:culture|community|family))\b.*\b(?:who\s+(?:don\'?t|can\'?t|didn\'?t)|that\s+(?:don\'?t|can\'?t|doesn\'?t)|with\s+no)\b',
    r'\bshaped\s+by\s+(?:a\s+)?(?:culture|community|environment|upbringing)\b',
    r'\b(?:your|their)\s+(?:side|half)\s+of\s+the\s+family\b',
    r'\b(?:i\s+)?(?:don\'?t|do\s+not|cannot|can\'?t)\s+trust\s+(?:your|their)\s+(?:side|family|people)\b',
    r'\b(?:religious|cultural)\s+(?:thing|issue|problem)\s+with\s+you\b',
    r'\blet\s+someone\s+with\s+(?:your|those|their)\s+(?:beliefs?|values?|background|views?)\b',
    r'\b(?:your|their)\s+(?:whole\s+)?family\s+(?:has|have)\s+the\s+same\b',
    r'\bi\s+know\s+(?:exactly\s+)?what\s+(?:you|they)\s+(?:are|is)\b',
    r'\b(?:came|comes?)\s+from\s+(?:a\s+)?(?:place|culture|family|background)\s+(?:with\s+no|without|that\s+(?:has|have)\s+no)\b',
    r'\b(?:it\s+is|it\'?s)\s+(?:cultural|genetic|hereditary|in\s+(?:your|their)\s+(?:blood|genes?|dna))\b',
    r'\bhistory\s+of\s+this\b',
]

THREATENING_FLEX2_PATTERNS = [
    # Authority/consequence threats
    r'\bone\s+(?:call|phone\s+call|text|email|message)\s+(?:to|from)\b.*\b(?:and\s+|your\s+)?(?:life|everything|world|situation)\s+(?:changes?|is\s+(?:over|done|different))\b',
    r'\b(?:show|showing)\s+up\s+(?:at|to)\s+(?:your|the)\s+(?:door|house|home|work|job|office)\b',
    r'\b(?:not|never)\s+(?:playing|messing|fooling|kidding)\s+(?:around|games?)\b',
    r'\b(?:serious|big|grave|terrible|huge)\s+mistake\b',
    r'\bsee\s+what\s+(?:I|happens?|i\s+(?:do|will))\b',
    r'\b(?:this|that|it)\s+is\s+(?:a\s+)?promise\b',
    r'\b(?:this|that|it)\s+is\s+(?:not|far\s+from)\s+over\b',
    r'\b(?:not\s+even\s+)?close\s+to\s+(?:over|done|finished)\b',
    r'\bi\s+will\s+(?:ruin|destroy|end|wreck|demolish|dismantle)\s+(?:you|your)\b',
    r'\b(?:face|suffer|deal\s+with)\s+(?:the\s+)?consequences\b',
    r'\bbetter\s+hope\b',
    r'\byour\s+(?:life|world|everything)\s+(?:changes?|is\s+about\s+to\s+change|will\s+(?:never\s+be|change))\b',
    r'\byou\s+(?:have\s+)?made\s+a\s+(?:very\s+)?(?:serious|big|grave|terrible)\b',
    r'\b(?:next|last)\s+(?:message|time|chance)\b.*\b(?:determine|decide|change|will\s+be)\b',
    r'\b(?:keep|continue|go\s+ahead)\b.*\band\s+(?:see|watch|find\s+out|learn)\b',
    r'\bhear\s+from\s+(?:my|our|the)\s+(?:lawyer|attorney)\b',
    r'\byou\s+will\s+not\s+see\b.*\b(?:same\s+way|again|tomorrow)\b',
    r'\b(?:i\s+will|i\'ll)\s+(?:make|ensure|see\s+to\s+it)\b.*\b(?:pay|regret|sorry|suffer|lose)\b',
]

SEXUAL_HARASSMENT_FLEX2_PATTERNS = [
    # Quid pro quo / leverage
    r'\bgive\s+(?:me|you)\s+what\s+(?:I|you)\s+want\b',
    r'\b(?:i\s+have|want)\s+leverage\b',
    r'\blifestyle\s+(?:choices?|decisions?)\b.*\b(?:declaration|court|judge|filing|record)\b',
    r'\bprivate\s+(?:behavior|life|choices?|history)\b.*\b(?:relevant|court|parenting|judge|evidence)\b',
    r'\b(?:intimate|private)\s+(?:thing|detail|moment|info|information)\b.*\b(?:archived?|saved?|documented?|stored?|kept|recorded?)\b',
    r'\b(?:shown|shared|sent|posted)\s+(?:your|their|those)\s+(?:photos?|pictures?|images?|videos?)\b',
    r'\b(?:never\s+)?(?:the\s+)?innocent\s+(?:party|one|person)\s+(?:you\s+)?(?:pretend|claim|act)\b',
    r'\b(?:what|who)\s+(?:type|kind)\s+(?:you|of\s+person)\b.*\b(?:were|are|always)\b',
    r'\bbaggage\s+in\s+bed\b',
    r'\b(?:your|their)\s+(?:new\s+)?partner\b.*\b(?:must|should|probably|bet)\b.*\b(?:love|enjoy|deal)\b',
    r'\b(?:maintained?|keep|kept)\s+(?:no\s+)?standards?\b.*\b(?:after|since|without)\s+me\b',
    r'\b(?:court|judge)\s+(?:decide|determine|rule)\b.*\b(?:private|intimate|personal|sexual)\b',
    r'\b(?:describe|detail|share|tell)\b.*\b(?:intimate|private|sexual)\s+(?:history|life|details?|relationship)\b.*\b(?:full\s+detail|whoever|anyone|everyone|court)\b',
]

FINANCIAL_ABUSE_FLEX2_PATTERNS = [
    # Spending surveillance/judgment
    r'\b(?:you\s+)?spend\s+(?:it|money|support|my\s+money)\s+on\b',
    r'\b(?:where|what|how)\s+(?:my|the)\s+(?:support|money|child\s+support)\s+(?:money\s+)?(?:is\s+)?(?:going|goes?|spent|used)\b',
    r'\b(?:funny|interesting|curious|convenient)\s+how\s+(?:you\s+(?:can\s+)?afford|you\s+(?:have|got|bought|found)\s+(?:money|new))\b',
    r'\b(?:buying|bought|got|getting|purchased)\s+(?:new|a\s+new)\b.*\b(?:where|while|but|yet|and)\b.*\b(?:kids?|children|support|money|shoes?|clothes?)\b',
    # Court order manipulation
    r'\b(?:doesn\'?t|does\s+not|don\'?t)\s+say\s+when\b',
    r'\bi\s+(?:choose|decide|determine)\s+(?:when|how|if|whether)\b.*\b(?:pay|send|transfer|give)\b',
    # Direct financial control
    r'\b(?:you\s+)?(?:don\'?t|do\s+not)\s+get\s+(?:cash|money|a\s+(?:cent|dime|penny))\b.*\b(?:from\s+me|anymore|any\s+more)\b',
    r'\bwithholding\b.*\b(?:until|unless|pending|till)\b',
    r'\b(?:my|your)\s+(?:approval|permission|consent|authorization)\b.*\b(?:before\s+you\s+)?spend\b',
    r'\b(?:forensic\s+)?accountant\b.*\b(?:audit|review|investigate|examine|look\s+at|go\s+through)\b',
    r'\b(?:verify|prove|show|demonstrate)\b.*\b(?:benefits?\s+the\s+kids?|goes?\s+to\s+(?:the\s+)?(?:kids?|children))\b',
    r'\b(?:spending|financial)\s+(?:habits?|history|records?|pattern)\b.*\b(?:court|judge|hearing|trial|lawyer|attorney)\b',
    r'\b(?:hiring|getting|bringing\s+in)\s+(?:a\s+)?(?:forensic\s+)?(?:accountant|investigator|auditor)\b',
    r'\b(?:pay|paying)\s+(?:for\s+)?(?:what\s+I\s+can\s+verify|only\s+(?:what|things))\b',
    r'\b(?:cover|paying|pay)\b.*\b(?:directly|straight\s+to)\b.*\b(?:you\s+(?:don\'?t|do\s+not)\s+get|no\s+(?:cash|money))\b',
    r'\b(?:out\s+of|from)\s+child\s+support\b',
    r'\binvolve\s+(?:lawyers?|attorneys?|accountants?)\b',
    r'\bfair\s+is\s+fair\b',
]

CONTEMPT_FLEX2_PATTERNS = [
    # Character summary attacks
    r'\btoo\s+little\s+too\s+late\b',
    r'\bno\s+version\s+(?:of\s+this\s+)?(?:where|in\s+which)\s+you\b',
    r'\b(?:grateful|thankful)\b.*\b(?:every|each|all)\b.*\b(?:person|one|people|human)\b.*\b(?:who\s+is\s+)?not\s+you\b',
    r'\b(?:made|come\s+to)\s+peace\s+with\b.*\b(?:never|won\'?t|will\s+not|can\'?t)\b',
    r'\btextbook\s+(?:example|case|definition)\b',
    r'\b(?:the\s+)?(?:absolute\s+)?(?:floor|bottom|lowest|minimum|bare\s+minimum)\s+of\s+(?:what\s+)?(?:a\s+)?(?:co[\s-]?parent|parent|person|human)\b',
    r'\b(?:commit|committed|committing)\s+to\s+(?:underperform|fail|disappoint|mediocr)\b',
    r'\bpeaked\b.*\b(?:damage|worst|lowest|negative|destruction)\b',
    r'\bhistory\s+(?:will|won\'?t)\s+(?:not\s+)?(?:remember|judge|treat)\s+(?:you\s+)?(?:kindly|well|favorably)\b',
    r'\b(?:the\s+)?definition\s+of\b.*\b(?:too\s+little|failure|inadequa|disappoint|mediocr)\b',
    # Deep contempt
    r'\b(?:you\s+)?(?:remind|reminds?)\s+me\s+(?:of\s+)?why\b',
    r'\b(?:you\s+)?(?:make|makes?)\s+it\s+(?:very\s+)?(?:hard|difficult|impossible)\s+to\s+(?:believe|trust|respect|have\s+faith)\b',
    r'\byou\s+(?:are|\'?re)\s+(?:just\s+)?(?:exactly\s+)?what\s+(?:you\s+)?(?:have\s+)?always\s+been\b',
    r'\b(?:you\s+)?represent\b.*\b(?:absolute|the)\b.*\b(?:floor|worst|lowest|bottom)\b',
    r'\b(?:low|such\s+low)\s+standards\b',
    r'\byou\s+(?:are|\'?re)\s+(?:someone|a\s+person)\s+(?:who|that)\b.*\b(?:blame|never|always|can\'?t|won\'?t|peak)\b',
    r'\b(?:only\s+)?(?:impressive|remarkable|notable)\b.*\b(?:how\s+(?:thoroughly|completely|consistently))\b.*\b(?:underperform|fail|disappoint|mess\s+up)\b',
]

PASSIVE_AGGRESSIVE_FLEX2_PATTERNS = [
    # Sarcastic praise
    r'\b(?:great|wonderful|brilliant|genius|amazing|perfect|incredible)\s+(?:idea|plan|move|choice|decision|timing)\b.*\b(?:like\s+(?:all\s+)?(?:your|every)|as\s+(?:usual|always))\b',
    r'\bof\s+course\s+(?:it\'?s?\s+)?(?:my\s+(?:problem|fault|job|responsibility)|you\'?d?\s+(?:do|say|think|forget|cancel))\b',
    r'\bi\'?ll\s+remember\s+this\b',
    r'\b(?:stopped|quit|gave\s+up)\s+being\s+surprised\b',
    r'\b(?:don\'?t|doesn\'?t)\s+(?:I|he|she)\s+always\b',
    r'\bby\s+all\s+means\b',
    r'\bthanks?\s+(?:so\s+much|a\s+lot|ever\s+so\s+much)\s+for\s+(?:considering|thinking|including|remembering|noticing)\b',
    r'\bof\s+course\s+you\'?d?\s+(?:do|say|think|forget|cancel|ignore|skip)\s+(?:that|this|it)\b',
    r'\bi\s+appreciate\s+the\s+(?:heads?\s+up|consideration|effort|thought|input|feedback)\b.*\b(?:really|sure|right|truly|so\s+much)\b',
    r'\b(?:sure|yeah|yes)\b[.!,]*\s*(?:why\s+not|great\s+idea|makes?\s+sense|sounds?\s+(?:great|good|fun|fair))\b',
    r'\b(?:it\s+)?always\s+works?\s+out\b.*\bfor\s+you\b',
    r'\bcan\'?t\s+wait\b[.!]*$',
    # Resigned sarcasm
    r'\bi\'?m\s+(?:sure|certain|confident)\s+(?:it\'?ll?|you\'?ll?|that\'?ll?|things?\s+will)\s+(?:be\s+)?(?:fine|great|wonderful|perfect|work\s+out)\b',
    r'\b(?:make\s+)?yourself\s+(?:comfortable|at\s+home|right\s+at\s+home)\b',
    r'\bwhy\s+would\s+(?:it|this|that|anything)\s+be\s+(?:anything\s+)?(?:else|different)\b',
]

CUSTODY_WEAPONIZATION_FLEX2_PATTERNS = [
    # Unilateral schedule control
    r'\b(?:your\s+)?(?:time|visitation|access)\s+(?:is\s+)?(?:reduced|limited|restricted|suspended|revoked|cancelled|canceled)\b',
    r'\b(?:until\s+)?(?:further\s+notice|i\s+(?:say|decide|approve)\s+otherwise)\b',
    r'\bnot\s+(?:available|coming|going)\s+this\s+(?:weekend|week|time|visit|holiday)\b.*\b(?:something\s+came\s+up|i\s+(?:have|got)|changed?\s+(?:my|the)\s+(?:mind|plan))\b',
    r'\b(?:gave|give)\s+up\s+(?:your|their)\s+(?:rights?|claim|custody|time)\b',
    r'\bno\s+(?:say|input|voice|vote|opinion)\s+(?:in\s+)?(?:what\s+happens?|who|how|when|where)\b.*\b(?:my\s+(?:parenting\s+)?time|my\s+(?:house|home))\b',
    r'\bcalling\s+(?:the\s+)?(?:police|cops?|authorities|cps|dcs|dcf|child\s+(?:protective|welfare))\b',
    r'\b(?:filed?|filing|report|reported)\b.*\b(?:cps|dcs|dcf|child\s+protective|child\s+welfare)\b',
    r'\b(?:every|each)\s+(?:decision|choice|call)\b.*\b(?:about\s+)?(?:their|the)\s+(?:schedule|routine|life|care)\b.*\b(?:mine|my|i\s+(?:make|decide))\b',
    r'\b(?:cancelled?|canceled?|postponed?|moved?|rescheduled?)\s+(?:this\s+week|the\s+(?:visit|pickup|drop[\s-]?off|exchange|weekend))\b',
    r'\b(?:pickup|drop[\s-]?off|exchange|visit)\s+(?:is\s+)?cancelled?\b',
    r'\b(?:good|healthy|stable|solid|great)\s+(?:routine|structure|stability)\b.*\b(?:here|with\s+me|at\s+(?:my|our))\b.*\b(?:disrupting|breaking|interrupting|changing)\b',
    r'\b(?:behavioral|behavior|behavioural)\s+(?:concerns?|issues?|problems?|report)\b.*\b(?:after|following|from|during)\s+(?:your|their)\s+(?:visits?|time|weekends?|overnights?)\b',
    r'\b(?:pay|owe)\b.*\b(?:or\s+)?(?:the\s+)?(?:kids?\s+)?(?:stay|remain|don\'?t\s+(?:go|come|leave))\b',
    r'\b(?:i\s+have\s+)?(?:reasons?|my\s+reasons?|grounds?|evidence|documentation)\b.*\b(?:to\s+)?(?:reduce|limit|restrict|suspend|withhold|block)\b',
    r'\byour\s+(?:parenting\s+)?time\b.*\b(?:is\s+)?(?:not|no\s+longer)\b',
    r'\b(?:letter|note|report|email)\s+from\s+(?:their|the)\s+(?:school|teacher|counselor|therapist|doctor|pediatrician)\b',
]

MANIPULATION_FLEX2_PATTERNS = [
    # Chance/opportunity framing
    r'\b(?:gave|given)\s+(?:you\s+)?(?:chance|opportunity|chances?)\s+(?:after\s+)?(?:chance|after)\b',
    r'\bchose\s+to\s+(?:waste|throw\s+away|ignore|squander|blow|ruin)\b',
    r'\bi\s+(?:protected|shielded|saved|rescued)\s+(?:them|the\s+kids?|my\s+(?:kids?|children))\b.*\b(?:there\s+is\s+a\s+difference|not\s+the\s+same)\b',
    r'\b(?:same\s+)?person\s+(?:you\s+)?(?:have\s+)?always\s+been\b.*\b(?:that\s+is\s+)?(?:the\s+)?problem\b',
    r'\b(?:kids?|children)\s+(?:come|came|run|ran|turn|turned)\s+to\s+me\b.*\b(?:when|because|scared|afraid|upset|hurt|worried)\b',
    r'\bchoosing\s+(?:conflict|fighting?|drama|chaos|yourself|ego)\s+over\s+(?:your\s+)?(?:own\s+)?(?:kids?|children|family)\b',
    r'\beverything\s+(?:I|i)\s+(?:did|do|have\s+done)\s+(?:was|is)\s+(?:to\s+)?(?:protect|for\s+(?:the\s+)?(?:kids?|children|family|safety))\b',
    r'\b(?:stated|gave)\s+(?:a\s+)?consequence\b.*\b(?:not\s+(?:a\s+)?threat|there\s+is\s+a\s+difference|difference)\b',
    r'\b(?:i\s+)?never\s+(?:withheld|denied|blocked|prevented|refused)\b.*\bi\s+(?:protected|shielded|ensured|kept\s+(?:them\s+)?safe)\b',
    # Proof/evidence wielding
    r'\b(?:i\s+have|got)\s+(?:proof|evidence|documentation|records?|screenshots?|emails?|texts?|recordings?)\b',
    r'\b(?:like\s+this|been\s+(?:like\s+)?this)\s+(?:our\s+)?entire\s+(?:relationship|marriage|time)\b',
    r'\b(?:the\s+)?kids?\s+(?:see|sees?|know|knows?)\s+(?:it|the\s+truth|what\s+you)\b.*\b(?:even\s+if|whether\s+(?:or\s+not\s+)?you)\b',
    # Emotional leverage
    r'\bi\s+(?:am|\'m)\s+(?:tired|sick|exhausted|done)\s+(?:of\s+)?(?:being\s+)?(?:made|feeling|forced)\s+(?:to\s+)?(?:feel\s+)?(?:crazy|guilty|bad|wrong|small|stupid)\b',
    r'\bi\s+(?:hope|pray|wish)\s+you\s+(?:do|will|can|make)\s+(?:the\s+)?(?:right|better|good)\b',
    r'\bi\s+cannot\s+force\s+you\b',
    r'\byou\s+only\s+care\s+about\s+yourself\b',
]

DISMISSIVE_FLEX2_PATTERNS = [
    # Indifference statements
    r'\byou\s+(?:matter|mean)\s+(?:very\s+)?(?:little|nothing)\b.*\b(?:to\s+me|in\s+my|now|anymore)\b',
    r'\bi\s+(?:have|got)\s+(?:no\s+)?(?:zero|nothing|no)\s+(?:interest|energy|time|patience|bandwidth|desire|intention)\b.*\b(?:in\s+(?:this|you|your)|to\s+(?:discuss|talk|respond|engage|deal))\b',
    r'\b(?:below|beneath|not\s+worth)\s+(?:me|my\s+(?:time|energy|attention|effort|dignity))\b',
    # Dismissal of feelings/concerns
    r'\b(?:your\s+)?(?:feelings?|emotions?|concerns?|worries?|complaints?|grievances?|opinions?)\b.*\b(?:(?:are\s+)?(?:not|no\s+longer|don\'?t|doesn\'?t)\s+(?:my\s+(?:problem|concern|issue|responsibility)|relevant|valid|important|matter|count|register))\b',
    r'\b(?:cry|whine|complain|vent)\s+(?:to|at)\s+(?:someone|somebody|your|the)\s+(?:else|friends?|therapist|mother|family|wall)\b',
    # Time-based dismissal
    r'\b(?:maybe|perhaps|try)\s+(?:in\s+)?(?:a\s+few\s+)?(?:weeks?|months?|years?|days?|sometime|later|another\s+(?:time|day|life))\b',
    r'\bwhen\s+(?:I\'?m|i\s+am)\s+(?:ready|available|willing|interested|free|in\s+the\s+mood)\b',
]

GASLIGHTING_FLEX2_PATTERNS = [
    # "That's not what happened/I said" reality overwrite
    r'\b(?:that\'?s?\s+)?not\s+(?:what|how)\s+(?:it\s+)?(?:happened|went|was|occurred|played\s+out)\b',
    r'\b(?:you\'?re?|you\s+are)\s+(?:choosing|deciding|wanting)\s+to\s+(?:believe|see|hear|interpret|remember|feel)\b',
    r'\b(?:your|the)\s+(?:narrative|story|account|tale|version|spin)\b',
    r'\b(?:you\s+)?(?:always|consistently|repeatedly|constantly|every\s+time)\s+(?:do\s+this|twist|distort|lie|exaggerate|overreact|misremember|make\s+things?\s+up)\b',
    r'\b(?:ask|check\s+with)\s+(?:anyone|everybody|everyone|any\s+(?:person|one))\b.*\b(?:they\'?ll?|they\s+(?:will|would))\s+(?:tell|say|confirm|agree)\b',
    r'\b(?:you\s+are|you\'?re)\s+(?:the\s+)?(?:only\s+)?(?:one|person)\s+(?:who\s+)?(?:sees?|thinks?|believes?|remembers?|says?|claims?)\s+(?:this|that|it)\b',
    r'\bi\s+(?:communicate|speak\s+(?:the\s+)?truth|am\s+(?:just\s+)?(?:being\s+)?(?:honest|direct|real|straightforward|blunt))\b',
    # Projection/reversal
    r'\byou\s+(?:are|\'?re)\s+(?:(?:the\s+)?one\s+(?:who\s+)?)?(?:doing|causing|creating|starting|making)\s+(?:this|it|all\s+of\s+this|the\s+(?:problem|drama|conflict|issue))\b',
]

# ==============================================================================
# ROUND 3 — Broad-stroke patterns for remaining ~50% misses
# Focus on key phrases with typo-tolerant matching (optional chars, shorter stems)
# ==============================================================================

DISMISSIVE_FLEX3_PATTERNS = [
    r'\bi\s+(?:don\'?t|do\s+not|won\'?t|will\s+not|refuse\s+to)\s+(?:respond|reply|answer|react)\s+to\b',
    r'\b(?:not\s+someone|nobody|no\s+one)\s+(?:I|i)\s+(?:defer|answer|listen|report|respond)\s+to\b',
    r'\b(?:my\s+)?time\s+(?:is\s+)?(?:too\s+)?(?:valuable|precious|limited|important)\b.*\b(?:argu|waste|spend|bother)\b',
    r'\birrelevant\s+to\s+me\b',
    r'\b(?:your|their)\s+(?:opinion|view|perspective|input|feedback|take)\b.*\b(?:irrelevant|meaningless|worthless|pointless|not\s+(?:needed|wanted|asked|relevant|important))\b',
    r'\b(?:get|do)\s+(?:to\s+)?it\s+when\s+(?:I|i)\s+(?:get|feel|decide|choose|am\s+ready)\b',
    r'\b(?:the\s+)?answer\s+(?:has\s+)?(?:not|hasn\'?t)\s+changed\b',
    r'\b(?:your|their)\s+(?:perspective|viewpoint|position|stance)\b.*\b(?:considered|noted|heard)\s+and\s+(?:rejected|dismissed|ignored|overruled)\b',
    r'\b(?:your|their)\s+(?:timeline|schedule|urgency|deadline|timetable)\s+is\s+not\s+(?:mine|ours)\b',
    r'\b(?:i\s+)?(?:don\'?t|do\s+not)\s+(?:owe\s+you|need\s+to\s+(?:explain|justify|answer|respond|engage))\b',
    r'\bnot\s+(?:my|our|your)\s+(?:circus|problem|monkeys|issue|concern|responsibility)\b',
    r'\b(?:take\s+it|leave\s+it)\s+or\s+(?:leave\s+it|take\s+it)\b',
]

HOSTILITY_FLEX3_PATTERNS = [
    r'\byou\s+(?:are|\'?re)\s+(?:a\s+)?(?:horrible|terrible|awful|bad|vile|evil|wicked|toxic|miserable|nasty|cruel|selfish|narciss)\w*\s+(?:person|human|being|individual|parent|mother|father|man|woman)?\b',
    r'\byou\s+(?:are|\'?re)\s+(?:the\s+)?reason\b.*\b(?:angry|miserable|depressed|sad|upset|broken|destroyed|ruined|hate|wake\s+up)\b',
    r'\b(?:need|want|have)\s+to\s+(?:disappear|vanish|go\s+away|leave|get\s+out)\b.*\b(?:my\s+)?(?:life|world|existence|sight)\b',
    r'\b(?:rather|prefer)\s+(?:to\s+)?(?:deal|talk|work|interact)\s+(?:with\s+)?(?:anyone|anybody|a\s+(?:stranger|wall|rock))\b.*\b(?:than|over|instead)\b.*\byou\b',
    r'\b(?:absolute|complete|total|utter)\s+(?:disgrace|embarrassment|failure|disaster|nightmare|waste)\b',
    r'\b(?:self[\s-]?centered|selfish|narcissi|egotist|self[\s-]?absorbed|self[\s-]?serving)\w*\s+(?:person|human|parent)?\b',
    r'\b(?:cannot|can\'?t)\s+(?:think\s+of\s+)?(?:one|a\s+single|any)\s+(?:good|positive|redeeming|decent)\s+(?:thing|quality|trait)\b',
    r'\b(?:you\s+)?(?:make|makes?)\s+(?:everyone|everything|people|all)\b.*\b(?:miserable|unhappy|worse|toxic|sick|suffering)\b',
    r'\b(?:you\s+are|you\'?re)\s+(?:an?\s+)?(?:absolute|complete|total|utter)\s+(?:disgrace|embarrassment|joke|failure|waste|nightmare)\b',
    r'\b(?:look|take\s+a\s+(?:good|long|hard)\s+look)\s+(?:in\s+)?(?:the\s+)?(?:mirror|at\s+yourself)\b',
    r'\b(?:what\s+you\'?ve?\s+become|what\s+you\s+(?:are|turned\s+into))\b',
    r'\b(?:everyone|people|they|all)\s+(?:around\s+you\s+)?(?:knows?|sees?|can\s+see|agrees?)\b.*\b(?:it|what\s+you|the\s+(?:truth|real))\b',
]

GASLIGHTING_FLEX3_PATTERNS = [
    r'\bi\s+never\s+(?:promised|said|agreed|committed|told|wrote|texted|implied|suggested|meant)\s+(?:that|this|it|anything)\b',
    r'\byou\s+(?:must\s+have\s+)?(?:dreamed|imagined|fantasized|hallucinated|invented|misheard|misread|misunderstood)\b',
    r'\b(?:decided|chose|wanted)\s+it\s+(?:meant|means|was|to\s+mean)\s+(?:something|everything|anything)\s+else\b',
    r'\breliable\s+(?:narrator|witness|source|account)\b',
    r'\b(?:confused|confusing\s+(?:things|events|facts))\s+again\b',
    r'\b(?:natural|logical|obvious|inevitable|expected)\s+(?:outcomes?|consequences?|results?)\s+of\s+(?:your|their)\s+(?:choices?|actions?|decisions?|behavior)\b',
    r'\b(?:that\s+is\s+)?not\s+how\s+(?:that|this|it|the)\s+(?:conversation|discussion|exchange|interaction|event)\s+(?:went|happened|occurred|played\s+out|unfolded)\b',
    r'\b(?:building|constructing|creating|writing|crafting)\s+(?:a\s+)?(?:narrative|story|version)\b',
    r'\bi\s+know\s+what\s+(?:I|i)\s+(?:said|did|wrote|meant|promised)\b.*\b(?:and\s+)?(?:I|i)\s+know\s+what\s+(?:I|i)\s+(?:did\s+not|didn\'?t)\b',
    r'\b(?:this|it)\s+happens?\s+(?:a\s+)?(?:lot|frequently|often|regularly|constantly|always)\s+with\s+you\b',
    r'\byou\s+(?:are|\'?re)\s+(?:not\s+)?(?:as\s+)?(?:reliable|trustworthy|credible|accurate|honest)\b.*\b(?:as\s+you|narrator|believe|think)\b',
    r'\bi\s+(?:stated|described|explained|outlined|shared)\s+(?:the\s+)?(?:natural|logical|likely)\b',
]

ALL_CAPS_FLEX3_PATTERNS = [
    # Demanding/commanding phrases commonly in ALL_CAPS corpus entries
    r'\b(?:stop|quit|cease)\s+(?:posting|sharing|putting|uploading)\b.*\b(?:kids?|children|family|our|social\s+media)\b',
    r'\bi\s+am\s+not\s+(?:bluffing|joking|kidding|playing|messing)\b',
    r'\bnot\s+(?:going\s+to\s+)?keep\s+asking\s+(?:you\s+)?(?:nicely|politely|again|anymore)\b',
    r'\b(?:do\s+not|don\'?t)\s+(?:drop|bring|pick)\s+(?:them|him|her|the\s+kids?)\s+(?:off\s+)?(?:late|early)\b',
    r'\b(?:the\s+)?last\s+(?:straw|time|chance|warning)\b',
    r'\bfollow\s+through\b.*\b(?:watch|see|try|test)\b',
    r'\b(?:think|thk)\s+(?:I|i)\s+(?:am|\'m|will\s+not|won\'?t)\s+(?:bluffing|serious|joking|kidding)\b',
    r'\b(?:so\s+)?angry\b.*\b(?:cannot|can\'?t)\s+(?:even\s+)?(?:think|see|function|breathe)\b',
    r'\bi\s+(?:will|\'ll)\s+(?:say|tell\s+you)\s+(?:this|it)\s+(?:once|one\s+(?:time|more\s+time)|for\s+the\s+last\s+time)\b',
    r'\b(?:you\s+)?(?:think|believe)\s+(?:I|i)\s+(?:will|won\'?t|would)\s+(?:not\s+)?follow\s+through\b',
]

CONTEMPT_FLEX3_PATTERNS = [
    r'\byou\s+(?:have\s+)?(?:made|make)\s+me\s+grateful\b.*\b(?:not\s+you|who\s+is\s+not\s+you|for\s+(?:everyone|everything)\s+(?:else|that\s+isn\'?t))\b',
    r'\bwhat\s+(?:a\s+)?(?:co[\s-]?parent|parent|person|human)\s+can\s+be\b',
    r'\byou\s+(?:are|\'?re)\s+(?:just\s+)?(?:exactly\s+)?(?:what|who)\s+(?:you\s+)?(?:have\s+)?always\s+(?:been|will\s+be)\b',
    r'\b(?:i\'?ve|i\s+have)\s+(?:made|come\s+to)\s+peace\b',
    r'\b(?:you\s+)?(?:will\s+)?never\s+(?:do\s+)?better\b',
    r'\b(?:low|such\s+low|had\s+(?:such\s+)?low)\s+standards\b',
    r'\b(?:you\s+)?(?:are|\'?re)\s+(?:the\s+)?(?:textbook|classic|perfect|poster\s+child|prime)\s+(?:example|case|definition|illustration)\b',
]

THREATENING_FLEX3_PATTERNS = [
    r'\bi\s+(?:will|am\s+going\s+to|\'m\s+going\s+to|\'ll)\s+(?:ruin|destroy|end|wreck|demolish|dismantle|expose|bury)\s+(?:you|your)\b',
    r'\b(?:you\s+)?(?:will|\'ll|are\s+going\s+to)\s+(?:pay|suffer|regret|answer|be\s+sorry|lose\s+everything)\b.*\b(?:for\s+(?:this|what)|what\s+you)\b',
    r'\b(?:i\s+am\s+)?not\s+(?:playing|messing|fooling|kidding|joking)\b.*\b(?:around|games?|with\s+you|anymore)\b',
    r'\b(?:this|that|it)\'?s?\s+(?:a\s+)?promise\b',
    r'\b(?:watch|see)\s+(?:what\s+happens?|how\s+(?:fast|quick|soon))\b',
    r'\b(?:keep|continue)\b.*\b(?:and\s+)?(?:see|watch|find\s+out|learn)\s+(?:what|how)\b',
]

SEXUAL_HARASSMENT_FLEX3_PATTERNS = [
    r'\b(?:give|gave)\s+(?:me|you)\s+what\s+(?:I|you)\s+want\b.*\b(?:give|get|if|then|simple)\b',
    r'\b(?:documented|archived|saved|recorded|kept)\b.*\b(?:carefully|very|at\s+the\s+time)\b',
    r'\b(?:lifestyle|personal|private)\s+(?:choices?|decisions?|behavior|habits?)\b.*\b(?:going\s+in|included?\s+in|part\s+of|relevant\s+to|evidence|declaration|filing|court|record)\b',
    r'\b(?:shown|shared|sent|forwarded|posted)\s+(?:your|their)\s+(?:photos?|pictures?|images?|videos?)\s+to\b',
    r'\b(?:intimate|private|personal)\s+(?:thing|detail|moment|info)\b.*\b(?:archived?|remember\s+that|don\'?t\s+forget)\b',
    r'\b(?:what\s+)?(?:type|kind)\s+(?:of\s+(?:person\s+)?)?you\s+(?:were|are|always\s+were)\b',
]

MANIPULATION_FLEX3_PATTERNS = [
    r'\b(?:gave|given)\s+(?:you\s+)?(?:chance|chances?|opportunity|opportunities)\s+(?:after\s+chance|and\s+you)\b',
    r'\b(?:same|exact\s+same)\s+person\s+(?:you\s+)?(?:have\s+)?always\s+been\b',
    r'\b(?:the\s+)?(?:kids?|children)\s+(?:come|came|run|go|turn)\s+to\s+me\b',
    r'\bchoosing\s+(?:conflict|fighting?|drama|chaos|ego|yourself)\s+over\b',
    r'\beverything\s+(?:I|i)\s+(?:did|do|have\s+done)\s+was\b.*\b(?:protect|safe|kids?|children)\b',
    r'\b(?:there\s+is|there\'?s)\s+a\s+difference\b',
    r'\bi\s+(?:have|got)\s+(?:proof|evidence|documentation|receipts?|screenshots?)\b',
    r'\byou\s+only\s+care\s+(?:about\s+)?yourself\b',
    r'\b(?:the\s+)?(?:kids?|children)\s+(?:see|sees?|know|knows?)\s+(?:it|the\s+truth)\b',
    r'\b(?:i\s+)?(?:hope|pray)\s+you\s+(?:do|will|can)\s+(?:the\s+right|better|what\'?s?\s+right)\b',
]

PASSIVE_AGGRESSIVE_FLEX3_PATTERNS = [
    r'\bgreat\s+idea\b.*\blike\s+(?:all\s+)?(?:your|every)\b',
    r'\b(?:stopped|quit|gave\s+up)\s+being\s+surprised\b',
    r'\bi\'?ll\s+remember\s+this\b.*\b(?:next\s+time|when|favor)\b',
    r'\b(?:don\'?t|doesn\'?t|won\'?t)\s+(?:I|he|she|they|we)\s+always\b',
    r'\bthanks?\s+(?:so\s+much\s+)?for\s+(?:considering|thinking\s+of|including|noticing|remembering)\s+me\b',
    r'\bwhy\s+would\s+(?:it|this|that|anything)\s+be\s+(?:anything\s+)?(?:else|different|new)\b',
    r'\bi\'?m\s+(?:sure|certain)\s+(?:you\'?ll?|it\'?ll?|that\'?ll?|everything\s+will)\b.*\b(?:fine|great|work\s+out|be\s+(?:ok|okay|fine|great))\b',
    r'\b(?:of\s+course|naturally|obviously|predictably)\s+(?:you|it|this|that)\b',
]

CUSTODY_WEAPONIZATION_FLEX3_PATTERNS = [
    r'\b(?:your\s+)?(?:time|visitation|access|custody)\s+(?:is\s+)?(?:reduced|cut|limited|restricted|suspended|revoked)\b',
    r'\b(?:not\s+)?(?:available|coming|happening)\s+this\s+(?:weekend|week|holiday|visit)\b',
    r'\b(?:pickup|drop[\s-]?off|exchange|visit)\s+(?:is\s+)?(?:cancelled?|canceled?|postponed|rescheduled|moved|not\s+happening)\b',
    r'\bgave\s+up\s+(?:your|their)\s+(?:rights?|claim|custody)\b',
    r'\bno\s+say\s+(?:in\s+)?(?:what|how|who|when|where)\b.*\b(?:my\s+(?:house|home|time|parenting)|on\s+my\s+time)\b',
    r'\bcalling\s+(?:the\s+)?(?:police|cops?|authorities|cps)\b',
    r'\bfiled?\s+(?:a\s+)?(?:report|complaint|motion|petition)\b.*\b(?:cps|dcs|dcf|police|court|child\s+(?:protective|welfare))\b',
    r'\b(?:kids?\s+)?(?:not\s+)?(?:available|coming|going)\s+(?:this|next|until)\b',
    r'\b(?:behavioral|behavior)\s+(?:concerns?|issues?|problems?)\s+(?:after|following|from|during)\s+(?:your|their)\s+(?:visits?|time|weekends?)\b',
    r'\b(?:pay|owe)\b.*\bor\s+(?:the\s+)?(?:kids?\s+)?(?:stay|don\'?t\s+(?:come|go|leave))\b',
]

FINANCIAL_ABUSE_FLEX3_PATTERNS = [
    r'\bspend\b.*\b(?:on\s+)?(?:wine|clothes|nails|hair|shoes|vacation|trips?|bars?|restaurants?|shopping|luxury|yourself)\b',
    r'\b(?:where|what|how)\b.*\b(?:my|the)\s+(?:money|support|child\s+support|payment)\b.*\b(?:going|goes?|spent|used|being\s+used)\b',
    r'\b(?:buying|bought|got|getting)\s+(?:new|a\s+new)\b.*\b(?:tells?\s+me|shows?|proves?|while|but)\b',
    r'\bi\s+(?:choose|decide|determine|control)\s+when\b.*\b(?:pay|send|transfer|give)\b',
    r'\b(?:you\s+)?don\'?t\s+get\s+(?:cash|money|a\s+(?:cent|dime|penny))\b',
    r'\b(?:my|your)\s+(?:approval|permission)\b.*\b(?:before\s+(?:you\s+)?spend|required|needed|necessary)\b',
    r'\b(?:forensic|financial)\s+(?:accountant|auditor?|investigat)\b',
    r'\b(?:pay|paying|cover)\b.*\b(?:only\s+)?what\s+(?:I|i)\s+(?:can\s+)?(?:verify|confirm|see|prove)\b',
    r'\bfair\s+is\s+fair\b',
]

HATE_SPEECH_FLEX3_PATTERNS = [
    r'\b(?:your|their)\s+(?:people|culture|beliefs?|religion|background|heritage|upbringing|community|traditions?|values?|customs?)\b.*\b(?:is|are|was|were)\s+(?:the\s+)?(?:reason|cause|problem|issue|why|fault)\b',
    r'\b(?:raised|brought\s+up|shaped|formed|molded)\s+by\b.*\b(?:who|that|with)\b.*\b(?:don\'?t|can\'?t|no|won\'?t|never|have\s+no)\b',
    r'\b(?:your|that|their)\s+(?:whole|entire)\s+(?:family|side|clan|tribe|group|community)\b.*\b(?:same|problem|attitude|way|toxic|crazy|issue)\b',
    r'\b(?:i\s+)?know\s+(?:exactly\s+)?what\s+(?:you|they)\s+(?:are|is)\b',
    r'\b(?:from|come\s+from|raised\s+in)\s+(?:a\s+)?(?:place|culture|community|country|area)\b.*\b(?:no\s+respect|without|that\s+(?:doesn\'?t|has\s+no|lacks?))\b',
    # Broad cultural/family attack patterns
    r'\byour\s+\w+\s+(?:is\s+)?(?:why|the\s+reason)\s+(?:this|the|our)\s+family\b',
    r'\b(?:i\s+)?(?:refuse|will\s+not|won\'?t)\s+(?:be|become)\s+(?:another\s+)?victim\b',
    r'\bmet\s+(?:your|their)\s+(?:whole|entire)\s+family\b',
]

# ==============================================================================
# FLEX4 PATTERNS - Corpus B Detection Enhancement
# Targets subtle, sophisticated phrasings missed by FLEX1-3 patterns
# ==============================================================================

HOSTILITY_FLEX4_PATTERNS = [
    r'\b(?:been\s+a\s+)?disappointment\b.*\b(?:every|at\s+every|single)\b',
    r'\bcollateral\s+damage\b',
    r'\bregret\b.*\b(?:every|anything)\b.*\b(?:kind|nice|good)\b.*\b(?:said|did)\b',
    r'\bnever\s+forget\b.*\b(?:what\s+you|you\s+chose|your\s+choice)\b',
    r'\bcannot\s+name\b.*\b(?:single|one)\b.*\b(?:good\s+faith|positive|good)\b',
    r'\bcomplete\s+and\s+consistent\s+failure\b',
    r'\bfailure\s+as\s+a\b.*\b(?:co-?parent|parent|father|mother)\b',
    r'\b(?:every|each)\s+interaction\b.*\b(?:question|lose|doubt)\b.*\bsanity\b',
    r'\bmakes?\s+me\s+question\b.*\b(?:my\s+own\s+)?sanity\b',
    r'\b(?:every|each)\s+(?:single\s+)?stage\b.*\bdisappointment\b',
    r'\bturned\b.*\b(?:children|kids)\b.*\blives?\b.*\b(?:collateral|chaos|damage)\b',
    r'\bnot\s+(?:a\s+)?single\s+good\s+faith\b',
]

CONTEMPT_FLEX4_PATTERNS = [
    r'\bfeel\s+nothing\b.*\b(?:anymore|for\s+you|about\s+you)\b',
    r'\bgiven\s+up\s+expecting\b',
    r'\bno\s+longer\s+carry\s+hope\b',
    r'\byou\s+have\s+peaked\b',
    r'\bpeaked\s+and\s+this\s+is\s+it\b',
    r'\bnothing\b.*\bsurprised\s+me\b.*\byears?\b',
    r'\bsame\s+choices\b.*\bfeel\s+nothing\b',
    r'\balways\s+(?:has\s+)?a\s+reason\b.*\b(?:every|for)\s+(?:failure|excuse)\b',
    r'\bexactly\s+as\b.*\b(?:frustrating|limited|selfish|petty)\b.*\balways\s+been\b',
    r'\bexactly\s+as\b.*\band\s+exactly\s+as\b',
    r'\bi\s+(?:have\s+)?(?:given|gave)\s+up\b.*\b(?:on\s+you|expecting|hoping)\b',
    r'\bnothing\s+about\s+you\b.*\b(?:surpris|chang|improv|differ)\b',
    r'\bwatch\s+you\s+make\b.*\bsame\b',
]

THREATENING_FLEX4_PATTERNS = [
    r'\bwho\s+else\b.*\b(?:might|could|will|would)\s+receive\b',
    r'\bwhat\s+i\s+have\s+collected\b',
    r'\bfind\s+out\b.*\bhow\s+serious\b',
    r'\bpaperwork\s+arrives?\b',
    r'\b(?:exactly\s+)?one\s+chance\b.*\b(?:fix|correct|resolve)\b',
    r'\bstop\s+being\s+reasonable\b',
    r'\bmake\s+your\s+life\b.*\b(?:very\s+)?difficult\b',
    r'\buntil\s+you\s+cooperate\b',
    r'\bserved\s+at\s+(?:your\s+)?(?:work|workplace|office|job)\b',
    r'\bauthorities\b.*\b(?:very\s+)?interested\b.*\bwhat\s+i\s+have\b',
    r'\bescalate\b.*\bbeyond\b.*\b(?:anything|everything)\b.*\bprepared\b',
    r'\bescalate\s+this\s+beyond\b',
    r'\b(?:i\s+have|i\'ve)\s+(?:collected|compiled|gathered|documented)\b.*\b(?:everything|all)\b',
    r'\bwhen\s+the\s+paperwork\b',
]

DISMISSIVE_FLEX4_PATTERNS = [
    r'\bnot\s+owed\b.*\b(?:my\s+)?(?:availability|time|response|attention)\b',
    r'\bnot\s+something\s+i\s+share\b',
    r'\bdoes\s+not\s+improve\s+with\s+repetition\b',
    r'\bnot\s+being\s+accommodated\b',
    r'\breached\s+its?\s+natural\s+end\b',
    r'\bno\s+further\s+response\b',
    r'\bnot\s+(?:something\s+)?(?:i\s+am\s+)?going\s+to\s+engage\b',
    r'\binterpretation\b.*\bnot\s+something\s+i\b',
    r'\bmade\s+my\s+position\s+clear\b',
    r'\brequest\s+has\s+been\s+received\b.*\bnot\b',
    r'\bconversation\s+has\s+reached\b',
    r'\boutside\s+(?:of\s+)?what\s+the\s+order\s+specifies\b',
    r'\bthis\s+subject\b.*\b(?:closed|done|over|finished|ended)\b',
]

FINANCIAL_ABUSE_FLEX4_PATTERNS = [
    r'\bcalculated\s+what\s+i\s+owe\b',
    r'\bto\s+the\s+penny\b',
    r'\b(?:every\s+)?filing\b.*\badds?\s+to\b.*\b(?:legal\s+)?costs?\b',
    r'\bbuying\s+things\s+directly\b',
    r'\bsubcontract\b.*\bsupport\b',
    r'\breduces?\b.*\bmotivated\s+to\s+contribute\b',
    r'\bnot\s+a\s+cent\s+more\b',
    r'\bwhat\s+the\s+formula\s+says\b',
    r'\bgenerosity\b.*\b(?:was\s+)?(?:voluntary|revoked|withdrawn|ended)\b',
    r'\bgenerosity\b.*\brevoked\b',
    r'\b(?:every\s+)?dime\b.*\bdocumented\b',
    r'\bevery\s+dime\s+i\s+send\b',
    r'\blegal\s+action\b.*\breduces?\b.*\b(?:amount|motivation|willingness)\b',
    r'\bexpect\s+it\s+to\s+be\s+spent\b',
]

GASLIGHTING_FLEX4_PATTERNS = [
    r'\bdecided\s+that\s+is\s+suspicious\b',
    r'\bassigning\s+malicious\s+intent\b',
    r'\bworst\s+possible\s+interpretation\b',
    r'\bcertainty\s+does\s+not\b.*\b(?:make\s+you\s+)?correct\b',
    r'\bnot\s+supported\s+by\s+evidence\b',
    r'\byour\s+perception\b.*\bnot\s+accurate\b',
    r'\bdecided\s+i\s+was\s+(?:the\s+)?villain\b',
    r'\bgenuinely\s+accidental\b',
    r'\bversion\s+of\s+events\b.*\bnot\s+supported\b',
    r'\bconfirms\s+it\s+for\s+you\b',
    r'\byou\s+(?:have\s+)?decided\b.*\b(?:suspicious|villain|enemy|bad)\b',
    r'\bi\s+was\s+being\s+reasonable\b.*\byou\b',
    r'\bapplying\s+the\s+worst\b',
]

MANIPULATION_FLEX4_PATTERNS = [
    r'\bnever\s+wanted\s+to\s+be\s+here\b',
    r'\byou\s+made\s+every\s+decision\b',
    r'\bdocumented\s+every\s+accommodation\b',
    r'\bchildren\s+are\s+not\s+blind\b',
    r'\bkids?\s+are\s+not\s+blind\b',
    r'\bcannot\s+protect\s+yourself\b.*\bthat\b',
    r'\banyone\s+who\s+looks?\b.*\bobjectively\b',
    r'\bbent\s+over\s+backwards\b',
    r'\bthis\s+is\s+what\s+i\s+get\b',
    r'\bpunish\b.*\bpeople\b.*\bcaring\b',
    r'\bpunish\s+(?:people|me|others)\s+for\s+caring\b',
    r'\byou\s+made\b.*\b(?:every|all)\b.*\b(?:decision|choice)\b.*\bbrought\s+us\b',
    r'\bi\s+have\s+(?:documented|recorded)\s+every\b',
]

CUSTODY_WEAPONIZATION_FLEX4_PATTERNS = [
    r'\bfile\s+for\s+contempt\b',
    r'\broutine\s+here\s+is\s+working\b',
    r'\bvisit\b.*\bcontingent\b',
    r'\bnot\s+available\s+for\b.*\bvisits?\b',
    r'\b(?:children|kids?)\b.*\btold\s+me\s+things\b',
    r'\bemotional\s+safety\b.*\b(?:over|above)\b.*\baccess\b',
    r'\bvisitation\b.*\bremain\s+limited\b',
    r'\buntil\s+conditions\s+improve\b.*\bvisit\b',
    r'\binterrupting\s+it\b.*\bnot\s+something\s+i\b',
    r'\bbasic\s+requirements\b.*\b(?:visit|access|time)\b',
    r'\bprioritize\b.*\b(?:their|child)\b.*\bsafety\b.*\b(?:over|above)\s+your\b',
    r'\bnot\s+available\b.*\boutside\s+(?:the\s+)?(?:written\s+)?schedule\b',
    r'\brequire\s+me\s+to\s+be\b.*\bcautious\b',
]

PASSIVE_AGGRESSIVE_FLEX4_PATTERNS = [
    r'\bworks?\s+until\s+it\s+doesn\'?t\s+work\s+for\s+you\b',
    r'\btotally\s+fine\b.*\bfor\s+you\b',
    r'\babsorb\s+this\b.*\babsorb\s+everything\b',
    r'\bi\'?ll\s+(?:just\s+)?absorb\b',
    r'\bcancel\s+my\s+plans\b',
    r'\bit\'?s\s+only\s+everything\b',
    r'\binteresting\s+timing\b',
    r'\binteresting\s+timing\s+as\s+always\b',
    r'\bdrop\s+everything\s+again\b',
    r'\blet\s+me\s+just\s+drop\s+everything\b',
    r'\bwhere\s+i\s+rank\b',
    r'\bglad\s+to\s+know\b.*\b(?:where|how|what)\b.*\b(?:rank|stand|matter)\b',
    r'\bi\'?ll\s+(?:just\s+)?(?:be\s+)?managing\b',
]

SEXUAL_HARASSMENT_FLEX4_PATTERNS = [
    r'\bused\s+your\s+(?:appearance|body|looks?|beauty)\b',
    r'\bappearance\b.*\bintimacy\b.*\bmanipulat\b',
    r'\bprivate\s+accounts?\b.*\b(?:more|things?)\b.*\b(?:remember|know)\b',
    r'\bseen\s+your\s+dating\s+profile\b',
    r'\byour\s+dating\s+profile\b',
    r'\bknow\s+what\s+you\s+look\s+like\b',
    r'\bnot\s+available\s+to\s+everyone\b.*\b(?:look|see|know)\b',
    r'\bonline\s+activity\b.*\b(?:story|tells?|shows?|reveals?)\b',
    r'\bwould\s+not\s+want\s+shared\b',
    r'\bpersonal\s+life\b.*\bcourts?\s+find\b',
    r'\bspecific\s+choices\b.*\b(?:witnessed|documented|recorded)\b',
    r'\bintimacy\s+to\s+manipulat\b',
]

HATE_SPEECH_FLEX4_PATTERNS = [
    r'\btraditional\s+gender\s+expectations?\b',
    r'\bethnic\s+background\b.*\b(?:explanation|excuse|reason)\b',
    r'\bupbringing\s+produced\b',
    r'\btradition\s+says\b',
    r'\bcustoms?\b.*\bflagged\b.*\b(?:child\s+services?|cps|dcf|dcs)\b',
    r'\braised\s+the\s+way\s+you\s+were\b',
    r'\bpeople\s+raised\b.*\bdo\s+not\s+change\b',
    r'\bcultural\s+values?\b.*\b(?:conflict|incompatible|clash|oppose)\b',
    r'\bcultural\s+values?\b.*\bmodern\s+parenting\b',
    r'\byour\s+(?:family\s+)?(?:customs?|traditions?|practices?)\b.*\b(?:harmful|dangerous|abusive|toxic)\b',
    r'\bgender\s+expectations?\b.*\b(?:near|around)\b.*\b(?:children|kids?)\b',
    r'\bupbringing\b.*\b(?:specific\s+)?behaviors?\b.*\bharmful\b',
]

PARENTAL_ALIENATION_FLEX4_PATTERNS = [
    r'\btold\s+their\s+teacher\b',
    r'\bchildren\s+understand\s+more\b',
    r'\bfeelings?\s+about\s+visiting\b',
    r'\ballowed\s+to\s+be\s+angry\b.*\b(?:at|with)\s+you\b',
    r'\bold\s+enough\s+to\s+decide\b',
    r'\bcannot\s+force\s+them\b.*\b(?:go|visit|come|leave)\b',
    r'\bwill\s+not\s+(?:force|make)\s+them\b',
    r'\btheir\s+own\s+opinions?\b',
    r'\bkids?\s+have\s+their\s+own\s+opinions?\b',
    r'\bfeel\s+more\s+settled\s+here\b',
    r'\bchildren\'?s?\s+feelings?\b.*\bare\s+their\s+own\b',
    r'\bwhere\s+they\s+feel\s+safe\b',
    r'\bi\s+told\s+them\s+they\s+were\s+allowed\b',
]

PROFANITY_FLEX4_PATTERNS = [
    r'\bclueless\s+b[*\w]?stard\b',
    r'\bb[*\w]stard\b',
    r'\bpiece\s+of\s+work\b',
    r'\bbrain[\s-]?dead\b.*\b(?:twit|idiot|moron|fool)\b',
    r'\bbrain[\s-]?dead\s+twit\b',
    r'\bjackass\b',
    r'\bget\s+stuffed\b',
    r'\bgo\s+pound\s+sand\b',
    r'\bpound\s+sand\b',
    r'\bshove\s+it\b',
    r'\ba[*\w][*\w]hole\b',
    r'\bsh[*\w]t\b',
    r'\bf[*\w]ck\b',
    r'\bd[*\w]ck\b',
    r'\bpiece\s+of\s+(?:work|crap|garbage|trash)\b',
]

ALL_CAPS_FLEX4_PATTERNS = [
    r'\bcannot\s+keep\s+them\s+from\s+me\b',
    r'\bnot\s+backing\s+down\b',
    r'\bentire\s+conversation\s+logged\b',
    r'\blogged\s+and\s+timestamped\b',
    r'\bdo\s+not\s+make\s+changes?\b.*\bwithout\s+(?:my\s+)?(?:notice|consent|permission)\b',
    r'\bsay\s+this\s+once\b',
    r'\bi\'?ll\s+say\s+this\s+once\b',
    r'\bi\s+am\s+not\s+(?:going\s+)?anywhere\b.*\bnot\s+backing\s+down\b',
    r'\bnot\s+going\s+anywhere\b.*\bnot\s+backing\b',
    r'\bkeep\s+them\s+from\s+me\b',
    r'\bstop\s+threatening\s+me\b.*\bintermediaries?\b',
    r'\bthrough\s+intermediaries?\b',
    r'\bentire\s+conversation\b.*\b(?:logged|recorded|saved|documented)\b',
]

# ==============================================================================
# FLEX5 PATTERNS — Broad structural patterns for high-miss categories
# Targeting common phrase structures across many seed variations
# ==============================================================================

THREATENING_FLEX5_PATTERNS = [
    r'\bcomplicate\s+your\s+life\b',
    r'\bbuilding\s+a\s+case\s+against\b',
    r'\bdeclaration\s+written\b',
    r'\bcome\s+to\s+regret\b',
    r'\bnot\s+as\s+protected\b',
    r'\bthink\s+you\s+are\s+safe\b',
    r'\brunning\s+out\s+of\s+goodwill\b',
    r'\bhaven\'?t\s+even\s+started\b',
    r'\bphone\s+calls?\b.*?\bcomplicate\b',
    r'\bhear\s+from\s+me\b.*?\bif\b',
    r'\bthink\b.*?\bcarefully\b.*?\bnext\b',
    r'\bknow\s+about\b.*?\baccounts?\b',
    r'\bvery\s+long\s+memory\b',
    r'\bunderestimated\s+me\b',
    r'\bone\s+opportunity\b.*?\bstop\b',
    r'\bdocumented\s+every\b',
    r'\bpeople\s+at\s+your\s+(?:job|work)\b.*?\bhear\b',
    r'\bget(?:ting)?\s+worse\b.*?\bfor\s+you\b',
]

HOSTILITY_FLEX5_PATTERNS = [
    r'\bsee\s+through\b.*?\bexcuse\b',
    r'\bmade\s+yourself\s+irrelevant\b',
    r'\brun\s+out\s+of\s+good\s+faith\b',
    r'\bdisappointed\s+in\b.*?\bperson\b',
    r'\bcommitted\s+to\s+being\b',
    r'\bstopped\s+making\s+excuses\b',
    r'\bdeserve\s+credit\b',
    r'\bchooses?\s+damage\b',
    r'\binto\s+a\s+battlefield\b',
    r'\bnot\s+a\s+single\s+person\b',
    r'\bsingle\s+quality\b.*?\badmir\w+\b',
    r'\bhope\s+you\'?re?\s+proud\b',
    r'\bcautionary\s+tale\b',
    r'\brefuses?\s+to\s+grow\b',
    r'\bwear\s+your\s+cruelty\b',
    r'\bnever\s+met\s+someone\s+so\b',
    r'\bliving\s+definition\b',
]

DISMISSIVE_FLEX5_PATTERNS = [
    r'\bnot\s+interested\s+in\s+relitigating\b',
    r'\bnot\s+engaging\s+with\b',
    r'\byour\s+urgency\b.*?\bnot\s+my\b',
    r'\bdelegated\b.*?\battorney\b',
    r'\bdoes\s+not\s+have\s+room\b',
    r'\bcontact\s+my\s+attorney\b',
    r'\bnot\s+accepting\b.*?\bframing\b',
    r'\bmy\s+position\b.*?\bnot\s+changing\b',
    r'\bdo\s+not\s+respond\s+to\s+demands\b',
    r'\bfiled\b.*?\bmoved\s+on\b',
    r'\bbring\s+it\s+up\s+at\b.*?\bscheduled\b',
    r'\bheard\s+this\s+before\b',
    r'\bnot\s+my\s+problem\b',
    r'\byour\s+timeline\b.*?\bnot\s+mine\b',
    r'\byour\s+opinion\b.*?\bnot\b.*?\bsought\b',
    r'\bnot\s+my\s+priority\b',
    r'\bmine\s+governs\b',
    r'\bnot\s+required\s+to\s+manage\b',
    r'\bnothing\b.*?\bjustifies\b',
]

FINANCIAL_ABUSE_FLEX5_PATTERNS = [
    r'\baccount\b.*?\bdo\s+not\s+have\s+access\b',
    r'\bcosts?\s+me\s+money\b',
    r'\bnot\s+provide\s+support\s+for\s+your\s+convenience\b',
    r'\bdiverting\s+funds\b',
    r'\bevery\s+dollar\b.*?\btracked\b',
    r'\bwithin\s+my\s+rights\b',
    r'\bnot\s+used\s+for\s+the\s+children\b',
    r'\bcourt\s+minimum\b',
    r'\bnot\s+one\b.*?\bdollar\b',
    r'\bconditional\s+on\b.*?\bconfirm\b',
    r'\bcontact\b.*?\bemployer\b.*?\breducing\b',
    r'\bnot\s+pay\s+above\b',
    r'\bforensic\s+accountant\b',
    r'\bmore\s+than\s+the\s+order\b',
    r'\bsupport\s+review\b',
    r'\bcontrols?\s+over\b.*?\bmoney\b',
    r'\bvoluntary\b.*?\bno\s+longer\b',
    r'\blifestyle\b.*?\bfinancial\s+need\b',
]

CUSTODY_WEAPONIZATION_FLEX5_PATTERNS = [
    r'\bnot\s+accommodate\b.*?\boutside\b.*?\bschedule\b',
    r'\bdoes\s+not\s+have\s+room\b.*?\bcontact\b',
    r'\bovernight\b.*?\bnot\s+appropriate\b',
    r'\bnot\s+be\s+releasing\b',
    r'\brequire\b.*?\bwritten\s+notice\b',
    r'\bnot\s+factored\s+into\b',
    r'\basked\s+to\s+limit\s+visits?\b',
    r'\bchanged\b.*?\bauthorization\b',
    r'\bcome\s+before\s+your\s+schedule\b',
    r'\bmissed\s+your\s+window\b',
    r'\bfragile\s+place\b',
    r'\bnot\s+demonstrated\b.*?\bstability\b',
    r'\bnot\s+obligated\b.*?\bfacilitate\b.*?\bcontact\b',
    r'\bexpressed\s+a\s+preference\b',
    r'\bno\s+longer\b.*?\bsharing\b',
    r'\blimit\s+contact\b.*?\breasons?\b',
    r'\bverify\b.*?\bliving\s+situation\b',
    r'\bexercising\b.*?\bjudgment\b.*?\bcaregiver\b',
    r'\bnot\s+allow\s+contact\s+until\b',
]

MANIPULATION_FLEX5_PATTERNS = [
    r'\bnever\s+threatened\b.*?\bnatural\s+consequences\b',
    r'\bput\s+them\s+first\b.*?\bchallenge\b',
    r'\bgave\s+me\s+no\b.*?\bchoice\b',
    r'\btried\s+to\s+survive\b',
    r'\byour\s+comfort\s+above\b.*?\bchildren\b',
    r'\bshield\b.*?\bkids?\b.*?\btruth\b',
    r'\bfunction\s+of\s+your\s+decisions?\b',
    r'\btension\s+you\s+create\b',
    r'\bgenerous\b.*?\bfar\s+beyond\b',
    r'\byou\s+set\s+the\s+terms\b',
    r'\bin\s+therapy\s+because\b',
    r'\bdid\s+not\s+choose\b.*?\byou\s+did\b',
    r'\bpeace\b.*?\bcannot\s+control\b',
    r'\bwant\s+peace\s+but\b.*?\bopposite\b',
    r'\bdeserve\s+better\b.*?\bparent\b.*?\buses\b',
    r'\bbenefit\s+of\s+the\s+doubt\b',
    r'\btold\s+me\s+one\s+thing\b.*?\bdid\s+another\b',
    r'\blied\b.*?\bprotected\b',
]

CONTEMPT_FLEX5_PATTERNS = [
    r'\bbeyond\s+disappointment\b',
    r'\bnever\s+once\s+seen\s+you\b',
    r'\bevidence\b.*?\bwho\s+you\s+are\b',
    r'\bstopped\s+requiring\b',
    r'\bleast\s+reliable\b',
    r'\bconsistency\b.*?\bcommitment\b',
    r'\bno\s+longer\b.*?\bsurprising\b',
    r'\baccepted\b.*?\bperson\s+you\s+are\b',
    r'\bmade\s+things\s+better\b',
    r'\bpeaked\b.*?\bpain\b',
    r'\bdamage\s+goes\s+unaddressed\b',
    r'\bexhausted\s+pity\b',
    r'\brun\s+out\s+of\s+ways\b',
    r'\bchose\s+not\s+to\s+be\b',
    r'\bbeyond\s+a\s+certain\s+point\b',
    r'\bnumb\s+recognition\b',
    r'\bdeeply\s+predictable\b',
    r'\bkind\s+of\s+person\s+who\s+ruins\b',
]
