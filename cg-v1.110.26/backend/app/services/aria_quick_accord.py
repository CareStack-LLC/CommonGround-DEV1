"""
ARIA QuickAccord Builder Service

Conversational approach to building lightweight situational agreements.
Extracts information from natural language and converts to structured data.

Example flow:
Parent: "ARIA, I need to make a quick agreement"
ARIA: "Sure! What's the situation?"
Parent: "My ex wants to take the kids to Disneyland next weekend"
ARIA: "Great! Let me help you formalize this..."
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
import json
import uuid

from openai import OpenAI
from anthropic import Anthropic
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.family_file import FamilyFile, QuickAccord, generate_quick_accord_number
from app.models.child import Child
from app.models.user import User
from app.core.config import settings


# QuickAccord extraction schema for structured data
QUICK_ACCORD_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {
            "type": "string",
            "description": "A short descriptive title for this agreement (e.g., 'Disneyland Trip - Feb 8-9')"
        },
        "purpose_category": {
            "type": "string",
            "enum": ["travel", "schedule_swap", "special_event", "overnight", "expense", "other"],
            "description": "Category of this situational agreement"
        },
        "purpose_description": {
            "type": "string",
            "description": "Detailed description of the situation/purpose"
        },
        "is_single_event": {
            "type": "boolean",
            "description": "True if this is for a single event/date, False if it spans multiple days"
        },
        "event_date": {
            "type": "string",
            "description": "For single events: the date in ISO format (YYYY-MM-DD)"
        },
        "start_date": {
            "type": "string",
            "description": "For date ranges: start date in ISO format"
        },
        "end_date": {
            "type": "string",
            "description": "For date ranges: end date in ISO format"
        },
        "child_names": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Names of children involved"
        },
        "location": {
            "type": "string",
            "description": "Location of the event/activity"
        },
        "pickup_details": {
            "type": "object",
            "properties": {
                "responsible_parent": {"type": "string", "description": "Who is picking up (mother/father/parent_a/parent_b)"},
                "time": {"type": "string", "description": "Pickup time"},
                "location": {"type": "string", "description": "Pickup location if different from main location"}
            }
        },
        "dropoff_details": {
            "type": "object",
            "properties": {
                "responsible_parent": {"type": "string", "description": "Who is dropping off"},
                "time": {"type": "string", "description": "Drop-off time"},
                "location": {"type": "string", "description": "Drop-off location"}
            }
        },
        "transportation_notes": {
            "type": "string",
            "description": "Any notes about transportation arrangements"
        },
        "has_shared_expense": {
            "type": "boolean",
            "description": "Whether there are shared expenses"
        },
        "estimated_amount": {
            "type": "number",
            "description": "Estimated shared expense amount in dollars"
        },
        "expense_category": {
            "type": "string",
            "description": "Category of expense (tickets, travel, food, etc.)"
        },
        "expense_notes": {
            "type": "string",
            "description": "Notes about expense sharing (who pays what)"
        },
        "receipt_required": {
            "type": "boolean",
            "description": "Whether receipts are required for expense reimbursement"
        },
        "is_ready_to_create": {
            "type": "boolean",
            "description": "True if we have enough information to create the QuickAccord"
        },
        "missing_info": {
            "type": "array",
            "items": {"type": "string"},
            "description": "List of information still needed"
        }
    },
    "required": ["purpose_category", "is_ready_to_create"]
}


# Module-level conversation store (persists across requests)
# In production, use Redis or database for persistence across server restarts
_conversation_store: Dict[str, Dict] = {}


class AriaQuickAccordService:
    """Service for ARIA-powered conversational QuickAccord building."""

    def __init__(self, db: AsyncSession):
        self.db = db
        # Initialize both clients for fallback support
        self.anthropic = None
        self.openai = None

        # Primary provider
        if settings.ARIA_DEFAULT_PROVIDER == "claude" and settings.ANTHROPIC_API_KEY:
            self.provider = "claude"
            try:
                self.anthropic = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            except Exception:
                self.provider = "openai"
        else:
            self.provider = "openai"

        # Always initialize OpenAI as fallback
        if settings.OPENAI_API_KEY:
            try:
                self.openai = OpenAI(api_key=settings.OPENAI_API_KEY)
            except Exception:
                pass

        # Reference to module-level conversation store
        self._conversations = _conversation_store

    def _get_system_prompt(self, family_file: FamilyFile, children: List[Child]) -> str:
        """Generate ARIA system prompt for QuickAccord conversations."""
        children_text = ", ".join([c.first_name for c in children]) if children else "your children"

        return f"""You are ARIA, a friendly AI assistant helping parents create quick situational agreements.

You're helping with Family File: {family_file.title}
Children: {children_text}

