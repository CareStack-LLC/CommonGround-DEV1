# CommonGround Mobile Apps - Project Status & Source of Truth

**Last Updated:** 2026-02-22 07:07
**Current Phase:** Month 3 Week 13 - Final Polish & Integration Infrastructure
**Status:** 🟢 Active Development

---

## 🎯 Project Overview

**Goal:** Create co-parenting platform with full professional/legal support
- **Parent App** - Full co-parenting suite (95%)
- **Kidscom App** - Child-friendly app (95%)
- **Circle App** - Extended family app (90%)
- **Professional Portal/App** - Attorney portal (92%)

**Timeline:** 3 months + Extended Polish
**Current Period:** Late February 2026

---

## 📋 Quick Status

| App | Status | Completion | Next Action |
|-----|--------|------------|-------------|
| Parent App | 🟢 95% | ARIA, Payments, Agreements, Schedule done | Final production testing |
| Kidscom App | 🟢 95% | Theater, Chat, Library, Arcade games done | Accessibility audit |
| Circle App | 🟢 90% | Photo sharing, Messaging, Watch Together done | Final UX polish |
| Professional Portal | 🟢 92% | Analysis Hub, Metrics, Case Queue, Assignments | Integration Connectors (MyCase/Silo) |

---

## ✅ Completed Tasks

### Pre-Implementation
- [x] Comprehensive feature parity analysis completed
- [x] Implementation plan approved
- [x] User decisions confirmed:
  - ✅ Professional mobile app (simplified, read-only)
  - ✅ Stripe payments priority #1
  - ✅ Kidscom Theater uses web's video player
  - ✅ Local testing first (MacBook + iPhone)
  - ✅ Court Portal web-only

---

## 🚧 Current Work

### ✅ COMPLETED: Local Development Setup
**Completed:** 2026-01-25
**Status:** ✅ Done

**Steps Completed:**
- [x] Verify Node.js 20+ installed ✅ v25.2.1
- [x] Install/verify Expo CLI ✅
- [x] Navigate to project directory ✅ `/Users/tj/Desktop/CommonGround/`
- [x] Fix pnpm - switched to hoisted mode (`.npmrc` with `node-linker=hoisted`)
- [x] Upgraded all apps to Expo SDK 54 (React 19.1.0, React Native 0.81.5)
- [x] Fixed peer dependency conflicts across monorepo
- [x] Created stub implementations for Daily.co (works in Expo Go)
- [x] Install dependencies ✅ `pnpm install`
- [x] Test parent-app ✅ `npx expo start` works
- [x] Test on iPhone with Expo Go ✅ App loads successfully

**Key Fixes Applied:**
1. Created `.npmrc` with `node-linker=hoisted` for React Native compatibility
2. Added `abort-controller` and `event-target-shim` at workspace root
3. Updated shared packages to SDK 54
4. Created Daily.co stub implementations for Expo Go testing

---

### ✅ COMPLETED: Week 1 - ARIA Messaging
**Completed:** 2026-01-25
**Assigned To:** Claude
**Status:** ✅ Done

**Goal:** Complete ARIA-mediated messaging with pre-send analysis

**Steps Completed:**
- [x] `apps/parent-app/app/messages/compose.tsx` - Full ARIA integration with analysis
- [x] `apps/parent-app/app/messages/[threadId].tsx` - Thread view with ARIA indicators
- [x] `apps/parent-app/app/messages/_layout.tsx` - Updated with thread route
- [x] ARIA warning component - Built into compose.tsx
- [x] Message rewrite component - Integrated "Use This Instead" feature
- [x] `packages/api-client/src/api/parent/messages.ts` - ARIA endpoints ready
- [x] `apps/parent-app/src/hooks/useMessages.ts` - Updated with thread_id

**Features Implemented:**
1. ✅ Pre-send ARIA analysis (debounced 800ms)
2. ✅ Toxicity score visualization (none/low/medium/high/severe colors)
3. ✅ AI rewrite suggestions with "Use This Instead" button
4. ✅ Accept/Modify/Send Original flow with alerts
5. ✅ Block message for severe toxicity
6. ✅ Category labels (profanity, hostility, manipulation, etc.)
7. ✅ Trigger phrase highlighting

---

### ✅ COMPLETED: Month 1 - Parent App Core Features
**Completed:** 2026-01-25
**Status:** ✅ All 4 weeks complete

**Summary:**
- Week 1: ARIA Messaging ✅
- Week 2: Agreement Builder ✅
- Week 3: Silent Handoff (QR + GPS) ✅
- Week 4: Stripe Payments ✅

