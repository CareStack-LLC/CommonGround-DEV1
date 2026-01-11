"""
ARIA Agreement Data Extraction Schema
This module contains the complete JSON schema for extracting custody agreement data
from natural language conversations with parents.
"""

# Complete JSON extraction schema for all 18 agreement sections
# This will be used in ARIA prompts to extract structured data from conversations

EXTRACTION_SCHEMA = """{
  "section_1_parent_info": {
    "full_name": "string - Full legal name of the parent filling out the form",
    "role": "string - mother|father|parent",
    "address": "string - Street address",
    "city": "string - City",
    "state": "string - State (2-letter code)",
    "zip": "string - ZIP code",
    "phone": "string - Phone number",
    "email": "string - Email address",
    "employer": "string - Employer name (optional)",
    "work_hours": "string - Typical work hours (optional)"
  },

  "section_2_other_parent_info": {
    "full_name": "string - Full legal name of the other parent",
    "address": "string - Current address",
    "city": "string - City",
    "state": "string - State (2-letter code)",
    "zip": "string - ZIP code",
    "phone": "string - Phone number",
    "email": "string - Email address",
    "work_schedule": "string - Typical work schedule (optional)"
  },

  "section_3_children_info": {
    "children": [
      {
        "full_name": "string - Full legal name of child",
        "nickname": "string - Preferred nickname (optional)",
        "date_of_birth": "string - Date of birth (YYYY-MM-DD)",
        "school": "string - School name (optional)",
        "grade": "string - Current grade (optional)",
        "special_needs": "string - Special needs or IEP details (optional)",
        "allergies": "string - Allergies (optional)",
        "medications": "string - Current medications (optional)"
      }
    ]
  },

  "section_4_legal_custody": {
    "education_decisions": "string - Joint Decision|Mother Decides|Father Decides|Joint with Mother Tiebreaker|Joint with Father Tiebreaker",
    "medical_decisions": "string - Joint Decision|Mother Decides|Father Decides|Joint with Mother Tiebreaker|Joint with Father Tiebreaker",
    "religious_decisions": "string - Joint Decision|Mother Decides|Father Decides|Joint with Mother Tiebreaker|Joint with Father Tiebreaker",
    "extracurricular_decisions": "string - Joint Decision|Mother Decides|Father Decides|Joint with Mother Tiebreaker|Joint with Father Tiebreaker",
    "emergency_decisions": "string - Emergency decision-making policy"
  },

  "section_5_physical_custody": {
    "arrangement_type": "string - 50/50 (Equal Time)|Primary with One Parent|70/30 Split|60/40 Split|Other",
    "percentage_split": "string - If not 50/50, describe the percentage split (optional)",
    "primary_residential_parent": "string - Mother|Father|Joint",
    "summer_vs_school_year": "string - Different arrangements for summer vs school year (optional)"
  },

  "section_6_parenting_schedule": {
    "weekly_pattern": "string - Alternating Weeks|2-2-3 Rotation|2-2-5-5 Rotation|Alternating Weekends with Midweek|Other",
    "mother_days": "string - Which days the child is with Mother",
    "father_days": "string - Which days the child is with Father",
    "school_considerations": "string - School year arrangements (optional)",
    "midweek_visits": "string - Midweek visit details (optional)"
  },

  "section_7_holiday_schedule": {
    "thanksgiving": "string - Thanksgiving arrangement",
    "christmas_eve": "string - Christmas Eve arrangement",
    "christmas_day": "string - Christmas Day arrangement",
    "new_years": "string - New Year's arrangement",
    "easter": "string - Easter/Spring holiday arrangement",
    "july_4": "string - Fourth of July arrangement",
    "halloween": "string - Halloween arrangement",
    "mothers_day": "string - Mother's Day arrangement",
    "fathers_day": "string - Father's Day arrangement",
    "child_birthday": "string - Child's birthday arrangement",
    "spring_break": "string - Spring break division",
    "winter_break": "string - Winter break division",
    "summer_vacation": "string - Summer vacation division"
  },

  "section_8_exchange_logistics": {
    "exchange_location": "string - Where exchanges happen (address and type of location)",
    "exchange_day": "string - Day of week for exchanges",
    "exchange_time": "string - Time of exchanges (HH:MM format)",
    "who_transports": "string - Who brings/picks up the child",
    "grace_period": "string - Grace period for lateness (optional)",
    "emergency_contact": "string - Emergency contact if late (optional)",
    "behavior_rules": "string - Behavior rules during exchanges (optional)"
  },

  "section_9_transportation": {
    "cost_arrangement": "string - Each Pays Own|Split 50/50|One Parent Pays All|Meet Halfway|Based on Income Percentages",
    "who_pays": "string - If one parent pays, which one (optional)",
    "mileage_reimbursement": "string - Mileage reimbursement details (optional)",
    "long_distance": "string - Long distance travel arrangements (optional)"
  },

  "section_10_child_support": {
    "has_support": "string - Yes|No",
    "payer": "string - Who pays whom (optional)",
    "amount": "string - Amount per month (optional)",
    "due_date": "string - Due date (day of month) (optional)",
    "payment_method": "string - Payment method (optional)",
    "medical_expenses": "string - How uncovered medical/dental expenses are split (optional)",
    "childcare_costs": "string - How childcare costs are split (optional)",
    "school_expenses": "string - How school supplies and fees are split (optional)",
    "extracurricular_costs": "string - How extracurricular activities are paid (optional)",
    "tax_benefits": "string - Who claims child on taxes (optional)",
    "health_insurance": "string - Who provides health insurance"
  },

  "section_11_medical_healthcare": {
    "insurance_provider": "string - Who provides health insurance",
    "insurance_company": "string - Insurance company name (optional)",
    "medical_records_access": "string - Yes|No - Both parents have access to medical records",
    "routine_appointments": "string - Who handles routine appointments (optional)",
    "major_medical": "string - How major medical decisions are made",
    "emergency_treatment": "string - Emergency treatment authorization policy",
    "mental_health": "string - Mental health/therapy consent policy (optional)",
    "current_conditions": "string - Current medical conditions (optional)",
    "current_pediatrician": "string - Current pediatrician (optional)",
    "current_dentist": "string - Current dentist (optional)"
  },

  "section_12_education": {
    "current_school": "string - Current school name (optional)",
    "school_district": "string - School district (optional)",
    "school_records_access": "string - Yes|No - Both parents have access to school records",
    "report_cards": "string - Yes|No - Both receive report cards",
    "conferences": "string - Yes|No - Both can attend parent-teacher conferences",
    "school_events": "string - Yes|No - Both can attend school events",
    "school_choice": "string - Joint Decision|Mother Decides|Father Decides",
    "homework": "string - Homework responsibility during each parent's time (optional)",
    "school_communications": "string - How school info is shared between parents (optional)"
  },

  "section_13_parent_communication": {
    "primary_method": "string - Text|Email|Phone|Co-parenting App|Our Family Wizard|Talking Parents",
    "response_time_non_urgent": "string - Response time for non-urgent messages (optional)",
    "response_time_urgent": "string - Response time for urgent messages (optional)",
    "communication_tone": "string - Communication tone agreement (optional)",
    "schedule_change_notice": "string - Advance notice for schedule changes (optional)",
    "information_sharing": "string - What information will be shared (optional)"
  },

  "section_14_child_communication": {
    "phone_calls_allowed": "string - Yes|No|Limited - Can child call other parent",
    "video_calls_allowed": "string - Yes|No - Video calls allowed",
    "call_frequency": "string - How often calls are allowed (optional)",
    "preferred_times": "string - Preferred call times (optional)",
    "call_privacy": "string - Yes, completely private|Parent can be present but not listening|No privacy requirement (optional)",
    "child_phone": "string - Yes|No - Does child have their own phone (optional)",
    "phone_travel_rules": "string - Phone travel rules (optional)",
    "social_media": "string - Social media agreements (optional)"
  },

  "section_15_travel": {
    "domestic_notice": "string - Domestic travel advance notice requirement",
    "travel_itinerary": "string - Yes|No - Is travel itinerary required",
    "contact_while_traveling": "string - Contact info while traveling requirement (optional)",
    "international_consent": "string - Yes|No - Does other parent need to consent to international travel",
    "passport_holder": "string - Who holds the passport (optional)",
    "international_notice": "string - International travel advance notice (optional)",
    "vacation_time_amount": "string - Vacation time per year for each parent",
    "vacation_advance_request": "string - How far in advance vacation must be requested (optional)",
    "blackout_dates": "string - Vacation blackout dates (optional)"
  },

  "section_16_relocation": {
    "notice_days": "string - Number of days notice required for relocation",
    "distance_trigger": "string - Distance that triggers relocation notice requirement",
    "process": "string - Relocation process and steps",
    "custody_impact": "string - How a move would impact custody (optional)"
  },

  "section_17_dispute_resolution": {
    "first_step": "string - First step in dispute resolution",
    "mediation_required": "string - Yes|No - Is mediation required before court",
    "mediation_costs": "string - How mediation costs are split (optional)",
    "preferred_mediator": "string - Preferred mediator or service (optional)",
    "court_option": "string - Court intervention policy (optional)",
    "emergency_court": "string - Emergency court access policy (optional)"
  },

  "section_18_other_provisions": {
    "right_of_first_refusal": "string - Right of first refusal policy and time threshold",
    "new_partners": "string - Rules about new partners/overnight guests (optional)",
    "discipline": "string - Discipline agreement (optional)",
    "religious_upbringing": "string - Religious upbringing agreement (optional)",
    "pets": "string - Pets that travel with child (optional)",
    "items_traveling": "string - Items that should always travel with child (optional)",
    "clothing": "string - Each home provides clothing|Clothes travel with child (optional)",
    "other_special": "string - Other special provisions (optional)"
  }
}"""


