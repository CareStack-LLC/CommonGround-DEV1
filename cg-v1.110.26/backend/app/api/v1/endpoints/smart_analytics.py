from typing import Any, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.agreement import Agreement, ComplianceLog
from app.services.smart_schedule import SmartScheduleGenerator

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
    # 1. Verify Access
    # TODO: Check if user has access to this agreement

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
    
    # 3. Calculate Actuals (from ComplianceLogs)
    # TODO: aggregating verified check-ins
    
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
            "parent_a_percent": 0.0, # Placeholder
            "parent_b_percent": 0.0, # Placeholder
            "data_quality": "low_data" # metadata
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
