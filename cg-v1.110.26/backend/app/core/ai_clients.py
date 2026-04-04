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

DEFAULT_TIMEOUT = 30.0

# Lazy singletons — created on first access
_openai_sync: Optional["openai.OpenAI"] = None
_openai_async: Optional["openai.AsyncOpenAI"] = None
_anthropic_sync: Optional["anthropic.Anthropic"] = None
_anthropic_async: Optional["anthropic.AsyncAnthropic"] = None


def get_openai() -> "openai.OpenAI":
    """Get the shared sync OpenAI client."""
    global _openai_sync
    if _openai_sync is None:
        from openai import OpenAI
        _openai_sync = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=DEFAULT_TIMEOUT,
        )
    return _openai_sync


def get_async_openai() -> "openai.AsyncOpenAI":
    """Get the shared async OpenAI client."""
    global _openai_async
    if _openai_async is None:
        from openai import AsyncOpenAI
        _openai_async = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=DEFAULT_TIMEOUT,
        )
    return _openai_async


def get_anthropic() -> "anthropic.Anthropic":
    """Get the shared sync Anthropic client."""
    global _anthropic_sync
    if _anthropic_sync is None:
        import anthropic
        _anthropic_sync = anthropic.Anthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            timeout=DEFAULT_TIMEOUT,
        )
    return _anthropic_sync


def get_async_anthropic() -> "anthropic.AsyncAnthropic":
    """Get the shared async Anthropic client."""
    global _anthropic_async
    if _anthropic_async is None:
        import anthropic
        _anthropic_async = anthropic.AsyncAnthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            timeout=DEFAULT_TIMEOUT,
        )
    return _anthropic_async
