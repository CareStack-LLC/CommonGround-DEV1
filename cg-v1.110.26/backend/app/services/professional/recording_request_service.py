"""Recording-access request workflow.

A professional may request ONE specific KidSpace/Circle call recording, stating
a reason. Both parents on the case must approve before a time-limited download
link is issued. There is no blanket access to children's recordings.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.professional import RecordingAccessRequest
from app.models.circle_call import CircleCallSession
from app.models.family_file import FamilyFile
from app.services.storage import storage_service, StorageBucket

logger = logging.getLogger(__name__)

# How long an issued download link / access window stays valid after approval.
ACCESS_WINDOW_DAYS = 7
SIGNED_URL_TTL_SECONDS = 3600


class RecordingRequestService:
    """Create, approve/deny, and grant time-limited access to recordings."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ----------------------------- creation ----------------------------- #

    async def create_request(
        self,
        *,
        professional_id: str,
        family_file_id: str,
        session_id: str,
        reason: str,
        requested_by_user_id: str,
    ) -> RecordingAccessRequest:
        if not reason or not reason.strip():
            raise ValueError("A reason is required to request a recording")

        session = await self._get_session(session_id)
        if not session or session.family_file_id != family_file_id:
            raise ValueError("Recording not found for this case")
        if not (session.recording_storage_path or session.recording_url):
            raise ValueError("This call has no recording available")

        req = RecordingAccessRequest(
            id=str(uuid4()),
            family_file_id=family_file_id,
            session_id=session_id,
            professional_id=professional_id,
            requested_by_user_id=requested_by_user_id,
            reason=reason.strip(),
            status="pending",
            expires_at=datetime.utcnow() + timedelta(days=14),
        )
        self.db.add(req)
        await self.db.commit()
        await self.db.refresh(req)
        return req

    # ------------------------------ listing ----------------------------- #

    async def list_for_professional(
        self, professional_id: str, family_file_id: Optional[str] = None
    ) -> list[RecordingAccessRequest]:
        conditions = [RecordingAccessRequest.professional_id == professional_id]
        if family_file_id:
            conditions.append(RecordingAccessRequest.family_file_id == family_file_id)
        result = await self.db.execute(
            select(RecordingAccessRequest)
            .where(and_(*conditions))
            .order_by(desc(RecordingAccessRequest.created_at))
        )
        return list(result.scalars().all())

    async def list_for_parent(
        self, family_file_id: str, status: Optional[str] = "pending"
    ) -> list[RecordingAccessRequest]:
        conditions = [RecordingAccessRequest.family_file_id == family_file_id]
        if status:
            conditions.append(RecordingAccessRequest.status == status)
        result = await self.db.execute(
            select(RecordingAccessRequest)
            .where(and_(*conditions))
            .order_by(desc(RecordingAccessRequest.created_at))
        )
        return list(result.scalars().all())

    # --------------------------- parent actions ------------------------- #

    async def approve(
        self, request_id: str, approver_user_id: str
    ) -> RecordingAccessRequest:
        req = await self._get(request_id)
        if not req:
            raise ValueError("Request not found")
        if req.status != "pending":
            raise ValueError(f"Request is already {req.status}")
        if req.is_expired:
            req.status = "expired"
            await self.db.commit()
            raise ValueError("Request has expired")

        family_file = await self._get_family_file(req.family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        now = datetime.utcnow()
        if approver_user_id == family_file.parent_a_id:
            req.parent_a_approved = True
            req.parent_a_approved_at = now
        elif approver_user_id == family_file.parent_b_id:
            req.parent_b_approved = True
            req.parent_b_approved_at = now
        else:
            raise ValueError("Only a parent on this case can approve this request")

        # Both guardians must approve (single-parent file → just parent A).
        needs_b = family_file.parent_b_id is not None
        fully_approved = req.parent_a_approved and (
            req.parent_b_approved or not needs_b
        )
        if fully_approved:
            req.status = "approved"
            req.approved_at = now
            req.access_expires_at = now + timedelta(days=ACCESS_WINDOW_DAYS)

        await self.db.commit()
        await self.db.refresh(req)
        return req

    async def deny(
        self, request_id: str, approver_user_id: str, reason: Optional[str] = None
    ) -> RecordingAccessRequest:
        req = await self._get(request_id)
        if not req:
            raise ValueError("Request not found")
        if req.status not in ("pending",):
            raise ValueError(f"Request is already {req.status}")

        family_file = await self._get_family_file(req.family_file_id)
        if not family_file or approver_user_id not in (
            family_file.parent_a_id,
            family_file.parent_b_id,
        ):
            raise ValueError("Only a parent on this case can deny this request")

        req.status = "denied"
        req.declined_at = datetime.utcnow()
        req.decline_reason = (reason or "").strip() or None
        await self.db.commit()
        await self.db.refresh(req)
        return req

    # ------------------------------ grant ------------------------------- #

    async def get_grant(self, professional_id: str, request_id: str) -> dict:
        """Return request status and, if approved + within window, a
        time-limited signed download URL for the recording."""
        req = await self._get(request_id)
        if not req or req.professional_id != professional_id:
            raise ValueError("Request not found")

        # Lazily expire a stale approval window.
        if req.status == "approved" and not req.access_active:
            req.status = "expired"
            await self.db.commit()

        payload = self.serialize(req)
        if req.access_active:
            session = await self._get_session(req.session_id)
            url = ""
            if session and session.recording_storage_path:
                try:
                    url = await storage_service.get_signed_url(
                        StorageBucket.CALL_RECORDINGS,
                        session.recording_storage_path,
                        expires_in=SIGNED_URL_TTL_SECONDS,
                    )
                except Exception as e:  # pragma: no cover - storage edge
                    logger.error("Failed signing recording URL: %s", e)
                    url = session.recording_url or ""
            elif session:
                url = session.recording_url or ""
            payload["download_url"] = url
            payload["download_expires_in"] = SIGNED_URL_TTL_SECONDS
        return payload

    # ----------------------------- helpers ------------------------------ #

    @staticmethod
    def serialize(req: RecordingAccessRequest) -> dict:
        return {
            "id": req.id,
            "family_file_id": req.family_file_id,
            "session_id": req.session_id,
            "professional_id": req.professional_id,
            "reason": req.reason,
            "status": req.status,
            "parent_a_approved": req.parent_a_approved,
            "parent_b_approved": req.parent_b_approved,
            "approved_at": req.approved_at.isoformat() if req.approved_at else None,
            "declined_at": req.declined_at.isoformat() if req.declined_at else None,
            "decline_reason": req.decline_reason,
            "expires_at": req.expires_at.isoformat() if req.expires_at else None,
            "access_expires_at": (
                req.access_expires_at.isoformat() if req.access_expires_at else None
            ),
            "created_at": req.created_at.isoformat() if req.created_at else None,
        }

    async def _get(self, request_id: str) -> Optional[RecordingAccessRequest]:
        result = await self.db.execute(
            select(RecordingAccessRequest).where(
                RecordingAccessRequest.id == request_id
            )
        )
        return result.scalar_one_or_none()

    async def _get_session(self, session_id: str) -> Optional[CircleCallSession]:
        result = await self.db.execute(
            select(CircleCallSession).where(CircleCallSession.id == session_id)
        )
        return result.scalar_one_or_none()

    async def _get_family_file(self, family_file_id: str) -> Optional[FamilyFile]:
        result = await self.db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        return result.scalar_one_or_none()
