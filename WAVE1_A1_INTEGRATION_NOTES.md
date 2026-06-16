# Wave 1 · Task A1 — Persistent Parent ↔ Child Messaging — Integration Notes

This feature adds an always-available parent↔child async text inbox. A parent
can text their child without requiring an active video/voice call. Messages are
persisted, ARIA-analyzed, and readable when either side logs in.

All paths below are relative to `cg-v1.110.26/`.

---

## 1. Router registration (splice into `backend/app/api/v1/router.py`)

Add the import alongside the other endpoint imports at the top of the file
(matching the style used for `kidcoms`, `my_circle`, etc.):

```python
from app.api.v1.endpoints import parent_child_messages
```

Then register the router near the other KidComs / My-Circle entries (e.g. just
after the `my_circle` block around line 131):

```python
# Family Messaging — persistent parent ↔ child async inbox (Wave 1 A1)
api_router.include_router(
    parent_child_messages.router,
    prefix="/family-messaging",
    tags=["Family Messaging"],
)
```

## 2. Model registration (already applied)

`backend/app/models/__init__.py` has been updated to:

- Add `from app.models.parent_child_message import ParentChildMessage`
- Export `"ParentChildMessage"` in `__all__`.

No further action needed — SQLAlchemy will pick up the new model.

## 3. Migration

**Chosen chain:** `down_revision = 'add_notifications_20260416'`.

The A6 migration (`add_notifications_20260416.py`) was present in
`backend/alembic/versions/` at the time this work landed, so per the brief the
parent↔child messages migration chains after it. A6's own `down_revision`
points at `kidcoms_nullable_daily_room`.

Verified chain head (oldest → newest):
```
kidcoms_nullable_daily_room
  → add_notifications_20260416        (A6)
    → add_parent_child_messages_20260416  (A1 — this change)
```

Migration file: `backend/alembic/versions/add_parent_child_messages_20260416.py`
Revision id: `add_parent_child_messages_20260416`

Apply with:

```bash
cd backend && alembic upgrade head
```

## 4. Notification service integration

A6's `NotificationService` was present in `app/services/notification_service.py`
when this work landed. `FamilyMessagingService._notify` calls its real
signature:

```python
await notification_service.create(
    db=db,
    user_id=parent_user_id,
    notification_type="parent_child_message",       # matches NotificationType enum
    title=f"New message from {sender_name}",
    body=<120-char preview>,
    action_url=f"/messages/child/{child_id}",
    family_file_id=family_file.id,
)
```

The import is lazy + wrapped in `try/except ImportError` so the send never
fails if A6 is reverted. The helper supports both sync and async `create()`
(awaits only on awaitable returns).

**Child-side notifications:** A6's `Notification.user_id` FKs `users.id` and
the children table is separate (`children` / `child_users`). We therefore do
**not** fan out to children through A6 — they see parent messages when they
next open KidSpace. Wire up a dedicated child-notification path (push to
child devices, KidSpace bell, etc.) when that system is ready.

**Verification:**
1. Parent → child send: nothing emitted on the A6 path (expected; child-side
   is out of scope for A6).
2. Child → parent send: confirm one A6 notification row per parent on the
   family file with `notification_type='parent_child_message'` and
   `action_url='/messages/child/<child_id>'`.
3. On `ImportError` the info log
   `"notification service unavailable; skipping parent_child_message..."`
   will appear — currently expected to be absent.

## 5. Frontend routes added

| Route                              | Who         | Purpose                                                   |
| ---------------------------------- | ----------- | --------------------------------------------------------- |
| `/messages/child`                  | Parent      | Inbox listing every child they can message.               |
| `/messages/child/[childId]`        | Parent      | Thread detail with a specific child. Polls on mount.      |
| `/kidspace/messages`               | Child (PIN) | Child's single thread with their parents. KidSpace style. |

Note: `/messages` (co-parent chat) and `/messages/call` (parent↔parent call)
are untouched — the new parent↔child inbox intentionally sits under
`/messages/child/*` so it doesn't collide.

## 6. Frontend API client

`frontend/lib/api.ts` — appended at the bottom (just before the
`export { getAuthToken, clearAuthTokens }` line):

- `ParentChildMessage`, `ParentChildMessageList`, `ParentChildThreadSummary`,
  `ParentChildThreadList` types.
- `familyMessagingAPI` with:
  - `listThreads()` — parent inbox
  - `listMessages(childId, options)` — parent thread view
  - `sendParentMessage(childId, content)`
  - `markThreadRead(childId)` — parent auth
  - `listMessagesAsChild(childId, options)` — child auth
  - `sendChildMessage(childId, content)` — child auth
  - `markThreadReadAsChild(childId)` — child auth

The child-auth methods re-use the existing `fetchAPIWithChildAuth` helper in
`api.ts` (same pattern as `kidcomsAPI.createChildSession`).

## 7. Files created

Backend:
- `backend/app/models/parent_child_message.py`
- `backend/app/schemas/parent_child_message.py`
- `backend/app/services/family_messaging.py`
- `backend/app/api/v1/endpoints/parent_child_messages.py`
- `backend/alembic/versions/add_parent_child_messages_20260416.py`

Backend edits:
- `backend/app/models/__init__.py` (import + `__all__`)

Frontend:
- `frontend/app/messages/child/page.tsx`
- `frontend/app/messages/child/[childId]/page.tsx`
- `frontend/app/kidspace/messages/page.tsx`

Frontend edits:
- `frontend/lib/api.ts` (appended `familyMessagingAPI` + types)

## 8. Endpoint summary

All endpoints are prefixed with `/api/v1/family-messaging` (after router
registration above). JWT-based.

| Method | Path                                                  | Auth           | Purpose                                |
| ------ | ----------------------------------------------------- | -------------- | -------------------------------------- |
| GET    | `/threads`                                            | Parent         | List inbox summaries.                  |
| GET    | `/threads/{child_id}/messages`                        | Parent OR Child| Fetch thread messages (newest first).  |
| POST   | `/threads/{child_id}/messages`                        | Parent         | Parent sends a message.                |
| POST   | `/threads/{child_id}/messages/from-child`             | Child          | Child sends a message.                 |
| POST   | `/threads/{child_id}/mark-read`                       | Parent OR Child| Mark other side's messages as read.    |

## 9. Behavior notes

- ARIA is applied on every send via `aria_child_chat_monitor.analyze_message`.
  If `should_hide` is True, `content` is replaced with
  `"[Message hidden by safety filter]"`, the raw text is preserved in
  `original_content`, and `aria_hidden=True`. Parents viewing a hidden message
  see the placeholder + the shield icon; the raw original content is available
  via the API field (`original_content`) for admin/parent review flows.
- `mark-read` marks messages from the opposite side (the side **not** doing
  the request). A parent marking-read clears the child's unread messages; a
  child marking-read clears unread parent messages.
- `list_parent_threads` returns one summary per child on every family file the
  parent is parent_a or parent_b of. Threads with no messages sort last.
- No WebSocket — polling on mount + after-send is sufficient for Wave 1.
