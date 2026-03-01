"""
Circle Call endpoints - Video/audio calling between circle contacts and children.

Provides:
- Bidirectional call initiation (contact OR child can call)
- Permission-based access control (time windows, feature toggles)
- Real-time ARIA child safety monitoring
- Transcript processing and analysis
- Court-ready call reports for parents

Key differences from parent calls:
- Bidirectional initiation (contact or child)
- Child safety focus (not conflict mediation)
- Stricter ARIA threshold (0.3 vs 0.5)
- Permission validation via CirclePermission model
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.family_file import FamilyFile
from app.models.circle import CircleContact
from app.models.child import Child
from app.models.kidcoms import ChildUser, CircleUser
from app.models.circle_call import (
    CircleCallSession,
    CircleCallRoom,
    CircleCallTranscriptChunk,
    CircleCallFlag,
    CircleCallStatus,
)
from app.schemas.circle_calls import (
    CircleCallCreate,
    CircleCallJoin,
    CircleCallJoinResponse,
    CircleCallSessionResponse,
    CircleCallTranscriptChunkCreate,
    CircleCallReportResponse,
    CircleCallSafetySummaryResponse,
    CircleCallFlagResponse,
    CircleCallHistoryResponse,
)
from app.services.circle_call import circle_call_service
from app.services.aria_circle_monitor import aria_circle_monitor
from app.services.daily_video import daily_service
from app.services.storage import storage_service, StorageBucket
from app.core.config import settings
from app.core.websocket import manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/initiate", response_model=CircleCallJoinResponse)
async def initiate_circle_call(
    call_create: CircleCallCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Initiate a new circle call (bidirectional).

    Can be called by circle contact OR child. Creates a call session using
    the permanent Daily.co room for this contact-child pair.

    Args:
        call_create: Call details (circle_contact_id, child_id, call_type)

    Returns:
        Room URL and token for the initiating user

    Raises:
        404: Contact or child not found
        403: User not authorized to make this call
        400: Permission check failed (time restrictions, feature disabled, etc.)
    """
    # Get circle contact
    contact_result = await db.execute(
        select(CircleContact).where(CircleContact.id == call_create.circle_contact_id)
    )
    contact = contact_result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Get child
    child_result = await db.execute(
        select(Child).where(Child.id == call_create.child_id)
    )
    child = child_result.scalar_one_or_none()

    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found"
        )

    # Determine who is initiating (circle contact or child)
    # Check if current_user is the circle contact (via CircleUser)
    circle_user_result = await db.execute(
        select(CircleUser).where(CircleUser.user_id == current_user.id)
    )
    circle_user = circle_user_result.scalar_one_or_none()

    # Check if current_user is the child (via ChildUser)
    child_user_result = await db.execute(
        select(ChildUser).where(ChildUser.user_id == current_user.id)
    )
    child_user = child_user_result.scalar_one_or_none()

    # Determine initiator type
    if circle_user and str(circle_user.circle_contact_id) == call_create.circle_contact_id:
        initiated_by_type = "circle_contact"
        initiated_by_id = call_create.circle_contact_id
        initiator_name = contact.contact_name
    elif child_user and str(child_user.child_id) == call_create.child_id:
        initiated_by_type = "child"
        initiated_by_id = call_create.child_id
        initiator_name = child.display_name
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to initiate this call"
        )

    # Validate call type
    if call_create.call_type not in ["video", "audio"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Call type must be 'video' or 'audio'"
        )

    # Create call session (permission validation happens inside)
    try:
        session = await circle_call_service.create_call_session(
            db=db,
            family_file_id=child.family_file_id,
            circle_contact_id=call_create.circle_contact_id,
            child_id=call_create.child_id,
            call_type=call_create.call_type,
            initiated_by_type=initiated_by_type,
            initiated_by_id=initiated_by_id
        )
    except ValueError as e:
        # ValueError indicates permission or configuration issue
        logger.error(f"Failed to create circle call session: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create circle call session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create call session"
        )

    # Join the call (get token for initiator)
    try:
        join_data = await circle_call_service.join_call(
            db=db,
            session_id=session.id,
            user_id=current_user.id,
            user_name=initiator_name,
            user_type=initiated_by_type
        )
    except ValueError as e:
        logger.error(f"Failed to join circle call: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to join circle call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to join call session"
        )

    # Broadcast call notification via WebSocket to recipient + parents
    # Get family file for parent IDs
    ff_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == child.family_file_id)
    )
    family_file = ff_result.scalar_one_or_none()

    # Determine recipient
    if initiated_by_type == "circle_contact":
        # Contact calling child - notify child + parents
        recipient_id = call_create.child_id
        recipient_name = child.display_name
        recipient_type = "child"
        caller_name = contact.contact_name
        caller_type = "circle_contact"
    else:
        # Child calling contact - notify contact + parents
        recipient_id = call_create.circle_contact_id
        recipient_name = contact.contact_name
        recipient_type = "circle_contact"
        caller_name = child.display_name
        caller_type = "child"

    notification_payload = {
        "type": "circle_call_incoming",
        "session_id": str(session.id),
        "caller_id": initiated_by_id,
        "caller_name": caller_name,
        "caller_type": caller_type,
        "recipient_id": recipient_id,
        "recipient_name": recipient_name,
        "recipient_type": recipient_type,
        "call_type": call_create.call_type,
        "family_file_id": str(child.family_file_id),
    }

    # Send to recipient (if they have a user account)
    if recipient_type == "child" and child_user:
        await manager.send_personal_message(
            message=notification_payload,
            user_id=str(child_user.user_id)
        )
    elif recipient_type == "circle_contact" and circle_user:
        await manager.send_personal_message(
            message=notification_payload,
            user_id=str(circle_user.user_id)
        )

    # Send to parents (always notify parents)
    if family_file:
        for parent_id in [family_file.parent_a_id, family_file.parent_b_id]:
            if parent_id:
                await manager.send_personal_message(
                    message=notification_payload,
                    user_id=str(parent_id)
                )

    logger.info(f"Circle call session {session.id} initiated by {initiated_by_type} {initiated_by_id}")

    return join_data


