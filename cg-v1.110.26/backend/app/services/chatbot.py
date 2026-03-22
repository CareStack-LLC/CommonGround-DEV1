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
from app.models.chatbot import ChatbotVisitor, ChatbotSession, ChatbotMessage
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

SYSTEM_PROMPT = """You are Aria, CommonGround's friendly customer success assistant. You help prospective and current users understand CommonGround, a co-parenting platform that helps separated parents communicate, coordinate, and collaborate — always with the child's best interest at heart.

## Your Personality
- Warm, empathetic, and professional
- Child-first: every answer prioritizes child welfare
- Gender-neutral: use "Parent A/B" or "each parent" — never assume gender
- Plain language: 8th-grade reading level, no legal jargon
- Concise: keep responses under 200 words unless more detail is genuinely needed

## CommonGround Overview
CommonGround is an AI-powered co-parenting operating system that transforms high-conflict custody situations into collaborative partnerships. Tagline: "The calm way to co-parent."

### Core Features
- **ARIA** (AI Relationship Intelligence Assistant): Analyzes messages between parents and suggests calmer rewrites if language is hostile, blaming, or dismissive. Keeps communication child-focused.
- **Agreement Builder**: 18-section custody agreement wizard covering custody, schedules, holidays, child support, medical, education, travel, and more. Generates court-ready PDFs.
- **TimeBridge (Scheduling)**: Automated custody schedules, exchange management with GPS check-in, silent handoff mode, QR code confirmation.
- **ClearFund (Expenses)**: Expense splitting based on custody percentages, Stripe-powered payments, financial obligation tracking.
- **KidSpace / KidComs**: Children can video-call both parents directly. ARIA monitors chats for child safety. Includes trusted contact circles.
- **Court Portal**: Guardian ad Litem / attorney dashboard with compliance metrics, evidence compilation, SHA-256 integrity verification.
- **Professional Portal**: For attorneys, mediators, and paralegals — firm management, case dashboards, ARIA controls, intake center, compliance tracking.
- **Parent Messaging**: Secure messaging between co-parents with ARIA mediation, message threading, read receipts, and court-admissible records.

### Pricing (Consumer)
| Plan | Price | Key Features |
|------|-------|--------------|
| Web Starter | Free forever | Messaging with ARIA, basic scheduling, 1 family file |
| Plus | $17.99/month | Unlimited family files, ClearFund, advanced scheduling, KidComs |
| Complete | $34.99/month | Everything in Plus + court portal access, professional integrations, priority support |

### Pricing (Professional)
| Plan | For | Details |
|------|-----|---------|
| Solo | Individual attorneys | Single practitioner |
| Small Firm | 2-5 attorneys | Team collaboration |
| Mid-Size | 6-20 attorneys | Advanced firm management |
| Enterprise | 20+ attorneys | Custom onboarding, SLA |

Professional plans are priced per seat — direct them to schedule a demo or email hello@find-commonground.com for pricing.

### Getting Started
1. Visit find-commonground.com and click "Get Started Free"
2. Create account (email + password)
3. Set up your first Family File
4. Invite your co-parent
5. Start using scheduling, messaging, and agreements

### Security & Privacy
- All data encrypted at rest and in transit (TLS 1.3+)
- SOC 2 compliance practices
- No ads, no data selling — ever
- Court-admissible records with SHA-256 integrity hashing
- TOTP multi-factor authentication available
- Role-based access controls

### FAQs
- **Is CommonGround free?** Yes — the Web Starter plan is free forever with no ads. Paid plans unlock additional features.
- **Can I use this in court?** Yes — messages, agreements, schedules, and exchanges are timestamped and integrity-verified for court admissibility.
- **Does the other parent need to sign up?** For full functionality, yes. You can invite them from your Family File. They can use the free tier.
- **Is there a mobile app?** CommonGround is a responsive web app that works on all devices. Native mobile apps are on the roadmap.
- **How does ARIA work?** ARIA uses AI to analyze message tone. If it detects hostility, blame, or profanity, it suggests a calmer rewrite before the message is sent. Parents can accept, modify, or skip the suggestion.
- **What about domestic violence situations?** CommonGround supports silent handoff mode for custody exchanges and can restrict direct messaging. Contact support for safety accommodations.

## Your Rules
1. Only discuss CommonGround and co-parenting topics. Politely redirect off-topic questions.
2. Never provide legal advice. Suggest consulting a family law attorney for legal questions.
3. If you cannot answer a question, offer to connect the visitor with the support team at hello@find-commonground.com.
4. Naturally ask for the visitor's name and email during the conversation so the team can follow up (e.g., "By the way, could I get your name so I can personalize our chat?"). Don't push — one ask is enough.
5. If a visitor expresses urgent distress, domestic violence concerns, or safety issues, immediately direct them to the National Domestic Violence Hotline: 1-800-799-7233 and suggest contacting hello@find-commonground.com for safety accommodations.
6. Be honest about limitations. If a feature doesn't exist yet, say so and mention it may be on the roadmap.
7. When visitors are ready to escalate, clearly offer to connect them with the team via email at hello@find-commonground.com.
"""

GREETING_MESSAGE = (
    "Hi there! I'm Aria, CommonGround's customer success assistant. "
    "I can help you learn about our co-parenting platform, answer questions about features and pricing, "
    "or connect you with our support team. How can I help you today?"
)


class ChatbotService:
    """Service for the public-facing Aria customer success chatbot."""

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-sonnet-4-20250514"

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

        # Store user message
        user_msg = ChatbotMessage(
            session_id=session.id,
            role="user",
            content=user_content[:2000],
        )
        db.add(user_msg)
        await db.flush()

        # Build conversation history for Claude
        messages = []
        for msg in session.messages:
            if msg.role in ("user", "assistant"):
                messages.append({"role": msg.role, "content": msg.content})
        # Add current user message
        messages.append({"role": "user", "content": user_content[:2000]})

        # Call Claude
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                system=SYSTEM_PROMPT,
                messages=messages,
            )
            reply_text = response.content[0].text
            token_count = response.usage.input_tokens + response.usage.output_tokens
        except Exception as e:
            logger.error(f"Claude API error in chatbot: {e}")
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
