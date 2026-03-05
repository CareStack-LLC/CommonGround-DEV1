# Master Documentation: Guides

This document is a consolidation of all documentation files in this directory.

---

## Document: ENGINEER_ONBOARDING.md

# CommonGround Universal Engineer Onboarding

Welcome to the definitive guide for engineers contributing to the CommonGround ecosystem. This document provides a high-fidelity map of every feature, platform, and interconnecting logic within our co-parenting sanctuary.

---

## 🏛️ One Platform, Three Access Points

CommonGround is delivered across three distinct interfaces, all backed by a unified FastAPI backend.

### 1. The Mobile App (PWA)
Optimized for on-the-go parents. High-frequency interactions occur here.
- **Features**: GPS check-ins, real-time chat, KidComs calls, mobile notifications.
- **Implementation**: Next.js optimized with Service Workers (`sw.js`). PWA manifest allows "Install to Home Screen" on iOS and Android.

### 2. The Web Tablet/Desktop Portal
The full suite for administrative and legal tasks.
- **Features**: 18-section Agreement builder, Financial reporting, document uploads (Family Files).
- **Implementation**: Responsive Next.js 16 (App Router).

### 3. The Professional Portal
A specialized interface for Attorneys, Mediators, and Paralegals.
- **Features**: Firm management, Case Assignments, Compliance Dashboards, ARIA Intervention control.
- **Implementation**: Scoped access via `backend/app/api/v1/endpoints/professional.py`.

---

## � Exhaustive Feature Catalog

### 🛡️ ARIA Safety Shield Suite
The AI Relationship Intelligence Assistant (ARIA) is the core of our "Sanctuary of Truth."
- **Tier 1 (Instant)**: Regex-based toxicity checks catch immediate threats.
- **Tier 2 (AI Analysis)**: Claude 3.5 Sonnet analyzes sentiment (Blame, Passive-Aggression).
- **Intervention**: Replaces toxic content with "Safe Suggestions."
- **Professional Control**: Legal pros can adjust thresholds (Sensitivity) and toggle auto-intervention.

### 🎥 KidComs™ (Child-Centric Video)
A safe digital bridge for children to communicate with their "Circle" (parents, grandparents).
- **Voice/Video**: Backed by Daily.co with AI call monitoring.
- **The Arcade**: Multiplayer web games (Phaser.js) synced over WebSockets.
- **Theater**: Collaborative video sync for movie nights.
- **Whiteboard**: Real-time collaborative drawings.
- **Circle Controls**: Parents must approve every contact in a child's list.

### 📄 The Reporting System
Our "Court-Ready" guarantee is delivered through these specific report types.

| Report Type | Purpose | Audience |
| :--- | :--- | :--- |
| **Custody Time** | Actual vs. Agreed parenting time split. | Parents / Legal |
| **Communication** | Sentiment trends and ARIA intervention logs. | Legal / Court |
| **Expense Summary** | ClearFund obligation and payment auditing. | Parents / Legal |
| **Schedule History** | GPS-verified exchange timestamps and locations. | Parents / Court |
| **Court Investigation** | Consolidated "Case in a Box" package. | Professional Only |

---

## � Feature Interconnectivity (The "How it Relates")

### From Message to Evidence
1.  **Parent A** sends a message on the **Mobile App**.
2.  **ARIA** intercepts, flags hostility, and suggests a rewrite.
3.  **Parent A** ignores the suggestion and sends anyway (logged as "Bad Faith").
4.  **Attorney** views the "Good Faith Score" in the **Professional Portal**.
5.  **Attorney** generates a **Communication Analysis Report** including the original toxic draft as evidence.

### From Agreement to Financials
1.  **Parents** build an **SCA (SharedCare Agreement)** on the **Web Desktop**.
2.  **Section 12 (Child Support)** defines a $500 monthly obligation.
3.  The system automatically populates **ClearFund** with an upcoming obligation.
4.  **Parent B** pays via **Mobile App** (Stripe integration).
5.  **Financial Compliance Report** reflects 100% on-time payment history for court.

---

## 🛠️ Codebase Navigation for Feature Leads

