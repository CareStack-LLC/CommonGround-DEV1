"""
ARIA Agreement Builder Service

Conversational approach to building custody agreements.
Extracts information from natural language and converts to structured data.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
import json

from openai import OpenAI
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.models.agreement import Agreement, AgreementConversation, AgreementSection
from app.models.case import Case
from app.models.user import User
from app.core.config import settings
from app.services.aria_extraction_schema import get_extraction_prompt
from app.schemas.agreement_v2 import (
    CONFLICT_SIGNALS,
    ConflictLevel,
    AgreementVersionType,
    SECTION_TEMPLATES_V2,
    QUICK_ACCORD_SUGGESTIONS,
    get_section_templates,
)
from app.services.aria_extraction_schema_v2 import (
    get_extraction_prompt_v2,
    get_section_prompt,
    ARIA_SECTION_PROMPTS_V2,
)


class AriaAgreementService:
    """Service for ARIA-powered conversational agreement building."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    async def get_or_create_conversation(
        self, agreement_id: str, user: User
    ) -> AgreementConversation:
        """Get existing conversation or create new one."""
        # Check if conversation exists
        result = await self.db.execute(
            select(AgreementConversation)
            .where(AgreementConversation.agreement_id == agreement_id)
            .where(AgreementConversation.user_id == user.id)
        )
        conversation = result.scalar_one_or_none()

        if not conversation:
            # Create new conversation
            conversation = AgreementConversation(
                agreement_id=agreement_id,
                user_id=user.id,
                messages=[],
                is_finalized=False,
            )
            self.db.add(conversation)
            await self.db.commit()
            await self.db.refresh(conversation)

        return conversation

    def _get_system_prompt(self, case_name: str, children_names: List[str]) -> str:
        """Generate ARIA system prompt for custody conversations."""
        children_text = ", ".join(children_names) if children_names else "your child"

        return f"""You are ARIA, an AI assistant helping parents create custody agreements for {case_name}.

Your role is to have a natural, empathetic conversation to understand their custody arrangement preferences. Parents will speak casually - your job is to:

1. **Understand casual language**: Parents may use informal speech, slang, or emotional language. Extract the core intent.
   - Example: "I ain't even tripping" = "I'm flexible/okay with this"
   - Example: "she can have the baby" = "the other parent can have custody during..."
   - Example: "$200 every other week" = "$400 per month child support"
   - Example: "pick up at her school" = extract school address for exchange location
   - Example: "she can handle all the doctor stuff" = Mother makes medical decisions

2. **Focus on the right topics**: You're here to discuss custody arrangements, NOT basic contact info. Focus on:
   - Legal and physical custody decisions
   - Weekly parenting schedule and patterns
   - Holiday and vacation time arrangements
   - Exchange locations, times, and procedures
   - Transportation and cost arrangements
   - Child support amounts and frequency
   - Medical and healthcare decision-making
   - Education decisions and school involvement
   - Extracurricular activities
   - Parent-to-parent communication methods
   - Child contact with each parent
   - Travel permissions and notice requirements
   - Relocation policies
   - Dispute resolution methods

   **DO NOT ASK ABOUT**: Names, addresses, phone numbers, emails - parents enter that separately.

3. **Ask specific, practical questions**:
   - "What time works for Friday pickups?"
   - "Where would be a good spot to meet for exchanges?"
   - "How much child support were you thinking?"
   - "Who usually handles taking them to doctor appointments?"

4. **Confirm understanding**: After each topic, summarize what you heard and confirm.

5. **Stay neutral**: Never take sides. Use "you" and "the other parent" or their names if mentioned.

6. **Be empathetic**: Acknowledge that co-parenting is challenging. Focus on what's best for {children_text}.

7. **Parse intelligently**: When parents give you information:
   - Convert money to monthly amounts (bi-weekly × 2, weekly × 4.33)
   - Format times properly (4pm → 4:00 PM)
   - Note specific locations and their type (school, police station, etc.)
   - Map casual decisions to formal options (she handles it → Mother Decides)

**Tone**: Warm, professional, non-judgmental. Like a helpful mediator.

**Current case**: {case_name}
**Children**: {children_text}

Start by warmly greeting the parent and letting them know they'll fill in names and contact info separately - you're here to help them figure out the custody details in plain language."""

    async def send_message(
        self, agreement_id: str, user: User, message: str
    ) -> Dict[str, Any]:
        """
        Process user message and return ARIA response.

        Args:
            agreement_id: Agreement being built
            user: Current user
            message: User's message

        Returns:
            dict with assistant's response and conversation state
        """
        # Get or create conversation
        conversation = await self.get_or_create_conversation(agreement_id, user)

        # Verify user has access to this agreement
        agreement_result = await self.db.execute(
            select(Agreement).where(Agreement.id == agreement_id)
        )
        agreement = agreement_result.scalar_one_or_none()
        if not agreement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agreement not found"
            )

        # Get case info for context
        case_result = await self.db.execute(
            select(Case).where(Case.id == agreement.case_id)
        )
        case = case_result.scalar_one_or_none()

        # Get children names (would need to join with children table)
        children_names = []  # TODO: Query children

        # Add user message to conversation
        conversation.messages.append({
            "role": "user",
            "content": message,
            "timestamp": datetime.utcnow().isoformat()
        })
        # Mark JSON field as modified so SQLAlchemy saves it
        flag_modified(conversation, "messages")

        # Generate system prompt
        system_prompt = self._get_system_prompt(
            case.case_name if case else "your case",
            children_names
        )

        # Call OpenAI API
        try:
            # Format messages for OpenAI (add system message at the start)
            openai_messages = [
                {"role": "system", "content": system_prompt}
            ] + [
                {"role": msg["role"], "content": msg["content"]}
                for msg in conversation.messages
            ]

            response = self.client.chat.completions.create(
                model="gpt-4-turbo",
                max_tokens=2000,
                messages=openai_messages
            )

            assistant_message = response.choices[0].message.content

            # Add assistant response to conversation
            conversation.messages.append({
                "role": "assistant",
                "content": assistant_message,
                "timestamp": datetime.utcnow().isoformat()
            })
            # Mark JSON field as modified so SQLAlchemy saves it
            flag_modified(conversation, "messages")

            # Save conversation
            await self.db.commit()
            await self.db.refresh(conversation)

            return {
                "response": assistant_message,
                "conversation_id": conversation.id,
                "message_count": len(conversation.messages),
                "is_finalized": conversation.is_finalized
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error communicating with ARIA: {str(e)}"
            )

    async def generate_summary(
        self, agreement_id: str, user: User
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive summary of the conversation.

        Returns parent-readable summary of all discussed topics.
        """
        conversation = await self.get_or_create_conversation(agreement_id, user)

        if len(conversation.messages) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not enough conversation to generate summary"
            )

        # Create summary prompt
        summary_prompt = """Based on our conversation, please create a comprehensive summary of the custody arrangement discussed.

Format it as a clear, parent-readable document with sections:
- Your Information
- Other Parent's Information
- Children's Information
- Legal Custody
- Physical Custody
- Parenting Schedule
- Holidays and Vacations
- Decision-Making
- Communication
- Exchanges
- Finances
- Other Provisions

For each section, include what was discussed. If something wasn't covered, note "Not discussed yet."

Use simple, clear language that both parents can understand."""

        # Add summary request to messages
        messages = conversation.messages + [{
            "role": "user",
            "content": summary_prompt
        }]

        # Get case info
        agreement_result = await self.db.execute(
            select(Agreement).where(Agreement.id == agreement_id)
        )
        agreement = agreement_result.scalar_one_or_none()

        case_result = await self.db.execute(
            select(Case).where(Case.id == agreement.case_id)
        )
        case = case_result.scalar_one_or_none()

        system_prompt = self._get_system_prompt(
            case.case_name if case else "your case",
            []
        )

        try:
            # Format messages for OpenAI
            openai_messages = [
                {"role": "system", "content": system_prompt}
            ] + [
                {"role": msg["role"], "content": msg["content"]}
                for msg in messages
            ]

            response = self.client.chat.completions.create(
                model="gpt-4-turbo",
                max_tokens=3000,
                messages=openai_messages
            )

            summary = response.choices[0].message.content

            # Save summary
            conversation.summary = summary
            await self.db.commit()

            return {
                "summary": summary,
                "conversation_id": conversation.id
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error generating summary: {str(e)}"
            )

    async def generate_summary_v2(
        self, agreement_id: str, user: User
    ) -> Dict[str, Any]:
        """
        Generate a summary for v2 agreements (7 or 5 sections).

        Returns parent-readable summary with v2 section structure.
        """
        conversation = await self.get_or_create_conversation(agreement_id, user)

        if len(conversation.messages) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not enough conversation to generate summary"
            )

        # Get agreement to check version
        agreement_result = await self.db.execute(
            select(Agreement).where(Agreement.id == agreement_id)
        )
        agreement = agreement_result.scalar_one_or_none()
        version = getattr(agreement, 'agreement_version', 'v2_standard')

        # V2 summary prompt - 7 sections for standard, 5 for lite
        if version == 'v2_lite':
            summary_prompt = """Based on our conversation, please create a clear summary of the custody arrangement.

Format it with these 5 sections:
1. **Parties & Children** - Who is covered by this agreement
2. **Scope & Duration** - When the agreement starts and how long it lasts
3. **Parenting Time** - The regular schedule pattern
4. **Logistics & Expenses** - Exchange locations, transportation, and expense sharing
5. **Acknowledgment** - Confirmation both parents agree

For each section, summarize what was discussed. Note any items not yet covered.
Use simple, clear language. Keep it brief and practical."""
        else:
            summary_prompt = """Based on our conversation, please create a clear summary of the custody arrangement.

Format it with these 7 sections:
1. **Parties & Children** - Who is covered by this agreement
2. **Scope & Duration** - When the agreement starts, how long it lasts, and review schedule
3. **Parenting Time** - The regular schedule pattern (focus on baseline, not holidays)
4. **Logistics & Transitions** - Exchange locations, transportation, and communication
5. **Decision-Making & Communication** - Who makes decisions and how you communicate
6. **Expenses** - How shared expenses are split (not child support)
7. **Modification & Disputes** - How to handle changes and disagreements

For each section, summarize what was discussed. Note any items not yet covered.
Use simple, clear language. Keep it practical - holiday details and travel plans can be added later as Quick Accords."""

        # Add summary request to messages
        messages = conversation.messages + [{
            "role": "user",
            "content": summary_prompt
        }]

        # Get case/family file info for context
        case_name = "your family"
        if agreement.case_id:
            case_result = await self.db.execute(
                select(Case).where(Case.id == agreement.case_id)
            )
            case = case_result.scalar_one_or_none()
            if case:
                case_name = case.case_name

        system_prompt = self._get_system_prompt_v2(case_name, [], version)

        try:
            openai_messages = [
                {"role": "system", "content": system_prompt}
            ] + [
                {"role": msg["role"], "content": msg["content"]}
                for msg in messages
            ]

            response = self.client.chat.completions.create(
                model="gpt-4-turbo",
                max_tokens=2000,
                messages=openai_messages
            )

            summary = response.choices[0].message.content

            # Save summary
            conversation.summary = summary
            await self.db.commit()

            return {
                "summary": summary,
                "conversation_id": conversation.id,
                "agreement_version": version
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error generating summary: {str(e)}"
            )

    async def extract_structured_data(
        self, agreement_id: str, user: User
    ) -> Dict[str, Any]:
        """
        Extract structured data from conversation and summary.

        Converts natural language to database-ready structured data for all 18 sections.
        """
        conversation = await self.get_or_create_conversation(agreement_id, user)

        if not conversation.summary:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please generate summary first"
            )

        # Build conversation history string
        conversation_history = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in conversation.messages
        ])

        # Add summary to conversation
        conversation_history += f"\n\nSUMMARY:\n{conversation.summary}"

        # Generate comprehensive extraction prompt using the schema
        extraction_prompt = get_extraction_prompt(conversation_history)

        try:
            # Use OpenAI to extract structured data
            response = self.client.chat.completions.create(
                model="gpt-4-turbo",
                max_tokens=4096,  # Maximum for GPT-4-turbo
                temperature=0.1,  # Low temperature for consistent extraction
                messages=[
                    {"role": "system", "content": "You are a precise data extraction assistant. Return only valid JSON matching the provided schema."},
                    {"role": "user", "content": extraction_prompt}
                ]
            )

            # Extract JSON from response
            json_text = response.choices[0].message.content

            # Try to parse JSON
            try:
                extracted_data = json.loads(json_text)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code blocks
                import re
                json_match = re.search(r'```(?:json)?\s*(\{.*\})\s*```', json_text, re.DOTALL)
                if json_match:
                    extracted_data = json.loads(json_match.group(1))
                else:
                    raise ValueError("Could not parse JSON from response")

            # Save extracted data
            conversation.extracted_data = extracted_data
            flag_modified(conversation, "extracted_data")
            await self.db.commit()

            return {
                "extracted_data": extracted_data,
                "conversation_id": conversation.id
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error extracting data: {str(e)}"
            )

    def generate_extraction_preview(self, extracted_data: Dict[str, Any]) -> Dict[str, List[Dict[str, str]]]:
        """
        Generate a human-readable preview of what was extracted.

        Returns a dict with section names as keys and list of field mappings as values.
        """
        preview = {}

        # Section mapping with friendly names
        section_info = {
            "section_4_legal_custody": ("Legal Custody", ["education_decisions", "medical_decisions", "religious_decisions", "extracurricular_decisions"]),
            "section_5_physical_custody": ("Physical Custody", ["arrangement_type", "percentage_split", "primary_residential_parent"]),
            "section_6_parenting_schedule": ("Parenting Schedule", ["weekly_pattern", "mother_days", "father_days", "midweek_visits"]),
            "section_7_holiday_schedule": ("Holiday Schedule", ["thanksgiving", "christmas_eve", "christmas_day", "fathers_day", "mothers_day", "child_birthday"]),
            "section_8_exchange_logistics": ("Exchange Logistics", ["exchange_location", "exchange_day", "exchange_time", "who_transports"]),
            "section_9_transportation": ("Transportation", ["cost_arrangement", "who_pays"]),
            "section_10_child_support": ("Child Support", ["has_support", "amount", "payer", "due_date", "health_insurance"]),
            "section_11_medical_healthcare": ("Medical & Healthcare", ["insurance_provider", "routine_appointments", "major_medical", "emergency_treatment"]),
            "section_12_education": ("Education", ["school_choice", "school_records_access", "conferences"]),
            "section_13_parent_communication": ("Parent Communication", ["primary_method", "response_time_urgent", "schedule_change_notice"]),
            "section_14_child_communication": ("Child Communication", ["phone_calls_allowed", "video_calls_allowed", "call_frequency"]),
            "section_15_travel": ("Travel", ["domestic_notice", "international_consent", "vacation_time_amount"]),
            "section_16_relocation": ("Relocation", ["notice_days", "distance_trigger", "process"]),
            "section_17_dispute_resolution": ("Dispute Resolution", ["first_step", "mediation_required"]),
            "section_18_other_provisions": ("Other Provisions", ["right_of_first_refusal", "new_partners", "discipline"]),
        }

        for section_key, (section_name, key_fields) in section_info.items():
            section_data = extracted_data.get(section_key)
            if section_data and isinstance(section_data, dict):
                fields = []
                for field_name, field_value in section_data.items():
                    if field_value is not None and field_value != "":
                        # Make field name readable
                        readable_name = field_name.replace('_', ' ').title()
                        fields.append({
                            "field": readable_name,
                            "value": str(field_value)
                        })

                if fields:  # Only add section if it has data
                    preview[section_name] = fields

        return preview

    async def finalize_agreement(
        self, agreement_id: str, user: User
    ) -> Agreement:
        """
        Finalize the conversation and write structured data to agreement sections.

        This converts the extracted data into actual agreement sections.
        """
        conversation = await self.get_or_create_conversation(agreement_id, user)

        if not conversation.extracted_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please extract structured data first"
            )

        # Get agreement
        agreement_result = await self.db.execute(
            select(Agreement).where(Agreement.id == agreement_id)
        )
        agreement = agreement_result.scalar_one_or_none()

        # Map extracted data to sections 4-18 ONLY
        # Sections 1-3 (parent info, other parent info, children) are entered manually
        data = conversation.extracted_data

        # Section mappings for sections 4-18 (skip 1-3 which are manual entry)
        section_mappings = [
            # SKIP sections 1-3 - these are filled manually by parents
            ("4", "legal_custody", "Legal Custody", data.get("section_4_legal_custody")),
            ("5", "physical_custody", "Physical Custody", data.get("section_5_physical_custody")),
            ("6", "parenting_schedule", "Regular Parenting Schedule", data.get("section_6_parenting_schedule")),
            ("7", "holiday_schedule", "Holiday Schedule", data.get("section_7_holiday_schedule")),
            ("8", "exchange_logistics", "Exchange Logistics", data.get("section_8_exchange_logistics")),
            ("9", "transportation", "Transportation", data.get("section_9_transportation")),
            ("10", "child_support", "Child Support", data.get("section_10_child_support")),
            ("11", "medical_healthcare", "Medical & Healthcare", data.get("section_11_medical_healthcare")),
            ("12", "education", "Education", data.get("section_12_education")),
            ("13", "parent_communication", "Parent Communication", data.get("section_13_parent_communication")),
            ("14", "child_communication", "Child Communication", data.get("section_14_child_communication")),
            ("15", "travel", "Travel", data.get("section_15_travel")),
            ("16", "relocation", "Relocation", data.get("section_16_relocation")),
            ("17", "dispute_resolution", "Dispute Resolution", data.get("section_17_dispute_resolution")),
            ("18", "other_provisions", "Other Provisions", data.get("section_18_other_provisions")),
        ]

        for section_num, section_type, section_title, section_data in section_mappings:
            if section_data:
                # Find existing section
                result = await self.db.execute(
                    select(AgreementSection)
                    .where(AgreementSection.agreement_id == agreement_id)
                    .where(AgreementSection.section_number == section_num)
                )
                section = result.scalar_one_or_none()

                if section:
                    # Update existing
                    section.structured_data = section_data
                    section.content = json.dumps(section_data, indent=2)
                    section.is_completed = True
                else:
                    # Create new
                    section = AgreementSection(
                        agreement_id=agreement_id,
                        section_number=section_num,
                        section_type=section_type,
                        section_title=section_title,
                        content=json.dumps(section_data, indent=2),
                        structured_data=section_data,
                        display_order=int(section_num),
                        is_required=True,
                        is_completed=True
                    )
                    self.db.add(section)

        # Mark conversation as finalized
        conversation.is_finalized = True
        conversation.finalized_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(agreement)

        return agreement

    async def get_conversation_history(
        self, agreement_id: str, user: User
    ) -> Dict[str, Any]:
        """Get full conversation history."""
        conversation = await self.get_or_create_conversation(agreement_id, user)

        return {
            "conversation_id": conversation.id,
            "messages": conversation.messages,
            "summary": conversation.summary,
            "extracted_data": conversation.extracted_data,
            "is_finalized": conversation.is_finalized,
            "message_count": len(conversation.messages)
        }

    # =========================================================================
    # V2 AGREEMENT METHODS - Simplified 7-Section Structure
    # =========================================================================

    def assess_conflict_level(
        self, conversation_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze conversation for conflict signals to determine agreement complexity.

        Args:
            conversation_history: List of conversation messages

        Returns:
            Dict with conflict_level, signals_detected, and recommendation
        """
        # Combine all messages into text for analysis
        text = " ".join([
            msg.get("content", "").lower()
            for msg in conversation_history
            if msg.get("role") == "user"
        ])

        signals_detected = []
        conflict_scores = {"high": 0, "moderate": 0, "low": 0}

        # Check for conflict signals
        for level, keywords in CONFLICT_SIGNALS.items():
            for keyword in keywords:
                if keyword.lower() in text:
                    signals_detected.append(f"{level}: {keyword}")
                    conflict_scores[level] += 1

        # Determine overall conflict level
        if conflict_scores["high"] >= 2:
            conflict_level = ConflictLevel.HIGH
            recommendation = AgreementVersionType.V1  # ARIA Professional
            reason = "High-conflict signals detected. Recommending comprehensive 18-section agreement."
        elif conflict_scores["high"] >= 1 or conflict_scores["moderate"] >= 3:
            conflict_level = ConflictLevel.MODERATE
            recommendation = AgreementVersionType.V2_STANDARD  # 7 sections
            reason = "Moderate complexity detected. Using standard 7-section agreement."
        elif conflict_scores["low"] >= 2 and conflict_scores["moderate"] == 0:
            conflict_level = ConflictLevel.LOW
            recommendation = AgreementVersionType.V2_LITE  # 5 sections
            reason = "Cooperative relationship detected. Using simplified 5-section agreement."
        else:
            conflict_level = ConflictLevel.MODERATE
            recommendation = AgreementVersionType.V2_STANDARD
            reason = "Using standard 7-section agreement as default."

        return {
            "conflict_level": conflict_level.value,
            "recommended_version": recommendation.value,
            "signals_detected": signals_detected[:10],  # Limit to 10 signals
            "recommendation_reason": reason,
            "scores": conflict_scores
        }

    def get_agreement_version(
        self,
        conflict_level: str,
        has_financial_disputes: bool = False,
        user_preference: Optional[str] = None
    ) -> str:
        """
        Determine which agreement version to use.

        ARIA decides, not the user - but user can override if needed.

        Args:
            conflict_level: Result from assess_conflict_level
            has_financial_disputes: Whether there are unresolved financial issues
            user_preference: Optional user override

        Returns:
            Agreement version string (v2_standard, v2_lite, or v1)
        """
        # User override takes precedence if provided
        if user_preference in ["v1", "v2_standard", "v2_lite"]:
            return user_preference

        # Financial disputes bump up complexity
        if has_financial_disputes and conflict_level == "low":
            return AgreementVersionType.V2_STANDARD.value

        # Map conflict level to version
        version_map = {
            "low": AgreementVersionType.V2_LITE.value,
            "moderate": AgreementVersionType.V2_STANDARD.value,
            "high": AgreementVersionType.V1.value,
        }

        return version_map.get(conflict_level, AgreementVersionType.V2_STANDARD.value)

    def _get_system_prompt_v2(
        self,
        case_name: str,
        children_names: List[str],
        version: str = "v2_standard",
        current_section: Optional[str] = None
    ) -> str:
        """Generate ARIA system prompt for v2 simplified agreements."""
        children_text = ", ".join(children_names) if children_names else "your child(ren)"

        section_count = "7" if version == "v2_standard" else "5"
        version_name = "standard" if version == "v2_standard" else "simplified"

        section_guidance = ""
        if current_section and current_section in ARIA_SECTION_PROMPTS_V2:
            section_guidance = f"\n\nCURRENT SECTION FOCUS:\n{ARIA_SECTION_PROMPTS_V2[current_section]}"

        return f"""You are ARIA, an AI assistant helping parents create a SharedCare Agreement for {case_name}.

This is a {version_name} {section_count}-section agreement designed to be clear, practical, and court-friendly while being easy to complete.

YOUR APPROACH:
1. **Keep it simple**: Ask one question at a time, use plain language
2. **Focus on essentials**: Baseline schedule, exchange logistics, decision-making, and acknowledgment
3. **Skip the matrices**: Holiday schedules and travel plans go in separate Quick Accords later
4. **Be supportive**: Acknowledge co-parenting challenges, focus on what's best for {children_text}

THE {section_count} SECTIONS:
1. Parties & Children - Who is covered
2. Scope & Duration - When it's effective
3. Parenting Time - Regular schedule pattern
4. Logistics & Transitions - Exchange details
5. Decision-Making & Communication - Authority and methods
{f'6. Expenses & Financial Cooperation - Shared costs' if version == 'v2_standard' else ''}
{f'7. Modification, Disputes & Acknowledgment - Final steps' if version == 'v2_standard' else '5. Acknowledgment - Final confirmation'}

IMPORTANT:
- Don't ask for names/addresses/emails - parents enter those separately
- Don't create holiday matrices - offer Quick Accords for holidays later
- Keep answers short and focused
- Confirm understanding before moving on
- Use "you" and "your co-parent" (or their name if mentioned)
{section_guidance}

**Case**: {case_name}
**Children**: {children_text}

Start warmly and explain you'll help them build a simple, clear agreement."""

    async def send_message_v2(
        self, agreement_id: str, user: User, message: str, current_section: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process user message for v2 agreements.

        Args:
            agreement_id: Agreement being built
            user: Current user
            message: User's message
            current_section: Optional current section ID for focused guidance

        Returns:
            dict with assistant's response, section progress, and Quick Accord suggestions
        """
        conversation = await self.get_or_create_conversation(agreement_id, user)

        # Get agreement and check version
        agreement_result = await self.db.execute(
            select(Agreement).where(Agreement.id == agreement_id)
        )
        agreement = agreement_result.scalar_one_or_none()
        if not agreement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agreement not found"
            )

        version = getattr(agreement, 'agreement_version', 'v2_standard')

        # Get case info
        case_result = await self.db.execute(
            select(Case).where(Case.id == agreement.case_id)
        )
        case = case_result.scalar_one_or_none()

        children_names = []  # TODO: Query children

        # Add user message
        conversation.messages.append({
            "role": "user",
            "content": message,
            "timestamp": datetime.utcnow().isoformat(),
            "section": current_section
        })
        flag_modified(conversation, "messages")

        # Generate v2 system prompt
        system_prompt = self._get_system_prompt_v2(
            case.case_name if case else "your case",
            children_names,
            version,
            current_section
        )

        try:
            openai_messages = [
                {"role": "system", "content": system_prompt}
            ] + [
                {"role": msg["role"], "content": msg["content"]}
                for msg in conversation.messages
            ]

            response = self.client.chat.completions.create(
                model="gpt-4-turbo",
                max_tokens=1500,  # Shorter for v2
                messages=openai_messages
            )

            assistant_message = response.choices[0].message.content

            # Add assistant response
            conversation.messages.append({
                "role": "assistant",
                "content": assistant_message,
                "timestamp": datetime.utcnow().isoformat(),
                "section": current_section
            })
            flag_modified(conversation, "messages")

            await self.db.commit()
            await self.db.refresh(conversation)

            # Get section templates for progress tracking
            section_templates = get_section_templates(version)

            # Suggest Quick Accords based on current section
            quick_accord_suggestions = []
            if current_section:
                for accord in QUICK_ACCORD_SUGGESTIONS:
                    if current_section in accord.get("when_to_suggest", "").lower():
                        quick_accord_suggestions.append({
                            "id": accord["id"],
                            "title": accord["title"],
                            "description": accord["description"]
                        })

            return {
                "response": assistant_message,
                "conversation_id": conversation.id,
                "message_count": len(conversation.messages),
                "is_finalized": conversation.is_finalized,
                "agreement_version": version,
                "total_sections": len(section_templates),
                "current_section": current_section,
                "quick_accord_suggestions": quick_accord_suggestions
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error communicating with ARIA: {str(e)}"
            )

    async def extract_structured_data_v2(
        self, agreement_id: str, user: User
    ) -> Dict[str, Any]:
        """
        Extract structured data for v2 agreements (7 or 5 sections).
        """
        conversation = await self.get_or_create_conversation(agreement_id, user)

        # Get agreement version
        agreement_result = await self.db.execute(
            select(Agreement).where(Agreement.id == agreement_id)
        )
        agreement = agreement_result.scalar_one_or_none()
        version = getattr(agreement, 'agreement_version', 'v2_standard')

        # Build conversation history
        conversation_history = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in conversation.messages
        ])

        # Use v2 extraction prompt
        extraction_prompt = get_extraction_prompt_v2(conversation_history, version)

        try:
            response = self.client.chat.completions.create(
                model="gpt-4-turbo",
                max_tokens=3000,
                temperature=0.1,
                messages=[
                    {"role": "system", "content": "Extract structured data from the conversation. Return only valid JSON."},
                    {"role": "user", "content": extraction_prompt}
                ]
            )

            json_text = response.choices[0].message.content

            try:
                extracted_data = json.loads(json_text)
            except json.JSONDecodeError:
                import re
                json_match = re.search(r'```(?:json)?\s*(\{.*\})\s*```', json_text, re.DOTALL)
                if json_match:
                    extracted_data = json.loads(json_match.group(1))
                else:
                    raise ValueError("Could not parse JSON from response")

            conversation.extracted_data = extracted_data
            flag_modified(conversation, "extracted_data")
            await self.db.commit()

            return {
                "extracted_data": extracted_data,
                "conversation_id": conversation.id,
                "agreement_version": version
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error extracting data: {str(e)}"
            )

    async def finalize_agreement_v2(
        self, agreement_id: str, user: User
    ) -> Agreement:
        """
        Finalize v2 agreement and write structured data to sections.
        """
        conversation = await self.get_or_create_conversation(agreement_id, user)

        if not conversation.extracted_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please extract structured data first"
            )

        agreement_result = await self.db.execute(
            select(Agreement).where(Agreement.id == agreement_id)
        )
        agreement = agreement_result.scalar_one_or_none()

        version = getattr(agreement, 'agreement_version', 'v2_standard')
        section_templates = get_section_templates(version)
        data = conversation.extracted_data

        # Create sections from extracted data
        for template in section_templates:
            section_id = template.get("section_id")
            section_data = data.get(section_id, {})

            if section_data:
                result = await self.db.execute(
                    select(AgreementSection)
                    .where(AgreementSection.agreement_id == agreement_id)
                    .where(AgreementSection.section_number == template["section_number"])
                )
                section = result.scalar_one_or_none()

                if section:
                    section.structured_data = section_data
                    section.content = json.dumps(section_data, indent=2)
                    section.is_completed = True
                else:
                    section = AgreementSection(
                        agreement_id=agreement_id,
                        section_number=template["section_number"],
                        section_type=template["section_type"],
                        section_title=template["section_title"],
                        content=json.dumps(section_data, indent=2),
                        structured_data=section_data,
                        display_order=template["display_order"],
                        is_required=template["is_required"],
                        is_completed=True
                    )
                    self.db.add(section)

        # Mark conversation as finalized
        conversation.is_finalized = True
        conversation.finalized_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(agreement)

        return agreement

    def generate_extraction_preview_v2(
        self, extracted_data: Dict[str, Any], version: str = "v2_standard"
    ) -> Dict[str, List[Dict[str, str]]]:
        """
        Generate a human-readable preview of v2 extracted data.

        Returns a dict with section names as keys and list of field mappings as values.
        """
        preview = {}

        # V2 Standard section info (7 sections)
        section_info_standard = {
            "parties_children": ("Parties & Children", {
                "parent_a": "Parent A",
                "parent_b": "Parent B",
                "children": "Children",
                "current_arrangements": "Current Arrangements"
            }),
            "scope_duration": ("Scope & Duration", {
                "effective_date": "Effective Date",
                "duration_type": "Duration",
                "end_date": "End Date",
                "review_schedule": "Review Schedule",
                "amendment_process": "Amendment Process"
            }),
            "parenting_time": ("Parenting Time", {
                "primary_residence": "Primary Residence",
                "schedule_pattern": "Schedule Pattern",
                "custom_pattern_description": "Custom Pattern",
                "transition_day": "Transition Day",
                "transition_time": "Transition Time",
                "schedule_notes": "Schedule Notes"
            }),
            "logistics_transitions": ("Logistics & Transitions", {
                "exchange_location": "Exchange Location",
                "exchange_location_address": "Exchange Address",
                "transportation_responsibility": "Transportation",
                "transition_communication": "Communication Method",
                "backup_plan": "Backup Plan"
            }),
            "decision_communication": ("Decision-Making & Communication", {
                "major_decision_authority": "Major Decisions",
                "decision_categories": "Decision Categories",
                "communication_platform": "Communication Platform",
                "response_timeframe": "Response Timeframe",
                "emergency_contact_order": "Emergency Contact Order"
            }),
            "expenses_financial": ("Expenses & Financial", {
                "expense_categories": "Expense Categories",
                "split_ratio": "Split Ratio",
                "custom_split_details": "Custom Split Details",
                "reimbursement_window": "Reimbursement Window",
                "documentation_required": "Documentation Required",
                "payment_method": "Payment Method"
            }),
            "modification_disputes": ("Modification & Disputes", {
                "modification_triggers": "Modification Triggers",
                "dispute_resolution_steps": "Dispute Resolution Steps",
                "escalation_timeframe": "Escalation Timeframe",
                "parent_a_acknowledgment": "Parent A Acknowledged",
                "parent_b_acknowledgment": "Parent B Acknowledged",
                "acknowledgment_date": "Acknowledgment Date"
            })
        }

        # V2 Lite section info (5 sections)
        section_info_lite = {
            "parties_children": ("Parties & Children", {
                "parent_a_name": "Parent A Name",
                "parent_b_name": "Parent B Name",
                "children": "Children"
            }),
            "scope_duration": ("Scope & Duration", {
                "effective_date": "Effective Date",
                "review_schedule": "Review Schedule"
            }),
            "parenting_time": ("Parenting Time", {
                "primary_residence": "Primary Residence",
                "schedule_pattern": "Schedule Pattern",
                "transition_day": "Transition Day",
                "transition_time": "Transition Time"
            }),
            "logistics_expenses": ("Logistics & Expenses", {
                "exchange_location": "Exchange Location",
                "transportation_responsibility": "Transportation",
                "expense_split": "Expense Split",
                "communication_method": "Communication Method"
            }),
            "acknowledgment": ("Acknowledgment", {
                "parent_a_acknowledgment": "Parent A Acknowledged",
                "parent_b_acknowledgment": "Parent B Acknowledged",
                "acknowledgment_date": "Acknowledgment Date"
            })
        }

        # Human-readable value labels
        value_labels = {
            "week_on_week_off": "Week-on, week-off",
            "2-2-3": "2-2-3 rotation",
            "every_other_weekend": "Every other weekend",
            "parent_a": "Parent A",
            "parent_b": "Parent B",
            "equal": "Equal/Shared",
            "joint": "Joint decision",
            "indefinite": "Until modified",
            "fixed_term": "Fixed term",
            "until_child_18": "Until child turns 18",
            "annual": "Annually",
            "every_6_months": "Every 6 months",
            "as_needed": "As needed",
            "mutual_written": "Mutual written agreement",
            "30_day_notice": "30 days notice",
            "mediation_required": "Mediation required",
            "school": "School",
            "parent_a_home": "Parent A's home",
            "parent_b_home": "Parent B's home",
            "neutral_location": "Neutral location",
            "picking_up_parent": "Parent picking up",
            "dropping_off_parent": "Parent dropping off",
            "shared": "Shared responsibility",
            "alternate": "Alternating",
            "commonground": "CommonGround app",
            "text": "Text message",
            "email": "Email",
            "phone": "Phone call",
            "talking_parents": "TalkingParents",
            "24_hours": "24 hours",
            "48_hours": "48 hours",
            "72_hours": "72 hours",
            "same_day_urgent": "Same day for urgent",
            "50/50": "50/50 split",
            "60/40": "60/40 split",
            "70/30": "70/30 split",
            "income_based": "Based on income",
            "14_days": "14 days",
            "30_days": "30 days",
            "60_days": "60 days",
            "commonground_clearfund": "CommonGround ClearFund",
            "venmo": "Venmo",
            "zelle": "Zelle",
            "check": "Check",
            "cash": "Cash"
        }

        # Select appropriate section info based on version
        section_info = section_info_lite if version == "v2_lite" else section_info_standard

        for section_key, (section_name, field_map) in section_info.items():
            section_data = extracted_data.get(section_key)
            if section_data and isinstance(section_data, dict):
                fields = []
                for field_key, field_label in field_map.items():
                    field_value = section_data.get(field_key)
                    if field_value is not None and field_value != "" and field_value != []:
                        # Handle nested objects (like parent_a, parent_b, decision_categories)
                        if isinstance(field_value, dict):
                            nested_parts = []
                            for k, v in field_value.items():
                                if v:
                                    readable_key = k.replace('_', ' ').title()
                                    readable_val = value_labels.get(v, v) if isinstance(v, str) else str(v)
                                    nested_parts.append(f"{readable_key}: {readable_val}")
                            if nested_parts:
                                fields.append({
                                    "field": field_label,
                                    "value": "; ".join(nested_parts)
                                })
                        # Handle lists (like children, expense_categories)
                        elif isinstance(field_value, list):
                            if field_value:
                                if isinstance(field_value[0], dict):
                                    # List of objects (children)
                                    items = []
                                    for item in field_value:
                                        if isinstance(item, dict):
                                            name = item.get('name', 'Unknown')
                                            dob = item.get('date_of_birth', '')
                                            items.append(f"{name}" + (f" (DOB: {dob})" if dob else ""))
                                    fields.append({
                                        "field": field_label,
                                        "value": ", ".join(items)
                                    })
                                else:
                                    # List of strings
                                    fields.append({
                                        "field": field_label,
                                        "value": ", ".join(str(v) for v in field_value)
                                    })
                        # Handle booleans
                        elif isinstance(field_value, bool):
                            fields.append({
                                "field": field_label,
                                "value": "Yes" if field_value else "No"
                            })
                        # Handle strings
                        else:
                            readable_value = value_labels.get(field_value, field_value)
                            fields.append({
                                "field": field_label,
                                "value": str(readable_value)
                            })

                if fields:
                    preview[section_name] = fields

        return preview

    def get_quick_accord_suggestions(
        self, completed_sections: List[str]
    ) -> List[Dict[str, str]]:
        """
        Get relevant Quick Accord suggestions based on completed sections.

        Args:
            completed_sections: List of completed section IDs

        Returns:
            List of relevant Quick Accord suggestions
        """
        suggestions = []
        for accord in QUICK_ACCORD_SUGGESTIONS:
            trigger = accord.get("when_to_suggest", "").lower()
            for section in completed_sections:
                if section.lower() in trigger:
                    suggestions.append({
                        "id": accord["id"],
                        "title": accord["title"],
                        "description": accord["description"]
                    })
                    break
        return suggestions
