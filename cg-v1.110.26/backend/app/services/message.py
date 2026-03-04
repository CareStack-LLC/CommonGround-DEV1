"""
Message service for parent-to-parent communication with ARIA integration.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.message import Message, MessageThread, MessageFlag
from app.models.case import Case, CaseParticipant
from app.models.user import User
from app.schemas.message import MessageCreate, InterventionAction
from app.services.aria import ARIAService, ToxicityLevel
from app.services.case import CaseService
from app.services.email import EmailService
from app.core.config import settings
from app.core.websocket import manager
import hashlib


class MessageService:
    """Service for handling message operations with ARIA integration."""

    def __init__(self, db: AsyncSession):
        """
        Initialize message service.

        Args:
            db: Database session
        """
        self.db = db
        self.aria = ARIAService()
        self.case_service = CaseService(db)
        self.email_service = EmailService()

    async def analyze_message(
        self,
        content: str,
        case_id: str,
        sender: User
    ) -> Dict[str, Any]:
        """
        Analyze a message with ARIA before sending.

        Args:
            content: Message content
            case_id: ID of the case
            sender: User sending the message

        Returns:
            Analysis result with intervention if needed
        """
        # Get recent messages for context
        context = await self._get_recent_messages_text(case_id, limit=5)

        # Analyze with ARIA
        analysis = self.aria.analyze_message(content, context)

        # Return analysis result
        result = {
            "toxicity_level": analysis.toxicity_level.value,
            "toxicity_score": analysis.toxicity_score,
            "categories": [cat.value for cat in analysis.categories],
            "triggers": analysis.triggers,
            "explanation": analysis.explanation,
            "suggestion": analysis.suggestion,
            "is_flagged": analysis.is_flagged,
        }

        # If flagged, include intervention message
        if analysis.is_flagged:
            result["intervention"] = self.aria.get_intervention_message(analysis)

        return result

    async def send_message(
        self,
        message_data: MessageCreate,
        sender: User,
        intervention_action: Optional[InterventionAction] = None
    ) -> Message:
        """
        Send a message with ARIA tracking.

        Args:
            message_data: Message data
            sender: User sending the message
            intervention_action: User's response to ARIA intervention (if any)

        Returns:
            Created message

        Raises:
            HTTPException: If sending fails
        """
        # Verify access to case
        await self.case_service.get_case(message_data.case_id, sender)

        # Verify recipient is a participant
        if message_data.recipient_id:
            await self._verify_participant(message_data.case_id, message_data.recipient_id)

        try:
            # Analyze message
            analysis_result = await self.analyze_message(
                message_data.content,
                message_data.case_id,
                sender
            )

            # Determine final content
            final_content = message_data.content
            original_content = None
            suggestion_accepted = None

            if analysis_result["is_flagged"] and intervention_action:
                original_content = message_data.content

                if intervention_action.action == "accepted":
                    final_content = analysis_result["suggestion"]
                    suggestion_accepted = True
                elif intervention_action.action == "modified":
                    final_content = intervention_action.final_message
                    suggestion_accepted = False  # Partially accepted
                elif intervention_action.action == "rejected":
                    final_content = message_data.content
                    suggestion_accepted = False
                elif intervention_action.action == "cancelled":
                    # Don't send message if cancelled
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Message cancelled by user"
                    )

            # Create message with content hash
            import hashlib
            content_hash = hashlib.sha256(final_content.encode()).hexdigest()

            # Create message
            message = Message(
                case_id=message_data.case_id,
                thread_id=message_data.thread_id,
                sender_id=sender.id,
                recipient_id=message_data.recipient_id,
                content=final_content,
                content_hash=content_hash,
                message_type=message_data.message_type,
                sent_at=datetime.utcnow(),
                was_flagged=analysis_result["is_flagged"],
                original_content=original_content,
            )
            self.db.add(message)
            await self.db.flush()

            # If message was flagged, create flag record
            if analysis_result["is_flagged"]:
                import hashlib

                original_hash = hashlib.sha256(message_data.content.encode()).hexdigest()
                suggested_hash = hashlib.sha256(
                    (analysis_result["suggestion"] or "").encode()
                ).hexdigest() if analysis_result["suggestion"] else None
                final_hash = hashlib.sha256(final_content.encode()).hexdigest()

                flag = MessageFlag(
                    message_id=message.id,
                    toxicity_score=analysis_result["toxicity_score"],
                    severity=analysis_result["toxicity_level"],
                    categories=analysis_result["categories"],
                    original_content_hash=original_hash,
                    suggested_content=analysis_result["suggestion"],
                    suggested_content_hash=suggested_hash,
                    user_action=intervention_action.action if intervention_action else "accepted",
                    final_content_hash=final_hash,
                    intervention_level=self._get_intervention_level(analysis_result["toxicity_level"]),
                    intervention_message=analysis_result.get("explanation", ""),
                )
                self.db.add(flag)

            await self.db.commit()
            await self.db.refresh(message)

            # Send email notification to recipient
            try:
                if message_data.recipient_id:
                    # Get recipient user info
                    result = await self.db.execute(
                        select(User).where(User.id == message_data.recipient_id)
                    )
                    recipient = result.scalar_one_or_none()

                    # Get case info
                    result = await self.db.execute(
                        select(Case).where(Case.id == message_data.case_id)
                    )
                    case = result.scalar_one_or_none()

                    if recipient and case:
                        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
                        message_link = f"{frontend_url}/cases/{message_data.case_id}/messages"

                        # Truncate message for preview
                        message_preview = final_content[:100] if len(final_content) > 100 else final_content

                        await self.email_service.send_message_notification(
                            to_email=recipient.email,
                            to_name=f"{recipient.first_name} {recipient.last_name}",
                            sender_name=f"{sender.first_name} {sender.last_name}",
                            case_name=case.case_name,
                            message_preview=message_preview,
                            message_link=message_link,
                            was_flagged=analysis_result["is_flagged"]
                        )
            except Exception as email_error:
                # Log email error but don't fail message send
                print(f"Warning: Failed to send message notification email: {email_error}")

            # Broadcast message via WebSocket to connected users
            try:
                await manager.broadcast_to_case(
                    {
                        "type": "message",
                        "message_id": str(message.id),
                        "case_id": str(message.case_id),
                        "sender_id": str(sender.id),
                        "sender_name": f"{sender.first_name} {sender.last_name}",
                        "recipient_id": str(message.recipient_id) if message.recipient_id else None,
                        "content": final_content,
                        "message_type": message.message_type,
                        "sent_at": message.sent_at.isoformat(),
                        "was_flagged": analysis_result["is_flagged"]
                    },
                    str(message.case_id)
                )
            except Exception as ws_error:
                # Log WebSocket error but don't fail message send
                print(f"Warning: Failed to broadcast message via WebSocket: {ws_error}")

            return message

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send message: {str(e)}"
            ) from e

    async def get_messages(
        self,
        case_id: str,
        user: User,
        thread_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Message]:
        """
        Get messages for a case or thread.

        Args:
            case_id: ID of the case
            user: User requesting messages
            thread_id: Optional thread ID to filter by
            limit: Maximum number of messages
            offset: Pagination offset

        Returns:
            List of messages
        """
        # Verify access
        await self.case_service.get_case(case_id, user)

        # Build query
        query = (
            select(Message)
            .where(Message.case_id == case_id)
            .order_by(Message.sent_at.desc())
            .limit(limit)
            .offset(offset)
        )

        if thread_id:
            query = query.where(Message.thread_id == thread_id)

        result = await self.db.execute(query)
        messages = result.scalars().all()

        # Mark messages as delivered/read
        await self._mark_messages_read(messages, user.id)

        return list(reversed(messages))  # Return in chronological order

    async def get_message(
        self,
        message_id: str,
        user: User
    ) -> Message:
        """
        Get a specific message.

        Args:
            message_id: ID of the message
            user: User requesting the message

        Returns:
            Message

        Raises:
            HTTPException: If not found or no access
        """
        result = await self.db.execute(
            select(Message).where(Message.id == message_id)
        )
        message = result.scalar_one_or_none()

        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )

        # Verify access to case
        await self.case_service.get_case(message.case_id, user)

        return message

    async def get_analytics(
        self,
        case_id: str,
        user: User,
        user_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get good faith communication metrics.

        Args:
            case_id: ID of the case
            user: User requesting analytics
            user_id: Optional specific user to analyze
            days: Number of days to analyze

        Returns:
            Analytics data
        """
        # Verify access
        await self.case_service.get_case(case_id, user)

        since = datetime.utcnow() - timedelta(days=days)

        # Build query
        message_query = (
            select(Message)
            .where(
                and_(
                    Message.case_id == case_id,
                    Message.sent_at >= since
                )
            )
        )

        if user_id:
            message_query = message_query.where(Message.sender_id == user_id)

        messages_result = await self.db.execute(message_query)
        messages = messages_result.scalars().all()

        # Get flags for these messages
        message_ids = [m.id for m in messages]
        if message_ids:
            flags_result = await self.db.execute(
                select(MessageFlag).where(MessageFlag.message_id.in_(message_ids))
            )
            flags = flags_result.scalars().all()
        else:
            flags = []

        # Calculate metrics
        total_messages = len(messages)
        flagged_messages = len([m for m in messages if m.was_flagged])
        flag_rate = flagged_messages / total_messages if total_messages > 0 else 0.0

        suggestions_accepted = len([f for f in flags if f.user_action == "accepted"])
        suggestions_modified = len([f for f in flags if f.user_action == "modified"])
        suggestions_rejected = len([f for f in flags if f.user_action == "rejected"])

        total_interventions = suggestions_accepted + suggestions_modified + suggestions_rejected
        acceptance_rate = suggestions_accepted / total_interventions if total_interventions > 0 else 0.0

        avg_toxicity = (
            sum(f.toxicity_score for f in flags) / len(flags)
            if flags else 0.0
        )

        # Determine trend
        trend = await self._calculate_trend(case_id, user_id, days)

        return {
            "user_id": user_id or "all",
            "case_id": case_id,
            "total_messages": total_messages,
            "flagged_messages": flagged_messages,
            "flag_rate": flag_rate,
            "suggestions_accepted": suggestions_accepted,
            "suggestions_modified": suggestions_modified,
            "suggestions_rejected": suggestions_rejected,
            "acceptance_rate": acceptance_rate,
            "average_toxicity": avg_toxicity,
            "trend": trend,
            "period_start": since,
            "period_end": datetime.utcnow(),
        }

    async def get_trend_data(
        self,
        case_id: str,
        user: User,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get daily trend data for visualization.

        Args:
            case_id: ID of the case
            user: User requesting trend data
            days: Number of days

        Returns:
            List of daily data points
        """
        # Verify access
        await self.case_service.get_case(case_id, user)

        since = datetime.utcnow() - timedelta(days=days)

        # Get all messages in period
        messages_result = await self.db.execute(
            select(Message)
            .where(
                and_(
                    Message.case_id == case_id,
                    Message.sent_at >= since
                )
            )
            .order_by(Message.sent_at)
        )
        messages = messages_result.scalars().all()

        # Get all flags
        message_ids = [m.id for m in messages]
        if message_ids:
            flags_result = await self.db.execute(
                select(MessageFlag).where(MessageFlag.message_id.in_(message_ids))
            )
            flags = flags_result.scalars().all()
            flags_by_message = {f.message_id: f for f in flags}
        else:
            flags_by_message = {}

        # Group by day
        daily_data = {}
        for message in messages:
            date_key = message.sent_at.date().isoformat()

            if date_key not in daily_data:
                daily_data[date_key] = {
                    "date": date_key,
                    "message_count": 0,
                    "flagged_count": 0,
                    "total_toxicity": 0.0,
                    "accepted": 0,
                    "rejected": 0,
                }

            daily_data[date_key]["message_count"] += 1

            if message.was_flagged:
                daily_data[date_key]["flagged_count"] += 1

                flag = flags_by_message.get(message.id)
                if flag:
                    daily_data[date_key]["total_toxicity"] += flag.toxicity_score

                    if flag.user_action == "accepted":
                        daily_data[date_key]["accepted"] += 1
                    elif flag.user_action in ["rejected", "modified"]:
                        daily_data[date_key]["rejected"] += 1

        # Calculate averages and format
        result = []
        for date_key in sorted(daily_data.keys()):
            data = daily_data[date_key]
            data["average_toxicity"] = (
                data["total_toxicity"] / data["flagged_count"]
                if data["flagged_count"] > 0 else 0.0
            )
            del data["total_toxicity"]
            result.append(data)

        return result

    # Helper methods

    async def _get_recent_messages_text(
        self,
        case_id: str,
        limit: int = 5
    ) -> List[str]:
        """Get recent message texts for context"""
        result = await self.db.execute(
            select(Message.content)
            .where(Message.case_id == case_id)
            .order_by(Message.sent_at.desc())
            .limit(limit)
        )
        return [row[0] for row in result.all()]

    async def _verify_participant(self, case_id: str, user_id: str):
        """Verify user is a participant in the case"""
        result = await self.db.execute(
            select(CaseParticipant)
            .where(
                and_(
                    CaseParticipant.case_id == case_id,
                    CaseParticipant.user_id == user_id,
                    CaseParticipant.is_active == True
                )
            )
        )
        participant = result.scalar_one_or_none()

        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a participant in this case"
            )

    async def _mark_messages_read(self, messages: List[Message], user_id: str):
        """Mark messages as read by user"""
        for message in messages:
            if message.recipient_id == user_id and not message.read_at:
                message.read_at = datetime.utcnow()
                if not message.delivered_at:
                    message.delivered_at = datetime.utcnow()

        await self.db.commit()

    async def _calculate_trend(
        self,
        case_id: str,
        user_id: Optional[str],
        days: int
    ) -> str:
        """Calculate communication trend"""
        # Get data for two periods (current and previous)
        current_start = datetime.utcnow() - timedelta(days=days//2)
        previous_start = datetime.utcnow() - timedelta(days=days)

        # Current period flags
        current_query = select(MessageFlag).join(Message).where(
            and_(
                Message.case_id == case_id,
                Message.sent_at >= current_start
            )
        )
        if user_id:
            current_query = current_query.where(Message.sender_id == user_id)

        current_result = await self.db.execute(current_query)
        current_flags = current_result.scalars().all()

        # Previous period flags
        previous_query = select(MessageFlag).join(Message).where(
            and_(
                Message.case_id == case_id,
                Message.sent_at >= previous_start,
                Message.sent_at < current_start
            )
        )
        if user_id:
            previous_query = previous_query.where(Message.sender_id == user_id)

        previous_result = await self.db.execute(previous_query)
        previous_flags = previous_result.scalars().all()

        # Calculate average toxicity for each period
        current_avg = (
            sum(f.toxicity_score for f in current_flags) / len(current_flags)
            if current_flags else 0.0
        )
        previous_avg = (
            sum(f.toxicity_score for f in previous_flags) / len(previous_flags)
            if previous_flags else 0.0
        )

        # Determine trend
        if current_avg < previous_avg - 0.1:
            return "improving"
        elif current_avg > previous_avg + 0.1:
            return "worsening"
        else:
            return "stable"

    def _get_intervention_level(self, toxicity_level: str) -> int:
        """Map toxicity level to intervention level (1-4)"""
        levels = {
            "none": 1,
            "low": 1,
            "medium": 2,
            "high": 3,
            "severe": 4,
        }
        return levels.get(toxicity_level, 2)
