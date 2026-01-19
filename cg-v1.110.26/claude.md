# CommonGround

AI-powered co-parenting operating system that transforms high-conflict custody situations into collaborative partnerships.

**Current Version:** 1.6.0 (January 2026)

## Quick Reference

### Common Commands

```bash
# Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm run dev

# Database
cd backend
alembic upgrade head                              # Apply migrations
alembic revision --autogenerate -m "description"  # Create migration

# Docker (full stack)
docker-compose up -d

# Testing
cd backend && pytest
cd frontend && npm test

# Code quality
cd backend
black app/
isort app/
mypy app/
```

### API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Production API: https://commonground-api-gdxg.onrender.com

## Project Structure

```
├── backend/                    # FastAPI + Python
│   ├── app/
│   │   ├── main.py             # Application entry
│   │   ├── api/v1/endpoints/   # REST routes (33 modules)
│   │   ├── models/             # SQLAlchemy models (30)
│   │   ├── schemas/            # Pydantic schemas (27)
│   │   ├── services/           # Business logic (40 modules)
│   │   └── core/               # Config, database, security
│   └── alembic/                # Database migrations (80+)
│
├── frontend/                   # Next.js + React
│   ├── app/                    # Pages and routes (123 pages)
│   ├── components/             # Reusable components (109)
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

### Family Files (Case Management)

Central hub for co-parenting cases:
- Unified dashboard aggregating data from all family files
- Parent A/B role assignment with flexible permissions
- Children profiles with photos and custody tracking
- Legacy case migration support

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

**ARIA Conversations:**
- Agreement section guidance with structured extraction
- Context-aware suggestions based on custody data
- Multi-turn conversation support

### KidComs (Child Communication)

- Video/voice calls via Daily.co
- Text chat with ARIA monitoring
- Circle management for approved contacts
- Parental controls and call logging
- Child wallet system for allowances

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

### Schedule & Custody Tracking

- Automated schedule from agreements
- Custody exchange management with GPS verification
- Silent handoff mode for contactless exchanges
- QR code check-in confirmation
- Recurring exchange instance generation
- Custody time statistics and reports
- Parenting time compliance metrics

### ClearFund (Expenses)

- Expense request and approval workflow
- Automatic splitting based on custody percentages
- Payment tracking via Stripe
- Financial obligations management
- Court-ordered payment tracking

### Court Portal

- GAL (Guardian ad Litem) dashboard
- Case overview with compliance metrics
- Court event scheduling (hearings, mediations)
- Evidence compilation (messages, agreements, schedules)
- SHA-256 integrity verification for exports
- Court notification system

### Professional Portal (New in 1.6.0)

Complete legal practice management for family law professionals:

**User Types:**
- Attorneys (lead, associate)
- Mediators / Parenting Coordinators
- Paralegals
- Intake Coordinators
- Practice Administrators

**Core Features:**
- **Firm Management**: Create and manage law firms with team roles
- **Case Dashboard**: View all assigned cases with alerts and metrics
- **Case Timeline**: Chronological feed of messages, exchanges, court events
- **ARIA Controls**: Adjust AI mediation settings per case
- **Professional Messaging**: Secure attorney-client communication
- **Intake Center**: Conduct and review AI-assisted client intakes
- **Compliance Tracking**: Exchange and financial compliance metrics
- **Court Exports**: Generate evidence packages for court

**Access Model:**
- Parents invite professionals by email or firm directory
- Dual-parent consent (configurable)
- Scoped permissions per case
- Complete audit logging

**Routes:**
- `/professional/dashboard` - Practice overview
- `/professional/cases` - Case load management
- `/professional/cases/[id]/*` - Individual case views
- `/professional/intake` - Intake session management
- `/professional/firm` - Firm settings and team

## Database Models

Key models and relationships:

```
User ─────────┬── UserProfile (1:1)
              ├── FamilyFile (as parent_a or parent_b)
              ├── CaseParticipant (1:N) [legacy]
              └── Messages (1:N)

FamilyFile ───┬── Children (1:N)
              ├── Agreements (1:N)
              ├── Messages (1:N)
              ├── ScheduleEvents (1:N)
              ├── CustodyExchanges (1:N)
              ├── Obligations (1:N) [ClearFund]
              ├── CourtEvents (1:N)
              └── AuditLogs (1:N)

Child ────────┬── CustodyPeriods (1:N)
              ├── MyTimeCollections (1:N)
              └── TimeBlocks (1:N)

CustodyExchange ─── CustodyExchangeInstance (1:N)
                    [recurring instances with GPS check-ins]

Agreement ────┬── AgreementVersions (1:N)
              └── AgreementSections (1:N)

Message ──────┬── MessageFlags (1:N) [ARIA interventions]
              └── MessageThread (N:1)

ARIAConversation ── ARIAMessage (1:N)
                    [agreement guidance sessions]

ProfessionalProfile ─── User (1:1)
                    └── FirmMembership (1:N)
                    └── CaseAssignment (1:N)

Firm ─────────────┬── FirmMembership (1:N)
                  └── FirmTemplate (1:N)

CaseAssignment ───── FamilyFile (N:1)
                 └── ProfessionalProfile (N:1)
                 └── ProfessionalMessage (1:N)

ProfessionalAccessRequest ── FamilyFile (N:1)
                          [invitation/consent workflow]
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
| Auth | POST /auth/register, POST /auth/login, POST /auth/refresh, POST /auth/mfa/* |
| Family Files | GET/POST /family-files, GET/PUT /family-files/{id}, POST /family-files/{id}/invite |
| Children | GET/POST /family-files/{id}/children, PUT/DELETE /children/{id}, POST /children/{id}/photo |
| Agreements | GET/POST /agreements, PUT /agreements/{id}/sections/{section}, POST /agreements/{id}/approve |
| Messages | GET/POST /messages, POST /messages/analyze, GET /messages/unread-count |
| Schedule | GET/POST /schedule/events, GET /calendar/combined |
| Exchanges | GET/POST /exchanges, POST /exchanges/{id}/check-in, GET /exchanges/case/{id}/upcoming |
| Custody Time | GET /custody-time/child/{id}/stats, GET /custody-time/child/{id}/periods |
| Dashboard | GET /dashboard/summary/{family_file_id} |
| KidComs | POST /kidcoms/calls, GET /kidcoms/circle |
| ClearFund | GET/POST /clearfund/expenses, GET/POST /clearfund/obligations |
| Court | GET /court/events, POST /court/events, GET /court/cases/{id}/overview |
| Export | POST /export/generate, GET /export/templates |
| Professional | GET/POST /professional/profile, GET/POST /professional/firms, GET /professional/cases |
| Professional Cases | GET /professional/cases/{id}/timeline, GET /professional/cases/{id}/aria |
| Professional Messaging | GET/POST /professional/messages, GET /professional/messages/case/{id} |
| Professional Intake | GET/POST /professional/intake/sessions |

## Testing

### Backend Tests

```bash
cd backend
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

| Service | Provider | URL |
|---------|----------|-----|
| Frontend | Vercel | https://common-ground-blue.vercel.app |
| Backend | Render | https://commonground-api-gdxg.onrender.com |
| Database | Supabase (PostgreSQL) | Supabase Dashboard |
| Auth | Supabase Auth + TOTP MFA | Supabase Dashboard |
| Cache | Redis Cloud / Upstash | - |
| Video | Daily.co | - |
| Payments | Stripe | - |

## Documentation

See `docs/` for detailed documentation:
- `docs/architecture/OVERVIEW.md` - System overview
- `docs/api/API_REFERENCE.md` - Full API docs
- `docs/features/` - Feature specifications
- `docs/guides/SETUP_GUIDE.md` - Setup instructions
