"""
Real-Time Event Broadcasting Service

Provides a centralized way for services to broadcast WebSocket events
when data changes. Other services (messages, exchanges, obligations, etc.)
can use this to notify connected clients of updates in real-time.

WS5: Real-Time Infrastructure Migration
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from app.core.websocket import manager

logger = logging.getLogger(__name__)


class RealtimeEventType:
    """Event types for real-time broadcasting."""

    # Message events
    NEW_MESSAGE = "new_message"
    MESSAGE_UPDATED = "message_updated"
    MESSAGE_DELETED = "message_deleted"

    # Exchange events
    EXCHANGE_CREATED = "exchange_created"
    EXCHANGE_UPDATED = "exchange_updated"
    EXCHANGE_CHECKIN = "exchange_checkin"
    EXCHANGE_REMINDER = "exchange_reminder"

    # Obligation/ClearFund events
    OBLIGATION_CREATED = "obligation_created"
    OBLIGATION_UPDATED = "obligation_updated"
    OBLIGATION_FUNDED = "obligation_funded"
    OBLIGATION_COMPLETED = "obligation_completed"
    PAYMENT_RECEIVED = "payment_received"

    # Dashboard/Summary events
    DASHBOARD_UPDATE = "dashboard_update"
    BALANCE_CHANGED = "balance_changed"

    # Custody events
    CUSTODY_PERIOD_UPDATED = "custody_period_updated"

    # Event events
    EVENT_CREATED = "event_created"
    EVENT_UPDATED = "event_updated"
    EVENT_DELETED = "event_deleted"

    # Geofence events (WS6)
    GEOFENCE_ENTRY = "geofence_entry"
    GEOFENCE_EXIT = "geofence_exit"

    # Presence events
    USER_ONLINE = "user_online"
    USER_OFFLINE = "user_offline"
    TYPING = "typing"


class RealtimeService:
    """
    Service for broadcasting real-time events to connected clients.

    Usage:
        realtime = RealtimeService()
        await realtime.broadcast_exchange_update(
            family_file_id=family_file_id,
            exchange_id=exchange_id,
            exchange_data={...}
        )
    """

    def __init__(self):
        self.manager = manager

    async def broadcast_to_family_file(
        self,
        family_file_id: str,
        event_type: str,
        data: Dict[str, Any],
        exclude_user: Optional[str] = None
    ):
        """
        Broadcast an event to all users subscribed to a family file.

        Args:
            family_file_id: Family file ID (or case ID)
            event_type: Type of event (from RealtimeEventType)
            data: Event payload
            exclude_user: Optional user ID to exclude from broadcast
        """
        message = {
            "type": event_type,
            "family_file_id": family_file_id,
            "timestamp": datetime.utcnow().isoformat(),
            **data
        }

        await self.manager.broadcast_to_case(
            message=message,
            case_id=family_file_id,
            exclude_user=exclude_user
        )

        logger.debug(f"Broadcasted {event_type} to family file {family_file_id}")

    async def send_to_user(
        self,
        user_id: str,
        event_type: str,
        data: Dict[str, Any]
    ):
        """
        Send an event to a specific user (all their connections).

        Args:
            user_id: User ID
            event_type: Type of event
            data: Event payload
        """
        message = {
            "type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            **data
        }

        await self.manager.send_personal_message(message, user_id)

        logger.debug(f"Sent {event_type} to user {user_id}")

    # =======================================================================
    # Exchange Events
    # =======================================================================

    async def broadcast_exchange_created(
        self,
        family_file_id: str,
        exchange_id: str,
        exchange_data: Dict[str, Any]
    ):
        """Broadcast that a new exchange was created."""
        await self.broadcast_to_family_file(
            family_file_id=family_file_id,
            event_type=RealtimeEventType.EXCHANGE_CREATED,
            data={
                "exchange_id": exchange_id,
                "exchange": exchange_data
            }
        )

    async def broadcast_exchange_updated(
        self,
        family_file_id: str,
        exchange_id: str,
        exchange_data: Dict[str, Any]
    ):
        """Broadcast that an exchange was updated."""
        await self.broadcast_to_family_file(
            family_file_id=family_file_id,
            event_type=RealtimeEventType.EXCHANGE_UPDATED,
            data={
                "exchange_id": exchange_id,
                "exchange": exchange_data
            }
        )

    async def broadcast_exchange_checkin(
        self,
        family_file_id: str,
        exchange_id: str,
        parent_id: str,
        checkin_type: str,  # 'pickup' or 'dropoff'
        location: Optional[Dict[str, Any]] = None
    ):
        """Broadcast that a parent checked in for an exchange."""
        await self.broadcast_to_family_file(
            family_file_id=family_file_id,
            event_type=RealtimeEventType.EXCHANGE_CHECKIN,
            data={
                "exchange_id": exchange_id,
                "parent_id": parent_id,
                "checkin_type": checkin_type,
                "location": location
            },
            exclude_user=parent_id  # Don't send back to the parent who checked in
        )

    # =======================================================================
    # Obligation/ClearFund Events
    # =======================================================================

    async def broadcast_obligation_created(
        self,
        family_file_id: str,
        obligation_id: str,
        obligation_data: Dict[str, Any]
    ):
        """Broadcast that a new obligation was created."""
        await self.broadcast_to_family_file(
            family_file_id=family_file_id,
            event_type=RealtimeEventType.OBLIGATION_CREATED,
            data={
                "obligation_id": obligation_id,
                "obligation": obligation_data
            }
        )

    async def broadcast_obligation_updated(
        self,
        family_file_id: str,
        obligation_id: str,
        obligation_data: Dict[str, Any]
    ):
        """Broadcast that an obligation was updated."""
        await self.broadcast_to_family_file(
            family_file_id=family_file_id,
            event_type=RealtimeEventType.OBLIGATION_UPDATED,
            data={
                "obligation_id": obligation_id,
                "obligation": obligation_data
            }
        )

    async def broadcast_payment_received(
        self,
        family_file_id: str,
        obligation_id: str,
        payer_id: str,
        amount: str
    ):
        """Broadcast that a payment was received."""
        await self.broadcast_to_family_file(
            family_file_id=family_file_id,
            event_type=RealtimeEventType.PAYMENT_RECEIVED,
            data={
                "obligation_id": obligation_id,
                "payer_id": payer_id,
                "amount": amount
            }
        )

    async def broadcast_balance_changed(
        self,
        family_file_id: str,
        balance_summary: Dict[str, Any]
    ):
        """Broadcast that balances have changed."""
        await self.broadcast_to_family_file(
            family_file_id=family_file_id,
            event_type=RealtimeEventType.BALANCE_CHANGED,
            data={
                "balance": balance_summary
            }
        )

    # =======================================================================
    # Dashboard Events
    # =======================================================================

    async def broadcast_dashboard_update(
        self,
        family_file_id: str,
        summary_data: Dict[str, Any]
    ):
        """Broadcast dashboard summary update."""
        await self.broadcast_to_family_file(
            family_file_id=family_file_id,
            event_type=RealtimeEventType.DASHBOARD_UPDATE,
            data={
                "summary": summary_data
            }
        )

    # =======================================================================
    # Event (Calendar) Events
    # =======================================================================

    async def broadcast_event_created(
        self,
        family_file_id: str,
        event_id: str,
        event_data: Dict[str, Any]
    ):
        """Broadcast that a calendar event was created."""
        await self.broadcast_to_family_file(
            family_file_id=family_file_id,
            event_type=RealtimeEventType.EVENT_CREATED,
            data={
                "event_id": event_id,
                "event": event_data
            }
        )

    async def broadcast_event_updated(
        self,
        family_file_id: str,
        event_id: str,
        event_data: Dict[str, Any]
    ):
        """Broadcast that a calendar event was updated."""
        await self.broadcast_to_family_file(
            family_file_id=family_file_id,
            event_type=RealtimeEventType.EVENT_UPDATED,
            data={
                "event_id": event_id,
                "event": event_data
            }
        )

    # =======================================================================
    # Geofence Events (WS6)
    # =======================================================================

    async def broadcast_geofence_entry(
        self,
        family_file_id: str,
        exchange_id: str,
        parent_id: str,
        parent_name: str,
        location: Dict[str, Any]
    ):
        """
        Broadcast that a parent entered the exchange geofence.

        WS6: Geofence notifications
        """
        await self.broadcast_to_family_file(
            family_file_id=family_file_id,
            event_type=RealtimeEventType.GEOFENCE_ENTRY,
            data={
                "exchange_id": exchange_id,
                "parent_id": parent_id,
                "parent_name": parent_name,
                "location": location,
                "message": f"{parent_name} has arrived at the exchange location"
            },
            exclude_user=parent_id  # Don't notify the parent who entered
        )

    # =======================================================================
    # Presence Events
    # =======================================================================

    async def broadcast_user_status(
        self,
        family_file_id: str,
        user_id: str,
        user_name: str,
        status: str  # 'online' or 'offline'
    ):
        """Broadcast user online/offline status."""
        event_type = RealtimeEventType.USER_ONLINE if status == "online" else RealtimeEventType.USER_OFFLINE

        await self.broadcast_to_family_file(
            family_file_id=family_file_id,
            event_type=event_type,
            data={
                "user_id": user_id,
                "user_name": user_name,
                "status": status
            },
            exclude_user=user_id
        )

    def get_online_users(self, family_file_id: str) -> List[str]:
        """Get list of online users for a family file."""
        return self.manager.get_online_users(family_file_id)

    def is_user_online(self, user_id: str) -> bool:
        """Check if a user is currently online."""
        return self.manager.is_user_online(user_id)


# Global instance
realtime_service = RealtimeService()
