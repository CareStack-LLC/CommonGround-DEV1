"""
Parent Call endpoints - Video/audio calling for parent-to-parent communication.

Provides:
- Call initiation and session management
- Daily.co integration with permanent rooms
- Real-time ARIA monitoring
- Transcript processing and analysis
- Court-ready call reports
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.family_file import FamilyFile
from app.models.parent_call import (
    ParentCallSession,
    ParentCallRoom,
    CallTranscriptChunk,
    CallFlag,
    CallStatus,
)
from app.schemas.parent_call import (
    CallSessionCreate,
    CallSessionJoin,
    CallSessionJoinResponse,
    CallSessionResponse,
    TranscriptChunkCreate,
    CallReportResponse,
    CallARIAAnalysisResponse,
    CallFlagResponse,
    ARIASettingsUpdate,
)
from app.services.parent_call import parent_call_service
from app.services.aria_call_monitor import aria_call_monitor
from app.services.daily_video import daily_service
from app.services.whisper_transcription import whisper_service
from app.services.storage import storage_service, StorageBucket, build_recording_path
from app.core.config import settings
from app.core.websocket import manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=CallSessionJoinResponse)
async def initiate_call(
    call_create: CallSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Initiate a new parent-to-parent call.

    Creates a call session using the family file's permanent Daily.co room.
    Returns room URL and meeting token for the initiating parent.

    Args:
        call_create: Call session details (family_file_id, call_type)

    Returns:
        Room URL and token for joining

    Raises:
        404: Family file not found
        403: User not a parent in family file
    """
    # Verify family file access
    result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == call_create.family_file_id)
    )
    family_file = result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family file not found"
        )

    # Verify user is a parent
    if current_user.id not in [family_file.parent_a_id, family_file.parent_b_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a parent in this family file to initiate calls"
        )

    # Check if parent B has joined (required for calling)
    if not family_file.parent_b_id or not family_file.parent_b_joined_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both parents must join the family file before calling is enabled. Only messaging is available until both parents have joined."
        )

    # Validate call type
    if call_create.call_type not in ["video", "audio"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Call type must be 'video' or 'audio'"
        )

    # Create call session with ARIA sensitivity settings
    try:
        session = await parent_call_service.create_call_session(
            db=db,
            family_file_id=call_create.family_file_id,
            initiator_id=current_user.id,
            call_type=call_create.call_type,
            aria_sensitivity_level=call_create.aria_sensitivity_level
        )
    except ValueError as e:
        # ValueError indicates configuration issue (e.g., missing API key)
        logger.error(f"Failed to create call session: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create call session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create call session"
        )

    # Join the call (get token for initiator)
    try:
        join_data = await parent_call_service.join_call(
            db=db,
            session_id=session.id,
            user_id=current_user.id,
            user_name=current_user.profile.display_name if current_user.profile else current_user.email
        )
    except ValueError as e:
        # ValueError indicates configuration issue (e.g., missing API key)
        logger.error(f"Failed to join call: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to join call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to join call session"
        )

    # Broadcast call notification to other parent via WebSocket
    other_parent_id = family_file.parent_b_id if current_user.id == family_file.parent_a_id else family_file.parent_a_id
    if other_parent_id:
        # Convert UUID to string for WebSocket manager lookup
        other_parent_id_str = str(other_parent_id)
        caller_name = current_user.profile.display_name if current_user.profile else current_user.email
        notification_payload = {
            "type": "incoming_call",
            "session_id": str(session.id),
            "caller_id": str(current_user.id),
            "caller_name": caller_name,
            "call_type": call_create.call_type,
            "family_file_id": str(call_create.family_file_id),
        }
        logger.info(f"Sending incoming_call notification to {other_parent_id_str}: {notification_payload}")

        # Check if user is connected
        is_connected = other_parent_id_str in manager.active_connections
        logger.info(f"Other parent {other_parent_id_str} connected: {is_connected}, connections: {len(manager.active_connections.get(other_parent_id_str, set()))}")

        await manager.send_personal_message(
            message=notification_payload,
            user_id=other_parent_id_str
        )
        logger.info(f"Incoming call notification sent to {other_parent_id_str}")
    else:
        logger.warning(f"No other parent found to notify for family file {family_file.id}")

    logger.info(f"Call session {session.id} initiated by {current_user.id}")

    return join_data


