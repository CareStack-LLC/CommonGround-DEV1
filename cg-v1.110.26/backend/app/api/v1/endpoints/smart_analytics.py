from typing import Any, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.agreement import Agreement, ComplianceLog
from app.services.smart_schedule import SmartScheduleGenerator
from app.utils.sentry_helpers import capture_error

router = APIRouter()

@router.get("/custody-time")
async def get_custody_time_stats(
    agreement_id: str,
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get Scheduled vs. Actual custody time percentages.
    """
    # 1. Verify user has access to this agreement's family file
    agreement_result = await db.execute(
        select(Agreement).where(Agreement.id == agreement_id)
    )
    agreement_obj = agreement_result.scalar_one_or_none()
    if not agreement_obj:
        raise HTTPException(status_code=404, detail="Agreement not found")

    from app.models.family_file import FamilyFile
    from sqlalchemy import and_, or_
    ff_check = await db.execute(
        select(FamilyFile).where(
            and_(
                FamilyFile.id == agreement_obj.family_file_id,
                or_(
                    FamilyFile.parent_a_id == current_user.id,
                    FamilyFile.parent_b_id == current_user.id,
                )
            )
        )
    )
    if not ff_check.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="You do not have access to this agreement")

    # 2. Calculate Scheduled Time (from Smart Rules)
    generator = SmartScheduleGenerator(db)
    scheduled_events = await generator.generate_events(agreement_id, start_date, end_date)
    
    # Simple count for now (assuming daily granularity for MVP)
    # In production, this would sum hours/minutes
    total_days = (end_date - start_date).days + 1
    if total_days == 0:
        return {"scheduled": {}, "actual": {}}

    parent_a_days = sum(1 for e in scheduled_events if e.get("custodian_id") == "parent_a") # Placeholder logic
    parent_b_days = sum(1 for e in scheduled_events if e.get("custodian_id") == "parent_b")
    
    # 3. Calculate Actuals from CustodyDayRecord data
    actual_parent_a_percent = 0.0
    actual_parent_b_percent = 0.0
    data_quality = "low_data"

    try:
        # Look up the agreement's family file and children
        agreement_result = await db.execute(
            select(Agreement).where(Agreement.id == agreement_id)
        )
        agreement = agreement_result.scalar_one_or_none()
        if agreement and agreement.family_file_id:
            from app.models.family_file import FamilyFile
            ff_result = await db.execute(
                select(FamilyFile).where(FamilyFile.id == agreement.family_file_id)
            )
            family_file = ff_result.scalar_one_or_none()
            if family_file and family_file.parent_a_id and family_file.parent_b_id:
                from app.models.child import Child
                children_result = await db.execute(
                    select(Child).where(Child.family_file_id == family_file.id)
                )
                children = children_result.scalars().all()
                if children:
                    from app.services.custody_time import CustodyTimeService
                    # Aggregate across all children
                    total_a = 0.0
                    total_b = 0.0
                    child_count = 0
                    for child in children:
                        stats = await CustodyTimeService.get_custody_time_stats(
                            db, family_file.id, child.id,
                            start_date.date() if hasattr(start_date, 'date') else start_date,
                            end_date.date() if hasattr(end_date, 'date') else end_date,
                            family_file.parent_a_id, family_file.parent_b_id
                        )
                        if stats.get("total_days", 0) > 0:
                            total_a += stats.get("parent_a_percent", 0)
                            total_b += stats.get("parent_b_percent", 0)
                            child_count += 1
                    if child_count > 0:
                        actual_parent_a_percent = round(total_a / child_count, 1)
                        actual_parent_b_percent = round(total_b / child_count, 1)
                        data_quality = "good" if child_count > 0 and total_days > 7 else "partial"
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to calculate actual custody time: {e}")

    return {
        "period": {
            "start": start_date,
            "end": end_date,
            "total_days": total_days
        },
        "scheduled": {
            "parent_a_percent": round(parent_a_days / total_days * 100, 1) if total_days else 0,
            "parent_b_percent": round(parent_b_days / total_days * 100, 1) if total_days else 0
        },
        "actual": {
            "parent_a_percent": actual_parent_a_percent,
            "parent_b_percent": actual_parent_b_percent,
            "data_quality": data_quality
        }
    }

@router.get("/compliance")
async def get_compliance_log(
    agreement_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get audit trail of compliance events (verified exchanges, missed check-ins).
    """
    result = await db.execute(
        select(ComplianceLog)
        .where(ComplianceLog.agreement_id == agreement_id)
        .order_by(ComplianceLog.recorded_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    
    return [
        {
            "id": log.id,
            "type": log.log_type,
            "severity": log.severity,
            "description": log.description,
            "timestamp": log.recorded_at,
            "is_verified": log.is_verified
        }
        for log in logs
    ]