**Next Up:** Month 2 - Enhancements + Professional App (Weeks 5-8)

---

## 📅 3-Month Roadmap

### Month 1: Parent App Core Features (Weeks 1-4)

#### Week 1: ARIA Messaging ✅ COMPLETE
**Goal:** Complete ARIA-mediated messaging with pre-send analysis

**Files Created/Modified:**
- ✅ `apps/parent-app/app/messages/compose.tsx`
- ✅ `apps/parent-app/app/messages/[threadId].tsx`
- ✅ `apps/parent-app/app/messages/_layout.tsx`
- ✅ `packages/api-client/src/api/parent/messages.ts`
- ✅ `apps/parent-app/src/hooks/useMessages.ts`
- ✅ `apps/parent-app/app/(tabs)/messages.tsx`

**API Endpoints Used:**
- `POST /messages/analyze` - ARIA analysis
- `POST /messages/` - Send message
- `GET /messages?family_file_id=X` - List messages
- `POST /messages/{id}/intervention` - Log intervention

**Features Implemented:**
1. ✅ Pre-send ARIA analysis (debounced)
2. ✅ Toxicity score visualization (5 levels)
3. ✅ AI rewrite suggestions with "Use This Instead"
4. ✅ Accept/Modify/Send Original flow
5. ✅ Intervention logging ready

**Status:** ✅ Complete

---

#### Week 2: Agreement Builder (7-Section) ✅ COMPLETE
**Goal:** Implement streamlined agreement builder

**Files Created/Modified:**
- ✅ `apps/parent-app/app/agreements/index.tsx` - Agreement list with progress
- ✅ `apps/parent-app/app/agreements/[id]/index.tsx` - Agreement detail with sections
- ✅ `apps/parent-app/app/agreements/[id]/preview.tsx` - Full agreement preview
- ✅ `apps/parent-app/app/agreements/[id]/sections/[sectionId].tsx` - Section editor
- ✅ `apps/parent-app/app/agreements/[id]/_layout.tsx` - Nested routing layout
- ✅ `apps/parent-app/app/agreements/create.tsx` - ARIA conversational creation

**Features Implemented:**
1. ✅ Agreement list with status filtering
2. ✅ Section editor with ARIA suggestions
3. ✅ Section templates for common content
4. ✅ Auto-save while editing
5. ✅ Full agreement preview with sharing
6. ✅ Submit for approval flow
7. ✅ Dual-parent approval workflow
8. ✅ Activate agreement with custody setup

**API Endpoints Used:**
- `GET /agreements/family-file/{id}` - List agreements
- `GET /agreements/{id}` - Get agreement detail
- `PUT /agreements/sections/{id}` - Update section content
- `POST /agreements/{id}/submit` - Submit for approval
- `POST /agreements/{id}/approve` - Approve agreement
- `POST /agreements/{id}/activate` - Activate agreement

**Status:** ✅ Complete

---

#### Week 3: Silent Handoff Completion ✅ COMPLETE
**Completed:** 2026-01-25
**Goal:** Complete custody tracking with QR + GPS

**Files Created/Modified:**
- ✅ `apps/parent-app/app/exchange/_layout.tsx` - Updated with new routes
- ✅ `apps/parent-app/app/exchange/qr-show.tsx` - QR code display with countdown
- ✅ `apps/parent-app/app/exchange/qr-scan.tsx` - Camera QR scanner
- ✅ `apps/parent-app/app/custody/_layout.tsx` - Custody navigation
- ✅ `apps/parent-app/app/custody/override.tsx` - Manual "Children With Me" override
- ✅ `apps/parent-app/app/custody/stats.tsx` - Custody statistics (7/30/90 days)
- ✅ `apps/parent-app/app/(tabs)/schedule.tsx` - Added Quick Actions, QR buttons

**Features Implemented:**
1. ✅ QR code generation with auto-refresh tokens
2. ✅ QR code scanning (expo-camera CameraView)
3. ✅ GPS location verification on exchanges
4. ✅ Manual "Children With Me" button with reason selection
5. ✅ Custody time distribution charts (7/30/90 day views)
6. ✅ Exchange compliance metrics
7. ✅ Individual compliance rates display

**Status:** ✅ Complete

---

#### Week 4: Stripe Payment Integration ✅ COMPLETE
**Completed:** 2026-01-25
**Goal:** Complete ClearFund payment flow