@router.post("/{session_id}/join", response_model=CallSessionJoinResponse)
async def join_call(
    session_id: str,
    join_data: CallSessionJoin,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Join an existing call session.

    Second parent joins the call. Generates a meeting token and updates session status.

    Args:
        session_id: Call session ID
        join_data: Join details (user_name)

    Returns:
        Room URL and token for joining

    Raises:
        404: Session not found
        403: User not authorized to join
    """
    # Get session
    result = await db.execute(
        select(ParentCallSession).where(ParentCallSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )

    # Verify family file access
    ff_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == session.family_file_id)
    )
    family_file = ff_result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family file not found"
        )

    # Verify user is a parent
    if current_user.id not in [family_file.parent_a_id, family_file.parent_b_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a parent in this family file to join calls"
        )

    # Join the call
    try:
        join_response = await parent_call_service.join_call(
            db=db,
            session_id=session_id,
            user_id=current_user.id,
            user_name=join_data.user_name
        )
    except ValueError as e:
        # ValueError indicates configuration issue (e.g., missing API key)
        logger.error(f"Failed to join call: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to join call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to join call session"
        )

    # Refresh session to get updated status
    await db.refresh(session)

    # If call just started (second parent joined), start recording and transcription
    if session.status == CallStatus.ACTIVE.value and session.recording_enabled:
        try:
            # Build webhook URL for transcript chunks
            api_url = getattr(settings, 'API_URL', 'http://localhost:8000')
            webhook_url = f"{api_url}/api/v1/parent-calls/{session_id}/transcript-chunk"

            # Start recording
            await daily_service.start_recording(
                room_name=session.daily_room_name,
                webhook_url=None  # Recording webhook handled separately
            )
            logger.info(f"Started recording for session {session_id}")

            # Start transcription
            await daily_service.start_transcription(
                room_name=session.daily_room_name,
                webhook_url=webhook_url
            )
            logger.info(f"Started transcription for session {session_id} (webhook: {webhook_url})")

        except Exception as e:
            logger.error(f"Failed to start recording/transcription for session {session_id}: {e}")
            # Don't fail the join if recording/transcription fails

    logger.info(f"User {current_user.id} joined call session {session_id}")

    return join_response


@router.patch("/{session_id}/aria-settings")
async def update_aria_settings(
    session_id: str,
    settings: ARIASettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update ARIA sensitivity settings for a call session.

    Allows parents to adjust ARIA sensitivity during or before a call.

    Args:
        session_id: Call session ID
        settings: New ARIA sensitivity settings

    Returns:
        Updated session info

    Raises:
        404: Session not found
        403: User not authorized
    """
    # Get session
    result = await db.execute(
        select(ParentCallSession).where(ParentCallSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )

    # Verify user is a participant
    if current_user.id not in [session.parent_a_id, session.parent_b_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this call"
        )

    # Update sensitivity settings
    session.aria_sensitivity_level = settings.sensitivity_level

    # Update threshold based on level
    threshold_map = {
        "strict": 0.3,
        "moderate": 0.5,
        "relaxed": 0.7,
        "off": 1.0,
    }
    session.aria_sensitivity_threshold = threshold_map.get(settings.sensitivity_level, 0.5)

    await db.commit()
    await db.refresh(session)

    logger.info(f"ARIA settings updated for session {session_id}: level={settings.sensitivity_level}")

    # Notify both parents of the settings change
    for parent_id in [session.parent_a_id, session.parent_b_id]:
        if parent_id:
            await manager.send_personal_message(
                message={
                    "type": "aria_settings_updated",
                    "session_id": session_id,
                    "sensitivity_level": session.aria_sensitivity_level,
                    "updated_by": current_user.id,
                },
                user_id=parent_id
            )

    return {
        "message": "ARIA settings updated successfully",
        "session_id": session_id,
        "aria_sensitivity_level": session.aria_sensitivity_level,
        "aria_sensitivity_threshold": session.aria_sensitivity_threshold,
    }


@router.post("/{session_id}/end")
async def end_call(
    session_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    End a call session.

    Marks the call as ended and triggers post-call analysis in the background.

    Args:
        session_id: Call session ID

    Returns:
        Success message

    Raises:
        404: Session not found
        403: User not authorized
    """
    # Get session
    result = await db.execute(
        select(ParentCallSession).where(ParentCallSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )

    # Verify user is a participant
    if current_user.id not in [session.parent_a_id, session.parent_b_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this call"
        )

    # Stop recording and transcription
    if session.recording_enabled:
        try:
            await daily_service.stop_recording(session.daily_room_name)
            await daily_service.stop_transcription(session.daily_room_name)
            logger.info(f"Stopped recording and transcription for session {session_id}")
        except Exception as e:
            logger.error(f"Failed to stop recording/transcription: {e}")

    # End the call
    try:
        updated_session = await parent_call_service.end_call(
            db=db,
            session_id=session_id,
            terminated_by_aria=False,
            termination_reason=None
        )
    except Exception as e:
        logger.error(f"Failed to end call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to end call session"
        )

    # Schedule post-call processing in background
    background_tasks.add_task(
        _process_post_call_complete,
        session_id=session_id,
        room_name=session.daily_room_name,
        family_file_id=session.family_file_id
    )

    logger.info(f"Call session {session_id} ended by {current_user.id}")

    return {
        "message": "Call ended successfully",
        "session_id": session_id,
        "duration_seconds": updated_session.duration_seconds
    }


@router.post("/{session_id}/transcript-chunk")
async def process_transcript_chunk(
    session_id: str,
    chunk_data: TranscriptChunkCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Process transcript chunk from Daily.co webhook.

    Stores chunk and runs real-time ARIA analysis for severe violations.
    Broadcasts warnings via WebSocket if intervention needed.

    Args:
        session_id: Call session ID
        chunk_data: Transcript chunk data from Daily.co

    Returns:
        Processing result

    Note:
        This endpoint is called by Daily.co webhook (no auth required)
    """
    # Get session
    result = await db.execute(
        select(ParentCallSession).where(ParentCallSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )

    # Store transcript chunk
    try:
        chunk = await parent_call_service.process_transcript_chunk(
            db=db,
            session_id=session_id,
            speaker_id=chunk_data.speaker_id,
            speaker_name=chunk_data.speaker_name,
            content=chunk_data.content,
            confidence=chunk_data.confidence,
            start_time=chunk_data.start_time,
            end_time=chunk_data.end_time
        )
    except Exception as e:
        logger.error(f"Failed to store transcript chunk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process transcript chunk"
        )

    # Real-time ARIA analysis (if enabled and not set to 'off')
    if session.aria_active and session.aria_sensitivity_level != "off":
        try:
            flag = await aria_call_monitor.analyze_transcript_chunk_realtime(
                db=db,
                chunk=chunk,
                sensitivity_level=session.aria_sensitivity_level
            )

            # If violation detected, handle intervention
            if flag and flag.intervention_needed:
                intervention_data = await aria_call_monitor.handle_severe_violation(
                    db=db,
                    session=session,
                    flag=flag,
                    chunk=chunk
                )

                # Broadcast intervention via WebSocket to both parents
                for parent_id in [session.parent_a_id, session.parent_b_id]:
                    if parent_id:
                        await manager.send_personal_message(
                            message=intervention_data,
                            user_id=parent_id
                        )

                logger.warning(
                    f"ARIA intervention in session {session_id}: "
                    f"type={flag.intervention_type.value if flag.intervention_type else 'none'}, "
                    f"speaker={flag.speaker_id}, "
                    f"mute={flag.mute_duration_seconds}s"
                )

                return {
                    "message": "Transcript chunk processed with intervention",
                    "chunk_id": chunk.id,
                    "intervention": intervention_data
                }

        except Exception as e:
            logger.error(f"ARIA analysis failed: {e}")
            # Continue even if ARIA fails

    return {
        "message": "Transcript chunk processed successfully",
        "chunk_id": chunk.id
    }


@router.post("/{session_id}/audio-chunk")
async def process_audio_chunk(
    session_id: str,
    audio: UploadFile = File(...),
    speaker_id: str = Form(...),
    speaker_name: str = Form(...),
    chunk_index: int = Form(0),
    start_time: float = Form(0.0),
    db: AsyncSession = Depends(get_db)
):
    """
    Process audio chunk using OpenAI Whisper for transcription.

    This endpoint:
    1. Receives audio data from the frontend
    2. Transcribes it using OpenAI Whisper
    3. Runs ARIA analysis on the transcription
    4. Returns/broadcasts interventions if needed

    Args:
        session_id: Call session ID
        audio: Audio file (webm, mp3, wav, etc.)
        speaker_id: ID of the speaker
        speaker_name: Name of the speaker
        chunk_index: Index of this chunk in the stream
        start_time: Start time in seconds from call start

    Returns:
        Transcription result and any ARIA interventions
    """
    # Get session
    result = await db.execute(
        select(ParentCallSession).where(ParentCallSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )

    # Read audio data
    try:
        audio_data = await audio.read()
        logger.info(f"Received audio chunk: {len(audio_data)} bytes, format: {audio.content_type}")
    except Exception as e:
        logger.error(f"Failed to read audio data: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid audio data"
        )

    # Determine audio format from content type
    content_type = audio.content_type or "audio/webm"
    format_map = {
        "audio/webm": "webm",
        "audio/mp4": "mp4",
        "audio/mpeg": "mp3",
        "audio/mp3": "mp3",
        "audio/wav": "wav",
        "audio/ogg": "ogg",
    }
    audio_format = format_map.get(content_type, "webm")

    # Transcribe with Whisper
    transcription = await whisper_service.transcribe_audio_stream(
        audio_data=audio_data,
        session_id=session_id,
        speaker_id=speaker_id,
        chunk_index=chunk_index,
        audio_format=audio_format
    )

    # If no speech detected, return early
    if not transcription.get("has_speech"):
        return {
            "message": "No speech detected",
            "transcription": None,
            "intervention": None
        }

    logger.info(f"Whisper transcribed: '{transcription.get('content', '')[:50]}...'")

    # Store transcript chunk
    try:
        # Estimate end time based on typical speech rate
        content = transcription.get("content", "")
        estimated_duration = len(content.split()) * 0.4  # ~0.4s per word average
        end_time = start_time + estimated_duration

        chunk = await parent_call_service.process_transcript_chunk(
            db=db,
            session_id=session_id,
            speaker_id=speaker_id,
            speaker_name=speaker_name,
            content=content,
            confidence=transcription.get("confidence", 0.9),
            start_time=start_time,
            end_time=end_time
        )
    except Exception as e:
        logger.error(f"Failed to store transcript chunk: {e}")
        # Continue even if storage fails - we still want to analyze

    # Real-time ARIA analysis (if enabled)
    intervention_data = None
    if session.aria_active and session.aria_sensitivity_level != "off":
        try:
            flag = await aria_call_monitor.analyze_transcript_chunk_realtime(
                db=db,
                chunk=chunk,
                sensitivity_level=session.aria_sensitivity_level
            )

            # If violation detected, handle intervention
            if flag and flag.intervention_needed:
                intervention_data = await aria_call_monitor.handle_severe_violation(
                    db=db,
                    session=session,
                    flag=flag,
                    chunk=chunk
                )

                # Broadcast intervention via WebSocket to both parents
                for parent_id in [session.parent_a_id, session.parent_b_id]:
                    if parent_id:
                        await manager.send_personal_message(
                            message=intervention_data,
                            user_id=parent_id
                        )

                logger.warning(
                    f"ARIA intervention in session {session_id}: "
                    f"type={flag.intervention_type.value if flag.intervention_type else 'none'}, "
                    f"speaker={flag.speaker_id}"
                )

        except Exception as e:
            logger.error(f"ARIA analysis failed: {e}")
            # Continue even if ARIA fails

    return {
        "message": "Audio chunk processed successfully",
        "transcription": {
            "text": transcription.get("content", ""),
            "confidence": transcription.get("confidence", 0.0),
            "chunk_index": chunk_index,
        },
        "intervention": intervention_data
    }


@router.get("/family-file/{family_file_id}/history", response_model=List[CallSessionResponse])
async def get_call_history(
    family_file_id: str,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get call history for a family file.

    Args:
        family_file_id: Family file ID
        limit: Max sessions to return
        offset: Pagination offset

    Returns:
        List of call sessions

    Raises:
        404: Family file not found
        403: User not authorized
    """
    # Verify family file access
    result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == family_file_id)
    )
    family_file = result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family file not found"
        )

    # Verify user is a parent
    if current_user.id not in [family_file.parent_a_id, family_file.parent_b_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a parent in this family file to view call history"
        )

    # Get call history
    sessions = await parent_call_service.get_family_call_history(
        db=db,
        family_file_id=family_file_id,
        limit=limit,
        offset=offset
    )

    return sessions


@router.get("/{session_id}/report", response_model=CallReportResponse)
async def get_call_report(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive court-ready report for a call.

    Includes full ARIA analysis, violation timeline, and recommendations.

    Args:
        session_id: Call session ID

    Returns:
        Call report

    Raises:
        404: Session not found
        403: User not authorized
    """
    # Get session
    result = await db.execute(
        select(ParentCallSession).where(ParentCallSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )

    # Verify family file access
    ff_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == session.family_file_id)
    )
    family_file = ff_result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family file not found"
        )

    # Verify user is a parent or has legal access
    # TODO: Add legal professional access check
    if current_user.id not in [family_file.parent_a_id, family_file.parent_b_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this call report"
        )

    # Generate report
    try:
        report = await aria_call_monitor.analyze_full_call_transcript(
            db=db,
            session_id=session_id
        )
    except Exception as e:
        logger.error(f"Failed to generate call report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate call report"
        )

    return report


@router.get("/{session_id}/aria-analysis", response_model=CallARIAAnalysisResponse)
async def get_aria_analysis(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get ARIA analysis summary for a call.

    Args:
        session_id: Call session ID

    Returns:
        ARIA analysis summary

    Raises:
        404: Session not found
        403: User not authorized
    """
    # Get session
    result = await db.execute(
        select(ParentCallSession).where(ParentCallSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )

    # Verify family file access
    ff_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == session.family_file_id)
    )
    family_file = ff_result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family file not found"
        )

    # Verify user is a parent
    if current_user.id not in [family_file.parent_a_id, family_file.parent_b_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this ARIA analysis"
        )

    # Get all flags for this session
    flags_result = await db.execute(
        select(CallFlag)
        .where(CallFlag.session_id == session_id)
        .order_by(CallFlag.flagged_at)
    )
    flags = list(flags_result.scalars().all())

    # Calculate overall score
    overall_score = sum(f.toxicity_score for f in flags) / len(flags) if flags else 0.0

    # Generate recommendations based on flags
    recommendations = []
    if session.aria_terminated_call:
        recommendations.append("CRITICAL: Call was terminated by ARIA due to severe violations.")
    if session.aria_intervention_count > 5:
        recommendations.append("High intervention count indicates significant communication issues.")
    if overall_score > 0.7:
        recommendations.append("Overall toxicity level is severe. Consider mediation or communication training.")

    return {
        "session_id": session_id,
        "aria_active": session.aria_active,
        "intervention_count": session.aria_intervention_count,
        "call_terminated": session.aria_terminated_call,
        "flags": flags,
        "overall_score": overall_score,
        "recommendations": recommendations
    }


# Background task helpers

async def _process_post_call_complete(
    session_id: str,
    room_name: str,
    family_file_id: str
):
    """
    Background task to process post-call work:
    1. Download and store recording
    2. Run full ARIA analysis
    3. Update session with recording URL

    Args:
        session_id: Call session ID
        room_name: Daily.co room name
        family_file_id: Family file ID
    """
    from app.core.database import get_db_context
    import asyncio

    async with get_db_context() as db:
        # Wait for recording to be ready (Daily.co processes recordings)
        await asyncio.sleep(30)  # Give Daily.co time to process

        # Download recording
        recording_url = None
        try:
            recordings = await daily_service.get_recordings(room_name)
            if recordings:
                # Get the most recent recording
                latest = max(recordings, key=lambda r: r.get('created_at', ''))
                recording_download_url = latest.get('download_link')

                if recording_download_url:
                    # Download recording
                    import httpx
                    async with httpx.AsyncClient() as client:
                        response = await client.get(recording_download_url, timeout=120.0)
                        if response.status_code == 200:
                            recording_content = response.content

                            # Upload to storage
                            storage_path = build_recording_path(
                                family_file_id=family_file_id,
                                session_id=session_id,
                                filename=f"recording-{session_id}.mp4"
                            )

                            recording_url = await storage_service.upload_file(
                                bucket=StorageBucket.CALL_RECORDINGS,
                                path=storage_path,
                                file_content=recording_content,
                                content_type="video/mp4",
                                upsert=True
                            )

                            logger.info(f"Uploaded recording for session {session_id}")

            # Update session with recording URL
            result = await db.execute(
                select(ParentCallSession).where(ParentCallSession.id == session_id)
            )
            session = result.scalar_one_or_none()
            if session and recording_url:
                session.recording_url = recording_url
                await db.commit()

        except Exception as e:
            logger.error(f"Failed to download/store recording for session {session_id}: {e}")

        # Run ARIA analysis
        try:
            report = await aria_call_monitor.analyze_full_call_transcript(
                db=db,
                session_id=session_id
            )
            logger.info(f"Post-call ARIA analysis completed for session {session_id}")
        except Exception as e:
            logger.error(f"Post-call ARIA analysis failed for session {session_id}: {e}")
