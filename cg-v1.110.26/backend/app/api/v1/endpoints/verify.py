"""
Public report verification endpoint.

Allows anyone to verify the authenticity of a CommonGround report
by entering a Report ID (RPT-...), Export Number (EXP-...), or
SHA-256 hash. No authentication required.
"""

import re
from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.core.database import get_db
from app.models.generated_report import GeneratedReport
from app.models.export import CaseExport
from app.schemas.verify import VerificationResponse

router = APIRouter()

# Human-readable names for report types
REPORT_TYPE_LABELS = {
    "custody_time": "Custody Analytics Report",
    "communication": "Communication Report",
    "expense": "Expense Summary Report",
    "schedule": "Schedule & Activity Report",
    "kidspace_communication": "KidSpace Communication Snapshot",
    "kidspace_communication_court": "KidSpace Court Communication Report",
    "monthly": "Monthly Parent Insight Report",
    "court_export": "Court Evidence Package",
    "court_investigation_package": "Court Investigation Package",
    "investigation": "Investigation Report",
    "custody_compliance_report": "Case Compliance Report",
    "exchange_compliance": "Exchange Verification Report",
    "communication_analysis": "ARIA Intervention Log",
}

CATEGORY_LABELS = {
    "parent": "Parent Report",
    "professional": "Professional Report",
    "court_export": "Court Export",
    "investigation": "Investigation Report",
    "monthly_comprehensive": "Monthly Comprehensive Report",
    "monthly": "Monthly Report",
}

# SHA-256 hash pattern: exactly 64 hex characters
SHA256_PATTERN = re.compile(r"^[a-fA-F0-9]{64}$")


@router.get("/{identifier}", response_model=VerificationResponse)
async def verify_report(
    identifier: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a report by Report ID, Export Number, or SHA-256 hash.

    This is a PUBLIC endpoint — no authentication required.
    Returns report metadata without any sensitive information.
    """
    identifier = identifier.strip()
    now = datetime.utcnow()

    # Route 1: Report ID (RPT-YYYYMMDD-XXXX)
    if identifier.upper().startswith("RPT-"):
        result = await db.execute(
            select(GeneratedReport).where(
                GeneratedReport.report_id == identifier.upper()
            )
        )
        report = result.scalar_one_or_none()

        if report:
            date_range = None
            if report.date_range_start and report.date_range_end:
                date_range = (
                    f"{report.date_range_start.strftime('%b %d, %Y')} – "
                    f"{report.date_range_end.strftime('%b %d, %Y')}"
                )

            return VerificationResponse(
                is_valid=True,
                report_id=report.report_id,
                report_type=REPORT_TYPE_LABELS.get(report.report_type, report.report_type),
                report_category=CATEGORY_LABELS.get(report.report_category, report.report_category),
                sha256_hash=report.sha256_hash,
                generated_at=report.generated_at,
                date_range=date_range,
                family_file_ref=report.family_file_number_redacted,
                verified_at=now,
                message="This report is authentic and has not been altered since generation.",
            )

    # Route 2: Export Number (EXP-YYYYMMDD-XXXX)
    if identifier.upper().startswith("EXP-"):
        result = await db.execute(
            select(CaseExport).where(
                CaseExport.export_number == identifier.upper()
            )
        )
        export = result.scalar_one_or_none()

        if export:
            return VerificationResponse(
                is_valid=True,
                report_id=export.export_number,
                report_type="Court Evidence Package",
                report_category="Court Export",
                sha256_hash=getattr(export, "content_hash", None),
                generated_at=export.created_at,
                date_range=None,
                family_file_ref=None,
                verified_at=now,
                message="This court export is authentic and has not been altered since generation.",
            )

    # Route 3: SHA-256 hash (64 hex characters)
    if SHA256_PATTERN.match(identifier):
        hash_lower = identifier.lower()

        # Check generated_reports first
        result = await db.execute(
            select(GeneratedReport).where(
                GeneratedReport.sha256_hash == hash_lower
            )
        )
        report = result.scalar_one_or_none()

        if report:
            date_range = None
            if report.date_range_start and report.date_range_end:
                date_range = (
                    f"{report.date_range_start.strftime('%b %d, %Y')} – "
                    f"{report.date_range_end.strftime('%b %d, %Y')}"
                )

            return VerificationResponse(
                is_valid=True,
                report_id=report.report_id,
                report_type=REPORT_TYPE_LABELS.get(report.report_type, report.report_type),
                report_category=CATEGORY_LABELS.get(report.report_category, report.report_category),
                sha256_hash=report.sha256_hash,
                generated_at=report.generated_at,
                date_range=date_range,
                family_file_ref=report.family_file_number_redacted,
                verified_at=now,
                message="This report is authentic and has not been altered since generation.",
            )

        # Check case_exports
        result = await db.execute(
            select(CaseExport).where(CaseExport.content_hash == hash_lower)
        )
        export = result.scalar_one_or_none()

        if export:
            return VerificationResponse(
                is_valid=True,
                report_id=export.export_number,
                report_type="Court Evidence Package",
                report_category="Court Export",
                sha256_hash=hash_lower,
                generated_at=export.created_at,
                date_range=None,
                family_file_ref=None,
                verified_at=now,
                message="This court export is authentic and has not been altered since generation.",
            )

    # Not found
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "is_valid": False,
            "message": "No report found matching this identifier. Please check the Report ID or SHA-256 hash and try again.",
            "verified_at": now.isoformat(),
        },
    )
