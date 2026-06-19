"""KidSpace (My Circle) safety-incident view for professionals.

Surfaces ARIA-flagged child communications and call-safety events to an
assigned professional who holds the ``circle`` access scope. Read-only summary
of "what went wrong" — flagged messages and flagged/terminated calls. It does
NOT expose call recordings; a professional must request a specific recording
via the recording-access-request workflow.
"""

import json
import logging
from typing import Optional

from sqlalchemy import select, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.circle_message import CircleMessage
from app.models.circle_call import CircleCallSession

logger = logging.getLogger(__name__)


class CircleIncidentsService:
    """Builds the professional-facing KidSpace incident feed for a case."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_incidents(
        self,
        family_file_id: str,
        limit: int = 100,
    ) -> dict:
        """Return flagged messages + flagged/terminated calls for a case.

        Recordings are never included here — only a ``has_recording`` flag and
        the ``session_id`` needed to request the video separately.
        """
        # --- Flagged / hidden circle messages -------------------------------
        msg_result = await self.db.execute(
            select(CircleMessage)
            .where(
                CircleMessage.family_file_id == family_file_id,
                or_(
                    CircleMessage.aria_flagged.is_(True),
                    CircleMessage.is_hidden.is_(True),
                ),
            )
            .order_by(desc(CircleMessage.sent_at))
            .limit(limit)
        )
        messages = msg_result.scalars().all()

        # --- Calls that ARIA intervened on or terminated --------------------
        call_result = await self.db.execute(
            select(CircleCallSession)
            .where(
                CircleCallSession.family_file_id == family_file_id,
                or_(
                    CircleCallSession.aria_terminated_call.is_(True),
                    CircleCallSession.aria_intervention_count > 0,
                    CircleCallSession.status == "terminated",
                ),
            )
            .options(selectinload(CircleCallSession.flags))
            .order_by(desc(CircleCallSession.initiated_at))
            .limit(limit)
        )
        calls = call_result.scalars().all()

        message_incidents = [self._message_incident(m) for m in messages]
        call_incidents = [self._call_incident(c) for c in calls]

        terminated = sum(1 for c in calls if c.aria_terminated_call)

        return {
            "family_file_id": family_file_id,
            "flagged_message_count": len(message_incidents),
            "flagged_call_count": len(call_incidents),
            "terminated_call_count": terminated,
            "incidents": self._sorted_incidents(message_incidents + call_incidents),
        }

    # ------------------------------------------------------------------ #

    def _message_incident(self, m: CircleMessage) -> dict:
        all_categories = None
        if m.aria_all_categories:
            try:
                all_categories = json.loads(m.aria_all_categories)
            except (ValueError, TypeError):
                all_categories = None
        return {
            "type": "message",
            "id": m.id,
            "child_id": m.child_id,
            "sender_name": m.sender_name,
            "sender_type": m.sender_type,
            "recipient_type": m.recipient_type,
            "content": m.content,
            "original_content": m.original_content,
            "category": m.aria_category,
            "all_categories": all_categories,
            "reason": m.aria_reason,
            "score": m.aria_score,
            "intervention_level": m.aria_intervention_level,
            "user_action": m.user_action,
            "is_hidden": m.is_hidden,
            "occurred_at": m.sent_at.isoformat() if m.sent_at else None,
        }

    def _call_incident(self, c: CircleCallSession) -> dict:
        flags = [
            {
                "severity": f.severity,
                "categories": f.categories,
                "triggers": f.triggers,
                "intervention_type": f.intervention_type,
                "intervention_message": f.intervention_message,
                "toxicity_score": f.toxicity_score,
                "call_time_seconds": f.call_time_seconds,
                "offending_speaker_type": f.offending_speaker_type,
                "flagged_at": f.flagged_at.isoformat() if f.flagged_at else None,
            }
            for f in sorted(
                c.flags or [],
                key=lambda x: x.flagged_at or x.created_at,
                reverse=True,
            )
        ]
        return {
            "type": "call",
            "id": c.id,
            "session_id": c.id,
            "child_id": c.child_id,
            "circle_contact_id": c.circle_contact_id,
            "status": c.status,
            "aria_terminated": c.aria_terminated_call,
            "termination_reason": c.aria_termination_reason,
            "intervention_count": c.aria_intervention_count,
            "overall_safety_score": c.overall_safety_score,
            "duration_seconds": c.duration_seconds,
            "occurred_at": c.initiated_at.isoformat() if c.initiated_at else None,
            # Recordings are not exposed here — only whether one exists and the
            # session id needed to request it via the approval workflow.
            "has_recording": bool(c.recording_storage_path or c.recording_url),
            "flags": flags,
        }

    @staticmethod
    def _sorted_incidents(incidents: list[dict]) -> list[dict]:
        return sorted(
            incidents,
            key=lambda i: i.get("occurred_at") or "",
            reverse=True,
        )
