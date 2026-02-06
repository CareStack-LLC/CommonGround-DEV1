"""
ARIA Agreement Data Extraction Schema v2

Simplified extraction schema for 7-section (standard) and 5-section (lite) agreements.
Designed for easier completion while maintaining court usefulness.
"""

from typing import Dict, Any, Optional


# ============================================================================
# V2 STANDARD EXTRACTION SCHEMA - 7 Sections
# ============================================================================

EXTRACTION_SCHEMA_V2_STANDARD = """{
  "parties_children": {
    "parent_a": {
      "name": "string - Full legal name",
      "email": "string - Email address",
      "phone": "string - Phone number"
    },
    "parent_b": {
      "name": "string - Full legal name",
      "email": "string - Email address (optional)",
      "phone": "string - Phone number (optional)"
    },
    "children": [
      {
        "name": "string - Child's full name",
        "date_of_birth": "string - DOB (YYYY-MM-DD)",
        "current_residence": "string - parent_a|parent_b|shared"
      }
    ],
    "current_arrangements": "string - Brief description of current custody situation"
  },

  "scope_duration": {
    "effective_date": "string - When agreement starts (YYYY-MM-DD or 'immediately')",
    "duration_type": "string - indefinite|fixed_term|until_child_18",
    "end_date": "string - End date if fixed_term (YYYY-MM-DD, optional)",
    "review_schedule": "string - annual|every_6_months|as_needed",
    "amendment_process": "string - mutual_written|30_day_notice|mediation_required"
  },

  "parenting_time": {
    "primary_residence": "string - parent_a|parent_b|equal",
    "schedule_pattern": "string - week_on_week_off|2-2-3|every_other_weekend|custom",
    "custom_pattern_description": "string - If custom, describe the pattern (optional)",
    "transition_day": "string - Day of week (Monday, Tuesday, etc.)",
    "transition_time": "string - Time (e.g., 6:00 PM, after school)",
    "schedule_notes": "string - Any special notes about the schedule (optional)"
  },

  "logistics_transitions": {
    "exchange_location": "string - school|parent_a_home|parent_b_home|neutral_location",
    "exchange_location_address": "string - Address if neutral location (optional)",
    "transportation_responsibility": "string - picking_up_parent|dropping_off_parent|shared|alternate",
    "transition_communication": "string - commonground|text|email|phone",
    "backup_plan": "string - What happens if primary plan fails (optional)"
  },

  "decision_communication": {
    "major_decision_authority": "string - joint|parent_a|parent_b",
    "decision_categories": {
      "education": "string - joint|parent_a|parent_b",
      "healthcare": "string - joint|parent_a|parent_b",
      "religion": "string - joint|parent_a|parent_b|not_applicable",
      "extracurriculars": "string - joint|parent_a|parent_b|during_own_time"
    },
    "communication_platform": "string - commonground|text|email|phone|talking_parents",
    "response_timeframe": "string - 24_hours|48_hours|72_hours|same_day_urgent",
    "emergency_contact_order": "string - Who to contact first in emergencies"
  },

  "expenses_financial": {
    "expense_categories": ["string - Categories of shared expenses (medical, education, activities, clothing, etc.)"],
    "split_ratio": "string - 50/50|60/40|70/30|income_based|custom",
    "custom_split_details": "string - If custom, describe the split (optional)",
    "reimbursement_window": "string - 14_days|30_days|60_days",
    "documentation_required": "boolean - Whether receipts/documentation required",
    "payment_method": "string - commonground_clearfund|venmo|zelle|check|cash"
  },

  "modification_disputes": {
    "modification_triggers": ["string - Events that may require modification (relocation, school_change, etc.)"],
    "dispute_resolution_steps": [
      "string - Step 1: direct_discussion",
      "string - Step 2: mediation",
      "string - Step 3: arbitration_or_court"
    ],
    "escalation_timeframe": "string - Days to try each step before escalating (e.g., 14_days)",
    "parent_a_acknowledgment": "boolean - Parent A has reviewed and accepts",
    "parent_b_acknowledgment": "boolean - Parent B has reviewed and accepts",
    "acknowledgment_date": "string - Date of final acknowledgment (YYYY-MM-DD)"
  }
}"""


