# CommonGround V1 - Monitoring & Observability Guide

**Last Updated:** January 10, 2026
**Version:** 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Logging Architecture](#logging-architecture)
3. [Metrics Collection](#metrics-collection)
4. [Health Checks](#health-checks)
5. [Application Monitoring](#application-monitoring)
6. [Database Monitoring](#database-monitoring)
7. [External Service Monitoring](#external-service-monitoring)
8. [Alerting Configuration](#alerting-configuration)
9. [Dashboard Setup](#dashboard-setup)
10. [Troubleshooting with Logs](#troubleshooting-with-logs)

---

## Overview

### Monitoring Philosophy

CommonGround uses a multi-layered observability approach:

1. **Structured Logging** - JSON-formatted logs with context
2. **Application Metrics** - Business and technical KPIs
3. **Health Endpoints** - Service availability checks
4. **Distributed Tracing** - Request flow tracking
5. **Error Tracking** - Exception monitoring and alerting

### Monitoring Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Logs | Structured JSON + CloudWatch/Logfire | Log aggregation |
| Metrics | Prometheus + Grafana | Metrics visualization |
| Traces | OpenTelemetry | Distributed tracing |
| Errors | Sentry | Exception tracking |
| Uptime | UptimeRobot/Pingdom | Availability monitoring |

---

## Logging Architecture

### Log Format

All logs use structured JSON format:

```json
{
  "timestamp": "2026-01-10T12:00:00.000Z",
  "level": "INFO",
  "logger": "commonground.api",
  "message": "Request processed",
  "request_id": "req_abc123xyz",
  "user_id": "usr_def456",
  "path": "/api/v1/messages/",
  "method": "POST",
  "status_code": 201,
  "duration_ms": 145,
  "metadata": {
    "case_id": "case_ghi789",
    "message_length": 256,
    "aria_analyzed": true
  }
}
```

### Logger Configuration

```python
# app/core/logging.py

import logging
import json
from datetime import datetime
from typing import Any

class JSONFormatter(logging.Formatter):
    """Format logs as JSON for structured logging"""

    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }

        # Add extra fields
        for key in ['request_id', 'user_id', 'case_id', 'duration_ms',
                    'status_code', 'path', 'method', 'error_code']:
            if hasattr(record, key):
                log_obj[key] = getattr(record, key)

        # Add exception info
        if record.exc_info:
            log_obj['exception'] = self.formatException(record.exc_info)

        # Add metadata
        if hasattr(record, 'metadata'):
            log_obj['metadata'] = record.metadata

        return json.dumps(log_obj)

def setup_logging(level: str = "INFO"):
    """Configure application logging"""
    logger = logging.getLogger("commonground")
    logger.setLevel(getattr(logging, level.upper()))

    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)

    # Also configure uvicorn access logs
    uvicorn_logger = logging.getLogger("uvicorn.access")
    uvicorn_logger.handlers = [handler]

    return logger

logger = setup_logging()
```

### Log Levels

| Level | Usage | Examples |
|-------|-------|----------|
| **DEBUG** | Detailed debugging info | Variable values, query results |
| **INFO** | Normal operations | Request completed, job started |
| **WARNING** | Non-critical issues | Rate limit approaching, fallback used |
| **ERROR** | Errors requiring attention | API error, database connection failed |
| **CRITICAL** | System failures | Service down, data corruption |

### Request Logging Middleware

```python
# app/middleware/logging.py

import time
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate request ID
        request_id = str(uuid.uuid4())[:12]
        request.state.request_id = request_id

        # Add to response headers
        start_time = time.time()

        try:
            response = await call_next(request)
            duration_ms = int((time.time() - start_time) * 1000)

            logger.info(
                f"Request completed: {request.method} {request.url.path}",
                extra={
                    "request_id": request_id,
                    "path": request.url.path,
                    "method": request.method,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                    "user_id": getattr(request.state, 'user_id', None)
                }
            )

            response.headers["X-Request-ID"] = request_id
            return response

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(
                f"Request failed: {str(e)}",
                extra={
                    "request_id": request_id,
                    "path": request.url.path,
                    "method": request.method,
                    "duration_ms": duration_ms
                },
                exc_info=True
            )
            raise
```

### Contextual Logging

```python
# Example: Adding context to logs

async def send_message(message: MessageCreate, current_user: User):
    logger.info(
        "Processing message",
        extra={
            "request_id": request.state.request_id,
            "user_id": str(current_user.id),
            "case_id": str(message.case_id),
            "metadata": {
                "message_length": len(message.content),
                "has_attachments": bool(message.attachments)
            }
        }
    )

    # ARIA analysis
    analysis_start = time.time()
    result = await aria_analyze(message.content)

    logger.info(
        "ARIA analysis complete",
        extra={
            "request_id": request.state.request_id,
            "metadata": {
                "toxicity_score": result.get("toxicity_score"),
                "analysis_duration_ms": int((time.time() - analysis_start) * 1000),
                "fallback_used": result.get("fallback_used", False)
            }
        }
    )
```

---

## Metrics Collection

### Application Metrics

```python
# app/core/metrics.py

from prometheus_client import Counter, Histogram, Gauge, generate_latest
from prometheus_client import CONTENT_TYPE_LATEST
from fastapi import Response

# Request metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# Business metrics
MESSAGES_SENT = Counter(
    'messages_sent_total',
    'Total messages sent',
    ['case_id', 'analyzed']
)

ARIA_INTERVENTIONS = Counter(
    'aria_interventions_total',
    'ARIA intervention count',
    ['type', 'user_action']
)

ACTIVE_CASES = Gauge(
    'active_cases',
    'Number of active cases'
)

ACTIVE_USERS = Gauge(
    'active_users',
    'Number of active users (24h)',
)

# External service metrics
AI_REQUEST_LATENCY = Histogram(
    'ai_request_duration_seconds',
    'AI service request latency',
    ['service', 'operation'],
    buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0]
)

AI_FALLBACK_COUNT = Counter(
    'ai_fallback_total',
    'AI fallback activations',
    ['primary_service', 'fallback_service']
)

# Database metrics
DB_QUERY_LATENCY = Histogram(
    'db_query_duration_seconds',
    'Database query latency',
    ['operation', 'table'],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0]
)

DB_CONNECTION_POOL = Gauge(
    'db_connection_pool_size',
    'Database connection pool size',
    ['state']  # available, in_use
)
```

### Metrics Endpoint

```python
# app/api/v1/endpoints/metrics.py

from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from fastapi import APIRouter, Response

router = APIRouter()

@router.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
```

### Metrics Middleware

```python
# app/middleware/metrics.py

import time
from starlette.middleware.base import BaseHTTPMiddleware

class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.time()

        response = await call_next(request)

        duration = time.time() - start_time
        endpoint = request.url.path

        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=endpoint,
            status=response.status_code
        ).inc()

        REQUEST_LATENCY.labels(
            method=request.method,
            endpoint=endpoint
        ).observe(duration)

        return response
```

### Key Metrics to Track

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `http_requests_total` | Counter | Total HTTP requests | N/A |
| `http_request_duration_seconds` | Histogram | Request latency | p99 > 2s |
| `messages_sent_total` | Counter | Messages sent | N/A |
| `aria_interventions_total` | Counter | ARIA interventions | Rate spike |
| `active_cases` | Gauge | Active cases | N/A |
| `ai_request_duration_seconds` | Histogram | AI service latency | p99 > 10s |
| `ai_fallback_total` | Counter | AI fallbacks | > 10/min |
| `db_query_duration_seconds` | Histogram | DB query latency | p99 > 500ms |
| `error_rate` | Derived | Error percentage | > 1% |

---

## Health Checks

### Health Endpoint

```python
# app/api/v1/endpoints/health.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import httpx
from datetime import datetime

from app.core.database import get_db
from app.core.config import settings

router = APIRouter()

@router.get("/health")
async def health_check():
    """Basic health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": settings.VERSION
    }

@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Readiness check with dependency verification"""
    checks = {
        "database": await check_database(db),
        "redis": await check_redis(),
        "external_services": await check_external_services()
    }

    overall_status = "healthy" if all(
        c["status"] == "healthy" for c in checks.values()
    ) else "unhealthy"

    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "checks": checks
    }

@router.get("/health/live")
async def liveness_check():
    """Liveness check - is the process running?"""
    return {"status": "alive"}

async def check_database(db: AsyncSession) -> dict:
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "latency_ms": 5}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

async def check_redis() -> dict:
    try:
        # Implement Redis health check
        return {"status": "healthy", "latency_ms": 2}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

async def check_external_services() -> dict:
    services = {}

    # Anthropic API
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("https://api.anthropic.com/v1/health")
            services["anthropic"] = {
                "status": "healthy" if response.status_code == 200 else "degraded"
            }
    except:
        services["anthropic"] = {"status": "unhealthy"}

    # Daily.co
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("https://api.daily.co/v1/health")
            services["daily"] = {
                "status": "healthy" if response.status_code == 200 else "degraded"
            }
    except:
        services["daily"] = {"status": "unhealthy"}

    return services
```

### Health Check Response Examples

**Healthy Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-10T12:00:00.000Z",
  "checks": {
    "database": {"status": "healthy", "latency_ms": 5},
    "redis": {"status": "healthy", "latency_ms": 2},
    "external_services": {
      "anthropic": {"status": "healthy"},
      "daily": {"status": "healthy"}
    }
  }
}
```

**Degraded Response:**
```json
{
  "status": "unhealthy",
  "timestamp": "2026-01-10T12:00:00.000Z",
  "checks": {
    "database": {"status": "healthy", "latency_ms": 5},
    "redis": {"status": "unhealthy", "error": "Connection refused"},
    "external_services": {
      "anthropic": {"status": "degraded"},
      "daily": {"status": "healthy"}
    }
  }
}
```

---

## Application Monitoring

### Sentry Integration

```python
# app/core/sentry.py

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration

def init_sentry():
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release=f"commonground@{settings.VERSION}",
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
            RedisIntegration(),
            HttpxIntegration()
        ],
        traces_sample_rate=0.1,  # 10% of transactions
        profiles_sample_rate=0.1,

        # Filtering
        before_send=filter_sensitive_data,
        before_breadcrumb=filter_breadcrumbs
    )

def filter_sensitive_data(event, hint):
    """Remove sensitive data before sending to Sentry"""

    # Filter request data
    if 'request' in event and 'data' in event['request']:
        sensitive_fields = ['password', 'token', 'secret', 'api_key']
        for field in sensitive_fields:
            if field in event['request']['data']:
                event['request']['data'][field] = '[REDACTED]'

    # Filter headers
    if 'request' in event and 'headers' in event['request']:
        if 'authorization' in event['request']['headers']:
            event['request']['headers']['authorization'] = '[REDACTED]'

    return event

def filter_breadcrumbs(crumb, hint):
    """Filter breadcrumbs for sensitive info"""
    if crumb.get('category') == 'http':
        if 'data' in crumb:
            crumb['data'] = '[FILTERED]'
    return crumb
```

### Custom Error Context

```python
# Adding context to Sentry errors

from sentry_sdk import set_user, set_context, set_tag

async def process_message(message: MessageCreate, current_user: User):
    # Set user context
    set_user({
        "id": str(current_user.id),
        "email": current_user.email
    })

    # Set additional context
    set_context("message", {
        "case_id": str(message.case_id),
        "length": len(message.content),
        "has_attachments": bool(message.attachments)
    })

    # Set tags for filtering
    set_tag("case_id", str(message.case_id))
    set_tag("feature", "messaging")

    try:
        result = await aria_analyze(message.content)
    except Exception as e:
        # Error will be sent to Sentry with all context
        raise
```

### Performance Monitoring

```python
# app/core/tracing.py

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter

def setup_tracing():
    provider = TracerProvider()

    # Jaeger exporter for distributed tracing
    jaeger_exporter = JaegerExporter(
        agent_host_name=settings.JAEGER_HOST,
        agent_port=settings.JAEGER_PORT,
    )

    provider.add_span_processor(
        BatchSpanProcessor(jaeger_exporter)
    )

    trace.set_tracer_provider(provider)

    return trace.get_tracer(__name__)

tracer = setup_tracing()

# Usage in code
async def process_message(message: MessageCreate):
    with tracer.start_as_current_span("process_message") as span:
        span.set_attribute("case_id", str(message.case_id))

        with tracer.start_as_current_span("aria_analysis"):
            result = await aria_analyze(message.content)
            span.set_attribute("toxicity_score", result.get("toxicity_score"))

        with tracer.start_as_current_span("save_message"):
            saved = await save_to_database(message, result)

        return saved
```

---

## Database Monitoring

### Query Performance Logging

```python
# app/core/database.py

from sqlalchemy import event
import time
import logging

logger = logging.getLogger("commonground.db")

@event.listens_for(engine.sync_engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault('query_start_time', []).append(time.time())

@event.listens_for(engine.sync_engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    start_time = conn.info['query_start_time'].pop()
    duration = time.time() - start_time

    # Log slow queries
    if duration > 0.1:  # 100ms threshold
        logger.warning(
            "Slow query detected",
            extra={
                "duration_ms": int(duration * 1000),
                "query": statement[:200],  # First 200 chars
                "parameters": str(parameters)[:100]
            }
        )

    # Record metrics
    DB_QUERY_LATENCY.labels(
        operation=context.statement.split()[0] if context.statement else "UNKNOWN",
        table="unknown"  # Parse from query if needed
    ).observe(duration)
```

### Connection Pool Monitoring

```python
# app/core/database.py

from sqlalchemy.pool import QueuePool

def monitor_pool():
    """Monitor connection pool status"""
    pool = engine.pool

    DB_CONNECTION_POOL.labels(state="available").set(pool.size() - pool.checkedout())
    DB_CONNECTION_POOL.labels(state="in_use").set(pool.checkedout())

    if pool.checkedout() > pool.size() * 0.8:
        logger.warning(
            "Connection pool near capacity",
            extra={
                "pool_size": pool.size(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow()
            }
        )
```

### Database Health Metrics

| Metric | Query | Threshold |
|--------|-------|-----------|
| Active connections | `SELECT count(*) FROM pg_stat_activity` | > 80% pool |
| Slow queries | Queries > 500ms | Any |
| Lock waits | `SELECT * FROM pg_locks` | > 0 blocked |
| Table bloat | `pg_stat_user_tables` | > 20% |
| Index usage | `pg_stat_user_indexes` | < 90% |

---

## External Service Monitoring

### AI Service Monitoring

```python
# app/services/aria.py

import time
from functools import wraps

def monitor_ai_call(service: str, operation: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()

            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time

                AI_REQUEST_LATENCY.labels(
                    service=service,
                    operation=operation
                ).observe(duration)

                logger.info(
                    f"{service} API call completed",
                    extra={
                        "service": service,
                        "operation": operation,
                        "duration_ms": int(duration * 1000)
                    }
                )

                return result

            except Exception as e:
                duration = time.time() - start_time

                logger.error(
                    f"{service} API call failed",
                    extra={
                        "service": service,
                        "operation": operation,
                        "duration_ms": int(duration * 1000),
                        "error": str(e)
                    }
                )
                raise

        return wrapper
    return decorator

@monitor_ai_call("anthropic", "analyze_message")
async def claude_analyze(content: str):
    # Claude API call
    pass

@monitor_ai_call("openai", "analyze_message")
async def openai_analyze(content: str):
    # OpenAI API call
    pass
```

### Fallback Monitoring

```python
async def analyze_with_fallback(content: str):
    """Analyze with monitored fallback chain"""

    try:
        return await claude_analyze(content)
    except Exception as e:
        logger.warning(
            "Claude failed, falling back to OpenAI",
            extra={"error": str(e)}
        )

        AI_FALLBACK_COUNT.labels(
            primary_service="anthropic",
            fallback_service="openai"
        ).inc()

        try:
            return await openai_analyze(content)
        except Exception as e:
            logger.warning(
                "OpenAI failed, falling back to regex",
                extra={"error": str(e)}
            )

            AI_FALLBACK_COUNT.labels(
                primary_service="openai",
                fallback_service="regex"
            ).inc()

            return regex_analyze(content)
```

---

## Alerting Configuration

### Alert Rules

```yaml
# alerting/rules.yaml

groups:
  - name: commonground_alerts
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) /
          sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # High latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint)) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency on {{ $labels.endpoint }}"
          description: "99th percentile latency is {{ $value }}s"

      # AI service degradation
      - alert: AIServiceDegraded
        expr: |
          sum(rate(ai_fallback_total[5m])) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "AI service fallback rate high"
          description: "Fallback rate: {{ $value }}/sec"

      # Database connection pool exhausted
      - alert: DatabasePoolExhausted
        expr: |
          db_connection_pool_size{state="in_use"} /
          (db_connection_pool_size{state="available"} + db_connection_pool_size{state="in_use"}) > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool near exhaustion"
          description: "Pool usage at {{ $value | humanizePercentage }}"

      # Service down
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.job }} has been down for more than 1 minute"
```

### Alert Channels

| Channel | Use Case | Configuration |
|---------|----------|---------------|
| Slack | General alerts | #ops-alerts channel |
| PagerDuty | Critical alerts | On-call rotation |
| Email | Daily summaries | ops@commonground.app |
| SMS | Emergency only | On-call phone |

---

## Dashboard Setup

### Grafana Dashboard Panels

#### 1. Overview Panel
- Request rate (req/sec)
- Error rate (%)
- Average latency (ms)
- Active users (24h)

#### 2. API Performance
- Request latency histogram
- Top 10 slowest endpoints
- Error breakdown by endpoint
- Request volume by method

#### 3. ARIA Analytics
- Messages analyzed/sec
- Intervention rate (%)
- Fallback rate
- Average toxicity score

#### 4. Business Metrics
- Active cases
- Messages sent today
- Agreements created
- Exchange completion rate

#### 5. Infrastructure
- CPU usage
- Memory usage
- Database connections
- External service latency

### Sample Dashboard JSON

```json
{
  "dashboard": {
    "title": "CommonGround Production",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m]))",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
          }
        ],
        "thresholds": [
          {"value": 0.01, "color": "yellow"},
          {"value": 0.05, "color": "red"}
        ]
      },
      {
        "title": "Latency P99",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "P99 Latency"
          }
        ]
      }
    ]
  }
}
```

---

## Troubleshooting with Logs

### Common Log Searches

**Find errors for specific request:**
```bash
grep "req_abc123" /var/log/commonground/app.log | jq '.'
```

**Find all errors in last hour:**
```bash
cat /var/log/commonground/app.log | jq 'select(.level == "ERROR")'
```

**Find slow requests:**
```bash
cat /var/log/commonground/app.log | jq 'select(.duration_ms > 1000)'
```

**Find ARIA fallbacks:**
```bash
cat /var/log/commonground/app.log | jq 'select(.message | contains("fallback"))'
```

**Find user activity:**
```bash
cat /var/log/commonground/app.log | jq 'select(.user_id == "usr_xxx")'
```

### Log Analysis Queries (CloudWatch/Logfire)

**Error rate by endpoint:**
```
fields @timestamp, @message
| filter level = "ERROR"
| stats count(*) by path
| sort count desc
| limit 10
```

**Average latency by endpoint:**
```
fields @timestamp, path, duration_ms
| stats avg(duration_ms) as avg_latency by path
| sort avg_latency desc
```

**ARIA intervention rate:**
```
fields @timestamp
| filter message like /ARIA intervention/
| stats count(*) as interventions by bin(1h)
```

---

## Document Index

| Document | Location | Purpose |
|----------|----------|---------|
| **MONITORING.md** | `/docs/operations/` | This document |
| PERFORMANCE.md | `/docs/operations/` | Performance optimization |
| SECURITY.md | `/docs/operations/` | Security practices |
| ERROR_HANDLING.md | `/docs/errors/` | Error reference |

---

*Last Updated: January 10, 2026*
*Document Version: 1.0.0*
