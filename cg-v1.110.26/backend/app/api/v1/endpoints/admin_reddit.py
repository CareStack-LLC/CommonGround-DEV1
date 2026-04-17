"""
Admin Reddit Integration — Browse subreddits, post comments, create posts.

All endpoints require admin authentication.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.reddit import RedditConfig
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Config keys ──
SECRET_KEYS = {"client_id", "client_secret", "username", "password"}
SETTING_KEYS = {"monitored_subreddits"}


# ── Schemas ──
class RedditCredentials(BaseModel):
    client_id: str
    client_secret: str
    username: str
    password: str


class RedditCommentRequest(BaseModel):
    parent_id: str  # fullname e.g. t3_abc123 or t1_xyz789
    text: str


class RedditPostRequest(BaseModel):
    subreddit: str
    title: str
    text: str


class SubredditListUpdate(BaseModel):
    subreddits: list[str]


# ── Helpers ──
async def _get_config(db: AsyncSession, key: str) -> Optional[str]:
    """Get a config value by key."""
    try:
        result = await db.execute(
            select(RedditConfig).where(RedditConfig.key == key)
        )
        row = result.scalar_one_or_none()
        return row.value if row else None
    except ProgrammingError:
        await db.rollback()
        return None


async def _set_config(db: AsyncSession, key: str, value: str):
    """Set a config value, creating if not exists."""
    result = await db.execute(
        select(RedditConfig).where(RedditConfig.key == key)
    )
    row = result.scalar_one_or_none()
    if row:
        row.value = value
    else:
        db.add(RedditConfig(key=key, value=value))


async def _get_reddit_service(db: AsyncSession):
    """Build a RedditService from stored credentials."""
    from app.services.reddit_service import RedditService

    client_id = await _get_config(db, "client_id")
    client_secret = await _get_config(db, "client_secret")
    username = await _get_config(db, "username")
    password = await _get_config(db, "password")

    if not all([client_id, client_secret, username, password]):
        raise HTTPException(
            status_code=400,
            detail="Reddit credentials not configured. Go to Settings to connect your Reddit account.",
        )

    return RedditService(
        client_id=client_id,
        client_secret=client_secret,
        username=username,
        password=password,
    )


# ═══════════════════════════════════════════════════════════════
# AUTH & CONFIG
# ═══════════════════════════════════════════════════════════════

@router.get("/status", summary="Check Reddit connection status")
async def reddit_status(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Check if the Reddit integration is ready.

    The frontend needs three levels of signal to avoid showing "0 campaigns"
    for a module that has never been migrated:
      - `table_ready`: the `reddit_config` table exists (alembic migration ran)
      - `configured`: all four credentials keys are present
      - `connected`: Reddit accepted those credentials just now
    """
    from sqlalchemy import text

    # Level 1 — does the table exist?
    table_ready = True
    try:
        await db.execute(text("SELECT 1 FROM reddit_config LIMIT 1"))
    except ProgrammingError:
        await db.rollback()
        table_ready = False
    except Exception as e:
        logger.warning("reddit_config probe failed: %s", e)
        await db.rollback()
        table_ready = False

    if not table_ready:
        return {
            "table_ready": False,
            "configured": False,
            "connected": False,
            "reason": "table_missing",
            "message": "Reddit integration not set up — run the reddit_config migration.",
        }

    # Level 2 — are all credentials present?
    client_id = await _get_config(db, "client_id")
    client_secret = await _get_config(db, "client_secret")
    username = await _get_config(db, "username")
    password = await _get_config(db, "password")
    configured = bool(client_id and client_secret and username and password)

    if not configured:
        return {
            "table_ready": True,
            "configured": False,
            "connected": False,
            "reason": "not_configured",
            "message": "Credentials missing — open the settings form to add them.",
        }

    # Level 3 — can we actually talk to Reddit?
    try:
        service = await _get_reddit_service(db)
        user_info = await service.verify_auth()
        return {
            "table_ready": True,
            "configured": True,
            "connected": True,
            **user_info,
        }
    except HTTPException:
        return {
            "table_ready": True,
            "configured": True,
            "connected": False,
            "reason": "auth_failed",
        }
    except Exception as e:
        logger.warning("Reddit auth check failed: %s", e)
        return {
            "table_ready": True,
            "configured": True,
            "connected": False,
            "reason": str(e),
        }


