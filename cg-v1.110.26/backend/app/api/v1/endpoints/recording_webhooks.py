"""
Daily.co Webhook Handlers for Recording Events.

Handles webhook events from Daily.co for:
- Recording started/stopped/completed
- Transcription events
- Downloads recordings and stores in Supabase Storage
"""

import logging
from typing import Dict, Any
from datetime import datetime

import httpx
from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.recording import RecordingStatus
from app.services.recording import recording_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/daily/recording")
async def handle_daily_recording_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Daily.co recording webhook events.

    Events handled:
    - recording.started: Recording has begun
    - recording.stopped: Recording has stopped (processing begins)
    - recording.ready-to-download: Recording is ready, download and store in Supabase
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
            # Process download in background to not block webhook response
            background_tasks.add_task(
                download_and_store_recording,
                event_data
            )

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
    daily_recording_id = data.get("recording_id")
    room_name = data.get("room_name")

    logger.info(f"Recording started: {daily_recording_id} for room {room_name}")

    # Find recording record by Daily recording ID
    recording = await recording_service.get_recording_by_daily_id(db, daily_recording_id)

    if not recording:
        logger.warning(
            f"No recording found for daily_recording_id {daily_recording_id}"
        )
        return

    # Update recording status
    recording.status = RecordingStatus.RECORDING.value
    recording.started_at = datetime.utcnow()

    await db.commit()


async def handle_recording_stopped(db: AsyncSession, data: Dict[str, Any]):
    """Handle recording.stopped event (processing begins)."""
    daily_recording_id = data.get("recording_id")

    logger.info(f"Recording stopped, processing: {daily_recording_id}")

    recording = await recording_service.get_recording_by_daily_id(db, daily_recording_id)
    if not recording:
        logger.warning(f"Recording not found for daily_id: {daily_recording_id}")
        return

    recording.status = RecordingStatus.PROCESSING.value
    recording.ended_at = datetime.utcnow()

    # Calculate duration
    if recording.started_at and recording.ended_at:
        duration = (recording.ended_at - recording.started_at).total_seconds()
        recording.duration_seconds = int(duration)

    await db.commit()


async def download_and_store_recording(data: Dict[str, Any]):
    """
    Download recording from Daily.co and store in Supabase Storage.

    This runs as a background task to not block the webhook response.
    """
    from app.core.database import async_session_maker
    from app.models.recording import RecordingType

    daily_recording_id = data.get("recording_id")
    download_url = data.get("download_link") or data.get("download_url")
    duration = data.get("duration")
    room_name = data.get("room_name")

    logger.info(f"Downloading recording {daily_recording_id} from Daily.co")

    if not download_url:
        logger.error(f"No download URL for recording {daily_recording_id}")
        return

    async with async_session_maker() as db:
        try:
            # Find the recording record
            recording = await recording_service.get_recording_by_daily_id(
                db, daily_recording_id
            )

            if not recording:
                logger.warning(f"Recording not found for daily_id: {daily_recording_id}")
                return

            # Download the file from Daily.co
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.get(download_url)
                response.raise_for_status()
                file_content = response.content
                file_size = len(file_content)

            logger.info(
                f"Downloaded recording {daily_recording_id}: {file_size} bytes"
            )

            # Determine recording type
            recording_type = RecordingType(recording.recording_type)

            # Build storage path
            storage_path = recording_service.build_recording_path(
                family_file_id=recording.family_file_id,
                session_id=recording.kidcoms_session_id or recording.parent_call_session_id,
                recording_type=recording_type,
                filename=f"recording_{daily_recording_id}.mp4"
            )

            # Upload to Supabase Storage
            await recording_service.upload_recording(
                family_file_id=recording.family_file_id,
                session_id=recording.kidcoms_session_id or recording.parent_call_session_id,
                recording_type=recording_type,
                file_content=file_content,
                content_type="video/mp4",
                filename=f"recording_{daily_recording_id}.mp4"
            )

            # Update recording as completed
            await recording_service.update_recording_completed(
                db,
                recording.id,
                storage_path=storage_path,
                duration_seconds=int(duration) if duration else None,
                file_size_bytes=file_size,
            )

            logger.info(
                f"Recording {recording.id} stored in Supabase: {storage_path}"
            )

        except httpx.HTTPError as e:
            logger.error(f"Failed to download recording {daily_recording_id}: {e}")
            if recording:
                await recording_service.update_recording_failed(
                    db, recording.id, f"Download failed: {str(e)}"
                )

        except Exception as e:
            logger.error(f"Failed to process recording {daily_recording_id}: {e}")
            if recording:
                await recording_service.update_recording_failed(
                    db, recording.id, f"Processing failed: {str(e)}"
                )


async def handle_recording_error(db: AsyncSession, data: Dict[str, Any]):
    """Handle recording.error event."""
    daily_recording_id = data.get("recording_id")
    error = data.get("error", "Unknown error")

    logger.error(f"Recording failed: {daily_recording_id} - {error}")

    recording = await recording_service.get_recording_by_daily_id(db, daily_recording_id)
    if not recording:
        logger.warning(f"Recording not found for daily_id: {daily_recording_id}")
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

    # TODO: Implement ARIA real-time analysis here
    # This is where you'd:
    # 1. Look up the active session/recording by room_name
    # 2. Create a TranscriptionChunk
    # 3. Run ARIA analysis on the chunk
    # 4. Flag if concerning content detected


async def handle_transcription_stopped(db: AsyncSession, data: Dict[str, Any]):
    """Handle transcription stopped event."""
    room_name = data.get("room_name")

    logger.info(f"Transcription stopped for room: {room_name}")

    # Mark transcription as completed
    # The full transcript will be combined from all chunks
