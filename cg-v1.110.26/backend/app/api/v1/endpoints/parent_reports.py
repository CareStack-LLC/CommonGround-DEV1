"""
Parent Reports API - Generate beautiful branded PDF reports.

This module provides endpoints for generating self-service parent reports
with real data from the CommonGround platform.
"""

import io
import logging
from datetime import date, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.family_file import FamilyFile
from app.services.reports import ParentReportService

logger = logging.getLogger(__name__)
router = APIRouter()

ReportType = Literal["custody_time", "communication", "expense", "schedule"]


async def verify_family_file_access(
    db: AsyncSession,
    user_id: str,
    family_file_id: str,
) -> FamilyFile:
    """Verify user has access to the family file."""
    result = await db.execute(
        select(FamilyFile).where(
            FamilyFile.id == family_file_id,
            FamilyFile.status == "active",
            (FamilyFile.parent_a_id == str(user_id)) |
            (FamilyFile.parent_b_id == str(user_id))
        )
    )
    family_file = result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this family file"
        )

    return family_file


@router.post(
    "/generate/{report_type}",
    summary="Generate a parent report",
    description="Generate a beautiful branded PDF report with real platform data.",
    responses={
        200: {
            "description": "PDF report file",
            "content": {"application/pdf": {}},
        }
    },
)
async def generate_parent_report(
    report_type: ReportType,
    family_file_id: str = Query(..., description="Family file ID"),
    date_start: date = Query(..., description="Report start date"),
    date_end: date = Query(..., description="Report end date"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """
    Generate a branded PDF report for a parent.

    Report Types:
    - **custody_time**: Parenting time split and exchange compliance
    - **communication**: Message patterns and ARIA interventions
    - **expense**: ClearFund obligations and financial compliance
    - **schedule**: Exchange history and GPS verification

    Returns the PDF file as a streaming response for immediate download.
    """
    # Verify access
    await verify_family_file_access(db, str(current_user.id), family_file_id)

    # Enforce 30-day strict limit for self-service reports
    # (Overrides any frontend-provided dates to prevent manipulation)
    date_end = datetime.utcnow().date()
    date_start = date_end - timedelta(days=30)

    # Generate report
    try:
        service = ParentReportService(db)
        pdf_bytes = await service.generate_report(
            report_type=report_type,
            family_file_id=family_file_id,
            date_start=date_start,
            date_end=date_end,
            user_id=str(current_user.id),
        )
    except NotImplementedError as e:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate report. Please try again."
        )

    # Generate filename
    report_names = {
        "custody_time": "Custody-Time-Report",
        "communication": "Communication-Summary",
        "expense": "Expense-Summary",
        "schedule": "Schedule-History",
    }
    report_name = report_names.get(report_type, "Report")
    filename = f"CommonGround-{report_name}-{date.today().isoformat()}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        }
    )


@router.get(
    "/types",
    summary="Get available report types",
    description="Get parent report types with GTM spec codes (P-1 through P-7).",
)
async def get_report_types() -> dict:
    """
    Get available parent report types with descriptions.

    Returns both the internal type ID (for API calls) and the GTM spec
    code (P-1 through P-7) for reference.
    """
    from app.services.reports.report_registry import get_parent_reports

    return {
        "report_types": [
            {
                "id": report["internal_type"],
                "code": report["code"],
                "name": report["name"],
                "description": report["description"],
                "tier_required": report["tier_required"],
                "sha256_verified": report["sha256_verified"],
                "court_ready": report["court_ready"],
                "available": report["available"],
                "paid": report.get("paid", False),
            }
            for report in get_parent_reports()
        ]
    }
