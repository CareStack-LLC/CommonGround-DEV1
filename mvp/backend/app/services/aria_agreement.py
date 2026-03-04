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
