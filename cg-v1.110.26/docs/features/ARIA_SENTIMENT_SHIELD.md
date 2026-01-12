# ARIA Sentiment Shield - Developer Guide

**ARIA (AI-Powered Relationship Intelligence Assistant)** is the message sentiment analysis system that helps prevent conflict in co-parenting communication. This guide explains how ARIA works and how to extend its detection capabilities.

---

## Quick Reference

| File | Purpose |
|------|---------|
| `backend/app/services/aria.py` | Core ARIA service - patterns, analysis, suggestions |
| `backend/app/api/v1/endpoints/messages.py` | API endpoints for message analysis |
| `backend/app/models/message.py` | Message and MessageFlag database models |
| `backend/app/schemas/message.py` | Pydantic schemas for API requests/responses |
| `frontend/components/messages/aria-intervention.tsx` | User intervention UI component |

---

## Architecture Overview

ARIA uses a **3-tier analysis system**:

```
┌─────────────────────────────────────────────────────────────────┐
│                     MESSAGE INPUT                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TIER 1: REGEX PATTERN MATCHING (Fast, ~1ms)                    │
│  ─────────────────────────────────────────────────────────────  │
│  • Pre-compiled regex patterns for common toxic phrases         │
│  • Categories: profanity, insults, hostility, threats, etc.     │
│  • Always runs first for immediate detection                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TIER 2: CLAUDE AI ANALYSIS (Optional, ~500-1000ms)             │
│  ─────────────────────────────────────────────────────────────  │
│  • Deep nuanced detection using Claude Sonnet                   │
│  • Context-aware (considers children's names, case history)     │
│  • Detects subtle manipulation, passive-aggression, sarcasm     │
│  • Enabled via case/family_file.aria_provider = "claude"        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TIER 3: OPENAI FALLBACK (Optional, ~500-1000ms)                │
│  ─────────────────────────────────────────────────────────────  │
│  • Alternative AI provider using GPT-4                          │
│  • Used if Claude fails or for redundancy                       │
│  • Enabled via case/family_file.aria_provider = "openai"        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SENTIMENT ANALYSIS RESULT                     │
│  ─────────────────────────────────────────────────────────────  │
│  • toxicity_score: 0.0 - 1.0                                    │
│  • toxicity_level: none, low, medium, high, severe              │
│  • categories: [profanity, hostility, threatening, ...]         │
│  • triggers: ["specific phrases detected"]                      │
│  • suggestion: "BIFF-method alternative message"                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Toxicity Categories

ARIA detects these categories (defined in `ToxicityCategory` enum):

| Category | Description | Weight | Example |
|----------|-------------|--------|---------|
| `PROFANITY` | Swear words, vulgar language | 0.4 | "What the f*ck" |
| `INSULT` | Name-calling, personal attacks | 0.5 | "You're so stupid" |
| `HOSTILITY` | Aggressive, hateful language | 0.6 | "I hate you", "shut up" |
| `BLAME` | Assigning fault, accusations | 0.4 | "This is your fault" |
| `DISMISSIVE` | Refusing engagement | 0.3 | "Not my problem" |
| `PASSIVE_AGGRESSIVE` | Indirect hostility | 0.3 | "Fine. Whatever." |
| `THREATENING` | Physical or custody threats | 0.95 | "You'll never see the kids" |
| `MANIPULATION` | Bad faith tactics | 0.5 | Guilt-tripping, gaslighting |
| `SARCASM` | Mocking tone | 0.3 | "Oh, great job as usual" |
| `ALL_CAPS` | Shouting | 0.2 | "STOP IGNORING ME" |

---

## Adding New Patterns

### Step 1: Identify the Pattern Category

Determine which category your new pattern belongs to. If it's a new type of toxic communication, you may need to add a new category.

### Step 2: Add Regex Patterns

Open `backend/app/services/aria.py` and add patterns to the appropriate list:

```python
# Location: backend/app/services/aria.py, lines 70-133

