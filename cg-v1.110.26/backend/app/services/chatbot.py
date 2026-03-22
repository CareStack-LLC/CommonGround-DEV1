"""
Chatbot Service — Public-facing Aria customer success chatbot.

Uses Anthropic Claude to answer CommonGround customer questions,
collects visitor info, and supports escalation to human support.

Namespace: 'chatbot' (not 'aria') to avoid collision with the
existing ARIA message mediation system.
"""

import logging
import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import anthropic
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.chatbot import ChatbotVisitor, ChatbotSession, ChatbotMessage, ChatbotConfig
from app.services.email import email_service
from app.utils.sentry_helpers import capture_error

logger = logging.getLogger(__name__)

# ── Rate Limiting ────────────────────────────────────────────────────

MAX_MESSAGES_PER_SESSION = 30
MIN_MESSAGE_INTERVAL_SECONDS = 2

# In-memory rate limiter: {session_id: (msg_count, last_msg_timestamp)}
_rate_limits: Dict[str, Tuple[int, float]] = defaultdict(lambda: (0, 0.0))

ESCALATION_EMAIL = "hello@find-commonground.com"

# ── System Prompt ────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are Aria, CommonGround's customer success assistant.

STYLE: Be brief, warm, and direct. Answer in 1-3 short sentences. No bullet lists unless asked. No lengthy explanations. People want quick answers. Match the brand voice: calm, child-first, no jargon.

ABOUT COMMONGROUND: AI-powered co-parenting platform. "The calm way to co-parent."
- ARIA: AI that flags hostile messages and suggests calmer rewrites before sending
- Agreement Builder: 18-section custody agreement wizard, court-ready PDFs
- TimeBridge: Automated custody schedules, GPS-verified exchanges, silent handoff
- ClearFund: Expense splitting, payment tracking
- KidSpace/KidComs: Kids video-call both parents directly
- Court Portal: Attorney/GAL dashboard with compliance tracking
- Professional Portal: For attorneys, mediators, paralegals

PRICING: Web Starter = free forever. Plus = $17.99/mo. Complete = $34.99/mo. Professional plans = email hello@find-commonground.com.

