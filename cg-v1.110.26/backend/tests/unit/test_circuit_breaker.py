"""Reliability batch 1: Redis-backed ARIA circuit breaker.

Two breaker instances simulate two web workers sharing one Redis: failures
recorded on instance A must open the breaker for instance B, cooldown must
move OPEN -> HALF_OPEN, and a Redis outage must fall back to the original
process-local behavior.
"""

import time

import pytest
import fakeredis.aioredis

from app.services.aria_circuit_breaker import AriaCircuitBreaker, BreakerState


@pytest.fixture
def fake_redis(monkeypatch):
    redis = fakeredis.aioredis.FakeRedis(decode_responses=True)

    async def _get_redis():
        return redis

    import app.core.redis_client as redis_client
    monkeypatch.setattr(redis_client, "get_redis", _get_redis)
    return redis


def _breaker(name="test_breaker"):
    return AriaCircuitBreaker(name=name, fail_threshold=3, cooldown_seconds=30.0)


@pytest.mark.asyncio
async def test_failures_on_one_instance_open_breaker_for_other(fake_redis):
    a = _breaker()
    b = _breaker()

    assert not await b.is_open()
    for _ in range(3):
        await a.record_failure(RuntimeError("llm down"))

    # b reads shared state (bypass its 1s read cache by resetting it)
    b._invalidate_read_cache()
    assert await b.is_open() is True


@pytest.mark.asyncio
async def test_cooldown_transitions_to_half_open_then_closes(fake_redis):
    a = _breaker()
    for _ in range(3):
        await a.record_failure(RuntimeError("boom"))
    a._invalidate_read_cache()
    assert await a.is_open() is True

    # Rewind opened_at past the cooldown window
    await fake_redis.hset("aria:breaker:test_breaker", "opened_at", time.time() - 31)
    a._invalidate_read_cache()
    assert await a.is_open() is False  # HALF_OPEN probe allowed
    assert a.state == BreakerState.HALF_OPEN

    await a.record_success()
    a._invalidate_read_cache()
    assert await a.is_open() is False
    assert (await fake_redis.hget("aria:breaker:test_breaker", "state")) == "closed"


@pytest.mark.asyncio
async def test_half_open_failure_reopens(fake_redis):
    a = _breaker()
    for _ in range(3):
        await a.record_failure(RuntimeError("boom"))
    await fake_redis.hset("aria:breaker:test_breaker", "opened_at", time.time() - 31)
    a._invalidate_read_cache()
    assert await a.is_open() is False  # half-open

    await a.record_failure(RuntimeError("still down"))
    a._invalidate_read_cache()
    assert await a.is_open() is True


@pytest.mark.asyncio
async def test_redis_down_falls_back_to_local(monkeypatch):
    async def _no_redis():
        return None

    import app.core.redis_client as redis_client
    monkeypatch.setattr(redis_client, "get_redis", _no_redis)

    a = _breaker(name="local_breaker")
    assert not await a.is_open()
    for _ in range(3):
        await a.record_failure(RuntimeError("boom"))
    assert await a.is_open() is True

    # Cooldown elapses locally
    a._opened_at = time.time() - 31
    assert await a.is_open() is False  # half-open probe
    await a.record_success()
    assert not await a.is_open()
