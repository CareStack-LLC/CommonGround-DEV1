"""
Daily.co Video Integration Service.

Provides integration with Daily.co for video calling in KidComs.
Handles room creation, token generation, and room management.
"""

import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Daily.co API base URL
DAILY_API_BASE = "https://api.daily.co/v1"


class DailyVideoService:
    """Service for interacting with Daily.co API."""

    def __init__(self):
        self.api_key = getattr(settings, 'DAILY_API_KEY', None)
        self.domain = getattr(settings, 'DAILY_DOMAIN', 'cg-mvp.daily.co')

    @property
    def headers(self) -> Dict[str, str]:
        """Get API headers."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def create_room(
        self,
        room_name: str,
        privacy: str = "private",
        exp_minutes: int = 120,
        max_participants: int = 4,
        enable_chat: bool = True,
        enable_recording: bool = False,
        start_video_off: bool = False,
        start_audio_off: bool = False,
    ) -> Dict[str, Any]:
        """
        Create a new Daily.co room.

        Args:
            room_name: Unique room name
            privacy: 'public' or 'private'
            exp_minutes: Room expiry time in minutes from now
            max_participants: Maximum participants allowed
            enable_chat: Whether to enable in-call chat
            enable_recording: Whether to enable recording
            start_video_off: Start with video disabled
            start_audio_off: Start with audio disabled

        Returns:
            Room data including name and URL
        """
        if not self.api_key:
            logger.warning("Daily.co API key not configured, using mock room")
            return {
                "name": room_name,
                "url": f"https://{self.domain}/{room_name}",
                "privacy": privacy,
                "created_at": datetime.utcnow().isoformat(),
            }

        exp_time = datetime.utcnow() + timedelta(minutes=exp_minutes)

        # Minimal config - Daily.co has sensible defaults
        room_config = {
            "name": room_name,
            "privacy": privacy,
            "properties": {
                "exp": int(exp_time.timestamp()),
            }
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{DAILY_API_BASE}/rooms",
                    json=room_config,
                    headers=self.headers,
                    timeout=30.0
                )

                if response.status_code in [200, 201]:
                    data = response.json()
                    logger.info(f"Created Daily.co room: {room_name}")
                    return {
                        "name": data.get("name"),
                        "url": data.get("url"),
                        "privacy": data.get("privacy"),
                        "created_at": data.get("created_at"),
                    }
                else:
                    logger.error(f"Failed to create room (status {response.status_code}): {response.text}")
                    raise Exception(f"Failed to create Daily.co room (status {response.status_code}): {response.text}")

        except httpx.TimeoutException:
            logger.error("Daily.co API timeout")
            raise Exception("Daily.co API timeout")
        except Exception as e:
            logger.error(f"Daily.co API error: {e}")
            raise

    async def get_room(self, room_name: str) -> Optional[Dict[str, Any]]:
        """
        Get room details.

        Args:
            room_name: The room name to look up

        Returns:
            Room data or None if not found
        """
        if not self.api_key:
            return None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{DAILY_API_BASE}/rooms/{room_name}",
                    headers=self.headers,
                    timeout=30.0
                )

                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 404:
                    return None
                else:
                    logger.error(f"Failed to get room: {response.text}")
                    return None

        except Exception as e:
            logger.error(f"Error getting room: {e}")
            return None

    async def delete_room(self, room_name: str) -> bool:
        """
        Delete a Daily.co room.

        Args:
            room_name: The room name to delete

        Returns:
            True if deleted, False otherwise
        """
        if not self.api_key:
            return True

        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{DAILY_API_BASE}/rooms/{room_name}",
                    headers=self.headers,
                    timeout=30.0
                )

                if response.status_code in [200, 204, 404]:
                    logger.info(f"Deleted Daily.co room: {room_name}")
                    return True
                else:
                    logger.error(f"Failed to delete room: {response.text}")
                    return False

        except Exception as e:
            logger.error(f"Error deleting room: {e}")
            return False

    async def create_meeting_token(
        self,
        room_name: str,
        user_name: str,
        user_id: str,
        is_owner: bool = False,
        exp_minutes: int = 60,
        start_video_off: bool = False,
        start_audio_off: bool = False,
        enable_recording: bool = False,
    ) -> str:
        """
        Create a meeting token for a participant.

        Args:
            room_name: The room to create token for
            user_name: Display name for the participant
            user_id: Unique user ID
            is_owner: Whether user is room owner (can admit guests, etc.)
            exp_minutes: Token expiry in minutes
            start_video_off: Start with video disabled
            start_audio_off: Start with audio disabled
            enable_recording: Whether user can record

        Returns:
            Meeting token string
        """
        if not self.api_key:
            # Return mock token when no API key
            import secrets
            return f"mock_{secrets.token_urlsafe(32)}"

        exp_time = datetime.utcnow() + timedelta(minutes=exp_minutes)

        token_config = {
            "properties": {
                "room_name": room_name,
                "user_name": user_name,
                "user_id": user_id,
                "is_owner": is_owner,
                "exp": int(exp_time.timestamp()),
                "start_video_off": start_video_off,
                "start_audio_off": start_audio_off,
                "enable_recording": enable_recording,
            }
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{DAILY_API_BASE}/meeting-tokens",
                    json=token_config,
                    headers=self.headers,
                    timeout=30.0
                )

                if response.status_code in [200, 201]:
                    data = response.json()
                    logger.info(f"Created meeting token for {user_name} in {room_name}")
                    return data.get("token")
                else:
                    logger.error(f"Failed to create token (status {response.status_code}): {response.text}")
                    raise Exception(f"Failed to create meeting token (status {response.status_code}): {response.text}")

        except httpx.TimeoutException:
            logger.error("Daily.co API timeout")
            raise Exception("Daily.co API timeout")
        except Exception as e:
            logger.error(f"Daily.co API error: {e}")
            raise

    async def get_room_presence(self, room_name: str) -> Dict[str, Any]:
        """
        Get current participants in a room.

        Args:
            room_name: The room to check

        Returns:
            Presence data including participant list
        """
        if not self.api_key:
            return {"total_count": 0, "data": []}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{DAILY_API_BASE}/rooms/{room_name}/presence",
                    headers=self.headers,
                    timeout=30.0
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    return {"total_count": 0, "data": []}

        except Exception as e:
            logger.error(f"Error getting room presence: {e}")
            return {"total_count": 0, "data": []}

    async def create_room_if_not_exists(
        self,
        room_name: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a room if it doesn't already exist.

        Args:
            room_name: The room name
            **kwargs: Additional room configuration

        Returns:
            Room data
        """
        existing = await self.get_room(room_name)
        if existing:
            return existing

        return await self.create_room(room_name, **kwargs)


# Singleton instance
daily_service = DailyVideoService()
