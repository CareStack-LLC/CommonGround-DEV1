"""
Sentry observability helpers for CommonGround.

Provides reusable utilities for:
- AI/LLM call tracing with cost estimation
- External API call spans
- Business context enrichment
- Metrics (counters, gauges, distributions)
- Structured logging to Sentry Logs
"""

import time
import logging
import sentry_sdk
from contextlib import contextmanager
from typing import Optional

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# TRACES / SPANS
# ──────────────────────────────────────────────

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
        start = time.time()
        yield span
        duration_ms = (time.time() - start) * 1000
        span.set_data("ai.duration_ms", round(duration_ms, 1))
        # Emit metric for AI call duration
        metric_distribution("ai.call.duration", duration_ms, tags={
            "provider": provider,
            "model": model,
            "operation": operation,
        })
        metric_increment("ai.calls.total", tags={
            "provider": provider,
            "model": model,
        })


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
        start = time.time()
        yield span
        duration_ms = (time.time() - start) * 1000
        span.set_data("duration_ms", round(duration_ms, 1))
        metric_distribution(f"{service}.api.duration", duration_ms, tags={
            "operation": operation,
        })


@contextmanager
def db_span(operation: str, table: str):
    """
    Create a Sentry span for a custom database operation.

    Usage:
        with db_span("bulk_insert", "audit_logs") as span:
            await db.execute(stmt)
            span.set_data("row_count", 150)
    """
    with sentry_sdk.start_span(
        op="db.query",
        description=f"{operation} on {table}",
    ) as span:
        span.set_data("db.table", table)
        span.set_data("db.operation", operation)
        yield span


# ──────────────────────────────────────────────
# METRICS (SDK 2.44+)
# ──────────────────────────────────────────────

def metric_increment(key: str, value: int = 1, tags: Optional[dict] = None):
    """
    Increment a Sentry counter metric.

    Usage:
        metric_increment("messages.sent", tags={"family_file_id": "abc"})
        metric_increment("login.success")
        metric_increment("aria.blocks", tags={"toxicity": "high"})
    """
    try:
        sentry_sdk.metrics.incr(key, value, tags=tags or {})
    except Exception:
        pass  # Metrics are best-effort


def metric_distribution(key: str, value: float, tags: Optional[dict] = None, unit: str = "millisecond"):
    """
    Record a Sentry distribution metric (for latency, sizes, etc).

    Usage:
        metric_distribution("api.response_time", 142.5)
        metric_distribution("report.pdf_size", 2048, unit="byte")
    """
    try:
        sentry_sdk.metrics.distribution(key, value, tags=tags or {}, unit=unit)
    except Exception:
        pass


def metric_gauge(key: str, value: float, tags: Optional[dict] = None, unit: str = "none"):
    """
    Set a Sentry gauge metric (for current values like queue depth).

    Usage:
        metric_gauge("active_websockets", 42)
        metric_gauge("pending_aria_jobs", len(queue))
    """
    try:
        sentry_sdk.metrics.gauge(key, value, tags=tags or {}, unit=unit)
    except Exception:
        pass


def metric_set(key: str, value: str, tags: Optional[dict] = None):
    """
    Add to a Sentry set metric (for counting unique items).

    Usage:
        metric_set("active_users", user_id)
        metric_set("active_family_files", family_file_id)
    """
    try:
        sentry_sdk.metrics.set(key, value, tags=tags or {})
    except Exception:
        pass


# ──────────────────────────────────────────────
# BUSINESS CONTEXT
# ──────────────────────────────────────────────

def set_business_context(context_name: str, data: dict):
    """Set business context on the current Sentry scope."""
    sentry_sdk.set_context(context_name, data)


def tag_subscription_tier(tier: str):
    """Tag the current scope with the user's subscription tier."""
    sentry_sdk.set_tag("subscription_tier", tier)


def tag_family_file(family_file_id: str):
    """Tag the current scope with the active family file."""
    sentry_sdk.set_tag("family_file_id", family_file_id)


# ──────────────────────────────────────────────
# STRUCTURED LOGGING (SDK 2.35+)
# ──────────────────────────────────────────────

def capture_error(exc: Exception, context: Optional[dict] = None, tags: Optional[dict] = None):
    """
    Capture an exception in Sentry with optional context and tags.

    Usage:
        try:
            do_something()
        except Exception as e:
            capture_error(e, context={"user_id": "abc"}, tags={"service": "aria"})
    """
    try:
        if tags:
            for k, v in tags.items():
                sentry_sdk.set_tag(k, v)
        if context:
            sentry_sdk.set_context("error_context", context)
        sentry_sdk.capture_exception(exc)
    except Exception:
        logger.error(f"Failed to capture error in Sentry: {exc}")


@contextmanager
def safe_operation(operation_name: str, service: str = "unknown", **extra_tags):
    """
    Context manager that captures exceptions to Sentry automatically.

    Usage:
        with safe_operation("generate_report", service="reports", family_file_id="abc"):
            pdf = generate_pdf(...)

    On exception: logs error, captures in Sentry with tags, re-raises.
    """
    try:
        yield
    except Exception as e:
        logger.error(f"{service}.{operation_name} failed: {e}")
        try:
            sentry_sdk.set_tag("service", service)
            sentry_sdk.set_tag("operation", operation_name)
            for k, v in extra_tags.items():
                sentry_sdk.set_tag(k, str(v))
            sentry_sdk.capture_exception(e)
            metric_increment(f"{service}.errors", tags={"operation": operation_name})
        except Exception:
            pass
        raise


def sentry_log(level: str, message: str, **attrs):
    """
    Send a structured log to Sentry Logs (Explore > Logs).

    Usage:
        sentry_log("info", "Agreement activated",
                   family_file_id="abc", agreement_type="custody")
        sentry_log("warning", "ARIA blocked message",
                   user_id="xyz", toxicity_score=0.92)
    """
    try:
        sentry_sdk.logger.log(level, message, **attrs)
    except Exception:
        # Fall back to standard logging if Sentry logs not available
        getattr(logger, level, logger.info)(f"{message} {attrs}")