@router.post("/{session_id}/join", response_model=CircleCallJoinResponse)
async def join_circle_call(
    session_id: str,
    join_data: CircleCallJoin,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Join an existing circle call session.

    Recipient joins the ringing call. Generates a meeting token and updates
    session status to ACTIVE.

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
        select(CircleCallSession).where(CircleCallSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle call session not found"
        )

    # Verify user is authorized to join (circle contact or child)
    circle_user_result = await db.execute(
        select(CircleUser).where(CircleUser.user_id == current_user.id)
    )
    circle_user = circle_user_result.scalar_one_or_none()

    child_user_result = await db.execute(
        select(ChildUser).where(ChildUser.user_id == current_user.id)
    )
    child_user = child_user_result.scalar_one_or_none()

    # Determine user type
    user_type = None
    if circle_user and str(circle_user.circle_contact_id) == str(session.circle_contact_id):
        user_type = "circle_contact"
    elif child_user and str(child_user.child_id) == str(session.child_id):
        user_type = "child"
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this call"
        )

    # Join the call
    try:
        join_response = await circle_call_service.join_call(
            db=db,
            session_id=session_id,
            user_id=current_user.id,
            user_name=join_data.user_name,
            user_type=user_type
        )
    except ValueError as e:
        logger.error(f"Failed to join circle call: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to join circle call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to join call session"
        )

    # Refresh session to get updated status
    await db.refresh(session)

    # If call just started (second participant joined), start recording and transcription
    if session.status == CircleCallStatus.ACTIVE.value:
        try:
            # Build webhook URL for transcript chunks
            api_url = getattr(settings, 'API_URL', 'http://localhost:8000')
            webhook_url = f"{api_url}/api/v1/circle-calls/{session_id}/transcript-chunk"

            # Start recording
            await daily_service.start_recording(
                room_name=session.daily_room_name,
                webhook_url=None  # Recording webhook handled separately
            )
            logger.info(f"Started recording for circle call session {session_id}")

            # Start transcription
            await daily_service.start_transcription(
                room_name=session.daily_room_name,
                webhook_url=webhook_url
            )
            logger.info(f"Started transcription for circle call session {session_id} (webhook: {webhook_url})")

        except Exception as e:
            logger.error(f"Failed to start recording/transcription for session {session_id}: {e}")
            # Don't fail the join if recording/transcription fails

        # Notify parents that call has started
        ff_result = await db.execute(
            select(FamilyFile).where(FamilyFile.id == session.family_file_id)
        )
        family_file = ff_result.scalar_one_or_none()

        # Get contact and child for notification
        contact_result = await db.execute(
            select(CircleContact).where(CircleContact.id == session.circle_contact_id)
        )
        contact = contact_result.scalar_one_or_none()

        child_result = await db.execute(
            select(Child).where(Child.id == session.child_id)
        )
        child = child_result.scalar_one_or_none()

        if family_file and contact and child:
            start_notification = {
                "type": "circle_call_started",
                "session_id": str(session.id),
                "child_name": child.display_name,
                "contact_name": contact.contact_name,
                "call_type": session.call_type,
                "timestamp": session.started_at.isoformat() if session.started_at else None,
            }

            for parent_id in [family_file.parent_a_id, family_file.parent_b_id]:
                if parent_id:
                    await manager.send_personal_message(
                        message=start_notification,
                        user_id=str(parent_id)
                    )

    logger.info(f"User {current_user.id} joined circle call session {session_id}")

    return join_response


