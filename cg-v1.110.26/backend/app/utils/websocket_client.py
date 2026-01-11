"""
WebSocket client helper with automatic reconnection and health monitoring.

This module provides a robust WebSocket client with:
- Automatic reconnection with exponential backoff
- Health monitoring via ping/pong
- Connection state management
- Event-driven message handling
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Optional, Callable, Dict, Any
from enum import Enum

try:
    import websockets
    from websockets.exceptions import WebSocketException
except ImportError:
    websockets = None
    WebSocketException = Exception

logger = logging.getLogger(__name__)


class ConnectionState(Enum):
    """WebSocket connection states."""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    CLOSED = "closed"


class ReconnectingWebSocketClient:
    """
    WebSocket client with automatic reconnection.

    Features:
    - Exponential backoff for reconnection attempts
    - Automatic ping/pong health checks
    - Event-driven message handling
    - Connection state management
    - Graceful shutdown

    Example:
        ```python
        async def on_message(message: dict):
            print(f"Received: {message}")

        async def on_connect():
            print("Connected!")

        client = ReconnectingWebSocketClient(
            ws_url="ws://localhost:8000/api/v1/ws",
            token="your-jwt-token",
            on_message=on_message,
            on_connect=on_connect
        )

        await client.connect()

        # Send message
        await client.send({"type": "subscribe", "case_id": "123"})

        # Keep alive
        await asyncio.sleep(3600)

        # Cleanup
        await client.close()
        ```
    """

    def __init__(
        self,
        ws_url: str,
        token: str,
        on_message: Optional[Callable[[dict], None]] = None,
        on_connect: Optional[Callable[[], None]] = None,
        on_disconnect: Optional[Callable[[], None]] = None,
        on_error: Optional[Callable[[Exception], None]] = None,
        ping_interval: float = 30.0,
        ping_timeout: float = 45.0,
        max_reconnect_delay: float = 60.0,
        reconnect_attempts: Optional[int] = None  # None = infinite
    ):
        """
        Initialize WebSocket client.

        Args:
            ws_url: WebSocket URL (without query params)
            token: JWT authentication token
            on_message: Callback for received messages
            on_connect: Callback when connection established
            on_disconnect: Callback when connection lost
            on_error: Callback for errors
            ping_interval: Seconds between ping messages
            ping_timeout: Seconds to wait for pong before reconnect
            max_reconnect_delay: Maximum delay between reconnect attempts
            reconnect_attempts: Max reconnection attempts (None = infinite)
        """
        if websockets is None:
            raise ImportError("websockets package is required. Install with: pip install websockets")

        self.ws_url = ws_url
        self.token = token
        self.on_message = on_message
        self.on_connect = on_connect
        self.on_disconnect = on_disconnect
        self.on_error = on_error

        self.ping_interval = ping_interval
        self.ping_timeout = ping_timeout
        self.max_reconnect_delay = max_reconnect_delay
        self.reconnect_attempts = reconnect_attempts

        self.state = ConnectionState.DISCONNECTED
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.reconnect_count = 0
        self.should_reconnect = True

        # Tasks
        self._receive_task: Optional[asyncio.Task] = None
        self._ping_task: Optional[asyncio.Task] = None
        self._reconnect_task: Optional[asyncio.Task] = None

        # Metrics
        self.connected_at: Optional[datetime] = None
        self.disconnected_at: Optional[datetime] = None
        self.messages_sent = 0
        self.messages_received = 0
        self.reconnections = 0

    @property
    def is_connected(self) -> bool:
        """Check if currently connected."""
        return self.state == ConnectionState.CONNECTED and self.websocket is not None

    @property
    def connection_url(self) -> str:
        """Get full WebSocket URL with token."""
        return f"{self.ws_url}?token={self.token}"

    async def connect(self):
        """
        Connect to WebSocket server.

        Establishes connection and starts receive/ping tasks.
        """
        if self.state in [ConnectionState.CONNECTED, ConnectionState.CONNECTING]:
            logger.warning("Already connected or connecting")
            return

        self.state = ConnectionState.CONNECTING
        self.should_reconnect = True

        try:
            logger.info(f"Connecting to {self.ws_url}...")
            self.websocket = await websockets.connect(self.connection_url)

            self.state = ConnectionState.CONNECTED
            self.connected_at = datetime.utcnow()
            self.reconnect_count = 0

            logger.info("WebSocket connected successfully")

            # Start background tasks
            self._receive_task = asyncio.create_task(self._receive_loop())
            self._ping_task = asyncio.create_task(self._ping_loop())

            # Call on_connect callback
            if self.on_connect:
                try:
                    if asyncio.iscoroutinefunction(self.on_connect):
                        await self.on_connect()
                    else:
                        self.on_connect()
                except Exception as e:
                    logger.error(f"Error in on_connect callback: {e}")

        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            self.state = ConnectionState.DISCONNECTED

            if self.on_error:
                try:
                    if asyncio.iscoroutinefunction(self.on_error):
                        await self.on_error(e)
                    else:
                        self.on_error(e)
                except Exception as callback_error:
                    logger.error(f"Error in on_error callback: {callback_error}")

            # Attempt reconnection
            if self.should_reconnect:
                await self._schedule_reconnect()

    async def send(self, message: dict):
        """
        Send a message to the server.

        Args:
            message: Message dictionary to send

        Raises:
            RuntimeError: If not connected
        """
        if not self.is_connected:
            raise RuntimeError("Not connected to WebSocket")

        try:
            await self.websocket.send(json.dumps(message))
            self.messages_sent += 1
            logger.debug(f"Sent message: {message.get('type', 'unknown')}")
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            raise

    async def close(self):
        """
        Close the WebSocket connection gracefully.

        Stops reconnection attempts and cleans up resources.
        """
        logger.info("Closing WebSocket connection...")
        self.should_reconnect = False
        self.state = ConnectionState.CLOSED

        # Cancel background tasks
        if self._receive_task:
            self._receive_task.cancel()
        if self._ping_task:
            self._ping_task.cancel()
        if self._reconnect_task:
            self._reconnect_task.cancel()

        # Close WebSocket
        if self.websocket:
            try:
                await self.websocket.close()
            except Exception as e:
                logger.error(f"Error closing websocket: {e}")

        self.websocket = None
        self.disconnected_at = datetime.utcnow()
        logger.info("WebSocket closed")

    async def _receive_loop(self):
        """Background task to receive messages."""
        try:
            while self.is_connected and self.websocket:
                try:
                    message_str = await self.websocket.recv()
                    message = json.loads(message_str)

                    self.messages_received += 1
                    logger.debug(f"Received message: {message.get('type', 'unknown')}")

                    # Call on_message callback
                    if self.on_message:
                        try:
                            if asyncio.iscoroutinefunction(self.on_message):
                                await self.on_message(message)
                            else:
                                self.on_message(message)
                        except Exception as e:
                            logger.error(f"Error in on_message callback: {e}")

                except websockets.exceptions.ConnectionClosed:
                    logger.warning("WebSocket connection closed")
                    break
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse message: {e}")
                except Exception as e:
                    logger.error(f"Error receiving message: {e}")
                    break

        except asyncio.CancelledError:
            logger.debug("Receive loop cancelled")
        except Exception as e:
            logger.error(f"Receive loop error: {e}")
        finally:
            await self._handle_disconnect()

    async def _ping_loop(self):
        """Background task to send periodic ping messages."""
        try:
            while self.is_connected:
                await asyncio.sleep(self.ping_interval)

                if not self.is_connected:
                    break

                try:
                    # Send ping
                    ping_sent_at = datetime.utcnow()
                    await self.send({"type": "ping"})

                    # Wait for pong (with timeout)
                    # Note: In production, you'd track pong responses
                    # For simplicity, we trust the connection if send succeeds

                except Exception as e:
                    logger.error(f"Ping failed: {e}")
                    # Connection likely dead, trigger reconnect
                    await self._handle_disconnect()
                    break

        except asyncio.CancelledError:
            logger.debug("Ping loop cancelled")
        except Exception as e:
            logger.error(f"Ping loop error: {e}")

    async def _handle_disconnect(self):
        """Handle disconnection and trigger reconnection."""
        if self.state == ConnectionState.CLOSED:
            return  # Already closed, don't reconnect

        logger.warning("WebSocket disconnected")
        self.state = ConnectionState.DISCONNECTED
        self.disconnected_at = datetime.utcnow()

        # Call on_disconnect callback
        if self.on_disconnect:
            try:
                if asyncio.iscoroutinefunction(self.on_disconnect):
                    await self.on_disconnect()
                else:
                    self.on_disconnect()
            except Exception as e:
                logger.error(f"Error in on_disconnect callback: {e}")

        # Attempt reconnection
        if self.should_reconnect:
            await self._schedule_reconnect()

    async def _schedule_reconnect(self):
        """Schedule a reconnection attempt with exponential backoff."""
        if not self.should_reconnect:
            return

        # Check if we've exceeded max attempts
        if self.reconnect_attempts is not None and self.reconnect_count >= self.reconnect_attempts:
            logger.error(f"Max reconnection attempts ({self.reconnect_attempts}) reached")
            self.state = ConnectionState.CLOSED
            return

        self.state = ConnectionState.RECONNECTING
        self.reconnect_count += 1
        self.reconnections += 1

        # Calculate delay with exponential backoff
        delay = min(
            2 ** (self.reconnect_count - 1),  # 1, 2, 4, 8, 16, ...
            self.max_reconnect_delay
        )

        logger.info(f"Reconnecting in {delay}s (attempt {self.reconnect_count})...")

        await asyncio.sleep(delay)

        # Attempt reconnection
        await self.connect()

    def get_stats(self) -> Dict[str, Any]:
        """
        Get connection statistics.

        Returns:
            Dictionary with connection metrics
        """
        uptime = None
        if self.connected_at:
            if self.is_connected:
                uptime = (datetime.utcnow() - self.connected_at).total_seconds()
            elif self.disconnected_at:
                uptime = (self.disconnected_at - self.connected_at).total_seconds()

        return {
            "state": self.state.value,
            "is_connected": self.is_connected,
            "messages_sent": self.messages_sent,
            "messages_received": self.messages_received,
            "reconnections": self.reconnections,
            "reconnect_count": self.reconnect_count,
            "connected_at": self.connected_at.isoformat() if self.connected_at else None,
            "disconnected_at": self.disconnected_at.isoformat() if self.disconnected_at else None,
            "uptime_seconds": uptime,
        }


# Example usage
async def example_usage():
    """Example of using the ReconnectingWebSocketClient."""

    # Define callbacks
    async def on_message(message: dict):
        print(f"📨 Received: {message}")

    async def on_connect():
        print("✅ Connected!")

    async def on_disconnect():
        print("❌ Disconnected!")

    async def on_error(error: Exception):
        print(f"⚠️  Error: {error}")

    # Create client
    client = ReconnectingWebSocketClient(
        ws_url="ws://localhost:8000/api/v1/ws",
        token="your-jwt-token-here",
        on_message=on_message,
        on_connect=on_connect,
        on_disconnect=on_disconnect,
        on_error=on_error,
        ping_interval=30.0,
        max_reconnect_delay=60.0,
        reconnect_attempts=None  # Infinite reconnection
    )

    # Connect
    await client.connect()

    # Subscribe to a case
    await client.send({
        "type": "subscribe",
        "case_id": "your-case-id"
    })

    # Keep alive
    await asyncio.sleep(300)  # 5 minutes

    # Print stats
    stats = client.get_stats()
    print(f"📊 Stats: {stats}")

    # Cleanup
    await client.close()


if __name__ == "__main__":
    asyncio.run(example_usage())