# ============================================================================
# V2 LITE EXTRACTION SCHEMA - 5 Sections (Low-Conflict)
# ============================================================================

EXTRACTION_SCHEMA_V2_LITE = """{
  "parties_children": {
    "parent_a_name": "string - Full legal name",
    "parent_b_name": "string - Full legal name",
    "children": [
      {
        "name": "string - Child's full name",
        "date_of_birth": "string - DOB (YYYY-MM-DD)"
      }
    ]
  },

  "scope_duration": {
    "effective_date": "string - When agreement starts",
    "review_schedule": "string - annual|as_needed"
  },

  "parenting_time": {
    "primary_residence": "string - parent_a|parent_b|equal",
    "schedule_pattern": "string - week_on_week_off|2-2-3|every_other_weekend|custom",
    "transition_day": "string - Day of week",
    "transition_time": "string - Time"
  },

  "logistics_expenses": {
    "exchange_location": "string - Where exchanges happen",
    "transportation_responsibility": "string - Who handles transportation",
    "expense_split": "string - 50/50|income_based|as_agreed",
    "communication_method": "string - commonground|text|email"
  },

  "acknowledgment": {
    "parent_a_acknowledgment": "boolean",
    "parent_b_acknowledgment": "boolean",
    "acknowledgment_date": "string - YYYY-MM-DD"
  }
}"""


# ============================================================================
# Extraction Prompt Templates
# ============================================================================

EXTRACTION_PROMPT_V2_STANDARD = """You are ARIA, an AI assistant helping parents create simplified SharedCare Agreements.

Your task is to extract structured data from the conversation and map it to the 7-section format.

PARSING RULES:
1. **NATURAL LANGUAGE CONVERSION**:
   - "week on, week off" → schedule_pattern: "week_on_week_off"
   - "every other weekend" → schedule_pattern: "every_other_weekend"
   - "we'll decide together" → major_decision_authority: "joint"
   - "she handles medical" → healthcare: "parent_b" (assuming parent_b is mother)
   - "split 50/50" → split_ratio: "50/50"
   - "pick up at school" → exchange_location: "school"
   - "4pm" → transition_time: "4:00 PM"

2. **PARENT IDENTIFICATION**:
   - The parent talking to you is "parent_a"
   - Their co-parent is "parent_b"
   - Map pronouns accordingly: "I" = parent_a, "he/she/they" = parent_b

3. **TIME FORMATS**:
   - Convert all times to HH:MM AM/PM format
   - "after school" is valid as-is
   - "6 o'clock" → "6:00 PM"

4. **SCHEDULE PATTERNS**:
   - "2-2-3" = 2 days with one, 2 with other, then 3 days
   - "every other weekend" = weekends alternating, weekdays with primary
   - "equal time" → primary_residence: "equal"

5. **KEEP IT SIMPLE**:
   - Holiday schedules go in Quick Accords, not here
   - Travel consent goes in Quick Accords
   - Focus on baseline, everyday schedule

JSON SCHEMA TO POPULATE:
{schema}

CONVERSATION HISTORY:
{conversation}

Return ONLY valid JSON matching the schema above. Leave fields null if not discussed.
"""

EXTRACTION_PROMPT_V2_LITE = """You are ARIA, an AI assistant helping parents create a simple SharedCare Agreement.

This is a LITE agreement for cooperative parents. Extract only essential information.

PARSING RULES:
1. Keep responses brief and practical
2. Focus on the basics: who, what schedule, where exchanges, how expenses split
3. Don't over-complicate - this is for low-conflict situations

JSON SCHEMA TO POPULATE:
{schema}

CONVERSATION HISTORY:
{conversation}

Return ONLY valid JSON. Leave fields null if not discussed.
"""


# ============================================================================
# ARIA Section Prompts - Conversational Guidance
# ============================================================================

