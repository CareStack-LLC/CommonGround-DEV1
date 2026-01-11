"""
WebSocket endpoints for real-time messaging.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from typing import Optional
import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.websocket import manager
from app.core.security import decode_token
from app.models.user import User
from app.models.case import CaseParticipant
from sqlalchemy import select
from sqlalchemy.orm import selectinload

router = APIRouter()
logger = logging.getLogger(__name__)


async def get_user_from_token(token: str, db: AsyncSession) -> Optional[User]:
    """
    Authenticate user from WebSocket token.

    Args:
        token: JWT token
        db: Database session

    Returns:
        User if authenticated, None otherwise
    """
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")

        if not user_id:
            return None

        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        return user
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return None


async def verify_case_access(user_id: str, case_id: str, db: AsyncSession) -> bool:
    """
    Verify user has access to a case.

    Args:
        user_id: User ID
        case_id: Case ID
        db: Database session

    Returns:
        True if user has access, False otherwise
    """
    result = await db.execute(
        select(CaseParticipant)
        .where(CaseParticipant.user_id == user_id)
        .where(CaseParticipant.case_id == case_id)
        .where(CaseParticipant.is_active == True)
    )
    participant = result.scalar_one_or_none()

    return participant is not None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    WebSocket endpoint for real-time messaging with auto-reconnect support.

    Query Parameters:
        token: JWT authentication token

    Message Format (Client → Server):
        {
            "type": "subscribe" | "unsubscribe" | "typing" | "ping",
            "case_id": "uuid",
            "is_typing": bool,  # For typing events
            "content": str      # For message events
        }

    Message Format (Server → Client):
        {
            "type": "message" | "typing" | "status" | "error" | "pong",
            "case_id": "uuid",
            "user_id": "uuid",
            "sender_name": str,
            "content": str,
            "is_typing": bool,
            "timestamp": str,
            "server_time": str  # For pong responses
        }

    Health Check:
        - Client sends {"type": "ping"} every 30 seconds
        - Server responds with {"type": "pong", "server_time": "..."}
        - If no pong within 45 seconds, client should reconnect
    """
    # Authenticate user
    user = await get_user_from_token(token, db)

    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        logger.warning("WebSocket connection rejected: Invalid token")
        return

    # Accept connection
    await manager.connect(websocket, user.id)

    # Send connection confirmation
    try:
        await websocket.send_json({
            "type": "status",
            "message": "Connected successfully",
            "user_id": user.id
        })
    except Exception as e:
        logger.error(f"Error sending connection confirmation: {e}")

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()

            message_type = data.get("type")
            case_id = data.get("case_id")

            # Validate case access for case-specific operations
            if case_id and message_type in ["subscribe", "typing", "message"]:
                has_access = await verify_case_access(user.id, case_id, db)

                if not has_access:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Access denied to this case"
                    })
                    continue

            # Handle different message types
            if message_type == "subscribe" and case_id:
                # Subscribe to case updates
                manager.subscribe_to_case(user.id, case_id)

                # Get online users in this case
                online_users = manager.get_online_users(case_id)

                await websocket.send_json({
                    "type": "status",
                    "message": f"Subscribed to case {case_id}",
                    "online_users": online_users
                })

                # Notify other users that this user is now online
                await manager.broadcast_to_case(
                    {
                        "type": "user_status",
                        "user_id": user.id,
                        "user_name": f"{user.first_name} {user.last_name}",
                        "status": "online"
                    },
                    case_id,
                    exclude_user=user.id
                )

            elif message_type == "unsubscribe" and case_id:
                # Unsubscribe from case updates
                manager.unsubscribe_from_case(user.id, case_id)

                await websocket.send_json({
                    "type": "status",
                    "message": f"Unsubscribed from case {case_id}"
                })

                # Notify other users that this user is now offline for this case
                await manager.broadcast_to_case(
                    {
                        "type": "user_status",
                        "user_id": user.id,
                        "user_name": f"{user.first_name} {user.last_name}",
                        "status": "offline"
                    },
                    case_id,
                    exclude_user=user.id
                )

            elif message_type == "typing" and case_id:
                # Typing indicator
                is_typing = data.get("is_typing", False)

                await manager.send_typing_indicator(
                    case_id,
                    user.id,
                    is_typing
                )

            elif message_type == "ping":
                # Keepalive ping - respond with server time
                from datetime import datetime
                await websocket.send_json({
                    "type": "pong",
                    "server_time": datetime.utcnow().isoformat()
                })

            else:
                # Unknown message type
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                })

    except WebSocketDisconnect:
        # Client disconnected
        manager.disconnect(websocket, user.id)
        logger.info(f"WebSocket disconnected: {user.id}")

    except Exception as e:
        # Unexpected error
        logger.error(f"WebSocket error for user {user.id}: {e}")
        manager.disconnect(websocket, user.id)
        try:
            await websocket.close()
        except:
            pass