class ARIAService:
    """ARIA service with pattern definitions"""

    # Add sexual/vulgar insults to PROFANITY_PATTERNS
    PROFANITY_PATTERNS = [
        r'\bfuck\w*\b', r'\bshit\w*\b', r'\bass\b', r'\basshole\b',
        r'\bbitch\w*\b', r'\bdamn\w*\b', r'\bhell\b', r'\bcrap\b',
        r'\bpiss\w*\b', r'\bbastard\b', r'\bwtf\b', r'\bstfu\b',
        # ADD NEW PATTERNS HERE:
        r'\bhoe\b', r'\bwhore\b', r'\bslut\b',  # Sexual slurs
        r'\bsuck\s+(my\s+)?dick\b',  # Sexual vulgarity
        r'\bdick\b', r'\bcock\b',  # Vulgar terms
    ]

    # Add combination insults to INSULT_PATTERNS
    INSULT_PATTERNS = [
        r'\bstupid\b', r'\bidiot\b', r'\bdumb\b', r'\bmoron\b',
        r'\bpathetic\b', r'\bloser\b', r'\bworthless\b', r'\buseless\b',
        # ADD NEW PATTERNS HERE:
        r'\bdumb\s*(ass|as)?\s*hoe\b',  # "dumb as hoe" / "dumb ass hoe"
        r'\bdummy\b',  # Insult term
        r'\bstupid\s+ass\b',  # Compound insult
    ]

    # Add custody weaponization to THREATENING_PATTERNS
    THREATENING_PATTERNS = [
        # ... existing patterns ...
        # ADD CUSTODY WEAPONIZATION PATTERNS:
        r'\bwon\'?t\s+see\s+(your\s+)?kids?\b',  # "won't see your kid"
        r'\bnot\s+gonna\s+pay.*won\'?t\s+see\b',  # Conditional custody threats
        r'\bif\s+you\s+(don\'?t|won\'?t).*kids?\b',  # Conditional threats
        r'\bno\s+money\s+no\s+kids?\b',  # Payment-custody linkage
    ]
```

### Step 3: Add Context-Aware Phrase Replacements

For LOW/MEDIUM toxicity, ARIA tries to salvage the message by replacing phrases:

```python
# Location: backend/app/services/aria.py, lines 164-203

SUGGESTIONS = {
    # Existing replacements...

    # ADD NEW REPLACEMENTS:
    r'\bdumb\s*(ass|as)?\s*hoe\b': "difficult to understand",
    r'\bsuck\s+(my\s+)?dick\b': "I am very frustrated",
    r'\bdummy\b': "mistaken",
    r'\bstupid\s+ass\b': "unreasonable",

    # Custody weaponization -> Child-focused language
    r'\bwon\'?t\s+see\s+(your\s+)?kids?\b': "we need to discuss the schedule",
    r'\bnot\s+gonna\s+pay.*won\'?t\s+see\b': "payment and parenting time are separate issues",
}
```

### Step 4: Add Template Responses (HIGH/SEVERE)

For highly toxic messages, ARIA suggests complete rewrites using the BIFF method:

```python
# Location: backend/app/services/aria.py, lines 136-161

TEMPLATES = {
    ToxicityCategory.THREATENING: [
        "I am feeling very upset right now. I need to take a break from this conversation.",
        "This conversation is becoming unproductive. Let's pause and continue later.",
        # ADD NEW TEMPLATES:
        "I understand emotions are high. Let's focus on what's best for the children.",
    ],
    ToxicityCategory.HOSTILITY: [
        "I'm finding it hard to discuss this productively. Can we focus on logistics?",
        # ADD NEW TEMPLATES:
        "I need us to communicate respectfully. What specifically do you need?",
    ],
    # Add new category templates...
}
```

---

## Adding New Categories

If you need to detect a completely new type of toxic communication:

### Step 1: Add to ToxicityCategory Enum

```python
# Location: backend/app/services/aria.py, lines 34-45

class ToxicityCategory(Enum):
    """Categories of toxic communication patterns"""
    PROFANITY = "profanity"
    INSULT = "insult"
    # ... existing categories ...

    # ADD NEW CATEGORY:
    CUSTODY_WEAPONIZATION = "custody_weaponization"  # Using kids as leverage
    FINANCIAL_COERCION = "financial_coercion"  # Money-based threats
```

### Step 2: Add Pattern List

```python
# Location: backend/app/services/aria.py (add after line 133)

CUSTODY_WEAPONIZATION_PATTERNS = [
    r'\bwon\'?t\s+see\s+(the\s+)?kids?\s+(if|unless)\b',
    r'\bno\s+(money|payment).*no\s+kids?\b',
    r'\bpay\s+(up|me).*or\s+else\b',
    r'\bkids?\s+(are|will\s+be)\s+mine\b',
]
```

### Step 3: Add to Pattern Compilation

```python
# Location: backend/app/services/aria.py, lines 209-233

def _compile_patterns(self) -> Dict[ToxicityCategory, List[re.Pattern]]:
    """Pre-compile regex patterns for performance"""
    return {
        # ... existing categories ...

        # ADD NEW CATEGORY:
        ToxicityCategory.CUSTODY_WEAPONIZATION: [
            re.compile(p, re.IGNORECASE) for p in self.CUSTODY_WEAPONIZATION_PATTERNS
        ],
    }
```

### Step 4: Add Category Weight

```python
# Location: backend/app/services/aria.py, lines 316-327

weights = {
    # ... existing weights ...

    # ADD NEW WEIGHT:
    ToxicityCategory.CUSTODY_WEAPONIZATION: 0.7,  # High severity
    ToxicityCategory.FINANCIAL_COERCION: 0.6,
}
```

### Step 5: Add Explanation Text

```python
# Location: backend/app/services/aria.py, lines 358-369