**Files Created/Modified:**
- ✅ `apps/parent-app/app/wallet/_layout.tsx` - Wallet navigation layout
- ✅ `apps/parent-app/app/wallet/index.tsx` - Main wallet view with balance, methods, transactions
- ✅ `apps/parent-app/app/wallet/onboarding.tsx` - Stripe Connect onboarding flow
- ✅ `apps/parent-app/app/wallet/add-card.tsx` - Add payment method (card/bank)
- ✅ `apps/parent-app/app/wallet/transactions.tsx` - Full transaction history
- ✅ `apps/parent-app/app/expenses/[obligationId]/_layout.tsx` - Nested expense layout
- ✅ `apps/parent-app/app/expenses/[obligationId]/index.tsx` - Updated to navigate to fund
- ✅ `apps/parent-app/app/expenses/[obligationId]/fund.tsx` - Payment flow for funding
- ✅ `apps/parent-app/app/expenses/_layout.tsx` - Updated for nested routing
- ✅ `apps/parent-app/app/expenses/index.tsx` - Added wallet link
- ✅ `apps/parent-app/src/services/stripe.ts` - Stripe service with demo mode

**Dependencies:**
- `@stripe/stripe-react-native` (optional - works in demo mode without it)

**Features Implemented:**
1. ✅ Stripe Connect onboarding (4-step flow with simulation)
2. ✅ Add payment method (card with formatted input, bank account)
3. ✅ Fund obligations (select amount, payment method, confirm)
4. ✅ View transaction history (filtered by type, grouped by date)
5. ✅ Balance summary with net balance display
6. ✅ Wallet access from expenses screen
7. ✅ Demo mode for Expo Go (no native Stripe required)

**API Endpoints Used:**
- `GET /clearfund/obligations/family/{id}` - List obligations
- `GET /clearfund/balance/{id}` - Balance summary
- `GET /clearfund/ledger/{id}` - Transaction ledger
- `POST /clearfund/funding` - Record funding contribution

**Status:** ✅ Complete

---

### Month 2: Enhancements + Professional App (Weeks 5-8)

#### Week 5: Schedule Enhancements ✅ COMPLETE
**Completed:** 2026-01-25
**Goal:** Enhanced scheduling with events, RSVP, and time management

**Files Created:**
- ✅ `apps/parent-app/app/events/index.tsx` - Events list with filtering
- ✅ `apps/parent-app/app/events/[eventId]/index.tsx` - Event detail with RSVP
- ✅ `apps/parent-app/app/events/[eventId]/_layout.tsx` - Event detail layout
- ✅ `apps/parent-app/app/schedule/_layout.tsx` - Schedule navigation layout
- ✅ `apps/parent-app/app/schedule/collections.tsx` - My Time Collections management
- ✅ `apps/parent-app/app/schedule/time-blocks.tsx` - Time blocks per collection

**Files Modified:**
- ✅ `apps/parent-app/app/(tabs)/schedule.tsx` - Added events integration, Quick Actions
- ✅ `packages/api-client/src/index.ts` - Added event/custody type exports
- ✅ `packages/api-client/src/core/fetch.ts` - Fixed TypeScript errors
- ✅ `packages/types/src/user.ts` - Added LoginCredentials, RegisterCredentials
- ✅ `packages/types/src/family-file.ts` - Added FamilyFileSettings interface
- ✅ `packages/types/src/child.ts` - Added ChildKidscomSettings interface

**Features Implemented:**
1. ✅ Event creation with 8 categories (medical, school, sports, therapy, extracurricular, social, travel, other)
2. ✅ RSVP system (going/not_going/maybe/no_response)
3. ✅ Event detail screen with GPS check-in
4. ✅ Events list with category/child filtering and search
5. ✅ Calendar integration showing events alongside exchanges
6. ✅ My Time Collections management per child
7. ✅ Time blocks within collections (weekly patterns)
8. ✅ Color-coded collections with default handling
9. ✅ Quick Actions for New Event and My Time Blocks

**API Endpoints Used:**
- `GET /events/family/{id}` - List events
- `GET /events/{id}` - Get event detail
- `POST /events/{id}/rsvp` - Update RSVP
- `POST /events/{id}/checkin` - GPS check-in
- `GET /events/{id}/attendance` - Get attendance list
- `GET /events/collections/{child_id}` - Get collections
- `POST /events/collections` - Create collection
- `PUT /events/collections/{id}` - Update collection
- `DELETE /events/collections/{id}` - Delete collection
- `GET /events/time-blocks/{collection_id}` - Get time blocks
- `POST /events/time-blocks` - Create time block
- `PUT /events/time-blocks/{id}` - Update time block
- `DELETE /events/time-blocks/{id}` - Delete time block

