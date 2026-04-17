# Wave 1 A8 — Integration Notes

This task added a scheduled sweeper for abandoned KidComs sessions
(orphaned Daily.co rooms) so they are released well before Daily's
~2h server-side TTL and before we exhaust our room quota at 300 users.

## Files added

- `app/services/daily_room_cleaner.py` — the sweep logic (`cleanup_abandoned_sessions`).
- `app/services/scheduler.py` — AsyncIOScheduler wrapper (`start_scheduler` / `stop_scheduler`).
- `app/api/v1/endpoints/admin_cleanup.py` — `POST /admin/cleanup/daily-rooms` (admin only).

## Files modified

- `backend/requirements.txt` — added `apscheduler>=3.10.0`.

> The spec forbade editing `app/main.py`, `app/api/v1/router.py`, and
> `app/core/config.py`. The snippets below are what you need to splice
> in to make this live.

## Status enum note

`app/models/kidcoms.py::SessionStatus` has no `ABANDONED` member.
Per the spec we fall back to `COMPLETED` and set `ended_at = utcnow()`
so ops can still distinguish swept rows from explicit `/end` calls
(no recording, no POST /sessions/{id}/end audit trail). If you want
a dedicated `ABANDONED` state later, add it to the enum — the cleaner
only references `SessionStatus.COMPLETED.value`, so switching is a
one-line change.

---

## 1) `app/main.py` — lifespan splice

Add the import at the top of the file (alongside the existing service imports):

```python
from app.services.scheduler import start_scheduler, stop_scheduler
```

Inside the existing `async def lifespan(app: FastAPI):`, **after** the Redis
init block (`await _redis_limiter.init()`) and **before** the `yield`, add:

```python
    # Background scheduler — sweeps abandoned KidComs / Daily.co rooms.
    start_scheduler(app)
```

Then inside the shutdown section (after `yield`, before `await close_db()`),
add:

```python
    stop_scheduler()
```

So the relevant region of `lifespan` should end up looking like:

```python
    await _redis_limiter.init()

    # Background scheduler — sweeps abandoned KidComs / Daily.co rooms.
    start_scheduler(app)

    yield
    # Shutdown
    logger.info("Shutting down...")
    stop_scheduler()
    await ws_manager.shutdown()
    await close_db()
```

## 2) `app/api/v1/router.py` — router registration

Add `admin_cleanup` to the existing endpoint import block at the top:

```python
from app.api.v1.endpoints import (
    admin,
    admin_cleanup,      # <-- add
    admin_leads,
    ...
)
```

Then, alongside the other `/admin/*` router includes near the bottom,
register it:

```python
# Admin maintenance jobs (Wave 1 A8 — Daily.co room sweeper, etc.)
api_router.include_router(
    admin_cleanup.router,
    prefix="/admin/cleanup",
    tags=["Admin Maintenance"],
)
```

Final endpoint: `POST /api/v1/admin/cleanup/daily-rooms`

## 3) `app/core/config.py` — settings

Add these two fields inside the `Settings` class (anywhere near the
Daily.co block is fine):

```python
    # Daily.co room cleanup scheduler (Wave 1 A8)
    DAILY_ROOM_CLEANUP_INTERVAL_MIN: int = 15   # how often the sweeper runs
    DAILY_ROOM_ABANDON_THRESHOLD_MIN: int = 60  # session age before sweep
```

Both have safe defaults, so no `.env` change is required to go live. The
cleaner / scheduler read them via `getattr(settings, ..., default)` so
**missing-settings will not crash the app** — but declaring them makes
them discoverable in `/docs` config audits and in CI.

## 4) Env vars (optional overrides)

```
DAILY_ROOM_CLEANUP_INTERVAL_MIN=15
DAILY_ROOM_ABANDON_THRESHOLD_MIN=60
```

## 5) Verification

After wiring the above:

```bash
# Smoke test — manually trigger the sweep as an admin user.
curl -X POST https://<host>/api/v1/admin/cleanup/daily-rooms \
     -H "Authorization: Bearer <admin JWT>"
# => {"cleaned": N, "errors": [...], "duration_ms": X, "threshold_minutes": 60}
```

Also watch the app logs on boot for:

```
scheduler: started (daily_room_cleanup every 15 min, abandon threshold=60 min)
```

and every 15 minutes afterward for either a debug "no abandoned sessions"
line or an info line with the sweep summary.
