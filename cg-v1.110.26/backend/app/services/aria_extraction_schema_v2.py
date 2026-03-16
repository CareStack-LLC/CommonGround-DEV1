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
    "schedule_notes": "string - Any special notes about the schedule (optional)",
    "holiday_schedule": [
      {
        "holiday_name": "string - e.g. Thanksgiving, Christmas, Spring Break, Summer Break, New Year, Easter, Fourth of July, Labor Day, Memorial Day",
        "arrangement": "string - alternate_yearly|parent_a_even_years|parent_b_even_years|split_day|always_parent_a|always_parent_b",
        "start_time": "string - When holiday custody starts (e.g., 6:00 PM day before, morning of, noon, optional)",
        "end_time": "string - When holiday custody ends (e.g., 6:00 PM, morning after, noon, optional)",
        "notes": "string - Any special details about this holiday arrangement (optional)"
      }
    ]
  },

  "recurring_activities": [
    {
      "activity_name": "string - e.g. Band practice, Soccer, Tutoring, Therapy, Dance class",
      "child_name": "string - Which child this applies to (optional, all children if omitted)",
      "day_of_week": "string - Day of week (Monday, Tuesday, etc.)",
      "time": "string - Start time (e.g., 4:00 PM)",
      "end_time": "string - End time (e.g., 5:30 PM, optional)",
      "location": "string - Where the activity takes place (address or venue name, optional)",
      "responsible_parent": "string - parent_a|parent_b|alternating|during_own_time",
      "cost_per_session": "number - Cost per session in dollars (optional)",
      "cost_frequency": "string - per_session|monthly|semester|annual (optional)"
    }
  ],

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
    "category_splits": {
      "medical": "integer - parent_a percentage for medical expenses (0-100, optional)",
      "education": "integer - parent_a percentage for education expenses (0-100, optional)",
      "sports": "integer - parent_a percentage for sports expenses (0-100, optional)",
      "extracurricular": "integer - parent_a percentage for extracurricular expenses (0-100, optional)",
      "childcare": "integer - parent_a percentage for childcare expenses (0-100, optional)",
      "clothing": "integer - parent_a percentage for clothing expenses (0-100, optional)",
      "transportation": "integer - parent_a percentage for transportation expenses (0-100, optional)",
      "device": "integer - parent_a percentage for device/technology expenses (0-100, optional)",
      "camp": "integer - parent_a percentage for camp expenses (0-100, optional)"
    },
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

5. **HOLIDAY SCHEDULES**:
   - Map holiday arrangements to: alternate_yearly, parent_a_even_years, parent_b_even_years, split_day, always_parent_a, always_parent_b
   - "we alternate Thanksgiving" → arrangement: "alternate_yearly"
   - "I get Christmas even years" → arrangement: "parent_a_even_years"
   - "we split Christmas day" → arrangement: "split_day"

6. **RECURRING ACTIVITIES**:
   - Extract regular child activities (sports, lessons, therapy, tutoring)
   - Map responsible parent: "I take him" → responsible_parent: "parent_a"
   - "whoever has them" → responsible_parent: "during_own_time"
   - Include costs if mentioned: "it's $50/session" → cost_per_session: 50

7. **KEEP IT PRACTICAL**:
   - Travel consent goes in Quick Accords
   - Focus on recurring patterns, not one-off events

8. **PER-CATEGORY SPLITS**:
   - If parents specify different splits per expense type, populate category_splits
   - "medical is 50/50 but school is 80/20" → split_ratio: "50/50", category_splits: {"medical": 50, "education": 80}
   - "everything split equally" → split_ratio: "50/50", category_splits: null
   - Parent_a's percentage is always the first number in a ratio
   - Only include categories where the split differs from the global split_ratio

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

Then cover holidays:
- **Major Holidays**: "How do you want to handle Thanksgiving, Christmas, and other major holidays? Alternate years, or does one parent always have a specific holiday?"
- **School Breaks**: "What about spring break and summer break — do you split them, alternate years, or keep the regular schedule?"
- **Other Days**: "Any other special days — birthdays, Mother's Day, Father's Day?"

Example: "For the 'Week-on/Week-off' - does the switch happen every Friday? And at what time?"
Then: "Now let's talk holidays. Do you want to alternate major holidays each year, or have a set arrangement?"
""",

    "recurring_activities": """
Help identify recurring child activities that need to be scheduled and tracked.

Ask about:
- **Regular Activities**: "Do any of the kids have regular activities like sports, music lessons, tutoring, or therapy?"
- **Details**: For each activity, get: day of week, time, location, and which parent takes them
- **Costs**: "Does that activity have a cost? If so, how much and how is it split?"
- **Transportation**: "Who's responsible for getting them there — whoever has them that day, or does one parent always handle it?"

Keep it conversational:
"Let's talk about the kids' regular activities. Things like sports practice, music lessons, tutoring — anything that happens on a weekly basis. What do they have going on?"
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
- What expenses will you share? (medical, school, activities, clothing, devices)
- **Default Split Ratio**: "Is it 50/50 or income-based?"
- **Per-Category Splits**: "Are all categories split the same, or do you want different ratios? For example, some parents split medical 50/50 but school expenses 80/20."
- **Reimbursement**: "If one of you pays upfront, how many days to pay back? 14 days?"
- **Receipts**: "Do you want to require receipts for shared expenses?"

If they want different splits per category, get the specific ratio for each category they mention.

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