**Status:** ✅ Complete

---

#### Week 6: Activity Feed + Push Notifications ✅ COMPLETE
**Completed:** 2026-01-25
**Goal:** Real-time activity tracking and push notifications

**Files Created:**
- ✅ `packages/api-client/src/api/parent/activities.ts` - Activity feed API client
- ✅ `packages/api-client/src/api/parent/push.ts` - Push notification token API
- ✅ `apps/parent-app/app/activity/_layout.tsx` - Activity navigation layout
- ✅ `apps/parent-app/app/activity/index.tsx` - Activity feed with filtering
- ✅ `apps/parent-app/src/providers/NotificationProvider.tsx` - Push notification setup
- ✅ `apps/parent-app/src/providers/RealtimeProvider.tsx` - WebSocket state management
- ✅ `apps/parent-app/src/hooks/useWebSocket.ts` - WebSocket connection hook

**Files Modified:**
- ✅ `apps/parent-app/app/_layout.tsx` - Added Notification & Realtime providers
- ✅ `apps/parent-app/app/(tabs)/index.tsx` - Added activity widget to dashboard
- ✅ `apps/parent-app/app.json` - Deep linking configuration
- ✅ `packages/api-client/src/api/parent/index.ts` - Export activities & push modules

**Features Implemented:**
1. ✅ Activity feed screen with category filtering (communication, custody, schedule, financial, system)
2. ✅ Paginated activity list with infinite scroll
3. ✅ Mark as read (single & all)
4. ✅ Activity widget on dashboard with unread badge
5. ✅ Push notification setup with Expo
6. ✅ Notification permission handling
7. ✅ Android notification channels (calls, messages, schedule, activity)
8. ✅ Deep linking for notification tap navigation
9. ✅ WebSocket connection with auto-reconnect
10. ✅ Real-time activity updates
11. ✅ Typing indicators support
12. ✅ Online user tracking
13. ✅ Connection status indicator

**Deep Linking Routes:**
- `commonground://activity` - Activity feed
- `commonground://messages/{id}` - Message thread
- `commonground://events/{id}` - Event detail
- `commonground://agreements/{id}` - Agreement detail
- `commonground://expenses/{id}` - Expense detail

**Status:** ✅ Complete

---

#### Week 7: Kidscom Theater Mode ✅ COMPLETE
**Completed:** 2026-01-26
**Goal:** Full-featured video player with Watch Together and parent controls

**Files Created:**
- ✅ `packages/api-client/src/api/child/theater.ts` - Theater content API client
- ✅ `apps/kidscom-app/app/theater/_layout.tsx` - Theater stack navigation
- ✅ `apps/kidscom-app/app/theater/player.tsx` - Full video player with controls
- ✅ `apps/kidscom-app/app/theater/watch-together.tsx` - Synchronized watching with reactions

**Files Modified:**
- ✅ `packages/api-client/src/api/child/index.ts` - Export theater module
- ✅ `apps/kidscom-app/app/(main)/theater.tsx` - Updated with API integration

**Features Implemented:**
1. ✅ Full video player with expo-av (play/pause, seek, skip ±10s)
2. ✅ Landscape orientation lock for video playback
3. ✅ Auto-hide controls after 4 seconds
4. ✅ Progress tracking with server sync
5. ✅ Watch Together synchronized playback
6. ✅ Host controls playback, syncs state every 2 seconds
7. ✅ Emoji reactions during Watch Together (😂😍😮😢👍👎)
8. ✅ Video call PIP placeholder for future integration
9. ✅ Parent-set time limits (screen time tracking)
10. ✅ Time remaining banner (shows when <30 minutes left)
11. ✅ Block playback when time limit reached
12. ✅ Content library with category filtering
13. ✅ Pull-to-refresh for content list
14. ✅ Contact picker for Watch Together invites

**API Endpoints Used:**
- `GET /theater/content` - List approved content
- `GET /theater/content/{id}` - Get content by ID
- `GET /theater/filters` - Get parent-set content filters
- `POST /theater/progress` - Update watch progress
- `POST /theater/watch-together` - Create Watch Together session
- `GET /theater/watch-together/{id}` - Join session
- `PUT /theater/watch-together/{id}/state` - Sync playback state
- `DELETE /theater/watch-together/{id}` - Leave session

**Theater Content Types:**
- `TheaterContent` - Video metadata (id, title, thumbnail, url, duration, rating)
- `ContentFilters` - Parent controls (categories, age rating, time limits)
- `WatchTogetherSession` - Sync session (host, participants, position, playing)

