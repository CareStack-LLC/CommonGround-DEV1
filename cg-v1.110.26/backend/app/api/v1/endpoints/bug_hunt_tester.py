"""
Public Bug Hunt Tester API - Token-based access for external testers.

No authentication required. Access controlled via unique tokens.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_tester(token: str, db: AsyncSession):
    """Validate token and return tester, updating access timestamps."""
    from app.services.bug_hunt_service import get_tester_by_token

    tester = await get_tester_by_token(db, token)
    if not tester:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired testing link",
        )

    # Update access timestamps
    now = datetime.utcnow()
    if not tester.first_accessed_at:
        tester.first_accessed_at = now
        tester.status = "active"
    tester.last_accessed_at = now

    return tester


@router.get(
    "/test/{token}",
    summary="Get tester dashboard",
)
async def get_tester_dashboard(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Validate token and return dashboard data for the tester."""
    from app.services.bug_hunt_service import get_tester_dashboard as _get_dashboard

    tester = await _get_tester(token, db)
    dashboard = await _get_dashboard(db, tester)
    await db.commit()
    return dashboard


@router.post(
    "/test/{token}/checklist/{item_id}",
    summary="Toggle checklist item",
)
async def toggle_checklist_item(
    token: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Toggle a checklist item's completion status."""
    from app.services.bug_hunt_service import tester_toggle_checklist

    tester = await _get_tester(token, db)
    try:
        item = await tester_toggle_checklist(db, tester, item_id)
        await db.commit()
        return {
            "id": item.id, "title": item.title, "is_completed": item.is_completed,
            "completed_at": item.completed_at.isoformat() if item.completed_at else None,
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post(
    "/test/{token}/bugs",
    summary="Submit bug report",
    status_code=status.HTTP_201_CREATED,
)
async def submit_bug_report(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Submit a bug report as a tester."""
    from app.services.bug_hunt_service import tester_add_bug_report

    tester = await _get_tester(token, db)
    body = await request.json()

    report = await tester_add_bug_report(
        db, tester,
        title=body["title"],
        description=body["description"],
        severity=body.get("severity", "medium"),
        steps_to_reproduce=body.get("steps_to_reproduce"),
    )
    await db.commit()
    return {
        "id": report.id, "title": report.title, "severity": report.severity,
        "status": report.status, "created_at": report.created_at.isoformat(),
    }


@router.post(
    "/test/{token}/feedback",
    summary="Submit feedback",
    status_code=status.HTTP_201_CREATED,
)
async def submit_feedback(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Submit feedback as a tester."""
    from app.services.bug_hunt_service import tester_add_feedback

    tester = await _get_tester(token, db)
    body = await request.json()

    fb = await tester_add_feedback(
        db, tester,
        content=body["content"],
        category=body.get("category", "other"),
        rating=body.get("rating"),
        feature_area=body.get("feature_area"),
    )
    await db.commit()
    return {
        "id": fb.id, "category": fb.category, "rating": fb.rating,
        "created_at": fb.created_at.isoformat(),
    }


@router.post(
    "/test/{token}/notes",
    summary="Add note",
    status_code=status.HTTP_201_CREATED,
)
async def add_note(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Add a note as a tester."""
    from app.services.bug_hunt_service import tester_add_note

    tester = await _get_tester(token, db)
    body = await request.json()

    note = await tester_add_note(
        db, tester,
        content=body["content"],
        note_type=body.get("note_type", "observation"),
    )
    await db.commit()
    return {
        "id": note.id, "note_type": note.note_type,
        "created_at": note.created_at.isoformat(),
    }
