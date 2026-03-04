"""
CaseExport endpoints for court-ready documentation packages.

These endpoints allow parents to generate comprehensive export packages
containing case data for court filings or investigations.
"""

from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.case import CaseParticipant
from app.models.export import CaseExport, ExportSection
from app.schemas.export import (
    ExportRequest,
    ExportResponse,
    ExportListResponse,
    ExportVerification,
    ExportSectionResponse,
)

router = APIRouter()


def export_to_dict(export: CaseExport) -> dict:
    """
    Convert CaseExport to dict for serialization, excluding relationships.

    This prevents SQLAlchemy lazy-loading which fails outside async context.
    """
    return {
        "id": str(export.id),
        "case_id": str(export.case_id),
        "export_number": export.export_number,
        "package_type": export.package_type,
        "claim_type": export.claim_type,
        "claim_description": export.claim_description,
        "date_range_start": export.date_range_start,
        "date_range_end": export.date_range_end,
        "sections_included": export.sections_included,
        "redaction_level": export.redaction_level,
        "message_content_redacted": export.message_content_redacted,
        "file_url": export.file_url,
        "file_size_bytes": export.file_size_bytes,
        "page_count": export.page_count,
        "content_hash": export.content_hash,
        "chain_hash": export.chain_hash,
        "watermark_text": export.watermark_text,
        "verification_url": export.verification_url,
        "evidence_counts": export.evidence_counts,
        "status": export.status,
        "error_message": export.error_message,
        "download_count": export.download_count,
        "last_downloaded_at": export.last_downloaded_at,
        "generated_at": export.generated_at,
        "generation_time_seconds": export.generation_time_seconds,
        "expires_at": export.expires_at,
        "is_permanent": export.is_permanent,
        "created_at": export.created_at,
        "sections": None,  # Don't try to lazy-load relationships
    }


async def verify_case_participant(
    db: AsyncSession,
    user_id: str,
    case_id: str
) -> CaseParticipant:
    """Verify user is an active participant in the case."""
    result = await db.execute(
        select(CaseParticipant).where(
            and_(
                CaseParticipant.case_id == case_id,
                CaseParticipant.user_id == user_id,
                CaseParticipant.is_active == True
            )
        )
    )
    participant = result.scalar_one_or_none()

    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this case"
        )

    return participant


