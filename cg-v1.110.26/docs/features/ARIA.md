# ARIA - AI Relationship Intelligence Assistant

**Last Updated:** January 10, 2026
**Version:** 1.0.0
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Sentiment Analysis](#sentiment-analysis)
5. [Message Rewriting](#message-rewriting)
6. [Agreement Builder](#agreement-builder)
7. [Paralegal Intake](#paralegal-intake)
8. [QuickAccord Builder](#quickaccord-builder)
9. [Configuration](#configuration)
10. [API Integration](#api-integration)
11. [Fallback Mechanisms](#fallback-mechanisms)
12. [Analytics & Metrics](#analytics--metrics)

---

## Overview

ARIA (AI Relationship Intelligence Assistant) is the core AI component of CommonGround, designed to facilitate healthy communication between co-parents and assist in creating custody agreements. ARIA serves multiple critical functions:

- **Sentiment Analysis**: Detects and flags toxic communication patterns
- **Message Rewriting**: Suggests constructive alternatives to problematic messages
- **Agreement Building**: Guides parents through conversational agreement creation
- **Paralegal Intake**: Conducts legal intake interviews for court forms
- **QuickAccord**: Creates situational agreements through natural conversation
- **Good Faith Tracking**: Monitors communication quality over time

### Design Philosophy

ARIA operates on the principle that all messages in CommonGround are potential **court documentation**. This context drives stricter standards for communication and emphasizes the importance of maintaining professional, child-focused communication.

### Key Principles

1. **Child-First**: Every interaction prioritizes child welfare
2. **Neutral**: Never takes sides between parents
3. **Court-Ready**: All communication meets legal documentation standards
4. **Empathetic**: Acknowledges the difficulty of co-parenting situations
5. **Evidence-Based**: Uses the BIFF method (Brief, Informative, Friendly, Firm)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ARIA Service Layer                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │   ARIAService    │  │AriaParalegalSvc  │  │AriaAgreementSvc  │       │
│  │                  │  │                  │  │                  │       │
│  │ • analyze_message│  │ • start_session  │  │ • send_message   │       │
│  │ • analyze_with_ai│  │ • send_message   │  │ • generate_summary│      │
│  │ • get_metrics    │  │ • generate_summary│  │ • extract_data   │       │
│  │ • rewrite_suggest│  │ • extract_form   │  │ • finalize       │       │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘       │
│           │                     │                     │                  │
│           └─────────────────────┼─────────────────────┘                  │
│                                 │                                        │
│                    ┌────────────▼────────────┐                           │
│                    │    AI Provider Layer    │                           │
│                    ├─────────────────────────┤                           │
│                    │  ┌─────────┐ ┌───────┐  │                           │
│                    │  │ Claude  │ │OpenAI │  │                           │
│                    │  │(Primary)│ │(Backup)│  │                           │
│                    │  └─────────┘ └───────┘  │                           │
│                    └─────────────────────────┘                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Database Layer                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  messages        message_flags    intake_sessions    agreement_conversations│
│  └─content       └─toxicity_score └─messages[]       └─messages[]          │
│  └─is_flagged    └─categories     └─extracted_data   └─summary             │
│  └─original      └─suggestion     └─aria_summary     └─extracted_data      │
└─────────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
mvp/backend/app/services/
├── aria.py                    # Core sentiment analysis
├── aria_paralegal.py          # Legal intake service
├── aria_agreement.py          # Agreement builder service
├── aria_extraction_schema.py  # Data extraction schemas
└── aria_quick_accord.py       # QuickAccord builder
```

---

## Core Components

### 1. ARIAService (aria.py)

The primary service for real-time message analysis and toxicity detection.

**Location:** `mvp/backend/app/services/aria.py`

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `analyze_message()` | Fast regex-based toxicity detection |
| `analyze_with_ai()` | Deep Claude-powered analysis |
| `analyze_with_openai()` | OpenAI fallback analysis |
| `calculate_good_faith_metrics()` | User communication metrics |
| `get_conversation_health()` | Case-wide health analysis |
| `get_intervention_message()` | Format intervention for frontend |

### 2. AriaParalegalService (aria_paralegal.py)

Conducts conversational legal intake interviews for California family court forms.

**Location:** `mvp/backend/app/services/aria_paralegal.py`

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `start_session()` | Initialize intake conversation |
| `send_message()` | Process parent response |
| `generate_summary()` | Create plain English summary |
| `extract_form_data()` | Extract structured form data |
| `complete_intake()` | Finalize intake session |

### 3. AriaAgreementService (aria_agreement.py)

Guides parents through conversational custody agreement creation.

**Location:** `mvp/backend/app/services/aria_agreement.py`

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `send_message()` | Process conversation message |
| `generate_summary()` | Create agreement summary |
| `extract_structured_data()` | Convert to structured sections |
| `finalize_agreement()` | Write data to agreement sections |

### 4. AriaQuickAccordService (aria_quick_accord.py)

Creates lightweight situational agreements through natural conversation.

**Location:** `mvp/backend/app/services/aria_quick_accord.py`

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `start_conversation()` | Begin QuickAccord creation |
| `send_message()` | Process user input |
| `create_from_conversation()` | Generate QuickAccord |

---

## Sentiment Analysis

### Two-Tier Analysis System

ARIA uses a two-tier approach for sentiment analysis:

1. **Tier 1: Fast Regex Analysis** - Immediate pattern matching for obvious cases
2. **Tier 2: AI Deep Analysis** - Nuanced detection using Claude or OpenAI

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Message   │────▶│  Regex Analysis  │────▶│  Score < 0.3?    │
└─────────────┘     │  (Milliseconds)  │     │  Pass through    │
                    └──────────────────┘     └────────┬─────────┘
                                                      │ No
                                                      ▼
                                             ┌──────────────────┐
                                             │   AI Analysis    │
                                             │  (Deep Context)  │
                                             └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │   Intervention   │
                                             │   or Block       │
                                             └──────────────────┘
```

### Toxicity Categories

| Category | Description | Weight |
|----------|-------------|--------|
| `THREATENING` | Physical threats, violence | 0.95 |
| `HOSTILITY` | Hate speech, contempt | 0.60 |
| `INSULT` | Name-calling, personal attacks | 0.50 |
| `MANIPULATION` | Bad faith communication | 0.50 |
| `PROFANITY` | Swearing, crude language | 0.40 |
| `BLAME` | Fault assignment, guilt-tripping | 0.40 |
| `DISMISSIVE` | Non-collaborative responses | 0.30 |
| `PASSIVE_AGGRESSIVE` | Indirect hostility | 0.30 |
| `SARCASM` | Mocking, ironic attacks | 0.30 |
| `ALL_CAPS` | Shouting (>50% caps words) | 0.20 |

### Toxicity Levels

| Level | Score Range | Action |
|-------|-------------|--------|
| `NONE` | 0.0 | Pass through |
| `LOW` | 0.01 - 0.29 | Subtle reminder |
| `MEDIUM` | 0.30 - 0.59 | Suggest rewrite |
| `HIGH` | 0.60 - 0.84 | Strong warning |
| `SEVERE` | 0.85 - 1.00 | Block if threatening |

### Pattern Definitions

**Profanity Patterns:**
```python
PROFANITY_PATTERNS = [
    r'\bfuck\w*\b', r'\bshit\w*\b', r'\bass\b', r'\basshole\b',
    r'\bbitch\w*\b', r'\bdamn\w*\b', r'\bhell\b', r'\bcrap\b',
    r'\bpiss\w*\b', r'\bbastard\b', r'\bwtf\b', r'\bstfu\b',
]
```

**Hostility Patterns:**
```python
HOSTILITY_PATTERNS = [
    r'\bshut\s*up\b', r'\bleave\s+me\s+alone\b', r'\bget\s+out\b',
    r'\bi\s+hate\s+you\b', r'\bhate\s+you\b', r'\bcan\'?t\s+stand\s+you\b',
    r'\byou\s+never\b', r'\byou\s+always\b', r'\bevery\s+time\s+you\b',
    r'\byour\s+fault\b', r'\bblame\s+you\b', r"\bdon'?t\s+care\b",
]
```

**Threatening Patterns (CRITICAL):**
```python
THREATENING_PATTERNS = [
    # Legal threats
    r'\bi\'?ll?\s+(get|take)\s+(my\s+)?lawyer\b',
    r'\bsee\s+you\s+in\s+court\b',
    r'\btake\s+you\s+to\s+court\b',

    # Physical violence
    r'\bi\'?ll?\s+kill\s+you\b', r'\bkill\s+you\b',
    r'\bi\'?ll?\s+hurt\s+you\b', r'\bhurt\s+you\b',
    r'\bi\'?ll?\s+beat\s+you\b', r'\bbeat\s+you\s+up\b',

    # Custody threats
    r'\byou\'?ll?\s+never\s+see\s+(the\s+)?kids?\b',
    r'\btake\s+(away\s+)?the\s+kids?\b',
    r'\bi\'?ll?\s+get\s+full\s+custody\b',
]
```

---

## Message Rewriting

### The BIFF Method

ARIA uses the **BIFF Method** for suggestions:
- **B**rief: Keep it short
- **I**nformative: Focus on facts
- **F**riendly: Maintain pleasant tone
- **F**irm: Be clear and decisive

### Rewriting Strategies

**Strategy 1: Template Responses (High/Severe Toxicity)**

For highly toxic messages, ARIA suggests complete replacement templates:

```python
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
}
```

**Strategy 2: Intelligent Phrase Replacement (Low/Medium Toxicity)**

For moderately toxic messages, ARIA replaces specific phrases:

```python
SUGGESTIONS = {
    # Profanity -> De-escalation
    r'\bfuck\s+off\b': "I am not willing to continue this conversation right now",
    r'\bfuck\s+you\b': "I am angry",

    # Hate -> I-statements
    r'\bi\s+hate\s+you\b': "I am feeling very hostile towards you right now",
    r'\bcan\'?t\s+stand\s+you\b': "I find interacting with you challenging",

    # Absolutes -> Observations
    r'\byou\s+never\b': "It seems that often",
    r'\byou\s+always\b': "I feel that frequently",

    # Dismissive -> Engagement
    r'\bwhatever\b': "I hear you",
    r'\bnot\s+my\s+problem\b': "this is an issue we share",

    # Blame -> Shared Problem Solving
    r'\byour\s+fault\b': "the result of this situation",
}
```

### Example Transformations

| Original Message | ARIA Suggestion |
|-----------------|-----------------|
| "You NEVER follow the schedule. I'm tired of your games!" | "I've noticed some schedule changes lately. Can we discuss how to improve consistency? The kids thrive on routine." |
| "I guess if you actually cared about [child], you'd remember..." | "Could you please confirm you received the reminder about [event]? Thanks." |
| "Fuck you stupid bitch" | "I am feeling frustrated. I would like to pause this conversation and return to it later when I can be more productive." |
| "You always screw everything up!" | "I feel that frequently things don't go as planned. Let's discuss how to improve." |

---

## Agreement Builder

### Conversational Agreement System

The ARIA Agreement Builder uses natural conversation to create custody agreements:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Agreement Builder Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ Conversation│───▶│   Summary   │───▶│  Data Extraction    │  │
│  │  (Natural)  │    │ (Readable)  │    │  (Structured JSON)  │  │
│  └─────────────┘    └─────────────┘    └──────────┬──────────┘  │
│                                                    │             │
│                                                    ▼             │
│                                        ┌─────────────────────┐   │
│                                        │  Agreement Sections │   │
│                                        │    (18 Sections)    │   │
│                                        └─────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### System Prompt

```python
"""You are ARIA, an AI assistant helping parents create custody agreements.

Your role is to have a natural, empathetic conversation to understand
their custody arrangement preferences.

1. **Understand casual language**: Parents may use informal speech, slang,
   or emotional language. Extract the core intent.
   - "I ain't even tripping" = "I'm flexible/okay with this"
   - "$200 every other week" = "$400 per month child support"
   - "she can handle all the doctor stuff" = Mother makes medical decisions

2. **Focus on the right topics**: Legal/physical custody, parenting schedule,
   holidays, exchanges, transportation, support, medical, education, etc.

   **DO NOT ASK ABOUT**: Names, addresses, phone numbers, emails

3. **Ask specific, practical questions**:
   - "What time works for Friday pickups?"
   - "Where would be a good spot to meet for exchanges?"
   - "How much child support were you thinking?"

4. **Parse intelligently**:
   - Convert money to monthly amounts (bi-weekly × 2, weekly × 4.33)
   - Format times properly (4pm → 4:00 PM)
   - Map casual decisions to formal options (she handles it → Mother Decides)
"""
```

### Extraction Schema

The extraction schema maps 18 agreement sections:

| Section | Key Fields |
|---------|------------|
| 1. Parent Info | full_name, role, address, phone, email |
| 2. Other Parent Info | full_name, address, phone, email |
| 3. Children Info | full_name, date_of_birth, school, special_needs |
| 4. Legal Custody | education_decisions, medical_decisions, religious_decisions |
| 5. Physical Custody | arrangement_type, percentage_split, primary_parent |
| 6. Parenting Schedule | weekly_pattern, mother_days, father_days |
| 7. Holiday Schedule | thanksgiving, christmas, spring_break, summer |
| 8. Exchange Logistics | location, day, time, who_transports |
| 9. Transportation | cost_arrangement, who_pays, mileage |
| 10. Child Support | amount, payer, due_date, payment_method |
| 11. Medical/Healthcare | insurance_provider, routine_appointments, emergency |
| 12. Education | school_choice, records_access, conferences |
| 13. Parent Communication | primary_method, response_time, schedule_changes |
| 14. Child Communication | phone_calls, video_calls, call_frequency |
| 15. Travel | domestic_notice, international_consent, vacation_time |
| 16. Relocation | notice_days, distance_trigger, process |
| 17. Dispute Resolution | first_step, mediation_required |
| 18. Other Provisions | right_of_first_refusal, new_partners, discipline |

---

## Paralegal Intake

### Legal Intake System

ARIA Paralegal conducts conversational interviews for California family court forms:
- **FL-300**: Request for Order (initiating petition)
- **FL-311**: Child Custody and Visitation Application
- **FL-320**: Responsive Declaration (responding to petition)

### Conversation Flow

1. **Warm Introduction** - Explain role and limitations
2. **Children's Information** - Names, ages, living situation
3. **Current Arrangement** - Who do children live with now?
4. **Requested Changes** - What changes are being requested?
5. **Weekly Schedule** - Weekdays, weekends preferences
6. **Holiday/Vacation** - Holiday and vacation preferences
7. **Exchange Logistics** - Where, when, transportation
8. **Communication** - Parent communication preferences
9. **Safety Concerns** - Handle sensitively, don't probe
10. **Special Considerations** - Special needs, activities
11. **Summary & Confirmation** - Review all information

### Key Safety Rules

```python
"""
YOU MUST NEVER:
- Give legal advice of any kind
- Recommend what the parent should request
- Interpret the law or predict outcomes
- Suggest what's "best" for the children
- Take sides between parents
- Make judgments about either parent's behavior
- Promise any particular outcome

HOW TO HANDLE COMMON SITUATIONS:
- If asked for legal advice: "That's a great question for [Professional].
  My job is just to gather information so they can help you."
- If parent is distressed: "I understand this is difficult.
  Would you like to take a break and continue later?"
"""
```

---

## QuickAccord Builder

### Situational Agreement System

QuickAccords are lightweight agreements for specific situations:

| Category | Example Use Cases |
|----------|-------------------|
| `travel` | Taking kids on a trip |
| `schedule_swap` | Trading custody days |
| `special_event` | Birthday party, school event |
| `overnight` | One-off overnight stay |
| `expense` | Shared expense agreement |
| `other` | Any other situation |

### Conversation Example

```
ARIA: Sure! What's the situation?

Parent: My ex wants to take the kids to Disneyland next weekend

ARIA: That sounds fun! Let me help you formalize this...
      What dates are we talking about?

Parent: Saturday the 8th through Sunday the 9th

ARIA: Got it. Who's handling pickup?

Parent: She'll pick them up Saturday morning

ARIA: And drop-off on Sunday?

Parent: Yeah, she'll bring them back around 6pm
```

### Generated QuickAccord

```
**Disneyland Trip - Feb 8-9, 2025**
- Children: Emma & Jake
- Departs: Sat Feb 8 at 9:00 AM (Mother picks up)
- Returns: Sun Feb 9 at 6:00 PM (Mother drops off)
- Expenses: Mother covers all costs
- Location: Disneyland, Anaheim CA

Does this look right? [Edit] [Send for Approval]
```

---

## Configuration

### Environment Variables

```bash
# AI Provider Configuration
ANTHROPIC_API_KEY=sk-ant-your-key
OPENAI_API_KEY=sk-your-key

# ARIA Settings
ARIA_DEFAULT_PROVIDER=claude        # "claude" or "openai"
ARIA_INTERVENTION_THRESHOLD=0.30    # Score to trigger intervention
ARIA_BLOCK_THRESHOLD=0.80           # Score to block + THREATENING

# Model Selection
ANTHROPIC_MODEL=claude-sonnet-4-20250514
OPENAI_MODEL=gpt-4-turbo
```

### Configuration Class

```python
# app/core/config.py

class Settings(BaseSettings):
    # AI Services
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    ARIA_DEFAULT_PROVIDER: str = "claude"

    # Thresholds
    ARIA_INTERVENTION_THRESHOLD: float = 0.30
    ARIA_BLOCK_THRESHOLD: float = 0.80
```

---

## API Integration

### Message Analysis Endpoint

```python
# POST /api/v1/messages/
# Integrated ARIA analysis on message send

async def create_message(
    message: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Analyze message with ARIA
    analysis = aria_service.analyze_message(
        message=message.content,
        context=[...]
    )

    if analysis.is_flagged:
        return {
            "intervention": aria_service.get_intervention_message(analysis),
            "original_message": message.content,
            "suggestions": [analysis.suggestion]
        }
```

### Agreement Builder Endpoints

```python
# POST /api/v1/agreements/{id}/aria/message
# Send message to ARIA agreement builder

# POST /api/v1/agreements/{id}/aria/summary
# Generate conversation summary

# POST /api/v1/agreements/{id}/aria/extract
# Extract structured data from conversation

# POST /api/v1/agreements/{id}/aria/finalize
# Finalize agreement from conversation
```

### Paralegal Intake Endpoints

```python
# POST /api/v1/intake/{session_id}/message
# Send message to paralegal intake

# POST /api/v1/intake/{session_id}/summary
# Generate intake summary

# POST /api/v1/intake/{session_id}/complete
# Complete and finalize intake
```

---

## Fallback Mechanisms

### Provider Fallback Chain

```
┌─────────────────────────────────────────────────────────────┐
│                    Provider Fallback Chain                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────┐   Fail   ┌───────────┐   Fail   ┌─────────┐ │
│  │  Claude   │─────────▶│  OpenAI   │─────────▶│  Regex  │ │
│  │ (Primary) │          │ (Backup)  │          │(Fallback)│ │
│  └───────────┘          └───────────┘          └─────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```python
async def analyze_with_ai(self, message: str, case_context: Optional[Dict] = None):
    """Deep AI analysis with fallback."""
    try:
        # Try Claude first
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": prompt}]
        )
        return parse_response(response)

    except Exception as e:
        # Fallback to regex analysis
        print(f"AI analysis failed: {e}")
        regex_analysis = self.analyze_message(message)
        return {
            "ai_powered": False,
            "toxicity_score": regex_analysis.toxicity_score,
            "categories": [cat.value for cat in regex_analysis.categories],
            "error": str(e)
        }
```

### Timeout Handling

```python
# Anthropic client with timeout
client = anthropic.Anthropic(
    api_key=settings.ANTHROPIC_API_KEY,
    timeout=30.0  # 30 second timeout
)
```

---

## Analytics & Metrics

### Good Faith Metrics

ARIA tracks communication quality metrics per user:

```python
async def calculate_good_faith_metrics(
    self,
    db: AsyncSession,
    user_id: str,
    case_id: str,
    period_days: int = 30
) -> Dict[str, Any]:
    """
    Calculates:
    - Total messages sent
    - Messages flagged by ARIA
    - Flag rate percentage
    - Average toxicity score
    - Suggestion acceptance rate
    - Communication trend (improving/stable/worsening)
    """
```

### Metrics Schema

```python
{
    "user_id": "uuid",
    "case_id": "uuid",
    "period_start": "2025-12-01T00:00:00Z",
    "period_end": "2025-12-31T00:00:00Z",
    "total_messages": 150,
    "flagged_messages": 12,
    "flag_rate": 8.0,
    "suggestions_accepted": 8,
    "suggestions_modified": 2,
    "suggestions_rejected": 1,
    "sent_anyway": 1,
    "acceptance_rate": 66.7,
    "average_toxicity": 0.35,
    "trend": "improving",
    "compliance_score": "good"
}
```

### Compliance Scores

| Score | Criteria |
|-------|----------|
| `excellent` | Acceptance rate >= 70% AND flag rate < 20% |
| `good` | Acceptance rate >= 50% AND flag rate < 40% |
| `fair` | Acceptance rate >= 30% AND flag rate < 60% |
| `needs_improvement` | Below fair thresholds |

### Conversation Health

Case-wide health analysis for both parents:

```python
async def get_conversation_health(
    self,
    db: AsyncSession,
    case_id: str,
    period_days: int = 30
) -> Dict[str, Any]:
    """
    Returns:
    - Overall flag rate
    - Overall toxicity average
    - Health status (excellent/good/fair/concerning)
    - Per-parent metrics
    """
```

### Health Status Thresholds

| Status | Flag Rate | Toxicity |
|--------|-----------|----------|
| `excellent` | < 15% | < 0.3 |
| `good` | < 30% | < 0.5 |
| `fair` | < 50% | < 0.7 |
| `concerning` | >= 50% | >= 0.7 |

---

## Intervention UI Flow

### Frontend Intervention Modal

When ARIA flags a message:

```typescript
interface ARIAIntervention {
  level: "low" | "medium" | "high" | "severe";
  header: string;
  explanation: string;
  original_message: string;
  suggestion: string;
  toxicity_score: number;
  categories: string[];
  court_reminder: string;
  child_reminder: string;
  block_send: boolean;
}
```

### User Actions

| Action | Description | Tracking |
|--------|-------------|----------|
| `accepted` | Use ARIA's suggestion as-is | Best outcome |
| `modified` | Edit suggestion before sending | Good outcome |
| `rejected` | Compose new message | Neutral |
| `sent_anyway` | Send original despite warning | Logged for court |

### Court Reminders by Level

| Level | Reminder |
|-------|----------|
| `LOW` | "Reminder: All messages may be reviewed by a judge. Keep communication professional." |
| `MEDIUM` | "Warning: This language could reflect poorly in court. Judges favor collaborative, child-focused communication." |
| `HIGH` | "This message could seriously damage your case in court. Judges view hostile communication negatively." |
| `SEVERE` | "CRITICAL: This message has been BLOCKED. Using threats or physical violence triggers an immediate safety protocol." |

---

## Document Index

| Document | Location | Purpose |
|----------|----------|---------|
| **ARIA.md** | `/docs/features/` | This document |
| aria.py | `app/services/` | Core sentiment analysis |
| aria_paralegal.py | `app/services/` | Legal intake service |
| aria_agreement.py | `app/services/` | Agreement builder |
| aria_extraction_schema.py | `app/services/` | Data extraction schemas |
| aria_quick_accord.py | `app/services/` | QuickAccord builder |

---

*Last Updated: January 10, 2026*
*Document Version: 1.0.0*
