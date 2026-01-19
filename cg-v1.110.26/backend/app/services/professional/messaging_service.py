"""
Professional-client messaging service layer.

Business logic for secure messaging between professionals
and their clients (parents) on assigned cases.
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.professional import (
    ProfessionalProfile,
    CaseAssignment,
    ProfessionalMessage,
    ProfessionalAccessLog,
    AssignmentStatus,
)
from app.models.family_file import FamilyFile
from app.models.user import User
from app.schemas.professional import ProfessionalMessageCreate


# =============================================================================
# Professional Messaging Service
# =============================================================================

class ProfessionalMessagingService:
    """Service for professional-client messaging."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # -------------------------------------------------------------------------
    # Send Messages
    # -------------------------------------------------------------------------

    async def send_message(
        self,
        professional_id: str,
        family_file_id: str,
        data: ProfessionalMessageCreate,
        sender_user_id: str,
    ) -> ProfessionalMessage:
        """
        Send a message from a professional to a client.

        Validates that the professional has an active assignment with
        messaging permission before sending.
        """
        # Verify assignment and permission
        assignment = await self._get_assignment_with_permission(
            professional_id, family_file_id
        )
        if not assignment:
            raise ValueError("Professional does not have messaging permission for this case")

        # Verify recipient is a party on the case
        if not await self._is_valid_recipient(family_file_id, data.recipient_id):
            raise ValueError("Recipient is not a party on this case")

        # Create thread_id if starting a new thread
        thread_id = data.thread_id
        if not thread_id and not data.reply_to_id:
            thread_id = str(uuid4())
        elif data.reply_to_id and not thread_id:
            # Get thread_id from the message being replied to
            reply_msg = await self.get_message(data.reply_to_id)
            if reply_msg:
                thread_id = reply_msg.thread_id or str(uuid4())

        message = ProfessionalMessage(
            id=str(uuid4()),
            family_file_id=family_file_id,
            case_assignment_id=assignment.id,
            sender_id=sender_user_id,
            sender_type="professional",
            recipient_id=data.recipient_id,
            subject=data.subject,
            content=data.content,
            thread_id=thread_id,
            reply_to_id=data.reply_to_id,
            attachments=data.attachments,
            is_read=False,
            sent_at=datetime.utcnow(),
        )

        self.db.add(message)

        # Log the action
        await self._log_action(
            professional_id=professional_id,
            firm_id=assignment.firm_id,
            family_file_id=family_file_id,
            action="message_client",
            resource_type="professional_message",
            resource_id=message.id,
            details={
                "recipient_id": data.recipient_id,
                "has_attachments": bool(data.attachments),
                "thread_id": thread_id,
            },
        )

        await self.db.commit()
        await self.db.refresh(message)

        return message

    async def send_client_reply(
        self,
        family_file_id: str,
        sender_user_id: str,
        case_assignment_id: str,
        data: ProfessionalMessageCreate,
    ) -> ProfessionalMessage:
        """
        Send a reply from a client (parent) to a professional.

        This is called from the parent's side when responding to
        professional messages.
        """
        # Verify assignment exists and is active
        assignment = await self._get_assignment_by_id(case_assignment_id)
        if not assignment or assignment.status != AssignmentStatus.ACTIVE.value:
            raise ValueError("Invalid or inactive case assignment")

        if assignment.family_file_id != family_file_id:
            raise ValueError("Assignment does not match family file")

        # Verify sender is a party on the case
        if not await self._is_valid_recipient(family_file_id, sender_user_id):
            raise ValueError("Sender is not a party on this case")

        # Get professional's user_id for recipient
        professional = await self._get_professional_profile(assignment.professional_id)
        if not professional:
            raise ValueError("Professional not found")

        # Get thread_id if replying
        thread_id = data.thread_id
        if data.reply_to_id and not thread_id:
            reply_msg = await self.get_message(data.reply_to_id)
            if reply_msg:
                thread_id = reply_msg.thread_id or str(uuid4())

        message = ProfessionalMessage(
            id=str(uuid4()),
            family_file_id=family_file_id,
            case_assignment_id=case_assignment_id,
            sender_id=sender_user_id,
            sender_type="parent",
            recipient_id=professional.user_id,
            subject=data.subject,
            content=data.content,
            thread_id=thread_id,
            reply_to_id=data.reply_to_id,
            attachments=data.attachments,
            is_read=False,
            sent_at=datetime.utcnow(),
        )

        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)

        return message

    # -------------------------------------------------------------------------
    # Get Messages
    # -------------------------------------------------------------------------

    async def get_message(self, message_id: str) -> Optional[ProfessionalMessage]:
        """Get a single message by ID."""
        result = await self.db.execute(
            select(ProfessionalMessage).where(ProfessionalMessage.id == message_id)
        )
        return result.scalar_one_or_none()

    async def get_messages_for_case(
        self,
        professional_id: str,
        family_file_id: str,
        limit: int = 50,
        offset: int = 0,
        thread_id: Optional[str] = None,
    ) -> list[dict]:
        """
        Get messages for a specific case.

        Returns messages enriched with sender/recipient info.
        """
        # Verify assignment
        assignment = await self._get_assignment_with_permission(
            professional_id, family_file_id
        )
        if not assignment:
            raise ValueError("Professional does not have access to this case")

        # Build query
        query = (
            select(ProfessionalMessage)
            .where(ProfessionalMessage.case_assignment_id == assignment.id)
        )

        if thread_id:
            query = query.where(ProfessionalMessage.thread_id == thread_id)

        query = query.order_by(desc(ProfessionalMessage.sent_at)).limit(limit).offset(offset)

        result = await self.db.execute(query)
        messages = result.scalars().all()

        # Enrich with user info
        enriched = []
        for msg in messages:
            enriched.append(await self._enrich_message(msg))

        return enriched

    async def get_threads_for_case(
        self,
        professional_id: str,
        family_file_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict]:
        """
        Get message threads for a case.

        Returns thread summaries with latest message preview.
        """
        # Verify assignment
        assignment = await self._get_assignment_with_permission(
            professional_id, family_file_id
        )
        if not assignment:
            raise ValueError("Professional does not have access to this case")

        # Get distinct threads with counts
        subquery = (
            select(
                ProfessionalMessage.thread_id,
                func.count(ProfessionalMessage.id).label("message_count"),
                func.sum(
                    func.cast(
                        and_(
                            ProfessionalMessage.is_read == False,
                            ProfessionalMessage.recipient_id == (
                                await self._get_professional_user_id(professional_id)
                            ),
                        ),
                        type_=func.Integer
                    )
                ).label("unread_count"),
                func.max(ProfessionalMessage.sent_at).label("last_message_at"),
            )
            .where(
                and_(
                    ProfessionalMessage.case_assignment_id == assignment.id,
                    ProfessionalMessage.thread_id.isnot(None),
                )
            )
            .group_by(ProfessionalMessage.thread_id)
            .order_by(desc(func.max(ProfessionalMessage.sent_at)))
            .limit(limit)
            .offset(offset)
            .subquery()
        )

        result = await self.db.execute(select(subquery))
        thread_rows = result.fetchall()

        threads = []
        for row in thread_rows:
            # Get latest message in thread for preview
            latest_msg_result = await self.db.execute(
                select(ProfessionalMessage)
                .where(ProfessionalMessage.thread_id == row.thread_id)
                .order_by(desc(ProfessionalMessage.sent_at))
                .limit(1)
            )
            latest_msg = latest_msg_result.scalar_one_or_none()

            # Get first message for subject
            first_msg_result = await self.db.execute(
                select(ProfessionalMessage)
                .where(ProfessionalMessage.thread_id == row.thread_id)
                .order_by(ProfessionalMessage.sent_at)
                .limit(1)
            )
            first_msg = first_msg_result.scalar_one_or_none()

            # Get participants
            participants_result = await self.db.execute(
                select(func.distinct(ProfessionalMessage.sender_id))
                .where(ProfessionalMessage.thread_id == row.thread_id)
            )
            participant_ids = [r[0] for r in participants_result.fetchall()]

            threads.append({
                "thread_id": row.thread_id,
                "family_file_id": family_file_id,
                "case_assignment_id": assignment.id,
                "subject": first_msg.subject if first_msg else None,
                "last_message_at": row.last_message_at,
                "message_count": row.message_count,
                "unread_count": row.unread_count or 0,
                "participants": participant_ids,
                "latest_preview": latest_msg.content[:100] if latest_msg else None,
            })

        return threads

    async def get_all_messages_for_professional(
        self,
        professional_id: str,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        """
        Get all messages across all cases for a professional.

        Used for the global inbox view.
        """
        professional_user_id = await self._get_professional_user_id(professional_id)
        if not professional_user_id:
            return []

        # Get all active assignments for this professional
        assignments_result = await self.db.execute(
            select(CaseAssignment.id)
            .where(
                and_(
                    CaseAssignment.professional_id == professional_id,
                    CaseAssignment.status == AssignmentStatus.ACTIVE.value,
                )
            )
        )
        assignment_ids = [row[0] for row in assignments_result.fetchall()]

        if not assignment_ids:
            return []

        # Build query for messages
        query = (
            select(ProfessionalMessage)
            .where(
                and_(
                    ProfessionalMessage.case_assignment_id.in_(assignment_ids),
                    or_(
                        ProfessionalMessage.sender_id == professional_user_id,
                        ProfessionalMessage.recipient_id == professional_user_id,
                    ),
                )
            )
        )

        if unread_only:
            query = query.where(
                and_(
                    ProfessionalMessage.recipient_id == professional_user_id,
                    ProfessionalMessage.is_read == False,
                )
            )

        query = query.order_by(desc(ProfessionalMessage.sent_at)).limit(limit).offset(offset)

        result = await self.db.execute(query)
        messages = result.scalars().all()

        # Enrich with user info
        enriched = []
        for msg in messages:
            enriched.append(await self._enrich_message(msg))

        return enriched

    # -------------------------------------------------------------------------
    # Mark as Read
    # -------------------------------------------------------------------------

    async def mark_as_read(
        self,
        message_id: str,
        user_id: str,
    ) -> Optional[ProfessionalMessage]:
        """Mark a message as read."""
        message = await self.get_message(message_id)
        if not message:
            return None

        # Only recipient can mark as read
        if message.recipient_id != user_id:
            return message

        if not message.is_read:
            message.is_read = True
            message.read_at = datetime.utcnow()
            await self.db.commit()
            await self.db.refresh(message)

        return message

    async def mark_thread_as_read(
        self,
        thread_id: str,
        user_id: str,
    ) -> int:
        """Mark all messages in a thread as read for a user."""
        result = await self.db.execute(
            select(ProfessionalMessage)
            .where(
                and_(
                    ProfessionalMessage.thread_id == thread_id,
                    ProfessionalMessage.recipient_id == user_id,
                    ProfessionalMessage.is_read == False,
                )
            )
        )
        messages = result.scalars().all()

        count = 0
        for msg in messages:
            msg.is_read = True
            msg.read_at = datetime.utcnow()
            count += 1

        if count > 0:
            await self.db.commit()

        return count

    # -------------------------------------------------------------------------
    # Statistics
    # -------------------------------------------------------------------------

    async def get_unread_count(
        self,
        professional_id: str,
        family_file_id: Optional[str] = None,
    ) -> int:
        """Get unread message count for a professional."""
        professional_user_id = await self._get_professional_user_id(professional_id)
        if not professional_user_id:
            return 0

        query = select(func.count(ProfessionalMessage.id)).where(
            and_(
                ProfessionalMessage.recipient_id == professional_user_id,
                ProfessionalMessage.is_read == False,
            )
        )

        if family_file_id:
            query = query.where(ProfessionalMessage.family_file_id == family_file_id)

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_messaging_stats(
        self,
        professional_id: str,
        family_file_id: str,
    ) -> dict:
        """Get messaging statistics for a case."""
        # Verify assignment
        assignment = await self._get_assignment_with_permission(
            professional_id, family_file_id
        )
        if not assignment:
            return {
                "total_messages": 0,
                "sent_by_professional": 0,
                "sent_by_client": 0,
                "unread": 0,
                "threads": 0,
            }

        professional_user_id = await self._get_professional_user_id(professional_id)

        # Total messages
        total_result = await self.db.execute(
            select(func.count(ProfessionalMessage.id))
            .where(ProfessionalMessage.case_assignment_id == assignment.id)
        )
        total = total_result.scalar() or 0

        # Sent by professional
        pro_result = await self.db.execute(
            select(func.count(ProfessionalMessage.id))
            .where(
                and_(
                    ProfessionalMessage.case_assignment_id == assignment.id,
                    ProfessionalMessage.sender_type == "professional",
                )
            )
        )
        by_professional = pro_result.scalar() or 0

        # Unread (by professional)
        unread_result = await self.db.execute(
            select(func.count(ProfessionalMessage.id))
            .where(
                and_(
                    ProfessionalMessage.case_assignment_id == assignment.id,
                    ProfessionalMessage.recipient_id == professional_user_id,
                    ProfessionalMessage.is_read == False,
                )
            )
        )
        unread = unread_result.scalar() or 0

        # Thread count
        thread_result = await self.db.execute(
            select(func.count(func.distinct(ProfessionalMessage.thread_id)))
            .where(
                and_(
                    ProfessionalMessage.case_assignment_id == assignment.id,
                    ProfessionalMessage.thread_id.isnot(None),
                )
            )
        )
        threads = thread_result.scalar() or 0

        return {
            "total_messages": total,
            "sent_by_professional": by_professional,
            "sent_by_client": total - by_professional,
            "unread": unread,
            "threads": threads,
        }

    # -------------------------------------------------------------------------
    # Private Helpers
    # -------------------------------------------------------------------------

    async def _get_assignment_with_permission(
        self,
        professional_id: str,
        family_file_id: str,
    ) -> Optional[CaseAssignment]:
        """Get active assignment with messaging permission."""
        result = await self.db.execute(
            select(CaseAssignment)
            .where(
                and_(
                    CaseAssignment.professional_id == professional_id,
                    CaseAssignment.family_file_id == family_file_id,
                    CaseAssignment.status == AssignmentStatus.ACTIVE.value,
                    CaseAssignment.can_message_client == True,
                )
            )
        )
        return result.scalar_one_or_none()

    async def _get_assignment_by_id(
        self,
        assignment_id: str,
    ) -> Optional[CaseAssignment]:
        """Get assignment by ID."""
        result = await self.db.execute(
            select(CaseAssignment).where(CaseAssignment.id == assignment_id)
        )
        return result.scalar_one_or_none()

    async def _get_professional_profile(
        self,
        professional_id: str,
    ) -> Optional[ProfessionalProfile]:
        """Get professional profile."""
        result = await self.db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.id == professional_id)
        )
        return result.scalar_one_or_none()

    async def _get_professional_user_id(
        self,
        professional_id: str,
    ) -> Optional[str]:
        """Get user_id for a professional."""
        result = await self.db.execute(
            select(ProfessionalProfile.user_id)
            .where(ProfessionalProfile.id == professional_id)
        )
        return result.scalar_one_or_none()

    async def _is_valid_recipient(
        self,
        family_file_id: str,
        user_id: str,
    ) -> bool:
        """Check if user is a party on the case (parent_a or parent_b)."""
        result = await self.db.execute(
            select(FamilyFile)
            .where(FamilyFile.id == family_file_id)
        )
        family_file = result.scalar_one_or_none()
        if not family_file:
            return False

        return user_id in [family_file.parent_a_id, family_file.parent_b_id]

    async def _enrich_message(self, message: ProfessionalMessage) -> dict:
        """Enrich message with sender/recipient names."""
        # Get sender info
        sender_result = await self.db.execute(
            select(User.first_name, User.last_name).where(User.id == message.sender_id)
        )
        sender_row = sender_result.one_or_none()
        sender_name = f"{sender_row[0]} {sender_row[1]}" if sender_row else None

        # Get recipient info
        recipient_result = await self.db.execute(
            select(User.first_name, User.last_name).where(User.id == message.recipient_id)
        )
        recipient_row = recipient_result.one_or_none()
        recipient_name = f"{recipient_row[0]} {recipient_row[1]}" if recipient_row else None

        return {
            "id": message.id,
            "family_file_id": message.family_file_id,
            "case_assignment_id": message.case_assignment_id,
            "sender_id": message.sender_id,
            "sender_type": message.sender_type,
            "sender_name": sender_name,
            "recipient_id": message.recipient_id,
            "recipient_name": recipient_name,
            "subject": message.subject,
            "content": message.content,
            "thread_id": message.thread_id,
            "reply_to_id": message.reply_to_id,
            "is_read": message.is_read,
            "read_at": message.read_at,
            "attachments": message.attachments,
            "sent_at": message.sent_at,
            "created_at": message.created_at,
        }

    async def _log_action(
        self,
        professional_id: str,
        firm_id: Optional[str],
        family_file_id: str,
        action: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[dict] = None,
    ) -> None:
        """Log professional action for audit trail."""
        log = ProfessionalAccessLog(
            id=str(uuid4()),
            professional_id=professional_id,
            firm_id=firm_id,
            family_file_id=family_file_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            logged_at=datetime.utcnow(),
        )
        self.db.add(log)