@router.post("/config", summary="Save Reddit credentials")
async def save_reddit_config(
    body: RedditCredentials,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Save Reddit API credentials."""
    try:
        await _set_config(db, "client_id", body.client_id.strip())
        await _set_config(db, "client_secret", body.client_secret.strip())
        await _set_config(db, "username", body.username.strip())
        await _set_config(db, "password", body.password.strip())
        await db.commit()

        # Test the connection
        from app.services.reddit_service import RedditService
        service = RedditService(
            client_id=body.client_id.strip(),
            client_secret=body.client_secret.strip(),
            username=body.username.strip(),
            password=body.password.strip(),
        )
        user_info = await service.verify_auth()
        return {"saved": True, "connected": True, **user_info}
    except ProgrammingError:
        await db.rollback()
        raise HTTPException(status_code=503, detail="reddit_config table not created. Run the migration SQL.")
    except Exception as e:
        logger.error("Failed to save/verify Reddit config: %s", e)
        raise HTTPException(status_code=400, detail=f"Credentials saved but verification failed: {e}")


@router.get("/config", summary="Get Reddit config (masked)")
async def get_reddit_config(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Return config with secrets masked."""
    client_id = await _get_config(db, "client_id") or ""
    username = await _get_config(db, "username") or ""
    has_secret = bool(await _get_config(db, "client_secret"))
    has_password = bool(await _get_config(db, "password"))

    return {
        "client_id": client_id[:6] + "..." if len(client_id) > 6 else client_id,
        "username": username,
        "has_secret": has_secret,
        "has_password": has_password,
    }


# ═══════════════════════════════════════════════════════════════
# TRACKED SUBREDDITS
# ═══════════════════════════════════════════════════════════════

DEFAULT_SUBREDDITS = ["coparenting", "custody", "divorce", "SingleParents"]


@router.get("/tracked-subreddits", summary="List tracked subreddits")
async def get_tracked_subreddits(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Return the list of monitored subreddits."""
    raw = await _get_config(db, "monitored_subreddits")
    if raw:
        try:
            subs = json.loads(raw)
        except Exception:
            subs = DEFAULT_SUBREDDITS
    else:
        subs = DEFAULT_SUBREDDITS
    return {"subreddits": subs}


@router.post("/tracked-subreddits", summary="Update tracked subreddits")
async def update_tracked_subreddits(
    body: SubredditListUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Save the list of monitored subreddits."""
    cleaned = [s.strip().lower().replace("r/", "") for s in body.subreddits if s.strip()]
    await _set_config(db, "monitored_subreddits", json.dumps(cleaned))
    await db.commit()
    return {"subreddits": cleaned}


# ═══════════════════════════════════════════════════════════════
# SUBREDDIT BROWSING
# ═══════════════════════════════════════════════════════════════

@router.get("/subreddit/{name}/posts", summary="Fetch subreddit posts")
async def get_subreddit_posts(
    name: str,
    sort: str = Query("hot", description="Sort: hot, new, top, rising"),
    limit: int = Query(25, ge=1, le=100),
    after: Optional[str] = Query(None, description="Pagination cursor"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Fetch posts from a subreddit."""
    service = await _get_reddit_service(db)
    return await service.get_subreddit_posts(name, sort=sort, limit=limit, after=after)


@router.get("/subreddit/{name}/search", summary="Search subreddit")
async def search_subreddit(
    name: str,
    q: str = Query(..., description="Search query"),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Search posts within a subreddit."""
    service = await _get_reddit_service(db)
    posts = await service.search_subreddit(name, query=q, limit=limit)
    return {"posts": posts, "query": q, "subreddit": name}


@router.get("/post/{post_id}/comments", summary="Get post comments")
async def get_post_comments(
    post_id: str,
    subreddit: str = Query("coparenting", description="Subreddit name"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Fetch comments for a specific post."""
    service = await _get_reddit_service(db)
    comments = await service.get_post_comments(subreddit, post_id)
    return {"comments": comments, "post_id": post_id}


# ═══════════════════════════════════════════════════════════════
# POSTING
# ═══════════════════════════════════════════════════════════════

@router.post("/comment", summary="Post a comment")
async def post_comment(
    body: RedditCommentRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Post a comment or reply on Reddit."""
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Comment text cannot be empty")
    if len(body.text) > 10000:
        raise HTTPException(status_code=400, detail="Comment too long (max 10,000 chars)")

    service = await _get_reddit_service(db)
    result = await service.post_comment(body.parent_id, body.text.strip())
    logger.info("Admin %s posted Reddit comment on %s", admin_user.email, body.parent_id)
    return result


@router.post("/post", summary="Create a Reddit post")
async def create_reddit_post(
    body: RedditPostRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Create a new text post on Reddit."""
    if not body.title.strip():
        raise HTTPException(status_code=400, detail="Post title cannot be empty")
    if len(body.title) > 300:
        raise HTTPException(status_code=400, detail="Title too long (max 300 chars)")

    service = await _get_reddit_service(db)
    result = await service.submit_post(
        subreddit=body.subreddit.strip(),
        title=body.title.strip(),
        text=body.text.strip(),
    )
    logger.info("Admin %s created Reddit post in r/%s", admin_user.email, body.subreddit)
    return result


# ═══════════════════════════════════════════════════════════════
# GTM Playbook persistence (admin_kv-backed)
# ═══════════════════════════════════════════════════════════════
# The /superadmin/reddit page used to stash its state (checked tasks, drafts,
# outreach, activity) in localStorage, which meant admins lost everything
# when switching browsers. These endpoints give it a backend home — one
# admin_kv row per (admin, key) pair.

_PLAYBOOK_ALLOWED_KEYS = {"playbook", "drafts", "outreach", "activity"}


class PlaybookStatePayload(BaseModel):
    """Arbitrary JSON blob matching what the frontend previously stored in
    localStorage for this key."""
    value: dict | list | None = None


@router.get("/playbook/state", summary="Read all playbook state blobs for this admin")
async def get_playbook_state(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Return a dict keyed by {playbook, drafts, outreach, activity} for the
    current admin. Missing keys are absent — the frontend falls back to its
    default shape."""
    from app.models.admin_kv import AdminKV

    result = await db.execute(
        select(AdminKV).where(AdminKV.user_id == str(admin_user.id))
    )
    rows = list(result.scalars())
    return {
        r.key: r.value_json
        for r in rows
        if r.key in _PLAYBOOK_ALLOWED_KEYS
    }


@router.put(
    "/playbook/state/{key}",
    summary="Save one playbook state blob for this admin",
)
async def put_playbook_state(
    key: str,
    body: PlaybookStatePayload,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Upsert the value for (admin, key). key is restricted to the 4 known
    playbook blob keys so admins can't silently pollute the table."""
    from app.models.admin_kv import AdminKV

    if key not in _PLAYBOOK_ALLOWED_KEYS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown key. Must be one of: {sorted(_PLAYBOOK_ALLOWED_KEYS)}",
        )

    result = await db.execute(
        select(AdminKV).where(
            AdminKV.user_id == str(admin_user.id),
            AdminKV.key == key,
        )
    )
    row = result.scalar_one_or_none()
    value: dict | list | None = body.value
    if row:
        # value_json is typed dict in the model, but SQLAlchemy's JSON
        # column accepts list/dict — cast for type checkers.
        row.value_json = value  # type: ignore[assignment]
    else:
        row = AdminKV(
            user_id=str(admin_user.id),
            key=key,
            value_json=value,  # type: ignore[arg-type]
        )
        db.add(row)

    await db.commit()
    return {"saved": True, "key": key}
