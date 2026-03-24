"""
DevOps Hub API - Sprint management, deployment tracking, and code quality endpoints.

Supports the SuperAdmin BizOps DevOps Hub with:
- Sprint velocity and repair trend analytics
- Code quality snapshots and trends
- AI-powered bug triage
- Deployment history
- Sprint and sprint item CRUD

All endpoints require is_admin=True on the authenticated user.
"""

import logging
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.bizops import (
    CodeQualitySnapshot,
    Deployment,
    Sprint,
    SprintItem,
)
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Request / Response Schemas
# =============================================================================

class SprintCreate(BaseModel):
    name: str
    goal: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class SprintItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    severity: Optional[str] = None
    platform: Optional[str] = None
    assigned_to: Optional[str] = None
    estimated_hours: Optional[float] = None
    story_points: int = 1


class SprintItemUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    actual_hours: Optional[float] = None
    resolution_notes: Optional[str] = None


class DeploymentCreate(BaseModel):
    environment: str
    status: str
    commit_sha: Optional[str] = None
    commit_message: Optional[str] = None
    branch: Optional[str] = None
    deployed_by: Optional[str] = None
    duration_seconds: Optional[int] = None


class BugDescription(BaseModel):
    title: str
    description: Optional[str] = None
    severity: Optional[str] = None
    platform: Optional[str] = None


class AITriageRequest(BaseModel):
    bugs: List[BugDescription]


# =============================================================================
# 1. Sprint Velocity Metrics
# =============================================================================

