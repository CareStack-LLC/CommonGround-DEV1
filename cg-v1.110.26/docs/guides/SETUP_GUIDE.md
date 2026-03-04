# CommonGround V1.110 - Local Development Setup Guide

**Last Updated:** February 14, 2026
**Version:** 1.110.26

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Database Setup](#database-setup)
6. [Environment Configuration](#environment-configuration)
7. [Running the Application](#running-the-application)
8. [Development Workflow](#development-workflow)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Python | 3.11+ | Backend runtime |
| Node.js | 18+ | Frontend runtime |
| PostgreSQL | 15+ | Database |
| Docker | 24+ | Container runtime (optional) |
| Git | 2.40+ | Version control |

### Recommended Tools

| Tool | Purpose |
|------|---------|
| VS Code | IDE with extensions |
| Postman | API testing |
| pgAdmin | Database management |
| Docker Desktop | Container management |

### VS Code Extensions

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "charliermarsh.ruff",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "mtxr.sqltools",
    "mtxr.sqltools-driver-pg"
  ]
}
```

---

## Quick Start

### One-Command Setup (Docker)

```bash
# Clone repository
git clone https://github.com/your-org/commonground.git
cd commonground

# Start all services
docker-compose up -d

# Access:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
```

### Manual Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/commonground.git
cd commonground

# 2. Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings

# 3. Database setup
createdb commonground
alembic upgrade head
python -m scripts.seed_data  # Optional: seed test data

# 4. Start backend
uvicorn app.main:app --reload

# 5. Frontend setup (new terminal)
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local with your settings
npm run dev

# Access:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
```

---

## Backend Setup

### Step 1: Python Environment

```bash
cd backend

# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate

# Verify Python version
python --version  # Should show Python 3.11.x
```

### Step 2: Install Dependencies

```bash
# Install production dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -r requirements-dev.txt

# Verify installation
pip list | grep fastapi
```

### Step 3: Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your preferred editor
```

**Required Environment Variables:**

```bash
# .env file

# Application
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=your-secret-key-here-generate-with-python-secrets

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/commonground

# Supabase (Auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# AI Services
ANTHROPIC_API_KEY=sk-ant-your-key
OPENAI_API_KEY=sk-your-key

# Video (KidComs)
DAILY_API_KEY=your-daily-key

# Email (optional for dev)
SENDGRID_API_KEY=optional-for-dev
```

**Generate Secret Key:**

```python
import secrets
print(secrets.token_urlsafe(32))
```

### Step 4: Database Setup

```bash
# Create database
createdb commonground

# Run migrations
alembic upgrade head

# Verify tables created
psql commonground -c "\dt"
```

### Step 5: Start Backend Server

```bash
# Development mode with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using the run script
python -m app.main
```

**Verify Backend Running:**

```bash
# Health check
curl http://localhost:8000/health

# API docs
open http://localhost:8000/docs
```

---

## Frontend Setup

### Step 1: Node.js Environment

```bash
cd frontend

# Verify Node.js version
node --version  # Should show v18.x or higher
npm --version   # Should show v9.x or higher
```

### Step 2: Install Dependencies

```bash
# Install dependencies
npm install

# If you encounter peer dependency issues:
npm install --legacy-peer-deps
```

### Step 3: Environment Configuration

```bash
# Copy example environment file
cp .env.example .env.local

# Edit with your settings
nano .env.local
```

**Required Environment Variables:**

```bash
# .env.local

# API URL
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Feature flags
NEXT_PUBLIC_FEATURE_KIDCOMS=true
NEXT_PUBLIC_FEATURE_CLEARFUND=true
```

### Step 4: Start Development Server

```bash
# Start Next.js dev server
npm run dev

# Or with turbo (faster)
npm run dev:turbo
```

**Verify Frontend Running:**

```bash
# Open in browser
open http://localhost:3000
```

---

## Database Setup

### Option 1: Local PostgreSQL

```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-15

# Windows
# Download installer from https://www.postgresql.org/download/windows/
```

**Create Database:**

```bash
# Create database
createdb commonground

# Or with psql
psql -c "CREATE DATABASE commonground;"

# Create test database
createdb commonground_test
```

### Option 2: Docker PostgreSQL

```bash
# Start PostgreSQL container
docker run -d \
  --name commonground-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=commonground \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  postgres:15

# Verify running
docker logs commonground-postgres
```

### Option 3: Supabase (Cloud)

1. Create project at https://supabase.com
2. Get connection string from Settings → Database
3. Update DATABASE_URL in .env

### Database Migrations

```bash
cd backend

# Apply all migrations
alembic upgrade head

# Check current version
alembic current

# Create new migration
alembic revision --autogenerate -m "description"

# Rollback last migration
alembic downgrade -1

# View migration history
alembic history
```

### Seed Data (Optional)

```bash
# Seed test users and cases
python -m scripts.seed_data

# This creates:
# - Test users: test@example.com / TestPass123!
# - Sample case with children
# - Sample messages and agreements
```

---

## Environment Configuration

### Complete Backend .env

```bash
# ======================
# APPLICATION SETTINGS
# ======================
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG
SECRET_KEY=your-secret-key-here

# Server
HOST=0.0.0.0
PORT=8000
WORKERS=1
RELOAD=true

# ======================
# DATABASE
# ======================
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/commonground
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10
DATABASE_POOL_TIMEOUT=30

# ======================
# AUTHENTICATION
# ======================
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# ======================
# AI SERVICES
# ======================
# Anthropic (Primary)
ANTHROPIC_API_KEY=sk-ant-your-key
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# OpenAI (Fallback)
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4

# ARIA Settings
ARIA_INTERVENTION_THRESHOLD=0.30
ARIA_BLOCK_THRESHOLD=0.80

# ======================
# VIDEO (KIDCOMS)
# ======================
DAILY_API_KEY=your-daily-key
DAILY_DOMAIN=your-domain.daily.co

# ======================
# EMAIL (OPTIONAL FOR DEV)
# ======================
SENDGRID_API_KEY=optional
FROM_EMAIL=noreply@commonground.app

# ======================
# STORAGE
# ======================
STORAGE_BUCKET=commonground-dev
MAX_UPLOAD_SIZE_MB=50

# ======================
# CORS
# ======================
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Complete Frontend .env.local

```bash
# ======================
# API CONFIGURATION
# ======================
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# ======================
# SUPABASE
# ======================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ======================
# FEATURE FLAGS
# ======================
NEXT_PUBLIC_FEATURE_KIDCOMS=true
NEXT_PUBLIC_FEATURE_CLEARFUND=true
NEXT_PUBLIC_FEATURE_EXPORTS=true
NEXT_PUBLIC_FEATURE_COURT_PORTAL=true

# ======================
# ANALYTICS (OPTIONAL)
# ======================
NEXT_PUBLIC_GA_ID=optional
NEXT_PUBLIC_SENTRY_DSN=optional

# ======================
# DEV TOOLS
# ======================
NEXT_PUBLIC_SHOW_DEV_TOOLS=true
```

---

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Using Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: commonground
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/commonground
    depends_on:
      - postgres
    volumes:
      - ./backend:/app

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000/api/v1
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  pgdata:
```

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Available URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js application |
| Backend API | http://localhost:8000 | FastAPI server |
| API Docs | http://localhost:8000/docs | Swagger UI |
| ReDoc | http://localhost:8000/redoc | Alternative docs |
| Health Check | http://localhost:8000/health | Service health |

---

## Development Workflow

### Daily Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Activate backend environment
cd backend
source venv/bin/activate

# 3. Update dependencies if needed
pip install -r requirements.txt

# 4. Run migrations if needed
alembic upgrade head

# 5. Start backend
uvicorn app.main:app --reload

# 6. In new terminal, start frontend
cd frontend
npm install  # if package.json changed
npm run dev
```

### Making Changes

```bash
# Backend changes
1. Edit files in app/
2. Backend auto-reloads
3. Test at http://localhost:8000/docs

# Frontend changes
1. Edit files in app/ or components/
2. Frontend auto-reloads (Fast Refresh)
3. Test at http://localhost:3000

# Database changes
1. Modify models in app/models/
2. Create migration: alembic revision --autogenerate -m "description"
3. Review migration file
4. Apply: alembic upgrade head
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat(scope): description"

# Push and create PR
git push -u origin feature/your-feature
```

---

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run specific test
pytest tests/test_auth.py::test_login_success

# Run with verbose output
pytest -v

# Run only fast tests (no external services)
pytest -m "not slow"
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

### API Testing with curl

```bash
# Register user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "first_name": "Test",
    "last_name": "User"
  }'

# Login
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPass123!"}' \
  | jq -r '.data.access_token')

# Get user profile
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Create case
curl -X POST http://localhost:8000/api/v1/cases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "case_name": "Test Case",
    "state": "CA",
    "other_parent_email": "other@example.com"
  }'
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Find process using port
lsof -i :8000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
uvicorn app.main:app --port 8001
```

#### 2. Database Connection Failed

```bash
# Check PostgreSQL running
pg_isready

# Check connection
psql -U postgres -d commonground -c "SELECT 1"

# Check Docker container
docker ps | grep postgres
docker logs commonground-postgres
```

#### 3. Module Not Found

```bash
# Ensure virtual environment is active
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt

# Check Python path
python -c "import sys; print(sys.path)"
```

#### 4. Migration Errors

```bash
# Check current state
alembic current

# View pending migrations
alembic history

# If stuck, reset (DEV ONLY!)
alembic downgrade base
alembic upgrade head

# Or recreate database
dropdb commonground
createdb commonground
alembic upgrade head
```

#### 5. CORS Errors

```bash
# Check ALLOWED_ORIGINS in .env
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Restart backend after changing
```

#### 6. Node.js Version Issues

```bash
# Check version
node --version

# Install correct version with nvm
nvm install 18
nvm use 18

# Or with volta
volta pin node@18
```

#### 7. npm Install Failures

```bash
# Clear cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try with legacy peer deps
npm install --legacy-peer-deps
```

### Getting Help

1. Check existing documentation in `/docs`
2. Search issues on GitHub
3. Check logs: `docker-compose logs -f`
4. Enable debug mode in .env

---

## Document Index

| Document | Location | Purpose |
|----------|----------|---------|
| **SETUP_GUIDE.md** | `/docs/guides/` | This document |
| DEPLOYMENT_GUIDE.md | `/docs/guides/` | Production deployment |
| CONTRIBUTING.md | `/docs/` | Contribution guidelines |
| TROUBLESHOOTING.md | `/docs/guides/` | Common issues |

---

*Last Updated: January 10, 2026*
*Document Version: 1.0.0*
