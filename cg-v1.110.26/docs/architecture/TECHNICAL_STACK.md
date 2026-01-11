# CommonGround V1 - Technical Stack Breakdown

**Last Updated:** January 10, 2026
**Version:** 1.0.0

---

## Table of Contents

1. [Stack Overview](#stack-overview)
2. [Backend Technologies](#backend-technologies)
3. [Frontend Technologies](#frontend-technologies)
4. [Database Technologies](#database-technologies)
5. [AI/ML Components](#aiml-components)
6. [Infrastructure & Hosting](#infrastructure--hosting)
7. [Development Tools](#development-tools)
8. [External Services](#external-services)
9. [Package Versions](#package-versions)

---

## Stack Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Next.js 14 (App Router) + React 18 + TypeScript 5          │   │
│  │  Tailwind CSS 4 + shadcn/ui + Lucide Icons                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ REST API (HTTPS)
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          APPLICATION LAYER                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  FastAPI 0.104+ (Python 3.11+)                              │   │
│  │  Pydantic 2.0+ (Validation) + Python-Jose (JWT)             │   │
│  │  Async/Await throughout                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ SQLAlchemy Async ORM
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL 15 (via Supabase)                               │   │
│  │  SQLAlchemy 2.0+ Async + Alembic Migrations                 │   │
│  │  30+ Tables, 27+ Models                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ External API Calls
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ Anthropic  │  │   OpenAI   │  │   Daily    │  │  SendGrid  │   │
│  │  Claude    │  │  (Backup)  │  │  (Video)   │  │  (Email)   │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Backend Technologies

### Core Framework: FastAPI

**Version:** 0.104+

**Why FastAPI:**
- High performance (Starlette + Pydantic)
- Native async/await support
- Automatic OpenAPI documentation
- Type hints throughout
- Dependency injection system
- WebSocket support

**Key Features Used:**
```python
# Dependency Injection
@router.get("/cases/")
async def list_cases(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ...

# Automatic Validation
@router.post("/cases/", response_model=CaseResponse)
async def create_case(data: CaseCreate, ...):
    ...

# Background Tasks
@router.post("/messages/")
async def send_message(..., background_tasks: BackgroundTasks):
    background_tasks.add_task(send_notification, ...)
```

**File Location:** `mvp/backend/app/main.py`

### Python Version: 3.11+

**Key Features Used:**
- Type hints with generics
- Async generators
- Exception groups
- Pattern matching
- Improved error messages

### ORM: SQLAlchemy 2.0 (Async)

**Version:** 2.0+

**Why Async SQLAlchemy:**
- Non-blocking database operations
- Works with FastAPI's async nature
- Better performance under load
- Modern relationship patterns

**Configuration:**
```python
# Database session management
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

**File Location:** `mvp/backend/app/core/database.py`

### Validation: Pydantic 2.0

**Version:** 2.0+

**Why Pydantic:**
- Fast validation (Rust core)
- IDE autocompletion
- JSON Schema generation
- Seamless FastAPI integration

**Schema Pattern:**
```python
class CaseCreate(BaseModel):
    case_name: str = Field(..., min_length=1, max_length=255)
    other_parent_email: EmailStr
    state: str = Field(..., min_length=2, max_length=2)

    model_config = ConfigDict(from_attributes=True)
```

**File Location:** `mvp/backend/app/schemas/`

### Authentication: JWT + Supabase

**Libraries:**
- `python-jose` - JWT encoding/decoding
- `passlib[bcrypt]` - Password hashing
- `supabase-py` - Supabase client

**Token Flow:**
1. User registers/logs in via Supabase Auth
2. Backend validates Supabase token
3. Backend issues its own JWT for API access
4. Tokens include user ID and role claims

**File Location:** `mvp/backend/app/core/security.py`

### HTTP Client: httpx

**Version:** 0.25+

**Usage:**
- Anthropic API calls
- OpenAI API calls
- Daily API integration
- External webhook calls

### PDF Generation: ReportLab + PyPDF

**Libraries:**
- `reportlab` - PDF creation
- `pypdf` - PDF manipulation
- `python-docx` - Word document generation

**Usage:**
- Agreement PDF generation
- Court form filling (FL-300, FL-311)
- Export package compilation

---

## Frontend Technologies

### Framework: Next.js 14 (App Router)

**Version:** 14.0+

**Why Next.js App Router:**
- Server Components (reduced bundle)
- Streaming and Suspense
- Improved routing patterns
- Built-in optimizations
- API routes if needed

**Key Patterns:**
```typescript
// Server Component (default)
export default async function DashboardPage() {
  const data = await fetchData();
  return <Dashboard data={data} />;
}

// Client Component
'use client';
export function MessageCompose() {
  const [content, setContent] = useState('');
  ...
}
```

**File Location:** `mvp/frontend/app/`

### UI Framework: React 18+

**Key Features Used:**
- Server Components
- Concurrent Rendering
- Automatic Batching
- Transitions
- Suspense for Data Fetching

### Language: TypeScript 5

**Version:** 5.0+

**Configuration:**
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

**File Location:** `mvp/frontend/tsconfig.json`

### Styling: Tailwind CSS 4

**Version:** 4.0+

**Why Tailwind:**
- Utility-first approach
- No CSS file management
- Consistent design tokens
- Purged for production
- Dark mode support ready

**Configuration:**
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {...},
        secondary: {...}
      }
    }
  }
}
```

### Component Library: shadcn/ui

**Why shadcn/ui:**
- Copy-paste components (no dependency)
- Full customization control
- Radix UI primitives underneath
- Accessible by default
- Tailwind styled

**Components Used:**
- Button, Card, Input, Label
- Dialog, Sheet, Dropdown
- Form, Select, Checkbox
- Table, Tabs, Toast
- Calendar, Badge, Avatar

**File Location:** `mvp/frontend/components/ui/`

### Icons: Lucide React

**Version:** Latest

**Usage:**
```typescript
import { Home, Settings, MessageSquare } from 'lucide-react';

<Home className="h-5 w-5" />
```

### State Management: React Context

**Pattern:**
```typescript
// Auth Context
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**File Location:** `mvp/frontend/lib/auth-context.tsx`

### API Client: Custom Fetch Wrapper

**Pattern:**
```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new APIError(response);
  }

  return response.json();
}
```

**File Location:** `mvp/frontend/lib/api.ts`

---

## Database Technologies

### Primary Database: PostgreSQL 15

**Hosted On:** Supabase

**Why PostgreSQL:**
- ACID compliance
- Advanced JSON support
- Full-text search
- Row-level security (Supabase)
- Proven reliability

**Key Features Used:**
- UUID primary keys
- JSONB columns for flexible data
- Array columns
- Timestamp with timezone
- Check constraints

### ORM: SQLAlchemy 2.0 Async

**Model Pattern:**
```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationships
    cases: Mapped[List["CaseParticipant"]] = relationship(
        back_populates="user"
    )
```

**File Location:** `mvp/backend/app/models/`

### Migrations: Alembic

**Version:** 1.12+

**Usage:**
```bash
# Generate migration
alembic revision --autogenerate -m "Add new column"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

**File Location:** `mvp/backend/alembic/`

### Connection Pooling

**Configuration:**
```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300
)
```

---

## AI/ML Components

### Primary AI: Anthropic Claude

**Model:** claude-sonnet-4

**Usage Areas:**
1. **ARIA Sentiment Analysis** - Message toxicity detection
2. **ARIA Suggestions** - Collaborative message rewrites
3. **Quick Accord** - Issue-specific agreement drafting
4. **Paralegal Mode** - Court form assistance
5. **Extraction Schema** - Structured data extraction from documents

**Integration:**
```python
from anthropic import Anthropic

client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system=ARIA_SYSTEM_PROMPT,
    messages=[{"role": "user", "content": message}]
)
```

**File Location:** `mvp/backend/app/services/aria.py`

### Fallback AI: OpenAI

**Model:** gpt-4o

**Usage:**
- Fallback when Claude is unavailable
- Second opinion for sentiment analysis
- Alternative suggestion generation

**Integration:**
```python
from openai import OpenAI

client = OpenAI(api_key=settings.OPENAI_API_KEY)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": ARIA_SYSTEM_PROMPT},
        {"role": "user", "content": message}
    ]
)
```

### Three-Tier Analysis Pipeline

```
Message Input
     │
     ▼
┌─────────────┐
│  Tier 1:    │ Fast pattern matching
│   Regex     │ Obvious toxicity detection
└─────┬───────┘
      │ If unclear
      ▼
┌─────────────┐
│  Tier 2:    │ Primary AI analysis
│   Claude    │ Nuanced sentiment detection
└─────┬───────┘
      │ If unavailable
      ▼
┌─────────────┐
│  Tier 3:    │ Fallback AI
│   OpenAI    │ Secondary analysis
└─────────────┘
```

---

## Infrastructure & Hosting

### Frontend Hosting: Vercel

**Why Vercel:**
- Native Next.js support
- Edge functions
- Automatic preview deployments
- CDN included
- Simple CI/CD

**Configuration:**
- Framework: Next.js
- Build Command: `npm run build`
- Output: `.next`

### Backend Hosting: Railway (Planned)

**Why Railway:**
- Docker support
- PostgreSQL integration
- Easy environment variables
- Automatic deployments
- Reasonable pricing

**Alternative:** Render, Fly.io

### Database Hosting: Supabase

**Services Used:**
1. **PostgreSQL Database** - Primary data storage
2. **Authentication** - User registration and login
3. **Storage** - File uploads (receipts, documents)
4. **Realtime** - WebSocket subscriptions (future)

**Configuration:**
```python
SUPABASE_URL = "https://xxx.supabase.co"
SUPABASE_ANON_KEY = "eyJ..."
SUPABASE_SERVICE_KEY = "eyJ..."  # Server-side only
```

### Local Development: Docker Compose

**Services:**
```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: commonground
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"
```

**File Location:** `mvp/docker-compose.yml`

---

## Development Tools

### Backend

| Tool | Purpose |
|------|---------|
| `pytest` | Testing framework |
| `pytest-asyncio` | Async test support |
| `black` | Code formatting |
| `isort` | Import sorting |
| `mypy` | Static type checking |
| `ruff` | Fast linter |

### Frontend

| Tool | Purpose |
|------|---------|
| `eslint` | Code linting |
| `prettier` | Code formatting |
| `vitest` | Testing (if configured) |
| `typescript` | Type checking |

### Version Control

| Tool | Purpose |
|------|---------|
| `git` | Version control |
| `GitHub` | Repository hosting |
| `Conventional Commits` | Commit message format |

---

## External Services

### Video Calling: Daily

**Purpose:** KidComs video call infrastructure

**Features:**
- WebRTC-based calls
- Room creation via API
- Participant management
- Recording capabilities

**Integration:**
```typescript
// Create a Daily room
const room = await daily.createRoom({
  name: `kidcoms-${sessionId}`,
  properties: {
    max_participants: 4,
    enable_recording: false
  }
});
```

### Email: SendGrid

**Purpose:** Transactional email delivery

**Email Types:**
- Case invitations
- Message notifications
- Schedule reminders
- Approval requests
- Password reset

**Integration:**
```python
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

message = Mail(
    from_email='noreply@commonground.app',
    to_emails=recipient,
    subject=subject,
    html_content=html_template
)
sg.send(message)
```

---

## Package Versions

### Backend Requirements

```
# Core Framework
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
python-multipart>=0.0.6

# Database
sqlalchemy[asyncio]>=2.0.0
asyncpg>=0.29.0
alembic>=1.12.0

# Authentication
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
supabase>=2.0.0

# AI/ML
anthropic>=0.7.0
openai>=1.0.0

# PDF/Documents
reportlab>=4.0.0
pypdf>=3.0.0
python-docx>=1.0.0

# HTTP Client
httpx>=0.25.0

# Utilities
python-dotenv>=1.0.0
pydantic>=2.0.0
pydantic-settings>=2.0.0

# Email
sendgrid>=6.10.0

# Video
daily-python>=0.5.0
```

**File Location:** `mvp/backend/requirements.txt`

### Frontend Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",

    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-label": "^2.0.0",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slot": "^1.0.0",
    "@radix-ui/react-tabs": "^1.0.0",

    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.300.0",
    "tailwind-merge": "^2.0.0",
    "tailwindcss-animate": "^1.0.0",

    "date-fns": "^3.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0"
  }
}
```

**File Location:** `mvp/frontend/package.json`

---

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/commonground
DATABASE_SYNC_URL=postgresql://user:pass@host:5432/commonground

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Email
SENDGRID_API_KEY=SG....
FROM_EMAIL=noreply@commonground.app

# Video
DAILY_API_KEY=...

# Environment
ENVIRONMENT=development
DEBUG=true
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

*For detailed information about specific components, see the corresponding documentation in each section.*
