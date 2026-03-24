"""
Public Bug Hunt Tester API - Token-based access for external testers.

No authentication required. Access controlled via unique tokens.
"""

import base64
import logging
from datetime import datetime
from json import JSONDecodeError

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

VALID_SEVERITIES = {"critical", "high", "medium", "low"}
VALID_CATEGORIES = {"ux", "performance", "functionality", "documentation", "other"}
VALID_NOTE_TYPES = {"observation", "blocker", "question", "resolution"}

MAX_SCREENSHOTS_PER_BUG = 3
MAX_SCREENSHOT_SIZE_BYTES = 5 * 1024 * 1024  # 5MB
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}


async def _get_tester(token: str, db: AsyncSession):
    """Validate token and return tester, differentiating expired vs invalid tokens."""
    from app.models.bug_hunt import BugHuntTester

    result = await db.execute(
        select(BugHuntTester).where(BugHuntTester.access_token == token)
    )
    tester = result.scalar_one_or_none()

    if not tester:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid testing link. Please check your email for the correct URL.",
        )

    if tester.status == "revoked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This testing link has been revoked. Please contact the administrator.",
        )

    if tester.token_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This testing link has expired. Please contact the administrator for a new invitation.",
        )

    # Update access timestamps
    now = datetime.utcnow()
    if not tester.first_accessed_at:
        tester.first_accessed_at = now
        tester.status = "active"
    tester.last_accessed_at = now

    return tester


async def _parse_body(request: Request, required_fields: list[str]) -> dict:
    """Parse JSON body and validate required fields."""
    try:
        body = await request.json()
    except (JSONDecodeError, Exception):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid or missing JSON body",
        )

    missing = [f for f in required_fields if not body.get(f)]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Missing required fields: {', '.join(missing)}",
        )
    return body


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
    body = await _parse_body(request, ["title", "description"])

    severity = body.get("severity", "medium")
    if severity not in VALID_SEVERITIES:
        severity = "medium"

    # Handle screenshot_urls (base64 data URLs, max 3, max 5MB each)
    screenshot_urls = body.get("screenshot_urls", [])
    if isinstance(screenshot_urls, list):
        screenshot_urls = screenshot_urls[:3]  # Max 3 screenshots
        # Validate each is a data URL and not too large
        valid_screenshots = []
        for url in screenshot_urls:
            if isinstance(url, str) and url.startswith("data:image/") and len(url) < 7 * 1024 * 1024:
                valid_screenshots.append(url)
        screenshot_urls = valid_screenshots
    else:
        screenshot_urls = []

    report = await tester_add_bug_report(
        db, tester,
        title=body["title"][:500],
        description=body["description"][:5000],
        severity=severity,
        steps_to_reproduce=body.get("steps_to_reproduce", "")[:5000] or None,
        screenshot_urls=screenshot_urls or None,
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
    body = await _parse_body(request, ["content"])

    category = body.get("category", "other")
    if category not in VALID_CATEGORIES:
        category = "other"

    rating = body.get("rating")
    if rating is not None:
        try:
            rating = max(1, min(5, int(rating)))
        except (ValueError, TypeError):
            rating = None

    fb = await tester_add_feedback(
        db, tester,
        content=body["content"][:5000],
        category=category,
        rating=rating,
        feature_area=body.get("feature_area", "")[:100] or None,
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
    body = await _parse_body(request, ["content"])

    note_type = body.get("note_type", "observation")
    if note_type not in VALID_NOTE_TYPES:
        note_type = "observation"

    note = await tester_add_note(
        db, tester,
        content=body["content"][:5000],
        note_type=note_type,
    )
    await db.commit()
    return {
        "id": note.id, "note_type": note.note_type,
        "created_at": note.created_at.isoformat(),
    }


@router.post(
    "/test/{token}/bugs/{bug_id}/screenshots",
    summary="Upload screenshot for a bug report",
    status_code=status.HTTP_201_CREATED,
)
async def upload_bug_screenshot(
    token: str,
    bug_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Upload a screenshot image for an existing bug report (max 3 screenshots, 5MB each)."""
    from app.models.bug_hunt import BugHuntBugReport

    tester = await _get_tester(token, db)

    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid file type '{file.content_type}'. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}",
        )

    # Read and validate file size
    contents = await file.read()
    if len(contents) > MAX_SCREENSHOT_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large ({len(contents)} bytes). Maximum size is {MAX_SCREENSHOT_SIZE_BYTES // (1024*1024)}MB.",
        )

    # Find the bug report and verify ownership
    report = await db.get(BugHuntBugReport, bug_id)
    if not report:
        raise HTTPException(status_code=404, detail="Bug report not found")
    if report.family_id != tester.family_id or report.cohort_id != tester.cohort_id:
        raise HTTPException(status_code=403, detail="You can only add screenshots to your own bug reports")

    # Check screenshot count limit
    existing_urls = report.screenshot_urls or []
    if len(existing_urls) >= MAX_SCREENSHOTS_PER_BUG:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Maximum of {MAX_SCREENSHOTS_PER_BUG} screenshots per bug report reached.",
        )

    # Store as base64 data URL
    b64_data = base64.b64encode(contents).decode("utf-8")
    data_url = f"data:{file.content_type};base64,{b64_data}"

    updated_urls = list(existing_urls) + [data_url]
    report.screenshot_urls = updated_urls

    await db.commit()
    return {
        "bug_id": bug_id,
        "screenshot_count": len(updated_urls),
        "message": "Screenshot uploaded successfully",
    }
