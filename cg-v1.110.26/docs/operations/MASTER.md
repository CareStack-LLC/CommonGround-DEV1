# Master Documentation: Operations

This document is a consolidation of all documentation files in this directory.

---

## Document: KNOWN_ISSUES.md

# CommonGround V1 - Known Issues & Limitations

**Last Updated:** January 10, 2026
**Version:** 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Critical Issues](#critical-issues)
3. [High Priority Issues](#high-priority-issues)
4. [Medium Priority Issues](#medium-priority-issues)
5. [Low Priority Issues](#low-priority-issues)
6. [Planned Improvements (TODOs)](#planned-improvements-todos)
7. [Feature Limitations](#feature-limitations)
8. [Known Workarounds](#known-workarounds)
9. [Browser Compatibility](#browser-compatibility)
10. [Mobile Considerations](#mobile-considerations)
11. [Issue Reporting](#issue-reporting)

---

## Overview

This document tracks all known issues, limitations, and planned improvements in CommonGround V1. Issues are categorized by severity and status.

### Issue Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| **CRITICAL** | System down, data loss, security vulnerability | Immediate |
| **HIGH** | Major feature broken, significant user impact | 24-48 hours |
| **MEDIUM** | Feature degraded, workaround available | 1 week |
| **LOW** | Minor issue, cosmetic, enhancement | Future release |

### Issue Status

| Status | Icon | Description |
|--------|------|-------------|
| OPEN | 🔴 | Issue confirmed, not yet addressed |
| IN PROGRESS | 🟡 | Actively being worked on |
| FIXED | 🟢 | Fixed, pending deployment |
| DEPLOYED | ✅ | Fix deployed to production |
| WONT FIX | ⚪ | Decision not to fix |
| DEFERRED | 🔵 | Postponed to future release |

---

## Critical Issues

### Currently no critical issues

*All critical issues have been resolved or none currently exist.*

---

## High Priority Issues

### ISSUE-001: Email Notifications Not Implemented

**Status:** 🔵 DEFERRED (V1.1)
**Severity:** HIGH
**Component:** Notifications

**Description:**
Email notifications for case invitations, agreement approvals, and schedule reminders are not functional. Users must manually check the application for updates.

**Impact:**
- Users miss important case invitations
- Agreement approvals delayed
- Exchange reminders not sent
- Reduced user engagement

**Affected Files:**
- `app/services/email.py:448` - TODO: Integrate with SendGrid

**Workaround:**
Users should regularly check the application dashboard for updates.

**Planned Fix:**
Integrate SendGrid for transactional emails in V1.1 release.

**Reference:**
- Backend TODO: `app/services/email.py`
- V1.1 Roadmap: Week 17

---

### ISSUE-002: KidComs Call Notifications Incomplete

**Status:** 🔴 OPEN
**Severity:** HIGH
**Component:** KidComs (Video Calling)

**Description:**
Call notifications to target contacts and parents are not being sent when calls are initiated.

**Impact:**
- Missed calls for children
- Parents unaware of incoming calls
- Reduced feature adoption

**Affected Files:**
- `app/api/v1/endpoints/kidcoms.py:774` - TODO: Send notification to target contact
- `app/api/v1/endpoints/kidcoms.py:1114` - TODO: Send notification to child/parents

**Workaround:**
Coordinate calls via messaging before initiating video calls.

**Planned Fix:**
Implement push notifications and SMS alerts for incoming calls.

---

### ISSUE-003: ARIA Analysis Not Integrated in KidComs

**Status:** 🔴 OPEN
**Severity:** HIGH
**Component:** KidComs, ARIA

**Description:**
ARIA sentiment analysis for video call transcripts is not functional.

**Affected Files:**
- `app/api/v1/endpoints/kidcoms.py:1587` - TODO: Call ARIA for analysis
- `app/api/v1/endpoints/kidcoms.py:1685` - TODO: Integrate with AI for analysis

**Workaround:**
Monitor calls manually; use messaging for sensitive topics.

**Planned Fix:**
Integrate Claude/OpenAI for real-time transcript analysis.

---

## Medium Priority Issues

### ISSUE-010: Agreement PDF Upload Not Implemented

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** Agreements

**Description:**
Generated agreement PDFs are created locally but not uploaded to cloud storage. The `pdf_url` field remains empty.

**Affected Files:**
- `app/services/agreement.py:562` - TODO: Upload PDF to storage and set pdf_url

**Workaround:**
PDFs are generated and returned in the response but not persistently stored. Save locally after generation.

**Planned Fix:**
Integrate Supabase Storage or S3 for PDF persistence.

---

### ISSUE-011: Time Block Recurring Expansion Not Implemented

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** Schedule

**Description:**
Recurring time blocks within a date range are not expanded when querying schedule data.

**Affected Files:**
- `app/services/time_block.py:526` - TODO: Expand recurring blocks within date range

**Workaround:**
Create individual events for each occurrence manually.

**Planned Fix:**
Implement recurrence rule expansion using rrule library.

---

### ISSUE-012: My Circle Email/SMS Invites Not Sent

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** My Circle

**Description:**
When inviting contacts to My Circle, email and SMS notifications are not sent.

**Affected Files:**
- `app/api/v1/endpoints/my_circle.py:568` - TODO: Send email with invite link
- `app/api/v1/endpoints/circle.py:401-420` - TODO: Integrate with SendGrid/Twilio

**Workaround:**
Manually share invite links with contacts.

**Planned Fix:**
Integrate email/SMS service for automated invitations.

---

### ISSUE-013: QuickAccord Notifications Missing

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** QuickAccord

**Description:**
Notifications are not sent to the other parent when a QuickAccord is created or modified.

**Affected Files:**
- `app/services/quick_accord.py:291` - TODO: Send notification to other parent

**Workaround:**
Manually notify co-parent via messaging about pending QuickAccords.

**Planned Fix:**
Add notification triggers for QuickAccord lifecycle events.

---

### ISSUE-014: ARIA Paralegal Notifications Missing

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** ARIA Paralegal

**Description:**
When ARIA Paralegal generates suggestions or requires parent action, notifications are not sent.

**Affected Files:**
- `app/services/aria_paralegal.py:505` - TODO: Send notification to parent

**Workaround:**
Check ARIA Paralegal dashboard regularly for suggestions.

**Planned Fix:**
Implement notification system for ARIA Paralegal events.

---

### ISSUE-015: Court Form Access Code Email Not Sent

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** Court Forms

**Description:**
When court forms are generated, the access code is not emailed to the assigned recipient.

**Affected Files:**
- `app/services/court_form.py:586` - TODO: Send notification email with access code

**Workaround:**
Manually communicate access codes to recipients.

**Planned Fix:**
Integrate email service for automatic access code delivery.

---

### ISSUE-016: ClearFund Monthly Totals Not Implemented

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** ClearFund Analytics

**Description:**
The monthly totals array in ClearFund analytics returns empty.

**Affected Files:**
- `app/api/v1/endpoints/clearfund.py:472` - TODO: Implement monthly_totals

**Workaround:**
Calculate monthly totals manually from individual obligations.

**Planned Fix:**
Aggregate obligation data by month for analytics display.

---

### ISSUE-017: KidComs Favorite Contacts Not Calculated

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** KidComs Analytics

**Description:**
Child dashboard favorite contacts and last session information are not calculated from usage data.

**Affected Files:**
- `app/api/v1/endpoints/kidcoms.py:1779` - TODO: Calculate favorite_contacts
- `app/api/v1/endpoints/kidcoms.py:1783` - TODO: Determine last_session_with

**Workaround:**
None - feature displays empty data.

**Planned Fix:**
Implement call frequency tracking and analysis.

---

## Low Priority Issues

### ISSUE-020: Circle Contact Verification Expiry Not Proper

**Status:** 🔴 OPEN
**Severity:** LOW
**Component:** Circle

**Description:**
Verification expiry for circle contacts is set to current time instead of proper expiry duration.

**Affected Files:**
- `app/api/v1/endpoints/circle.py:420` - TODO: Add proper expiry

**Workaround:**
Manually verify contacts again if expired.

**Planned Fix:**
Set proper 24/48 hour verification expiry windows.

---

### ISSUE-021: Frontend Manual Custody Override Not Implemented

**Status:** 🔴 OPEN
**Severity:** LOW
**Component:** Frontend Dashboard

**Description:**
Backend endpoint for manual custody override from dashboard is not implemented.

**Affected Files:**
- `frontend/app/dashboard/page.tsx:754` - TODO: Implement backend endpoint

**Workaround:**
Use schedule page to modify custody assignments.

**Planned Fix:**
Create quick-override API endpoint for dashboard.

---

### ISSUE-022: Settings Notification API Not Implemented

**Status:** 🔴 OPEN
**Severity:** LOW
**Component:** Frontend Settings

**Description:**
Notification settings page doesn't save preferences to backend.

**Affected Files:**
- `frontend/app/settings/notifications/page.tsx:155` - TODO: Implement actual API call

**Workaround:**
Settings appear to save but are not persisted.

**Planned Fix:**
Implement user preferences API endpoint.

---

### ISSUE-023: Settings Security APIs Not Implemented

**Status:** 🔴 OPEN
**Severity:** LOW
**Component:** Frontend Settings

**Description:**
Security settings (password change, MFA, session management) don't connect to backend.

**Affected Files:**
- `frontend/app/settings/security/page.tsx:107,133,147` - TODO: Implement actual API call

**Workaround:**
Use Supabase dashboard for password reset; MFA not available.

**Planned Fix:**
Implement security management API endpoints.

---

### ISSUE-024: Children Admin/Court Verification Missing

**Status:** 🔴 OPEN
**Severity:** LOW
**Component:** Children Endpoint

**Description:**
Admin and court role verification not implemented for sensitive child operations.

**Affected Files:**
- `app/api/v1/endpoints/children.py:537,557` - TODO: Add admin/court role verification

**Workaround:**
Role verification performed at middleware level only.

**Planned Fix:**
Add endpoint-level role verification for sensitive operations.

---

## Planned Improvements (TODOs)

### Development TODOs

These are tracked improvements that don't impact current functionality:

| Location | Description | Priority |
|----------|-------------|----------|
| `agreement.py:562` | Upload PDF to storage | MEDIUM |
| `time_block.py:526` | Expand recurring blocks | MEDIUM |
| `email.py:448` | Integrate SendGrid | HIGH |
| `aria_agreement.py:151` | Query children names | LOW |
| `court.py:3369` | Implement form logic | MEDIUM |

### Test Suite TODOs

Pending test implementations:

| Location | Description | Status |
|----------|-------------|--------|
| `test_health_checks.py:29` | Database model import | DEFERRED |
| `test_health_checks.py:82` | Redis client tests | DEFERRED |
| `test_health_checks.py:131` | Supabase client tests | DEFERRED |
| `test_health_checks.py:152` | Anthropic client tests | DEFERRED |
| `test_security.py:78` | Full integration test | DEFERRED |

### Seed Data TODOs

| Location | Description | Status |
|----------|-------------|--------|
| `seed_test_data.py:487` | MyTimeCollection family_file_id | PENDING |

---

## Feature Limitations

### ARIA Sentiment Analysis

| Limitation | Description | Impact |
|------------|-------------|--------|
| Three-tier fallback | Claude → OpenAI → Regex | Degraded analysis in fallback |
| Rate limits | 100 requests/minute | May throttle high-volume users |
| Context window | 4000 tokens per message | Very long messages truncated |
| Language support | English only | Non-English messages not analyzed |

### KidComs Video Calling

| Limitation | Description | Impact |
|------------|-------------|--------|
| Recording duration | 60 minutes max | Long calls need restart |
| Participant limit | 2 participants per call | Group calls not supported |
| Browser support | Chrome/Firefox/Safari | Some mobile browsers unsupported |
| Bandwidth requirement | 1.5 Mbps minimum | Poor quality on slow connections |

### ClearFund Financial Tracking

| Limitation | Description | Impact |
|------------|-------------|--------|
| Currency | USD only | International users unsupported |
| Payment integration | Not connected to Stripe | Manual payment recording only |
| Receipt storage | URL-based only | No file upload |
| Split calculations | Fixed percentages | Dynamic splits require new obligation |

### Schedule/TimeBridge

| Limitation | Description | Impact |
|------------|-------------|--------|
| Recurrence rules | Limited iCal support | Complex patterns may not work |
| Timezone handling | UTC storage | Timezone conversion on client |
| Calendar sync | Not implemented | Manual entry only |
| Conflict detection | Basic overlap check | Complex conflicts not detected |

### Court Portal

| Limitation | Description | Impact |
|------------|-------------|--------|
| Court types | Family court only | Other court types unsupported |
| Filing integration | Not connected | Forms require manual filing |
| Jurisdiction | US only | State-specific forms for CA, FL, TX |
| Signature capture | Electronic only | Wet signatures not supported |

---

## Known Workarounds

### Workaround W-001: Manual Email Notifications

**Issue:** Email notifications not sent
**Workaround:**
1. Enable browser notifications for the application
2. Check dashboard daily for updates
3. Use messaging for time-sensitive communication
4. Set phone reminders for scheduled exchanges

### Workaround W-002: PDF Agreement Storage

**Issue:** PDFs not uploaded to storage
**Workaround:**
1. Generate PDF via API
2. Download immediately from response
3. Store locally or in personal cloud
4. Share via email if needed

### Workaround W-003: Circle Invitations

**Issue:** Invite emails not sent
**Workaround:**
1. Create invitation in system
2. Copy invite link manually
3. Send via text/email/messaging app
4. Confirm verification in person if needed

### Workaround W-004: KidComs Call Coordination

**Issue:** Call notifications not sent
**Workaround:**
1. Schedule calls in advance via messaging
2. Send confirmation message before calling
3. Use in-app messaging to alert
4. Establish regular call schedules

### Workaround W-005: Recurring Time Blocks

**Issue:** Recurring blocks not expanded
**Workaround:**
1. Create individual time block events
2. Use bulk creation if available
3. Copy events manually for each occurrence
4. Use external calendar with sync

---

## Browser Compatibility

### Fully Supported

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 90+ | Recommended |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support |
| Edge | 90+ | Full support |

### Partially Supported

| Browser | Version | Limitations |
|---------|---------|-------------|
| Chrome | 80-89 | Video quality reduced |
| Firefox | 78-87 | WebRTC issues |
| Safari | 13 | No video calling |

### Not Supported

| Browser | Reason |
|---------|--------|
| Internet Explorer | End of life |
| Opera Mini | Limited JavaScript |
| UC Browser | WebRTC unsupported |

### Known Browser Issues

| Browser | Issue | Status |
|---------|-------|--------|
| Safari iOS | Video autoplay blocked | WONT FIX (OS limitation) |
| Firefox Private | IndexedDB errors | Workaround available |
| Chrome Mobile | Notification permission | User action required |

---

## Mobile Considerations

### Responsive Design Issues

| Page | Issue | Status |
|------|-------|--------|
| Agreement Builder | Long forms difficult | 🟡 IN PROGRESS |
| Court Forms | PDF preview small | 🔴 OPEN |
| Dashboard | Cards overflow | ✅ FIXED |

### Mobile-Specific Features

| Feature | Status | Notes |
|---------|--------|-------|
| Push notifications | 🔵 DEFERRED | Requires native app |
| Camera access | ✅ WORKING | For receipts/documents |
| GPS for exchanges | ✅ WORKING | Browser permission required |
| Offline mode | ❌ NOT AVAILABLE | Requires PWA implementation |

### Performance on Mobile

| Device Class | Performance | Notes |
|--------------|-------------|-------|
| High-end (iPhone 12+, Pixel 5+) | Excellent | All features work |
| Mid-range | Good | Video may buffer |
| Low-end | Fair | Reduce video quality |

---

## Issue Reporting

### How to Report Issues

1. **Check this document first** for known issues
2. **Search existing issues** in the issue tracker
3. **Gather information:**
   - Browser and version
   - Device type
   - Steps to reproduce
   - Error messages (screenshots)
   - Request ID (if available)

### Report Template

```markdown
## Issue Title

**Severity:** [CRITICAL/HIGH/MEDIUM/LOW]
**Browser:** [Chrome 100, iOS Safari 15, etc.]
**Device:** [Desktop, iPhone 14, Pixel 7, etc.]

### Description
Clear description of the issue

### Steps to Reproduce
1. Go to...
2. Click on...
3. Observe error...

### Expected Behavior
What should happen

### Actual Behavior
What actually happens

### Error Message/Screenshot
[Include if available]

### Request ID
[From error response if available]
```

### Contact

- **GitHub Issues:** [repository issues link]
- **Support Email:** support@commonground.app
- **Status Page:** status.commonground.app

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-10 | Initial documentation |

---

*Last Updated: January 10, 2026*
*Document Version: 1.0.0*

---

## Document: MONITORING.md

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

---

## Document: PERFORMANCE.md

# CommonGround V1 - Performance Optimization Guide

**Last Updated:** January 10, 2026
**Version:** 1.0.0

---

## Table of Contents

1. [Performance Overview](#performance-overview)
2. [Performance Targets](#performance-targets)
3. [Backend Optimization](#backend-optimization)
4. [Database Optimization](#database-optimization)
5. [API Optimization](#api-optimization)
6. [Frontend Optimization](#frontend-optimization)
7. [Caching Strategies](#caching-strategies)
8. [External Service Optimization](#external-service-optimization)
9. [Scaling Strategies](#scaling-strategies)
10. [Performance Testing](#performance-testing)
11. [Troubleshooting Performance Issues](#troubleshooting-performance-issues)

---

## Performance Overview

### Key Performance Principles

1. **Measure First** - Profile before optimizing
2. **Optimize Bottlenecks** - Focus on the slowest components
3. **Cache Aggressively** - Reduce repeated computations
4. **Async Everything** - Non-blocking I/O throughout
5. **Minimize Payloads** - Reduce data transfer

### Performance Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer                          │
│                    (Rate Limiting, SSL Termination)            │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │  App 1  │         │  App 2  │         │  App N  │
    │ (uvicorn)│         │(uvicorn)│         │(uvicorn)│
    └────┬────┘         └────┬────┘         └────┬────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
    ┌────────────────────────┼────────────────────────┐
    │                        │                        │
┌───▼───┐              ┌─────▼─────┐            ┌─────▼─────┐
│ Redis │              │ PostgreSQL │            │  S3/CDN   │
│ Cache │              │  Primary   │            │  Static   │
└───────┘              └─────┬─────┘            └───────────┘
                             │
                       ┌─────▼─────┐
                       │  Replica  │
                       │ (Read)    │
                       └───────────┘
```

---

## Performance Targets

### Response Time SLAs

| Endpoint Category | Target (p50) | Target (p99) | Max |
|-------------------|--------------|--------------|-----|
| Health checks | 5ms | 50ms | 100ms |
| Auth endpoints | 50ms | 200ms | 500ms |
| List endpoints | 100ms | 300ms | 1s |
| CRUD operations | 50ms | 200ms | 500ms |
| AI operations | 500ms | 2s | 5s |
| Export operations | 1s | 5s | 30s |
| WebSocket messages | 10ms | 50ms | 100ms |

### Throughput Targets

| Metric | Target | Peak |
|--------|--------|------|
| Requests/second | 500 | 1000 |
| Concurrent users | 100 | 500 |
| Messages/second | 50 | 200 |
| Database queries/sec | 2000 | 5000 |

### Resource Limits

| Resource | Limit | Alert Threshold |
|----------|-------|-----------------|
| CPU per instance | 2 vCPU | 80% |
| Memory per instance | 4 GB | 85% |
| Database connections | 100 | 80 |
| Redis connections | 50 | 40 |

---

## Backend Optimization

### Async Operations

```python
# ✅ Good: Async database operations
async def get_messages(case_id: str, page: int, limit: int):
    async with get_db() as session:
        result = await session.execute(
            select(Message)
            .where(Message.case_id == case_id)
            .order_by(Message.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        return result.scalars().all()

# ❌ Bad: Synchronous operations blocking event loop
def get_messages_sync(case_id: str):
    with get_db_sync() as session:
        return session.query(Message).filter_by(case_id=case_id).all()
```

### Parallel Operations

```python
import asyncio
from typing import List

async def get_case_dashboard(case_id: str, user_id: str) -> dict:
    """Fetch dashboard data in parallel"""

    # Run independent queries in parallel
    results = await asyncio.gather(
        get_case_details(case_id),
        get_recent_messages(case_id, limit=10),
        get_upcoming_events(case_id, limit=5),
        get_pending_obligations(case_id),
        get_unread_count(case_id, user_id),
        return_exceptions=True
    )

    case_details, messages, events, obligations, unread = results

    return {
        "case": case_details,
        "recent_messages": messages,
        "upcoming_events": events,
        "pending_obligations": obligations,
        "unread_count": unread
    }
```

### Connection Pooling

```python
# app/core/database.py

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool, QueuePool

# Development: Use connection pooling
if settings.ENVIRONMENT == "development":
    engine = create_async_engine(
        settings.DATABASE_URL,
        pool_size=10,           # Base connections
        max_overflow=20,        # Extra connections under load
        pool_timeout=30,        # Wait time for connection
        pool_recycle=1800,      # Recycle connections after 30 min
        pool_pre_ping=True,     # Verify connections are alive
        echo=settings.DEBUG,
    )
else:
    # Production: Same but larger pool
    engine = create_async_engine(
        settings.DATABASE_URL,
        pool_size=20,
        max_overflow=30,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
    )
```

### Lazy Loading vs Eager Loading

```python
# ❌ Bad: N+1 query problem
async def list_cases(user_id: str):
    cases = await session.execute(select(Case))
    for case in cases.scalars():
        # Each access triggers a query
        print(case.participants)  # N additional queries!
        print(case.children)      # N more queries!

# ✅ Good: Eager load related data
from sqlalchemy.orm import selectinload, joinedload

async def list_cases(user_id: str):
    cases = await session.execute(
        select(Case)
        .options(
            selectinload(Case.participants),
            selectinload(Case.children)
        )
        .where(Case.participants.any(user_id=user_id))
    )
    return cases.scalars().all()  # All data in 3 queries total
```

### Response Streaming

```python
from fastapi.responses import StreamingResponse
import json

@router.get("/export/{case_id}/messages")
async def export_messages(case_id: str):
    """Stream large exports to avoid memory issues"""

    async def generate():
        yield "["
        first = True

        async for message in get_messages_cursor(case_id):
            if not first:
                yield ","
            first = False
            yield json.dumps(message.dict())

        yield "]"

    return StreamingResponse(
        generate(),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=messages-{case_id}.json"}
    )
```

---

## Database Optimization

### Index Strategy

```python
# app/models/message.py

from sqlalchemy import Index

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID, primary_key=True)
    case_id = Column(UUID, ForeignKey("cases.id"), nullable=False)
    sender_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)
    thread_id = Column(UUID, nullable=True)

    # Composite indexes for common queries
    __table_args__ = (
        # Messages by case, ordered by time
        Index('ix_messages_case_created', 'case_id', 'created_at'),
        # Unread messages for user
        Index('ix_messages_receiver_unread', 'receiver_id', 'is_read'),
        # Thread lookups
        Index('ix_messages_thread', 'thread_id', 'created_at'),
    )
```

### Query Optimization

```python
# ❌ Bad: Fetching all columns
async def get_message_list(case_id: str):
    return await session.execute(select(Message).where(Message.case_id == case_id))

# ✅ Good: Select only needed columns
async def get_message_list(case_id: str):
    return await session.execute(
        select(
            Message.id,
            Message.content,
            Message.created_at,
            Message.sender_id
        )
        .where(Message.case_id == case_id)
        .order_by(Message.created_at.desc())
        .limit(50)
    )
```

### Pagination Best Practices

```python
# Offset pagination (simple but slow for deep pages)
async def list_paginated_offset(case_id: str, page: int, limit: int):
    offset = (page - 1) * limit
    return await session.execute(
        select(Message)
        .where(Message.case_id == case_id)
        .order_by(Message.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

# Cursor pagination (fast for any page)
async def list_paginated_cursor(case_id: str, cursor: str, limit: int):
    query = select(Message).where(Message.case_id == case_id)

    if cursor:
        # Decode cursor to get last seen created_at
        cursor_time = decode_cursor(cursor)
        query = query.where(Message.created_at < cursor_time)

    results = await session.execute(
        query.order_by(Message.created_at.desc()).limit(limit + 1)
    )

    items = results.scalars().all()
    has_more = len(items) > limit

    return {
        "items": items[:limit],
        "next_cursor": encode_cursor(items[-1].created_at) if has_more else None
    }
```

### Bulk Operations

```python
# ❌ Bad: Individual inserts
async def mark_messages_read(message_ids: List[str]):
    for id in message_ids:
        await session.execute(
            update(Message).where(Message.id == id).values(is_read=True)
        )
    await session.commit()

# ✅ Good: Bulk update
async def mark_messages_read(message_ids: List[str]):
    await session.execute(
        update(Message)
        .where(Message.id.in_(message_ids))
        .values(is_read=True)
    )
    await session.commit()
```

### Database Connection Optimization

```sql
-- PostgreSQL tuning for CommonGround workload
-- /etc/postgresql/15/main/postgresql.conf

-- Memory
shared_buffers = 1GB                    # 25% of RAM
effective_cache_size = 3GB              # 75% of RAM
work_mem = 256MB                        # For complex queries
maintenance_work_mem = 512MB            # For VACUUM, etc.

-- Connections
max_connections = 200
superuser_reserved_connections = 3

-- Write performance
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = 2GB
min_wal_size = 1GB

-- Query planner
random_page_cost = 1.1                  # For SSD
effective_io_concurrency = 200          # For SSD
```

---

## API Optimization

### Response Compression

```python
# app/main.py

from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=500)
```

### Request/Response Optimization

```python
# Use Pydantic with optimized settings
from pydantic import BaseModel, ConfigDict

class MessageResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        # Exclude None values to reduce payload
        exclude_none=True
    )

    id: str
    content: str
    created_at: datetime
    sender_name: str
    attachments: List[str] | None = None
```

### Rate Limiting

```python
# app/middleware/rate_limit.py

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/messages/")
@limiter.limit("60/minute")
async def send_message(...):
    pass

@router.get("/messages/")
@limiter.limit("120/minute")
async def list_messages(...):
    pass
```

### Background Tasks

```python
from fastapi import BackgroundTasks

@router.post("/messages/")
async def send_message(
    message: MessageCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    # Save message immediately
    saved_message = await create_message(db, message)

    # Process non-critical tasks in background
    background_tasks.add_task(
        notify_recipient, saved_message.id
    )
    background_tasks.add_task(
        update_analytics, message.case_id
    )
    background_tasks.add_task(
        log_activity, saved_message
    )

    return saved_message
```

---

## Frontend Optimization

### Bundle Size Optimization

```typescript
// next.config.js
module.exports = {
  // Enable bundle analysis
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html',
        })
      );
    }
    return config;
  },

  // Reduce bundle size
  swcMinify: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};
```

### Dynamic Imports

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const AgreementPDFViewer = dynamic(
  () => import('@/components/agreements/PDFViewer'),
  {
    loading: () => <Skeleton className="h-96" />,
    ssr: false  // Client-side only
  }
);

const VideoCall = dynamic(
  () => import('@/components/kidcoms/VideoCall'),
  { ssr: false }
);
```

### Data Fetching Optimization

```typescript
// Use SWR for efficient data fetching with caching
import useSWR from 'swr';

export function useMessages(caseId: string) {
  const { data, error, mutate } = useSWR(
    `/api/v1/cases/${caseId}/messages`,
    fetcher,
    {
      refreshInterval: 30000,     // Refresh every 30s
      revalidateOnFocus: false,  // Don't refetch on tab focus
      dedupingInterval: 5000,    // Dedupe requests within 5s
    }
  );

  return {
    messages: data,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
}
```

### Optimistic Updates

```typescript
async function sendMessage(content: string) {
  // Optimistically add message to UI
  const optimisticMessage = {
    id: `temp-${Date.now()}`,
    content,
    sender_id: currentUser.id,
    created_at: new Date().toISOString(),
    status: 'sending'
  };

  // Update cache immediately
  mutate(
    `/api/v1/cases/${caseId}/messages`,
    (messages) => [optimisticMessage, ...messages],
    false  // Don't revalidate yet
  );

  try {
    // Send to server
    const response = await api.post(`/cases/${caseId}/messages`, { content });

    // Replace optimistic message with real one
    mutate(
      `/api/v1/cases/${caseId}/messages`,
      (messages) => messages.map(m =>
        m.id === optimisticMessage.id ? response.data : m
      )
    );
  } catch (error) {
    // Rollback on error
    mutate(`/api/v1/cases/${caseId}/messages`);
    throw error;
  }
}
```

### Image Optimization

```typescript
import Image from 'next/image';

// Optimized image component
function Avatar({ src, alt, size = 40 }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      quality={75}
      placeholder="blur"
      blurDataURL="data:image/png;base64,..."
      priority={false}
    />
  );
}
```

---

## Caching Strategies

### Redis Caching Layer

```python
# app/core/cache.py

import redis.asyncio as redis
import json
from typing import Optional, Any
from functools import wraps

redis_client = redis.from_url(settings.REDIS_URL)

async def cache_get(key: str) -> Optional[Any]:
    """Get value from cache"""
    value = await redis_client.get(key)
    if value:
        return json.loads(value)
    return None

async def cache_set(key: str, value: Any, ttl: int = 300):
    """Set value in cache with TTL (default 5 min)"""
    await redis_client.setex(key, ttl, json.dumps(value, default=str))

async def cache_delete(key: str):
    """Delete key from cache"""
    await redis_client.delete(key)

async def cache_delete_pattern(pattern: str):
    """Delete all keys matching pattern"""
    async for key in redis_client.scan_iter(pattern):
        await redis_client.delete(key)
```

### Cache Decorator

```python
def cached(key_prefix: str, ttl: int = 300):
    """Decorator for caching function results"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key
            cache_key = f"{key_prefix}:{':'.join(str(a) for a in args)}"

            # Check cache
            cached_value = await cache_get(cache_key)
            if cached_value is not None:
                return cached_value

            # Execute function
            result = await func(*args, **kwargs)

            # Cache result
            await cache_set(cache_key, result, ttl)

            return result
        return wrapper
    return decorator

# Usage
@cached("case_details", ttl=300)
async def get_case_details(case_id: str):
    return await fetch_case_from_db(case_id)
```

### Cache Invalidation

```python
# Invalidate related caches when data changes

async def update_case(case_id: str, data: CaseUpdate):
    # Update database
    case = await save_case_to_db(case_id, data)

    # Invalidate caches
    await cache_delete(f"case_details:{case_id}")
    await cache_delete_pattern(f"case_list:*")  # All case lists

    return case

async def send_message(case_id: str, message: MessageCreate):
    saved = await save_message_to_db(case_id, message)

    # Invalidate message caches
    await cache_delete(f"messages:{case_id}:*")
    await cache_delete(f"unread_count:{case_id}:*")

    return saved
```

### Caching Strategy by Data Type

| Data Type | TTL | Invalidation | Notes |
|-----------|-----|--------------|-------|
| User profile | 1 hour | On update | Low churn |
| Case details | 5 min | On any case change | Medium churn |
| Message list | 30 sec | On new message | High churn |
| Agreement | 15 min | On update/approval | Low churn |
| Analytics | 1 hour | Scheduled refresh | Computed data |
| Static config | 24 hours | Deploy | Reference data |

---

## External Service Optimization

### AI Service Optimization

```python
# app/services/aria.py

import asyncio
from functools import lru_cache

# Cache common toxicity patterns
@lru_cache(maxsize=1000)
def quick_toxicity_check(content_hash: str, content: str) -> float:
    """Fast regex-based preliminary check"""
    toxic_patterns = [
        (r'\b(hate|kill|die)\b', 0.8),
        (r'!{3,}', 0.3),
        (r'[A-Z]{10,}', 0.2),  # Excessive caps
    ]

    score = 0
    for pattern, weight in toxic_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            score += weight

    return min(score, 1.0)

async def analyze_message(content: str) -> dict:
    """Optimized message analysis"""

    # Quick check first
    content_hash = hashlib.md5(content.encode()).hexdigest()
    quick_score = quick_toxicity_check(content_hash, content)

    # If clearly safe, skip AI
    if quick_score < 0.1:
        return {"is_toxic": False, "toxicity_score": quick_score, "skipped_ai": True}

    # If clearly toxic, skip AI
    if quick_score > 0.8:
        return {"is_toxic": True, "toxicity_score": quick_score, "skipped_ai": True}

    # Use AI for ambiguous cases
    return await claude_analyze(content)
```

### Batch AI Requests

```python
async def analyze_messages_batch(messages: List[str]) -> List[dict]:
    """Batch multiple messages for efficiency"""

    # Group by potential toxicity
    safe_messages = []
    needs_analysis = []

    for i, msg in enumerate(messages):
        score = quick_toxicity_check(msg)
        if score < 0.1:
            safe_messages.append((i, {"is_toxic": False}))
        else:
            needs_analysis.append((i, msg))

    # Batch analyze remaining
    if needs_analysis:
        batch_results = await claude_batch_analyze([m[1] for m in needs_analysis])
        for (i, _), result in zip(needs_analysis, batch_results):
            safe_messages.append((i, result))

    # Sort back to original order
    safe_messages.sort(key=lambda x: x[0])
    return [r[1] for r in safe_messages]
```

### Connection Reuse

```python
# Reuse HTTP clients
from httpx import AsyncClient

# Global client with connection pooling
http_client = AsyncClient(
    timeout=30.0,
    limits=httpx.Limits(
        max_keepalive_connections=20,
        max_connections=100,
        keepalive_expiry=300
    )
)

async def call_external_api(url: str, data: dict):
    return await http_client.post(url, json=data)
```

---

## Scaling Strategies

### Horizontal Scaling

```yaml
# kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: commonground-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: commonground-api
  template:
    spec:
      containers:
      - name: api
        image: commonground/api:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2"
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10
```

### Auto-scaling Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: commonground-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: commonground-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Read Replicas

```python
# app/core/database.py

# Primary for writes
primary_engine = create_async_engine(
    settings.DATABASE_PRIMARY_URL,
    pool_size=10,
    max_overflow=20
)

# Replica for reads
replica_engine = create_async_engine(
    settings.DATABASE_REPLICA_URL,
    pool_size=20,
    max_overflow=40
)

async def get_read_db():
    """Get read-only database session (uses replica)"""
    async with AsyncSession(replica_engine) as session:
        yield session

async def get_write_db():
    """Get write database session (uses primary)"""
    async with AsyncSession(primary_engine) as session:
        yield session
```

---

## Performance Testing

### Load Testing with Locust

```python
# tests/load/locustfile.py

from locust import HttpUser, task, between

class CommonGroundUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        # Login and get token
        response = self.client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "TestPass123!"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    @task(10)
    def get_dashboard(self):
        self.client.get("/api/v1/cases/", headers=self.headers)

    @task(5)
    def get_messages(self):
        self.client.get(
            "/api/v1/messages/?case_id=xxx",
            headers=self.headers
        )

    @task(2)
    def send_message(self):
        self.client.post(
            "/api/v1/messages/",
            json={"case_id": "xxx", "content": "Test message"},
            headers=self.headers
        )

    @task(1)
    def get_schedule(self):
        self.client.get(
            "/api/v1/schedule/?case_id=xxx",
            headers=self.headers
        )
```

### Running Load Tests

```bash
# Run Locust
locust -f tests/load/locustfile.py --host=http://localhost:8000

# Or headless mode
locust -f tests/load/locustfile.py \
    --host=http://localhost:8000 \
    --headless \
    --users=100 \
    --spawn-rate=10 \
    --run-time=5m
```

### Benchmarking Endpoints

```python
# tests/perf/benchmark.py

import asyncio
import aiohttp
import time
import statistics

async def benchmark_endpoint(url: str, token: str, count: int = 100):
    """Benchmark an endpoint"""
    latencies = []

    async with aiohttp.ClientSession() as session:
        for _ in range(count):
            start = time.perf_counter()
            async with session.get(
                url,
                headers={"Authorization": f"Bearer {token}"}
            ) as response:
                await response.read()
            latencies.append((time.perf_counter() - start) * 1000)

    return {
        "count": count,
        "p50": statistics.median(latencies),
        "p95": statistics.quantiles(latencies, n=20)[18],
        "p99": statistics.quantiles(latencies, n=100)[98],
        "min": min(latencies),
        "max": max(latencies),
        "mean": statistics.mean(latencies)
    }
```

---

## Troubleshooting Performance Issues

### Identifying Bottlenecks

```python
# Add profiling middleware
import cProfile
import pstats
import io

@router.get("/debug/profile/{endpoint}")
async def profile_endpoint(endpoint: str):
    """Profile an endpoint for debugging"""
    profiler = cProfile.Profile()
    profiler.enable()

    # Call the endpoint
    result = await call_endpoint(endpoint)

    profiler.disable()

    # Get stats
    stream = io.StringIO()
    stats = pstats.Stats(profiler, stream=stream)
    stats.sort_stats('cumulative')
    stats.print_stats(20)

    return {
        "result": result,
        "profile": stream.getvalue()
    }
```

### Common Performance Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Slow list endpoints | N+1 queries | Use eager loading |
| High memory usage | Loading too much data | Paginate, stream |
| Slow AI responses | API latency | Caching, fallbacks |
| Database timeouts | Connection pool exhaustion | Increase pool, optimize queries |
| High CPU | Synchronous code | Convert to async |

### Debug Slow Queries

```sql
-- Enable slow query logging in PostgreSQL
ALTER SYSTEM SET log_min_duration_statement = 100;  -- Log queries > 100ms
SELECT pg_reload_conf();

-- View slow queries
SELECT
    query,
    calls,
    mean_time,
    total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;
```

---

## Document Index

| Document | Location | Purpose |
|----------|----------|---------|
| **PERFORMANCE.md** | `/docs/operations/` | This document |
| MONITORING.md | `/docs/operations/` | Observability setup |
| SECURITY.md | `/docs/operations/` | Security practices |
| KNOWN_ISSUES.md | `/docs/operations/` | Known issues |

---

*Last Updated: January 10, 2026*
*Document Version: 1.0.0*

---

## Document: SECURITY.md

# CommonGround V1 - Security Practices Guide

**Last Updated:** January 17, 2026
**Version:** 1.5.0
**Security Review:** Completed December 30, 2025

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [API Security](#api-security)
5. [Input Validation & Sanitization](#input-validation--sanitization)
6. [Secure Communications](#secure-communications)
7. [Database Security](#database-security)
8. [Third-Party Services](#third-party-services)
9. [Child Data Protection](#child-data-protection)
10. [Audit & Compliance](#audit--compliance)
11. [Incident Response](#incident-response)
12. [Security Checklist](#security-checklist)

---

## Security Overview

### Security Principles

CommonGround follows these core security principles:

1. **Defense in Depth** - Multiple layers of security controls
2. **Least Privilege** - Minimum necessary access rights
3. **Secure by Default** - Secure configurations out of the box
4. **Fail Securely** - Errors don't expose vulnerabilities
5. **Privacy First** - User data protected at all levels

### Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    WAF / DDoS Protection                 │   │
│  │                   (Cloudflare/AWS WAF)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    TLS 1.3 / HTTPS                       │   │
│  │                   (Certificate Pinning)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Rate Limiting                         │   │
│  │              (Per-user, per-endpoint limits)             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 JWT Authentication                       │   │
│  │            (Access + Refresh Token Flow)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  RBAC Authorization                      │   │
│  │          (Case-level + Feature Permissions)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Input Validation (Pydantic)                 │   │
│  │            + Content Sanitization (Bleach)               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               Parameterized Queries                      │   │
│  │                 (SQLAlchemy ORM)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Encryption at Rest (AES-256)                │   │
│  │           + Encryption in Transit (TLS 1.3)              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Security Status Summary

| Category | Status | Risk Level |
|----------|--------|------------|
| SQL Injection | ✅ Protected | LOW |
| XSS | ✅ Protected | LOW |
| CSRF | ✅ Protected | LOW |
| Authentication | ✅ Strong | LOW |
| Authorization | ✅ Implemented | LOW |
| Data Encryption | ✅ Enabled | LOW |
| Input Validation | ✅ Active | LOW |
| Rate Limiting | ⚠️ Partial | MEDIUM |
| Audit Logging | ✅ Comprehensive | LOW |

---

## Authentication & Authorization

### JWT Token Architecture

```python
# Token structure
{
    "sub": "user_uuid",        # User identifier
    "exp": 1704067200,         # Expiration timestamp
    "iat": 1704063600,         # Issued at timestamp
    "type": "access",          # Token type (access/refresh)
    "jti": "unique_token_id"   # Token identifier for revocation
}

# Token configuration
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
TOKEN_ALGORITHM = "HS256"
```

### Token Security Best Practices

```python
# app/core/security.py

import secrets
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # Adjust based on hardware
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Constant-time password verification"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash password with bcrypt"""
    return pwd_context.hash(password)

def create_access_token(user_id: str, expires_delta: timedelta = None) -> str:
    """Create JWT access token"""
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=30))

    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access",
        "jti": secrets.token_urlsafe(16)
    }

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
```

### Password Requirements

```python
# app/schemas/auth.py

from pydantic import BaseModel, validator
import re

class PasswordPolicy:
    MIN_LENGTH = 12
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True
    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"

def validate_password_strength(password: str) -> str:
    """Validate password meets security requirements"""

    if len(password) < PasswordPolicy.MIN_LENGTH:
        raise ValueError(f"Password must be at least {PasswordPolicy.MIN_LENGTH} characters")

    if PasswordPolicy.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        raise ValueError("Password must contain at least one uppercase letter")

    if PasswordPolicy.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        raise ValueError("Password must contain at least one lowercase letter")

    if PasswordPolicy.REQUIRE_DIGIT and not re.search(r'\d', password):
        raise ValueError("Password must contain at least one digit")

    if PasswordPolicy.REQUIRE_SPECIAL:
        pattern = f'[{re.escape(PasswordPolicy.SPECIAL_CHARS)}]'
        if not re.search(pattern, password):
            raise ValueError("Password must contain at least one special character")

    return password
```

### Role-Based Access Control (RBAC)

```python
# Permission hierarchy
PERMISSIONS = {
    # Case-level permissions
    "case.view": "View case details",
    "case.edit": "Edit case details",
    "case.delete": "Delete case",
    "case.invite": "Invite participants",

    # Message permissions
    "message.send": "Send messages",
    "message.view": "View messages",
    "message.flag": "Flag messages",

    # Agreement permissions
    "agreement.create": "Create agreements",
    "agreement.edit": "Edit agreements",
    "agreement.approve": "Approve agreements",
    "agreement.view": "View agreements",

    # Financial permissions
    "finance.view": "View financial data",
    "finance.create": "Create obligations",
    "finance.approve": "Approve expenses",

    # Schedule permissions
    "schedule.view": "View schedule",
    "schedule.create": "Create events",
    "schedule.checkin": "Check in for exchanges",

    # Child permissions
    "child.view": "View child info",
    "child.edit": "Edit child info",

    # Export permissions
    "export.create": "Create exports",
    "export.view": "View exports",

    # Legal access permissions
    "legal.grant": "Grant legal access",
    "legal.revoke": "Revoke legal access",
}

# Role definitions
ROLES = {
    "parent": [
        "case.view", "case.edit", "case.invite",
        "message.send", "message.view", "message.flag",
        "agreement.create", "agreement.edit", "agreement.approve", "agreement.view",
        "finance.view", "finance.create", "finance.approve",
        "schedule.view", "schedule.create", "schedule.checkin",
        "child.view", "child.edit",
        "export.create", "export.view",
        "legal.grant", "legal.revoke"
    ],
    "gal": [  # Guardian ad Litem
        "case.view",
        "message.view",
        "agreement.view",
        "finance.view",
        "schedule.view",
        "child.view",
        "export.view"
    ],
    "attorney": [
        "case.view",
        "message.view",
        "agreement.view",
        "finance.view",
        "schedule.view",
        "export.view"
    ],
    "mediator": [
        "case.view",
        "message.view",
        "agreement.view"
    ],
    "court_clerk": [
        "case.view",
        "agreement.view",
        "export.view"
    ]
}
```

### Authorization Middleware

```python
# app/core/authorization.py

from functools import wraps
from fastapi import HTTPException, status

def require_permission(permission: str):
    """Decorator to require specific permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user, case_id, **kwargs):
            # Check if user has permission for this case
            participant = await get_case_participant(case_id, current_user.id)

            if not participant:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not a case participant"
                )

            user_permissions = ROLES.get(participant.role, [])

            if permission not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission required: {permission}"
                )

            return await func(*args, current_user=current_user, case_id=case_id, **kwargs)
        return wrapper
    return decorator

# Usage
@router.post("/agreements/")
@require_permission("agreement.create")
async def create_agreement(case_id: str, current_user: User, ...):
    ...
```

---

## Data Protection

### Encryption at Rest

```python
# Sensitive fields are encrypted using Fernet (AES-128-CBC)
from cryptography.fernet import Fernet

class EncryptedField:
    """Encrypted database field"""

    def __init__(self, key: bytes = None):
        self.key = key or settings.ENCRYPTION_KEY.encode()
        self.fernet = Fernet(self.key)

    def encrypt(self, value: str) -> str:
        """Encrypt a string value"""
        return self.fernet.encrypt(value.encode()).decode()

    def decrypt(self, encrypted_value: str) -> str:
        """Decrypt an encrypted value"""
        return self.fernet.decrypt(encrypted_value.encode()).decode()

# Fields requiring encryption
ENCRYPTED_FIELDS = [
    "child.ssn",
    "child.medical_conditions",
    "child.medications",
    "user.phone",
    "payment.card_last_four",
    "message.content_sensitive"  # If flagged as sensitive
]
```

### Data Classification

| Classification | Description | Examples | Handling |
|----------------|-------------|----------|----------|
| **PUBLIC** | Non-sensitive | User first name, case status | No special handling |
| **INTERNAL** | Business data | Message content, schedules | Encrypted in transit |
| **CONFIDENTIAL** | Sensitive personal | Phone, address, SSN | Encrypted at rest + transit |
| **RESTRICTED** | Highly sensitive | Child medical, abuse records | Full encryption + audit |

### Data Retention

```python
# Data retention policies
RETENTION_POLICIES = {
    "messages": {
        "active_case": "indefinite",  # While case active
        "closed_case": "7_years",      # Legal retention requirement
        "deleted": "30_days"           # Soft delete grace period
    },
    "audit_logs": {
        "retention": "7_years",        # Compliance requirement
        "immutable": True              # Cannot be deleted
    },
    "session_data": {
        "retention": "90_days",
        "on_logout": "immediate"
    },
    "exports": {
        "retention": "1_year",
        "accessed": "extend_90_days"
    }
}
```

### PII Handling

```python
# app/utils/pii.py

import re
from typing import Dict, Any

def redact_pii(data: Dict[str, Any], fields_to_redact: list) -> Dict[str, Any]:
    """Redact PII fields from data"""
    redacted = data.copy()

    for field in fields_to_redact:
        if field in redacted:
            redacted[field] = "[REDACTED]"

    return redacted

def mask_email(email: str) -> str:
    """Mask email for display: j***@example.com"""
    if '@' not in email:
        return "***"
    local, domain = email.split('@')
    return f"{local[0]}***@{domain}"

def mask_phone(phone: str) -> str:
    """Mask phone: ***-***-1234"""
    digits = re.sub(r'\D', '', phone)
    if len(digits) >= 4:
        return f"***-***-{digits[-4:]}"
    return "***"

def mask_ssn(ssn: str) -> str:
    """Mask SSN: ***-**-1234"""
    digits = re.sub(r'\D', '', ssn)
    if len(digits) >= 4:
        return f"***-**-{digits[-4:]}"
    return "***"
```

---

## API Security

### Rate Limiting

```python
# app/middleware/rate_limit.py

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

# Rate limit configurations
RATE_LIMITS = {
    "default": "100/minute",
    "auth": "10/minute",       # Login attempts
    "register": "5/hour",       # Registration
    "password_reset": "3/hour", # Password reset requests
    "export": "10/hour",        # Data exports
    "ai_analysis": "50/minute", # ARIA calls
    "message_send": "60/minute" # Message sending
}

@router.post("/auth/login")
@limiter.limit("10/minute")
async def login(request: Request, ...):
    ...

@router.post("/auth/register")
@limiter.limit("5/hour")
async def register(request: Request, ...):
    ...
```

### CORS Configuration

```python
# app/core/cors.py

from fastapi.middleware.cors import CORSMiddleware

CORS_CONFIG = {
    "allow_origins": [
        "https://commonground.app",
        "https://www.commonground.app",
        "http://localhost:3000"  # Development only
    ],
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    "allow_headers": [
        "Authorization",
        "Content-Type",
        "X-Request-ID",
        "X-Client-Version"
    ],
    "max_age": 600  # Preflight cache duration
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_CONFIG["allow_origins"],
    allow_credentials=CORS_CONFIG["allow_credentials"],
    allow_methods=CORS_CONFIG["allow_methods"],
    allow_headers=CORS_CONFIG["allow_headers"],
    max_age=CORS_CONFIG["max_age"]
)
```

### Security Headers

```python
# app/middleware/security_headers.py

from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"

        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api.anthropic.com https://*.supabase.co; "
            "frame-ancestors 'none';"
        )

        # HSTS (only in production)
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        return response
```

### API Versioning Security

```python
# Deprecation headers for old API versions
@router.get("/v1/legacy-endpoint")
async def legacy_endpoint():
    response = await process_request()
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "2026-06-01"
    response.headers["Link"] = '</api/v2/new-endpoint>; rel="successor-version"'
    return response
```

---

## Input Validation & Sanitization

### Pydantic Validation

```python
# app/schemas/message.py

from pydantic import BaseModel, Field, validator
from typing import Optional
import bleach

class MessageCreate(BaseModel):
    case_id: str = Field(..., min_length=36, max_length=36)
    content: str = Field(..., min_length=1, max_length=10000)
    thread_id: Optional[str] = Field(None, min_length=36, max_length=36)

    @validator('case_id', 'thread_id')
    def validate_uuid(cls, v):
        if v is not None:
            try:
                uuid.UUID(v)
            except ValueError:
                raise ValueError("Invalid UUID format")
        return v

    @validator('content')
    def sanitize_content(cls, v):
        """Sanitize message content to prevent XSS"""
        # Strip all HTML tags
        cleaned = bleach.clean(v, tags=[], strip=True)

        # Remove null bytes and control characters
        cleaned = cleaned.replace('\x00', '')

        # Limit consecutive whitespace
        cleaned = ' '.join(cleaned.split())

        return cleaned
```

### Content Sanitization

```python
# app/utils/sanitizer.py

import bleach
import re

class ContentSanitizer:
    """Sanitize user-generated content"""

    # Allowed HTML for rich text (if enabled)
    ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li']
    ALLOWED_ATTRIBUTES = {}

    # Dangerous patterns to remove
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
        r'data:text/html',
        r'vbscript:',
    ]

    @classmethod
    def sanitize_plain_text(cls, content: str) -> str:
        """Sanitize content as plain text (remove all HTML)"""
        # Strip all HTML
        cleaned = bleach.clean(content, tags=[], strip=True)

        # Remove dangerous patterns
        for pattern in cls.DANGEROUS_PATTERNS:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE | re.DOTALL)

        return cleaned.strip()

    @classmethod
    def sanitize_rich_text(cls, content: str) -> str:
        """Sanitize content allowing limited HTML"""
        cleaned = bleach.clean(
            content,
            tags=cls.ALLOWED_TAGS,
            attributes=cls.ALLOWED_ATTRIBUTES,
            strip=True
        )

        # Remove dangerous patterns
        for pattern in cls.DANGEROUS_PATTERNS:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE | re.DOTALL)

        return cleaned.strip()

    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """Sanitize uploaded filename"""
        # Remove path separators
        filename = filename.replace('/', '_').replace('\\', '_')

        # Remove null bytes
        filename = filename.replace('\x00', '')

        # Only allow safe characters
        safe_chars = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)

        # Limit length
        return safe_chars[:255]
```

### SQL Injection Prevention

```python
# All queries use SQLAlchemy ORM - no raw SQL

# ✅ Safe: Parameterized query
result = await session.execute(
    select(User).where(User.email == email)
)

# ✅ Safe: Using filter with bound parameters
result = await session.execute(
    select(Message)
    .where(Message.case_id == case_id)
    .where(Message.created_at > start_date)
)

# ❌ NEVER DO: String interpolation
# result = session.execute(f"SELECT * FROM users WHERE email = '{email}'")
```

---

## Secure Communications

### TLS Configuration

```yaml
# nginx.conf (production)
server {
    listen 443 ssl http2;
    server_name commonground.app;

    # Modern TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/commonground.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/commonground.app/privkey.pem;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Session settings
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
}
```

### WebSocket Security

```python
# app/api/websocket.py

from fastapi import WebSocket, WebSocketDisconnect
from app.core.security import verify_ws_token

async def websocket_endpoint(websocket: WebSocket, token: str):
    # Verify token before accepting connection
    try:
        user = await verify_ws_token(token)
        if not user:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()

            # Validate message structure
            if not validate_ws_message(data):
                await websocket.send_json({"error": "Invalid message format"})
                continue

            # Process message with authorization check
            if not await can_access_case(user.id, data.get("case_id")):
                await websocket.send_json({"error": "Access denied"})
                continue

            await process_ws_message(data, user)

    except WebSocketDisconnect:
        await cleanup_connection(user.id)
```

---

## Database Security

### Connection Security

```python
# Database connection with SSL
DATABASE_URL = (
    f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    f"?ssl=require&sslmode=verify-full"
)

engine = create_async_engine(
    DATABASE_URL,
    connect_args={
        "ssl": ssl_context,
        "statement_cache_size": 0
    }
)
```

### Row-Level Security

```sql
-- PostgreSQL Row Level Security for multi-tenant isolation
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_isolation ON messages
    FOR ALL
    USING (
        case_id IN (
            SELECT case_id FROM case_participants
            WHERE user_id = current_setting('app.current_user_id')::uuid
        )
    );
```

### Database User Permissions

```sql
-- Application user with minimum necessary permissions
CREATE ROLE commonground_app WITH LOGIN PASSWORD 'secure_password';

-- Grant specific permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO commonground_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO commonground_app;

-- Deny DROP and ALTER
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM commonground_app;
REVOKE ALTER ON ALL TABLES IN SCHEMA public FROM commonground_app;
```

---

## Third-Party Services

### API Key Management

```python
# Environment-based secrets (never in code)
class Settings(BaseSettings):
    # API Keys
    ANTHROPIC_API_KEY: str = Field(..., env="ANTHROPIC_API_KEY")
    OPENAI_API_KEY: str = Field(..., env="OPENAI_API_KEY")
    DAILY_API_KEY: str = Field(..., env="DAILY_API_KEY")
    SENDGRID_API_KEY: str = Field(..., env="SENDGRID_API_KEY")
    SUPABASE_SERVICE_KEY: str = Field(..., env="SUPABASE_SERVICE_KEY")

    # Keys are never logged
    class Config:
        json_encoders = {
            str: lambda v: "[REDACTED]" if "KEY" in v or "SECRET" in v else v
        }
```

### Service Authentication

```python
# Secure service initialization
import anthropic
from functools import lru_cache

@lru_cache()
def get_anthropic_client():
    """Get cached Anthropic client"""
    return anthropic.Anthropic(
        api_key=settings.ANTHROPIC_API_KEY,
        timeout=30.0,
        max_retries=2
    )

# Never expose API keys in responses
@router.get("/config")
async def get_public_config():
    return {
        "api_version": settings.API_VERSION,
        "features_enabled": settings.ENABLED_FEATURES,
        # Never include: API keys, secrets, internal URLs
    }
```

---

## Child Data Protection

### COPPA Compliance

```python
# app/models/child.py

class Child(Base):
    """
    Child model with enhanced privacy protections.

    COPPA Compliance:
    - No direct online interaction with children under 13
    - Parental consent required for data collection
    - Limited data collection (minimum necessary)
    - Secure data storage (encrypted at rest)
    """

    __tablename__ = "children"

    # Basic info (required)
    id = Column(UUID, primary_key=True)
    case_id = Column(UUID, ForeignKey("cases.id"))
    first_name = Column(String(50))
    date_of_birth = Column(Date)  # For age calculation only

    # Sensitive info (encrypted)
    ssn_encrypted = Column(String(500), nullable=True)
    medical_encrypted = Column(Text, nullable=True)

    # Access control
    restricted_access = Column(Boolean, default=False)
    access_audit_required = Column(Boolean, default=True)

    @property
    def age(self) -> int:
        """Calculate age without exposing DOB"""
        today = date.today()
        return today.year - self.date_of_birth.year

    @property
    def is_minor(self) -> bool:
        """Check if child is under 18"""
        return self.age < 18
```

### Access Logging for Child Data

```python
# app/middleware/child_access_audit.py

async def audit_child_data_access(
    user_id: str,
    child_id: str,
    action: str,
    fields_accessed: list
):
    """Log all access to child data"""
    await create_audit_log(
        event_type="child_data_access",
        user_id=user_id,
        resource_type="child",
        resource_id=child_id,
        action=action,
        details={
            "fields_accessed": fields_accessed,
            "timestamp": datetime.utcnow().isoformat(),
            "ip_address": get_client_ip(),
            "user_agent": get_user_agent()
        },
        severity="high"
    )
```

---

## Audit & Compliance

### Audit Logging

```python
# app/models/audit.py

class AuditLog(Base):
    """Immutable audit log for compliance"""

    __tablename__ = "audit_logs"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    event_type = Column(String(100), index=True)
    user_id = Column(UUID, nullable=True)
    case_id = Column(UUID, nullable=True, index=True)
    resource_type = Column(String(50))
    resource_id = Column(UUID, nullable=True)
    action = Column(String(50))  # create, read, update, delete, export
    details = Column(JSONB)
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    severity = Column(String(20))  # low, medium, high, critical

    # Prevent modification
    __table_args__ = (
        {"info": {"immutable": True}},
    )
```

### Compliance Events

```python
# Events that MUST be logged
COMPLIANCE_EVENTS = {
    "auth.login_success": "low",
    "auth.login_failed": "medium",
    "auth.password_changed": "medium",
    "auth.account_locked": "high",

    "case.created": "low",
    "case.invitation_sent": "low",
    "case.invitation_accepted": "low",
    "case.closed": "medium",

    "message.sent": "low",
    "message.flagged": "medium",
    "message.blocked": "high",

    "agreement.created": "low",
    "agreement.approved": "medium",
    "agreement.signed": "high",

    "child.data_accessed": "medium",
    "child.data_modified": "high",

    "export.created": "high",
    "export.downloaded": "high",

    "legal_access.granted": "high",
    "legal_access.revoked": "high",
    "legal_access.expired": "medium",

    "security.suspicious_activity": "critical",
    "security.data_breach_suspected": "critical"
}
```

---

## Incident Response

### Security Incident Procedure

```markdown
## Incident Response Plan

### 1. Detection & Identification
- Monitor alerts from Sentry, CloudWatch, WAF
- Review security logs for anomalies
- User-reported security concerns

### 2. Containment
- Isolate affected systems if necessary
- Revoke compromised credentials immediately
- Block suspicious IP addresses

### 3. Eradication
- Identify root cause
- Remove malicious code/access
- Patch vulnerabilities

### 4. Recovery
- Restore from clean backups if needed
- Verify system integrity
- Re-enable services gradually

### 5. Post-Incident
- Document timeline and actions taken
- Conduct post-mortem
- Update security controls
- Notify affected users if required

### Contact Information
- Security Lead: [name] - [contact]
- On-call Engineer: [rotation schedule]
- Legal/Compliance: [contact]
```

### Breach Notification

```python
# app/services/incident.py

async def handle_potential_breach(
    incident_type: str,
    affected_users: list,
    description: str
):
    """Handle potential security breach"""

    # 1. Log incident
    await log_security_incident(incident_type, description)

    # 2. Notify security team
    await notify_security_team(incident_type, description)

    # 3. If data breach confirmed, notify affected users
    if incident_type == "confirmed_breach":
        for user_id in affected_users:
            await send_breach_notification(
                user_id=user_id,
                incident_type=incident_type,
                description=description,
                actions_to_take=[
                    "Change your password immediately",
                    "Review recent account activity",
                    "Monitor for suspicious communications"
                ]
            )

    # 4. Log for compliance
    await create_compliance_record(
        event="potential_breach",
        details={
            "type": incident_type,
            "affected_count": len(affected_users),
            "response_time": datetime.utcnow().isoformat()
        }
    )
```

---

## Security Checklist

### Pre-Deployment Checklist

```markdown
## Security Deployment Checklist

### Authentication
- [ ] JWT secrets are strong (32+ bytes, randomly generated)
- [ ] Token expiration is reasonable (30 min access, 7 day refresh)
- [ ] Password policy enforced (12+ chars, complexity)
- [ ] Account lockout enabled (5 failed attempts)
- [ ] Rate limiting configured for auth endpoints

### Authorization
- [ ] All endpoints require authentication (except public)
- [ ] RBAC permissions verified
- [ ] Case-level access control tested
- [ ] Privilege escalation tested

### Data Protection
- [ ] Database encryption at rest enabled
- [ ] TLS 1.2+ enforced
- [ ] Sensitive fields encrypted (PII, child data)
- [ ] Data retention policies implemented

### Input Validation
- [ ] All inputs validated (Pydantic schemas)
- [ ] Content sanitization active
- [ ] File uploads validated (type, size, content)
- [ ] SQL injection protection verified

### API Security
- [ ] CORS configured correctly
- [ ] Security headers enabled
- [ ] Rate limiting active
- [ ] API versioning in place

### Logging & Monitoring
- [ ] Audit logging enabled
- [ ] Security alerts configured
- [ ] Error tracking active (Sentry)
- [ ] Log retention configured

### Secrets Management
- [ ] No secrets in code
- [ ] Environment variables for all secrets
- [ ] Secrets rotation plan documented
- [ ] API keys have minimum permissions

### Third-Party Security
- [ ] Dependencies updated
- [ ] Security vulnerabilities scanned
- [ ] Vendor security reviewed
- [ ] SLAs for security incidents
```

---

## Document Index

| Document | Location | Purpose |
|----------|----------|---------|
| **SECURITY.md** | `/docs/operations/` | This document |
| SECURITY_AUDIT.md | `/mvp/backend/` | Detailed security audit |
| SECURITY_IMPLEMENTATION.md | `/mvp/backend/` | Implementation details |
| AUTHENTICATION.md | `/docs/api/` | Auth system documentation |

---

*Last Updated: January 10, 2026*
*Document Version: 1.0.0*
*Security Review: December 30, 2025*

---

## Document: SOLUTIONS_REGISTRY.md

# CommonGround V1 - Solutions Registry

**Last Updated:** January 10, 2026
**Version:** 1.0.0

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Development Environment](#development-environment)
3. [Database Issues](#database-issues)
4. [Authentication Problems](#authentication-problems)
5. [API Errors](#api-errors)
6. [Frontend Issues](#frontend-issues)
7. [External Services](#external-services)
8. [Performance Problems](#performance-problems)
9. [Deployment Issues](#deployment-issues)
10. [Recovery Procedures](#recovery-procedures)

---

## Quick Reference

### Most Common Issues - Fast Fixes

| Symptom | Quick Fix |
|---------|-----------|
| "Connection refused" | `docker-compose restart postgres` |
| "ModuleNotFoundError" | `source venv/bin/activate && pip install -r requirements.txt` |
| "Token expired" | Re-login or refresh token |
| "Database migration failed" | `alembic downgrade -1 && alembic upgrade head` |
| "CORS error" | Check `ALLOWED_ORIGINS` in `.env` |
| "Rate limit exceeded" | Wait 60 seconds |
| "AI service unavailable" | Check API keys, fallback to regex |

---

## Development Environment

### DEV-001: Backend Won't Start

**Symptom:**
```
Error: Address already in use: 8000
```

**Solution:**
```bash
# Find and kill process on port 8000
lsof -i :8000
kill -9 <PID>

# Or use different port
uvicorn app.main:app --reload --port 8001
```

---

### DEV-002: Virtual Environment Issues

**Symptom:**
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
```bash
# Ensure venv is activated
cd mvp/backend
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate     # Windows

# Verify correct Python
which python  # Should show .../venv/bin/python

# Reinstall dependencies
pip install -r requirements.txt
```

---

### DEV-003: Node.js Version Mismatch

**Symptom:**
```
SyntaxError: Unexpected token '?'
```

**Solution:**
```bash
# Check Node version
node --version  # Needs 18+

# Install correct version with nvm
nvm install 18
nvm use 18

# Or with volta
volta pin node@18
```

---

### DEV-004: npm Install Fails

**Symptom:**
```
npm ERR! peer dep missing
```

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
```

---

### DEV-005: Frontend Build Errors

**Symptom:**
```
Type error: Cannot find module '@/components/...'
```

**Solution:**
```bash
# Check tsconfig paths
cat tsconfig.json | grep "@/*"

# Verify import aliases
# Should be: "@/*": ["./src/*"] or "@/*": ["./*"]

# Restart TypeScript server in VS Code
# Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

---

## Database Issues

### DB-001: Connection Refused

**Symptom:**
```
sqlalchemy.exc.OperationalError: could not connect to server: Connection refused
```

**Solutions:**

**1. Docker PostgreSQL not running:**
```bash
# Check if running
docker ps | grep postgres

# Start if not
docker-compose up -d postgres

# Wait 10 seconds for startup
sleep 10

# Test connection
pg_isready -h localhost -p 5432
```

**2. Wrong connection string:**
```bash
# Check .env
cat .env | grep DATABASE_URL

# Should be:
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/commonground
```

**3. PostgreSQL service not running (local install):**
```bash
# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql
```

---

### DB-002: Migration Conflicts

**Symptom:**
```
alembic.util.exc.CommandError: Multiple head revisions
```

**Solution:**
```bash
# View all heads
alembic heads

# Merge heads
alembic merge <head1> <head2> -m "merge migrations"

# Apply merged migration
alembic upgrade head
```

---

### DB-003: Migration Fails to Apply

**Symptom:**
```
sqlalchemy.exc.ProgrammingError: relation "xxx" already exists
```

**Solutions:**

**1. Stamp current version:**
```bash
# If tables exist but alembic_version doesn't match
alembic stamp head
```

**2. Manual fix (DEV ONLY):**
```bash
# Check current state
psql -d commonground -c "SELECT * FROM alembic_version;"

# Update to correct version
psql -d commonground -c "UPDATE alembic_version SET version_num = 'correct_version_here';"
```

**3. Nuclear option (DEV ONLY):**
```bash
# WARNING: Drops all data!
dropdb commonground
createdb commonground
alembic upgrade head
python -m scripts.seed_data
```

---

### DB-004: Foreign Key Constraint Violation

**Symptom:**
```
sqlalchemy.exc.IntegrityError: insert or update violates foreign key constraint
```

**Solution:**
```bash
# Find orphaned records
psql -d commonground -c "
SELECT * FROM table_with_fk
WHERE reference_id NOT IN (SELECT id FROM referenced_table);
"

# Delete orphaned records
psql -d commonground -c "
DELETE FROM table_with_fk
WHERE reference_id NOT IN (SELECT id FROM referenced_table);
"
```

---

### DB-005: Async Session Errors

**Symptom:**
```
sqlalchemy.exc.InvalidRequestError: This Session's transaction has been rolled back
```

**Solution:**
```python
# Ensure proper session handling
async with get_db() as session:
    try:
        result = await session.execute(query)
        await session.commit()
    except Exception:
        await session.rollback()
        raise
```

---

## Authentication Problems

### AUTH-001: Login Returns 401

**Symptom:**
```json
{"error": {"code": "AUTH_INVALID_CREDENTIALS"}}
```

**Solutions:**

**1. Email not verified:**
```bash
# Check Supabase dashboard
# Go to Authentication > Users
# Verify email status
```

**2. Wrong password:**
```python
# Reset via API (if implemented)
POST /api/v1/auth/forgot-password
{"email": "user@example.com"}

# Or reset in Supabase dashboard
```

**3. Account disabled:**
```bash
# Check user status
psql -d commonground -c "SELECT is_active FROM users WHERE email = 'user@example.com';"

# Reactivate
psql -d commonground -c "UPDATE users SET is_active = true WHERE email = 'user@example.com';"
```

---

### AUTH-002: Token Expired Errors

**Symptom:**
```json
{"error": {"code": "AUTH_TOKEN_EXPIRED"}}
```

**Solution:**

**Backend - Extend token expiry:**
```python
# In .env
ACCESS_TOKEN_EXPIRE_MINUTES=60  # Default: 30
REFRESH_TOKEN_EXPIRE_DAYS=14    # Default: 7
```

**Frontend - Auto-refresh:**
```typescript
// In api client interceptor
if (error.response?.data?.error?.code === 'AUTH_TOKEN_EXPIRED') {
  await refreshToken();
  return retryRequest(error.config);
}
```

---

### AUTH-003: CORS Errors on Login

**Symptom:**
```
Access to fetch has been blocked by CORS policy
```

**Solution:**
```bash
# Check ALLOWED_ORIGINS in backend .env
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Restart backend after changing
uvicorn app.main:app --reload
```

---

### AUTH-004: Supabase JWT Mismatch

**Symptom:**
```
supabase.AuthError: Invalid JWT
```

**Solution:**
```bash
# Verify keys match
# In backend .env:
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# In frontend .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Both SUPABASE_URL values MUST be identical
```

---

## API Errors

### API-001: 422 Validation Error

**Symptom:**
```json
{"detail": [{"loc": ["body", "field"], "msg": "field required"}]}
```

**Solution:**
```bash
# Check request body matches schema
# Use /docs endpoint to see expected schema
open http://localhost:8000/docs

# Common issues:
# - Missing required field
# - Wrong field type (string vs number)
# - Invalid UUID format
```

---

### API-002: 403 Permission Denied

**Symptom:**
```json
{"error": {"code": "PERM_NOT_CASE_MEMBER"}}
```

**Solution:**
```bash
# Verify user is case participant
psql -d commonground -c "
SELECT * FROM case_participants
WHERE case_id = 'xxx' AND user_id = 'yyy';
"

# If missing, check invitation status
psql -d commonground -c "
SELECT * FROM case_invitations WHERE case_id = 'xxx';
"
```

---

### API-003: 500 Internal Server Error

**Symptom:**
```json
{"error": {"code": "SYS_INTERNAL_ERROR"}}
```

**Solution:**
```bash
# Check backend logs
tail -f /var/log/commonground/error.log

# Or Docker logs
docker-compose logs -f backend

# Look for stack trace
# Common causes:
# - Database connection issues
# - Missing environment variables
# - Null pointer exceptions
```

---

### API-004: Request Timeout

**Symptom:**
```
504 Gateway Timeout
```

**Solution:**
```bash
# Increase timeout in nginx/reverse proxy
# nginx.conf:
proxy_read_timeout 300;
proxy_connect_timeout 300;
proxy_send_timeout 300;

# Or in uvicorn
uvicorn app.main:app --timeout-keep-alive 300
```

---

## Frontend Issues

### FE-001: Hydration Mismatch

**Symptom:**
```
Warning: Text content did not match. Server: "..." Client: "..."
```

**Solution:**
```typescript
// Use dynamic import for client-only components
import dynamic from 'next/dynamic';

const ClientOnlyComponent = dynamic(
  () => import('./ClientOnlyComponent'),
  { ssr: false }
);
```

---

### FE-002: useEffect Infinite Loop

**Symptom:**
```
Maximum update depth exceeded
```

**Solution:**
```typescript
// Bad - causes infinite loop
useEffect(() => {
  setData(fetchData());
}); // Missing dependency array

// Good
useEffect(() => {
  setData(fetchData());
}, []); // Runs once on mount

// Or with dependencies
useEffect(() => {
  setData(fetchData(userId));
}, [userId]); // Runs when userId changes
```

---

### FE-003: API URL Not Configured

**Symptom:**
```
TypeError: Failed to fetch
```

**Solution:**
```bash
# Check .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Restart dev server after adding
npm run dev
```

---

### FE-004: State Not Persisting

**Symptom:**
State resets on page navigation

**Solution:**
```typescript
// Use React Context for global state
// lib/auth-context.tsx
export const AuthContext = createContext<AuthState | null>(null);

// Wrap app in provider
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
```

---

## External Services

### EXT-001: ARIA AI Timeout

**Symptom:**
```json
{"error": {"code": "EXT_AI_TIMEOUT"}}
```

**Solutions:**

**1. Increase timeout:**
```python
# In services/aria.py
client = anthropic.Anthropic(timeout=60.0)  # Default: 30
```

**2. Add retry logic:**
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10)
)
async def analyze_message(content: str):
    return await claude_analyze(content)
```

**3. Use fallback:**
```python
try:
    result = await claude_analyze(content)
except anthropic.APITimeoutError:
    result = await openai_analyze(content)  # Fallback
```

---

### EXT-002: AI Rate Limit Exceeded

**Symptom:**
```
anthropic.RateLimitError: Rate limit exceeded
```

**Solution:**
```python
# Implement rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/messages/")
@limiter.limit("50/minute")
async def send_message(...):
    ...
```

---

### EXT-003: Daily.co Video Errors

**Symptom:**
```
DailyIframe error: meeting_not_found
```

**Solutions:**

**1. Check room creation:**
```python
# Verify room was created
response = daily_client.get_room(room_name)
if not response:
    # Create new room
    daily_client.create_room(name=room_name, properties={...})
```

**2. Token expired:**
```python
# Generate new token with longer expiry
token = daily_client.create_meeting_token(
    room_name=room_name,
    exp=datetime.utcnow() + timedelta(hours=24)
)
```

---

### EXT-004: Supabase Storage Errors

**Symptom:**
```
supabase.StorageError: Bucket not found
```

**Solution:**
```bash
# Create bucket in Supabase dashboard
# Or via API:
curl -X POST 'https://xxx.supabase.co/storage/v1/bucket' \
  -H 'Authorization: Bearer <service_key>' \
  -H 'Content-Type: application/json' \
  -d '{"id": "receipts", "name": "receipts", "public": false}'
```

---

## Performance Problems

### PERF-001: Slow Database Queries

**Symptom:**
API response time > 1 second

**Solutions:**

**1. Add indexes:**
```python
# In models
class Message(Base):
    __tablename__ = "messages"

    # Add index for common queries
    __table_args__ = (
        Index('ix_messages_case_id_created', 'case_id', 'created_at'),
    )
```

**2. Use eager loading:**
```python
# Bad - N+1 queries
cases = await session.execute(select(Case))
for case in cases:
    print(case.participants)  # Lazy load for each

# Good - Eager load
cases = await session.execute(
    select(Case).options(selectinload(Case.participants))
)
```

**3. Paginate results:**
```python
# Use limit/offset
result = await session.execute(
    select(Message)
    .where(Message.case_id == case_id)
    .order_by(Message.created_at.desc())
    .limit(50)
    .offset(page * 50)
)
```

---

### PERF-002: High Memory Usage

**Symptom:**
Backend process using > 500MB RAM

**Solutions:**

**1. Stream large responses:**
```python
from fastapi.responses import StreamingResponse

@router.get("/export/{case_id}")
async def export_data(case_id: str):
    async def generate():
        async for chunk in get_export_chunks(case_id):
            yield chunk

    return StreamingResponse(
        generate(),
        media_type="application/json"
    )
```

**2. Clear SQLAlchemy cache:**
```python
# After bulk operations
await session.expire_all()
```

---

### PERF-003: Frontend Bundle Too Large

**Symptom:**
Initial load > 500KB

**Solutions:**

**1. Dynamic imports:**
```typescript
const HeavyComponent = dynamic(
  () => import('./HeavyComponent'),
  { loading: () => <Spinner /> }
);
```

**2. Analyze bundle:**
```bash
npm run analyze
# Or
npx next-bundle-analyzer
```

---

## Deployment Issues

### DEPLOY-001: Railway Build Fails

**Symptom:**
```
Error: Build failed
```

**Solution:**
```bash
# Check railway.json configuration
cat railway.json

# Ensure Procfile is correct
cat Procfile
# Should be:
# web: uvicorn app.main:app --host 0.0.0.0 --port $PORT

# Check environment variables are set in Railway dashboard
```

---

### DEPLOY-002: Vercel Deployment Errors

**Symptom:**
```
Error: Could not find a production build
```

**Solution:**
```bash
# Ensure build command is correct
# In vercel.json or project settings:
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}

# Check for TypeScript errors
npm run build
```

---

### DEPLOY-003: Database Connection in Production

**Symptom:**
```
Connection refused in production
```

**Solution:**
```bash
# Check DATABASE_URL format for production
# Railway PostgreSQL:
DATABASE_URL=postgresql+asyncpg://user:pass@host.railway.app:5432/railway

# Supabase:
DATABASE_URL=postgresql+asyncpg://postgres:pass@db.xxx.supabase.co:5432/postgres
```

---

## Recovery Procedures

### REC-001: Complete Database Reset

**WARNING: Development only!**

```bash
# 1. Stop all services
docker-compose down

# 2. Remove database volume
docker volume rm commonground_pgdata

# 3. Start fresh
docker-compose up -d

# 4. Run migrations
cd mvp/backend
alembic upgrade head

# 5. Seed data
python -m scripts.seed_data
```

---

### REC-002: Recover from Bad Migration

```bash
# 1. Check current version
alembic current

# 2. View migration history
alembic history

# 3. Downgrade to known good version
alembic downgrade <good_version>

# 4. Fix migration file
vim alembic/versions/xxx_bad_migration.py

# 5. Re-upgrade
alembic upgrade head
```

---

### REC-003: Clear All User Sessions

```sql
-- In PostgreSQL
TRUNCATE refresh_tokens;

-- Or delete for specific user
DELETE FROM refresh_tokens WHERE user_id = 'xxx';
```

---

### REC-004: Emergency Maintenance Mode

```python
# Add to main.py
from fastapi import Request

@app.middleware("http")
async def maintenance_mode(request: Request, call_next):
    if settings.MAINTENANCE_MODE:
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "SYS_MAINTENANCE",
                    "message": "System under maintenance"
                }
            }
        )
    return await call_next(request)
```

```bash
# Enable maintenance mode
echo "MAINTENANCE_MODE=true" >> .env
# Restart service
```

---

## Document Index

| Document | Location | Purpose |
|----------|----------|---------|
| **SOLUTIONS_REGISTRY.md** | `/docs/operations/` | This document |
| KNOWN_ISSUES.md | `/docs/operations/` | Issue tracking |
| ERROR_HANDLING.md | `/docs/errors/` | Error codes reference |
| TROUBLESHOOTING.md | `/docs/guides/` | General troubleshooting |
| SETUP_GUIDE.md | `/docs/guides/` | Development setup |

---

## Contributing

When adding new solutions:

1. Use consistent heading format: `### CATEGORY-XXX: Title`
2. Include clear symptom description
3. Provide step-by-step solution
4. Add code examples where applicable
5. Mark solutions as DEV ONLY if dangerous
6. Update table of contents

---

*Last Updated: January 10, 2026*
*Document Version: 1.0.0*

---

