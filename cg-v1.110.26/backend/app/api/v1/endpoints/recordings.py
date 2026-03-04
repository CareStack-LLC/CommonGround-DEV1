"""
Recording Access API Endpoints.

Provides access to call recordings and transcriptions for parents.
All access is logged for court-admissible chain of custody.
"""

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.recording import RecordingType, RecordingStatus, TranscriptionStatus, RecordingAccessAction
from app.services.recording import recording_service
from app.services.recording_audit import recording_audit_service
from app.services.family_file import get_user_family_file

logger = logging.getLogger(__name__)

router = APIRouter()


def get_client_ip(request: Request) -> Optional[str]:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


# =============================================================================
# Schemas
# =============================================================================

class RecordingResponse(BaseModel):
    """Recording response schema."""
    id: str
    family_file_id: str
    recording_type: str
    status: str
    duration_seconds: Optional[int] = None
    file_size_bytes: Optional[int] = None
    format: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    has_transcription: bool = False

    class Config:
        from_attributes = True


class RecordingDetailResponse(RecordingResponse):
    """Recording detail with download URL."""
    download_url: Optional[str] = None
    download_url_expires_at: Optional[datetime] = None


class TranscriptionChunkResponse(BaseModel):
    """Transcription chunk response."""
    id: str
    speaker_name: Optional[str] = None
    speaker_label: Optional[str] = None
    content: str
    start_time: float
    end_time: float
    is_flagged: bool = False

    class Config:
        from_attributes = True


class TranscriptionResponse(BaseModel):
    """Transcription response schema."""
    id: str
    recording_id: str
    status: str
    language: str
    duration_seconds: Optional[int] = None
    word_count: Optional[int] = None
    speaker_count: Optional[int] = None
    full_text: Optional[str] = None
    chunks: List[TranscriptionChunkResponse] = []

    class Config:
        from_attributes = True


