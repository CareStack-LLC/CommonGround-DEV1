"""
Singleton AI client instances for OpenAI and Anthropic.

Reuse these instead of creating new clients per-request to:
- Share HTTP connection pools (fewer TCP handshakes, less memory)
- Avoid redundant SSL context creation
- Ensure consistent timeout configuration

Usage:
    from app.core.ai_clients import get_openai, get_anthropic, get_async_openai, get_async_anthropic

    client = get_openai()       # Sync OpenAI client
    client = get_anthropic()    # Sync Anthropic client
    client = get_async_openai()       # Async OpenAI client
    client = get_async_anthropic()    # Async Anthropic client
"""

import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 15.0
DEFAULT_MAX_RETRIES = 1

# Lazy singletons — created on first access
_openai_sync: Optional["openai.OpenAI"] = None
_openai_async: Optional["openai.AsyncOpenAI"] = None
_anthropic_sync: Optional["anthropic.Anthropic"] = None
_anthropic_async: Optional["anthropic.AsyncAnthropic"] = None


def _instrument_openai_sync(client) -> None:
    """Wrap chat.completions.create to record token usage (alert-only)."""
    original = client.chat.completions.create

    def create_with_usage(*args, **kwargs):
        response = original(*args, **kwargs)
        try:
            from app.core.ai_usage import extract_openai_usage, record_usage_threadsafe
            tokens_in, tokens_out = extract_openai_usage(response)
            if tokens_in or tokens_out:
                model = kwargs.get("model", "unknown")
                record_usage_threadsafe("openai", model, tokens_in, tokens_out)
        except Exception:
            pass
        return response

    client.chat.completions.create = create_with_usage


def _instrument_openai_async(client) -> None:
    original = client.chat.completions.create

    async def create_with_usage(*args, **kwargs):
        response = await original(*args, **kwargs)
        try:
            import asyncio
            from app.core.ai_usage import extract_openai_usage, record_usage
            tokens_in, tokens_out = extract_openai_usage(response)
            if tokens_in or tokens_out:
                model = kwargs.get("model", "unknown")
                asyncio.create_task(record_usage("openai", model, tokens_in, tokens_out))
        except Exception:
            pass
        return response

    client.chat.completions.create = create_with_usage


def _instrument_anthropic_sync(client) -> None:
    original = client.messages.create

    def create_with_usage(*args, **kwargs):
        response = original(*args, **kwargs)
        try:
            from app.core.ai_usage import extract_anthropic_usage, record_usage_threadsafe
            tokens_in, tokens_out = extract_anthropic_usage(response)
            if tokens_in or tokens_out:
                model = kwargs.get("model", "unknown")
                record_usage_threadsafe("anthropic", model, tokens_in, tokens_out)
        except Exception:
            pass
        return response

    client.messages.create = create_with_usage


def _instrument_anthropic_async(client) -> None:
    original = client.messages.create

    async def create_with_usage(*args, **kwargs):
        response = await original(*args, **kwargs)
        try:
            import asyncio
            from app.core.ai_usage import extract_anthropic_usage, record_usage
            tokens_in, tokens_out = extract_anthropic_usage(response)
            if tokens_in or tokens_out:
                model = kwargs.get("model", "unknown")
                asyncio.create_task(record_usage("anthropic", model, tokens_in, tokens_out))
        except Exception:
            pass
        return response

    client.messages.create = create_with_usage


def get_openai() -> "openai.OpenAI":
    """Get the shared sync OpenAI client."""
    global _openai_sync
    if _openai_sync is None:
        from openai import OpenAI
        _openai_sync = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=DEFAULT_TIMEOUT,
            max_retries=DEFAULT_MAX_RETRIES,
        )
        _instrument_openai_sync(_openai_sync)
    return _openai_sync


def get_async_openai() -> "openai.AsyncOpenAI":
    """Get the shared async OpenAI client."""
    global _openai_async
    if _openai_async is None:
        from openai import AsyncOpenAI
        _openai_async = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=DEFAULT_TIMEOUT,
            max_retries=DEFAULT_MAX_RETRIES,
        )
        _instrument_openai_async(_openai_async)
    return _openai_async


def get_anthropic() -> "anthropic.Anthropic":
    """Get the shared sync Anthropic client."""
    global _anthropic_sync
    if _anthropic_sync is None:
        import anthropic
        _anthropic_sync = anthropic.Anthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            timeout=DEFAULT_TIMEOUT,
            max_retries=DEFAULT_MAX_RETRIES,
        )
        _instrument_anthropic_sync(_anthropic_sync)
    return _anthropic_sync


def get_async_anthropic() -> "anthropic.AsyncAnthropic":
    """Get the shared async Anthropic client."""
    global _anthropic_async
    if _anthropic_async is None:
        import anthropic
        _anthropic_async = anthropic.AsyncAnthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            timeout=DEFAULT_TIMEOUT,
            max_retries=DEFAULT_MAX_RETRIES,
        )
        _instrument_anthropic_async(_anthropic_async)
    return _anthropic_async