explanations = {
    # ... existing explanations ...

    # ADD NEW EXPLANATION:
    ToxicityCategory.CUSTODY_WEAPONIZATION: "uses children as leverage (courts view this extremely negatively)",
    ToxicityCategory.FINANCIAL_COERCION: "links financial matters to parenting time (legally inappropriate)",
}
```

---

## Example: Detecting Specific Phrases

Here's how to add detection for the specific phrases you mentioned:

### "You a dumb as hoe"

```python
# In INSULT_PATTERNS:
r'\b(you\s+)?(a\s+)?dumb\s*(ass|as)?\s*(hoe|ho)\b',

# In PROFANITY_PATTERNS:
r'\bhoe\b', r'\bho\b',
```

### "You can suck my dick dummy"

```python
# In PROFANITY_PATTERNS:
r'\bsuck\s+(my\s+)?dick\b',
r'\bdick\b',

# In INSULT_PATTERNS:
r'\bdummy\b',
```

### "Since you not gonna pay you wont see your kid"

```python
# In THREATENING_PATTERNS (custody weaponization):
r'\b(since|if|because)\s+you\s+(not|won\'?t|don\'?t)\s+(gonna\s+)?pay.*won\'?t\s+see\s+(your\s+)?kids?\b',
r'\bno\s+(pay|money|payment).*no\s+kids?\b',

# Alternative: Create new CUSTODY_WEAPONIZATION_PATTERNS list
CUSTODY_WEAPONIZATION_PATTERNS = [
    r'\b(if|since|because)\s+you\s+(don\'?t|won\'?t|not\s+gonna)\s+pay.*see\s+(the\s+)?kids?\b',
    r'\bpay.*or\s+(you\s+)?(won\'?t|can\'?t)\s+see\b',
]
```

---

## Complete Implementation Example

Here's a complete example adding detection for custody weaponization:

```python
# backend/app/services/aria.py

# 1. Add to ToxicityCategory enum (line ~45)
class ToxicityCategory(Enum):
    # ... existing ...
    CUSTODY_WEAPONIZATION = "custody_weaponization"

# 2. Add pattern list (after line ~133)
CUSTODY_WEAPONIZATION_PATTERNS = [
    # Payment-custody linking
    r'\b(if|since|because)\s+you\s+(don\'?t|won\'?t|not\s+gonna)\s+pay.*see\s+(the\s+)?kids?\b',
    r'\bno\s+(money|payment|pay).*no\s+kids?\b',
    r'\bpay\s+(up|me).*or\s+(you\s+)?(won\'?t|can\'?t)\s+see\b',

    # General custody threats
    r'\byou\'?ll?\s+never\s+see\s+(the\s+)?kids?\s+again\b',
    r'\bkids?\s+(are|will\s+be|belong)\s+(all\s+)?mine\b',
    r'\btaking\s+(the\s+)?kids?\s+(away|from\s+you)\b',
]

# 3. Add to _compile_patterns() (line ~230)
ToxicityCategory.CUSTODY_WEAPONIZATION: [
    re.compile(p, re.IGNORECASE) for p in self.CUSTODY_WEAPONIZATION_PATTERNS
],

# 4. Add weight (line ~327)
ToxicityCategory.CUSTODY_WEAPONIZATION: 0.8,  # Very high - courts hate this

# 5. Add explanation (line ~369)
ToxicityCategory.CUSTODY_WEAPONIZATION: "uses children as leverage in disputes (courts view this as parental alienation behavior)",

# 6. Add template (line ~140)
ToxicityCategory.CUSTODY_WEAPONIZATION: [
    "I understand you're frustrated about finances. However, parenting time and financial matters are legally separate. Let's discuss each issue on its own merits.",
    "Money and parenting time need to be discussed separately. What specific schedule concern do you have?",
],

# 7. Add suggestions for LOW/MEDIUM (line ~200)
r'\bno\s+(money|pay).*no\s+kids?\b': "let's discuss finances and scheduling separately",
r'\bwon\'?t\s+see\s+(the\s+)?kids?\b': "we need to discuss the parenting schedule",
```

---

## Testing Your Changes

### Unit Test

```python
# backend/tests/integration/test_aria_messaging.py

import pytest
from app.services.aria import aria_service, ToxicityCategory