@router.post("/{session_id}/decline")
async def decline_circle_call(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Decline an incoming circle call.

    Notifies the caller via WebSocket that the call was declined and
    updates the session status to MISSED.

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
        select(CircleCallSession).where(CircleCallSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle call session not found"
        )

    # Verify user is the recipient (not the initiator)
    circle_user_result = await db.execute(
        select(CircleUser).where(CircleUser.user_id == current_user.id)
    )
    circle_user = circle_user_result.scalar_one_or_none()

    child_user_result = await db.execute(
        select(ChildUser).where(ChildUser.user_id == current_user.id)
    )
    child_user = child_user_result.scalar_one_or_none()

    # Determine if user is the recipient
    is_recipient = False
    if circle_user and str(circle_user.circle_contact_id) == str(session.circle_contact_id):
        if session.initiated_by_type != "circle_contact":
            is_recipient = True
    elif child_user and str(child_user.child_id) == str(session.child_id):
        if session.initiated_by_type != "child":
            is_recipient = True

    if not is_recipient:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to decline this call"
        )

    # Update session status
    from datetime import datetime, timezone
    session.status = CircleCallStatus.MISSED.value
    session.ended_at = datetime.now(timezone.utc)
    await db.commit()

    # Notify the caller via WebSocket
    # Get initiator user ID
    if session.initiated_by_type == "circle_contact":
        initiator_user_result = await db.execute(
            select(CircleUser).where(CircleUser.circle_contact_id == session.initiated_by_id)
        )
        initiator_user = initiator_user_result.scalar_one_or_none()
        initiator_user_id = str(initiator_user.user_id) if initiator_user else None
    else:
        initiator_user_result = await db.execute(
            select(ChildUser).where(ChildUser.child_id == session.initiated_by_id)
        )
        initiator_user = initiator_user_result.scalar_one_or_none()
        initiator_user_id = str(initiator_user.user_id) if initiator_user else None

    if initiator_user_id:
        user_name = current_user.profile.display_name if current_user.profile else current_user.email

        decline_notification = {
            "type": "circle_call_declined",
            "session_id": session_id,
            "declined_by_id": str(current_user.id),
            "declined_by_name": user_name,
        }

        await manager.send_personal_message(
            message=decline_notification,
            user_id=initiator_user_id
        )

    logger.info(f"Circle call session {session_id} declined by {current_user.id}")

    return {
        "message": "Call declined successfully",
        "session_id": session_id
    }


