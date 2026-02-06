"""
Analytics API - Usage statistics and metrics.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.schedule import ScheduleEvent

router = APIRouter()


class SwapRequestStats(BaseModel):
    """Statistics for swap requests."""
    total_requests: int
    accepted_requests: int
    rejected_requests: int
    pending_requests: int
    acceptance_rate: float


@router.get(
    "/swap-requests",
    response_model=SwapRequestStats,
    summary="Get swap request statistics",
    description="Get statistics on swap requests (total, accepted, rejected)."
)
async def get_swap_request_stats(
    family_file_id: Optional[str] = Query(None, description="Filter by family file ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get swap request statistics.
    
    Returns:
    - Total requests
    - Accepted requests (modification_approved=True)
    - Rejected requests (modification_approved=False, status='cancelled')
    - Pending requests (modification_approved=False, status='pending')
    """
    
    # Base query for swap requests
    query = select(ScheduleEvent).where(
        ScheduleEvent.event_type == "swap_request",
        ScheduleEvent.is_modification == True
    )
    
    # Apply filter if provided
    if family_file_id:
        query = query.where(ScheduleEvent.family_file_id == family_file_id)
        
        # Verify access to family file (if restricted logic is needed)
        # For now, relying on broader access controls or assuming this is for authorized views
    
    result = await db.execute(query)
    events = result.scalars().all()
    
    total = len(events)
    accepted = 0
    rejected = 0
    pending = 0
    
    for event in events:
        if event.modification_approved:
            accepted += 1
        elif event.status == "cancelled":
            rejected += 1
        elif event.status == "pending":
            pending += 1
            
    # Calculate rate
    rate = 0.0
    if total > 0:
        rate = (accepted / total) * 100
        
    return SwapRequestStats(
        total_requests=total,
        accepted_requests=accepted,
        rejected_requests=rejected,
        pending_requests=pending,
        acceptance_rate=round(rate, 1)
    )

class AriaIntervention(BaseModel):
    """ARIA Intervention Event Record"""
    id: str
    timestamp: datetime
    user_id: Optional[str]
    family_file_id: Optional[str]
    content_type: str
    action_taken: str
    severity: str
    score: float
    categories: List[str]
    original_content: Optional[str]
    context: Optional[Dict[str, Any]]


@router.get(
    "/aria-interventions",
    response_model=List[AriaIntervention],
    summary="Get ARIA intervention history",
    description="Get log of ARIA interventions (blocks/flags) with context."
)
async def get_aria_interventions(
    family_file_id: Optional[str] = Query(None, description="Filter by family file ID"),
    start_date: Optional[datetime] = Query(None, description="Start date"),
    end_date: Optional[datetime] = Query(None, description="End date"),
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import text
    import json
    
    # Build query
    sql = """
        SELECT 
            id, created_at, user_id, family_file_id, 
            content_type, action_taken, severity_level, toxicity_score, 
            labels, original_content, context_data
        FROM aria_events
        WHERE 1=1
    """
    params = {}
    
    if family_file_id:
        sql += " AND family_file_id = :ff_id"
        params["ff_id"] = family_file_id
        
    if start_date:
        sql += " AND created_at >= :start"
        params["start"] = start_date
        
    if end_date:
        sql += " AND created_at <= :end"
        params["end"] = end_date
        
    sql += " ORDER BY created_at DESC LIMIT :limit"
    params["limit"] = limit
    
    result = await db.execute(text(sql), params)
    rows = result.fetchall()
    
    interventions = []
    for row in rows:
        # Parse labels (JSON) to get category names
        labels_data = row.labels if row.labels else []
        if isinstance(labels_data, str):
             labels_data = json.loads(labels_data)
        
        categories = [l.get("name") for l in labels_data] if isinstance(labels_data, list) else []
        
        interventions.append(AriaIntervention(
            id=str(row.id),
            timestamp=row.created_at,
            user_id=str(row.user_id) if row.user_id else None,
            family_file_id=str(row.family_file_id) if row.family_file_id else None,
            content_type=row.content_type or "text",
            action_taken=row.action_taken or "flagged",
            severity=row.severity_level or "unknown",
            score=row.toxicity_score or 0.0,
            categories=categories,
            original_content=row.original_content,
            context=row.context_data
        ))
        
    return interventions
