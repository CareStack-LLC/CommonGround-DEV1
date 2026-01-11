# CommonGround

**An AI-Powered Co-Parenting Operating System**

CommonGround transforms high-conflict custody situations into collaborative partnerships through AI-mediated communication, transparent expense tracking, automated agreement building, and court-ready documentation.

---

## Overview

CommonGround is a comprehensive platform designed to reduce conflict between separated parents by providing:

- **ARIA** - AI Relationship Intelligence Assistant for real-time sentiment analysis and message mediation
- **KidComs** - Safe, monitored child-parent video communication
- **Agreement Builder** - Automated custody agreement creation with dual-parent approval
- **ClearFund** - Transparent expense tracking and payment management
- **Schedule & Compliance** - Automated parenting time tracking with exchange check-ins
- **Court Export** - Generate court-ready documentation packages

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| **Backend** | FastAPI (Python 3.11+), SQLAlchemy 2.0, Alembic |
| **Database** | PostgreSQL 15, Redis 7 |
| **Auth** | Supabase Auth with JWT |
| **AI** | Anthropic Claude API (primary), OpenAI (fallback) |
| **Video** | Daily.co |
| **Payments** | Stripe |

---

## Project Structure

```
CommonGround/
├── mvp/
│   ├── backend/                    # FastAPI Python backend
│   │   ├── app/
│   │   │   ├── api/v1/endpoints/   # REST API routes (20+ modules)
│   │   │   ├── models/             # SQLAlchemy models (27+)
│   │   │   ├── schemas/            # Pydantic schemas (25+)
│   │   │   ├── services/           # Business logic (36+ modules)
│   │   │   └── core/               # Config, security, database
│   │   ├── alembic/                # Database migrations
│   │   └── requirements.txt
│   │
│   ├── frontend/                   # Next.js React frontend
│   │   ├── app/                    # Pages (18+ routes)
│   │   │   ├── dashboard/
│   │   │   ├── cases/
│   │   │   ├── agreements/
│   │   │   ├── schedule/
│   │   │   ├── messages/
│   │   │   ├── kidcoms/
│   │   │   ├── my-circle/
│   │   │   ├── family-files/
│   │   │   ├── payments/
│   │   │   └── court-portal/
│   │   ├── components/             # Reusable React components
│   │   └── lib/                    # API client, auth, utilities
│   │
│   └── docs/                       # Documentation
│       ├── architecture/
│       ├── api/
│       ├── database/
│       ├── features/
│       └── guides/
│
└── docker-compose.yml
```

---

## Quick Start

### Using Docker (Recommended)

```bash
cd mvp
docker-compose up -d
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Manual Setup

**Backend:**

```bash
cd mvp/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Configure environment variables
alembic upgrade head      # Run database migrations
uvicorn app.main:app --reload --port 8000
```

**Frontend:**

```bash
cd mvp/frontend
npm install
cp .env.example .env.local  # Configure environment variables
npm run dev
```

---

## Environment Variables

### Backend (.env)

```env
# Application
APP_NAME=CommonGround
ENVIRONMENT=development
SECRET_KEY=your-secret-key-here

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/commonground

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Services
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key

# Video (KidComs)
DAILY_API_KEY=your-daily-api-key
DAILY_DOMAIN=your-domain.daily.co

# Redis
REDIS_URL=redis://localhost:6379

# Payments
STRIPE_SECRET_KEY=your-stripe-key

# CORS
ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Features

### ARIA - AI Relationship Intelligence Assistant

Real-time sentiment analysis and message mediation using a 3-tier system:
1. Regex pattern matching for common issues
2. Claude AI for nuanced analysis
3. OpenAI fallback for reliability

Features include toxicity detection, message rewriting suggestions, and good faith communication metrics.

### KidComs - Child Communication

Monitored video/voice calls and text chat between children and approved contacts:
- Daily.co integration for real-time video
- Circle management for approved contacts
- ARIA-monitored text conversations
- Parental controls and call logging

### Agreement Builder

18-section custody agreement wizard with:
- Conversational Quick Accord mode
- Dual-parent approval workflow
- Version history and modifications
- Court-ready PDF generation

### Schedule & Compliance

- Automated schedule generation from agreements
- Recurring parenting time events
- Holiday and vacation management
- Exchange check-ins with GPS (optional)
- On-time/late/grace period tracking

### ClearFund - Expense Management

- Expense request and approval workflow
- Automatic splitting based on custody percentages
- Payment tracking and ledger
- Receipt uploads
- Stripe payment integration

### Family File & Cubbie

- Centralized child information repository
- Medical, educational, and preference data
- Digital "backpack" for item tracking
- Exchange item management

### Court Export

- Compliance metrics and analytics
- Evidence compilation (messages, agreements, schedules)
- Court-ready PDF packages
- SHA-256 integrity verification

---

## Database Migrations

```bash
cd mvp/backend

# Apply all migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Rollback one migration
alembic downgrade -1
```

---

## API Documentation

Once the backend is running, access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Key API modules:
- `/api/v1/auth` - Authentication
- `/api/v1/cases` - Case management
- `/api/v1/agreements` - Agreement builder
- `/api/v1/messages` - ARIA messaging
- `/api/v1/schedule` - Calendar and events
- `/api/v1/kidcoms` - Video calling
- `/api/v1/clearfund` - Expense management
- `/api/v1/court` - Court exports

---

## Deployment

### Recommended Stack

| Service | Provider |
|---------|----------|
| Frontend | Vercel |
| Backend | Railway or Render |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Cache | Redis Cloud or Upstash |
| Video | Daily.co |

### Deploy to Production

**Frontend (Vercel):**
```bash
cd mvp/frontend
vercel
```

**Backend (Railway):**
- Connect repository
- Set environment variables
- Deploy with `railway up`

---

## Development

### Code Style

- **Python**: Follow PEP 8, use type hints
- **TypeScript**: Strict mode enabled
- **Commits**: Conventional commits format

```
feat(aria): add message rewriting suggestions
fix(schedule): correct timezone handling
docs(api): update authentication examples
```

### Testing

```bash
# Backend tests
cd mvp/backend
pytest

# Frontend tests
cd mvp/frontend
npm test
```

---

## Documentation

Detailed documentation is available in [mvp/docs/](mvp/docs/):

- [Architecture Overview](mvp/docs/architecture/OVERVIEW.md)
- [System Architecture](mvp/docs/architecture/SYSTEM_ARCHITECTURE.md)
- [API Reference](mvp/docs/api/API_REFERENCE.md)
- [Database Schema](mvp/docs/database/SCHEMA.md)
- [Setup Guide](mvp/docs/guides/SETUP_GUIDE.md)
- [Security](mvp/docs/operations/SECURITY.md)

Feature documentation:
- [ARIA](mvp/docs/features/ARIA.md)
- [KidComs](mvp/docs/features/KIDCOMS.md)
- [Schedule System](mvp/docs/features/SCHEDULE.md)
- [ClearFund](mvp/docs/features/CLEARFUND.md)

---

## License

Proprietary - All rights reserved.

---

## Support

For issues and feature requests, contact the development team.
