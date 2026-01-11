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
