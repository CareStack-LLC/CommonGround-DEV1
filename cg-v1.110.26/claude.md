# CommonGround

AI-powered co-parenting operating system that transforms high-conflict custody situations into collaborative partnerships.

## Quick Reference

### Common Commands

```bash
# Backend
cd mvp/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend
cd mvp/frontend
npm run dev

# Database
cd mvp/backend
alembic upgrade head                              # Apply migrations
alembic revision --autogenerate -m "description"  # Create migration

# Docker (full stack)
cd mvp
docker-compose up -d

# Testing
cd mvp/backend && pytest
cd mvp/frontend && npm test

# Code quality
cd mvp/backend
black app/
isort app/
mypy app/
```

### API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
mvp/
├── backend/                    # FastAPI + Python
│   ├── app/
│   │   ├── main.py             # Application entry
│   │   ├── api/v1/endpoints/   # REST routes (20+ modules)
│   │   ├── models/             # SQLAlchemy models (27+)
│   │   ├── schemas/            # Pydantic schemas (25+)
│   │   ├── services/           # Business logic (36+ modules)
│   │   └── core/               # Config, database, security
│   └── alembic/                # Database migrations
│
├── frontend/                   # Next.js + React
│   ├── app/                    # Pages and routes
│   ├── components/             # Reusable components
│   └── lib/                    # API client, auth, utilities
│
└── docs/                       # Documentation
    ├── architecture/
    ├── api/
    ├── features/
    └── guides/
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI, Python 3.11+, SQLAlchemy 2.0, Alembic |
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| Database | PostgreSQL 15, Redis 7 |
| Auth | Supabase Auth + JWT |
| AI | Anthropic Claude (primary), OpenAI (fallback) |
| Video | Daily.co (KidComs) |
| Payments | Stripe |

## Code Style

### Python (Backend)

- Use `async def` for all I/O operations
- Include type hints on all functions
- Follow PEP 8 with 88-char line limit (Black formatter)
- Use dependency injection for database and auth

```python
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

@router.get("/items/{id}")
async def get_item(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ItemResponse:
    """Get item by ID. Requires authentication."""
    item = await item_service.get_by_id(db, id, current_user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return item
```

### TypeScript (Frontend)

- Strict mode enabled
- Use functional components with hooks
- Prefer named exports
- Use Tailwind for styling

### Commit Messages

Use conventional commits:
```
feat(module): add new feature
fix(module): fix bug description
docs: update documentation
refactor(module): refactor description
test: add tests for feature
```

## Architecture Patterns

### Backend Layer Separation

```
models/      → SQLAlchemy ORM models (database tables)
schemas/     → Pydantic models (API request/response)
services/    → Business logic (no FastAPI dependencies)
endpoints/   → REST routes (thin controllers, call services)
core/        → Configuration, database, security utilities
```

### Authentication Flow

1. User authenticates via Supabase Auth
2. Backend validates JWT token via `get_current_user` dependency
3. All protected endpoints require `current_user: User = Depends(get_current_user)`

### Access Control

- Users can only access their own cases
- Case participants have role-based permissions (petitioner, respondent)
- Legal professionals get time-limited, verified access

## Core Features

### ARIA (AI Relationship Intelligence Assistant)

3-tier sentiment analysis for message mediation:
1. Regex pattern matching (fast, common issues)
2. Claude AI analysis (nuanced understanding)
3. OpenAI fallback (reliability)

**Toxicity categories:** hostility, blame, passive-aggressive, profanity, dismissive, controlling

**Intervention flow:**
1. User composes message
2. ARIA analyzes content
3. If toxic (score > 0.3): suggest rewrite
4. User accepts/modifies/rejects suggestion
5. Track action in MessageFlag for analytics

### KidComs (Child Communication)

- Video/voice calls via Daily.co
- Text chat with ARIA monitoring
- Circle management for approved contacts
- Parental controls and call logging

### Agreement Builder

18-section custody agreement wizard:
1. Parent Info → 2. Children → 3. Legal Custody → 4. Physical Custody
5. Parenting Schedule → 6. Holidays → 7. Exchanges → 8. Transportation
9. Child Support → 10. Medical → 11. Education → 12. Communication
13. Child Contact → 14. Travel → 15. Relocation → 16. Dispute Resolution
17. Other Provisions → 18. Review

