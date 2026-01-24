"""
Recording Service - Manages video call recordings and transcriptions.

Handles:
- AWS S3 storage configuration for Daily.co recordings
- Recording lifecycle management
- Transcription processing
- Signed URL generation for playback
"""

import hashlib
import hmac
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum

import boto3
from botocore.exceptions import ClientError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.recording import (
    Recording,
    Transcription,
    TranscriptionChunk,
    RecordingStatus,
    RecordingType,
    TranscriptionStatus,
)

logger = logging.getLogger(__name__)


class RecordingService:
    """Service for managing recordings and their S3 storage."""

    def __init__(self):
        """Initialize the recording service with S3 client."""
        self._s3_client = None
        self.bucket = settings.AWS_S3_RECORDING_BUCKET
        self.prefix = settings.AWS_S3_RECORDING_PREFIX
        self.region = settings.AWS_REGION

    @property
    def s3_client(self):
        """Lazy-load S3 client."""
        if self._s3_client is None:
            if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                self._s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_REGION
                )
            else:
                logger.warning("AWS credentials not configured - S3 operations will fail")
                self._s3_client = boto3.client('s3', region_name=settings.AWS_REGION)
        return self._s3_client

    def get_s3_config_for_daily(self) -> Dict[str, Any]:
        """
        Get S3 configuration for Daily.co recording destination.

        Returns configuration that can be passed to Daily.co API
        for cloud recording to your own S3 bucket.
        """
        return {
            "s3": {
                "bucket": self.bucket,
                "prefix": self.prefix,
                "region": self.region,
                "credentials": {
                    "access_key_id": settings.AWS_ACCESS_KEY_ID,
                    "secret_access_key": settings.AWS_SECRET_ACCESS_KEY,
                }
            }
        }

    def build_recording_key(
        self,
        family_file_id: str,
        session_id: str,
        recording_type: RecordingType,
        filename: str = "recording.mp4"
    ) -> str:
        """
        Build S3 key for a recording.

        Format: {prefix}/{type}/{family_id}/{session_id}/{filename}
        """
        type_folder = recording_type.value  # "kidcoms" or "parent_call"
        return f"{self.prefix}/{type_folder}/{family_file_id}/{session_id}/{filename}"

    async def create_recording(
        self,
        db: AsyncSession,
        family_file_id: str,
        daily_room_name: str,
        recording_type: RecordingType,
        session_id: str,
        daily_recording_id: Optional[str] = None,
    ) -> Recording:
        """
        Create a new recording record in pending state.

        Args:
            db: Database session
            family_file_id: Family file ID
            daily_room_name: Daily.co room name
            recording_type: Type of recording (kidcoms or parent_call)
            session_id: Session ID (kidcoms_session_id or parent_call_session_id)
            daily_recording_id: Daily.co recording ID (if known)

        Returns:
            Created Recording object
        """
        recording = Recording(
            family_file_id=family_file_id,
            daily_room_name=daily_room_name,
            recording_type=recording_type.value,
            daily_recording_id=daily_recording_id,
            status=RecordingStatus.PENDING.value,
        )

        # Set the appropriate session relationship
        if recording_type == RecordingType.KIDCOMS:
            recording.kidcoms_session_id = session_id
        else:
            recording.parent_call_session_id = session_id

        db.add(recording)
        await db.commit()
        await db.refresh(recording)

        logger.info(
            f"Created recording {recording.id} for {recording_type.value} "
            f"session {session_id}"
        )

        return recording

    async def get_recording(
        self,
        db: AsyncSession,
        recording_id: str
    ) -> Optional[Recording]:
        """Get a recording by ID."""
        result = await db.execute(
            select(Recording).where(Recording.id == recording_id)
        )
        return result.scalar_one_or_none()

    async def get_recording_by_daily_id(
        self,
        db: AsyncSession,
        daily_recording_id: str
    ) -> Optional[Recording]:
        """Get a recording by Daily.co recording ID."""
        result = await db.execute(
            select(Recording).where(Recording.daily_recording_id == daily_recording_id)
        )
        return result.scalar_one_or_none()

    async def get_session_recording(
        self,
        db: AsyncSession,
        session_id: str,
        recording_type: RecordingType
    ) -> Optional[Recording]:
        """Get recording for a specific session."""
        if recording_type == RecordingType.KIDCOMS:
            result = await db.execute(
                select(Recording).where(Recording.kidcoms_session_id == session_id)
            )
        else:
            result = await db.execute(
                select(Recording).where(Recording.parent_call_session_id == session_id)
            )
        return result.scalar_one_or_none()

    async def update_recording_started(
        self,
        db: AsyncSession,
        recording_id: str,
        daily_recording_id: str
    ) -> Recording:
        """Mark recording as started."""
        recording = await self.get_recording(db, recording_id)
        if not recording:
            raise ValueError(f"Recording {recording_id} not found")

        recording.daily_recording_id = daily_recording_id
        recording.mark_recording()

        await db.commit()
        await db.refresh(recording)

        logger.info(f"Recording {recording_id} started (daily_id: {daily_recording_id})")
        return recording

    async def update_recording_completed(
        self,
        db: AsyncSession,
        recording_id: str,
        s3_key: str,
        duration_seconds: Optional[int] = None,
        file_size_bytes: Optional[int] = None,
    ) -> Recording:
        """Mark recording as completed with S3 location."""
        recording = await self.get_recording(db, recording_id)
        if not recording:
            raise ValueError(f"Recording {recording_id} not found")

        recording.mark_completed(
            s3_bucket=self.bucket,
            s3_key=s3_key,
            s3_region=self.region,
            duration_seconds=duration_seconds,
            file_size_bytes=file_size_bytes,
        )

        # Set retention (default 7 years for legal records)
        recording.retain_until = datetime.utcnow() + timedelta(days=2555)

        await db.commit()
        await db.refresh(recording)

        logger.info(
            f"Recording {recording_id} completed: s3://{self.bucket}/{s3_key}"
        )
        return recording

    async def update_recording_failed(
        self,
        db: AsyncSession,
        recording_id: str,
        error_message: str
    ) -> Recording:
        """Mark recording as failed."""
        recording = await self.get_recording(db, recording_id)
        if not recording:
            raise ValueError(f"Recording {recording_id} not found")

        recording.mark_failed(error_message)

        await db.commit()
        await db.refresh(recording)

        logger.error(f"Recording {recording_id} failed: {error_message}")
        return recording

    async def generate_signed_url(
        self,
        db: AsyncSession,
        recording_id: str,
        expires_in: int = 3600
    ) -> Optional[str]:
        """
        Generate a signed URL for recording playback.

        Args:
            db: Database session
            recording_id: Recording ID
            expires_in: URL expiration time in seconds (default 1 hour)

        Returns:
            Signed URL or None if recording not available
        """
        recording = await self.get_recording(db, recording_id)
        if not recording or not recording.is_available:
            return None

        if not recording.s3_bucket or not recording.s3_key:
            return None

        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': recording.s3_bucket,
                    'Key': recording.s3_key,
                },
                ExpiresIn=expires_in
            )

            # Cache the URL
            recording.download_url = url
            recording.download_url_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            await db.commit()

            return url

        except ClientError as e:
            logger.error(f"Failed to generate signed URL for {recording_id}: {e}")
            return None

    async def get_family_recordings(
        self,
        db: AsyncSession,
        family_file_id: str,
        recording_type: Optional[RecordingType] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Recording]:
        """Get recordings for a family file."""
        query = select(Recording).where(
            Recording.family_file_id == family_file_id,
            Recording.status == RecordingStatus.COMPLETED.value
        ).order_by(Recording.started_at.desc())

        if recording_type:
            query = query.where(Recording.recording_type == recording_type.value)

        query = query.limit(limit).offset(offset)

        result = await db.execute(query)
        return list(result.scalars().all())

    # =========================================================================
    # Transcription Management
    # =========================================================================

    async def create_transcription(
        self,
        db: AsyncSession,
        recording_id: str,
        language: str = "en"
    ) -> Transcription:
        """Create a transcription record for a recording."""
        transcription = Transcription(
            recording_id=recording_id,
            language=language,
            status=TranscriptionStatus.PENDING.value,
        )

        db.add(transcription)
        await db.commit()
        await db.refresh(transcription)

        return transcription

    async def add_transcription_chunk(
        self,
        db: AsyncSession,
        transcription_id: str,
        content: str,
        start_time: float,
        end_time: float,
        speaker_id: Optional[str] = None,
        speaker_name: Optional[str] = None,
        speaker_label: Optional[str] = None,
        confidence: Optional[float] = None,
    ) -> TranscriptionChunk:
        """Add a chunk to a transcription (from real-time transcription)."""
        chunk = TranscriptionChunk(
            transcription_id=transcription_id,
            content=content,
            start_time=start_time,
            end_time=end_time,
            speaker_id=speaker_id,
            speaker_name=speaker_name,
            speaker_label=speaker_label,
            confidence=confidence,
        )

        db.add(chunk)
        await db.commit()
        await db.refresh(chunk)

        return chunk

    async def complete_transcription(
        self,
        db: AsyncSession,
        transcription_id: str,
        full_text: Optional[str] = None,
        word_count: Optional[int] = None,
        speaker_count: Optional[int] = None,
    ) -> Transcription:
        """Mark transcription as completed."""
        result = await db.execute(
            select(Transcription).where(Transcription.id == transcription_id)
        )
        transcription = result.scalar_one_or_none()

        if not transcription:
            raise ValueError(f"Transcription {transcription_id} not found")

        transcription.status = TranscriptionStatus.COMPLETED.value
        transcription.completed_at = datetime.utcnow()
        transcription.full_text = full_text
        transcription.word_count = word_count
        transcription.speaker_count = speaker_count

        await db.commit()
        await db.refresh(transcription)

        return transcription

    # =========================================================================
    # Webhook Signature Verification
    # =========================================================================

    def verify_daily_webhook_signature(
        self,
        payload: bytes,
        signature: str
    ) -> bool:
        """
        Verify Daily.co webhook signature.

        Daily.co signs webhooks with HMAC-SHA256 using your webhook secret.
        """
        if not settings.DAILY_WEBHOOK_SECRET:
            logger.warning("DAILY_WEBHOOK_SECRET not configured - skipping verification")
            return True

        expected_signature = hmac.new(
            settings.DAILY_WEBHOOK_SECRET.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected_signature)


# Global service instance
recording_service = RecordingService()
