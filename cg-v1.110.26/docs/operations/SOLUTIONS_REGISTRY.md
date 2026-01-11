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
