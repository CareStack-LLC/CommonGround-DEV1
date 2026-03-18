"""
Sentry observability helpers for CommonGround.

Provides reusable utilities for:
- AI/LLM call tracing with cost estimation
- External API call spans
- Business context enrichment
"""

import sentry_sdk
from contextlib import contextmanager
from typing import Optional


@contextmanager
def ai_span(operation: str, model: str, provider: str = "anthropic"):
    """
    Create a Sentry span for an AI/LLM API call.

    Usage:
        with ai_span("message_analysis", "claude-sonnet-4-5-20250514") as span:
            result = client.messages.create(...)
            span.set_data("input_tokens", result.usage.input_tokens)
            span.set_data("output_tokens", result.usage.output_tokens)
    """
    with sentry_sdk.start_span(
        op=f"ai.{operation}",
        description=f"{provider}:{model}",
    ) as span:
        span.set_data("ai.provider", provider)
        span.set_data("ai.model", model)
        yield span


@contextmanager
def external_api_span(service: str, operation: str):
    """
    Create a Sentry span for an external API call.

    Usage:
        with external_api_span("stripe", "create_customer") as span:
            customer = stripe.Customer.create(...)
            span.set_data("customer_id", customer.id)
    """
    with sentry_sdk.start_span(
        op=f"{service}.api",
        description=operation,
    ) as span:
        span.set_data("service", service)
        yield span


def set_business_context(context_name: str, data: dict):
    """Set business context on the current Sentry scope."""
    sentry_sdk.set_context(context_name, data)


def tag_subscription_tier(tier: str):
    """Tag the current scope with the user's subscription tier."""
    sentry_sdk.set_tag("subscription_tier", tier)