@router.post("/{session_id}/end")
async def end_circle_call(
    session_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    End an active circle call session.

    Marks the call as ended and triggers post-call safety analysis in the background.

    Args:
        session_id: Call session ID

    Returns:
        Success message with duration

    Raises:
        404: Session not found
        403: User not authorized
    """
    # Get session
    result = await db.execute(
        select(CircleCallSession).where(CircleCallSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle call session not found"
        )

    # Verify user is a participant
    circle_user_result = await db.execute(
        select(CircleUser).where(CircleUser.user_id == current_user.id)
    )
    circle_user = circle_user_result.scalar_one_or_none()

    child_user_result = await db.execute(
        select(ChildUser).where(ChildUser.user_id == current_user.id)
    )
    child_user = child_user_result.scalar_one_or_none()

    is_participant = False
    if circle_user and str(circle_user.circle_contact_id) == str(session.circle_contact_id):
        is_participant = True
    elif child_user and str(child_user.child_id) == str(session.child_id):
        is_participant = True

    if not is_participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this call"
        )

    # Stop recording and transcription
    try:
        await daily_service.stop_recording(session.daily_room_name)
        await daily_service.stop_transcription(session.daily_room_name)
        logger.info(f"Stopped recording and transcription for circle call session {session_id}")
    except Exception as e:
        logger.error(f"Failed to stop recording/transcription: {e}")

    # End the call
    try:
        updated_session = await circle_call_service.end_call(
            db=db,
            session_id=session_id,
            terminated_by_aria=False,
            termination_reason=None
        )
    except Exception as e:
        logger.error(f"Failed to end circle call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to end call session"
        )

    # Notify parents that call has ended
    ff_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == session.family_file_id)
    )
    family_file = ff_result.scalar_one_or_none()

    # Get contact and child for notification
    contact_result = await db.execute(
        select(CircleContact).where(CircleContact.id == session.circle_contact_id)
    )
    contact = contact_result.scalar_one_or_none()

    child_result = await db.execute(
        select(Child).where(Child.id == session.child_id)
    )
    child = child_result.scalar_one_or_none()

    if family_file and contact and child:
        # Calculate duration display
        duration_seconds = updated_session.duration_seconds or 0
        duration_minutes = duration_seconds // 60
        duration_secs = duration_seconds % 60
        duration_display = f"{duration_minutes} min {duration_secs} sec"

        end_notification = {
            "type": "circle_call_ended",
            "session_id": str(session.id),
            "child_name": child.display_name,
            "contact_name": contact.contact_name,
            "duration_seconds": duration_seconds,
            "duration_display": duration_display,
            "aria_flags_count": updated_session.aria_intervention_count,
            "recording_available": bool(updated_session.recording_url),
            "timestamp": updated_session.ended_at.isoformat() if updated_session.ended_at else None,
        }

        for parent_id in [family_file.parent_a_id, family_file.parent_b_id]:
            if parent_id:
                await manager.send_personal_message(
                    message=end_notification,
                    user_id=str(parent_id)
                )

    # Schedule post-call processing in background
    background_tasks.add_task(
        _process_circle_call_complete,
        session_id=session_id,
        room_name=session.daily_room_name,
        family_file_id=str(session.family_file_id)
    )

    logger.info(f"Circle call session {session_id} ended by {current_user.id}")

    return {
        "message": "Call ended successfully",
        "session_id": session_id,
        "duration_seconds": updated_session.duration_seconds
    }


@router.post("/{session_id}/transcript-chunk")
async def process_circle_call_transcript_chunk(
    session_id: str,
    chunk_data: CircleCallTranscriptChunkCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Process transcript chunk from Daily.co webhook.

    Stores chunk and runs real-time ARIA child safety analysis.
    Broadcasts urgent safety alerts via WebSocket to parents if intervention needed.

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
        select(CircleCallSession).where(CircleCallSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle call session not found"
        )

    # Create transcript chunk
    from datetime import datetime, timezone
    chunk = CircleCallTranscriptChunk(
        session_id=session_id,
        speaker_id=chunk_data.speaker_id,
        speaker_name=chunk_data.speaker_name,
        speaker_type=chunk_data.speaker_type,
        content=chunk_data.content,
        confidence=chunk_data.confidence,
        start_time=chunk_data.start_time,
        end_time=chunk_data.end_time,
        timestamp=datetime.now(timezone.utc),
    )

    db.add(chunk)
    await db.commit()
    await db.refresh(chunk)

    # Real-time ARIA child safety analysis
    if session.aria_active:
        try:
            flag = await aria_circle_monitor.analyze_transcript_chunk(
                db=db,
                chunk=chunk
            )

            # If safety concern detected, broadcast alert to parents
            if flag:
                # Get family file for parent IDs
                ff_result = await db.execute(
                    select(FamilyFile).where(FamilyFile.id == session.family_file_id)
                )
                family_file = ff_result.scalar_one_or_none()

                if family_file:
                    safety_alert = {
                        "type": "circle_call_aria_alert",
                        "session_id": session_id,
                        "severity": flag.severity,
                        "category": flag.categories[0] if flag.categories else "unknown",
                        "message": flag.intervention_message,
                        "call_terminated": flag.intervention_type == "terminate",
                    }

                    for parent_id in [family_file.parent_a_id, family_file.parent_b_id]:
                        if parent_id:
                            await manager.send_personal_message(
                                message=safety_alert,
                                user_id=str(parent_id)
                            )

                logger.warning(
                    f"ARIA safety flag in circle call {session_id}: "
                    f"severity={flag.severity}, categories={flag.categories}"
                )

                return {
                    "message": "Transcript chunk processed with safety flag",
                    "chunk_id": str(chunk.id),
                    "flag_id": str(flag.id),
                    "severity": flag.severity
                }

        except Exception as e:
            logger.error(f"ARIA child safety analysis failed: {e}")
            # Continue even if ARIA fails

    return {
        "message": "Transcript chunk processed successfully",
        "chunk_id": str(chunk.id)
    }


@router.post("/{session_id}/upload-recording")
async def upload_circle_call_recording(
    session_id: str,
    recording: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a client-side recorded circle call.

    Stores the recording in Supabase storage and updates the session with the URL.

    Args:
        session_id: Call session ID
        recording: Audio/video recording file

    Returns:
        Recording URL

    Raises:
        404: Session not found
        403: User not authorized
    """
    # Get session
    result = await db.execute(
        select(CircleCallSession).where(CircleCallSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle call session not found"
        )

    # Verify user is a participant
    circle_user_result = await db.execute(
        select(CircleUser).where(CircleUser.user_id == current_user.id)
    )
    circle_user = circle_user_result.scalar_one_or_none()

    child_user_result = await db.execute(
        select(ChildUser).where(ChildUser.user_id == current_user.id)
    )
    child_user = child_user_result.scalar_one_or_none()

    is_participant = False
    if circle_user and str(circle_user.circle_contact_id) == str(session.circle_contact_id):
        is_participant = True
    elif child_user and str(child_user.child_id) == str(session.child_id):
        is_participant = True

    # Parents can also upload recordings
    ff_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == session.family_file_id)
    )
    family_file = ff_result.scalar_one_or_none()

    if family_file:
        if current_user.id in [family_file.parent_a_id, family_file.parent_b_id]:
            is_participant = True

    if not is_participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to upload recordings for this call"
        )

    # Read recording data
    try:
        recording_data = await recording.read()
        logger.info(f"Received circle call recording: {len(recording_data)} bytes")
    except Exception as e:
        logger.error(f"Failed to read recording: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid recording data"
        )

    # Determine content type
    content_type = recording.content_type or "audio/webm"

    # Build storage path
    storage_path = f"circle-call-recordings/{session.family_file_id}/{session_id}/recording.webm"

    # Upload to Supabase storage
    try:
        recording_url = await storage_service.upload_file(
            bucket=StorageBucket.CALL_RECORDINGS,
            path=storage_path,
            file_content=recording_data,
            content_type=content_type,
            upsert=True
        )

        # Update session with recording URL
        session.recording_url = recording_url
        session.recording_storage_path = storage_path
        await db.commit()

        logger.info(f"Circle call recording uploaded for session {session_id}: {recording_url}")

        return {
            "message": "Recording uploaded successfully",
            "session_id": session_id,
            "recording_url": recording_url
        }

    except Exception as e:
        logger.error(f"Failed to upload circle call recording: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload recording"
        )