# Extraction prompt template for ARIA
EXTRACTION_PROMPT_TEMPLATE = """You are ARIA, an AI assistant helping parents create custody agreements through natural conversation.

Your task is to INTELLIGENTLY extract structured data from casual conversation and map it to the correct fields.

CRITICAL RULES - READ CAREFULLY:

1. **SKIP SECTIONS 1-3** - DO NOT extract parent info, other parent info, or children info. Parents enter these manually. Set these to null.

2. **PARSE NATURAL LANGUAGE SMARTLY**:
   - "$200 every other week" → amount: "$400", frequency: "monthly" (bi-weekly × 2 = monthly)
   - "$100 a week" → amount: "$433", frequency: "monthly" (weekly × 4.33 = monthly)
   - "pick up at school" → extract the school address if mentioned, add "(School)" to location
   - "drop off at police station" → extract address if mentioned, add "(Police Station)"
   - "every other Friday" → weekly_pattern: "Alternating Weeks", exchange_day: "Friday"
   - "4pm" or "4 o'clock" → "4:00 PM"
   - "she can handle all the doctor stuff" → medical_decisions: "Mother Decides"
   - "we'll split it" → "Split 50/50"
   - "alternate" or "switch off" → "Alternating" or appropriate alternating pattern

3. **INTELLIGENT FIELD MAPPING**:
   - Locations: Extract full address + note type (School, Home, Police Station, Public Place, etc.)
   - Times: Convert to HH:MM AM/PM format (e.g., "4pm" → "4:00 PM")
   - Money: Always convert to monthly amounts in format "$XXX"
   - Decisions: Map casual language to formal options:
     * "she can handle it" → "Mother Decides"
     * "he'll take care of that" → "Father Decides"
     * "we'll decide together" → "Joint Decision"
     * "I'll ask first" → "Joint Decision"
   - Days: Convert casual to formal (e.g., "Friday" → "Friday", "weekends" → context-dependent)
   - Patterns: Infer schedule patterns from descriptions:
     * "every other weekend" → "Alternating Weekends with Midweek"
     * "week on week off" → "Alternating Weeks"
     * "2 days with me, 2 with her, then 3" → "2-2-3 Rotation"

4. **USE CONTEXT CLUES**:
   - If parent says "her mom" or "his mom" → that's the Mother
   - If parent says "I" and they're male → that's Father
   - If they mention "my work schedule" → note it for relevant fields
   - School locations usually apply to pickup
   - Police stations are common safe exchange locations

5. **NORMALIZE VALUES**:
   - "$200 bi-weekly" = "$200 every other week" = "$400/month"
   - "4 o'clock" = "4pm" = "4:00 PM"
   - "Yes" for boolean questions where parent agrees
   - "No" where parent declines or says they don't need something

6. **FOR SELECT FIELDS**: Choose the option that BEST matches what parent said, even if not exact wording

7. **SECTIONS TO POPULATE** (4-18 ONLY):
   - Section 4: Legal Custody
   - Section 5: Physical Custody
   - Section 6: Parenting Schedule
   - Section 7: Holiday Schedule
   - Section 8: Exchange Logistics
   - Section 9: Transportation
   - Section 10: Child Support
   - Section 11: Medical & Healthcare
   - Section 12: Education
   - Section 13: Parent Communication
   - Section 14: Child Communication
   - Section 15: Travel
   - Section 16: Relocation
   - Section 17: Dispute Resolution
   - Section 18: Other Provisions

JSON SCHEMA TO POPULATE:
{schema}

CONVERSATION HISTORY:
{conversation}

EXAMPLE PARSING:
Input: "I'll pick up my daughter from her school at 123 Main St every other Friday at 4pm and drop her off at the police station at 321 Chester Ave. I can only give her mom $200 every other week. All the doctors visits and stuff she can handle."

Output should include:
- section_6_parenting_schedule.weekly_pattern: "Alternating Weeks"
- section_8_exchange_logistics.exchange_day: "Friday"
- section_8_exchange_logistics.exchange_time: "4:00 PM"
- section_8_exchange_logistics.exchange_location: "123 Main St (School) pickup, 321 Chester Ave (Police Station) dropoff"
- section_10_child_support.has_support: "Yes"
- section_10_child_support.amount: "$400"
- section_10_child_support.payer: "Father pays Mother"
- section_11_medical_healthcare.routine_appointments: "Mother Decides"

Return ONLY valid JSON. Set sections 1-3 to null. Be smart about parsing casual speech into formal agreement language.

Your response:"""


