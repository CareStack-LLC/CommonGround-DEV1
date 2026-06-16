"""
AI usage tracking — alert-only cost visibility (reliability batch 1).

Token counts from every OpenAI/Anthropic response are accumulated in Redis
daily counters:

    ai:usage:{YYYYMMDD}:{provider}:{model}:in
    ai:usage:{YYYYMMDD}:{provider}:{model}:out
    ai:usage:{YYYYMMDD}:total          (in + out, across providers)

Keys carry a 7-day TTL. When settings.AI_DAILY_TOKEN_BUDGET > 0 and the
daily total crosses it, a synthetic AIBudgetExceeded is captured to Sentry
once per day (Redis SETNX dedupe).

IMPORTANT: tracking is alert-only. AI calls are NEVER blocked here — the
child-safety ARIA paths must not be silently disabled by a cost cap.

Recording is best-effort and fire-and-forget; failures never propagate to
the calling AI path.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from app.core.config import settings
from app.utils.sentry_helpers import capture_error, metric_increment

logger = logging.getLogger(__name__)

_TTL_SECONDS = 7 * 24 * 3600


class AIBudgetExceeded(Exception):
    """Synthetic exception for Sentry when the daily token budget is crossed."""


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d")


async def record_usage(
    provider: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
) -> None:
    """Accumulate token usage in Redis and fire the budget alert if crossed."""
    try:
        metric_increment(
            "ai.tokens", value=int(input_tokens + output_tokens),
            tags={"provider": provider, "model": model},
        )
    except Exception:
        pass

    try:
        from app.core.redis_client import get_redis
        redis = await get_redis()
        if redis is None:
            return

        day = _today()
        prefix = f"ai:usage:{day}"
        in_key = f"{prefix}:{provider}:{model}:in"
        out_key = f"{prefix}:{provider}:{model}:out"
        total_key = f"{prefix}:total"

        await redis.incrby(in_key, int(input_tokens))
        await redis.incrby(out_key, int(output_tokens))
        total = int(await redis.incrby(total_key, int(input_tokens + output_tokens)))
        # Refresh TTLs (cheap; avoids tracking first-write state)
        await redis.expire(in_key, _TTL_SECONDS)
        await redis.expire(out_key, _TTL_SECONDS)
        await redis.expire(total_key, _TTL_SECONDS)

        budget = int(getattr(settings, "AI_DAILY_TOKEN_BUDGET", 0) or 0)
        if budget > 0 and total >= budget:
            alerted = await redis.set(
                f"{prefix}:budget_alerted", "1", nx=True, ex=_TTL_SECONDS
            )
            if alerted:
                logger.error(
                    "AI daily token budget exceeded: %d >= %d (alert-only, "
                    "calls are NOT blocked)", total, budget,
                )
                capture_error(
                    AIBudgetExceeded(
                        f"Daily AI token usage {total} crossed budget {budget}"
                    ),
                    tags={"service": "ai_usage", "day": day},
                )
    except Exception as exc:
        logger.debug("ai_usage.record_usage failed (non-fatal): %s", exc)


def record_usage_threadsafe(
    provider: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
) -> None:
    """Best-effort recording from sync code.

    If an event loop is running on this thread (sync client called from an
    async endpoint), schedule the async recorder; otherwise fall back to the
    Sentry metric only.
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop is not None:
        try:
            loop.create_task(record_usage(provider, model, input_tokens, output_tokens))
            return
        except Exception:
            pass
    try:
        metric_increment(
            "ai.tokens", value=int(input_tokens + output_tokens),
            tags={"provider": provider, "model": model},
        )
    except Exception:
        pass


def extract_openai_usage(response) -> tuple[int, int]:
    """(input_tokens, output_tokens) from an OpenAI response, or (0, 0)."""
    usage = getattr(response, "usage", None)
    if not usage:
        return (0, 0)
    return (
        int(getattr(usage, "prompt_tokens", 0) or 0),
        int(getattr(usage, "completion_tokens", 0) or 0),
    )


def extract_anthropic_usage(response) -> tuple[int, int]:
    """(input_tokens, output_tokens) from an Anthropic response, or (0, 0)."""
    usage = getattr(response, "usage", None)
    if not usage:
        return (0, 0)
    return (
        int(getattr(usage, "input_tokens", 0) or 0),
        int(getattr(usage, "output_tokens", 0) or 0),
    )


async def get_usage_summary(day: str | None = None) -> dict:
    """Read the day's counters for the admin dashboard."""
    from app.core.redis_client import get_redis

    day = day or _today()
    prefix = f"ai:usage:{day}"
    summary: dict = {"day": day, "total_tokens": 0, "models": {}, "available": False}

    redis = await get_redis()
    if redis is None:
        return summary
    try:
        summary["available"] = True
        total = await redis.get(f"{prefix}:total")
        summary["total_tokens"] = int(total or 0)
        cursor = 0
        while True:
            cursor, keys = await redis.scan(cursor, match=f"{prefix}:*:*:*", count=200)
            for key in keys:
                # ai:usage:{day}:{provider}:{model}:{in|out}
                parts = key.split(":")
                if len(parts) < 6:
                    continue
                provider, model, direction = parts[3], ":".join(parts[4:-1]), parts[-1]
                if direction not in ("in", "out"):
                    continue
                entry = summary["models"].setdefault(
                    f"{provider}/{model}", {"input_tokens": 0, "output_tokens": 0}
                )
                value = int(await redis.get(key) or 0)
                if direction == "in":
                    entry["input_tokens"] += value
                else:
                    entry["output_tokens"] += value
            if cursor == 0:
                break
        budget = int(getattr(settings, "AI_DAILY_TOKEN_BUDGET", 0) or 0)
        summary["daily_budget"] = budget or None
        summary["budget_exceeded"] = bool(
            budget and summary["total_tokens"] >= budget
        )
    except Exception as exc:
        logger.warning("ai_usage.get_usage_summary failed: %s", exc)
    return summary