RULES:
- Keep answers SHORT. 1-3 sentences max unless they ask for more detail.
- Only discuss CommonGround. Redirect off-topic politely.
- Never give legal advice — suggest a family law attorney.
- If stuck, offer hello@find-commonground.com.
- Ask for name/email once naturally, don't push.
- DV concerns → National DV Hotline 1-800-799-7233.
- Be honest if a feature doesn't exist yet.
"""

GREETING_MESSAGE = (
    "Hi! I'm Aria from CommonGround. "
    "Ask me anything about our co-parenting platform — features, pricing, or getting started. How can I help?"
)


class ChatbotService:
    """Service for the public-facing Aria customer success chatbot."""

    MODEL = "claude-3-5-sonnet-20241022"

    _config_table_exists: Optional[bool] = None  # Cache table existence check

    async def _get_system_prompt(self, db: AsyncSession) -> str:
        """Load system prompt from DB config, falling back to default."""
        # Skip DB query entirely if we already know the table doesn't exist
        if ChatbotService._config_table_exists is False:
            return SYSTEM_PROMPT

        try:
            result = await db.execute(
                select(ChatbotConfig).where(ChatbotConfig.key == "system_prompt")
            )
            config = result.scalar_one_or_none()
            ChatbotService._config_table_exists = True
            if config and config.value.strip():
                # Append any active promotions
                promo_result = await db.execute(
                    select(ChatbotConfig).where(ChatbotConfig.key == "active_promotions")
                )
                promo = promo_result.scalar_one_or_none()
                prompt = config.value
                if promo and promo.value.strip():
                    prompt += f"\n\nCURRENT PROMOTIONS/DEALS (mention when relevant):\n{promo.value}"
                return prompt
        except Exception as e:
            logger.warning(f"chatbot_config table not available, using default prompt: {e}")
            ChatbotService._config_table_exists = False
            # Rollback so the DB session is usable for subsequent operations
            try:
                await db.rollback()
            except Exception:
                pass
        return SYSTEM_PROMPT

    async def update_config(
        self, db: AsyncSession, key: str, value: str, updated_by: str = ""
    ) -> None:
        """Update a chatbot config value (upsert)."""
        result = await db.execute(
            select(ChatbotConfig).where(ChatbotConfig.key == key)
        )
        config = result.scalar_one_or_none()
        if config:
            config.value = value
            config.updated_by = updated_by
        else:
            config = ChatbotConfig(key=key, value=value, updated_by=updated_by)
            db.add(config)

    async def get_config(self, db: AsyncSession, key: str) -> Optional[str]:
        """Get a chatbot config value."""
        result = await db.execute(
            select(ChatbotConfig).where(ChatbotConfig.key == key)
        )
        config = result.scalar_one_or_none()
        return config.value if config else None

    async def create_session(
        self,
        db: AsyncSession,
        ip_address: str = "",
        user_agent: str = "",
        source_page: str = "",
    ) -> Tuple[str, str]:
        """Create a new chatbot session with a visitor record."""
        visitor = ChatbotVisitor(
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else None,
            source_page=source_page[:500] if source_page else None,
        )
        db.add(visitor)
        await db.flush()

        session = ChatbotSession(
            visitor_id=visitor.id,
            status="active",
            started_at=datetime.utcnow(),
        )
        db.add(session)
        await db.flush()

        # Store the greeting as the first assistant message
        greeting_msg = ChatbotMessage(
            session_id=session.id,
            role="assistant",
            content=GREETING_MESSAGE,
        )
        db.add(greeting_msg)
        session.message_count = 1

        return session.id, GREETING_MESSAGE

    async def send_message(
        self,
        db: AsyncSession,
        session_id: str,
        user_content: str,
    ) -> Tuple[str, str]:
        """Send a user message and get an AI reply."""
        # Rate limiting
        count, last_ts = _rate_limits[session_id]
        now = time.time()
        if count >= MAX_MESSAGES_PER_SESSION:
            raise ValueError("Message limit reached for this session. Please start a new chat or email hello@find-commonground.com.")
        if now - last_ts < MIN_MESSAGE_INTERVAL_SECONDS:
            raise ValueError("Please wait a moment before sending another message.")
        _rate_limits[session_id] = (count + 1, now)

        # Load system prompt FIRST — if chatbot_config table is missing,
        # this may rollback, so do it before loading any other data
        system_prompt = await self._get_system_prompt(db)

        # Load session
        result = await db.execute(
            select(ChatbotSession)
            .options(selectinload(ChatbotSession.messages))
            .where(ChatbotSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError("Session not found.")
        if session.status != "active":
            raise ValueError("This chat session has ended.")

        # Build conversation history for Claude BEFORE adding new message
        messages = []
        for msg in sorted(session.messages, key=lambda m: m.created_at):
            if msg.role in ("user", "assistant"):
                messages.append({"role": msg.role, "content": msg.content})
        # Add current user message
        messages.append({"role": "user", "content": user_content[:2000]})

        # Store user message
        user_msg = ChatbotMessage(
            session_id=session.id,
            role="user",
            content=user_content[:2000],
        )
        db.add(user_msg)
        await db.flush()

        # Call Claude — create client inline (same pattern as ARIA service)
        try:
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = client.messages.create(
                model=self.MODEL,
                max_tokens=250,
                system=system_prompt,
                messages=messages,
            )
            reply_text = response.content[0].text
            token_count = response.usage.input_tokens + response.usage.output_tokens
        except Exception as e:
            logger.error(f"Claude API error in chatbot: {type(e).__name__}: {e}")
            logger.error(f"Claude API key present: {bool(settings.ANTHROPIC_API_KEY)}, model: {self.MODEL}, messages count: {len(messages)}")
            capture_error(e)
            reply_text = (
                "I'm sorry, I'm having a little trouble right now. "
                "You can reach our team directly at hello@find-commonground.com "
                "and they'll be happy to help!"
            )
            token_count = None

        # Store assistant reply
        assistant_msg = ChatbotMessage(
            session_id=session.id,
            role="assistant",
            content=reply_text,
            token_count=token_count,
        )
        db.add(assistant_msg)
        await db.flush()

        # Update session message count
        session.message_count = (session.message_count or 0) + 2  # user + assistant

        return assistant_msg.id, reply_text

    async def update_visitor_info(
        self,
        db: AsyncSession,
        session_id: str,
        name: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
    ) -> bool:
        """Update visitor contact info for a session."""
        result = await db.execute(
            select(ChatbotSession)
            .options(selectinload(ChatbotSession.visitor))
            .where(ChatbotSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            return False

        visitor = session.visitor
        if name:
            visitor.name = name[:100]
        if email:
            visitor.email = email[:255]
        if phone:
            visitor.phone = phone[:30]

        return True

    async def escalate_session(
        self,
        db: AsyncSession,
        session_id: str,
        reason: Optional[str] = None,
    ) -> bool:
        """Escalate a session to human support and email the transcript."""
        result = await db.execute(
            select(ChatbotSession)
            .options(
                selectinload(ChatbotSession.visitor),
                selectinload(ChatbotSession.messages),
            )
            .where(ChatbotSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            return False

        session.status = "escalated"
        session.escalated_at = datetime.utcnow()
        session.escalation_reason = reason

        # Send transcript email
        await self._send_transcript_email(session, is_escalation=True)
        session.transcript_emailed = True

        return True

    async def close_session(self, db: AsyncSession, session_id: str) -> bool:
        """Close a chat session."""
        result = await db.execute(
            select(ChatbotSession).where(ChatbotSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            return False
        session.status = "closed"
        session.ended_at = datetime.utcnow()
        return True

    # ── Admin Methods ────────────────────────────────────────────────

    async def list_sessions(
        self,
        db: AsyncSession,
        status: Optional[str] = None,
        search: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        page: int = 1,
        per_page: int = 25,
    ):
        """List chatbot sessions for admin with filters."""
        query = (
            select(ChatbotSession)
            .options(selectinload(ChatbotSession.visitor))
            .order_by(ChatbotSession.started_at.desc())
        )

        conditions = []
        if status:
            conditions.append(ChatbotSession.status == status)
        if date_from:
            conditions.append(ChatbotSession.started_at >= date_from)
        if date_to:
            conditions.append(ChatbotSession.started_at <= date_to)
        if search:
            search_like = f"%{search}%"
            query = query.join(ChatbotVisitor)
            conditions.append(
                (ChatbotVisitor.name.ilike(search_like))
                | (ChatbotVisitor.email.ilike(search_like))
            )

        if conditions:
            query = query.where(and_(*conditions))

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page)

        result = await db.execute(query)
        sessions = result.scalars().all()

        return sessions, total

    async def get_session_detail(self, db: AsyncSession, session_id: str):
        """Get full session detail with messages for admin."""
        result = await db.execute(
            select(ChatbotSession)
            .options(
                selectinload(ChatbotSession.visitor),
                selectinload(ChatbotSession.messages),
            )
            .where(ChatbotSession.id == session_id)
        )
        return result.scalar_one_or_none()

    async def get_stats(self, db: AsyncSession) -> dict:
        """Get aggregate chatbot stats for admin dashboard."""
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        # Total sessions
        total_result = await db.execute(select(func.count(ChatbotSession.id)))
        total_sessions = total_result.scalar() or 0

        # Active today
        active_today_result = await db.execute(
            select(func.count(ChatbotSession.id)).where(
                ChatbotSession.started_at >= today_start
            )
        )
        active_today = active_today_result.scalar() or 0

        # Avg messages per session
        avg_result = await db.execute(
            select(func.avg(ChatbotSession.message_count))
        )
        avg_messages = round(float(avg_result.scalar() or 0), 1)

        # Escalation rate
        escalated_result = await db.execute(
            select(func.count(ChatbotSession.id)).where(
                ChatbotSession.status == "escalated"
            )
        )
        escalated_count = escalated_result.scalar() or 0
        escalation_rate = round(
            (escalated_count / total_sessions * 100) if total_sessions > 0 else 0, 1
        )

        # Total unique visitors
        visitors_result = await db.execute(select(func.count(ChatbotVisitor.id)))
        total_visitors = visitors_result.scalar() or 0

        return {
            "total_sessions": total_sessions,
            "active_today": active_today,
            "avg_messages_per_session": avg_messages,
            "escalation_rate": escalation_rate,
            "total_visitors": total_visitors,
        }

    async def email_transcript(self, db: AsyncSession, session_id: str) -> bool:
        """Admin action: email a session transcript to the support team."""
        result = await db.execute(
            select(ChatbotSession)
            .options(
                selectinload(ChatbotSession.visitor),
                selectinload(ChatbotSession.messages),
            )
            .where(ChatbotSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            return False

        await self._send_transcript_email(session, is_escalation=False)
        session.transcript_emailed = True
        return True

    # ── Private Helpers ──────────────────────────────────────────────

    async def _send_transcript_email(
        self, session: ChatbotSession, is_escalation: bool = False
    ) -> None:
        """Format and send a transcript email to the support team."""
        visitor = session.visitor
        visitor_name = visitor.name or "Anonymous"
        visitor_email = visitor.email or "Not provided"
        visitor_phone = visitor.phone or "Not provided"

        subject_prefix = "[Chatbot Escalation]" if is_escalation else "[Chatbot Transcript]"
        subject = f"{subject_prefix} {visitor_name} — {session.started_at.strftime('%b %d, %Y %I:%M %p')}"

        # Build message rows
        message_rows = ""
        for msg in session.messages:
            role_label = "Visitor" if msg.role == "user" else "Aria"
            bg_color = "#f0fdf4" if msg.role == "assistant" else "#f8fafc"
            ts = msg.created_at.strftime("%I:%M %p") if msg.created_at else ""
            message_rows += f"""
            <tr>
                <td style="padding:8px 12px; background:{bg_color}; border-bottom:1px solid #e2e8f0;">
                    <strong>{role_label}</strong> <span style="color:#94a3b8; font-size:12px;">{ts}</span><br/>
                    {msg.content}
                </td>
            </tr>"""

        escalation_section = ""
        if is_escalation and session.escalation_reason:
            escalation_section = f"""
            <tr>
                <td style="padding:12px; background:#fef2f2; border:1px solid #fecaca;">
                    <strong>Escalation Reason:</strong> {session.escalation_reason}
                </td>
            </tr>"""

        html_body = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width:600px; margin:0 auto;">
            <div style="background:#3DAA8A; color:white; padding:16px 20px; border-radius:8px 8px 0 0;">
                <h2 style="margin:0; font-size:18px;">{subject_prefix} Chat Transcript</h2>
            </div>
            <div style="padding:16px 20px; background:#ffffff; border:1px solid #e2e8f0;">
                <table style="width:100%; margin-bottom:16px;">
                    <tr><td><strong>Visitor:</strong> {visitor_name}</td></tr>
                    <tr><td><strong>Email:</strong> {visitor_email}</td></tr>
                    <tr><td><strong>Phone:</strong> {visitor_phone}</td></tr>
                    <tr><td><strong>Source Page:</strong> {visitor.source_page or "N/A"}</td></tr>
                    <tr><td><strong>Session Started:</strong> {session.started_at.strftime("%b %d, %Y %I:%M %p UTC")}</td></tr>
                    <tr><td><strong>Messages:</strong> {session.message_count}</td></tr>
                </table>
                {escalation_section}
                <h3 style="margin:16px 0 8px; font-size:14px; color:#64748b;">Conversation</h3>
                <table style="width:100%; border-collapse:collapse;">
                    {message_rows}
                </table>
            </div>
            <div style="padding:12px 20px; background:#f8fafc; border-radius:0 0 8px 8px; border:1px solid #e2e8f0; border-top:0;">
                <p style="margin:0; font-size:12px; color:#94a3b8;">Sent by CommonGround Aria Chatbot</p>
            </div>
        </div>
        """

        try:
            await email_service._send_email(
                to_email=ESCALATION_EMAIL,
                subject=subject,
                html_body=html_body,
            )
            logger.info(f"Chatbot transcript emailed for session {session.id}")
        except Exception as e:
            logger.error(f"Failed to email chatbot transcript: {e}")
            capture_error(e)


# Singleton
chatbot_service = ChatbotService()