@router.get("/family/{family_file_id}/history", response_model=List[CircleCallHistoryResponse])
async def get_circle_call_history(
    family_file_id: str,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get circle call history for a family file (parents only).

    Args:
        family_file_id: Family file ID
        limit: Max sessions to return
        offset: Pagination offset

    Returns:
        List of circle call sessions

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
            detail="You must be a parent to view circle call history"
        )

    # Get call history
    sessions = await circle_call_service.get_call_history(
        db=db,
        family_file_id=family_file_id,
        limit=limit,
        offset=offset
    )

    # Build response with contact/child names
    history = []
    for session in sessions:
        # Get contact
        contact_result = await db.execute(
            select(CircleContact).where(CircleContact.id == session.circle_contact_id)
        )
        contact = contact_result.scalar_one_or_none()

        # Get child
        child_result = await db.execute(
            select(Child).where(Child.id == session.child_id)
        )
        child = child_result.scalar_one_or_none()

        if contact and child:
            history.append(CircleCallHistoryResponse(
                id=str(session.id),
                circle_contact_name=contact.contact_name,
                child_name=child.display_name,
                call_type=session.call_type,
                status=session.status,
                initiated_by_type=session.initiated_by_type,
                initiated_at=session.initiated_at,
                duration_seconds=session.duration_seconds,
                aria_intervention_count=session.aria_intervention_count,
                aria_terminated_call=session.aria_terminated_call,
                has_recording=bool(session.recording_url),
            ))

    return history


