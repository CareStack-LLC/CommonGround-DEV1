"""
Parent Reports API - Generate beautiful branded PDF reports.

This module provides endpoints for generating self-service parent reports
with real data from the CommonGround platform.
"""

import calendar
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
from app.services.reports.monthly_report_service import MonthlyReportService
from app.utils.sentry_helpers import capture_error

logger = logging.getLogger(__name__)
router = APIRouter()

ReportType = Literal["custody_time", "communication", "expense", "schedule", "kidspace_communication"]


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
    - **kidspace_communication**: KidSpace child communication activity

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
        result = await service.generate_report(
            report_type=report_type,
            family_file_id=family_file_id,
            date_start=date_start,
            date_end=date_end,
            user_id=str(current_user.id),
        )
    except NotImplementedError as e:
        logger.error(f"Report type not implemented: {e}")
        capture_error(e)
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="This report type is not yet available."
        )
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        capture_error(e)
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
        "kidspace_communication": "KidSpace-Communication",
    }
    report_name = report_names.get(report_type, "Report")
    filename = f"CommonGround-{report_name}-{date.today().isoformat()}.pdf"

    # Email the parent a report-ready notification (non-blocking).
    # NOTE: send_report_ready expects keyword args {to_email, to_name,
    # report_type, date_range, family_file_name, download_url,
    # highlights?, expiry_date?}. Earlier call-site used `report_highlights`
    # and omitted `date_range` + `family_file_name`, which raised TypeError
    # on every report download (caught by the except but users never got
    # the "your report is ready" email). Fixed here by matching the
    # signature and looking up the family file name from the row we
    # already verified access to above.
    try:
        from app.services.email import email_service
        report_display = report_name.replace("-", " ")
        ff_name_result = await db.execute(
            select(FamilyFile.title).where(FamilyFile.id == family_file_id)
        )
        family_file_name = ff_name_result.scalar_one_or_none() or "Family"
        await email_service.send_report_ready(
            to_email=current_user.email,
            to_name=current_user.first_name or "Parent",
            report_type=report_display,
            date_range=f"{date_start.strftime('%b %d')} – {date_end.strftime('%b %d, %Y')}",
            family_file_name=family_file_name,
            download_url=f"{email_service.frontend_url}/reports",
            highlights=[
                {"label": "Report ID", "value": str(result.report_id)},
                {"label": "Generated", "value": date.today().strftime("%B %d, %Y")},
            ],
        )
    except Exception as e:
        logger.warning(f"Failed to send report-ready email: {e}")

    return StreamingResponse(
        io.BytesIO(result.pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(result.pdf_bytes)),
            "X-Report-ID": result.report_id,
            "X-SHA256-Hash": result.sha256_hash,
        }
    )


@router.post(
    "/generate/monthly",
    summary="Generate monthly parent report",
    description="Generate a comprehensive monthly PDF combining all report types.",
    responses={
        200: {
            "description": "PDF report file",
            "content": {"application/pdf": {}},
        }
    },
)
async def generate_monthly_report(
    family_file_id: str = Query(..., description="Family file ID"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    year: int = Query(..., ge=2024, le=2030, description="Year"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """
    Generate a comprehensive monthly PDF report for a parent.

    Aggregates all 4 report types (custody time, communication, expense,
    schedule) into a single branded PDF with an executive summary and
    overall compliance score.

    Returns the PDF file as a streaming response for immediate download.
    """
    # Verify access
    family_file = await verify_family_file_access(db, str(current_user.id), family_file_id)

    # Validate the requested month is not in the future
    now = datetime.utcnow()
    if year > now.year or (year == now.year and month > now.month):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate a report for a future month."
        )

    # Generate report
    try:
        service = MonthlyReportService(db)
        pdf_bytes, _ = await service.generate_monthly_report(
            family_file_id=family_file_id,
            month=month,
            year=year,
        )
    except ValueError as e:
        logger.error(f"Monthly report not found: {e}")
        capture_error(e)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report data not found."
        )
    except Exception as e:
        logger.error(f"Error generating monthly report: {e}")
        capture_error(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate monthly report. Please try again."
        )

    # Generate filename
    month_name = calendar.month_name[month]
    filename = f"CommonGround-Monthly-Report-{month_name}-{year}.pdf"

    # Email the parent a report-ready notification
    try:
        from app.services.email import email_service
        await email_service.send_monthly_report(
            to_email=current_user.email,
            to_name=current_user.first_name or "Parent",
            month_name=month_name,
            year=year,
            family_file_name=family_file.title if hasattr(family_file, 'title') else "Family File",
            compliance_rate=0,
            total_exchanges=0,
            on_time_count=0,
            completed_exchanges=0,
            missed_exchanges=0,
            gps_verified_count=0,
            message_count=0,
            full_report_url=f"{email_service.frontend_url}/reports",
        )
    except Exception as e:
        logger.warning(f"Failed to send monthly report email: {e}")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        }
    )


@router.get(
    "/requests",
    summary="List my paid report requests",
    description="List the current user's paid report requests and their fulfillment status.",
)
async def list_my_report_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List the requester's paid report requests (newest first)."""
    from app.models.report_request import ReportRequest

    result = await db.execute(
        select(ReportRequest)
        .where(ReportRequest.requested_by_id == str(current_user.id))
        .order_by(ReportRequest.created_at.desc())
    )
    requests = result.scalars().all()
    return {
        "requests": [
            {
                "id": str(r.id),
                "report_type": r.report_type,
                "status": r.status,
                "urgency": r.urgency,
                "price_cents": r.price_cents,
                "date_range_start": r.date_range_start.isoformat() if r.date_range_start else None,
                "date_range_end": r.date_range_end.isoformat() if r.date_range_end else None,
                "report_id": r.report_id,
                "sha256_hash": r.sha256_hash,
                "generated_at": r.generated_at.isoformat() if r.generated_at else None,
                "delivered_at": r.delivered_at.isoformat() if r.delivered_at else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "downloadable": r.status in ("completed", "delivered") and bool(r.report_id),
            }
            for r in requests
        ],
        "total": len(requests),
    }


@router.get(
    "/requests/{request_id}/download",
    summary="Download a fulfilled paid report",
    description="Get a time-limited signed URL for a completed/delivered paid report.",
)
async def download_paid_report(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Return a signed download URL for the requester's fulfilled paid report.

    Only the user who purchased the report may download it, and only once an
    admin has generated it (status completed/delivered).
    """
    from app.models.report_request import ReportRequest
    from app.services.storage import (
        StorageBucket,
        build_report_path,
        storage_service,
    )

    result = await db.execute(
        select(ReportRequest).where(ReportRequest.id == request_id)
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Report request not found")
    if r.requested_by_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You did not request this report",
        )
    if r.status not in ("completed", "delivered") or not r.report_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Report is not ready yet (status: {r.status})",
        )

    try:
        signed_url = await storage_service.get_signed_url(
            bucket=StorageBucket.REPORTS,
            path=build_report_path(r.family_file_id, r.report_id),
            expires_in=3600,
        )
    except Exception as e:
        logger.error(f"Failed to sign report URL for request {request_id}: {e}")
        capture_error(e)
        signed_url = None

    if not signed_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Report file is unavailable. Please contact support.",
        )

    return {
        "download_url": signed_url,
        "expires_in": 3600,
        "report_id": r.report_id,
        "report_type": r.report_type,
        "sha256_hash": r.sha256_hash,
    }


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
