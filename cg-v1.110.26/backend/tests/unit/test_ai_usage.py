"""Reliability batch 1: AI usage tracking (alert-only)."""

import pytest
import fakeredis.aioredis

from app.core import ai_usage
from app.core.config import settings


@pytest.fixture
def fake_redis(monkeypatch):
    redis = fakeredis.aioredis.FakeRedis(decode_responses=True)

    async def _get_redis():
        return redis

    import app.core.redis_client as redis_client
    monkeypatch.setattr(redis_client, "get_redis", _get_redis)
    return redis


@pytest.mark.asyncio
async def test_record_usage_increments_daily_counters(fake_redis):
    await ai_usage.record_usage("openai", "gpt-4o-mini", 100, 50)
    await ai_usage.record_usage("openai", "gpt-4o-mini", 10, 5)

    day = ai_usage._today()
    assert int(await fake_redis.get(f"ai:usage:{day}:openai:gpt-4o-mini:in")) == 110
    assert int(await fake_redis.get(f"ai:usage:{day}:openai:gpt-4o-mini:out")) == 55
    assert int(await fake_redis.get(f"ai:usage:{day}:total")) == 165


@pytest.mark.asyncio
async def test_budget_alert_fires_once(fake_redis, monkeypatch):
    monkeypatch.setattr(settings, "AI_DAILY_TOKEN_BUDGET", 100)

    captured = []
    monkeypatch.setattr(ai_usage, "capture_error", lambda exc, **kw: captured.append(exc))

    await ai_usage.record_usage("anthropic", "claude-haiku", 80, 30)  # 110 >= 100
    await ai_usage.record_usage("anthropic", "claude-haiku", 10, 10)  # still over

    budget_alerts = [e for e in captured if isinstance(e, ai_usage.AIBudgetExceeded)]
    assert len(budget_alerts) == 1


@pytest.mark.asyncio
async def test_usage_extractors():
    class OpenAIUsage:
        prompt_tokens = 12
        completion_tokens = 7

    class OpenAIResp:
        usage = OpenAIUsage()

    class AnthropicUsage:
        input_tokens = 20
        output_tokens = 9

    class AnthropicResp:
        usage = AnthropicUsage()

    class NoUsage:
        usage = None

    assert ai_usage.extract_openai_usage(OpenAIResp()) == (12, 7)
    assert ai_usage.extract_anthropic_usage(AnthropicResp()) == (20, 9)
    assert ai_usage.extract_openai_usage(NoUsage()) == (0, 0)


@pytest.mark.asyncio
async def test_summary_reports_models_and_budget(fake_redis, monkeypatch):
    monkeypatch.setattr(settings, "AI_DAILY_TOKEN_BUDGET", 0)
    await ai_usage.record_usage("openai", "gpt-4o-mini", 100, 50)

    summary = await ai_usage.get_usage_summary()
    assert summary["available"] is True
    assert summary["total_tokens"] == 150
    assert summary["models"]["openai/gpt-4o-mini"] == {
        "input_tokens": 100,
        "output_tokens": 50,
    }
    assert summary["daily_budget"] is None
    assert summary["budget_exceeded"] is False
