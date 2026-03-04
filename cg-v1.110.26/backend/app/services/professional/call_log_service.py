"""
Professional Call Log Service.

Business logic for logging and retrieving voice/video calls
involving professionals and case participants.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.professional import ProfessionalCallLog, ProfessionalProfile
from app.models.family_file import FamilyFile
from app.schemas.professional import ProfessionalCallLogCreate


class ProfessionalCallLogService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_call(
        self, 
        professional_id: str, 
        data: ProfessionalCallLogCreate
    ) -> ProfessionalCallLog:
        """
        Record a new call log.
        """
        db_log = ProfessionalCallLog(
            professional_id=professional_id,
            family_file_id=data.family_file_id,
            case_assignment_id=data.case_assignment_id,
            call_type=data.call_type,
            participant_ids=data.participant_ids,
            duration_seconds=data.duration_seconds,
            status=data.status,
            notes=data.notes,
            recording_url=data.recording_url,
            started_at=data.started_at or datetime.utcnow(),
            ended_at=data.ended_at
        )
        self.db.add(db_log)
        await self.db.commit()
        await self.db.refresh(db_log)
        return db_log

    async def get_call_logs(
        self,
        professional_id: Optional[str] = None,
        family_file_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[list[ProfessionalCallLog], int]:
        """
        List call logs with optional filtering.
        """
        query = select(ProfessionalCallLog)
        
        if professional_id:
            query = query.where(ProfessionalCallLog.professional_id == professional_id)
        if family_file_id:
            query = query.where(ProfessionalCallLog.family_file_id == family_file_id)
            
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)
        
        # Get paginated results
        query = query.order_by(ProfessionalCallLog.started_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(query)
        logs = list(result.scalars().all())
        
        return logs, total or 0

    async def get_call_log(self, log_id: str) -> Optional[ProfessionalCallLog]:
        """
        Get a specific call log by ID.
        """
        result = await self.db.execute(
            select(ProfessionalCallLog).where(ProfessionalCallLog.id == log_id)
        )
        return result.scalar_one_or_none()
