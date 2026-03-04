"""
WebSocket connection manager for real-time messaging.
"""

from typing import Dict, Set, List
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time communication.

    Connections are organized by:
    - User ID: One user can have multiple connections (multiple devices/tabs)
    - Case ID: Users connected to specific cases for case-specific updates
    """

    def __init__(self):
        """Initialize connection manager."""
        # Store active connections by user_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}

        # Store case subscriptions: case_id -> set of user_ids
        self.case_subscriptions: Dict[str, Set[str]] = {}

        # Track which cases each user is subscribed to
        self.user_case_subscriptions: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """
        Connect a WebSocket for a user.

        Args:
            websocket: WebSocket connection
            user_id: ID of the user connecting
        """
        await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()

        self.active_connections[user_id].add(websocket)

        logger.info(f"User {user_id} connected. Total connections: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        """
        Disconnect a WebSocket for a user.

        Args:
            websocket: WebSocket connection
            user_id: ID of the user disconnecting
        """
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)

            # Remove user entry if no more connections
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

                # Clean up case subscriptions
                if user_id in self.user_case_subscriptions:
                    for case_id in self.user_case_subscriptions[user_id]:
                        if case_id in self.case_subscriptions:
                            self.case_subscriptions[case_id].discard(user_id)
                            if not self.case_subscriptions[case_id]:
                                del self.case_subscriptions[case_id]
                    del self.user_case_subscriptions[user_id]

        logger.info(f"User {user_id} disconnected")

    def subscribe_to_case(self, user_id: str, case_id: str):
        """
        Subscribe a user to case updates.

        Args:
            user_id: ID of the user
            case_id: ID of the case
        """
        if case_id not in self.case_subscriptions:
            self.case_subscriptions[case_id] = set()

        self.case_subscriptions[case_id].add(user_id)

        if user_id not in self.user_case_subscriptions:
            self.user_case_subscriptions[user_id] = set()

        self.user_case_subscriptions[user_id].add(case_id)

        logger.info(f"User {user_id} subscribed to case {case_id}")

    def unsubscribe_from_case(self, user_id: str, case_id: str):
        """
        Unsubscribe a user from case updates.

        Args:
            user_id: ID of the user
            case_id: ID of the case
        """
        if case_id in self.case_subscriptions:
            self.case_subscriptions[case_id].discard(user_id)
            if not self.case_subscriptions[case_id]:
                del self.case_subscriptions[case_id]

        if user_id in self.user_case_subscriptions:
            self.user_case_subscriptions[user_id].discard(case_id)
            if not self.user_case_subscriptions[user_id]:
                del self.user_case_subscriptions[user_id]

        logger.info(f"User {user_id} unsubscribed from case {case_id}")

    async def send_personal_message(self, message: dict, user_id: str):
        """
        Send a message to a specific user (all their connections).

        Args:
            message: Message data to send
            user_id: ID of the user to send to
        """
        if user_id in self.active_connections:
            disconnected = set()

            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to user {user_id}: {e}")
                    disconnected.add(connection)

            # Clean up disconnected websockets
            for connection in disconnected:
                self.disconnect(connection, user_id)

    async def broadcast_to_case(self, message: dict, case_id: str, exclude_user: str = None):
        """
        Broadcast a message to all users subscribed to a case.

        Args:
            message: Message data to send
            case_id: ID of the case
            exclude_user: Optional user ID to exclude from broadcast
        """
        if case_id not in self.case_subscriptions:
            return

        for user_id in self.case_subscriptions[case_id]:
            if exclude_user and user_id == exclude_user:
                continue

            await self.send_personal_message(message, user_id)

    async def send_typing_indicator(self, case_id: str, user_id: str, is_typing: bool):
        """
        Send typing indicator to other users in a case.

        Args:
            case_id: ID of the case
            user_id: ID of the user typing
            is_typing: Whether user is typing or stopped
        """
        message = {
            "type": "typing",
            "case_id": case_id,
            "user_id": user_id,
            "is_typing": is_typing
        }

        await self.broadcast_to_case(message, case_id, exclude_user=user_id)

    def get_online_users(self, case_id: str) -> List[str]:
        """
        Get list of online users for a case.

        Args:
            case_id: ID of the case

        Returns:
            List of user IDs currently online
        """
        if case_id not in self.case_subscriptions:
            return []

        online_users = []
        for user_id in self.case_subscriptions[case_id]:
            if user_id in self.active_connections and self.active_connections[user_id]:
                online_users.append(user_id)

        return online_users

    def is_user_online(self, user_id: str) -> bool:
        """
        Check if a user is online.

        Args:
            user_id: ID of the user

        Returns:
            True if user has active connections
        """
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


# Global connection manager instance
manager = ConnectionManager()