- Dual-parent approval workflow
- Version history
- Court-ready PDF generation

### Schedule & Compliance

- Automated schedule from agreements
- Exchange check-ins with compliance tracking
- On-time/late/grace period monitoring

### ClearFund (Expenses)

- Expense request and approval workflow
- Automatic splitting based on custody percentages
- Payment tracking via Stripe

### Court Export

- Compliance metrics and analytics
- Evidence compilation (messages, agreements, schedules)
- SHA-256 integrity verification

## Database Models

Key models and relationships:

```
User ─────┬── UserProfile (1:1)
          ├── CaseParticipant (1:N)
          └── Messages (1:N)

Case ─────┬── CaseParticipant (1:N)
          ├── Children (1:N)
          ├── Agreements (1:N)
          ├── Messages (1:N)
          ├── ScheduleEvents (1:N)
          └── AuditLogs (1:N)

Agreement ┬── AgreementVersions (1:N)
          └── AgreementSections (1:N)

Message ──┬── MessageFlags (1:N) [ARIA interventions]
          └── MessageThread (N:1)
```

## Environment Variables

### Backend (.env)

```bash
# Required
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/commonground
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SECRET_KEY=your-jwt-secret
ANTHROPIC_API_KEY=your-anthropic-key

# Optional
OPENAI_API_KEY=your-openai-key
DAILY_API_KEY=your-daily-key
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=your-stripe-key
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Key API Endpoints

| Module | Endpoints |
|--------|-----------|
| Auth | POST /auth/register, POST /auth/login, POST /auth/refresh |
| Cases | GET/POST /cases, GET/PUT /cases/{id}, POST /cases/{id}/accept |
| Children | GET/POST /cases/{id}/children, PUT/DELETE /children/{id} |
| Agreements | GET/POST /agreements, PUT /agreements/{id}/sections/{section}, POST /agreements/{id}/approve |
| Messages | GET/POST /messages, POST /messages/analyze |
| Schedule | GET/POST /schedule/events, POST /exchanges/{id}/check-in |
| KidComs | POST /kidcoms/calls, GET /kidcoms/circle |
| ClearFund | GET/POST /clearfund/expenses, POST /expenses/{id}/approve |
| Court | POST /court/export |

## Testing

### Backend Tests

```bash
cd mvp/backend
pytest                          # Run all tests
pytest tests/unit/              # Unit tests only
pytest tests/integration/       # Integration tests
pytest -v --tb=short           # Verbose with short traceback
```

### Test Structure

```python
# tests/integration/test_cases.py
async def test_create_case(client, auth_headers):
    response = await client.post(
        "/api/v1/cases/",
        json={"case_name": "Test Case", "state": "CA"},
        headers=auth_headers
    )
    assert response.status_code == 201
    assert response.json()["case_name"] == "Test Case"
```

## Error Handling

Always use specific HTTP exceptions:

```python
from fastapi import HTTPException, status

# Good
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Case not found"
)

# Bad - don't return None for missing resources
return None
```

## Security Requirements

- All PII encrypted at rest
- TLS 1.3 minimum in transit
- JWT tokens with refresh mechanism
- Rate limiting: 100 requests/min per user
- Audit logging for all sensitive operations
- RBAC at case level with principle of least privilege

## Brand Voice (for ARIA)

When generating ARIA responses or UI copy:

- **Child-first:** Every decision prioritizes child welfare
- **Neutral:** No sides, no bias, no judgment
- **Empathetic:** Acknowledge difficulty, focus on solutions
- **Plain language:** 8th grade reading level
- **Gender-neutral:** Use "Parent A/B" or "you/other parent"

**ARIA message transformations:**
- Preserve sender's core intent
- Remove inflammatory language
- Add collaborative framing
- Use "I" statements instead of "You" accusations
- Focus on child impact

## Deployment

| Service | Provider |
|---------|----------|
| Frontend | Vercel |
| Backend | Railway |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Cache | Redis Cloud / Upstash |
| Video | Daily.co |

## Documentation

See @mvp/docs for detailed documentation:
- @mvp/docs/architecture/OVERVIEW.md - System overview
- @mvp/docs/api/API_REFERENCE.md - Full API docs
- @mvp/docs/features/ - Feature specifications
- @mvp/docs/guides/SETUP_GUIDE.md - Setup instructions
