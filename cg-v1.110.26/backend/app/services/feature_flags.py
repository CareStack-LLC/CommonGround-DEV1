"""Global platform feature flags / kill-switches.

Backed by the existing ``admin_kv`` table under a single shared scope so every
backend instance reads the same value. Consumers call :func:`is_enabled` with a
sane default, so a missing/unwritten flag never breaks a feature — flags only
take effect once an admin explicitly toggles them.
"""

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_kv import AdminKV

logger = logging.getLogger(__name__)

# Shared (non-per-admin) scope for platform-wide flags.
GLOBAL_SCOPE = "__global__"

# Registry of known flags so the admin UI can render them with descriptions and
# correct defaults. `default` is the value used when the flag has never been
# set. Consumers should still pass an explicit default to is_enabled().
FEATURE_FLAGS: dict[str, dict[str, Any]] = {
    "maintenance_mode": {
        "default": False,
        "description": "Show a maintenance banner across the app.",
    },
    "kidcoms_calls_enabled": {
        "default": True,
        "description": "Master switch for starting new KidSpace/Circle video & voice calls.",
    },
    "kidcoms_messaging_enabled": {
        "default": True,
        "description": "Master switch for KidSpace/Circle text messaging.",
    },
    "new_user_registration_enabled": {
        "default": True,
        "description": "Allow new account sign-ups.",
    },
    "professional_signups_enabled": {
        "default": True,
        "description": "Allow new professional/firm onboarding.",
    },
}


async def is_enabled(db: AsyncSession, key: str, default: bool = True) -> bool:
    """Return the boolean value of a flag, falling back to ``default``.

    Fail-open to ``default`` on any error so a flag lookup can never take down
    a request path.
    """
    try:
        result = await db.execute(
            select(AdminKV.value_json).where(
                AdminKV.user_id == GLOBAL_SCOPE, AdminKV.key == key
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            reg = FEATURE_FLAGS.get(key)
            return bool(reg["default"]) if reg else default
        if isinstance(row, dict) and "value" in row:
            return bool(row["value"])
        return bool(row)
    except Exception as e:  # pragma: no cover - defensive
        logger.warning("feature_flags.is_enabled(%s) failed: %s", key, e)
        return default


async def set_flag(db: AsyncSession, key: str, value: bool) -> None:
    """Upsert a flag value. Caller is responsible for the audit log + commit."""
    result = await db.execute(
        select(AdminKV).where(AdminKV.user_id == GLOBAL_SCOPE, AdminKV.key == key)
    )
    row = result.scalar_one_or_none()
    if row is None:
        from uuid import uuid4

        row = AdminKV(id=str(uuid4()), user_id=GLOBAL_SCOPE, key=key, value_json={"value": bool(value)})
        db.add(row)
    else:
        row.value_json = {"value": bool(value)}


async def all_flags(db: AsyncSession) -> list[dict]:
    """Return every known flag with its current effective value + metadata."""
    result = await db.execute(
        select(AdminKV.key, AdminKV.value_json).where(AdminKV.user_id == GLOBAL_SCOPE)
    )
    stored = {k: v for k, v in result.all()}
    out = []
    for key, meta in FEATURE_FLAGS.items():
        raw = stored.get(key)
        if isinstance(raw, dict) and "value" in raw:
            value = bool(raw["value"])
        elif raw is not None:
            value = bool(raw)
        else:
            value = bool(meta["default"])
        out.append(
            {
                "key": key,
                "value": value,
                "default": bool(meta["default"]),
                "description": meta["description"],
                "is_set": raw is not None,
            }
        )
    return out
