"""
ARIA Paralegal Service - Legal Intake Conversation Engine.

Conducts conversational interviews with parents to gather information
for California family court forms (FL-300, FL-311, FL-320).

Key principles:
- Never gives legal advice
- Conversational, not form-based
- Extracts structured data from natural language
- Generates plain English summaries
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
import json

import anthropic
from openai import OpenAI
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified

from app.models.intake import IntakeSession, IntakeExtraction, IntakeStatus
from app.models.court import CourtProfessional
from app.models.professional import ProfessionalProfile
from app.models.case import Case
from app.models.child import Child
from app.models.user import User
from app.core.config import settings


class AriaParalegalService:
    """Service for ARIA Paralegal legal intake conversations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def _get_system_prompt(
        self,
        professional_name: str,
        professional_role: str,
        target_forms: List[str],
        parent_role: str,
        children_names: List[str],
        custom_questions: Optional[List[str]] = None,
        template_id: Optional[str] = None,
    ) -> str:
        """Generate ARIA Paralegal system prompt, driven by intake template."""

        from app.services.intake_templates import get_intake_template, build_sections_prompt

        # Resolve template (fall back to comprehensive-custody)
        template = get_intake_template(template_id or "comprehensive-custody")

        form_descriptions = {
            "FL-300": "Request for Order (initiating petition)",
            "FL-311": "Child Custody and Visitation Application",
            "FL-312": "Child Support Information and Order Attachment",
            "FL-320": "Responsive Declaration (responding to petition)",
            "FL-341": "Child Custody and Visitation Stipulation",
            "FL-150": "Income and Expense Declaration",
            "FL-342": "Child Support Information",
            "DV-100": "Request for Domestic Violence Restraining Order",
            "DV-110": "Temporary Restraining Order",
        }

        forms_text = ", ".join([
            f"{f} ({form_descriptions.get(f, f)})" for f in target_forms
        ]) if target_forms else "no specific forms"

        children_text = ", ".join(children_names) if children_names else "your children"

        custom_q_text = ""
        if custom_questions:
            custom_q_text = f"""

CUSTOM QUESTIONS FROM {professional_name.upper()}:
After covering the standard topics, also ask about:
{chr(10).join(f'- {q}' for q in custom_questions)}"""

        # Build sections from template
        if template:
            template_name = template.name
            template_description = template.description
            estimated_time = template.estimated_time
            sections_text = build_sections_prompt(template)
        else:
            template_name = "General Intake"
            template_description = "Standard intake conversation"
            estimated_time = 30
            sections_text = "1. Gather basic information\n2. Understand the current situation\n3. Determine needs and goals"

        return f"""You are ARIA Paralegal, an AI intake assistant helping gather information
for a family law case. You are working on behalf of {professional_name}, {professional_role},
who will review everything you collect.

INTAKE TYPE: {template_name}
PURPOSE: {template_description}
ESTIMATED TIME: ~{estimated_time} minutes

YOUR ROLE:
- Ask questions in plain, conversational English
- Never use legal jargon (if you must use a legal term, explain it simply)
- Listen empathetically - this is a difficult situation for the parent
- Extract information needed for: {forms_text}
- Organize answers into structured data
- Keep responses focused and not too long

YOU MUST NEVER:
- Give legal advice of any kind
- Recommend what the parent should request
- Interpret the law or predict outcomes
- Suggest what's "best" for the children
- Take sides between parents
- Make judgments about either parent's behavior
- Promise any particular outcome

HOW TO HANDLE COMMON SITUATIONS:
- If asked for legal advice: "That's a great question for {professional_name}. My job is just to gather information so they can help you."
- If parent is distressed: "I understand this is difficult. Would you like to take a break and continue later?"
- If answer is unclear: Gently ask for clarification with a specific follow-up question
- If answer is off-topic: Acknowledge briefly, then guide back politely
- If parent asks "what should I do?": "I can't advise you on that - that's {professional_name}'s role. What I can do is make sure they have all the information they need."

SECTIONS TO COVER:
{sections_text}{custom_q_text}

PACING:
- Ask ONE main question at a time
- Cover REQUIRED sections thoroughly; OPTIONAL sections can be brief or skipped if the parent has no input
- Don't rush through sections — let the parent share freely
- If a section isn't relevant (e.g., "Relocation" when nobody is moving), acknowledge and move on
- Periodically summarize what you've gathered so far
- The estimated time is ~{estimated_time} min — pace accordingly

CONVERSATION STYLE:
- Use the parent's first name if known
- Be warm but professional
- Ask one main question at a time
- Acknowledge what they share before moving on
- Use phrases like "I want to make sure I understand..." and "Let me confirm..."
- End each response with a clear question or next step

WHEN GATHERING SPECIFIC INFORMATION:
- Be specific: "What time on Friday?" not just "Friday"
- Ask about regular school year vs. summer separately
- Holidays are important - ask about major ones
- Get details on exchange locations and transportation
- For financial info, ask for monthly amounts

Current form targets: {forms_text}
Professional: {professional_name} ({professional_role})
Parent role: {parent_role}
Children: {children_text}"""

    async def _get_professional_context(self, professional_id: str) -> Dict[str, str]:
        """Get professional name and role from either profile type."""
        # Try CourtProfessional first
        prof_result = await self.db.execute(
            select(CourtProfessional).where(CourtProfessional.id == professional_id)
        )
        professional = prof_result.scalar_one_or_none()
        
        if professional:
            return {
                "name": professional.full_name,
                "role": professional.role or "Legal Professional"
            }
            
        # Try ProfessionalProfile
        profile_result = await self.db.execute(
            select(ProfessionalProfile).where(
                ProfessionalProfile.id == professional_id
            ).options(
                selectinload(ProfessionalProfile.user)
            )
        )
        profile = profile_result.scalar_one_or_none()
        
        if profile and profile.user:
            role_map = {
                "attorney": "Attorney",
                "paralegal": "Paralegal",
                "mediator": "Mediator",
                "intake_coordinator": "Intake Coordinator"
            }
            return {
                "name": f"{profile.user.first_name} {profile.user.last_name}",
                "role": role_map.get(profile.professional_type, "Legal Professional")
            }
            
        return {
            "name": "Your Attorney",
            "role": "Legal Professional"
        }

    def _get_initial_message(
        self,
        professional_name: str,
        target_forms: List[str],
        template_id: Optional[str] = None,
    ) -> str:
        """Generate ARIA's opening message based on the intake template."""

        from app.services.intake_templates import get_intake_template

        template = get_intake_template(template_id or "comprehensive-custody")

        if template:
            purpose_map = {
                "comprehensive-custody": "gathering detailed information about your custody and co-parenting situation",
                "custody-only": "gathering information about custody and visitation arrangements",
                "child-support": "gathering information about child support",
                "modification": "understanding what changes you need to your existing court order",
                "visitation-only": "gathering information about visitation arrangements",
                "domestic-violence-screening": "gathering information about your situation in a safe and supportive way",
                "relocation": "gathering information about your planned relocation and how it affects custody",
                "initial-consultation": "gathering some basic information before your consultation",
            }
            purpose_text = purpose_map.get(
                template.id,
                f"gathering information for {template.name.lower()}"
            )
        else:
            purpose_text = "gathering information about your custody situation"
            if "FL-320" in target_forms:
                purpose_text = "helping you respond to the custody petition you received"
            elif "FL-300" in target_forms or "FL-311" in target_forms:
                purpose_text = "gathering information about your custody preferences"

        return f"""Hi! I'm ARIA, an AI assistant working with {professional_name}'s office. I'm here to help with {purpose_text}.

I'll ask you questions in plain English - no confusing legal forms to fill out. Your answers will be organized into the documents {professional_name} needs.

Before we start, I want to be clear: **I'm an AI assistant, not a lawyer.** I won't give you legal advice. I'm just here to listen carefully and make sure your information is accurate.

Everything you share will go directly to {professional_name} for review.

Ready to begin? First, could you tell me a little about yourself and your situation?"""

    async def start_session(
        self,
        session: IntakeSession
    ) -> Dict[str, Any]:
        """
        Start an intake conversation session.

        Returns the initial ARIA message.
        """
        # Get professional info
        prof_context = await self._get_professional_context(session.professional_id)
        professional_name = prof_context["name"]
        professional_role = prof_context["role"]

        # Get case info for context
        case_result = await self.db.execute(
            select(Case).where(Case.id == session.case_id)
        )
        case = case_result.scalar_one_or_none()

        # Get children info
        children_names = []
        if case:
            children_result = await self.db.execute(
                select(Child).where(Child.case_id == case.id)
            )
            children = children_result.scalars().all()
            children_names = [c.first_name for c in children]

        # Generate initial message
        initial_message = self._get_initial_message(
            professional_name,
            session.target_forms,
            template_id=getattr(session, 'template_id', None),
        )

        # Update session
        session.status = IntakeStatus.IN_PROGRESS.value
        session.started_at = datetime.utcnow()
        session.messages = [{
            "role": "assistant",
            "content": initial_message,
            "timestamp": datetime.utcnow().isoformat()
        }]
        session.aria_provider = "openai"  # Force OpenAI for new sessions
        session.message_count = 1
        flag_modified(session, "messages")

        await self.db.commit()
        await self.db.refresh(session)

        return {
            "response": initial_message,
            "message_count": 1,
            "is_complete": False
        }

    async def send_message(
        self,
        session: IntakeSession,
        message: str
    ) -> Dict[str, Any]:
        """
        Process a parent's message and return ARIA's response.
        """
        # Get professional info
        prof_context = await self._get_professional_context(session.professional_id)
        professional_name = prof_context["name"]
        professional_role = prof_context["role"]

        # Get case and parent info
        case_result = await self.db.execute(
            select(Case).where(Case.id == session.case_id)
        )
        case = case_result.scalar_one_or_none()

        parent_result = await self.db.execute(
            select(User).where(User.id == session.parent_id)
        )
        parent = parent_result.scalar_one_or_none()

        # Determine parent role
        parent_role = "Parent"
        if case and parent:
            if case.petitioner_id == parent.id:
                parent_role = "Petitioner"
            elif case.respondent_id == parent.id:
                parent_role = "Respondent"

        # Get children
        children_names = []
        if case:
            children_result = await self.db.execute(
                select(Child).where(Child.case_id == case.id)
            )
            children = children_result.scalars().all()
            children_names = [c.first_name for c in children]

        # Add user message to conversation
        session.messages.append({
            "role": "user",
            "content": message,
            "timestamp": datetime.utcnow().isoformat()
        })
        flag_modified(session, "messages")

        # Generate system prompt
        system_prompt = self._get_system_prompt(
            professional_name,
            professional_role,
            session.target_forms,
            parent_role,
            children_names,
            session.custom_questions,
            template_id=getattr(session, 'template_id', None),
        )

        # Call AI
        try:
            if session.aria_provider == "claude":
                response = await self._call_claude(system_prompt, session.messages)
            else:
                response = await self._call_openai(system_prompt, session.messages)

            # Add assistant response
            session.messages.append({
                "role": "assistant",
                "content": response,
                "timestamp": datetime.utcnow().isoformat()
            })
            session.message_count = len(session.messages)
            flag_modified(session, "messages")

            # Check if conversation seems complete
            is_complete = self._check_completion(session.messages, session.target_forms)

            await self.db.commit()
            await self.db.refresh(session)

            return {
                "response": response,
                "message_count": session.message_count,
                "is_complete": is_complete
            }

        except Exception as e:
            # Log error but don't expose details
            print(f"ARIA Paralegal error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error processing message. Please try again."
            )

    async def _call_claude(
        self,
        system_prompt: str,
        messages: List[dict]
    ) -> str:
        """Call Claude API for response."""
        # Format messages for Claude
        claude_messages = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in messages
        ]

        response = self.anthropic_client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=1500,
            system=system_prompt,
            messages=claude_messages
        )

        return response.content[0].text

    async def _call_openai(
        self,
        system_prompt: str,
        messages: List[dict]
    ) -> str:
        """Call OpenAI API for response (fallback)."""
        openai_messages = [
            {"role": "system", "content": system_prompt}
        ] + [
            {"role": msg["role"], "content": msg["content"]}
            for msg in messages
        ]

        response = self.openai_client.chat.completions.create(
            model="gpt-4o",
            max_tokens=1500,
            messages=openai_messages
        )

        return response.choices[0].message.content

    def _check_completion(
        self,
        messages: List[dict],
        target_forms: List[str]
    ) -> bool:
        """
        Check if the conversation has covered enough topics.

        Simple heuristic - in production this could be more sophisticated.
        """
        # Need at least 10 exchanges for a thorough intake
        # Need at least 3 exchanges (6 messages) for a basic intake
        if len(messages) < 6:
            return False

        # Look for summary/confirmation language in recent messages
        recent_assistant_msgs = [
            m["content"].lower()
            for m in messages[-2:]
            if m.get("role") == "assistant"
        ]

        completion_indicators = [
            "let me summarize",
            "to confirm",
            "before we finish",
            "is there anything else",
            "any other information",
            "we've covered",
            "all set",
            "thank you for sharing",
            "take care",
            "get in touch"
        ]

        for msg in recent_assistant_msgs:
            if any(indicator in msg for indicator in completion_indicators):
                return True
        
        # Also check if user says "goodbye" or "that's it"
        last_user_msg = next((m["content"].lower() for m in reversed(messages) if m.get("role") == "user"), "")
        user_completion_indicators = [
            "that's it",
            "thats it",
            "nothing else",
            "all done",
            "goodbye",
            "bye",
            "thank you",
            "thanks"
        ]
        
        if any(indicator == last_user_msg or indicator in last_user_msg for indicator in user_completion_indicators):
           return True

        return False

    async def generate_summary(
        self,
        session: IntakeSession
    ) -> str:
        """
        Generate a structured summary of the intake conversation.

        Produces both a plain-text overview (saved as aria_summary) and
        structured JSON sections (merged into extracted_data) so the
        professional detail page can render Current Situation, Client
        Goals, Key Concerns, and Recommended Next Steps.
        """
        if not session.messages or len(session.messages) < 2:
            return "Intake not yet started."

        summary_prompt = """You are ARIA, a paralegal AI that reviews intake conversations.
Analyze the conversation below and return a JSON object with these exact keys:

{
  "case_overview": "A 2-3 paragraph plain-English overview of the full case. Cover the family situation, current arrangements, what the parent is requesting, and any important context. Do not use legal jargon.",
  "current_situation": "A clear description of the current custody/living arrangement, including who the children live with, the current visitation schedule, and any existing court orders or informal agreements.",
  "children": [
    {"name": "Child Name", "age": 5, "special_needs": "null or description"}
  ],
  "goals": [
    "Each goal the parent expressed, as a clear one-sentence statement"
  ],
  "concerns": [
    "Each concern or worry the parent raised, as a clear one-sentence statement"
  ],
  "recommended_actions": [
    "Specific professional next steps based on the intake, e.g. 'File FL-300 motion for custody modification', 'Schedule mediation session', 'Request school records'"
  ],
  "client_info": {
    "name": "Parent's name if mentioned",
    "email": "Email if mentioned",
    "phone": "Phone if mentioned",
    "address": "Address if mentioned"
  },
  "confidence_score": 0.85
}

Rules:
- confidence_score: 0.0-1.0 reflecting how complete and clear the intake information is
- goals: at least 2-3 items if the parent discussed what they want
- concerns: at least 2-3 items if the parent mentioned worries
- recommended_actions: at least 3-5 actionable professional next steps
- Use null for any client_info fields not mentioned
- Return ONLY valid JSON, no markdown fences or extra text"""

        try:
            # Prepare conversation for summary
            conv_text = "\n\n".join([
                f"{'ARIA' if m['role'] == 'assistant' else 'PARENT'}: {m['content']}"
                for m in session.messages
                if m.get('role') in ('assistant', 'user')
            ])

            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                max_tokens=3000,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": summary_prompt},
                    {"role": "user", "content": f"CONVERSATION:\n{conv_text}"}
                ]
            )

            raw = response.choices[0].message.content
            structured = json.loads(raw)

            # Save plain-text overview as aria_summary (backward compat)
            session.aria_summary = structured.get("case_overview", raw)

            # Merge structured fields into extracted_data
            existing = session.extracted_data or {}
            existing["current_situation"] = structured.get("current_situation", "")
            existing["children"] = structured.get("children", [])
            existing["goals"] = structured.get("goals", [])
            existing["concerns"] = structured.get("concerns", [])
            existing["recommended_actions"] = structured.get("recommended_actions", [])
            existing["confidence_score"] = structured.get("confidence_score", 0.0)
            existing["client_info"] = structured.get("client_info", {})
            session.extracted_data = existing
            flag_modified(session, "extracted_data")

            await self.db.commit()

            return session.aria_summary

        except Exception as e:
            print(f"Summary generation error: {e}")
            return "Error generating summary. Please review the transcript directly."

    async def extract_form_data(
        self,
        session: IntakeSession,
        target_form: str
    ) -> Dict[str, Any]:
        """
        Extract structured form data from the conversation.
        """
        from app.services.form_extraction import FormExtractionService

        extractor = FormExtractionService(self.db)
        return await extractor.extract_for_form(session, target_form)

    async def complete_intake(
        self,
        session: IntakeSession,
        parent_edits: Optional[List[dict]] = None
    ) -> IntakeSession:
        """
        Mark intake as completed by parent.
        """
        session.status = IntakeStatus.COMPLETED.value
        session.completed_at = datetime.utcnow()
        session.parent_confirmed = True
        session.parent_confirmed_at = datetime.utcnow()

        if parent_edits:
            session.parent_edits = parent_edits
            flag_modified(session, "parent_edits")

        # Generate summary if not already done
        if not session.aria_summary:
            await self.generate_summary(session)

        # Extract form data
        for form_type in session.target_forms:
            await self.extract_form_data(session, form_type)

        await self.db.commit()
        await self.db.refresh(session)

        return session

    async def request_clarification(
        self,
        session: IntakeSession,
        clarification_request: str
    ) -> IntakeSession:
        """
        Professional requests additional information from parent.
        """
        session.clarification_requested = True
        session.clarification_request = clarification_request

        # TODO: Send notification to parent

        await self.db.commit()
        await self.db.refresh(session)

        return session
