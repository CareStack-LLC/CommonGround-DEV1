"""
Recording Audit and Legal Hold API Endpoints.

Provides court-admissible chain of custody tracking for recordings.
"""

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.recording import RecordingAccessAction
from app.services.recording import recording_service
from app.services.recording_audit import recording_audit_service
from app.services.evidence_export import evidence_export_service
from app.services.family_file import get_user_family_file

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# Schemas
# =============================================================================

class LegalHoldRequest(BaseModel):
    """Request to set legal hold on a recording."""
    reason: str = Field(..., min_length=10, description="Reason for legal hold")
    case_number: Optional[str] = Field(None, description="Court case number")
    retain_years: int = Field(10, ge=1, le=25, description="Years to retain")
    court_order_reference: Optional[str] = Field(None, description="Court order reference")


class LegalHoldReleaseRequest(BaseModel):
    """Request to release legal hold."""
    reason: str = Field(..., min_length=10, description="Reason for release")


class LegalHoldResponse(BaseModel):
    """Legal hold status response."""
    recording_id: str
    is_protected: bool
    set_by: Optional[str] = None
    set_at: Optional[datetime] = None
    reason: Optional[str] = None
    case_number: Optional[str] = None
    retain_until: Optional[datetime] = None


class AccessLogResponse(BaseModel):
    """Recording access log entry."""
    id: str
    recording_id: str
    user_id: str
    user_email: Optional[str] = None
    user_role: str
    action: str
    action_detail: Optional[str] = None
    accessed_at: datetime
    ip_address: Optional[str] = None
    success: bool
    sequence_number: int

    class Config:
        from_attributes = True


class AccessHistoryResponse(BaseModel):
    """Access history response."""
    recording_id: str
    total_entries: int
    items: List[AccessLogResponse]


class ChainVerificationResponse(BaseModel):
    """Chain of custody verification response."""
    verified: bool
    status: str
    total_entries: int
    first_access: Optional[str] = None
    last_access: Optional[str] = None
    broken_links: List[dict] = []
    verification_timestamp: str


class IntegrityVerificationRequest(BaseModel):
    """Request to verify recording integrity."""
    computed_hash: str = Field(..., min_length=64, max_length=64)


class IntegrityVerificationResponse(BaseModel):
    """Integrity verification response."""
    verified: bool
    status: str
    recording_id: str
    stored_hash: Optional[str] = None
    computed_hash: str
    hash_algorithm: str
    verification_timestamp: Optional[str] = None
    message: str


class ExportCertificateResponse(BaseModel):
    """Export certificate response."""
    certificate_number: str
    certificate_hash: str
    issued_at: str
    recording: dict
    export: dict
    legal_context: dict
    requester: dict
    chain_of_custody: dict
    certification_statement: str


# =============================================================================
# Helper Functions
# =============================================================================

def get_client_ip(request: Request) -> Optional[str]:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


# =============================================================================
# Legal Hold Endpoints
# =============================================================================

