# CommonGround Mobile Architecture (Status & Roadmap)

**Version:** 2.1
**Date:** February 14, 2026
**Current Status:** **Unified PWA Implementation** (Roadmap for Native Multi-App Expansion)
**Author:** Architecture Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Target Architecture](#3-target-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Monorepo Structure](#5-monorepo-structure)
6. [App Specifications](#6-app-specifications)
7. [Recording & Transcription](#7-recording--transcription)
8. [Database Schema Updates](#8-database-schema-updates)
9. [API Changes](#9-api-changes)
10. [Implementation Phases](#10-implementation-phases)
11. [Deployment Strategy](#11-deployment-strategy)
12. [Cost Estimates](#12-cost-estimates)
13. [Risk Assessment](#13-risk-assessment)
14. [Appendices](#14-appendices)

---

## 1. Executive Summary

### 1.1 Current State: The Unified PWA
CommonGround currently operates as a **High-Fidelity Progressive Web App (PWA)**. This approach ensures:
- **Instant Updates**: Version 1.110.26 is served globally without App Store delays.
- **Shared Codebase**: 100% of the Next.js logic is shared between Desktop and Mobile.
- **Service Worker (`sw.js`)**: Handles background notifications and offline capabilities for the "Sanctuary of Truth."

### 1.2 Roadmap: Native Multi-App Expansion
The future strategy involves splitting the platform into specialized native apps:

| App | Users | Platforms | Purpose |
|-----|-------|-----------|---------|
| **CommonGround Parent** | Parents | Web, iOS, Android | Full co-parenting suite |
| **CommonGround Kids** | Children | iOS, Android | Safe video calls, games, content |
| **CommonGround Circle** | Contacts | iOS, Android | Video calls with connected children |

### 1.2 Key Requirements

- All apps must work from a **central platform** (shared backend)
- All apps must pull from the **same family files**
- **Server-side recording** for full auditability
- **Real-time transcription** with speaker diarization
- **Native iOS and Android** apps (not web wrappers)

### 1.3 Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Mobile Framework | **Expo SDK 52+** | Managed workflow, OTA updates, easier builds |
| Video Provider | **Daily.co** (Confirmed) | Has React Native SDK, server-side recording |
| AI Integration | **Claude 3.5 Sonnet** | Advanced real-time mediation |
| Recording | **Daily.co Cloud Recording** | Automatic, server-side, auditable |
| Transcription | **Daily.co + Deepgram** | Real-time, 36+ languages, speaker diarization |
| Storage | **Custom AWS S3** | Full control, no extra Daily.co storage fees |
| Monorepo Tool | **Turborepo + pnpm** | Fast builds, efficient package sharing |

---

## 2. Current State Analysis

### 2.1 Technology Stack

| Layer | Current Technology |
|-------|-------------------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| **Backend** | FastAPI (Python 3.11+), SQLAlchemy 2.0 |
| **Database** | PostgreSQL 15 (Supabase) |
| **Video** | Daily.co (web SDK) |
| **Auth** | Supabase Auth + JWT |

### 2.2 Mobile Readiness Assessment

| Aspect | Current State | Mobile Readiness |
|--------|---------------|------------------|
| API Client | 7,742-line monolith | 70% reusable (fetch-based) |
| Authentication | localStorage tokens | Needs SecureStore adapter |
| Business Logic | React hooks | 80% reusable |
| WebSocket | Standard WebSocket | 95% reusable |
| UI Components | shadcn/ui (web) | 0% - must rebuild for native |
| Navigation | Next.js App Router | 0% - must use React Navigation |

### 2.3 Existing User Separation

The codebase already has partial separation:

```
Current Routes:
├── /dashboard, /messages, /agreements, etc.  → Parent routes
├── /my-circle/child/*                        → Child routes
├── /my-circle/contact/*                      → Circle contact routes
└── /court-portal/*                           → Professional routes

Current Auth Tokens:
├── access_token    → Parent/Professional users
├── child_token     → Child users (PIN-based)
└── circle_token    → Circle contact users (invite-based)
```

### 2.4 Existing Recording Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| `DailyVideoService` | ✅ Exists | Has start/stop recording methods |
| `WhisperTranscriptionService` | ✅ Exists | OpenAI Whisper integration |
| `ParentCallSession.recording_url` | ✅ Exists | Storage field present |
| `KidComsSettings.record_sessions` | ✅ Exists | Toggle for recording |
| Server-side recording | ⚠️ Partial | Methods exist, not production-ready |
| Webhook handlers | ❌ Missing | Need to implement |
| Custom S3 storage | ❌ Missing | Need to configure |

---

## 3. Target Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DAILY.CO CLOUD                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Video Rooms │  │ Recording   │  │Transcription│  │  Your S3    │    │
│  │             │──│ Service     │──│ (Deepgram)  │──│  Bucket     │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────┬──────┘    │
└────────────────────────────────────────────────────────────┼────────────┘
                                                              │
                              Webhooks                        │
                                 │                            │
┌────────────────────────────────┼────────────────────────────┼───────────┐
│                    COMMONGROUND BACKEND                     │           │
│                         (FastAPI)                           │           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐│           │
│  │ Auth API │  │ Family   │  │ Recording│  │ Webhook      ││           │
│  │          │  │ Files API│  │ Service  │◀─│ Handler      │◀───────────┘
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘│
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐│
│  │ Messages │  │ KidComs  │  │ Schedule │  │ ARIA         ││
│  │ API      │  │ API      │  │ API      │  │ Monitoring   ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘│
│                              │                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              PostgreSQL + Redis                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PARENT APP    │  │   KIDSCOM APP   │  │  MY CIRCLE APP  │
│  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
│  │ 🌐 Web    │  │  │  │ 📱 iOS    │  │  │  │ 📱 iOS    │  │
│  │ 📱 iOS    │  │  │  │ 📱 Android│  │  │  │ 📱 Android│  │
│  │ 📱 Android│  │  │  └───────────┘  │  │  └───────────┘  │
│  └───────────┘  │  │                  │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 3.2 Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        FAMILY FILE                                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                     Shared Data                             │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │  │
│  │  │ Parents │  │ Children│  │ Circle  │  │Agreements│       │  │
│  │  │         │  │         │  │ Contacts│  │         │       │  │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └─────────┘       │  │
│  │       │            │            │                          │  │
│  │       │            │            │                          │  │
│  │  ┌────┴────────────┴────────────┴────┐                    │  │
│  │  │          KidComs Sessions          │                    │  │
│  │  │  ┌─────────┐  ┌─────────────────┐ │                    │  │
│  │  │  │Recording│  │  Transcription  │ │                    │  │
│  │  │  │  (S3)   │  │     (S3)        │ │                    │  │
│  │  │  └─────────┘  └─────────────────┘ │                    │  │
│  │  └───────────────────────────────────┘                    │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   ┌───────────┐        ┌───────────┐        ┌───────────┐
   │ Parent App│        │Kidscom App│        │Circle App │
   │ Full CRUD │        │ Read Only │        │ Read Only │
   └───────────┘        └───────────┘        └───────────┘
```

---

## 4. Technology Stack

### 4.1 Mobile Development

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| **Framework** | Expo | SDK 52+ | Managed workflow, OTA updates |
| **Navigation** | Expo Router | v4 | File-based routing (like Next.js) |
| **UI Styling** | NativeWind | v4 | Tailwind CSS for React Native |
| **Video SDK** | @daily-co/react-native-daily-js | 0.82+ | Same provider as web |
| **Secure Storage** | expo-secure-store | Latest | Encrypted token storage |
| **Notifications** | expo-notifications | Latest | FCM/APNs integration |
| **Location** | expo-location | Latest | Custody exchange check-ins |
| **Media** | expo-av | Latest | Video/audio playback |

### 4.2 Shared Infrastructure

| Component | Technology | Notes |
|-----------|------------|-------|
| **Monorepo** | Turborepo + pnpm | Fast, efficient caching |
| **Type System** | TypeScript 5 | Shared types across platforms |
| **API Client** | Custom fetch wrapper | Platform-agnostic |
| **State Management** | React Context + hooks | Shared business logic |

### 4.3 Backend (Unchanged)

| Component | Technology |
|-----------|------------|
| **Framework** | FastAPI (Python 3.11+) |
| **ORM** | SQLAlchemy 2.0 (async) |
| **Database** | PostgreSQL 15 |
| **Cache** | Redis 7 |
| **Auth** | Supabase Auth + JWT |

### 4.4 Recording & Transcription

| Component | Technology | Notes |
|-----------|------------|-------|
| **Video Recording** | Daily.co Cloud Recording | 1080p @ 30fps, H.264, MP4 |
| **Transcription** | Daily.co + Deepgram | Real-time, 36+ languages |
| **Storage** | AWS S3 (custom bucket) | Your control, no extra fees |
| **Speaker ID** | Deepgram Diarization | Unlimited speakers |

---

## 5. Monorepo Structure

### 5.1 Directory Layout

```
CommonGround/
├── turbo.json                      # Turborepo configuration
├── package.json                    # Root workspace
├── pnpm-workspace.yaml             # pnpm workspace config
│
├── apps/
│   │
│   │  ══════════ WEB APPS ══════════
│   ├── web-parent/                 # Parent web app (Next.js)
│   │   ├── app/                    # Next.js App Router
│   │   ├── components/             # Web-specific components
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   │  ══════════ MOBILE APPS (Expo) ══════════
│   ├── mobile-parent/              # Parent iOS + Android
│   │   ├── app/                    # Expo Router pages
│   │   │   ├── (tabs)/             # Tab navigation
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── index.tsx       # Dashboard
│   │   │   │   ├── messages.tsx    # Messaging
│   │   │   │   ├── schedule.tsx    # Calendar
│   │   │   │   ├── family.tsx      # Family Files
│   │   │   │   └── settings.tsx    # Settings
│   │   │   ├── call/
│   │   │   │   └── [sessionId].tsx # Video call screen
│   │   │   ├── kidcoms/
│   │   │   │   ├── index.tsx       # KidComs dashboard
│   │   │   │   ├── settings.tsx    # KidComs settings
│   │   │   │   └── recordings.tsx  # Recording playback
│   │   │   ├── agreements/
│   │   │   │   └── [id].tsx        # Agreement viewer
│   │   │   ├── auth/
│   │   │   │   ├── login.tsx
│   │   │   │   ├── register.tsx
│   │   │   │   └── forgot-password.tsx
│   │   │   └── _layout.tsx         # Root layout
│   │   ├── components/             # Mobile-specific components
│   │   ├── assets/                 # Images, fonts
│   │   ├── app.json                # Expo config
│   │   ├── eas.json                # EAS Build config
│   │   ├── tailwind.config.js      # NativeWind config
│   │   └── package.json
│   │
│   ├── mobile-kidscom/             # Kidscom iOS + Android
│   │   ├── app/
│   │   │   ├── index.tsx           # PIN login screen
│   │   │   ├── (main)/             # Authenticated routes
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── home.tsx        # Child dashboard
│   │   │   │   ├── my-circle.tsx   # Contact list
│   │   │   │   ├── arcade/         # Games
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── tic-tac-toe.tsx
│   │   │   │   │   ├── memory.tsx
│   │   │   │   │   └── drawing.tsx
│   │   │   │   ├── theater/        # Watch together
│   │   │   │   │   └── [contentId].tsx
│   │   │   │   └── library/        # Books/stories
│   │   │   │       ├── index.tsx
│   │   │   │       └── [bookId].tsx
│   │   │   └── call/
│   │   │       └── [sessionId].tsx # Video call
│   │   ├── components/             # Child-friendly UI
│   │   ├── assets/                 # Colorful assets
│   │   ├── app.json
│   │   ├── eas.json
│   │   └── package.json
│   │
│   └── mobile-mycircle/            # My Circle iOS + Android
│       ├── app/
│       │   ├── index.tsx           # Login screen
│       │   ├── accept-invite.tsx   # Invitation acceptance
│       │   ├── (main)/
│       │   │   ├── _layout.tsx
│       │   │   ├── home.tsx        # Connected children
│       │   │   ├── children/
│       │   │   │   └── [childId].tsx
│       │   │   └── settings.tsx
│       │   └── call/
│       │       └── [sessionId].tsx
│       ├── components/
│       ├── app.json
│       ├── eas.json
│       └── package.json
│
├── packages/
│   │
│   │  ══════════ UNIVERSAL (Web + Mobile) ══════════
│   ├── api-client/                 # Shared API client
│   │   ├── src/
│   │   │   ├── index.ts            # Main exports
│   │   │   ├── core/
│   │   │   │   ├── config.ts       # API URL, environment
│   │   │   │   ├── fetch.ts        # Platform-agnostic fetch
│   │   │   │   ├── auth.ts         # Token management
│   │   │   │   ├── storage.ts      # Storage adapter interface
│   │   │   │   └── errors.ts       # APIError class
│   │   │   ├── adapters/
│   │   │   │   ├── web-storage.ts  # localStorage adapter
│   │   │   │   └── native-storage.ts # SecureStore adapter
│   │   │   ├── parent/             # Parent-specific APIs
│   │   │   │   ├── index.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── dashboard.ts
│   │   │   │   ├── messages.ts
│   │   │   │   ├── agreements.ts
│   │   │   │   ├── schedule.ts
│   │   │   │   ├── family-files.ts
│   │   │   │   ├── kidcoms.ts
│   │   │   │   ├── recordings.ts
│   │   │   │   └── clearfund.ts
│   │   │   ├── child/              # Child-specific APIs
│   │   │   │   ├── index.ts
│   │   │   │   ├── auth.ts         # PIN login
│   │   │   │   ├── contacts.ts
│   │   │   │   ├── sessions.ts
│   │   │   │   └── content.ts      # Arcade, theater, library
│   │   │   ├── circle/             # Circle contact APIs
│   │   │   │   ├── index.ts
│   │   │   │   ├── auth.ts         # Email/invite login
│   │   │   │   ├── children.ts
│   │   │   │   ├── permissions.ts
│   │   │   │   └── sessions.ts
│   │   │   └── shared/             # Shared APIs
│   │   │       ├── kidcoms.ts      # Video session management
│   │   │       └── realtime.ts     # WebSocket utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── types/                      # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── user.ts
│   │   │   ├── child.ts
│   │   │   ├── circle.ts
│   │   │   ├── family-file.ts
│   │   │   ├── agreement.ts
│   │   │   ├── message.ts
│   │   │   ├── schedule.ts
│   │   │   ├── kidcoms.ts
│   │   │   ├── recording.ts        # Recording/transcript types
│   │   │   └── payment.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── core/                       # Business logic hooks
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useMessages.ts
│   │   │   │   ├── useSchedule.ts
│   │   │   │   ├── useKidComs.ts
│   │   │   │   ├── useRecordings.ts
│   │   │   │   └── useRealtime.ts
│   │   │   └── utils/
│   │   │       ├── timezone.ts
│   │   │       ├── formatters.ts
│   │   │       └── validators.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── daily-client/               # Daily.co abstraction
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts            # Daily.co types
│   │   │   ├── web.ts              # Web-specific implementation
│   │   │   ├── native.ts           # React Native implementation
│   │   │   └── shared.ts           # Shared utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── utils/                      # Shared utilities
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── cn.ts               # classnames utility
│   │   │   └── constants.ts
│   │   └── package.json
│   │
│   │  ══════════ WEB ONLY ══════════
│   ├── ui-web/                     # shadcn/ui components
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ... (all shadcn components)
│   │   └── package.json
│   │
│   │  ══════════ MOBILE ONLY ══════════
│   ├── ui-mobile/                  # React Native components
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── VideoTile.tsx
│   │   │   ├── CallControls.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   └── package.json
│   │
│   └── config/                     # Shared configs
│       ├── eslint-config/
│       │   └── index.js
│       └── typescript-config/
│           ├── base.json
│           ├── nextjs.json
│           └── react-native.json
│
└── backend/                        # FastAPI (existing location)
    └── ... (see Section 9 for changes)
```

### 5.2 Root Configuration Files

**turbo.json:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "build:ios": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "build:android": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Root package.json:**
```json
{
  "name": "commonground",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "dev:web": "turbo dev --filter=web-parent",
    "dev:parent": "turbo dev --filter=mobile-parent",
    "dev:kidscom": "turbo dev --filter=mobile-kidscom",
    "dev:mycircle": "turbo dev --filter=mobile-mycircle",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "build:ios": "turbo build:ios",
    "build:android": "turbo build:android"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

---

## 6. App Specifications

### 6.1 Parent App

#### 6.1.1 Overview

| Attribute | Value |
|-----------|-------|
| **Platforms** | Web, iOS, Android |
| **Users** | Parents, primary account holders |
| **Auth** | Email/password (Supabase) |
| **Token** | `access_token` |

#### 6.1.2 Feature Matrix

| Feature | Web | iOS | Android |
|---------|-----|-----|---------|
| Dashboard | ✅ | ✅ | ✅ |
| Family Files | ✅ | ✅ | ✅ |
| Messages (ARIA) | ✅ | ✅ | ✅ |
| Agreements | ✅ | ✅ (view) | ✅ (view) |
| Schedule/Calendar | ✅ | ✅ | ✅ |
| Custody Exchanges | ✅ | ✅ | ✅ |
| Payments (ClearFund) | ✅ | ✅ | ✅ |
| Parent Video Calls | ✅ | ✅ | ✅ |
| KidComs Management | ✅ | ✅ | ✅ |
| Recording Playback | ✅ | ✅ | ✅ |
| Circle Contact Mgmt | ✅ | ✅ | ✅ |
| Push Notifications | ✅ (web) | ✅ (native) | ✅ (native) |

#### 6.1.3 Navigation Structure (Mobile)

```
Tab Bar:
├── Home (Dashboard)
├── Messages
├── Schedule
├── Family
└── Settings

Stack Screens:
├── /call/[sessionId]        # Video call
├── /kidcoms/*               # KidComs management
├── /agreements/[id]         # Agreement viewer
├── /recordings/[id]         # Recording playback
└── /auth/*                  # Login/register
```

### 6.2 Kidscom App

#### 6.2.1 Overview

| Attribute | Value |
|-----------|-------|
| **Platforms** | iOS, Android only |
| **Users** | Children |
| **Auth** | PIN-based (4-6 digits) |
| **Token** | `child_token` |

#### 6.2.2 Feature Matrix

| Feature | iOS | Android |
|---------|-----|---------|
| PIN Login | ✅ | ✅ |
| Avatar Selection | ✅ | ✅ |
| My Circle (contacts) | ✅ | ✅ |
| Video Calls | ✅ | ✅ |
| Theater Mode | ✅ | ✅ |
| Arcade Games | ✅ | ✅ |
| Library/Books | ✅ | ✅ |
| Push Notifications | ✅ | ✅ |

#### 6.2.3 Navigation Structure

```
Login Screen:
├── Family selection (avatar grid)
├── PIN entry
└── → Main app

Main App (Tab Bar):
├── Home (child dashboard)
├── My Circle (contact grid)
├── Arcade (games)
├── Theater (videos)
└── Library (books)

Stack Screens:
├── /call/[sessionId]        # Video call
├── /arcade/[game]           # Individual game
├── /theater/[contentId]     # Video player
└── /library/[bookId]        # Book reader
```

#### 6.2.4 Design Guidelines

- **Large touch targets** (minimum 48x48dp)
- **Vibrant colors** (purple/cyan gradient theme)
- **Minimal text** - use icons and images
- **ARIA mascot** integration throughout
- **No external links** or ways to leave app
- **Parental controls** enforced server-side

### 6.3 My Circle App

#### 6.3.1 Overview

| Attribute | Value |
|-----------|-------|
| **Platforms** | iOS, Android only |
| **Users** | Approved circle contacts (grandparents, etc.) |
| **Auth** | Email/password (via invite) |
| **Token** | `circle_token` |

#### 6.3.2 Feature Matrix

| Feature | iOS | Android |
|---------|-----|---------|
| Email Login | ✅ | ✅ |
| Accept Invitation | ✅ | ✅ |
| Connected Children | ✅ | ✅ |
| Video Calls | ✅ | ✅ |
| Theater Mode | ✅ | ✅ |
| Permission Indicators | ✅ | ✅ |
| Push Notifications | ✅ | ✅ |

#### 6.3.3 Navigation Structure

```
Auth Screens:
├── Login
├── Accept Invite (from email link)
└── Forgot Password

Main App:
├── Home (connected children grid)
├── Settings
└── /call/[sessionId]
```

---

## 7. Recording & Transcription

### 7.1 Recording Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DAILY.CO CLOUD                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ Video Room   │───▶│ Recording    │───▶│ Your S3      │       │
│  │ (Parent/     │    │ Service      │    │ Bucket       │       │
│  │  KidComs)    │    │              │    │              │       │
│  └──────────────┘    └──────────────┘    └──────┬───────┘       │
│         │                   │                    │               │
│         ▼                   ▼                    │               │
│  ┌──────────────┐    ┌──────────────┐           │               │
│  │ Real-time    │───▶│ Transcription│           │               │
│  │ Transcription│    │ Storage      │───────────┤               │
│  │ (Deepgram)   │    │ (WebVTT)     │           │               │
│  └──────────────┘    └──────────────┘           │               │
│                                                  │               │
└──────────────────────────────────────────────────┼───────────────┘
                                                   │
                    Webhooks                       │
                       │                           │
                       ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  COMMONGROUND BACKEND (FastAPI)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ /webhooks/daily  │    │ RecordingService │                   │
│  │ - recording.ready│───▶│ - Process webhook│                   │
│  │ - transcript.ready    │ - Update DB      │                   │
│  └──────────────────┘    │ - Create audit   │                   │
│                          └──────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Recording Types

| Call Type | Recording Mode | Transcription | Auto-Start |
|-----------|---------------|---------------|------------|
| **Parent ↔ Parent** | Cloud (composite) | ✅ Real-time + stored | ✅ Yes |
| **Child ↔ Circle** | Cloud (composite) | ✅ Real-time + stored | ✅ Yes |
| **Theater Mode** | Audio-only (optional) | ❌ Not needed | Configurable |

### 7.3 Daily.co Configuration

#### Room Configuration
```python
room_config = {
    "name": room_name,
    "privacy": "private",
    "properties": {
        "enable_recording": "cloud",
        "recording_bucket": {
            "bucket_name": "commonground-recordings",
            "bucket_region": "us-east-1",
            "assume_role_arn": "arn:aws:iam::ACCOUNT:role/DailyRecordingRole",
            "path": f"{family_file_id}/{session_type}/{session_id}/"
        },
        "enable_transcription": True,
        "enable_transcription_storage": True,
        "transcription_bucket": {
            "bucket_name": "commonground-recordings",
            "bucket_region": "us-east-1",
            "assume_role_arn": "arn:aws:iam::ACCOUNT:role/DailyRecordingRole",
            "path": f"{family_file_id}/{session_type}/{session_id}/"
        }
    }
}
```

#### Meeting Token with Auto-Recording
```python
token_config = {
    "properties": {
        "room_name": room_name,
        "user_name": user_name,
        "user_id": user_id,
        "is_owner": True,
        "start_cloud_recording": True,  # Auto-start recording
        "enable_transcription": True,
    }
}
```

### 7.4 S3 Bucket Structure

```
commonground-recordings/
├── parent-calls/
│   └── {family_file_id}/
│       └── {session_id}/
│           ├── recording.mp4           # Video recording
│           ├── transcript.vtt          # WebVTT transcript
│           └── metadata.json           # Session metadata
│
├── kidcoms/
│   └── {family_file_id}/
│       └── {session_id}/
│           ├── recording.mp4
│           ├── transcript.vtt
│           └── metadata.json
│
└── exports/
    └── {family_file_id}/
        └── {export_id}/
            ├── court-report.pdf        # Generated report
            └── evidence-bundle.zip     # All recordings
```

### 7.5 Webhook Processing

```python
# POST /api/v1/webhooks/daily
@router.post("/webhooks/daily")
async def handle_daily_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    payload = await request.json()
    event_type = payload.get("type")

    # Log webhook for debugging
    await log_webhook(db, event_type, payload)

    if event_type == "recording.ready-to-download":
        await handle_recording_ready(db, payload)

    elif event_type == "transcript.ready-to-download":
        await handle_transcript_ready(db, payload)

    elif event_type == "recording.error":
        await handle_recording_error(db, payload)

    return {"status": "ok"}


async def handle_recording_ready(db: AsyncSession, payload: dict):
    """Process recording ready webhook."""
    room_name = payload["room_name"]
    session_id = extract_session_id(room_name)
    session_type = extract_session_type(room_name)

    update_data = {
        "recording_url": payload.get("download_link"),
        "recording_s3_key": payload.get("s3_key"),
        "recording_status": "ready",
        "recording_duration_seconds": payload.get("duration"),
        "recording_file_size_bytes": payload.get("size"),
    }

    if session_type == "parent":
        await update_parent_call_session(db, session_id, update_data)
    else:
        await update_kidcoms_session(db, session_id, update_data)

    # Create audit log
    await create_recording_audit_log(db, session_id, "recording_created")
```

### 7.6 Audit Trail

#### Recording Access Log
```python
class RecordingAccessLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "recording_access_logs"

    session_id: Mapped[str]
    session_type: Mapped[str]  # "parent_call" | "kidcoms"

    accessed_by_id: Mapped[str]  # User ID
    access_type: Mapped[str]     # "view" | "download" | "export" | "share"

    ip_address: Mapped[Optional[str]]
    user_agent: Mapped[Optional[str]]

    # For exports
    export_format: Mapped[Optional[str]]   # "pdf" | "mp4" | "vtt"
    export_reason: Mapped[Optional[str]]   # Court, personal, etc.
```

#### Access Logging Endpoint
```python
@router.get("/recordings/{session_id}/stream")
async def stream_recording(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
):
    # Verify access permissions
    session = await get_session_with_permissions(db, session_id, current_user)

    # Log access
    await create_access_log(
        db,
        session_id=session_id,
        accessed_by_id=current_user.id,
        access_type="view",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    # Generate signed URL for streaming
    signed_url = generate_signed_s3_url(session.recording_s3_key)

    return {"stream_url": signed_url, "expires_in": 3600}
```

---

## 8. Database Schema Updates

### 8.1 New Fields for ParentCallSession

```python
class ParentCallSession(Base, UUIDMixin, TimestampMixin):
    # ... existing fields ...

    # Enhanced recording fields
    recording_s3_key: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    recording_status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending | recording | processing | ready | failed
    recording_duration_seconds: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    recording_file_size_bytes: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    recording_format: Mapped[str] = mapped_column(
        String(20), default="mp4"
    )

    # Enhanced transcript fields
    transcript_s3_key: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    transcript_status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending | processing | ready | failed
    transcript_word_count: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    transcript_language: Mapped[str] = mapped_column(
        String(10), default="en"
    )
```

### 8.2 New Fields for KidComsSession

```python
class KidComsSession(Base, UUIDMixin, TimestampMixin):
    # ... existing fields ...

    # Recording fields (same as ParentCallSession)
    recording_s3_key: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    recording_status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )
    recording_duration_seconds: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    recording_file_size_bytes: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )

    # Transcript fields
    transcript_s3_key: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    transcript_status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )
    transcript_word_count: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
```

### 8.3 New Models

#### RecordingAccessLog
```python
class RecordingAccessLog(Base, UUIDMixin, TimestampMixin):
    """Audit trail for recording access."""

    __tablename__ = "recording_access_logs"

    session_id: Mapped[str] = mapped_column(String(36), index=True)
    session_type: Mapped[str] = mapped_column(String(20))  # parent_call | kidcoms

    accessed_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True
    )
    access_type: Mapped[str] = mapped_column(String(20))
    # view | download | export | share

    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    export_format: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    export_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    accessed_by = relationship("User")

    __table_args__ = (
        Index("ix_recording_access_logs_session", "session_id", "session_type"),
        Index("ix_recording_access_logs_user", "accessed_by_id", "created_at"),
    )
```

#### DailyWebhookLog
```python
class DailyWebhookLog(Base, UUIDMixin, TimestampMixin):
    """Log of Daily.co webhook events for debugging."""

    __tablename__ = "daily_webhook_logs"

    event_type: Mapped[str] = mapped_column(String(50), index=True)
    room_name: Mapped[str] = mapped_column(String(100), index=True)
    payload: Mapped[dict] = mapped_column(JSON)
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_daily_webhook_logs_type_time", "event_type", "created_at"),
    )
```

### 8.4 Migration Script

```python
"""Add recording and webhook tables

Revision ID: xxx
Create Date: 2026-01-24
"""

from alembic import op
import sqlalchemy as sa

def upgrade():
    # Add fields to parent_call_sessions
    op.add_column('parent_call_sessions',
        sa.Column('recording_s3_key', sa.String(500), nullable=True))
    op.add_column('parent_call_sessions',
        sa.Column('recording_status', sa.String(20), default='pending'))
    op.add_column('parent_call_sessions',
        sa.Column('recording_duration_seconds', sa.Integer, nullable=True))
    op.add_column('parent_call_sessions',
        sa.Column('recording_file_size_bytes', sa.Integer, nullable=True))
    op.add_column('parent_call_sessions',
        sa.Column('recording_format', sa.String(20), default='mp4'))
    op.add_column('parent_call_sessions',
        sa.Column('transcript_s3_key', sa.String(500), nullable=True))
    op.add_column('parent_call_sessions',
        sa.Column('transcript_status', sa.String(20), default='pending'))
    op.add_column('parent_call_sessions',
        sa.Column('transcript_word_count', sa.Integer, nullable=True))
    op.add_column('parent_call_sessions',
        sa.Column('transcript_language', sa.String(10), default='en'))

    # Add fields to kidcoms_sessions
    op.add_column('kidcoms_sessions',
        sa.Column('recording_s3_key', sa.String(500), nullable=True))
    op.add_column('kidcoms_sessions',
        sa.Column('recording_status', sa.String(20), default='pending'))
    op.add_column('kidcoms_sessions',
        sa.Column('recording_duration_seconds', sa.Integer, nullable=True))
    op.add_column('kidcoms_sessions',
        sa.Column('recording_file_size_bytes', sa.Integer, nullable=True))
    op.add_column('kidcoms_sessions',
        sa.Column('transcript_s3_key', sa.String(500), nullable=True))
    op.add_column('kidcoms_sessions',
        sa.Column('transcript_status', sa.String(20), default='pending'))
    op.add_column('kidcoms_sessions',
        sa.Column('transcript_word_count', sa.Integer, nullable=True))

    # Create recording_access_logs table
    op.create_table(
        'recording_access_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, onupdate=sa.func.now()),
        sa.Column('session_id', sa.String(36), nullable=False),
        sa.Column('session_type', sa.String(20), nullable=False),
        sa.Column('accessed_by_id', sa.String(36), sa.ForeignKey('users.id')),
        sa.Column('access_type', sa.String(20), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('export_format', sa.String(20), nullable=True),
        sa.Column('export_reason', sa.Text, nullable=True),
    )
    op.create_index('ix_recording_access_logs_session', 'recording_access_logs',
        ['session_id', 'session_type'])
    op.create_index('ix_recording_access_logs_user', 'recording_access_logs',
        ['accessed_by_id', 'created_at'])

    # Create daily_webhook_logs table
    op.create_table(
        'daily_webhook_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, onupdate=sa.func.now()),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('room_name', sa.String(100), nullable=False),
        sa.Column('payload', sa.JSON, nullable=False),
        sa.Column('processed', sa.Boolean, default=False),
        sa.Column('error_message', sa.Text, nullable=True),
    )
    op.create_index('ix_daily_webhook_logs_type_time', 'daily_webhook_logs',
        ['event_type', 'created_at'])


def downgrade():
    op.drop_table('daily_webhook_logs')
    op.drop_table('recording_access_logs')
    # Drop columns... (reversed)
```

---

## 9. API Changes

### 9.1 New Endpoints

#### Webhook Handler
```
POST /api/v1/webhooks/daily
    - Receives Daily.co webhook events
    - Processes recording.ready-to-download
    - Processes transcript.ready-to-download
    - Logs all webhook events
```

#### Recording Management
```
GET  /api/v1/recordings/{session_type}/{session_id}
    - Get recording metadata and signed URL
    - Logs access in audit trail

GET  /api/v1/recordings/{session_type}/{session_id}/transcript
    - Get transcript content
    - Returns WebVTT or JSON format

POST /api/v1/recordings/{session_type}/{session_id}/export
    - Generate court-ready export
    - Options: pdf, evidence_bundle

GET  /api/v1/family-files/{id}/recordings
    - List all recordings for a family
    - Filterable by session_type, date range
```

### 9.2 Enhanced Endpoints

#### Meeting Token Generation
```python
# Enhanced to include auto-recording
@router.post("/parent-calls/{room_id}/join")
async def join_parent_call(...):
    # Generate token with auto-recording enabled
    token = await daily_service.create_meeting_token(
        room_name=room.daily_room_name,
        user_name=current_user.display_name,
        user_id=str(current_user.id),
        is_owner=True,
        start_cloud_recording=room.recording_enabled,  # NEW
        enable_transcription=True,  # NEW
    )
```

### 9.3 Endpoint Documentation

```yaml
# openapi.yaml additions

/api/v1/webhooks/daily:
  post:
    summary: Daily.co webhook handler
    tags: [Webhooks]
    security: []  # No auth (use webhook signature)
    requestBody:
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/DailyWebhookPayload'
    responses:
      200:
        description: Webhook processed

/api/v1/recordings/{session_type}/{session_id}:
  get:
    summary: Get recording for playback
    tags: [Recordings]
    parameters:
      - name: session_type
        in: path
        required: true
        schema:
          type: string
          enum: [parent_call, kidcoms]
      - name: session_id
        in: path
        required: true
        schema:
          type: string
          format: uuid
    responses:
      200:
        description: Recording metadata with signed URL
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RecordingResponse'
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

| Task | Priority | Estimate |
|------|----------|----------|
| Set up Turborepo monorepo structure | High | 2 days |
| Create pnpm workspace configuration | High | 1 day |
| Extract `@commonground/types` package | High | 2 days |
| Extract `@commonground/api-client` package | High | 3 days |
| Create storage adapter interface | High | 1 day |
| Set up `@commonground/utils` package | Medium | 1 day |
| Configure shared TypeScript/ESLint | Medium | 1 day |

**Deliverables:**
- Working monorepo with `turbo dev` running
- Shared packages importable from apps
- Type-safe API client with platform adapters

### Phase 2: Backend Recording Infrastructure (Week 3)

| Task | Priority | Estimate |
|------|----------|----------|
| Create AWS S3 bucket | High | 0.5 days |
| Configure Daily.co S3 integration | High | 1 day |
| Create webhook endpoint | High | 1 day |
| Implement RecordingService | High | 2 days |
| Add database migration | High | 0.5 days |
| Update DailyVideoService for auto-recording | High | 1 day |
| Create recording access endpoints | Medium | 1 day |

**Deliverables:**
- Recordings automatically saved to S3
- Webhooks processing recording events
- Recordings playable via signed URLs

### Phase 3: Parent Mobile App (Weeks 4-6)

| Task | Priority | Estimate |
|------|----------|----------|
| Initialize Expo project | High | 0.5 days |
| Set up Expo Router navigation | High | 1 day |
| Implement NativeWind styling | High | 1 day |
| Build authentication screens | High | 2 days |
| Build dashboard screen | High | 2 days |
| Build messages screen | High | 2 days |
| Build schedule/calendar screen | High | 2 days |
| Build family files screen | Medium | 1 day |
| Integrate Daily.co React Native SDK | High | 2 days |
| Build video call screen | High | 3 days |
| Build recording playback screen | Medium | 1 day |
| Implement push notifications | Medium | 2 days |

**Deliverables:**
- Fully functional parent app for iOS/Android
- Video calling with recording
- Push notifications working

### Phase 4: Kidscom Mobile App (Weeks 7-8)

| Task | Priority | Estimate |
|------|----------|----------|
| Initialize Expo project | High | 0.5 days |
| Build PIN login screen | High | 2 days |
| Build child dashboard | High | 1 day |
| Build My Circle contact list | High | 1 day |
| Build video call screen | High | 2 days |
| Build Theater Mode | Medium | 2 days |
| Port Arcade games | Medium | 3 days |
| Build Library feature | Low | 1 day |
| Implement push notifications | Medium | 1 day |

**Deliverables:**
- Child-friendly app for iOS/Android
- Video calls with circle contacts
- Games and content working

### Phase 5: My Circle Mobile App (Week 9)

| Task | Priority | Estimate |
|------|----------|----------|
| Initialize Expo project | High | 0.5 days |
| Build login screen | High | 1 day |
| Build invite acceptance flow | High | 1 day |
| Build connected children list | High | 1 day |
| Build video call screen | High | 2 days |
| Implement permission UI | Medium | 1 day |
| Implement push notifications | Medium | 1 day |

**Deliverables:**
- Circle contact app for iOS/Android
- Video calls with children
- Permission-aware UI

### Phase 6: Web App Migration (Weeks 10-11)

| Task | Priority | Estimate |
|------|----------|----------|
| Move Next.js to apps/web-parent | High | 1 day |
| Update imports to use shared packages | High | 3 days |
| Add recording playback UI | Medium | 2 days |
| Integrate webhook-based recording | High | 1 day |
| Test all features | High | 3 days |

**Deliverables:**
- Web app using shared packages
- Recording playback in web UI
- Feature parity with current version

### Phase 7: Testing & Polish (Weeks 12-13)

| Task | Priority | Estimate |
|------|----------|----------|
| End-to-end testing (all platforms) | High | 3 days |
| Cross-platform call testing | High | 2 days |
| Recording/transcription verification | High | 1 day |
| ARIA monitoring testing | High | 1 day |
| Performance optimization | Medium | 2 days |
| Accessibility audit | Medium | 1 day |
| Bug fixes | High | ongoing |

### Phase 8: App Store Submission (Week 14)

| Task | Priority | Estimate |
|------|----------|----------|
| Create App Store screenshots | High | 1 day |
| Write app descriptions | High | 0.5 days |
| Update privacy policies | High | 0.5 days |
| TestFlight submission | High | 1 day |
| Play Console submission | High | 1 day |
| Address review feedback | High | 2-5 days |

---

## 11. Deployment Strategy

### 11.1 Domain Structure

| App | Domain | Notes |
|-----|--------|-------|
| **Parent Web** | app.commonground.family | Vercel |
| **API** | api.commonground.family | Render/Railway |
| **Webhooks** | webhooks.commonground.family | Vercel Functions |

### 11.2 App Store Information

| App | Bundle ID | App Store Name |
|-----|-----------|----------------|
| **Parent iOS** | com.commonground.parent | CommonGround - Co-Parenting |
| **Parent Android** | com.commonground.parent | CommonGround - Co-Parenting |
| **Kidscom iOS** | com.commonground.kidscom | CommonGround Kids |
| **Kidscom Android** | com.commonground.kidscom | CommonGround Kids |
| **Circle iOS** | com.commonground.circle | CommonGround Circle |
| **Circle Android** | com.commonground.circle | CommonGround Circle |

### 11.3 CI/CD Pipeline

```yaml
# .github/workflows/mobile-deploy.yml
name: Mobile App Deployment

on:
  push:
    branches: [main]
    paths:
      - 'apps/mobile-*/**'
      - 'packages/**'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      parent: ${{ steps.filter.outputs.parent }}
      kidscom: ${{ steps.filter.outputs.kidscom }}
      mycircle: ${{ steps.filter.outputs.mycircle }}
    steps:
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            parent:
              - 'apps/mobile-parent/**'
              - 'packages/**'
            kidscom:
              - 'apps/mobile-kidscom/**'
              - 'packages/**'
            mycircle:
              - 'apps/mobile-mycircle/**'
              - 'packages/**'

  build-parent:
    needs: detect-changes
    if: needs.detect-changes.outputs.parent == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: cd apps/mobile-parent && eas build --platform all --non-interactive

  # Similar jobs for kidscom and mycircle...
```

### 11.4 Environment Variables

#### Mobile Apps (app.json)
```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://api.commonground.family",
      "eas": {
        "projectId": "xxx"
      }
    }
  }
}
```

#### Backend (.env)
```env
# Daily.co
DAILY_API_KEY=xxx
DAILY_DOMAIN=commonground.daily.co
DAILY_WEBHOOK_SECRET=xxx

# AWS S3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_RECORDING_BUCKET=commonground-recordings
AWS_S3_REGION=us-east-1

# Recording
RECORDING_ENABLED=true
TRANSCRIPTION_ENABLED=true
```

---

## 12. Cost Estimates

### 12.1 Monthly Infrastructure Costs

| Service | Base Cost | Per 1000 Families | Notes |
|---------|-----------|-------------------|-------|
| **Daily.co Video** | $0 | ~$720 | $0.004/participant-min |
| **Daily.co Recording** | $0 | ~$1,350 | $0.015/recorded-min |
| **Daily.co Transcription** | $0 | ~$1,800 | $0.02/transcribed-min |
| **AWS S3 Storage** | $0 | ~$150 | ~$0.023/GB |
| **AWS S3 Transfer** | $0 | ~$50 | Egress costs |
| **Vercel Pro** | $20 | $20 | Web hosting |
| **Render/Railway** | $50 | $100 | Backend hosting |
| **Supabase Pro** | $25 | $25 | Database |
| **Redis (Upstash)** | $0 | $10 | Free tier covers most |
| **Apple Developer** | $99/year | $8 | Annual fee |
| **Google Play** | $25 once | $2 | One-time fee |
| **EAS Build** | $0 | $0 | Free tier |

### 12.2 Scaling Estimates

| Families | Calls/Month | Recording Hours | Monthly Cost |
|----------|-------------|-----------------|--------------|
| 100 | 300 | 150 hrs | ~$500 |
| 500 | 1,500 | 750 hrs | ~$2,000 |
| 1,000 | 3,000 | 1,500 hrs | ~$4,200 |
| 5,000 | 15,000 | 7,500 hrs | ~$18,000 |
| 10,000 | 30,000 | 15,000 hrs | ~$35,000 |

*Assumes average call duration of 30 minutes*

### 12.3 Cost Optimization Strategies

1. **Audio-only recording** for Theater Mode (80% size reduction)
2. **S3 Intelligent Tiering** for old recordings
3. **Lifecycle policies** to archive after 1 year
4. **Daily.co volume discounts** at scale
5. **Compression** before S3 upload

---

## 13. Risk Assessment

### 13.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Daily.co RN SDK issues | Low | High | Test early, have WebView fallback |
| Recording failures | Low | High | Retry logic, fallback to client-side |
| App Store rejection | Medium | Medium | Follow guidelines, prepare appeals |
| Cross-platform bugs | Medium | Medium | Thorough testing, shared logic |
| Performance on old devices | Medium | Low | Limit video participants, test widely |

### 13.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Daily.co price changes | Low | Medium | Monitor, have LiveKit as backup |
| User adoption | Medium | High | Beta testing, iterate on UX |
| Compliance issues | Low | High | Legal review, privacy audit |

### 13.3 Rollback Plan

1. Keep web app fully functional during transition
2. Feature flags for new recording system
3. Database migrations are additive (no data loss)
4. Old mobile web still accessible

---

## 14. Appendices

### 14.1 Related Documentation

- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - Overall system architecture
- [TECHNICAL_STACK.md](./TECHNICAL_STACK.md) - Technology stack details
- [KIDCOMS.md](../features/KIDCOMS.md) - KidComs feature specification
- [PARENT_CALLING.md](../features/PARENT_CALLING.md) - Parent calling feature

### 14.2 External References

- [Daily.co React Native SDK](https://github.com/daily-co/react-native-daily-js)
- [Daily.co Recording Guide](https://docs.daily.co/guides/products/live-streaming-recording/recording-calls-with-the-daily-api)
- [Daily.co Custom S3 Storage](https://docs.daily.co/guides/products/live-streaming-recording/storing-recordings-in-a-custom-s3-bucket)
- [Daily.co Transcription](https://docs.daily.co/guides/products/transcription)
- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [NativeWind](https://www.nativewind.dev/)
- [Turborepo](https://turbo.build/repo/docs)

### 14.3 Glossary

| Term | Definition |
|------|------------|
| **KidComs** | Video communication system for children and their approved contacts |
| **My Circle** | The approved contacts for a child (grandparents, etc.) |
| **ARIA** | AI assistant that monitors communications for safety |
| **Family File** | Central data container for all family information |
| **Circle Contact** | An approved adult in a child's communication circle |
| **Theater Mode** | Watch-together feature during video calls |

### 14.4 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-24 | Architecture Team | Initial draft |
| 2.0 | 2026-01-24 | Architecture Team | Added server-side recording, native mobile |

---

*Document generated: January 24, 2026*