@router.get("/{session_id}/report", response_model=CircleCallReportResponse)
async def get_circle_call_report(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive court-ready report for a circle call.

    Includes full ARIA child safety analysis, flag timeline, and recommendations.

    Args:
        session_id: Call session ID

    Returns:
        Circle call safety report

    Raises:
        404: Session not found
        403: User not authorized
    """
    # Get session
    result = await db.execute(
        select(CircleCallSession).where(CircleCallSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle call session not found"
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

    # Verify user is a parent (or has legal access)
    # TODO: Add legal professional access check
    if current_user.id not in [family_file.parent_a_id, family_file.parent_b_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this call report"
        )

    # Get safety summary
    try:
        safety_summary = await aria_circle_monitor.get_session_safety_summary(
            db=db,
            session_id=session_id
        )
    except Exception as e:
        logger.error(f"Failed to generate circle call report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate call report"
        )

    # Get contact and child names
    contact_result = await db.execute(
        select(CircleContact).where(CircleContact.id == session.circle_contact_id)
    )
    contact = contact_result.scalar_one_or_none()

    child_result = await db.execute(
        select(Child).where(Child.id == session.child_id)
    )
    child = child_result.scalar_one_or_none()

    # Get transcript chunks count
    chunks_result = await db.execute(
        select(CircleCallTranscriptChunk).where(CircleCallTranscriptChunk.session_id == session_id)
    )
    chunks = list(chunks_result.scalars().all())

    # Build report
    from datetime import datetime, timezone
    report = CircleCallReportResponse(
        session_id=session_id,
        circle_contact_name=contact.contact_name if contact else "Unknown",
        child_name=child.display_name if child else "Unknown",
        call_type=session.call_type,
        duration_seconds=session.duration_seconds or 0,
        initiated_by_type=session.initiated_by_type,
        total_transcript_chunks=len(chunks),
        flags_count=safety_summary["total_flags"],
        safety_rating=safety_summary["safety_rating"],
        category_counts=safety_summary["category_counts"],
        severe_count=safety_summary["severe_count"],
        high_count=safety_summary["high_count"],
        flags=safety_summary["flags"],
        permission_snapshot=session.permission_snapshot or {},
        generated_at=datetime.now(timezone.utc),
    )

    return report


# Background task helpers

async def _process_circle_call_complete(
    session_id: str,
    room_name: str,
    family_file_id: str
):
    """
    Background task to process post-call work:
    1. Download and store recording (if available)
    2. Run full ARIA child safety analysis
    3. Update session with recording URL and safety score

    Args:
        session_id: Call session ID
        room_name: Daily.co room name
        family_file_id: Family file ID
    """
    from app.core.database import get_db_context
    import asyncio

    async with get_db_context() as db:
        # Wait for recording to be ready (Daily.co processes recordings)
        await asyncio.sleep(30)

        # Download recording (if available)
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
                            storage_path = f"circle-call-recordings/{family_file_id}/{session_id}/recording.mp4"

                            recording_url = await storage_service.upload_file(
                                bucket=StorageBucket.CALL_RECORDINGS,
                                path=storage_path,
                                file_content=recording_content,
                                content_type="video/mp4",
                                upsert=True
                            )

                            logger.info(f"Uploaded circle call recording for session {session_id}")

            # Update session with recording URL
            result = await db.execute(
                select(CircleCallSession).where(CircleCallSession.id == session_id)
            )
            session = result.scalar_one_or_none()
            if session and recording_url:
                session.recording_url = recording_url
                session.recording_storage_path = storage_path
                await db.commit()

        except Exception as e:
            logger.error(f"Failed to download/store circle call recording for session {session_id}: {e}")

        # Run ARIA child safety summary
        try:
            safety_summary = await aria_circle_monitor.get_session_safety_summary(
                db=db,
                session_id=session_id
            )
            logger.info(f"Post-call ARIA child safety analysis completed for session {session_id}: {safety_summary['safety_rating']}")

            # Update session with safety score
            result = await db.execute(
                select(CircleCallSession).where(CircleCallSession.id == session_id)
            )
            session = result.scalar_one_or_none()
            if session:
                # Calculate overall safety score (inverse of toxicity)
                # 1.0 = completely safe, 0.0 = severe concerns
                if safety_summary['total_flags'] > 0:
                    # If severe flags exist, score is low
                    if safety_summary['severe_count'] > 0:
                        session.overall_safety_score = 0.0
                    elif safety_summary['high_count'] > 0:
                        session.overall_safety_score = 0.3
                    else:
                        session.overall_safety_score = 0.7
                else:
                    session.overall_safety_score = 1.0

                await db.commit()

        except Exception as e:
            logger.error(f"Post-call ARIA child safety analysis failed for session {session_id}: {e}")
