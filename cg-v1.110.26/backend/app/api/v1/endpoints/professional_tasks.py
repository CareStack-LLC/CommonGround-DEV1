"""
Professional Tasks API endpoints.
Phase 1: Dashboard & Navigation - Task CRUD.
Route prefix: /api/v1/professional/tasks
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.professional import ProfessionalProfile
from app.api.v1.endpoints.professional import get_current_professional
from app.services.professional.task_service import ProfessionalTaskService

router = APIRouter(prefix="/professional/tasks", tags=["professional-tasks"])


class TaskCreateBody(BaseModel):
    title: str
    description: Optional[str] = None
    case_id: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str = "medium"


class TaskUpdateBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None


@router.get("", summary="List professional tasks")
async def list_tasks(
    completed: Optional[bool] = Query(None),
    priority: Optional[str] = Query(None),
    case_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    svc = ProfessionalTaskService(db)
    return await svc.list_tasks(
        str(profile.id), 
        completed=completed, 
        priority=priority, 
        case_id=case_id,
        limit=limit
    )


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a professional task")
async def create_task(
    body: TaskCreateBody,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    svc = ProfessionalTaskService(db)
    return await svc.create_task(
        professional_id=str(profile.id),
        title=body.title,
        description=body.description,
        case_id=body.case_id,
        due_date=body.due_date,
        priority=body.priority,
    )


@router.patch("/{task_id}", summary="Update a professional task")
async def update_task(
    task_id: str,
    body: TaskUpdateBody,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    svc = ProfessionalTaskService(db)
    result = await svc.update_task(
        task_id=task_id,
        professional_id=str(profile.id),
        **body.model_dump(exclude_none=True),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Task not found or nothing to update")
    return result


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a professional task")
async def delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    svc = ProfessionalTaskService(db)
    deleted = await svc.delete_task(task_id, str(profile.id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
