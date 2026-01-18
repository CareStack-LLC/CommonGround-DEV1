# CommonGround Frontend

**Framework:** Next.js 16 with App Router
**Language:** TypeScript 5
**Styling:** Tailwind CSS 4 + shadcn/ui
**State Management:** React Context API
**Version:** 1.5.0

---

## Overview

This is the frontend application for CommonGround, an AI-powered co-parenting platform that helps separated parents communicate effectively, manage custody agreements, and track compliance with court orders.

**Key Features:**
- Authentication with Supabase Auth + TOTP MFA
- ARIA-powered messaging (AI sentiment analysis)
- 7/18-section custody agreement wizard (v2/v1)
- Calendar with custody exchange tracking
- Custody time tracking with visual reports
- Dashboard with multi-family file aggregation
- KidComs video calling with Daily.co
- My Circle trusted contact network
- ClearFund expense management

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running (see `../backend/README.md`)
- Environment variables configured

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Open http://localhost:3000
```

### Environment Variables

Create `.env.local` with:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Application Structure

### Stats
- **Pages:** 123 route pages
- **Components:** 109 reusable components
- **API Integration:** Full REST API client in `lib/api.ts`

### Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Marketing homepage |
| `/login`, `/register` | Authentication |
| `/dashboard` | Main dashboard with family files overview |
| `/family-files` | Family file management |
| `/family-files/[id]` | Individual family file detail |
| `/messages` | ARIA-powered messaging |
| `/agreements` | Agreement builder |
| `/agreements/[id]/builder-v2` | 7-section agreement wizard (v2) |
| `/schedule` | Calendar & custody exchanges |
| `/kidcoms` | Video calling for children |
| `/my-circle` | Trusted contacts management |
| `/settings` | Account, billing, security, notifications |
| `/court-portal` | GAL/Attorney portal |

### Component Categories

```
components/
├── ui/              # shadcn/ui primitives
├── agreements/      # Agreement builder components
├── dashboard/       # Dashboard widgets
├── schedule/        # Calendar and exchange components
├── kidcoms/         # Video call components
├── messages/        # Messaging components
└── shared/          # Shared utilities
```

---

## Development

### Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
```

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Tailwind CSS for styling
- Functional components with hooks
- Named exports preferred

---

## Deployment

**Production:** Vercel at https://common-ground-blue.vercel.app

---

**Last Updated:** January 17, 2026
**Version:** 1.5.0