def test_custody_weaponization_detection():
    """Test detection of custody weaponization phrases"""

    # Test case 1: Payment-custody linking
    result = aria_service.analyze_message(
        "Since you not gonna pay you wont see your kid"
    )
    assert result.is_flagged
    assert ToxicityCategory.CUSTODY_WEAPONIZATION in result.categories
    assert result.toxicity_score >= 0.7

    # Test case 2: Direct custody threat
    result = aria_service.analyze_message(
        "You'll never see the kids again"
    )
    assert result.is_flagged
    assert ToxicityCategory.THREATENING in result.categories

    # Test case 3: Vulgar insults
    result = aria_service.analyze_message(
        "You a dumb as hoe"
    )
    assert result.is_flagged
    assert ToxicityCategory.INSULT in result.categories or ToxicityCategory.PROFANITY in result.categories

    # Test case 4: Sexual vulgarity
    result = aria_service.analyze_message(
        "You can suck my dick dummy"
    )
    assert result.is_flagged
    assert result.toxicity_level.value in ["high", "severe"]
```

### Manual API Test

```bash
# Test via API endpoint
curl -X POST "http://localhost:8000/api/v1/messages/analyze" \
  -H "Authorization: Bearer $TOKEN" \
  -G --data-urlencode "content=Since you not gonna pay you wont see your kid" \
  --data-urlencode "family_file_id=YOUR_FAMILY_FILE_ID"
```

---

## API Reference

### Analyze Message (Preview)

```
POST /api/v1/messages/analyze
```

**Query Parameters:**
- `content` (required): Message text to analyze
- `family_file_id` (optional): Family file context
- `case_id` (optional): Court case context (legacy)

**Response:**
```json
{
  "toxicity_level": "orange",
  "toxicity_score": 0.65,
  "categories": ["hostility", "custody_weaponization"],
  "triggers": ["won't see your kid", "not gonna pay"],
  "explanation": "Court Context Warning: This message uses children as leverage...",
  "suggestion": "I understand you're frustrated about finances. Let's discuss finances and scheduling separately.",
  "is_flagged": true
}
```

### Send Message

```
POST /api/v1/messages/
```

**Body:**
```json
{
  "family_file_id": "uuid",
  "recipient_id": "uuid",
  "content": "Message text",
  "message_type": "text"
}
```

### Handle Intervention Response

```
POST /api/v1/messages/{message_id}/intervention
```

**Body:**
```json
{
  "action": "accepted|modified|rejected|cancelled",
  "final_message": "Optional edited message",
  "notes": "Optional notes"
}
```

---

## Toxicity Score Thresholds

| Score Range | Level | UI Color | Can Send? |
|-------------|-------|----------|-----------|
| 0.0 - 0.19 | green | Green | Yes |
| 0.2 - 0.49 | yellow | Amber | Yes (with suggestion) |
| 0.5 - 0.79 | orange | Orange | Yes (warning) |
| 0.8 - 1.0 | red | Red | **Blocked** |

---

## AI Provider Configuration

ARIA's analysis provider is configured per case/family file:

```python
# Family File settings
family_file.aria_enabled = True  # Enable/disable ARIA
family_file.aria_provider = "regex"  # Options: "regex", "claude", "openai"

# Court Case settings (legacy)
case.aria_enabled = True
case.aria_provider = "claude"
```

| Provider | Speed | Cost | Detection Quality |
|----------|-------|------|-------------------|
| `regex` | ~1ms | Free | Good for explicit content |
| `claude` | ~500ms | API cost | Excellent for nuanced content |
| `openai` | ~500ms | API cost | Good fallback |

---

## Best Practices

1. **Start with regex patterns** - They're fast and catch most explicit content
2. **Use word boundaries** (`\b`) - Prevents partial matches (e.g., `\bhate\b` won't match "whatever")
3. **Test with variations** - "dont", "don't", "do not" are all different
4. **Consider context** - "I'll kill you" in a video game discussion vs. custody dispute
5. **Weight appropriately** - Threats should weight higher than mild dismissiveness
6. **Provide helpful suggestions** - Don't just flag, help the user communicate better

---

## Files to Update Checklist

When adding new detection patterns:

- [ ] `backend/app/services/aria.py` - Add patterns, weights, explanations, templates
- [ ] `backend/tests/integration/test_aria_messaging.py` - Add unit tests
- [ ] This documentation - Update examples if significant changes

When adding new categories:

- [ ] All above, plus:
- [ ] `backend/app/services/aria.py` - Add to `ToxicityCategory` enum
- [ ] `frontend/components/messages/aria-intervention.tsx` - Add category display if needed

---

## Debugging

Enable debug logging in ARIA:

```python
# In aria.py analyze_message method, add:
import logging
logger = logging.getLogger(__name__)

def analyze_message(self, message: str, context: Optional[List[str]] = None):
    logger.debug(f"Analyzing: {message[:50]}...")
    # ... analysis code ...
    logger.debug(f"Result: score={result.toxicity_score}, categories={result.categories}")
    return result
```

---

## Related Documentation

- [API Reference](../api/API_REFERENCE.md) - Full API documentation
- [Message Models](../database/MODELS.md#messages) - Database schema
- [Court Export](./COURT_EXPORT.md) - How ARIA data is used in court reports
