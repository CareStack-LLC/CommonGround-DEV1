# CommonGround Frontend

**Framework:** Next.js 14 with App Router  
**Language:** TypeScript  
**Styling:** Tailwind CSS + shadcn/ui  
**State Management:** React Context API  
**Current Status:** ✅ MVP Complete + 18-Section Agreement Wizard

---

## 📋 Overview

This is the frontend application for CommonGround, a co-parenting platform that helps separated parents communicate effectively, manage custody agreements, and track compliance with court orders.

**Key Features:**
- 🔐 Authentication with Supabase
- 💬 ARIA-powered messaging (AI sentiment analysis)
- 📝 18-section custody agreement wizard
- 📅 Calendar with compliance tracking
- 📊 Real-time dashboards and metrics

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running (see `../backend/README.md`)
- Environment variables configured

### Installation

\`\`\`bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Open http://localhost:3000
\`\`\`

### Environment Variables

Create \`.env.local\` with:

\`\`\`bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
\`\`\`

---

## 📱 Application Pages

### Core Pages (8 total)
1. **Landing** (\`/\`) - Marketing homepage
2. **Auth** (\`/login\`, \`/register\`) - Authentication
3. **Dashboard** (\`/dashboard\`) - Case overview
4. **Cases** (\`/cases\`) - Case management
5. **Messages** (\`/messages\`) - ARIA messaging
6. **Agreements** (\`/agreements\`) - Agreement builder
7. **Agreement Wizard** (\`/agreements/[id]/builder\`) - 18 sections ⭐ NEW
8. **Schedule** (\`/schedule\`) - Calendar & compliance

See [full documentation](../CLAUDE.md) for detailed page descriptions.

---

## 📝 Next Steps (V1.1)

Planned for Weeks 13-18:
- Agreement builder backend integration
- Payment tracking (\`/expenses\`)
- Court export wizard (\`/cases/[id]/export\`)
- Email notifications settings
- Mobile responsive improvements

See [V1.1_ROADMAP.md](../V1.1_ROADMAP.md) for complete details.

---

**Last Updated:** December 30, 2025  
**Version:** MVP Complete + 18-Section Wizard
