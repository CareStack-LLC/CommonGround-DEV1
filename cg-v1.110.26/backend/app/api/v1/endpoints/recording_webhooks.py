"""
Daily.co Webhook Handlers for Recording Events.

Handles webhook events from Daily.co for:
- Recording started/stopped/completed
- Transcription events
- S3 upload notifications
"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.recording import RecordingType, RecordingStatus
from app.services.recording import recording_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/daily/recording")
async def handle_daily_recording_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Daily.co recording webhook events.

    Events handled:
    - recording.started: Recording has begun
    - recording.stopped: Recording has stopped (processing begins)
    - recording.ready-to-download: Recording is ready in S3
    - recording.error: Recording failed

    See: https://docs.daily.co/reference/rest-api/webhooks
    """
    # Get raw body for signature verification
    body = await request.body()

    # Verify webhook signature
    signature = request.headers.get("x-daily-signature", "")
    if not recording_service.verify_daily_webhook_signature(body, signature):
        logger.warning("Invalid Daily.co webhook signature")
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Parse payload
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse webhook payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = payload.get("type")
    event_data = payload.get("data", {})

    logger.info(f"Received Daily.co webhook: {event_type}")
    logger.debug(f"Webhook payload: {payload}")

    try:
        if event_type == "recording.started":
            await handle_recording_started(db, event_data)

        elif event_type == "recording.stopped":
            await handle_recording_stopped(db, event_data)

        elif event_type == "recording.ready-to-download":
            await handle_recording_ready(db, event_data)

        elif event_type == "recording.error":
            await handle_recording_error(db, event_data)

        else:
            logger.debug(f"Ignoring unhandled event type: {event_type}")

        return {"status": "ok"}

    except Exception as e:
        logger.error(f"Error processing webhook {event_type}: {e}")
        # Return 200 to prevent retries for handled errors
        return {"status": "error", "message": str(e)}


async def handle_recording_started(db: AsyncSession, data: Dict[str, Any]):
    """Handle recording.started event."""
    recording_id = data.get("recording_id")
    room_name = data.get("room_name")
    session_id = data.get("session_id")  # This is our internal session ID

    logger.info(f"Recording started: {recording_id} for room {room_name}")

    # Find or create recording record
    recording = await recording_service.get_recording_by_daily_id(db, recording_id)

    if not recording:
        # Recording was likely created when starting the call
        # Look for pending recording by room name
        logger.warning(
            f"No recording found for daily_recording_id {recording_id}, "
            f"checking by session_id"
        )
        # The session_id in metadata should help us find it
        return

    # Update recording status
    recording.status = RecordingStatus.RECORDING.value
    recording.started_at = data.get("start_ts")

    await db.commit()


async def handle_recording_stopped(db: AsyncSession, data: Dict[str, Any]):
    """Handle recording.stopped event (processing begins)."""
    recording_id = data.get("recording_id")

    logger.info(f"Recording stopped, processing: {recording_id}")

    recording = await recording_service.get_recording_by_daily_id(db, recording_id)
    if not recording:
        logger.warning(f"Recording not found for daily_id: {recording_id}")
        return

    recording.status = RecordingStatus.PROCESSING.value
    recording.ended_at = data.get("end_ts")

    # Calculate duration
    if recording.started_at and recording.ended_at:
        duration = (recording.ended_at - recording.started_at).total_seconds()
        recording.duration_seconds = int(duration)

    await db.commit()


async def handle_recording_ready(db: AsyncSession, data: Dict[str, Any]):
    """Handle recording.ready-to-download event (recording in S3)."""
    recording_id = data.get("recording_id")
    s3_key = data.get("s3_key")
    duration = data.get("duration")
    size = data.get("size")

    logger.info(f"Recording ready: {recording_id} at {s3_key}")

    recording = await recording_service.get_recording_by_daily_id(db, recording_id)
    if not recording:
        logger.warning(f"Recording not found for daily_id: {recording_id}")
        return

    # Update with S3 location
    await recording_service.update_recording_completed(
        db,
        recording.id,
        s3_key=s3_key,
        duration_seconds=int(duration) if duration else None,
        file_size_bytes=int(size) if size else None,
    )

    logger.info(f"Recording {recording.id} completed successfully")


async def handle_recording_error(db: AsyncSession, data: Dict[str, Any]):
    """Handle recording.error event."""
    recording_id = data.get("recording_id")
    error = data.get("error", "Unknown error")

    logger.error(f"Recording failed: {recording_id} - {error}")

    recording = await recording_service.get_recording_by_daily_id(db, recording_id)
    if not recording:
        logger.warning(f"Recording not found for daily_id: {recording_id}")
        return

    await recording_service.update_recording_failed(db, recording.id, str(error))


@router.post("/daily/transcription")
async def handle_daily_transcription_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Daily.co transcription webhook events.

    Events handled:
    - transcription.started: Transcription has begun
    - transcription.message: Real-time transcription chunk
    - transcription.stopped: Transcription ended
    - transcription.error: Transcription failed
    """
    # Get raw body for signature verification
    body = await request.body()

    # Verify webhook signature
    signature = request.headers.get("x-daily-signature", "")
    if not recording_service.verify_daily_webhook_signature(body, signature):
        logger.warning("Invalid Daily.co webhook signature")
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Parse payload
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse webhook payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = payload.get("type")
    event_data = payload.get("data", {})

    logger.info(f"Received Daily.co transcription webhook: {event_type}")

    try:
        if event_type == "transcription.message":
            await handle_transcription_message(db, event_data)

        elif event_type == "transcription.started":
            logger.info(f"Transcription started for room: {event_data.get('room_name')}")

        elif event_type == "transcription.stopped":
            await handle_transcription_stopped(db, event_data)

        elif event_type == "transcription.error":
            logger.error(f"Transcription error: {event_data}")

        return {"status": "ok"}

    except Exception as e:
        logger.error(f"Error processing transcription webhook {event_type}: {e}")
        return {"status": "error", "message": str(e)}


async def handle_transcription_message(db: AsyncSession, data: Dict[str, Any]):
    """
    Handle real-time transcription message.

    This is called for each transcription chunk from Deepgram.
    Used for ARIA real-time monitoring.
    """
    room_name = data.get("room_name")
    participant_id = data.get("participant_id")
    text = data.get("text", "")
    timestamp = data.get("timestamp")
    is_final = data.get("is_final", False)

    # Only process final transcripts (not interim)
    if not is_final:
        return

    logger.debug(f"Transcription chunk for {room_name}: {text[:50]}...")

    # Find the recording for this room
    # Note: In production, you'd cache this lookup
    # For now, we'll store chunks directly linked to the transcription

    # TODO: Implement ARIA real-time analysis here
    # This is where you'd:
    # 1. Look up the active session/recording
    # 2. Create a TranscriptionChunk
    # 3. Run ARIA analysis on the chunk
    # 4. Flag if concerning content detected


async def handle_transcription_stopped(db: AsyncSession, data: Dict[str, Any]):
    """Handle transcription stopped event."""
    room_name = data.get("room_name")

    logger.info(f"Transcription stopped for room: {room_name}")

    # Mark transcription as completed
    # The full transcript will be combined from all chunks