class RecordingListResponse(BaseModel):
    """Paginated recording list."""
    items: List[RecordingResponse]
    total: int
    limit: int
    offset: int


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/family/{family_file_id}", response_model=RecordingListResponse)
async def get_family_recordings(
    family_file_id: str,
    recording_type: Optional[str] = Query(None, description="Filter by type: kidcoms, parent_call"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all recordings for a family file.

    Parents can view recordings from:
    - KidComs sessions (child communication)
    - Parent calls (parent-to-parent communication)
    """
    # Verify user has access to this family file
    family_file = await get_user_family_file(db, current_user.id, family_file_id)
    if not family_file:
        raise HTTPException(status_code=404, detail="Family file not found")

    # Parse recording type filter
    type_filter = None
    if recording_type:
        try:
            type_filter = RecordingType(recording_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid recording type. Must be: {[t.value for t in RecordingType]}"
            )

    # Get recordings
    recordings = await recording_service.get_family_recordings(
        db,
        family_file_id,
        recording_type=type_filter,
        limit=limit,
        offset=offset,
    )

    # Build response
    items = []
    for recording in recordings:
        items.append(RecordingResponse(
            id=recording.id,
            family_file_id=recording.family_file_id,
            recording_type=recording.recording_type,
            status=recording.status,
            duration_seconds=recording.duration_seconds,
            file_size_bytes=recording.file_size_bytes,
            format=recording.format,
            started_at=recording.started_at,
            ended_at=recording.ended_at,
            created_at=recording.created_at,
            has_transcription=recording.transcription is not None,
        ))

    return RecordingListResponse(
        items=items,
        total=len(items),  # TODO: Add proper count query
        limit=limit,
        offset=offset,
    )


@router.get("/{recording_id}", response_model=RecordingDetailResponse)
async def get_recording(
    recording_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific recording with download URL.

    The download URL is a signed URL valid for 1 hour.
    Access is logged for chain of custody.
    """
    recording = await recording_service.get_recording(db, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify user has access to this family file
    family_file = await get_user_family_file(db, current_user.id, recording.family_file_id)
    if not family_file:
        raise HTTPException(status_code=403, detail="Access denied")

    # Generate signed URL if recording is available
    download_url = None
    download_url_expires_at = None
    action = RecordingAccessAction.VIEW_METADATA

    if recording.is_available:
        download_url = await recording_service.generate_signed_url(db, recording_id)
        if download_url and recording.download_url_expires_at:
            download_url_expires_at = recording.download_url_expires_at
            action = RecordingAccessAction.GENERATE_URL

    # Log access for chain of custody
    await recording_audit_service.log_access(
        db=db,
        recording_id=recording_id,
        user_id=current_user.id,
        action=action,
        user_email=current_user.email,
        user_role="parent",
        action_detail=f"Viewed recording details, URL generated: {download_url is not None}",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
    )

    return RecordingDetailResponse(
        id=recording.id,
        family_file_id=recording.family_file_id,
        recording_type=recording.recording_type,
        status=recording.status,
        duration_seconds=recording.duration_seconds,
        file_size_bytes=recording.file_size_bytes,
        format=recording.format,
        started_at=recording.started_at,
        ended_at=recording.ended_at,
        created_at=recording.created_at,
        has_transcription=recording.transcription is not None,
        download_url=download_url,
        download_url_expires_at=download_url_expires_at,
    )


@router.get("/{recording_id}/transcription", response_model=TranscriptionResponse)
async def get_recording_transcription(
    recording_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the transcription for a recording.

    Returns the full transcription with speaker-diarized chunks.
    Access is logged for chain of custody.
    """
    recording = await recording_service.get_recording(db, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify user has access
    family_file = await get_user_family_file(db, current_user.id, recording.family_file_id)
    if not family_file:
        raise HTTPException(status_code=403, detail="Access denied")

    # Check if transcription exists
    if not recording.transcription:
        raise HTTPException(status_code=404, detail="Transcription not available")

    transcription = recording.transcription

    # Log transcription access
    await recording_audit_service.log_access(
        db=db,
        recording_id=recording_id,
        user_id=current_user.id,
        action=RecordingAccessAction.TRANSCRIPTION_VIEW,
        user_email=current_user.email,
        user_role="parent",
        action_detail=f"Viewed transcription ({transcription.word_count or 0} words)",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
    )

    # Build chunks response
    chunks = []
    for chunk in transcription.chunks:
        chunks.append(TranscriptionChunkResponse(
            id=chunk.id,
            speaker_name=chunk.speaker_name,
            speaker_label=chunk.speaker_label,
            content=chunk.content,
            start_time=chunk.start_time,
            end_time=chunk.end_time,
            is_flagged=chunk.is_flagged,
        ))

    return TranscriptionResponse(
        id=transcription.id,
        recording_id=transcription.recording_id,
        status=transcription.status,
        language=transcription.language,
        duration_seconds=transcription.duration_seconds,
        word_count=transcription.word_count,
        speaker_count=transcription.speaker_count,
        full_text=transcription.full_text,
        chunks=chunks,
    )


@router.post("/{recording_id}/refresh-url")
async def refresh_download_url(
    recording_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh the download URL for a recording.

    Use this if the previous URL has expired.
    Access is logged for chain of custody.
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
            detail=f"Recording not available. Status: {recording.status}"
        )

    # Generate new signed URL
    download_url = await recording_service.generate_signed_url(db, recording_id)
    if not download_url:
        raise HTTPException(status_code=500, detail="Failed to generate download URL")

    # Log URL generation
    await recording_audit_service.log_access(
        db=db,
        recording_id=recording_id,
        user_id=current_user.id,
        action=RecordingAccessAction.GENERATE_URL,
        user_email=current_user.email,
        user_role="parent",
        action_detail="Refreshed download URL",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
    )

    return {
        "download_url": download_url,
        "expires_at": recording.download_url_expires_at,
    }