**Status:** ✅ Complete

---

#### Week 8: Kidscom Chat + Library ✅ COMPLETE
**Completed:** 2026-01-26
**Goal:** Child-friendly chat with ARIA monitoring and content library

**Files Created:**
- ✅ `apps/kidscom-app/app/chat/_layout.tsx` - Chat stack navigation
- ✅ `apps/kidscom-app/app/chat/index.tsx` - Conversations list
- ✅ `apps/kidscom-app/app/chat/[contactId].tsx` - Chat conversation with stickers
- ✅ `apps/kidscom-app/app/library/_layout.tsx` - Library stack navigation
- ✅ `apps/kidscom-app/app/library/reader.tsx` - Story/book reader
- ✅ `apps/kidscom-app/app/library/activity.tsx` - Interactive activities

**Files Modified:**
- ✅ `packages/api-client/src/api/child/kidcoms.ts` - Added chat & library APIs
- ✅ `apps/kidscom-app/app/(main)/library.tsx` - API integration, favorites, progress

**Features Implemented:**

**Chat:**
1. ✅ Conversations list with unread badges
2. ✅ Full chat interface with message bubbles
3. ✅ ARIA monitoring notice (messages checked for safety)
4. ✅ Sticker picker with multiple packs (Emotions, Love, Animals)
5. ✅ Quick reply suggestions
6. ✅ Real-time message delivery status
7. ✅ Contact avatars with emoji fallbacks
8. ✅ Video call button integration

**Library:**
1. ✅ Content browsing with category filtering
2. ✅ Favorites system with heart toggle
3. ✅ Progress tracking (percentage complete)
4. ✅ Story/book reader with page navigation
5. ✅ Font size adjustment for reading
6. ✅ Interactive counting activities
7. ✅ Score tracking and star rewards
8. ✅ Pull-to-refresh content list
9. ✅ Continue/Read Again based on progress

**Chat API Endpoints:**
- `GET /kidcoms/chat/conversations` - Get conversations list
- `GET /kidcoms/chat/{contactId}/messages` - Get messages
- `POST /kidcoms/chat/{contactId}/send` - Send message
- `POST /kidcoms/chat/{contactId}/read` - Mark as read
- `GET /kidcoms/stickers/packs` - Get sticker packs

**Library API Endpoints:**
- `GET /kidcoms/library` - List content with filters
- `GET /kidcoms/library/categories` - Get categories
- `POST /kidcoms/library/{id}/favorite` - Toggle favorite
- `POST /kidcoms/library/{id}/progress` - Update progress

**Status:** ✅ Complete

---

#### Week 8.5: KidsCom Enhancements & Parent App Integration ✅ COMPLETE
**Completed:** 2026-01-26
**Goal:** Library Read Together, Featured Content, UI Polish, Video Call Integration

**Files Created:**
- ✅ `apps/kidscom-app/app/library/read-together.tsx` - Read Together with video call PIP
- ✅ `apps/parent-app/src/providers/IncomingCallProvider.tsx` - Incoming call detection & UI

**Files Modified:**
- ✅ `apps/kidscom-app/app/(main)/library.tsx` - Featured book section, Read Together button
- ✅ `apps/kidscom-app/app/(main)/theater.tsx` - Featured video section
- ✅ `apps/kidscom-app/app/(main)/_layout.tsx` - Fixed tab bar labels (no more wrapping)
- ✅ `apps/kidscom-app/app/library/_layout.tsx` - Added read-together route
- ✅ `apps/kidscom-app/app/library/reader.tsx` - Fixed unused imports
- ✅ `apps/parent-app/app/family/[id].tsx` - Fixed Quick Actions navigation
- ✅ `apps/parent-app/app/_layout.tsx` - Added IncomingCallProvider
- ✅ `apps/parent-app/src/lib/api.ts` - Video API adapter, incoming call API

**Features Implemented:**

**KidsCom Library - Read Together:**
1. ✅ Contact picker to select reading partner
2. ✅ Video call integration with Daily.co
3. ✅ PDF book viewing with Google Docs viewer
4. ✅ Picture-in-picture video call overlay
5. ✅ Emoji reactions while reading (📖 😊 😮 😢 👍 ❤️ 🎉 🤔)
6. ✅ Audio/video toggle controls
7. ✅ Animated calling state with pulsing avatar
8. ✅ Option to fall back to solo reading