- `backend/app/services/aria.py`: The AI brain.
- `backend/app/services/reports/`: The PDF generation engine.
- `backend/app/api/v1/endpoints/kidcoms.py`: The complex socket/video logic.
- `frontend/components/professional/`: UI for the legal portal.
- `frontend/lib/consensus.ts`: Frontend hooks for dual-parent approval workflows.

---

## � Pro Tips for Deep Contributors

- **Scoping**: When adding a feature, ask: "Should a Professional see this?" If yes, add a new `CaseAssignmentScope`.
- **Latency**: KidComs is sensitive to latency. Use WebSockets (`websocket-context.tsx`) for non-video sync.
- **Truth**: Never overwrite a record that has been "Activated" via dual-parent consensus. Always create a new version (`AgreementVersion`).

---

## Document: PROFESSIONAL_PORTAL_GUIDE.md

# Professional Portal - User Guide

**Last Updated:** February 14, 2026
**Version:** 1.110.26

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Cases](#managing-cases)
4. [Using the Case Timeline](#using-the-case-timeline)
5. [ARIA Controls](#aria-controls)
6. [Client Messaging](#client-messaging)
7. [Intake Center](#intake-center)
8. [Firm Management](#firm-management)
9. [Generating Exports](#generating-exports)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Step 1: Professional Onboarding

If you're new to CommonGround's Professional Portal:

1. **Log in** to your CommonGround account
2. Navigate to `/professional` or click "Professional Portal" in the menu
3. You'll be redirected to the **onboarding page**
4. Complete your professional profile:
   - **Professional Type**: Attorney, Mediator, Paralegal, etc.
   - **License Number**: Your state bar number or license ID
   - **License State**: State where you're licensed
   - **Practice Areas**: Custody, Divorce, Mediation, etc.

### Step 2: Create or Join a Firm

After completing your profile, you'll need to associate with a firm:

**Option A: Create a New Firm**
1. Click "Create New Firm"
2. Enter firm details:
   - Firm name
   - Firm type (Law Firm, Mediation Practice, Solo Practice)
   - Contact information
   - Address
3. You'll automatically become the firm **Owner**

**Option B: Join an Existing Firm**
1. Ask a firm admin to send you an invite
2. Check your email for the invitation link
3. Click the link to accept and join the firm

### Step 3: Accept Case Assignments

Cases are assigned to you by parents or through your firm:

1. Go to **Access Requests** in the sidebar
2. Review pending invitations
3. Click "Accept" and select your role:
   - **Lead Attorney**: Primary attorney on the case
   - **Associate**: Supporting attorney
   - **Paralegal**: Legal support staff
   - **Mediator**: Neutral mediator for both parties

---

## Dashboard Overview

The dashboard provides a complete overview of your practice:

### Quick Stats Cards

| Stat | Description |
|------|-------------|
| **Active Cases** | Number of cases you're currently assigned to |
| **Pending Intakes** | Client intakes awaiting your review |
| **Unread Messages** | Messages from clients you haven't read |
| **Pending Approvals** | Access requests waiting for your response |

### Alerts Section

High-priority items requiring attention:

- **Court Deadlines**: Upcoming filing deadlines
- **Intake Pending**: Completed intakes awaiting review
- **ARIA Flags**: High-severity communication issues
- **Compliance Issues**: Exchange or payment problems

### Upcoming Events

A calendar preview showing:
- Court hearings
- Mediation sessions
- Scheduled exchanges
- Document deadlines

### Recent Activity

Timeline of recent actions across your cases:
- New messages received
- Intakes completed
- Agreements approved
- Exchanges completed

---

## Managing Cases

### Case List

The case list (`/professional/cases`) shows all your assigned cases.

**Filtering Options:**
- **Status**: Active, On Hold, Completed
- **Role**: Lead Attorney, Associate, Paralegal, Mediator
- **Firm**: Filter by firm (if in multiple)
- **Search**: Search by case name or parent name

**Quick Actions:**
- Click a case card to open the case overview
- Use the action menu for quick access to timeline, messages, exports

### Case Overview

The case overview page shows:

**Header Information:**
- Case name (typically "Parent A v. Parent B")
- Your role and representing party
- Case status

**Parent Information:**
- Contact details for both parents
- Your client is highlighted

**Children:**
- Names and ages
- Current custody arrangement (if known)

**Agreements:**
- List of agreements with status
- Click to view agreement details

**Compliance Summary:**
- Exchange compliance percentage
- Financial compliance percentage
- Overall compliance score

**ARIA Summary:**
- Good faith score
- Recent interventions count
- Communication trend (improving/declining/stable)

---

## Using the Case Timeline

The timeline provides a chronological view of all case events.

### Event Types

| Icon | Type | Description |
|------|------|-------------|
| MessageSquare | Message | Parent-to-parent communications |
| Calendar | Exchange | Custody exchanges |
| FileText | Agreement | Agreement updates |
| Scale | Court | Court events |
| Bot | ARIA | AI intervention events |

### Filtering Events

Use the filter buttons to show specific event types:
1. Click the event type button to toggle visibility
2. Multiple types can be selected
3. Click "Clear filters" to show all

### Summary Stats

At the top, you'll see counts for each event type:
- Click a stat card to filter to that type
- The active filter is highlighted in green

### Event Details

Each event card shows:
- Event icon and type
- Event title
- Description (if available)
- Timestamp
- Status badge (for exchanges: completed, missed, cancelled)
- Relevant metadata (sender, location, etc.)

### Exporting Timeline

1. Click "Export" in the header
2. Select date range
3. Choose export format (PDF recommended)
4. Download the generated file

---

## ARIA Controls

If you have `can_control_aria` permission, you can adjust ARIA settings for your cases.

### Viewing ARIA Settings

The ARIA panel shows current configuration:
- **Sensitivity Level**: How aggressively ARIA flags messages
- **Intervention Mode**: Suggest rewrites or block messages
- **Blocked Categories**: Types of content that are blocked

### Adjusting Sensitivity

Choose based on conflict level:

| Level | Description | Recommended For |
|-------|-------------|-----------------|
| Low | Minimal intervention | Low-conflict cases |
| Medium | Standard intervention | Most cases |
| High | Aggressive intervention | High-conflict cases |
| Very High | Maximum intervention | Court-ordered supervision |

### Intervention History

View all ARIA interventions:
1. Go to "Intervention History" tab
2. See original message and suggested rewrite
3. View parent's action (accepted, rejected, modified)
4. Filter by action type

### Good Faith Metrics

Track communication quality over time:
- **Good Faith Score**: 0-1 scale, higher is better
- **Trend**: Improving, declining, or stable
- **Recent Interventions**: Count in last 30 days

---

## Client Messaging

Secure communication with your clients.

### Sending Messages

1. Go to case page → "Messages" tab
2. Click "New Message"
3. Select recipient (your client)
4. Enter subject and message
5. Click "Send"

### Message Features

- **Threading**: Messages are organized by conversation
- **Read Receipts**: See when client reads your message
- **Notifications**: Clients receive email notifications

### Best Practices

- Keep messages professional and documented
- Use clear subject lines for organization
- Avoid time-sensitive communications (use phone for urgent matters)
- Remember: Messages are logged and may be discoverable

---

## Intake Center

Manage AI-assisted client intakes.

### Creating an Intake

1. Go to `/professional/intake/new`
2. Enter client information:
   - Name
   - Email
   - Phone (optional)
3. Select intake type (Custody, Divorce, etc.)
4. Choose a template (if available)
5. Click "Create & Send"

The client receives an email with a link to complete the intake.

### Intake Session States

| Status | Description |
|--------|-------------|
| Draft | Created but not sent |
| In Progress | Client actively completing |
| Completed | Client finished, pending your review |
| Archived | Reviewed and closed |

### Reviewing Intakes

When an intake is completed:

1. Open the intake from the list
2. Review the **Transcript** tab for full conversation
3. Check **Outputs** tab for:
   - Extracted data (structured information)
   - AI-generated summary
4. Request clarification if needed
5. Mark as reviewed when done

### Extracted Data

ARIA extracts structured information:
- Client contact information
- Children's details
- Custody preferences
- Key concerns and issues

This data can be exported or used to create a case.

---

## Firm Management

### Team Management

Firm admins can manage team members:

1. Go to `/professional/firm/team`
2. View all firm members with roles
3. Click "Invite Member" to add someone new
4. Use action menu to change roles or remove members

### Member Roles

| Role | Can Do |
|------|--------|
| Owner | Everything, including delete firm |
| Admin | Manage members, templates, settings |
| Attorney | View/manage assigned cases |
| Paralegal | View assigned cases, limited actions |
| Intake | Create/manage intakes only |
| Readonly | View only, no actions |

### Firm Templates

Create reusable intake templates:

1. Go to `/professional/firm/templates`
2. Click "Create Template"
3. Define template:
   - Name and description
   - Template type (Custody, Divorce, etc.)
   - Custom questions
4. Save template

Templates are available to all firm members when creating intakes.

### Firm Settings

Configure firm-wide settings:
- Default intake templates
- ARIA preferences
- Notification settings
- Public directory listing

---

## Generating Exports

Create court-ready document packages.

### Available Export Types

| Type | Contents |
|------|----------|
| Timeline Export | Chronological case history |
| Communication Log | All parent messages with ARIA data |
| Compliance Report | Exchange and financial compliance |
| Full Case Package | Everything combined |

### Creating an Export

1. Go to case page → "Exports" tab
2. Select export type
3. Choose date range
4. Select options:
   - Include ARIA data
   - Include attachments
   - Redact personal information
5. Click "Generate Export"
6. Download when ready

### Export Security

All exports include:
- SHA-256 integrity hash
- Generation timestamp
- Professional who generated it
- Audit log entry

---

## Best Practices

### Case Management

1. **Regular Review**: Check dashboard daily for alerts
2. **Timeline First**: Review timeline before client meetings
3. **Document Actions**: Use notes feature for internal documentation
4. **Set Reminders**: Use calendar integration for deadlines

### ARIA Configuration

1. **Start Medium**: Begin with medium sensitivity
2. **Monitor Trends**: Watch for declining good faith scores
3. **Adjust Gradually**: Make small adjustments, observe results
4. **Document Changes**: Note why you changed settings

### Client Communication

1. **Professional Tone**: Maintain attorney-client relationship
2. **Clear Subject Lines**: Make messages easy to find
3. **Timely Responses**: Aim for 24-hour response time
4. **Use Templates**: Create templates for common responses

### Intake Management

1. **Quick Follow-up**: Review completed intakes promptly
2. **Request Clarification**: Don't assume, ask for details
3. **Use Extraction**: Leverage AI-extracted data
4. **Share Templates**: Create firm-wide templates

---

## Troubleshooting

### "Professional profile required" Error

**Problem**: You're trying to access the Professional Portal without a profile.

**Solution**:
1. Navigate to `/professional/onboarding`
2. Complete the onboarding form
3. Create or join a firm

### Case Not Appearing

**Problem**: A case you should have access to isn't showing.

**Checklist**:
1. Check if you're logged into the correct account
2. Verify the case assignment is active (not withdrawn)
3. Check if a firm filter is hiding the case
4. Confirm the access request was approved by both parents

### Can't Modify ARIA Settings

**Problem**: ARIA control buttons are disabled.

**Possible Causes**:
1. Your assignment doesn't have `can_control_aria` permission
2. Your professional type (e.g., paralegal) isn't authorized
3. The case is not in active status

**Solution**: Contact the lead attorney or firm admin to update your permissions.

### Access Request Stuck

**Problem**: An access request isn't being approved.

**Checklist**:
1. Verify both parents have been notified
2. Check if the request hasn't expired (7 days default)
3. Confirm parent accounts are active
4. Contact parents directly to approve

### Export Generation Failed

**Problem**: Export button shows error.

**Possible Causes**:
1. No data in selected date range
2. Rate limit exceeded (max 5 per hour)
3. Server error

**Solution**:
1. Try a different date range
2. Wait and try again later
3. Contact support if issue persists

---

## Getting Help

### Support Resources

- **Documentation**: [PLATFORM_CAPABILITIES.md](../architecture/PLATFORM_CAPABILITIES.md)
- **API Reference**: [API_SYSTEM_DESIGN.md](../architecture/API_SYSTEM_DESIGN.md)
- **Email Support**: support@commonground.app
- **Knowledge Base**: https://help.commonground.app

### Reporting Issues

When reporting issues, include:
1. Steps to reproduce
2. Error messages (if any)
3. Screenshots
4. Browser and device information

---

*Last Updated: February 14, 2026*
*Version: 1.110.26*

---

## Document: SETUP_GUIDE.md

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

---

## Document: WORKING_WITH_CLAUDE.md

# Working with Claude - Prompt Guide for Non-Coders

A practical guide for getting the best results from Claude when building and maintaining CommonGround.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Creating New Features](#creating-new-features)
3. [Debugging & Fixing Errors](#debugging--fixing-errors)
4. [Code Review & Quality Checks](#code-review--quality-checks)
5. [When Things Go Wrong](#when-things-go-wrong)
6. [Manual Checks You Can Do](#manual-checks-you-can-do)
7. [Token-Saving Tips](#token-saving-tips)
8. [Common Scenarios](#common-scenarios)

---

## Quick Reference

### The Golden Rules

1. **Be specific** - Tell me exactly what you want, not how to code it
2. **Give context** - Mention the feature, page, or component name
3. **Share errors** - Copy/paste the full error message
4. **One thing at a time** - Break big tasks into smaller requests
5. **Tell me the outcome** - Describe what should happen, not the implementation

### Power Words That Help

| Word | What It Does |
|------|--------------|
| "Fix" | I'll find and repair the problem |
| "Add" | I'll create something new |
| "Update" | I'll modify existing code |
| "Check" | I'll review without changing |
| "Explain" | I'll describe what's happening |
| "Debug" | I'll investigate an issue |
| "Test" | I'll verify something works |

---

## Creating New Features

### Template: New Feature Request

```
Add [FEATURE NAME] to [LOCATION/PAGE]

What it should do:
- [Behavior 1]
- [Behavior 2]
- [Behavior 3]

Similar to: [Reference existing feature if applicable]

Should work on: [desktop/mobile/both]
```

### Examples

**Good prompt:**
```
Add a "Mark as Urgent" button to expense requests in ClearFund

What it should do:
- Show a red flag icon next to urgent expenses
- Send a notification to the other parent
- Urgent items appear at top of the list

Similar to: The flagging system in messages
```

**Bad prompt:**
```
Make expenses better
```

### For UI/Design Changes

```
Update the [COMPONENT] design:
- Change [specific element] to [new style]
- Make it look like [reference]
- Keep the existing functionality
```

**Example:**
```
Update the custody status card on the dashboard:
- Make the progress bar thicker
- Add the child's photo next to their name
- Use the sage green color for "with me" status
```

### For Backend/API Features

```
Create an endpoint for [PURPOSE]

Input needed: [what data goes in]
Output expected: [what should come back]
Who can access: [parents/children/circle contacts/court]
```

**Example:**
```
Create an endpoint for getting a child's weekly screen time

Input needed: child_id, week_start_date
Output expected: total minutes, breakdown by day, comparison to last week
Who can access: both parents
```

---

## Debugging & Fixing Errors

### Template: Error Report

```
Error on [PAGE/FEATURE]

What I did:
1. [Step 1]
2. [Step 2]
3. [Step 3]

What happened: [Describe the error]

Error message:
[Paste the full error here]

Expected: [What should have happened]
```

### Examples

**Frontend Error:**
```
Error on the KidComs video call page

What I did:
1. Clicked "Start Call" with Emma
2. Camera permission granted
3. Page shows spinning loader forever

What happened: Call never connects, stuck on loading

Error message (from browser console):
TypeError: Cannot read property 'join' of undefined at DailyCall.tsx:142

Expected: Video call should start and show both participants
```

**Backend Error:**
```
Error when creating a new expense

What I did:
1. Went to ClearFund > Add Expense
2. Filled in amount: $150, category: Medical
3. Clicked Submit

What happened: Red error toast appeared

Error message:
422 Unprocessable Entity: {"detail": "child_id is required"}

Expected: Expense should be created and appear in the list
```

### Quick Debug Prompts

| Situation | Prompt |
|-----------|--------|
| Page won't load | "Debug why [page] shows a blank screen" |
| Button doesn't work | "Fix the [button name] button on [page] - clicking does nothing" |
| Data not showing | "The [component] isn't displaying [data type] - check the API connection" |
| Wrong data | "[Feature] is showing [wrong thing] instead of [right thing]" |
| Slow performance | "The [page/feature] is very slow - find out why" |

---

## Code Review & Quality Checks

### Before Deploying

```
Review the changes we just made for:
- Bugs or errors
- Security issues
- Missing error handling
- Mobile responsiveness
```

### Full System Check

```
Check [area] for issues:
- Backend: [specific service or endpoint]
- Frontend: [specific page or component]
- Look for: [errors/security/performance/all]
```

### Examples

**Quick check:**
```
Check the KidComs video calling for any obvious bugs before we deploy
```

**Thorough review:**
```
Do a full review of the My Circle feature:
- Check all API endpoints work correctly
- Verify permissions are enforced
- Test the invite flow end-to-end
- Look for any security issues
```

### Testing Prompts

```
Test the [feature] by:
1. [Scenario 1 to test]
2. [Scenario 2 to test]
3. [Edge case to check]

Tell me what works and what doesn't
```

---

## When Things Go Wrong

### When I Get Stuck or Fail

**Prompt to reset:**
```
Let's try a different approach. The previous attempt didn't work because [reason].

Start fresh and [describe what you need]
```

**Prompt for simpler solution:**
```
That solution is too complex. Give me the simplest possible fix for [problem]
```

**Prompt to break it down:**
```
Break this into smaller steps. What's the first thing we need to fix?
```

### When I Can't Access Files

**If I can't read a file:**
```
I'll paste the file contents here:

[Paste the file content]

Now [what you need done with it]
```

**If I can't run commands:**
```
Run this command and tell me the output:
[command I suggested]

Then I'll tell you what to do next
```

### When Changes Don't Work

```
The fix didn't work. Here's what's happening now:

Before: [what was happening]
After your change: [what's happening now]
New error (if any): [paste error]

Try again with a different approach
```

### Recovery Prompts

| Problem | Prompt |
|---------|--------|
| Made things worse | "Undo the last change and try something else" |
| Lost track | "Summarize what we've done and what's left" |
| Going in circles | "Stop. What's the root cause of this issue?" |
| Too complicated | "Simplify. What's the minimum change needed?" |

---

## Manual Checks You Can Do

### Browser Console Errors (Frontend)

1. Open your browser (Chrome recommended)
2. Go to the page with the issue
3. Press `F12` or right-click > "Inspect"
4. Click the "Console" tab
5. Look for red error messages
6. Copy and paste them to me

**Tell me:**
```
Browser console shows these errors on [page]:

[Paste red error messages]
```

### Network Requests (API Issues)

1. Open browser dev tools (`F12`)
2. Click "Network" tab
3. Reproduce the issue
4. Look for red requests (failed)
5. Click the failed request
6. Copy the response

**Tell me:**
```
API request to [endpoint] failed:

Status: [number like 400, 500]
Response: [paste the response body]
```

### Check if Backend is Running

**Mac Terminal:**
```bash
curl http://localhost:8000/health
```

**Tell me:**
```
Health check returned: [paste response]
```

Or: "Health check failed - connection refused"

### Check if Frontend is Running

1. Go to http://localhost:3000 in browser
2. Does the page load?

**Tell me:**
- "Frontend loads but [specific issue]"
- "Frontend shows blank page"
- "Frontend shows error: [error text]"

### Check Recent Git Changes

```bash
git log --oneline -10
git status
```

**Tell me:**
```
Recent commits:
[paste output]

Current status:
[paste output]
```

---

## Token-Saving Tips

### Do This (Efficient)

| Instead of... | Say this... |
|---------------|-------------|
| Long explanation of problem | "Fix [specific error] on [page]" |
| Asking how to do something | "Do [thing] for me" |
| Multiple questions | One focused request |
| Vague descriptions | Exact file/component names |

### Efficient Prompt Patterns

**For quick fixes:**
```
Fix: [one-line description]
File: [filename if known]
Error: [paste error]
```

**For small additions:**
```
Add [thing] to [location]. Make it [behavior].
```

**For updates:**
```
Change [current behavior] to [new behavior] in [location]
```

### When to Start a New Conversation

Start fresh when:
- Switching to a completely different feature
- The conversation is getting long (50+ messages)
- We've been going in circles on an issue
- You want to reset context

### Keep Me Focused

```
Only fix [specific thing]. Don't change anything else.
```

```
Quick fix only - no refactoring or improvements.
```

---

## Common Scenarios

### Scenario 1: Something Broke After an Update

```
[Feature] stopped working after recent changes.

It was working: [when/what version]
Now it shows: [current behavior/error]
Last thing changed: [if you know]

Find and fix the regression.
```

### Scenario 2: New Feature Request from User Feedback

```
Users are asking for [feature].

Use case: [why they need it]
Where it should go: [page/location]
Priority: [high/medium/low]

Design and implement this feature.
```

### Scenario 3: Performance Issue

```
[Page/feature] is slow.

How slow: [seconds to load, or description]
When it's slow: [always / specific conditions]
What data: [how much data is involved]

Find the bottleneck and fix it.
```

### Scenario 4: Mobile Not Working

```
[Feature] doesn't work on mobile.

Device: [iPhone/Android/both]
Browser: [Safari/Chrome]
What happens: [description]
Works on desktop: [yes/no]

Fix the mobile version.
```

### Scenario 5: Integration Issue

```
[Feature A] and [Feature B] aren't working together.

Expected: [how they should interact]
Actual: [what's happening]
Error: [if any]

Fix the integration.
```

### Scenario 6: Deploy Preparation

```
We're ready to deploy. Do a final check:

1. Run the build and fix any errors
2. Check for console warnings
3. Verify all API endpoints respond
4. Test on mobile viewport
5. List any issues found
```

### Scenario 7: Documentation Needed

```
Document [feature/system] for:
- How it works
- API endpoints involved
- Configuration options
- Common issues and solutions

Put it in docs/[appropriate folder]
```

---

## Emergency Prompts

### Site is Down

```
URGENT: Production site is down.

Error showing: [what users see]
When it started: [time]
Recent deploys: [yes/no, when]

Diagnose and fix immediately.
```

### Data Issue

```
URGENT: Data problem detected.

What's wrong: [missing/corrupted/wrong data]
Affected: [which users/cases]
When noticed: [time]

Investigate without making changes first.
```

### Security Concern

```
URGENT: Possible security issue.

What happened: [description]
Who reported: [user/system/you noticed]
Potential impact: [what could be affected]

Investigate and advise on immediate steps.
```

---

## Templates to Copy/Paste

### New Feature
```
Add [FEATURE] to [LOCATION]

Should do:
-
-
-

Works like: [similar feature]
```

### Bug Fix
```
Fix:
Page:
Error:

Steps to reproduce:
1.
2.
3.
```

### Quick Task
```
[ACTION] the [THING] in [LOCATION]
```

### Code Review
```
Review [FILE/FEATURE] for [bugs/security/performance]
```

### Investigation
```
Why is [THING] doing [BEHAVIOR]? Find the cause.
```

---

## Our Project-Specific Tips

### CommonGround File Locations

| What | Where |
|------|-------|
| Frontend pages | `frontend/app/[page-name]/page.tsx` |
| Frontend components | `frontend/components/` |
| API endpoints | `backend/app/api/v1/endpoints/` |
| Business logic | `backend/app/services/` |
| Database models | `backend/app/models/` |

### Commonly Referenced Features

- **ARIA** - AI message analysis (`services/aria.py`)
- **KidComs** - Video calling (`endpoints/kidcoms.py`)
- **ClearFund** - Expense tracking (`endpoints/clearfund.py`)
- **My Circle** - Contact management (`endpoints/circle.py`)
- **Family File** - Case/children management (`endpoints/family_files.py`)

### Commands You'll Use Often

```bash
# Start backend
cd backend && uvicorn app.main:app --reload

# Start frontend
cd frontend && npm run dev

# Check git status
git status

# See recent changes
git log --oneline -10

# Run backend tests
cd backend && pytest

# Build frontend (check for errors)
cd frontend && npm run build
```

---

## Final Tips

1. **Trust the process** - If I suggest something, try it before asking why
2. **Paste full errors** - Partial errors make debugging harder
3. **Be patient with debugging** - Sometimes we need 2-3 attempts
4. **Tell me outcomes** - "That worked!" or "Still broken" helps me learn
5. **Ask for explanations** - If you want to understand, just ask "Explain what you did"

**Remember:** You don't need to understand the code to direct me effectively. Focus on **what** you want, and I'll figure out **how** to do it.

---

*Last Updated: January 2025*

---

