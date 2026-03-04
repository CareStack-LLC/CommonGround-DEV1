"""
ARIA control service for professionals.

Business logic for professionals to view and control ARIA settings
for their assigned cases, including intervention history and metrics.
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.professional import (
    CaseAssignment,
    ProfessionalAccessLog,
    AssignmentStatus,
)
from app.models.family_file import FamilyFile
from app.models.message import Message, MessageFlag
from app.models.court import CourtCaseSettings


# =============================================================================
# ARIA Control Service
# =============================================================================

class ARIAControlService:
    """Service for professional ARIA controls."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # -------------------------------------------------------------------------
    # Get ARIA Settings
    # -------------------------------------------------------------------------

    async def get_aria_settings(
        self,
        family_file_id: str,
        professional_id: str,
    ) -> dict:
        """
        Get current ARIA settings for a case.

        Returns the ARIA configuration including:
        - Enabled status
        - Sensitivity level
        - Auto-intervention settings
        - Professional preferences
        """
        # Verify access
        assignment = await self._verify_aria_access(professional_id, family_file_id)

        # Get family file
        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        # Get case ID (family file may have a legacy_case_id linking to old Case model)
        case_id = family_file.legacy_case_id

        # Get court settings if they exist
        court_settings = await self._get_court_settings(case_id) if case_id else None

        # Get professional's ARIA preferences for this case
        prof_prefs = assignment.aria_preferences or {}

        return {
            "family_file_id": family_file_id,
            "case_id": case_id,
            "aria_enabled": family_file.aria_enabled,
            "aria_provider": family_file.aria_provider,
            "sensitivity_level": court_settings.aria_sensitivity if court_settings else "medium",
            "auto_intervene": court_settings.aria_auto_intervene if court_settings else True,
            "intervention_threshold": prof_prefs.get("intervention_threshold", 0.7),
            "notification_on_flag": prof_prefs.get("notification_on_flag", True),
            "professional_preferences": prof_prefs,
            "can_modify": assignment.can_control_aria,
        }

    async def update_aria_settings(
        self,
        family_file_id: str,
        professional_id: str,
        settings: dict,
    ) -> dict:
        """
        Update ARIA settings for a case.

        Only professionals with can_control_aria permission can modify.
        """
        assignment = await self._verify_aria_access(professional_id, family_file_id)

        if not assignment.can_control_aria:
            raise ValueError("Professional does not have permission to control ARIA for this case")

        # Get family file
        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        # Update family file ARIA settings directly if provided
        if "aria_enabled" in settings:
            family_file.aria_enabled = settings["aria_enabled"]
            if not settings["aria_enabled"]:
                from datetime import datetime
                family_file.aria_disabled_at = datetime.utcnow()
                family_file.aria_disabled_by = assignment.professional_id

        # Get case ID for court settings (may be None for non-court cases)
        case_id = family_file.legacy_case_id

        court_settings = await self._get_court_settings(case_id) if case_id else None

        # Update court settings if case is linked (only for court-involved cases)
        if case_id:
            if court_settings:
                # Update existing settings
                if "sensitivity_level" in settings:
                    court_settings.aria_sensitivity = settings["sensitivity_level"]
                if "auto_intervene" in settings:
                    court_settings.aria_auto_intervene = settings["auto_intervene"]
                court_settings.updated_at = datetime.utcnow()
            elif "sensitivity_level" in settings or "auto_intervene" in settings:
                # Create new court settings only if we have settings to save
                court_settings = CourtCaseSettings(
                    id=str(uuid4()),
                    case_id=case_id,
                    aria_sensitivity=settings.get("sensitivity_level", "medium"),
                    aria_auto_intervene=settings.get("auto_intervene", True),
                )
                self.db.add(court_settings)

        # Update professional's preferences
        if "professional_preferences" in settings:
            assignment.aria_preferences = {
                **(assignment.aria_preferences or {}),
                **settings["professional_preferences"],
            }
            assignment.updated_at = datetime.utcnow()

        await self.db.commit()

        # Log the action
        await self._log_aria_action(
            professional_id,
            family_file_id,
            "update_settings",
            {"settings": settings},
        )

        return await self.get_aria_settings(family_file_id, professional_id)

    # -------------------------------------------------------------------------
    # Intervention History
    # -------------------------------------------------------------------------

    async def get_intervention_history(
        self,
        family_file_id: str,
        professional_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        """
        Get ARIA intervention history for a case.

        Returns flagged messages and interventions.
        """
        await self._verify_aria_access(professional_id, family_file_id)

        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            return {"interventions": [], "total_count": 0}

        # Query messages by family_file_id (preferred) or legacy case_id
        case_id = family_file.legacy_case_id

        # Get flagged messages - query by family_file_id or case_id
        if case_id:
            message_filter = or_(
                Message.family_file_id == family_file_id,
                Message.case_id == case_id,
            )
        else:
            message_filter = Message.family_file_id == family_file_id

        query = (
            select(Message)
            .where(
                and_(
                    message_filter,
                    Message.was_flagged == True,
                )
            )
        )

        if start_date:
            query = query.where(Message.created_at >= start_date)
        if end_date:
            query = query.where(Message.created_at <= end_date)

        # Get total count
        count_query = select(func.count(Message.id)).where(
            and_(
                message_filter,
                Message.was_flagged == True,
            )
        )
        if start_date:
            count_query = count_query.where(Message.created_at >= start_date)
        if end_date:
            count_query = count_query.where(Message.created_at <= end_date)

        count_result = await self.db.execute(count_query)
        total_count = count_result.scalar() or 0

        # Get paginated results
        query = query.order_by(desc(Message.created_at)).limit(limit).offset(offset)
        result = await self.db.execute(query)

        interventions = []
        for msg in result.scalars().all():
            # Check if content was modified after ARIA suggestion
            was_modified = msg.original_content is not None and msg.original_content != msg.content
            interventions.append({
                "id": msg.id,
                "timestamp": msg.created_at,
                "sender_id": msg.sender_id,
                "content_preview": msg.content[:200] + "..." if len(msg.content) > 200 else msg.content,
                "original_content": msg.original_content[:200] + "..." if msg.original_content and len(msg.original_content) > 200 else msg.original_content,
                "intervention_type": "flag",
                "was_blocked": False,  # Messages are never blocked, only flagged
                "was_modified": was_modified,
            })

        return {
            "interventions": interventions,
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total_count,
        }

    async def get_intervention_detail(
        self,
        family_file_id: str,
        professional_id: str,
        message_id: str,
    ) -> dict:
        """
        Get detailed information about a specific intervention.
        """
        await self._verify_aria_access(professional_id, family_file_id)

        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        case_id = family_file.legacy_case_id
        if not case_id:
            raise ValueError("Family file has no linked case")

        result = await self.db.execute(
            select(Message).where(
                and_(
                    Message.id == message_id,
                    Message.case_id == case_id,
                )
            )
        )
        msg = result.scalar_one_or_none()

        if not msg:
            raise ValueError("Message not found")

        # Get any related message flags
        flags_result = await self.db.execute(
            select(MessageFlag).where(MessageFlag.message_id == message_id)
        )
        flags = list(flags_result.scalars().all())

        return {
            "message": {
                "id": msg.id,
                "sender_id": msg.sender_id,
                "content": msg.content,
                "created_at": msg.created_at,
                "is_flagged": msg.is_flagged,
                "flag_reason": msg.flag_reason,
                "sentiment_score": msg.sentiment_score,
                "original_content": msg.original_content if hasattr(msg, 'original_content') else None,
            },
            "flags": [
                {
                    "id": f.id,
                    "flag_type": f.flag_type,
                    "reason": f.reason,
                    "created_at": f.created_at,
                    "created_by": f.created_by,
                }
                for f in flags
            ],
            "context": {
                "family_file_id": family_file_id,
                "case_id": case_id,
            },
        }

    # -------------------------------------------------------------------------
    # ARIA Metrics
    # -------------------------------------------------------------------------

    async def get_aria_metrics(
        self,
        family_file_id: str,
        professional_id: str,
        days: int = 30,
    ) -> dict:
        """
        Get ARIA metrics for a case.

        Returns:
        - Message volume
        - Flag rate
        - Sentiment trends
        - Good faith indicators
        """
        await self._verify_aria_access(professional_id, family_file_id)

        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            return {}

        case_id = family_file.legacy_case_id
        if not case_id:
            return {}

        since = datetime.utcnow() - timedelta(days=days)

        # Total messages
        total_messages = await self._count_messages(case_id, since)

        # Flagged messages
        flagged_messages = await self._count_flagged_messages(case_id, since)

        # Average sentiment by sender
        sentiment_by_sender = await self._get_sentiment_by_sender(
            case_id, since
        )

        # Flag rate
        flag_rate = (flagged_messages / total_messages * 100) if total_messages > 0 else 0

        # Sentiment trend (last 7 days vs previous 7 days)
        recent_sentiment = await self._get_average_sentiment(
            case_id,
            datetime.utcnow() - timedelta(days=7),
            datetime.utcnow(),
        )
        previous_sentiment = await self._get_average_sentiment(
            case_id,
            datetime.utcnow() - timedelta(days=14),
            datetime.utcnow() - timedelta(days=7),
        )

        sentiment_trend = "improving" if recent_sentiment > previous_sentiment else (
            "declining" if recent_sentiment < previous_sentiment else "stable"
        )

        return {
            "period_days": days,
            "total_messages": total_messages,
            "flagged_messages": flagged_messages,
            "flag_rate": round(flag_rate, 2),
            "sentiment_by_sender": sentiment_by_sender,
            "average_sentiment": round(recent_sentiment, 2) if recent_sentiment else None,
            "sentiment_trend": sentiment_trend,
            "good_faith_score": await self._calculate_good_faith_score(
                case_id, since
            ),
        }

    async def get_parent_metrics(
        self,
        family_file_id: str,
        professional_id: str,
        parent_user_id: str,
        days: int = 30,
    ) -> dict:
        """
        Get ARIA metrics for a specific parent.
        """
        await self._verify_aria_access(professional_id, family_file_id)

        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            return {}

        case_id = family_file.legacy_case_id
        if not case_id:
            return {}

        since = datetime.utcnow() - timedelta(days=days)

        # Messages sent by this parent
        messages_sent = await self._count_messages_by_sender(
            case_id, parent_user_id, since
        )

        # Flagged messages by this parent
        flagged_sent = await self._count_flagged_by_sender(
            case_id, parent_user_id, since
        )

        # Average sentiment
        avg_sentiment = await self._get_sender_average_sentiment(
            case_id, parent_user_id, since
        )

        return {
            "parent_user_id": parent_user_id,
            "period_days": days,
            "messages_sent": messages_sent,
            "flagged_messages": flagged_sent,
            "flag_rate": round((flagged_sent / messages_sent * 100) if messages_sent > 0 else 0, 2),
            "average_sentiment": round(avg_sentiment, 2) if avg_sentiment else None,
        }

    # -------------------------------------------------------------------------
    # Private Helpers
    # -------------------------------------------------------------------------

    async def _verify_aria_access(
        self,
        professional_id: str,
        family_file_id: str,
    ) -> CaseAssignment:
        """Verify professional has access to ARIA for this case."""
        result = await self.db.execute(
            select(CaseAssignment).where(
                and_(
                    CaseAssignment.professional_id == professional_id,
                    CaseAssignment.family_file_id == family_file_id,
                    CaseAssignment.status == AssignmentStatus.ACTIVE.value,
                )
            )
        )
        assignment = result.scalar_one_or_none()

        if not assignment:
            raise ValueError("Professional does not have access to this case")

        # Check if they have the interventions scope
        if "interventions" not in (assignment.access_scopes or []):
            raise ValueError("Professional does not have ARIA access scope")

        return assignment

    async def _get_family_file(
        self,
        family_file_id: str,
    ) -> Optional[FamilyFile]:
        result = await self.db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        return result.scalar_one_or_none()

    async def _get_court_settings(
        self,
        case_id: str,
    ) -> Optional[CourtCaseSettings]:
        result = await self.db.execute(
            select(CourtCaseSettings).where(CourtCaseSettings.case_id == case_id)
        )
        return result.scalar_one_or_none()

    async def _log_aria_action(
        self,
        professional_id: str,
        family_file_id: str,
        action: str,
        details: dict,
    ) -> None:
        """Log an ARIA control action."""
        log = ProfessionalAccessLog(
            id=str(uuid4()),
            professional_id=professional_id,
            family_file_id=family_file_id,
            action=f"aria_{action}",
            resource_type="aria_settings",
            details=details,
            logged_at=datetime.utcnow(),
        )
        self.db.add(log)
        await self.db.commit()

    async def _count_messages(
        self,
        case_id: str,
        since: datetime,
    ) -> int:
        result = await self.db.execute(
            select(func.count(Message.id)).where(
                and_(
                    Message.case_id == case_id,
                    Message.created_at >= since,
                )
            )
        )
        return result.scalar() or 0

    async def _count_flagged_messages(
        self,
        case_id: str,
        since: datetime,
    ) -> int:
        result = await self.db.execute(
            select(func.count(Message.id)).where(
                and_(
                    Message.case_id == case_id,
                    Message.created_at >= since,
                    Message.was_flagged == True,
                )
            )
        )
        return result.scalar() or 0

    async def _count_messages_by_sender(
        self,
        case_id: str,
        sender_id: str,
        since: datetime,
    ) -> int:
        result = await self.db.execute(
            select(func.count(Message.id)).where(
                and_(
                    Message.case_id == case_id,
                    Message.sender_id == sender_id,
                    Message.created_at >= since,
                )
            )
        )
        return result.scalar() or 0

    async def _count_flagged_by_sender(
        self,
        case_id: str,
        sender_id: str,
        since: datetime,
    ) -> int:
        result = await self.db.execute(
            select(func.count(Message.id)).where(
                and_(
                    Message.case_id == case_id,
                    Message.sender_id == sender_id,
                    Message.created_at >= since,
                    Message.was_flagged == True,
                )
            )
        )
        return result.scalar() or 0

    async def _get_sentiment_by_sender(
        self,
        case_id: str,
        since: datetime,
    ) -> dict:
        """Get average sentiment grouped by sender."""
        result = await self.db.execute(
            select(
                Message.sender_id,
                func.avg(Message.sentiment_score).label("avg_sentiment"),
                func.count(Message.id).label("message_count"),
            )
            .where(
                and_(
                    Message.case_id == case_id,
                    Message.created_at >= since,
                    Message.sentiment_score.isnot(None),
                )
            )
            .group_by(Message.sender_id)
        )

        return {
            row.sender_id: {
                "average_sentiment": round(float(row.avg_sentiment), 2) if row.avg_sentiment else None,
                "message_count": row.message_count,
            }
            for row in result.fetchall()
        }

    async def _get_average_sentiment(
        self,
        case_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> Optional[float]:
        result = await self.db.execute(
            select(func.avg(Message.sentiment_score)).where(
                and_(
                    Message.case_id == case_id,
                    Message.created_at >= start_date,
                    Message.created_at <= end_date,
                    Message.sentiment_score.isnot(None),
                )
            )
        )
        avg = result.scalar()
        return float(avg) if avg else None

    async def _get_sender_average_sentiment(
        self,
        case_id: str,
        sender_id: str,
        since: datetime,
    ) -> Optional[float]:
        result = await self.db.execute(
            select(func.avg(Message.sentiment_score)).where(
                and_(
                    Message.case_id == case_id,
                    Message.sender_id == sender_id,
                    Message.created_at >= since,
                    Message.sentiment_score.isnot(None),
                )
            )
        )
        avg = result.scalar()
        return float(avg) if avg else None

    async def _calculate_good_faith_score(
        self,
        case_id: str,
        since: datetime,
    ) -> Optional[float]:
        """
        Calculate a good faith score based on messaging patterns.

        Score is 0-100 based on:
        - Response rate
        - Flag rate (inverse)
        - Sentiment trends
        """
        total = await self._count_messages(case_id, since)
        flagged = await self._count_flagged_messages(case_id, since)

        if total == 0:
            return None

        # Base score of 100
        score = 100.0

        # Deduct for flag rate (up to 40 points)
        flag_rate = flagged / total
        score -= min(flag_rate * 100, 40)

        # Factor in average sentiment (up to 30 points bonus/deduction)
        avg_sentiment = await self._get_average_sentiment(
            case_id,
            since,
            datetime.utcnow(),
        )
        if avg_sentiment is not None:
            # Sentiment is typically -1 to 1, map to -30 to +30
            sentiment_factor = avg_sentiment * 30
            score += sentiment_factor

        return max(0, min(100, round(score, 1)))
