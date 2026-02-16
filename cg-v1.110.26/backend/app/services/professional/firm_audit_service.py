from datetime import datetime
from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.professional import FirmAuditLog

class FirmAuditLogService:
    """
    Service for managing firm audit logs.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_event(
        self,
        firm_id: str,
        actor_id: str,
        event_type: str,
        description: str,
        metadata: dict = None
    ) -> FirmAuditLog:
        """
        Log an event in the firm's audit trail.
        
        Args:
            firm_id: The firm where the event occurred
            actor_id: The professional who performed the action
            event_type: Type of event (e.g., case_assigned, member_invited)
            description: Human-readable description
            metadata: Additional context data
        
        Returns:
            The created FirmAuditLog entry
        """
        log = FirmAuditLog(
            id=str(uuid4()),
            firm_id=firm_id,
            actor_id=actor_id,
            event_type=event_type,
            description=description,
            event_metadata=metadata or {},
            created_at=datetime.utcnow()
        )
        self.db.add(log)
        # Note: We do not commit here to allow the caller to include this in a transaction.
        return log

    async def get_firm_audit_log(
        self,
        firm_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> list[FirmAuditLog]:
        """
        Get recent audit logs for a firm.
        """
        stmt = (
            select(FirmAuditLog)
            .options(selectinload(FirmAuditLog.actor))
            .where(FirmAuditLog.firm_id == firm_id)
            .order_by(FirmAuditLog.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
