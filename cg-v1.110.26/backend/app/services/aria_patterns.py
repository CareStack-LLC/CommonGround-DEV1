"""
ARIA Detection Patterns - Production Grade
Expanded vocabulary for court-ready toxicity detection.
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
# ==============================================================================
# INTENT: CUSTODY WEAPONIZATION (High Risk)
# ==============================================================================
CUSTODY_WEAPONIZATION_PATTERNS = [
    # Gatekeeping - Allow for fillers (damn, fscking, my) between key phrases
    r'\b(won\'?t|never)\s+(?:[\w\'\*]+\s+){0,3}see\s+(?:[\w\'\*]+\s+){0,3}kids?\b', 
    r'\bblock(ing)?\s+(?:[\w\'\*]+\s+){0,3}number\b', 
    r'\btaking\s+(?:[\w\'\*]+\s+){0,3}kids?\s+(?:[\w\'\*]+\s+){0,3}away\b', 
    r'\brun\s+away\s+with\s+(?:[\w\'\*]+\s+){0,3}(them|kids?)\b',

    # Parental Alienation
    r'\btell\s+(?:[\w\'\*]+\s+){0,3}them\s+(?:[\w\'\*]+\s+){0,3}truth\b', 
    r'\bthey\s+hate\s+(yo)?u\b', 
    r'\bnot\s+(?:[\w\'\*]+\s+){0,3}real\s*(dad|mom)\b', 
    r'\bthey\s+don\'?t\s+want\s+to\s+come\b',

    # Legal Threats
    r'\bfull\s+custody\b', r'\bsole\s+custody\b', 
    r'\bunfit\s+parent\b', r'\bterminate\s+(?:[\w\'\*]+\s+){0,3}rights\b', 
    r'\bcall\s+(?:[\w\'\*]+\s+){0,3}(cps|dcf|dcfs)\b',
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
]