@router.post("/{recording_id}/legal-hold", response_model=LegalHoldResponse)
async def set_legal_hold(
    recording_id: str,
    request_body: LegalHoldRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Place a recording under legal hold.

    Legal hold prevents deletion and extends the retention period.
    This action is logged in the audit trail.
    """
    recording = await recording_service.get_recording(db, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify user has access to this family file
    family_file = await get_user_family_file(db, current_user.id, recording.family_file_id)
    if not family_file:
        raise HTTPException(status_code=403, detail="Access denied")

    if recording.is_protected:
        raise HTTPException(status_code=400, detail="Recording is already under legal hold")

    try:
        updated_recording = await recording_audit_service.set_legal_hold(
            db=db,
            recording_id=recording_id,
            user_id=current_user.id,
            reason=request_body.reason,
            case_number=request_body.case_number,
            retain_years=request_body.retain_years,
            user_email=current_user.email,
            ip_address=get_client_ip(request),
            court_order_reference=request_body.court_order_reference,
        )

        return LegalHoldResponse(
            recording_id=updated_recording.id,
            is_protected=updated_recording.is_protected,
            set_by=updated_recording.legal_hold_set_by,
            set_at=updated_recording.legal_hold_set_at,
            reason=updated_recording.legal_hold_reason,
            case_number=updated_recording.legal_hold_case_number,
            retain_until=updated_recording.retain_until,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{recording_id}/legal-hold", response_model=LegalHoldResponse)
async def release_legal_hold(
    recording_id: str,
    request_body: LegalHoldReleaseRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Release legal hold on a recording.

    This action is logged in the audit trail.
    """
    recording = await recording_service.get_recording(db, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify user has access
    family_file = await get_user_family_file(db, current_user.id, recording.family_file_id)
    if not family_file:
        raise HTTPException(status_code=403, detail="Access denied")

    if not recording.is_protected:
        raise HTTPException(status_code=400, detail="Recording is not under legal hold")

    try:
        updated_recording = await recording_audit_service.release_legal_hold(
            db=db,
            recording_id=recording_id,
            user_id=current_user.id,
            reason=request_body.reason,
            user_email=current_user.email,
            ip_address=get_client_ip(request),
        )

        return LegalHoldResponse(
            recording_id=updated_recording.id,
            is_protected=updated_recording.is_protected,
            set_by=updated_recording.legal_hold_set_by,
            set_at=updated_recording.legal_hold_set_at,
            reason=updated_recording.legal_hold_reason,
            case_number=updated_recording.legal_hold_case_number,
            retain_until=updated_recording.retain_until,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{recording_id}/legal-hold", response_model=LegalHoldResponse)
async def get_legal_hold_status(
    recording_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get legal hold status for a recording."""
    recording = await recording_service.get_recording(db, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify user has access
    family_file = await get_user_family_file(db, current_user.id, recording.family_file_id)
    if not family_file:
        raise HTTPException(status_code=403, detail="Access denied")

    # Log this access
    await recording_audit_service.log_access(
        db=db,
        recording_id=recording_id,
        user_id=current_user.id,
        action=RecordingAccessAction.VIEW_METADATA,
        user_email=current_user.email,
        user_role="parent",
        action_detail="Viewed legal hold status",
    )

    return LegalHoldResponse(
        recording_id=recording.id,
        is_protected=recording.is_protected,
        set_by=recording.legal_hold_set_by,
        set_at=recording.legal_hold_set_at,
        reason=recording.legal_hold_reason,
        case_number=recording.legal_hold_case_number,
        retain_until=recording.retain_until,
    )


# =============================================================================
# Access Audit Endpoints
# =============================================================================

@router.get("/{recording_id}/access-history", response_model=AccessHistoryResponse)
async def get_access_history(
    recording_id: str,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get access history for a recording.

    Shows all access events for chain of custody documentation.
    """
    recording = await recording_service.get_recording(db, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify user has access
    family_file = await get_user_family_file(db, current_user.id, recording.family_file_id)
    if not family_file:
        raise HTTPException(status_code=403, detail="Access denied")

    access_logs = await recording_audit_service.get_access_history(
        db, recording_id, limit=limit, offset=offset
    )

    items = [
        AccessLogResponse(
            id=log.id,
            recording_id=log.recording_id,
            user_id=log.user_id,
            user_email=log.user_email,
            user_role=log.user_role,
            action=log.action,
            action_detail=log.action_detail,
            accessed_at=log.accessed_at,
            ip_address=log.ip_address,
            success=log.success,
            sequence_number=log.sequence_number,
        )
        for log in access_logs
    ]

    return AccessHistoryResponse(
        recording_id=recording_id,
        total_entries=len(items),
        items=items,
    )


@router.get("/{recording_id}/verify-chain", response_model=ChainVerificationResponse)
async def verify_chain_of_custody(
    recording_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify the chain of custody for a recording.

    Validates that the audit trail has not been tampered with.
    """
    recording = await recording_service.get_recording(db, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify user has access
    family_file = await get_user_family_file(db, current_user.id, recording.family_file_id)
    if not family_file:
        raise HTTPException(status_code=403, detail="Access denied")

    # Log this verification attempt
    await recording_audit_service.log_access(
        db=db,
        recording_id=recording_id,
        user_id=current_user.id,
        action=RecordingAccessAction.VIEW_METADATA,
        user_email=current_user.email,
        user_role="parent",
        action_detail="Chain of custody verification",
        ip_address=get_client_ip(request),
    )

    verification = await recording_audit_service.verify_access_chain(db, recording_id)

    return ChainVerificationResponse(
        verified=verification["verified"],
        status=verification["status"],
        total_entries=verification["total_entries"],
        first_access=verification.get("first_access"),
        last_access=verification.get("last_access"),
        broken_links=verification.get("broken_links", []),
        verification_timestamp=verification["verification_timestamp"],
    )


# =============================================================================
# Integrity Verification Endpoints
# =============================================================================

@router.post("/{recording_id}/verify-integrity", response_model=IntegrityVerificationResponse)
async def verify_recording_integrity(
    recording_id: str,
    request_body: IntegrityVerificationRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify the integrity of a recording file.

    Compare a computed hash against the stored hash to verify
    the file has not been modified.
    """
    recording = await recording_service.get_recording(db, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify user has access
    family_file = await get_user_family_file(db, current_user.id, recording.family_file_id)
    if not family_file:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await recording_audit_service.verify_recording_integrity(
        db=db,
        recording_id=recording_id,
        computed_hash=request_body.computed_hash,
        user_id=current_user.id,
        user_email=current_user.email,
        ip_address=get_client_ip(request),
    )

    return IntegrityVerificationResponse(
        verified=result["verified"],
        status=result["status"],
        recording_id=result["recording_id"],
        stored_hash=result.get("stored_hash"),
        computed_hash=result["computed_hash"],
        hash_algorithm=result.get("hash_algorithm", "sha256"),
        verification_timestamp=result.get("verification_timestamp"),
        message=result["message"],
    )


@router.get("/{recording_id}/verify-integrity-auto")
async def verify_recording_integrity_auto(
    recording_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Automatically verify recording integrity.

    Downloads the file and computes the hash for verification.
    This may take time for large files.
    """
    recording = await recording_service.get_recording(db, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify user has access
    family_file = await get_user_family_file(db, current_user.id, recording.family_file_id)
    if not family_file:
        raise HTTPException(status_code=403, detail="Access denied")

    # Log this verification
    await recording_audit_service.log_access(
        db=db,
        recording_id=recording_id,
        user_id=current_user.id,
        action=RecordingAccessAction.VERIFY_INTEGRITY,
        user_email=current_user.email,
        user_role="parent",
        action_detail="Automatic integrity verification",
        ip_address=get_client_ip(request),
    )

    result = await recording_service.download_and_verify(db, recording_id)

    return result


# =============================================================================
# Compliance Report Endpoints
# =============================================================================

@router.get("/{recording_id}/compliance-report")
async def get_compliance_report(
    recording_id: str,
    request: Request,
    include_chain_verification: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a compliance report for a recording.

    This report is suitable for court submission as evidence
    of proper chain of custody.
    """
    recording = await recording_service.get_recording(db, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify user has access
    family_file = await get_user_family_file(db, current_user.id, recording.family_file_id)
    if not family_file:
        raise HTTPException(status_code=403, detail="Access denied")

    # Log the report generation
    await recording_audit_service.log_access(
        db=db,
        recording_id=recording_id,
        user_id=current_user.id,
        action=RecordingAccessAction.EXPORT,
        user_email=current_user.email,
        user_role="parent",
        action_detail="Generated compliance report",
        ip_address=get_client_ip(request),
    )

    report = await recording_audit_service.generate_access_report(
        db, recording_id, include_chain_verification=include_chain_verification
    )

    return report


# =============================================================================
# Export Certificate Endpoints
# =============================================================================

@router.get("/certificate/{certificate_number}", response_model=ExportCertificateResponse)
async def get_export_certificate(
    certificate_number: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve an export certificate by certificate number.

    Certificates are generated when recordings are exported
    for court or legal purposes.
    """
    certificate = await recording_audit_service.get_export_certificate(
        db, certificate_number
    )

    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")

    # Verify user has access to the recording
    recording = await recording_service.get_recording(
        db, certificate["recording"]["id"]
    )
    if recording:
        family_file = await get_user_family_file(
            db, current_user.id, recording.family_file_id
        )
        if not family_file:
            raise HTTPException(status_code=403, detail="Access denied")

    return ExportCertificateResponse(**certificate)


# =============================================================================
# Evidence Export Endpoints
# =============================================================================

class EvidenceExportRequest(BaseModel):
    """Request to generate evidence package."""
    case_number: Optional[str] = Field(None, description="Court case number")
    court_name: Optional[str] = Field(None, description="Court name")
    court_order_reference: Optional[str] = Field(None, description="Court order reference")
    discovery_request_id: Optional[str] = Field(None, description="Discovery request ID")
    include_transcription: bool = Field(True, description="Include transcription in package")


class EvidenceExportResponse(BaseModel):
    """Evidence export response."""
    success: bool
    export_id: str
    certificate_number: str
    package_url: str
    package_hash: str
    package_size: int
    recording_hash: str
    transcription_included: bool
    transcription_hash: Optional[str] = None
    generated_at: str
    expires_at: str
    files_included: List[str]


@router.post("/{recording_id}/export-evidence", response_model=EvidenceExportResponse)
async def export_evidence_package(
    recording_id: str,
    request_body: EvidenceExportRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a court-ready evidence package for a recording.

    The package includes:
    - Original recording file with integrity hash
    - Complete chain of custody documentation
    - Transcription (if available and requested)
    - Compliance certification
    - Verification manifest

    The package is a ZIP file with a signed URL valid for 7 days.
    """
    recording = await recording_service.get_recording(db, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify user has access
    family_file = await get_user_family_file(db, current_user.id, recording.family_file_id)
    if not family_file:
        raise HTTPException(status_code=403, detail="Access denied")

    if not recording.is_available:
        raise HTTPException(
            status_code=400,
            detail=f"Recording not available for export. Status: {recording.status}"
        )

    try:
        result = await evidence_export_service.generate_recording_evidence_package(
            db=db,
            recording_id=recording_id,
            user_id=current_user.id,
            user_email=current_user.email,
            case_number=request_body.case_number,
            court_name=request_body.court_name,
            court_order_reference=request_body.court_order_reference,
            discovery_request_id=request_body.discovery_request_id,
            include_transcription=request_body.include_transcription,
            ip_address=get_client_ip(request),
        )

        return EvidenceExportResponse(**result)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Failed to generate evidence package: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate evidence package")
