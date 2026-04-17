"""
WebSocket connection manager for real-time messaging.

Supports optional Redis pub/sub for cross-instance broadcasting.
Falls back to local-only if Redis is unavailable.
"""

import asyncio
from typing import Dict, Set, List, Optional
from fastapi import WebSocket
import json
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time communication.

    Connections are organized by:
    - User ID: One user can have multiple connections (multiple devices/tabs)
    - Case ID: Users connected to specific cases for case-specific updates

    When Redis is available, broadcasts are published to Redis channels so that
    all instances receive them. Local connection tracking is always maintained
    since WebSocket references are process-local.
    """

    def __init__(self):
        """Initialize connection manager."""
        # Local connection state (always needed — WebSocket refs are process-local)
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.case_subscriptions: Dict[str, Set[str]] = {}
        self.user_case_subscriptions: Dict[str, Set[str]] = {}

        # Redis pub/sub for cross-instance broadcasting
        self._redis = None
        self._pubsub = None
        self._subscriber_task: Optional[asyncio.Task] = None

    async def init_redis(self):
        """Initialize Redis connection for pub/sub. Safe to call if Redis is unavailable."""
        try:
            import redis.asyncio as aioredis
            self._redis = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
            )
            await self._redis.ping()
            self._pubsub = self._redis.pubsub()
            logger.info("WebSocket Redis pub/sub initialized")
        except Exception as e:
            logger.warning(f"Redis unavailable for WebSocket pub/sub, falling back to local-only: {e}")
            self._redis = None
            self._pubsub = None

    async def start_subscriber(self):
        """Start background task that listens for Redis pub/sub messages.

        `redis-py` doesn't open a connection when `.pubsub()` is called —
        only the first `subscribe/psubscribe` does. If we spin up the
        subscriber loop before any user has joined a case,
        `get_message()` raises "pubsub connection not set" forever in a
        tight 1 s retry loop. We bootstrap with a single `psubscribe`
        on the `ws:*` pattern so the connection is live, and each
        individual `subscribe_to_case(...)` still calls `subscribe()`
        to pin the exact channel (redis-py handles duplicates fine).
        """
        if not self._pubsub:
            return
        try:
            await self._pubsub.psubscribe("ws:*")
        except Exception as e:
            logger.warning(f"Failed to psubscribe ws:* on startup: {e}")
            # Don't spin the loop if we can't even attach the pattern —
            # the service will degrade to single-instance broadcast via
            # the in-memory path.
            return
        self._subscriber_task = asyncio.create_task(self._redis_subscriber())

    async def shutdown(self):
        """Clean up Redis connections."""
        if self._subscriber_task:
            self._subscriber_task.cancel()
            try:
                await self._subscriber_task
            except asyncio.CancelledError:
                pass
        if self._pubsub:
            await self._pubsub.close()
        if self._redis:
            await self._redis.close()

    async def _redis_subscriber(self):
        """Background loop: receive messages from Redis and deliver to local connections."""
        try:
            while True:
                try:
                    message = await self._pubsub.get_message(
                        ignore_subscribe_messages=True,
                        timeout=1.0,
                    )
                    # After the `psubscribe("ws:*")` bootstrap, matching
                    # events come through as `"pmessage"`. The older
                    # per-case `subscribe()` path still produces
                    # `"message"`. Accept both so re-subscription
                    # timing doesn't drop events.
                    if message and message["type"] in ("message", "pmessage"):
                        raw = message.get("data")
                        if isinstance(raw, bytes):
                            raw = raw.decode("utf-8", errors="replace")
                        data = json.loads(raw)
                        channel = message["channel"]
                        if isinstance(channel, bytes):
                            channel = channel.decode("utf-8", errors="replace")

                        if channel.startswith("ws:case:"):
                            exclude_user = data.pop("_exclude_user", None)
                            case_id = channel[len("ws:case:"):]
                            await self._local_broadcast_to_case(data, case_id, exclude_user)
                        elif channel.startswith("ws:user:"):
                            user_id = channel[len("ws:user:"):]
                            await self._local_send_personal(data, user_id)
                except Exception as e:
                    logger.error(f"Redis subscriber error: {e}")
                    await asyncio.sleep(1)
        except asyncio.CancelledError:
            return

    async def connect(self, websocket: WebSocket, user_id: str):
        """Connect a WebSocket for a user."""
        await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()

        self.active_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected. Total connections: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        """Disconnect a WebSocket for a user."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)

            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

                if user_id in self.user_case_subscriptions:
                    for case_id in self.user_case_subscriptions[user_id]:
                        if case_id in self.case_subscriptions:
                            self.case_subscriptions[case_id].discard(user_id)
                            if not self.case_subscriptions[case_id]:
                                del self.case_subscriptions[case_id]
                    del self.user_case_subscriptions[user_id]

        logger.info(f"User {user_id} disconnected")

    def subscribe_to_case(self, user_id: str, case_id: str):
        """Subscribe a user to case updates."""
        if case_id not in self.case_subscriptions:
            self.case_subscriptions[case_id] = set()
        self.case_subscriptions[case_id].add(user_id)

        if user_id not in self.user_case_subscriptions:
            self.user_case_subscriptions[user_id] = set()
        self.user_case_subscriptions[user_id].add(case_id)

        # Subscribe to Redis channel for this case
        if self._pubsub:
            asyncio.create_task(self._redis_subscribe_case(case_id))

        logger.info(f"User {user_id} subscribed to case {case_id}")

    async def _redis_subscribe_case(self, case_id: str):
        """Subscribe to Redis channel for a case."""
        try:
            await self._pubsub.subscribe(f"ws:case:{case_id}")
        except Exception as e:
            logger.warning(f"Failed to subscribe to Redis channel for case {case_id}: {e}")

    def unsubscribe_from_case(self, user_id: str, case_id: str):
        """Unsubscribe a user from case updates."""
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
        """Send a message to a specific user (across all instances via Redis)."""
        if self._redis:
            try:
                await self._redis.publish(f"ws:user:{user_id}", json.dumps(message))
                return
            except Exception as e:
                logger.warning(f"Redis publish failed, falling back to local: {e}")

        # Fallback: local delivery only
        await self._local_send_personal(message, user_id)

    async def _local_send_personal(self, message: dict, user_id: str):
        """Send to local connections only."""
        if user_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to user {user_id}: {e}")
                    disconnected.add(connection)
            for connection in disconnected:
                self.disconnect(connection, user_id)

    async def broadcast_to_case(self, message: dict, case_id: str, exclude_user: str = None):
        """Broadcast a message to all users subscribed to a case (across all instances)."""
        if self._redis:
            try:
                payload = {**message}
                if exclude_user:
                    payload["_exclude_user"] = exclude_user
                await self._redis.publish(f"ws:case:{case_id}", json.dumps(payload))
                return
            except Exception as e:
                logger.warning(f"Redis publish failed, falling back to local: {e}")

        # Fallback: local broadcast only
        await self._local_broadcast_to_case(message, case_id, exclude_user)

    async def _local_broadcast_to_case(self, message: dict, case_id: str, exclude_user: str = None):
        """Broadcast to local connections only."""
        if case_id not in self.case_subscriptions:
            return
        for user_id in self.case_subscriptions[case_id]:
            if exclude_user and user_id == exclude_user:
                continue
            await self._local_send_personal(message, user_id)

    async def send_typing_indicator(self, case_id: str, user_id: str, is_typing: bool):
        """Send typing indicator to other users in a case."""
        message = {
            "type": "typing",
            "case_id": case_id,
            "user_id": user_id,
            "is_typing": is_typing
        }
        await self.broadcast_to_case(message, case_id, exclude_user=user_id)

    def get_online_users(self, case_id: str) -> List[str]:
        """Get list of online users for a case (local instance only)."""
        if case_id not in self.case_subscriptions:
            return []
        return [
            user_id for user_id in self.case_subscriptions[case_id]
            if user_id in self.active_connections and self.active_connections[user_id]
        ]

    def is_user_online(self, user_id: str) -> bool:
        """Check if a user is online (local instance only)."""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


# Global connection manager instance
manager = ConnectionManager()