**KidsCom - Featured Content Sections:**
1. ✅ Large hero card for featured video in Theater
2. ✅ Large hero card for featured book in Library
3. ✅ "⭐ Featured" badge with color-coded styling
4. ✅ "More Videos" / "More Books" section labels
5. ✅ Category and age rating badges on featured items
6. ✅ "👥 Read Together" badge on featured books

**KidsCom - UI Polish:**
1. ✅ Fixed tab bar labels (Home, Circle, Theater, Arcade, Library)
2. ✅ Tab icons with fixed width (65px) and numberOfLines={1}
3. ✅ Category tabs - small horizontal pill buttons (h-10 container)
4. ✅ Library content modal positioned above tab bar (bottom-20)

**Parent App - Video Call Integration:**
1. ✅ `videoAPIAdapter` for `/parent-calls/` endpoints
2. ✅ `incomingCallAPI` for checking/accepting/rejecting calls
3. ✅ Incoming call polling every 3 seconds
4. ✅ Full-screen incoming call modal with Accept/Decline
5. ✅ Vibration and haptic feedback for incoming calls
6. ✅ Animated pulsing avatar for caller

**Parent App - Family File Quick Actions:**
1. ✅ ClearFund Request → `/expenses/create?familyFileId=${id}`
2. ✅ New Event → `/events/create?familyFileId=${id}`
3. ✅ Messages → `/messages?familyFileId=${id}`
4. ✅ KidComs → `/recordings?familyFileId=${id}`

**API Endpoints Used:**
- `POST /parent-calls/` - Initiate parent-to-child call
- `POST /parent-calls/{id}/join` - Join existing call
- `POST /parent-calls/{id}/end` - End call
- `GET /kidcoms/sessions/active/{familyFileId}` - Check incoming calls
- `POST /kidcoms/sessions/{id}/accept` - Accept incoming call
- `POST /kidcoms/sessions/{id}/reject` - Reject incoming call

**Status:** ✅ Complete

---

### Month 3: Polish + Additional Apps (Weeks 9-12)

#### Week 9: Circle App Completion
- Photo sharing completion
- Enhanced messaging
- Image sharing

**Status:** 🔴 Not Started

---

#### Week 10: Kidscom Arcade + Circle Watch Together
- Games implementation
- Synchronized viewing

**Status:** 🔴 Not Started

---

#### Week 11: Professional App (NEW)
**Create 4th app from scratch**

**Files to Create:**
- `apps/professional-app/` (entire new app)
- `apps/professional-app/app.json`
- `apps/professional-app/app/(auth)/login.tsx`
- `apps/professional-app/app/(tabs)/_layout.tsx`
- `apps/professional-app/app/(tabs)/index.tsx`
- `apps/professional-app/app/(tabs)/cases.tsx`
- `apps/professional-app/app/cases/[id]/timeline.tsx`
- `apps/professional-app/app/messages/`

**Bundle ID:** `com.commonground.professional`

**Features:**
1. Professional authentication
2. Case list (read-only)
3. Case timeline view
4. Attorney-client messaging
5. View ARIA settings (no editing)

**Status:** 🔴 Not Started

---

#### Week 12: Testing + App Store Prep
- E2E testing
- Bug fixes
- Performance optimization
- App Store metadata
- Beta testing

**Status:** 🔴 Not Started

---

## 🔧 Technical Setup

### Development Environment

**Required:**
- Node.js 20+
- Xcode (latest)
- iOS Simulator
- Expo Go app on iPhone

**Installation Commands:**
```bash
# Install Expo CLI
npm install -g expo-cli

# Install dependencies
cd /Users/tj/Desktop/CommonGround
pnpm install

# Start any app
cd apps/parent-app
npx expo start
```

**Testing:**
- **iPhone (Physical):** Install Expo Go → Scan QR code
- **iOS Simulator:** Press `i` in terminal after `npx expo start`
- **Hot Reload:** Save any file → instant update

---

### Repository Structure

**Current Location:** `/Users/tj/Desktop/CommonGround/`

**Branch:** `claude/update-mobile-app-OyHC0`

**Apps Directory:**
```
apps/
├── parent-app/        # 70% complete
├── kidscom-app/       # 30% complete
├── circle-app/        # 60% complete
└── professional-app/  # 0% - to be created
```

**Shared Packages:**
```
packages/
├── api-client/        # Needs: ARIA endpoints, agreement sections, events
├── daily-video/       # Complete for basic calls
├── notifications/     # Needs: Expo push, deep linking
├── types/             # Needs: Agreement, event, theater types
└── utils/             # Complete
```

---

## 🐛 Issues & Resolutions

### Issue Log