Your role is to have a natural, helpful conversation to understand what arrangement they need for a specific situation. QuickAccords are for:
- **Travel**: Taking kids on a trip
- **Schedule Swap**: Trading custody days
- **Special Event**: Birthday parties, events, performances
- **Overnight**: One-off overnight stays
- **Expense**: Shared expense agreements
- **Other**: Any other situational arrangement

**Your Approach:**

1. **Listen warmly**: Parents may be stressed or in a hurry. Be understanding and efficient.

2. **Ask the right questions** to understand:
   - What's the situation/event?
   - When is it? (Single day or date range?)
   - Which children are involved?
   - Where is it happening?
   - Who's picking up and when?
   - Who's dropping off and when?
   - Are there shared expenses?

3. **Be conversational but focused**: Get the info you need without being robotic.
   - "That sounds fun! What dates are we talking about?"
   - "Got it. Who's handling pickup?"
   - "Any expenses to split?"

4. **Summarize before confirming**: Before creating the accord, give a clear summary:
   ```
   Here's what I have:

   **Disneyland Trip - Feb 8-9, 2025**
   - Children: Emma & Jake
   - Departs: Sat Feb 8 at 9:00 AM (Mother picks up)
   - Returns: Sun Feb 9 at 6:00 PM (Mother drops off)
   - Expenses: Mother covers all costs
   - Location: Disneyland, Anaheim CA

   Does this look right? [Edit] [Send for Approval]
   ```

5. **Use parent-neutral language**: Say "the other parent" or use roles (Mother/Father) rather than names when possible.

6. **Handle edge cases**:
   - If dates are vague: "Just to be clear, is that this weekend or next?"
   - If something's missing: "One more thing - where should pickup happen?"
   - If unsure about category: Ask or make best guess

**CRITICAL**: Your responses should ONLY contain conversational text. Do NOT include any JSON, structured data, code blocks, or technical formatting in your responses. Just speak naturally like a helpful assistant. The system will automatically extract the relevant data from the conversation separately.

Start by asking what situation they need to handle."""

    def _get_extraction_prompt(self) -> str:
        """Get the prompt for extracting structured data."""
        return """Based on the conversation so far, extract all relevant information into structured data.

Return a JSON object with these fields (include only fields that have been discussed):
- title: A descriptive title for the agreement
- purpose_category: travel, schedule_swap, special_event, overnight, expense, or other
- purpose_description: What the situation is about
- is_single_event: true for single day, false for date range
- event_date: for single events (ISO format)
- start_date, end_date: for date ranges (ISO format)
- child_names: array of child names involved
- location: where it's happening
- pickup_details: {responsible_parent, time, location}
- dropoff_details: {responsible_parent, time, location}
- transportation_notes: any transport notes
- has_shared_expense: boolean
- estimated_amount: number in dollars
- expense_category: type of expense
- expense_notes: who pays what
- receipt_required: boolean
- is_ready_to_create: true if we have enough info to create the QuickAccord
- missing_info: array of what's still needed