@router.get(
    "/devops/velocity",
    summary="Sprint velocity metrics",
)
async def get_sprint_velocity(
    last_n: int = Query(5, ge=1, le=50, description="Number of recent sprints"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Sprint velocity metrics: story points completed per sprint,
    completion rate, and average cycle time.
    """
    # Fetch the last N sprints ordered by start_date desc
    result = await db.execute(
        select(Sprint)
        .order_by(Sprint.start_date.desc().nullslast())
        .limit(last_n)
    )
    sprints = result.scalars().all()

    velocity_data = []
    for sprint in sprints:
        # Get items for this sprint
        items_result = await db.execute(
            select(SprintItem).where(SprintItem.sprint_id == str(sprint.id))
        )
        items = items_result.scalars().all()

        total_points = sum(item.story_points for item in items)
        completed_points = sum(
            item.story_points for item in items if item.status == "done"
        )
        total_items = len(items)
        completed_items = sum(1 for item in items if item.status == "done")
        completion_rate = (
            round(completed_items / total_items * 100, 1) if total_items > 0 else 0
        )

        # Average cycle time for completed items (created_at -> completed_at)
        cycle_times = []
        for item in items:
            if item.status == "done" and item.completed_at and item.created_at:
                delta = item.completed_at - item.created_at
                cycle_times.append(delta.total_seconds() / 3600)  # hours

        avg_cycle_time_hours = (
            round(sum(cycle_times) / len(cycle_times), 1) if cycle_times else None
        )

        velocity_data.append({
            "sprint_id": str(sprint.id),
            "sprint_name": sprint.name,
            "status": sprint.status,
            "start_date": sprint.start_date.isoformat() if sprint.start_date else None,
            "end_date": sprint.end_date.isoformat() if sprint.end_date else None,
            "total_points": total_points,
            "completed_points": completed_points,
            "total_items": total_items,
            "completed_items": completed_items,
            "completion_rate_pct": completion_rate,
            "avg_cycle_time_hours": avg_cycle_time_hours,
        })

    return {
        "sprints": velocity_data,
        "count": len(velocity_data),
    }


# =============================================================================
# 2. Bug Fix / Repair Trends
# =============================================================================

@router.get(
    "/devops/repair-trends",
    summary="Bug fix trends and MTTR",
)
async def get_repair_trends(
    days: int = Query(30, ge=7, le=180, description="Number of days to look back"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Bug fix trends: items opened vs closed per day, net flow,
    and mean time to resolve (MTTR).
    """
    since = datetime.utcnow() - __import__("datetime").timedelta(days=days)

    # Items created per day
    created_result = await db.execute(
        select(
            func.date(SprintItem.created_at).label("day"),
            func.count(SprintItem.id).label("count"),
        )
        .where(SprintItem.created_at >= since)
        .group_by(func.date(SprintItem.created_at))
        .order_by(func.date(SprintItem.created_at))
    )
    created_by_day = {str(row.day): row.count for row in created_result}

    # Items completed per day
    closed_result = await db.execute(
        select(
            func.date(SprintItem.completed_at).label("day"),
            func.count(SprintItem.id).label("count"),
        )
        .where(
            SprintItem.completed_at >= since,
            SprintItem.completed_at.isnot(None),
        )
        .group_by(func.date(SprintItem.completed_at))
        .order_by(func.date(SprintItem.completed_at))
    )
    closed_by_day = {str(row.day): row.count for row in closed_result}

    # Merge into daily entries
    all_days = sorted(set(list(created_by_day.keys()) + list(closed_by_day.keys())))
    daily = []
    for day in all_days:
        opened = created_by_day.get(day, 0)
        closed = closed_by_day.get(day, 0)
        daily.append({
            "date": day,
            "opened": opened,
            "closed": closed,
            "net": opened - closed,
        })

    # MTTR: mean time to resolve for items completed in the period
    resolved_result = await db.execute(
        select(SprintItem)
        .where(
            SprintItem.completed_at >= since,
            SprintItem.completed_at.isnot(None),
            SprintItem.created_at.isnot(None),
        )
    )
    resolved_items = resolved_result.scalars().all()
    resolve_times = []
    for item in resolved_items:
        delta = item.completed_at - item.created_at
        resolve_times.append(delta.total_seconds() / 3600)

    mttr_hours = (
        round(sum(resolve_times) / len(resolve_times), 1) if resolve_times else None
    )

    return {
        "period_days": days,
        "daily": daily,
        "total_opened": sum(d["opened"] for d in daily),
        "total_closed": sum(d["closed"] for d in daily),
        "mttr_hours": mttr_hours,
        "resolved_count": len(resolve_times),
    }


# =============================================================================
# 3. Code Quality Snapshot
# =============================================================================

@router.get(
    "/devops/code-quality",
    summary="Latest code quality snapshot and trend",
)
async def get_code_quality(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Latest code quality metrics and trend over the last 10 snapshots.
    """
    # Latest snapshot
    latest_result = await db.execute(
        select(CodeQualitySnapshot)
        .order_by(CodeQualitySnapshot.date.desc())
        .limit(1)
    )
    latest = latest_result.scalar_one_or_none()

    # Trend: last 10 snapshots
    trend_result = await db.execute(
        select(CodeQualitySnapshot)
        .order_by(CodeQualitySnapshot.date.desc())
        .limit(10)
    )
    trend_rows = trend_result.scalars().all()

    def _snapshot_dict(snap: CodeQualitySnapshot) -> dict:
        return {
            "id": str(snap.id),
            "date": snap.date.isoformat() if snap.date else None,
            "test_coverage_pct": float(snap.test_coverage_pct) if snap.test_coverage_pct is not None else None,
            "lint_errors": snap.lint_errors,
            "type_errors": snap.type_errors,
            "vulnerability_count": snap.vulnerability_count,
            "bundle_size_kb": snap.bundle_size_kb,
            "source": snap.source,
        }

    return {
        "latest": _snapshot_dict(latest) if latest else None,
        "trend": [_snapshot_dict(s) for s in trend_rows],
    }


# =============================================================================
# 4. AI Bug Triage
# =============================================================================

@router.post(
    "/devops/ai-triage",
    summary="AI-powered bug triage",
)
async def ai_triage(
    body: AITriageRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Submit bug descriptions for AI-powered triage.
    Returns prioritization, pattern detection, and effort estimates.
    """
    from app.services.bizops_ai import generate_devops_triage

    bugs = [bug.model_dump() for bug in body.bugs]

    # Optionally include recent deployments for context
    deploy_result = await db.execute(
        select(Deployment)
        .order_by(Deployment.deployed_at.desc())
        .limit(5)
    )
    recent_deployments = [
        {
            "environment": d.environment,
            "status": d.status,
            "commit_sha": d.commit_sha,
            "commit_message": d.commit_message,
            "branch": d.branch,
            "deployed_at": d.deployed_at.isoformat() if d.deployed_at else None,
        }
        for d in deploy_result.scalars().all()
    ]

    result = await generate_devops_triage(
        bugs=bugs,
        recent_deployments=recent_deployments,
    )

    return result


# =============================================================================
# 5. Deployments List
# =============================================================================

@router.get(
    "/devops/deployments",
    summary="List deployments",
)
async def list_deployments(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """List recent deployments ordered by deployed_at descending."""
    result = await db.execute(
        select(Deployment)
        .order_by(Deployment.deployed_at.desc())
        .limit(limit)
    )
    deployments = result.scalars().all()

    return {
        "deployments": [
            {
                "id": str(d.id),
                "environment": d.environment,
                "status": d.status,
                "commit_sha": d.commit_sha,
                "commit_message": d.commit_message,
                "branch": d.branch,
                "deployed_by": d.deployed_by,
                "deployed_at": d.deployed_at.isoformat() if d.deployed_at else None,
                "duration_seconds": d.duration_seconds,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in deployments
        ],
        "count": len(deployments),
    }


# =============================================================================
# 6. Sprints List (with items grouped by status)
# =============================================================================

@router.get(
    "/devops/sprints",
    summary="List sprints with items",
)
async def list_sprints(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """List all sprints with their items grouped by status."""
    result = await db.execute(
        select(Sprint).order_by(Sprint.start_date.desc().nullslast())
    )
    sprints = result.scalars().all()

    sprint_list = []
    for sprint in sprints:
        items_result = await db.execute(
            select(SprintItem).where(SprintItem.sprint_id == str(sprint.id))
        )
        items = items_result.scalars().all()

        # Group items by status
        grouped: dict = {}
        for item in items:
            status_key = item.status or "todo"
            if status_key not in grouped:
                grouped[status_key] = []
            grouped[status_key].append({
                "id": str(item.id),
                "title": item.title,
                "description": item.description,
                "severity": item.severity,
                "platform": item.platform,
                "assigned_to": item.assigned_to,
                "estimated_hours": float(item.estimated_hours) if item.estimated_hours is not None else None,
                "actual_hours": float(item.actual_hours) if item.actual_hours is not None else None,
                "story_points": item.story_points,
                "resolution_notes": item.resolution_notes,
                "completed_at": item.completed_at.isoformat() if item.completed_at else None,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            })

        sprint_list.append({
            "id": str(sprint.id),
            "name": sprint.name,
            "goal": sprint.goal,
            "status": sprint.status,
            "start_date": sprint.start_date.isoformat() if sprint.start_date else None,
            "end_date": sprint.end_date.isoformat() if sprint.end_date else None,
            "planned_points": sprint.planned_points,
            "completed_points": sprint.completed_points,
            "items_by_status": grouped,
            "total_items": len(items),
        })

    return {
        "sprints": sprint_list,
        "count": len(sprint_list),
    }


# =============================================================================
# 7. Create Sprint
# =============================================================================

@router.post(
    "/devops/sprints",
    summary="Create a new sprint",
    status_code=status.HTTP_201_CREATED,
)
async def create_sprint(
    body: SprintCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Create a new sprint with name, goal, and date range."""
    sprint = Sprint(
        name=body.name,
        goal=body.goal,
        start_date=body.start_date,
        end_date=body.end_date,
        status="planning",
        planned_points=0,
        completed_points=0,
    )
    db.add(sprint)
    await db.commit()
    await db.refresh(sprint)

    return {
        "id": str(sprint.id),
        "name": sprint.name,
        "goal": sprint.goal,
        "status": sprint.status,
        "start_date": sprint.start_date.isoformat() if sprint.start_date else None,
        "end_date": sprint.end_date.isoformat() if sprint.end_date else None,
    }


# =============================================================================
# 8. Add Item to Sprint
# =============================================================================

@router.post(
    "/devops/sprints/{sprint_id}/items",
    summary="Add item to sprint",
    status_code=status.HTTP_201_CREATED,
)
async def add_sprint_item(
    sprint_id: str,
    body: SprintItemCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Add a new item to an existing sprint."""
    # Verify sprint exists
    sprint_result = await db.execute(
        select(Sprint).where(Sprint.id == sprint_id)
    )
    sprint = sprint_result.scalar_one_or_none()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    item = SprintItem(
        sprint_id=sprint_id,
        title=body.title,
        description=body.description,
        severity=body.severity,
        platform=body.platform,
        status="todo",
        assigned_to=body.assigned_to,
        estimated_hours=body.estimated_hours,
        story_points=body.story_points,
    )
    db.add(item)

    # Update sprint planned points
    sprint.planned_points = sprint.planned_points + body.story_points

    await db.commit()
    await db.refresh(item)

    return {
        "id": str(item.id),
        "sprint_id": sprint_id,
        "title": item.title,
        "status": item.status,
        "story_points": item.story_points,
        "assigned_to": item.assigned_to,
    }


# =============================================================================
# 9. Update Sprint Item
# =============================================================================

@router.patch(
    "/devops/sprints/{sprint_id}/items/{item_id}",
    summary="Update sprint item",
)
async def update_sprint_item(
    sprint_id: str,
    item_id: str,
    body: SprintItemUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Update a sprint item's status, assigned_to, actual_hours, or resolution_notes.
    If status changes to 'done', sets completed_at and updates sprint completed_points.
    """
    # Verify sprint exists
    sprint_result = await db.execute(
        select(Sprint).where(Sprint.id == sprint_id)
    )
    sprint = sprint_result.scalar_one_or_none()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    # Fetch item
    item_result = await db.execute(
        select(SprintItem).where(
            SprintItem.id == item_id,
            SprintItem.sprint_id == sprint_id,
        )
    )
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Sprint item not found")

    old_status = item.status

    # Apply updates
    if body.status is not None:
        item.status = body.status
    if body.assigned_to is not None:
        item.assigned_to = body.assigned_to
    if body.actual_hours is not None:
        item.actual_hours = body.actual_hours
    if body.resolution_notes is not None:
        item.resolution_notes = body.resolution_notes

    # Handle transition to "done"
    if body.status == "done" and old_status != "done":
        item.completed_at = datetime.utcnow()
        sprint.completed_points = sprint.completed_points + item.story_points

    # Handle transition away from "done" (undo)
    if old_status == "done" and body.status is not None and body.status != "done":
        item.completed_at = None
        sprint.completed_points = max(
            sprint.completed_points - item.story_points, 0
        )

    await db.commit()
    await db.refresh(item)

    return {
        "id": str(item.id),
        "sprint_id": sprint_id,
        "title": item.title,
        "status": item.status,
        "assigned_to": item.assigned_to,
        "actual_hours": float(item.actual_hours) if item.actual_hours is not None else None,
        "resolution_notes": item.resolution_notes,
        "completed_at": item.completed_at.isoformat() if item.completed_at else None,
        "story_points": item.story_points,
    }


# =============================================================================
# 10. Record Deployment
# =============================================================================

@router.post(
    "/devops/deployments",
    summary="Record a deployment",
    status_code=status.HTTP_201_CREATED,
)
async def create_deployment(
    body: DeploymentCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Record a new deployment event."""
    deployment = Deployment(
        environment=body.environment,
        status=body.status,
        commit_sha=body.commit_sha,
        commit_message=body.commit_message,
        branch=body.branch,
        deployed_by=body.deployed_by,
        deployed_at=datetime.utcnow(),
        duration_seconds=body.duration_seconds,
    )
    db.add(deployment)
    await db.commit()
    await db.refresh(deployment)

    return {
        "id": str(deployment.id),
        "environment": deployment.environment,
        "status": deployment.status,
        "commit_sha": deployment.commit_sha,
        "branch": deployment.branch,
        "deployed_by": deployment.deployed_by,
        "deployed_at": deployment.deployed_at.isoformat(),
        "duration_seconds": deployment.duration_seconds,
    }