@router.post(
    "/",
    response_model=ExportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a case export",
)
async def create_export(
    data: ExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new case export package.

    Package Types:
    - **investigation**: Triggered by concern ("I believe something is wrong")
      - Focused on specific claim type
      - Includes disclaimer: "Does not determine fault"
    - **court**: Triggered by legal need ("I need this for a filing")
      - Comprehensive summary of all data
      - All 8 standard sections included

    Redaction Levels:
    - **none**: No PII redaction
    - **standard**: SSN, addresses redacted
    - **enhanced**: All PII including phone/email redacted

    The export will be generated asynchronously. Poll the GET endpoint
    to check status and download when ready.
    """
    # Verify user is a case participant
    await verify_case_participant(db, current_user.id, data.case_id)

    # Import service here to avoid circular imports
    from app.services.export.case_export_service import CaseExportService

    service = CaseExportService(db)
    export = await service.create_export(
        case_id=data.case_id,
        user_id=current_user.id,
        package_type=data.package_type.value,
        date_start=data.date_start,
        date_end=data.date_end,
        claim_type=data.claim_type.value if data.claim_type else None,
        claim_description=data.claim_description,
        redaction_level=data.redaction_level.value,
        sections=data.sections,
        message_content_redacted=data.message_content_redacted,
        generator_name=f"{current_user.first_name} {current_user.last_name}",
    )

    # Use helper function to avoid lazy-loading relationships
    return ExportResponse(**export_to_dict(export))


@router.get(
    "/case/{case_id}",
    response_model=ExportListResponse,
    summary="List exports for a case",
)
async def list_exports(
    case_id: str,
    limit: int = 20,
    offset: int = 0,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all exports for a case.

    Returns exports in reverse chronological order (newest first).
    Can filter by status: generating, completed, failed, downloaded.
    """
    await verify_case_participant(db, current_user.id, case_id)

    query = select(CaseExport).where(CaseExport.case_id == case_id)

    if status_filter:
        query = query.where(CaseExport.status == status_filter)

    query = query.order_by(CaseExport.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    exports = list(result.scalars().all())

    # Get total count
    count_query = select(CaseExport).where(CaseExport.case_id == case_id)
    if status_filter:
        count_query = count_query.where(CaseExport.status == status_filter)
    count_result = await db.execute(count_query)
    total = len(list(count_result.scalars().all()))

    # Use helper function to avoid lazy-loading relationships
    return ExportListResponse(
        exports=[ExportResponse(**export_to_dict(e)) for e in exports],
        total=total,
    )


@router.get(
    "/{export_id}",
    response_model=ExportResponse,
    summary="Get export details",
)
async def get_export(
    export_id: str,
    include_sections: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get details of a specific export.

    Set include_sections=true to get detailed section information.
    """
    result = await db.execute(
        select(CaseExport).where(CaseExport.id == export_id)
    )
    export = result.scalar_one_or_none()

    if not export:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export not found"
        )

    await verify_case_participant(db, current_user.id, export.case_id)

    # Use helper function to avoid lazy-loading relationships
    response = ExportResponse(**export_to_dict(export))

    if include_sections:
        sections_result = await db.execute(
            select(ExportSection)
            .where(ExportSection.export_id == export_id)
            .order_by(ExportSection.section_order)
        )
        sections = list(sections_result.scalars().all())
        response.sections = [
            ExportSectionResponse(
                id=str(s.id),
                section_type=s.section_type,
                section_order=s.section_order,
                section_title=s.section_title,
                evidence_count=s.evidence_count,
                page_start=s.page_start,
                page_end=s.page_end,
                generation_time_ms=s.generation_time_ms,
            )
            for s in sections
        ]

    return response


@router.get(
    "/{export_id}/download",
    summary="Download export PDF",
)
async def download_export(
    export_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Download the export PDF.

    Returns the PDF file with proper Content-Disposition headers.
    Records the download in the export's access tracking.
    """
    result = await db.execute(
        select(CaseExport).where(CaseExport.id == export_id)
    )
    export = result.scalar_one_or_none()

    if not export:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export not found"
        )

    await verify_case_participant(db, current_user.id, export.case_id)

    if export.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Export is not ready for download. Status: {export.status}"
        )

    if export.is_expired:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This export has expired"
        )

    # Record download
    export.download_count += 1
    export.last_downloaded_at = datetime.utcnow()
    if export.status == "completed":
        export.status = "downloaded"
    await db.commit()

    # Import service here to avoid circular imports
    from app.services.export.case_export_service import CaseExportService

    service = CaseExportService(db)
    pdf_bytes = await service.get_pdf_bytes(export_id)

    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not found"
        )

    filename = f"CommonGround_Export_{export.export_number}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Content-Hash": export.content_hash or "",
            "X-Verification-URL": export.verification_url or "",
        }
    )


@router.get(
    "/verify/{export_number}",
    response_model=ExportVerification,
    summary="Verify export authenticity",
)
async def verify_export(
    export_number: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify the authenticity of an export.

    This is a PUBLIC endpoint - no authentication required.
    Courts and legal professionals can use this to verify
    that an export document is authentic and unmodified.

    Returns verification details including content hash,
    generation timestamp, and validity status.
    """
    result = await db.execute(
        select(CaseExport).where(CaseExport.export_number == export_number)
    )
    export = result.scalar_one_or_none()

    if not export:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export not found. This export number is not valid."
        )

    is_expired = export.is_expired
    is_valid = export.status in ["completed", "downloaded"] and not is_expired

    message = "Export verified successfully"
    if is_expired:
        message = "Export has expired but was valid when generated"
    elif export.status == "failed":
        message = "Export generation failed"
    elif export.status == "generating":
        message = "Export is still being generated"

    return ExportVerification(
        export_number=export.export_number,
        is_valid=is_valid,
        is_expired=is_expired,
        content_hash=export.content_hash,
        chain_hash=export.chain_hash,
        package_type=export.package_type,
        date_range_start=export.date_range_start,
        date_range_end=export.date_range_end,
        page_count=export.page_count,
        generated_at=export.generated_at,
        generator_type=export.generator_type,
        verification_timestamp=datetime.utcnow(),
        message=message,
    )


@router.delete(
    "/{export_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an export",
)
async def delete_export(
    export_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete an export.

    Only the user who generated the export can delete it.
    This permanently removes the export and its PDF.
    """
    result = await db.execute(
        select(CaseExport).where(CaseExport.id == export_id)
    )
    export = result.scalar_one_or_none()

    if not export:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export not found"
        )

    if export.generated_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the export creator can delete it"
        )

    await db.delete(export)
    await db.commit()

    return None
