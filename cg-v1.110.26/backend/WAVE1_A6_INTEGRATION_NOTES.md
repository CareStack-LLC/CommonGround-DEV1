# Wave 1 — A6: Notification Service Integration Notes

This doc lists the shared-file edits required to wire up the new
notification service. The owning agent for those shared files should
apply them. Nothing here modifies `main.py`, `core/config.py`, or any
kidcoms/circle/parent-messaging endpoint.

## Files created by this task

- `app/models/notification.py` — `Notification` model + `NotificationType` enum
- `app/schemas/notification.py` — `NotificationResponse`, `NotificationListResponse`, `NotificationMarkReadRequest`
- `app/services/notification_service.py` — `NotificationService` + `notification_service` singleton
- `app/api/v1/endpoints/notifications.py` — `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/mark-read`
- `alembic/versions/add_notifications_20260416.py` — migration (chains after `kidcoms_nullable_daily_room`)

## 1. Register the router in `app/api/v1/router.py`

Add `notifications` to the existing import block:

```python
from app.api.v1.endpoints import (
    # ... existing imports ...
    notifications,
    # ... existing imports ...
)
```

Then include the router. Place this near the other user-inbox style
routes (e.g. right after the Activities include at line ~124):

```python
# Notifications - In-app inbox + email dispatch (Wave 1 A6)
api_router.include_router(
    notifications.router, tags=["Notifications"]
)
```

The endpoint paths already include the `/notifications` prefix
(`@router.get("/notifications")`), so do **not** add a `prefix=` kwarg
here. Final URLs will be `/api/v1/notifications`,
`/api/v1/notifications/unread-count`, and
`/api/v1/notifications/mark-read`.

## 2. Register the model in `app/models/__init__.py`

Models are auto-imported via `app/models/__init__.py` so Alembic
autogenerate and relationships work. Add the following import alongside
the other model imports:

```python
from app.models.notification import Notification, NotificationType
```

And append to `__all__`:

```python
    # Notifications (Wave 1 A6)
    "Notification",
    "NotificationType",
```

## 3. Apply the migration

```bash
cd backend
alembic upgrade head
```

The new revision `add_notifications_20260416` sets
`down_revision = "kidcoms_nullable_daily_room"`, so it is the new head.

## 4. Notes on email routing

`NotificationService.create` uses existing `EmailService` methods only.
Mapping:

| notification_type          | Email method                            |
| -------------------------- | --------------------------------------- |
| `parent_child_message`     | `email_service.send_message_notification` |
| `kidcoms_call`             | `email_service.send_kidcoms_call_notification` |
| `aria_intervention`        | `email_service.send_aria_intervention`  |
| *all other types*          | `email_service.send_generic_notification` (fallback) |

The service does **not** modify `app/services/email.py`. If a richer
per-type template is needed later (e.g. a dedicated `circle_invite`
email with CTA art), add it to `email.py` in a follow-up and update the
routing table in `NotificationService._send_email_for`.

Email failures are caught and logged — they never block the DB write.

## 5. Out of scope for Wave 1

- WebSocket / SSE / Web Push delivery. The inbox is pull-based (clients
  poll `GET /notifications/unread-count`). Realtime push is Wave 2+.
- Per-user notification preferences (mute types, digest mode). All
  types currently send email when `send_email=True`.
