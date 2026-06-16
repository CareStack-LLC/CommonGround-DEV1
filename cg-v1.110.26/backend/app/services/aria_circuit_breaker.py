"""
ARIA Circuit Breaker

Protects LLM-dependent paths from cascading failures when OpenAI/Anthropic
is slow or returning errors. Under load, a single bad minute upstream
otherwise stalls every V2 analysis for `timeout` seconds before falling
back — enough to starve the worker pool at 300 concurrent users.

Usage:
    from app.services.aria_circuit_breaker import aria_breaker

    if await aria_breaker.is_open():
        return None  # skip the LLM call; callers fall through to regex-only

    try:
        result = await run_llm_call()
        await aria_breaker.record_success()
        return result
    except Exception:
        await aria_breaker.record_failure()
        raise

Behavior
--------
- State is shared across instances via Redis (hash aria:breaker:{name});
  failures recorded by one web instance open the breaker for all of them,
  and the state survives restarts (10-min TTL self-heals stale state).
- Falls back to process-local tracking when Redis is unavailable
  (consistent with the codebase's fail-open Redis semantics).
- OPEN after FAIL_THRESHOLD consecutive failures
- Stays OPEN for COOLDOWN_SECONDS, then probes with the next call (HALF_OPEN)
- Single HALF_OPEN success closes the breaker; HALF_OPEN failure reopens
- Remote reads are cached in-process for ~1s to avoid a Redis round-trip
  per message under load.
- Emits Sentry breadcrumb + structured log on state transitions
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from enum import Enum
from typing import Awaitable, Callable, Optional, Tuple, TypeVar

from app.utils.sentry_helpers import capture_error

logger = logging.getLogger(__name__)


class _CircuitBreakerOpen(Exception):
    """Synthetic exception used to surface breaker-open events to Sentry."""

T = TypeVar("T")

_REDIS_TTL_SECONDS = 600
_READ_CACHE_SECONDS = 1.0


class BreakerState(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class AriaCircuitBreaker:
    name: str = "aria_llm"
    fail_threshold: int = 3
    cooldown_seconds: float = 30.0
    # Process-local mirror — authoritative only when Redis is down.
    _state: BreakerState = BreakerState.CLOSED
    _consecutive_failures: int = 0
    _opened_at: float = 0.0
    # 1s read cache of remote (state, opened_at).
    _remote_cache: Tuple[str, float] = (BreakerState.CLOSED.value, 0.0)
    _remote_read_ts: float = 0.0

    # ------------------------------------------------------------------
    # Redis helpers
    # ------------------------------------------------------------------

    @property
    def state(self) -> BreakerState:
        return self._state

    def _key(self) -> str:
        return f"aria:breaker:{self.name}"

    async def _redis(self):
        try:
            from app.core.redis_client import get_redis
            return await get_redis()
        except Exception:
            return None

    def _invalidate_read_cache(self) -> None:
        self._remote_read_ts = 0.0

    # ------------------------------------------------------------------
    # Public API (async — state may live in Redis)
    # ------------------------------------------------------------------

    async def is_open(self) -> bool:
        """True if calls should be skipped. HALF_OPEN allows a probe."""
        redis = await self._redis()
        if redis is None:
            return self._local_is_open()

        now = time.time()
        if now - self._remote_read_ts < _READ_CACHE_SECONDS:
            state, opened_at = self._remote_cache
        else:
            try:
                data = await redis.hgetall(self._key())
            except Exception:
                return self._local_is_open()
            state = data.get("state", BreakerState.CLOSED.value)
            try:
                opened_at = float(data.get("opened_at") or 0.0)
            except (TypeError, ValueError):
                opened_at = 0.0
            self._remote_cache = (state, opened_at)
            self._remote_read_ts = now

        if state == BreakerState.OPEN.value:
            if now - opened_at >= self.cooldown_seconds:
                try:
                    await redis.hset(self._key(), "state", BreakerState.HALF_OPEN.value)
                    await redis.expire(self._key(), _REDIS_TTL_SECONDS)
                except Exception:
                    pass
                self._remote_cache = (BreakerState.HALF_OPEN.value, opened_at)
                self._transition(BreakerState.HALF_OPEN)
                return False
            # Keep the local mirror in sync so a Redis outage mid-open
            # doesn't silently close the breaker.
            self._state = BreakerState.OPEN
            return True

        if state == BreakerState.HALF_OPEN.value:
            self._state = BreakerState.HALF_OPEN
            return False

        self._state = BreakerState.CLOSED
        return False

    async def record_success(self) -> None:
        was_half_open = self._state == BreakerState.HALF_OPEN
        self._consecutive_failures = 0
        if was_half_open:
            self._transition(BreakerState.CLOSED)
        else:
            self._state = BreakerState.CLOSED

        redis = await self._redis()
        if redis is None:
            return
        try:
            await redis.hset(
                self._key(),
                mapping={"state": BreakerState.CLOSED.value, "failures": 0},
            )
            await redis.expire(self._key(), _REDIS_TTL_SECONDS)
            self._invalidate_read_cache()
        except Exception:
            pass

    async def record_failure(self, error: Optional[BaseException] = None) -> None:
        self._consecutive_failures += 1

        redis = await self._redis()
        if redis is None:
            self._local_record_failure(error)
            return

        try:
            key = self._key()
            failures = int(await redis.hincrby(key, "failures", 1))
            state = await redis.hget(key, "state") or BreakerState.CLOSED.value
            if state == BreakerState.HALF_OPEN.value or failures >= self.fail_threshold:
                await redis.hset(
                    key,
                    mapping={"state": BreakerState.OPEN.value, "opened_at": time.time()},
                )
                self._trip(error, failures=failures)
            await redis.expire(key, _REDIS_TTL_SECONDS)
            self._invalidate_read_cache()
        except Exception:
            self._local_record_failure(error)

    async def guarded_call(
        self,
        coro_factory: Callable[[], Awaitable[T]],
        fallback: T,
    ) -> T:
        """Run an async callable through the breaker. Returns fallback if open."""
        if await self.is_open():
            return fallback
        try:
            result = await coro_factory()
        except Exception as exc:
            await self.record_failure(exc)
            raise
        else:
            await self.record_success()
            return result

    # ------------------------------------------------------------------
    # Process-local fallback (original behavior, used when Redis is down)
    # ------------------------------------------------------------------

    def _local_is_open(self) -> bool:
        if self._state == BreakerState.CLOSED:
            return False
        if self._state == BreakerState.OPEN:
            if time.time() - self._opened_at >= self.cooldown_seconds:
                self._transition(BreakerState.HALF_OPEN)
                return False
            return True
        return False

    def _local_record_failure(self, error: Optional[BaseException] = None) -> None:
        if self._state == BreakerState.HALF_OPEN:
            self._trip(error)
            return
        if self._consecutive_failures >= self.fail_threshold:
            self._trip(error)

    def _trip(self, error: Optional[BaseException] = None, failures: Optional[int] = None) -> None:
        count = failures if failures is not None else self._consecutive_failures
        if self._state != BreakerState.OPEN:
            self._state = BreakerState.OPEN
            self._opened_at = time.time()
            err_str = f" last_error={type(error).__name__}: {error}" if error else ""
            logger.error(
                "[ARIA breaker:%s] OPEN after %d consecutive failures — "
                "LLM calls will fast-fail for %.0fs.%s",
                self.name, count, self.cooldown_seconds, err_str,
            )
            try:
                synthetic = _CircuitBreakerOpen(
                    f"ARIA circuit breaker opened ({self.name}) after "
                    f"{count} consecutive failures"
                )
                capture_error(
                    synthetic,
                    tags={
                        "service": "aria",
                        "breaker": self.name,
                        "consecutive_failures": str(count),
                    },
                )
            except Exception:
                pass

    def _transition(self, new_state: BreakerState) -> None:
        prev = self._state
        self._state = new_state
        if new_state == BreakerState.HALF_OPEN:
            logger.warning("[ARIA breaker:%s] cooldown elapsed, HALF_OPEN probe", self.name)
        elif new_state == BreakerState.CLOSED and prev != BreakerState.CLOSED:
            logger.info("[ARIA breaker:%s] probe succeeded, CLOSED (recovered)", self.name)
            self._consecutive_failures = 0


aria_breaker = AriaCircuitBreaker(
    name="aria_llm",
    fail_threshold=3,
    cooldown_seconds=30.0,
)