#### Issue #1: pnpm Permission Denied ✅ RESOLVED
**Date:** 2026-01-25
**Component:** Development Environment Setup
**Severity:** Medium
**Description:** pnpm fails with permission error when trying to check version

**Error:**
```
ERROR  EACCES: permission denied, mkdir '/Users/tj/Library/pnpm/.tools/pnpm/9.15.0_tmp_14078'
```

**Root Cause:** pnpm's strict module isolation doesn't work well with React Native

**Solution Applied:**
Created `.npmrc` at project root with:
```
node-linker=hoisted
public-hoist-pattern[]=*
```

This switches pnpm to use npm-style hoisting, which React Native requires.

**Resolution:** ✅ Resolved 2026-01-25

**Learnings:**
- React Native requires hoisted node_modules (can't use pnpm's strict mode)
- Always use `node-linker=hoisted` for React Native/Expo projects with pnpm

---

## 📦 Dependencies to Install

### Parent App
- [x] `@stripe/stripe-react-native` - Payment processing
- [ ] `react-native-qrcode-scanner` - QR scanning for Silent Handoff
- [ ] `react-native-camera` - Camera access for QR + receipts
- [ ] `expo-location` - GPS for geofencing
- [ ] `react-native-chart-kit` - Custody time charts

### Kidscom App
- [ ] `react-native-video` or web video player - Theater mode

### All Apps
- [ ] `expo-notifications` - Push notifications
- [ ] `@react-native-async-storage/async-storage` - Offline storage

---

## 🔑 Environment Variables

**All apps need:**
```bash
EXPO_PUBLIC_API_URL=https://commonground-api-gdxg.onrender.com
EXPO_PUBLIC_SUPABASE_URL=<from web app>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<from web app>
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=<get from Stripe>
EXPO_PUBLIC_DAILY_API_KEY=<from Daily.co>
```

**Setup:**
1. Copy from web app's `.env.local`
2. Create `.env` in each app directory
3. Verify values match backend

---

## 🎨 Design System Reference

**Colors:**
- **Primary (Teal):** `#2F9C95` or `var(--portal-primary)`
- **Accent (Coral):** `#D97757`
- **Sage (Your Time):** `#8B9D83`
- **Slate (Their Time):** `#64748B`
- **Amber (Exchanges):** `#F59E0B`

**Typography:**
- **Headings:** Crimson Text, Georgia, serif
- **Body:** System font

**Components:**
- **Cards:** `rounded-2xl border-2 border-slate-200 shadow-lg`
- **Buttons:** `bg-gradient-to-r from-[var(--portal-primary)] to-[#1f4644]`
- **Disabled:** `opacity-50 cursor-not-allowed`

---

## 📝 API Endpoints Reference

