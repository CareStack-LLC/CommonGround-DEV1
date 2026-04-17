"""
ARIA Circuit Breaker

Protects LLM-dependent paths from cascading failures when OpenAI/Anthropic
is slow or returning errors. Under load, a single bad minute upstream
otherwise stalls every V2 analysis for `timeout` seconds before falling
back — enough to starve the worker pool at 300 concurrent users.

Usage:
    from app.services.aria_circuit_breaker import aria_breaker

    if aria_breaker.is_open():
        return None  # skip the LLM call; callers fall through to regex-only

    try:
        result = await run_llm_call()
        aria_breaker.record_success()
        return result
    except Exception:
        aria_breaker.record_failure()
        raise

Or use the decorator:
    @aria_breaker.guard(fallback=None)
    async def my_llm_call(...): ...

Behavior
--------
- Tracks consecutive failures (process-local; no Redis coupling)
- OPEN after FAIL_THRESHOLD consecutive failures
- Stays OPEN for COOLDOWN_SECONDS, then probes with the next call (HALF_OPEN)
- Single HALF_OPEN success closes the breaker; HALF_OPEN failure reopens
- Emits Sentry breadcrumb + structured log on state transitions
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Awaitable, Callable, Optional, TypeVar

from app.utils.sentry_helpers import capture_error

logger = logging.getLogger(__name__)


class _CircuitBreakerOpen(Exception):
    """Synthetic exception used to surface breaker-open events to Sentry."""

T = TypeVar("T")


class BreakerState(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class AriaCircuitBreaker:
    name: str = "aria_llm"
    fail_threshold: int = 3
    cooldown_seconds: float = 30.0
    _state: BreakerState = BreakerState.CLOSED
    _consecutive_failures: int = 0
    _opened_at: float = 0.0
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    @property
    def state(self) -> BreakerState:
        return self._state

    def is_open(self) -> bool:
        """True if calls should be skipped. HALF_OPEN allows a probe."""
        if self._state == BreakerState.CLOSED:
            return False
        if self._state == BreakerState.OPEN:
            if time.monotonic() - self._opened_at >= self.cooldown_seconds:
                self._transition(BreakerState.HALF_OPEN)
                return False
            return True
        return False

    def record_success(self) -> None:
        if self._state == BreakerState.HALF_OPEN:
            self._transition(BreakerState.CLOSED)
        self._consecutive_failures = 0

    def record_failure(self, error: Optional[BaseException] = None) -> None:
        self._consecutive_failures += 1
        if self._state == BreakerState.HALF_OPEN:
            self._trip()
            return
        if self._consecutive_failures >= self.fail_threshold:
            self._trip(error)

    def _trip(self, error: Optional[BaseException] = None) -> None:
        if self._state != BreakerState.OPEN:
            self._state = BreakerState.OPEN
            self._opened_at = time.monotonic()
            err_str = f" last_error={type(error).__name__}: {error}" if error else ""
            logger.error(
                "[ARIA breaker:%s] OPEN after %d consecutive failures — "
                "LLM calls will fast-fail for %.0fs.%s",
                self.name, self._consecutive_failures, self.cooldown_seconds, err_str,
            )
            try:
                synthetic = _CircuitBreakerOpen(
                    f"ARIA circuit breaker opened ({self.name}) after "
                    f"{self._consecutive_failures} consecutive failures"
                )
                capture_error(
                    synthetic,
                    tags={
                        "service": "aria",
                        "breaker": self.name,
                        "consecutive_failures": str(self._consecutive_failures),
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

    async def guarded_call(
        self,
        coro_factory: Callable[[], Awaitable[T]],
        fallback: T,
    ) -> T:
        """Run an async callable through the breaker. Returns fallback if open."""
        if self.is_open():
            return fallback
        try:
            result = await coro_factory()
        except Exception as exc:
            self.record_failure(exc)
            raise
        else:
            self.record_success()
            return result


aria_breaker = AriaCircuitBreaker(
    name="aria_llm",
    fail_threshold=3,
    cooldown_seconds=30.0,
)