ARIA_SECTION_PROMPTS_V2 = {
    "parties_children": """
Help the parent identify all parties and children for this agreement.

Ask for:
- Their full name (they are Parent A)
- Their co-parent's name (Parent B)
- Children's names and ages
- Current living situation

Keep it conversational and supportive. Example:
"Let's start with the basics. Can you tell me your full legal name, and then your co-parent's name?"
""",

    "scope_duration": """
Help establish when this agreement takes effect and how long it lasts.

Ask about:
- When should this start? (today, specific date)
- Is this permanent or for a trial period?
- How often should you both review it?

Keep it simple:
"When would you like this agreement to start? And should we plan to review it together after a while, say every year?"
""",

    "parenting_time": """
Help establish a baseline parenting schedule with enough detail for a calendar.

Common patterns to offer:
- Week-on/week-off (50/50) - Ask if it's a 7-day or 14-day cycle?
- 2-2-3 rotation (50/50) - Ask who has the first Monday?
- Every other weekend (70/30) - Ask for specific pickup/dropoff times.

Focus on:
- **Cycle Length**: "Is that a 2-week rotation?"
- **Transitions**: "What specific day and time do you switch?"
- **First Step**: "Who has the kids on the very first day of the schedule?"

DON'T get into holidays - those go in Quick Accords.
Example: "For the 'Week-on/Week-off' - does the switch happen every Friday? And at what time?"
""",

    "logistics_transitions": """
Help plan smooth custody exchanges with location precision.

Ask about:
- **Exact Location**: "If you say 'School', which school? Or 'Starbucks' - do you have an address?"
- **Verified Arrival**: "Do you want to use the app to verify arrival times?"
- **Transportation**: "Who handles the drive?"

Keep it practical:
"To make the map work for you, we need exact addresses. Where exactly should the exchanges happen?"
""",

    "decision_communication": """
Help clarify decision-making authority and communication methods.

Cover:
- Major decisions (education, healthcare, religion, activities)
- Do you decide together, or does one parent lead?
- **Response Time**: "If you message each other, how fast do you expect a reply? 24 hours? 4 hours?"

Example: "For routine questions, what's a fair response time to expect from each other? 24 hours?"
""",

    "expenses_financial": """
Help establish expense sharing (this is for non-court-ordered expenses).

Ask about:
- What expenses will you share? (medical, school, activities)
- **Split Ratio**: "Is it 50/50 or income-based?"
- **Reimbursement**: "If one of you pays upfront, how many days to pay back? 14 days?"

Note: If there's a court order for child support, this section is just for extras.
""",

    "modification_disputes": """
Help close the loop on modifications and disagreements.

Cover:
- **Relocation**: "How far away can a parent move before needing consent? 50 miles?"
- **New Partners**: "How long should you date someone before introducing them? 6 months?"
- **Dispute Steps**: "If you disagree, do you want to try mediation before court?"

Keep it positive but specific.
"""
}


def get_extraction_prompt_v2(conversation_history: str, version: str = "v2_standard") -> str:
    """
    Generate the extraction prompt for v2 agreements.

    Args:
        conversation_history: The conversation between ARIA and the parent
        version: Agreement version (v2_standard or v2_lite)

    Returns:
        Complete prompt string ready to send to Claude/OpenAI
    """
    if version == "v2_lite":
        return EXTRACTION_PROMPT_V2_LITE.format(
            schema=EXTRACTION_SCHEMA_V2_LITE,
            conversation=conversation_history
        )
    else:
        return EXTRACTION_PROMPT_V2_STANDARD.format(
            schema=EXTRACTION_SCHEMA_V2_STANDARD,
            conversation=conversation_history
        )


def get_section_prompt(section_id: str) -> str:
    """
    Get the ARIA conversation prompt for a specific section.

    Args:
        section_id: The section identifier (e.g., 'parenting_time')

    Returns:
        Prompt guidance for ARIA to use when discussing this section
    """
    return ARIA_SECTION_PROMPTS_V2.get(section_id, "")


def get_extraction_schema(version: str = "v2_standard") -> str:
    """
    Get the extraction schema for a specific version.

    Args:
        version: Agreement version

    Returns:
        JSON schema string
    """
    if version == "v2_lite":
        return EXTRACTION_SCHEMA_V2_LITE
    return EXTRACTION_SCHEMA_V2_STANDARD