### Authentication
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`

### Messages
- `POST /messages/analyze` ⭐ NEED FOR WEEK 1
- `POST /messages/`
- `GET /messages/family-file/{id}`
- `POST /messages/{id}/acknowledge`

### Agreements
- `GET /agreements/{id}`
- `PUT /agreements/sections/{id}` ⭐ NEED FOR WEEK 2
- `POST /agreements/{id}/submit`
- `POST /agreements/{id}/approve`
- `GET /agreements/{id}/pdf`

### Custody Exchanges
- `POST /exchanges/instances/{id}/confirm-qr` ⭐ NEED FOR WEEK 3
- `POST /custody-time/family/{id}/override`
- `GET /custody-time/child/{id}/stats`

### Payments
- `POST /wallets/{id}/onboarding` ⭐ NEED FOR WEEK 4
- `POST /clearfund/obligations/{id}/fund`
- `GET /wallets/{id}/transactions`

### Professional Portal
- `GET /professional/cases`
- `GET /professional/cases/{id}/timeline`
- `GET /professional/messages`
- `POST /professional/cases/{id}/messages`

**Full API Documentation:** See `/Users/tj/Desktop/CommonGround/cg-v1.110.26/backend/app/api/v1/endpoints/`

---

## 🧪 Testing Strategy

### Local Testing (Current)
- **Method:** Expo Go on iPhone
- **No Account Needed:** Works immediately
- **Hot Reload:** Instant updates on save

### Production Testing (Later)
- **Method:** EAS Build → TestFlight/Internal Testing
- **Requires:** Expo account, Apple Developer account ($99/year)
- **Timeline:** Month 3

### Test Cases (Critical)
1. ✅ Login → Dashboard → View custody status
2. ⏳ Send message with ARIA analysis
3. ⏳ Create agreement → Approve → Activate
4. ⏳ Silent handoff (GPS + QR check-in)
5. ⏳ Create expense → Fund → Verify receipt
6. ⏳ Video call (parent, child, circle)

---

## 🚀 Deployment Plan

### Phase 1: Local Development (Current)
- Test on iPhone with Expo Go
- No App Store needed

### Phase 2: Internal Testing (Month 3)
- Create Expo account
- EAS Build for iOS/Android
- TestFlight beta testing

### Phase 3: App Store Submission (Month 4)
- Create Apple Developer account ($99/year)
- Create Google Play Developer account ($25 one-time)
- Submit all 4 apps
- App review process

---

## 📊 Progress Metrics

### Overall Completion
- **Parent App:** 70% → Target: 95%
- **Kidscom App:** 30% → Target: 100%
- **Circle App:** 60% → Target: 100%
- **Professional App:** 0% → Target: 100%

### Features Completed
- **Base Features:** 11/50 (22%)
- **Critical Features:** 0/11 (0%)
- **Important Features:** 0/15 (0%)
- **Professional Features:** 0/3 (0%)

### Code Metrics
- **Files Created:** 0
- **Files Modified:** 0
- **Lines of Code:** 0
- **Test Coverage:** 0%

---

## 💡 Next Actions

### Immediate (Today)
1. ✅ Create this PROJECT_STATUS.md
2. ⏳ Verify Node.js, pnpm, Expo CLI installed
3. ⏳ Run `pnpm install` in root directory
4. ⏳ Start parent-app: `cd apps/parent-app && npx expo start`
5. ⏳ Test on iPhone with Expo Go
6. ⏳ Test on iOS Simulator

### This Week
1. Set up local development environment
2. Begin Phase 1 Week 1: ARIA Messaging
3. Create `compose.tsx` with ARIA analysis
4. Implement toxicity warnings
5. Add AI rewrite suggestions

### This Month
1. Complete all Month 1 features (ARIA, Agreements, Custody, Payments)
2. Test on physical iPhone daily
3. Document all issues in this file
4. Update progress metrics weekly

---

## 🎯 Success Criteria

### Week 1 Success ✅ COMPLETE
- [x] ARIA analysis working (pre-send)
- [x] Toxicity warnings displaying correctly
- [x] AI rewrites offered and functional
- [x] Messages sent successfully
- [x] Interventions logged

### Month 1 Success ✅ COMPLETE
- [x] ARIA messaging complete
- [x] 7-section agreement builder working
- [x] QR + GPS Silent Handoff functional
- [x] Stripe payments integrated
- [ ] All tested on iPhone (pending physical device testing)

### Month 3 Success
- [ ] All 4 apps feature-complete
- [ ] No critical bugs
- [ ] Performance targets met (< 3s launch, 60 FPS)
- [ ] Ready for App Store submission

---

## 📚 Resources

### Documentation
- **Plan File:** `/Users/tj/.claude/plans/compressed-hopping-gosling.md`
- **Web App Frontend:** `/Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/`
- **Backend API:** `/Users/tj/Desktop/CommonGround/cg-v1.110.26/backend/app/api/v1/endpoints/`

### External Resources
- **Expo Docs:** https://docs.expo.dev
- **React Native Docs:** https://reactnative.dev
- **Stripe React Native:** https://stripe.dev/stripe-react-native
- **Daily.co Docs:** https://docs.daily.co

---

## 🔄 Update Instructions

**This file should be updated:**
1. **After completing each task** - Mark tasks as done, update metrics
2. **When encountering issues** - Log in Issues & Resolutions section
3. **At end of each week** - Update progress metrics, next actions
4. **When making decisions** - Document in appropriate section

**Format for updates:**
```markdown
## Section Name
**Updated:** YYYY-MM-DD
**By:** Agent name or person

Changes made...
```

---

## 🤖 For Future Agents

**If you're picking up this project:**

1. **Read this file top to bottom** - It's the source of truth
2. **Check "Current Work" section** - See what's active
3. **Review "Next Actions"** - Know what to do next
4. **Check "Issues & Resolutions"** - Learn from past problems
5. **Update this file as you work** - Keep it current

**Before starting work:**
- Verify local dev environment is set up
- Read the relevant week's plan section
- Check API endpoints needed
- Review files to create/modify
- Test on iPhone after changes

**Key Principles:**
- Test frequently (save → hot reload)
- Update this file after each task
- Document issues immediately
- Ask user for clarification when needed
- Prioritize Stripe payments (user's request)

---

**END OF PROJECT STATUS**

*This file is the living source of truth for CommonGround Mobile Apps development. Keep it updated!*