Return ONLY the JSON object, no other text."""

    async def start_conversation(
        self,
        family_file_id: str,
        user: User
    ) -> Dict[str, Any]:
        """
        Start a new QuickAccord conversation.

        Args:
            family_file_id: ID of the Family File
            user: Current user

        Returns:
            dict with conversation_id and initial response
        """
        # Get family file
        result = await self.db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        family_file = result.scalar_one_or_none()

        if not family_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Family File not found"
            )

        # Verify access
        if family_file.parent_a_id != user.id and family_file.parent_b_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this Family File"
            )

        # Get children
        children_result = await self.db.execute(
            select(Child).where(Child.family_file_id == family_file_id)
        )
        children = list(children_result.scalars().all())

        # Create conversation
        conversation_id = str(uuid.uuid4())
        system_prompt = self._get_system_prompt(family_file, children)

        # Generate initial greeting
        initial_response = await self._get_ai_response(
            system_prompt=system_prompt,
            messages=[],
            user_message="I need to create a QuickAccord"
        )

        # Store conversation
        self._conversations[conversation_id] = {
            "family_file_id": family_file_id,
            "user_id": user.id,
            "system_prompt": system_prompt,
            "messages": [
                {"role": "user", "content": "I need to create a QuickAccord"},
                {"role": "assistant", "content": initial_response}
            ],
            "extracted_data": {},
            "children": [{"id": c.id, "name": c.first_name} for c in children],
            "created_at": datetime.utcnow().isoformat()
        }

        return {
            "conversation_id": conversation_id,
            "response": initial_response,
            "extracted_data": None,
            "is_ready_to_create": False
        }

    async def send_message(
        self,
        conversation_id: str,
        user: User,
        message: str
    ) -> Dict[str, Any]:
        """
        Process user message and return ARIA response.

        Args:
            conversation_id: ID of the conversation
            user: Current user
            message: User's message

        Returns:
            dict with response, extracted_data, and is_ready_to_create
        """
        # Get conversation
        conversation = self._conversations.get(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or expired"
            )

        # Verify user
        if conversation["user_id"] != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this conversation"
            )

        # Add user message
        conversation["messages"].append({"role": "user", "content": message})

        # Get AI response
        response = await self._get_ai_response(
            system_prompt=conversation["system_prompt"],
            messages=conversation["messages"],
            user_message=message
        )

        # Add assistant response
        conversation["messages"].append({"role": "assistant", "content": response})

        # Extract structured data
        extracted_data = await self._extract_data(
            conversation["system_prompt"],
            conversation["messages"]
        )
        conversation["extracted_data"] = extracted_data

        # Match child names to IDs
        if extracted_data and extracted_data.get("child_names"):
            child_ids = []
            for name in extracted_data["child_names"]:
                for child in conversation["children"]:
                    if name.lower() in child["name"].lower():
                        child_ids.append(child["id"])
            extracted_data["child_ids"] = child_ids

        return {
            "conversation_id": conversation_id,
            "response": response,
            "extracted_data": extracted_data,
            "is_ready_to_create": extracted_data.get("is_ready_to_create", False) if extracted_data else False
        }

    async def create_from_conversation(
        self,
        conversation_id: str,
        user: User
    ) -> QuickAccord:
        """
        Create a QuickAccord from the conversation.

        Args:
            conversation_id: ID of the conversation
            user: Current user

        Returns:
            Created QuickAccord
        """
        # Get conversation
        conversation = self._conversations.get(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or expired"
            )

        # Verify user
        if conversation["user_id"] != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this conversation"
            )

        # Check if ready
        extracted_data = conversation.get("extracted_data", {})
        if not extracted_data.get("is_ready_to_create"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not enough information to create QuickAccord. Missing: " +
                       ", ".join(extracted_data.get("missing_info", ["unknown"]))
            )

        # Determine parent A status
        family_file_id = conversation["family_file_id"]
        ff_result = await self.db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        family_file = ff_result.scalar_one()
        is_parent_a = family_file.parent_a_id == user.id

        # Build QuickAccord
        quick_accord = QuickAccord(
            id=str(uuid.uuid4()),
            family_file_id=family_file_id,
            accord_number=generate_quick_accord_number(),
            title=extracted_data.get("title", "QuickAccord"),
            purpose_category=extracted_data.get("purpose_category", "other"),
            purpose_description=extracted_data.get("purpose_description"),
            is_single_event=extracted_data.get("is_single_event", True),
            child_ids=extracted_data.get("child_ids", []),
            location=extracted_data.get("location"),
            has_shared_expense=extracted_data.get("has_shared_expense", False),
            estimated_amount=extracted_data.get("estimated_amount"),
            expense_category=extracted_data.get("expense_category"),
            receipt_required=extracted_data.get("receipt_required", False),
            initiated_by=user.id,
            aria_conversation_id=conversation_id,
            status="draft",
        )

        # Parse dates
        if extracted_data.get("event_date"):
            try:
                quick_accord.event_date = datetime.fromisoformat(extracted_data["event_date"])
            except ValueError:
                pass
        if extracted_data.get("start_date"):
            try:
                quick_accord.start_date = datetime.fromisoformat(extracted_data["start_date"])
            except ValueError:
                pass
        if extracted_data.get("end_date"):
            try:
                quick_accord.end_date = datetime.fromisoformat(extracted_data["end_date"])
            except ValueError:
                pass

        # Parse pickup/dropoff
        pickup = extracted_data.get("pickup_details", {})
        if pickup:
            quick_accord.pickup_responsibility = pickup.get("responsible_parent")

        dropoff = extracted_data.get("dropoff_details", {})
        if dropoff:
            quick_accord.dropoff_responsibility = dropoff.get("responsible_parent")

        quick_accord.transportation_notes = extracted_data.get("transportation_notes")

        # Generate AI summary
        quick_accord.ai_summary = self._generate_summary(extracted_data)

        self.db.add(quick_accord)
        await self.db.commit()
        await self.db.refresh(quick_accord)

        # Clean up conversation
        del self._conversations[conversation_id]

        return quick_accord

    async def _get_ai_response(
        self,
        system_prompt: str,
        messages: List[Dict],
        user_message: str
    ) -> str:
        """Get conversational response from AI."""
        if self.provider == "claude":
            return await self._get_claude_response(system_prompt, messages, user_message)
        else:
            return await self._get_openai_response(system_prompt, messages, user_message)

    async def _get_claude_response(
        self,
        system_prompt: str,
        messages: List[Dict],
        user_message: str
    ) -> str:
        """Get response from Claude with OpenAI fallback."""
        # Try Claude first
        if self.anthropic:
            try:
                response = self.anthropic.messages.create(
                    model="claude-3-sonnet-20240229",
                    max_tokens=1024,
                    system=system_prompt,
                    messages=messages + [{"role": "user", "content": user_message}]
                    if user_message not in [m.get("content") for m in messages]
                    else messages
                )
                return response.content[0].text
            except Exception as e:
                # Log the error and fall through to OpenAI
                print(f"Claude API error, falling back to OpenAI: {e}")

        # Fallback to OpenAI
        if self.openai:
            try:
                return await self._get_openai_response(system_prompt, messages, user_message)
            except Exception as e:
                print(f"OpenAI API error: {e}")

        # Ultimate fallback response
        return "I'd be happy to help you create a QuickAccord. What situation do you need to document?"

    async def _get_openai_response(
        self,
        system_prompt: str,
        messages: List[Dict],
        user_message: str
    ) -> str:
        """Get response from OpenAI."""
        try:
            formatted_messages = [{"role": "system", "content": system_prompt}]
            for msg in messages:
                formatted_messages.append({"role": msg["role"], "content": msg["content"]})

            response = self.openai.chat.completions.create(
                model="gpt-4",
                messages=formatted_messages,
                max_tokens=1024
            )
            return response.choices[0].message.content
        except Exception as e:
            # Fallback response
            return "I'd be happy to help you create a QuickAccord. What situation do you need to document?"

    async def _extract_data(
        self,
        system_prompt: str,
        messages: List[Dict]
    ) -> Optional[Dict]:
        """Extract structured data from conversation with fallback support."""
        extraction_prompt = self._get_extraction_prompt()
        json_str = None

        # Try Claude first if available
        if self.anthropic:
            try:
                response = self.anthropic.messages.create(
                    model="claude-3-sonnet-20240229",
                    max_tokens=1024,
                    system="You are a data extraction assistant. Extract structured data from conversations.",
                    messages=[
                        {"role": "user", "content": f"Conversation:\n{json.dumps(messages)}\n\n{extraction_prompt}"}
                    ]
                )
                json_str = response.content[0].text
            except Exception as e:
                print(f"Claude extraction error, falling back to OpenAI: {e}")

        # Fallback to OpenAI if Claude failed or unavailable
        if json_str is None and self.openai:
            try:
                response = self.openai.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "You are a data extraction assistant. Return only valid JSON."},
                        {"role": "user", "content": f"Conversation:\n{json.dumps(messages)}\n\n{extraction_prompt}"}
                    ],
                    max_tokens=1024
                )
                json_str = response.choices[0].message.content
            except Exception as e:
                print(f"OpenAI extraction error: {e}")

        # Parse JSON if we got a response
        if json_str:
            try:
                # Handle markdown code blocks
                if "```json" in json_str:
                    json_str = json_str.split("```json")[1].split("```")[0]
                elif "```" in json_str:
                    json_str = json_str.split("```")[1].split("```")[0]

                return json.loads(json_str.strip())
            except json.JSONDecodeError as e:
                print(f"JSON parsing error: {e}")

        # Return partial data if extraction fails
        return {"is_ready_to_create": False, "missing_info": ["Unable to extract data"]}

    def _generate_summary(self, data: Dict) -> str:
        """Generate a human-readable summary of the QuickAccord."""
        lines = []

        if data.get("title"):
            lines.append(f"**{data['title']}**")
        if data.get("purpose_description"):
            lines.append(data["purpose_description"])
        if data.get("child_names"):
            lines.append(f"Children: {', '.join(data['child_names'])}")
        if data.get("event_date"):
            lines.append(f"Date: {data['event_date']}")
        elif data.get("start_date") and data.get("end_date"):
            lines.append(f"Dates: {data['start_date']} to {data['end_date']}")
        if data.get("location"):
            lines.append(f"Location: {data['location']}")

        pickup = data.get("pickup_details", {})
        if pickup.get("responsible_parent"):
            lines.append(f"Pickup: {pickup.get('responsible_parent')} at {pickup.get('time', 'TBD')}")

        dropoff = data.get("dropoff_details", {})
        if dropoff.get("responsible_parent"):
            lines.append(f"Drop-off: {dropoff.get('responsible_parent')} at {dropoff.get('time', 'TBD')}")

        if data.get("has_shared_expense"):
            amount = data.get("estimated_amount", "TBD")
            lines.append(f"Shared expense: ${amount}")

        return "\n".join(lines)