def get_extraction_prompt(conversation_history: str) -> str:
    """
    Generate the complete extraction prompt for ARIA.

    Args:
        conversation_history: The conversation between ARIA and the parent

    Returns:
        Complete prompt string ready to send to Claude/OpenAI
    """
    return EXTRACTION_PROMPT_TEMPLATE.format(
        schema=EXTRACTION_SCHEMA,
        conversation=conversation_history
    )


# Example usage:
if __name__ == "__main__":
    # Example conversation
    sample_conversation = """
    ARIA: Hi! I'm ARIA. I'll help you create your custody agreement. Let's start with your information. What's your full legal name?
    Parent: My name is Sarah Michelle Johnson
    ARIA: Great! And what's your role - are you the mother, father, or prefer just "parent"?
    Parent: I'm the mother
    ARIA: Perfect. What's your current address?
    Parent: 123 Oak Street, Los Angeles, CA 90210
    ARIA: Thanks! And your phone number?
    Parent: 555-123-4567
    """

    # Generate prompt
    prompt = get_extraction_prompt(sample_conversation)

    # Print for demonstration
    print("="*80)
    print("EXTRACTION PROMPT:")
    print("="*80)
    print(prompt)
    print("\n")
    print("="*80)
    print("EXPECTED OUTPUT (example):")
    print("="*80)
    expected = """{
  "section_1_parent_info": {
    "full_name": "Sarah Michelle Johnson",
    "role": "mother",
    "address": "123 Oak Street",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90210",
    "phone": "555-123-4567",
    "email": null,
    "employer": null,
    "work_hours": null
  },
  "section_2_other_parent_info": {
    "full_name": null,
    "address": null,
    "city": null,
    "state": null,
    "zip": null,
    "phone": null,
    "email": null,
    "work_schedule": null
  },
  ...
}"""
    print(expected)
