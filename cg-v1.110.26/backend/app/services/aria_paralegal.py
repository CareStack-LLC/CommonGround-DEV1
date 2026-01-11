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
from sqlalchemy.orm.attributes import flag_modified

from app.models.intake import IntakeSession, IntakeExtraction, IntakeStatus
from app.models.court import CourtProfessional
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
        custom_questions: Optional[List[str]] = None
    ) -> str:
        """Generate ARIA Paralegal system prompt."""

        form_descriptions = {
            "FL-300": "Request for Order (initiating petition)",
            "FL-311": "Child Custody and Visitation Application",
            "FL-320": "Responsive Declaration (responding to petition)"
        }

        forms_text = ", ".join([
            f"{f} ({form_descriptions.get(f, f)})" for f in target_forms
        ])

        children_text = ", ".join(children_names) if children_names else "your children"

        custom_q_text = ""
        if custom_questions:
            custom_q_text = f"""

CUSTOM QUESTIONS FROM {professional_name.upper()}:
After covering the standard topics, also ask about:
{chr(10).join(f'- {q}' for q in custom_questions)}"""

        return f"""You are ARIA Paralegal, an AI intake assistant helping gather information
for a family law case. You are working on behalf of {professional_name}, {professional_role},
who will review everything you collect.

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

CONVERSATION FLOW:
1. Warm introduction - explain your role and limitations clearly
2. Confirm children's information (names, ages, current living situation)
3. Current custody arrangement - who do the children live with now?
4. What changes are being requested (if petitioner) or what are you responding to (if respondent)?
5. Weekly schedule preferences - weekdays, weekends
6. Holiday and vacation preferences
7. Exchange logistics - where, when, transportation
8. Communication preferences between parents
9. Any safety concerns (handle sensitively, don't probe deeply)
10. Special considerations (special needs, school activities, etc.)
11. Summary and confirmation{custom_q_text}

CONVERSATION STYLE:
- Use the parent's first name if known
- Be warm but professional
- Ask one main question at a time
- Acknowledge what they share before moving on
- Use phrases like "I want to make sure I understand..." and "Let me confirm..."
- End each response with a clear question or next step

WHEN GATHERING SCHEDULE INFORMATION:
- Be specific: "What time on Friday?" not just "Friday"
- Ask about regular school year vs. summer separately
- Holidays are important - ask about major ones
- Get details on exchange locations and transportation

Current form targets: {forms_text}
Professional: {professional_name} ({professional_role})
Parent role: {parent_role}
Children: {children_text}"""

    def _get_initial_message(
        self,
        professional_name: str,
        target_forms: List[str]
    ) -> str:
        """Generate ARIA's opening message."""

        purpose_text = "gathering information about your custody situation"
        if "FL-320" in target_forms:
            purpose_text = "helping you respond to the custody petition you received"
        elif "FL-300" in target_forms or "FL-311" in target_forms:
            purpose_text = "gathering information about your custody preferences"

        return f"""Hi! I'm ARIA, an AI assistant working with {professional_name}'s office. I'm here to help with {purpose_text}.

I'll ask you questions in plain English - no confusing legal forms to fill out. Your answers will be organized into the documents {professional_name} needs.

Before we start, I want to be clear: **I'm an AI assistant, not a lawyer.** I won't give you legal advice. I'm just here to listen carefully and make sure your information is accurate.

Everything you share will go directly to {professional_name} for review.

Ready to begin? First, could you tell me a little about your children - their names and ages?"""

    async def start_session(
        self,
        session: IntakeSession
    ) -> Dict[str, Any]:
        """
        Start an intake conversation session.

        Returns the initial ARIA message.
        """
        # Get professional info
        prof_result = await self.db.execute(
            select(CourtProfessional).where(
                CourtProfessional.id == session.professional_id
            )
        )
        professional = prof_result.scalar_one_or_none()
        if not professional:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professional not found"
            )

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
            professional.full_name,
            session.target_forms
        )

        # Update session
        session.status = IntakeStatus.IN_PROGRESS.value
        session.started_at = datetime.utcnow()
        session.messages = [{
            "role": "assistant",
            "content": initial_message,
            "timestamp": datetime.utcnow().isoformat()
        }]
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
        prof_result = await self.db.execute(
            select(CourtProfessional).where(
                CourtProfessional.id == session.professional_id
            )
        )
        professional = prof_result.scalar_one_or_none()
        if not professional:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professional not found"
            )

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
            professional.full_name,
            professional.role,
            session.target_forms,
            parent_role,
            children_names,
            session.custom_questions
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
            model="claude-sonnet-4-20250514",
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
            model="gpt-4-turbo",
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
        if len(messages) < 20:
            return False

        # Look for summary/confirmation language in recent messages
        recent_assistant_msgs = [
            m["content"].lower()
            for m in messages[-6:]
            if m["role"] == "assistant"
        ]

        completion_indicators = [
            "let me summarize",
            "to confirm",
            "before we finish",
            "is there anything else",
            "any other information",
            "we've covered"
        ]

        for msg in recent_assistant_msgs:
            if any(indicator in msg for indicator in completion_indicators):
                return True

        return False

    async def generate_summary(
        self,
        session: IntakeSession
    ) -> str:
        """
        Generate a plain English summary of the intake conversation.
        """
        if not session.messages or len(session.messages) < 2:
            return "Intake not yet started."

        summary_prompt = """Based on this intake conversation, create a clear, organized summary
of what the parent shared. Use plain English, not legal jargon.

Structure the summary as:
1. CHILDREN: Names, ages, current living situation
2. CURRENT ARRANGEMENT: How custody/visitation currently works
3. REQUESTED CHANGES: What the parent is asking for
4. SCHEDULE PREFERENCES: Weekly, holidays, summer
5. EXCHANGE LOGISTICS: Locations, times, transportation
6. SPECIAL CONSIDERATIONS: Any concerns, special needs, activities
7. OTHER NOTES: Anything else important

Keep each section brief and factual. Do not add opinions or recommendations."""

        try:
            # Prepare conversation for summary
            conv_text = "\n\n".join([
                f"{'ARIA' if m['role'] == 'assistant' else 'PARENT'}: {m['content']}"
                for m in session.messages
            ])

            response = self.anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{
                    "role": "user",
                    "content": f"{summary_prompt}\n\n---\n\nCONVERSATION:\n{conv_text}"
                }]
            )

            summary = response.content[0].text

            # Save summary
            session.aria_summary = summary
            await self.db.commit()

            return summary

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
