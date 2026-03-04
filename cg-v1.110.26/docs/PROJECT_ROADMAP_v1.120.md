# CommonGround v1.120.0 - Project Roadmap

**Version:** 1.110.26 → 1.120.0
**Timeline:** 4-6 weeks
**Last Updated:** January 22, 2026
**Status:** In Progress

---

## 🎯 Executive Summary

This major update transforms CommonGround with 9 parallel workstreams focused on:

1. **New subscription system** with improved entitlements
2. **Financial accuracy fixes** for ClearFund
3. **ARIA simplification** (remove suggestions, keep flagging)
4. **Real-time infrastructure** migration to WebSockets
5. **Silent handoff enhancements** with geofence notifications
6. **Custody tracking verification** and testing
7. **PDF generation fixes** for court forms
8. **Marketing pages redesign** for better conversion
9. **Infrastructure improvements** (Sendgrid, email automations)

**Rollout Strategy:** Parents First → Professionals → Court Portal

---

## 📊 Progress Tracker

| Workstream | Priority | Status | Progress |
|------------|----------|--------|----------|
| WS1: Subscriptions | P0 | 🔴 Blocked | 0% - Awaiting tier definitions |
| WS2: ClearFund | P0 | 🟡 Ready | 0% - Ready to start |
| WS3: ARIA Refactor | P1 | 🟡 Ready | 0% - Ready to start |
| WS4: PDF Fixes | P1 | 🟡 Ready | 0% - Ready to start |
| WS5: Real-time | P1 | 🟡 Ready | 0% - Ready to start |
| WS6: Silent Handoff | P2 | 🟡 Ready | 0% - Ready to start |
| WS7: Custody Tracker | P1 | 🟢 Complete | 100% - Verified & documented |
| WS8: Infrastructure | P2 | 🟡 Ready | 0% - Ready to start |
| WS9: Marketing Pages | P2 | 🟡 In Progress | 10% - Planning complete |

**Overall Progress:** 11% (1/9 workstreams complete)

---

## 🚀 Workstream Details

### WS1: Subscription System Overhaul
**Priority:** P0 (Critical - Blocks Revenue)
**Duration:** 1.5 weeks
**Status:** 🔴 Blocked (awaiting user input)

#### Objective
Replace existing 3-tier system (Starter/Plus/Family+) with new subscription structure optimized for market fit and revenue.

#### Tasks
- [ ] Define new tier structure (names, pricing, features) - **BLOCKER**
- [ ] Update `backend/app/models/subscription.py` with new tiers
- [ ] Create migration script for existing users
- [ ] Build centralized entitlements service (`backend/app/services/entitlements.py`)
- [ ] Update Stripe products and price IDs
- [ ] Rebuild frontend billing UI (`frontend/app/settings/billing/page.tsx`)
- [ ] Add feature gates throughout application
- [ ] Test migration on staging with production data clone
- [ ] Create user communication (email, in-app messaging)

#### Dependencies
- None (critical path - other work can proceed in parallel)

#### Risks
- Revenue loss if migration fails
- User confusion during transition
- Breaking changes for existing paid users

#### Mitigation
- Grandfather existing paid subscribers
- Reversible database migrations
- Extensive testing on staging
- 2-week notice to users before changes

#### Critical Files
```
backend/app/models/subscription.py          - Subscription models
backend/app/services/entitlements.py        - NEW: Feature gating
backend/app/api/v1/endpoints/subscriptions.py - Billing endpoints
frontend/app/settings/billing/page.tsx      - Billing UI
```

---

### WS2: ClearFund Financial Fixes
**Priority:** P0 (Critical - Financial Accuracy)
**Duration:** 1 week
**Status:** 🟡 Ready to start

#### Objective
Fix obligation balance calculations and ensure dashboard displays accurate amounts owed, including which specific payments are behind.

#### Current Issues
- Balance calculations may not match ledger
- Dashboard doesn't show which payments are behind
- Per-parent contribution tracking inconsistencies

#### Tasks
- [ ] Audit `get_balance_summary()` in `backend/app/services/clearfund.py` (lines 888-1036)
- [ ] Create comprehensive test suite (`backend/tests/integration/test_clearfund_calculations.py`)
- [ ] Fix aggregation queries for accurate balances
- [ ] Add new endpoint: `GET /api/v1/clearfund/behind/{family_file_id}`
- [ ] Update dashboard to show "behind payments" breakdown
- [ ] Fix FIFO payment application logic
- [ ] Add transaction isolation to prevent race conditions
- [ ] Update frontend `frontend/app/payments/page.tsx` with new UI

#### Test Scenarios
1. Single obligation, full payment
2. Split obligations (50/50, custom percentages)
3. Partial payments
4. Overdue obligations
5. FIFO credit application across multiple obligations
6. Multiple children with different splits

#### Success Criteria
- All test scenarios pass
- Balances match manual calculations
- Dashboard shows accurate "You owe" / "They owe" amounts
- Behind payments list displays correct obligations

#### Critical Files
```
backend/app/services/clearfund.py           - Balance calculation logic
backend/app/api/v1/endpoints/clearfund.py   - ClearFund endpoints
backend/app/api/v1/endpoints/dashboard.py   - Dashboard aggregation
frontend/app/payments/page.tsx              - ClearFund UI
backend/tests/integration/test_clearfund_calculations.py - NEW: Tests
```

---

### WS3: ARIA Refactor - Remove Suggestions
**Priority:** P1 (High - UX Change)
**Duration:** 4-5 days
**Status:** 🟡 Ready to start

#### Objective
Remove ALL message rewrite suggestions from ARIA everywhere. Keep only toxicity flagging for "could be taken out of context in court."

#### Current Behavior
- ARIA analyzes message toxicity
- Suggests rewrites using BIFF method
- Shows original + suggestion side-by-side
- User can accept/modify/reject

#### New Behavior
- ARIA analyzes message toxicity
- Flags if message could be problematic
- Shows warning only (no suggestions)
- User acknowledges and sends or cancels

#### Tasks

**Backend (Days 1-2)**
- [ ] Remove `_generate_suggestion()` method from `aria.py` (lines 564-624)
- [ ] Remove `TEMPLATES` dict (lines 250-283)
- [ ] Remove `SUGGESTIONS` phrase replacements (lines 286-367)
- [ ] Update AI prompts to remove suggestion generation
- [ ] Update `SentimentAnalysis` schema to remove `suggestion` field
- [ ] Create migration: Drop `suggested_content` columns from `message_flags`
- [ ] Update `user_action` enum: Remove "accepted"/"modified", add "acknowledged"

**Frontend (Days 3-4)**
- [ ] Simplify `frontend/components/messages/aria-intervention.tsx` (352 → ~150 lines)
- [ ] Remove "Use ARIA's Suggestion" button
- [ ] Remove suggestion display UI
- [ ] Update to show: Warning + "Acknowledge & Send" or "Cancel"
- [ ] Update message composition flow (`frontend/app/messages/page.tsx`)
- [ ] Remove ARIA suggestions from agreement builder

**Testing & Communication (Day 5)**
- [ ] Update test suite
- [ ] Create in-app banner explaining change
- [ ] Send email to active users
- [ ] Update help documentation

#### User Communication Template
```
📢 ARIA Update: Simplified Flagging

We've streamlined ARIA to focus on what matters: flagging messages that
could be taken out of context in court.

What's changed:
✅ ARIA still detects toxic/problematic content
✅ You'll see clear warnings when needed
❌ No more suggested rewrites (you write your own messages)

Why? Because you know best how to communicate. ARIA's job is just to
alert you when something might look bad to a judge.
```

#### Breaking Changes
- Existing `message_flags` records keep historical suggestions (read-only)
- Frontend expecting `suggestion` field will receive `null`
- User behavior will change (no more rewrite acceptance)

#### Rollback Plan
- Feature flag: `ARIA_SUGGESTIONS_ENABLED` (default: false)
- Keep old code in git history
- Reversible database migration

#### Critical Files
```
backend/app/services/aria.py                        - ARIA logic (major refactor)
backend/app/models/message.py                       - MessageFlag model
frontend/components/messages/aria-intervention.tsx  - Intervention UI
frontend/app/messages/page.tsx                      - Message composition
backend/app/schemas/message.py                      - API schemas
```

---

### WS4: PDF Generation Fixes
**Priority:** P1 (High - Court Filing Accuracy)
**Duration:** 3-4 days
**Status:** 🟡 Ready to start

#### Objective
Fix FL-300 (Request for Order) and FL-311 (Child Custody Declaration) PDFs to show correct data in proper California court form format.

#### Current Issues
- Data not populating correctly in forms
- Format issues (spacing, alignment, checkboxes)
- Using wrong data source (case vs. family_file confusion)
- Printouts don't match official court templates

#### Tasks

**Phase 1: Audit (Days 1-2)**
- [ ] Generate sample FL-300 and FL-311 for test cases
- [ ] Compare to official California Judicial Council forms
- [ ] Document all format discrepancies
- [ ] Identify missing/incorrect data fields
- [ ] Trace data flow from FamilyFile → PDF

**Phase 2: Fix Data Sources (Day 2)**
- [ ] Fix `family_file_id` vs `case_id` queries
- [ ] Verify Agreement section data extraction
- [ ] Add null checks for missing sections
- [ ] Add data validation before generation

**Phase 3: Fix Formatting (Days 3-4)**
- [ ] Match FL-300 layout to official form
- [ ] Match FL-311 layout to official form
- [ ] Correct spacing, fonts, and alignment
- [ ] Ensure checkboxes align with form fields
- [ ] Add proper page breaks for multi-page content
- [ ] Test print output on real printer

#### Testing Checklist
- [ ] Generate PDFs for 5+ test families
- [ ] Verify all data appears correctly
- [ ] Print PDFs and verify formatting
- [ ] Compare to hand-filled official forms
- [ ] Get legal professional review (if available)

#### Critical Files
```
backend/app/services/export/pdf_builder.py      - PDF generation (1075 lines)
backend/app/api/v1/endpoints/court_forms.py     - Form endpoints
backend/app/services/export/generators/         - Section generators
frontend/components/court-forms/FL300*.tsx      - FL-300 components
frontend/components/court-forms/FL311*.tsx      - FL-311 components
```

---

### WS5: Real-Time Infrastructure Migration
**Priority:** P1 (High - Scalability)
**Duration:** 1.5 weeks
**Status:** 🟡 Ready to start

#### Objective
Replace HTTP polling with Supabase Realtime (WebSockets) for instant updates on messages, notifications, exchanges, and geofence alerts.

#### Current State
- Frontend polls every 5 seconds for new messages
- Backend has no WebSocket server
- Poor scalability (N clients = N polling requests/sec)

#### Target Architecture
**Supabase Realtime Features:**
1. **Postgres Changes** - Real-time database row updates
2. **Broadcast** - Custom events between clients
3. **Presence** - Track online users

#### Events to Migrate
- ✉️ New message received
- ✅ Message read status changed
- ⌨️ Typing indicators
- 📍 Exchange check-ins
- 💰 Obligation status changes
- 👨‍⚖️ Professional access requests
- 🔔 Geofence notifications (NEW)

#### Tasks

**Phase 1: Backend Setup (Days 1-3)**
- [ ] Configure Supabase Realtime for tables: `messages`, `message_flags`, `custody_exchange_instances`, `obligations`, `professional_access_requests`
- [ ] Set up Row Level Security (RLS) policies
- [ ] Create WebSocket event emitters service (`backend/app/services/realtime.py`)
- [ ] Add Realtime calls to existing services (messages, exchanges, obligations)
- [ ] Test Realtime connection from backend

**Phase 2: Frontend Migration (Days 4-7)**
- [ ] Audit all `setInterval` polling locations
- [ ] Replace polling with WebSocket subscriptions
- [ ] Implement optimistic UI updates
- [ ] Add presence system (online indicators)
- [ ] Add typing indicators
- [ ] Handle reconnection logic
- [ ] Add loading skeletons for real-time content

**Phase 3: Geofence Notifications (Days 8-9)**
- [ ] Create geofence monitoring service (`backend/app/services/geofence.py`)
- [ ] Track GPS coordinates from frontend every 30 seconds
- [ ] Calculate distance to exchange location
- [ ] Emit notification when parent enters geofence (e.g., 1 mile radius)
- [ ] Build frontend geofence tracking (`frontend/lib/geolocation.ts`)
- [ ] Show notification when other parent approaches

**Phase 4: Testing & Rollout (Days 10-11)**
- [ ] Load test with 100+ concurrent WebSocket connections
- [ ] Verify message delivery latency < 500ms
- [ ] Test connection stability over 24 hours
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Keep HTTP polling as fallback for 2 weeks
- [ ] Monitor Supabase Realtime quota usage

#### Example Polling Replacement

**Before (HTTP Polling):**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchMessages(); // API call every 5 seconds
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

**After (WebSocket):**
```typescript
useEffect(() => {
  const unsubscribe = ws.onNewMessage((data) => {
    if (data.family_file_id === currentFamilyFileId) {
      setMessages(prev => [...prev, data.message]); // Optimistic update
    }
  });
  return unsubscribe;
}, [currentFamilyFileId]);
```

#### Performance Targets
- Message latency: < 500ms (95th percentile)
- Connection uptime: > 99%
- Failed delivery rate: < 0.1%
- Reconnection time: < 2 seconds

#### Critical Files
```
backend/app/services/realtime.py              - NEW: Supabase Realtime wrapper
backend/app/services/geofence.py              - NEW: Geofence tracking
frontend/contexts/websocket-context.tsx       - WebSocket provider
frontend/lib/geolocation.ts                   - NEW: Location tracking
frontend/app/messages/page.tsx                - Message list (remove polling)
frontend/app/dashboard/page.tsx               - Dashboard (remove polling)
```

---

### WS6: Silent Handoff Enhancements
**Priority:** P2 (Medium - Feature Expansion)
**Duration:** 3-4 days
**Status:** 🟡 Ready to start

#### Objective
Extend silent handoff GPS check-in system to general events (medical appointments, school hearings) and add geofence entry notifications.

#### Current Features (Exchanges Only)
- GPS check-in at exchange location
- QR code confirmation
- Geofence radius validation
- Check-in window (30 min before/after)

#### New Features

**1. Geofence Notifications**
- Notify other parent when co-parent enters geofence zone
- Send real-time alert: "John is approaching the exchange location (0.8 miles away)"
- Update distance in real-time as parent approaches

**2. Event Check-Ins**
- Extend check-in to mandatory events (not just exchanges)
- Examples: doctor appointments, school hearings, sports events
- Same GPS verification and QR confirmation
- Track attendance for court compliance reporting

#### Tasks

**Phase 1: Geofence Notifications (Days 1-2)**
- Covered in WS5 (Real-time Infrastructure)
- Uses Realtime events from geofence service

**Phase 2: Extend to General Events (Days 2-3)**
- [ ] Update `ScheduleEvent` model (`backend/app/models/schedule.py`)
  - Add `requires_checkin: bool`
  - Add `checkin_location_lat`, `checkin_location_lng`
  - Add `geofence_radius_miles`
  - Add `checkin_qr_code`
- [ ] Create event check-in endpoint: `POST /api/v1/events/{event_id}/checkin`
- [ ] Reuse GPS and QR logic from exchange check-ins
- [ ] Link to `event_attendance` tracking

**Phase 3: Frontend UI (Day 4)**
- [ ] Add "Check In" button to event details
- [ ] Reuse GPS and QR components from exchanges
- [ ] Show geofence notifications for events
- [ ] Add check-in status to calendar view
- [ ] Alert if check-in required but not completed

#### Use Cases
- **Medical Appointments**: Both parents required at pediatrician visit
- **School Hearings**: Parent must attend IEP meeting
- **Sports Events**: Track attendance at child's games
- **Therapy Sessions**: Court-ordered family counseling attendance

#### Dependencies
- WS5 (Real-time) for geofence notifications

#### Critical Files
```
backend/app/models/schedule.py              - ScheduleEvent model
backend/app/api/v1/endpoints/events.py      - Event check-in endpoint
backend/app/models/event_attendance.py      - Attendance tracking
frontend/app/schedule/page.tsx              - Calendar + check-in UI
```

---

### WS7: Custody Tracker Verification ✅
**Priority:** P1 (High - Data Accuracy)
**Duration:** 2-3 days
**Status:** 🟢 Complete

#### Objective
Verify custody tracker accurately counts days with each parent (one day = +1).

#### Analysis Results
✅ **Backend logic is CORRECT**
- Date calculation uses `+1` for inclusive boundaries (line 256)
- Backfill loop properly creates one record per day (line 643)
- Exchange records create exactly one record per child (line 135)

#### Deliverables Completed
- ✅ Comprehensive test suite (`backend/tests/test_custody_tracker_verification.py`)
- ✅ Documentation (`docs/features/CUSTODY_TRACKER.md`)
- ✅ Verified date counting logic
- ✅ Verified backfill accuracy
- ✅ Verified exchange integration

#### Key Findings
| Test Case | Start Date | End Date | Expected | Actual | Status |
|-----------|------------|----------|----------|--------|--------|
| 3-day period | 2026-01-01 | 2026-01-03 | 3 days | 3 days | ✅ |
| Full month | 2026-01-01 | 2026-01-31 | 31 days | 31 days | ✅ |
| Same day | 2026-01-01 | 2026-01-01 | 1 day | 1 day | ✅ |
| Month boundary | 2026-01-30 | 2026-02-02 | 4 days | 4 days | ✅ |
| February | 2026-02-01 | 2026-02-28 | 28 days | 28 days | ✅ |

**Conclusion:** System is working correctly. No changes needed.

---

### WS8: Infrastructure Updates
**Priority:** P2 (Medium - Operational)
**Duration:** 1 day
**Status:** 🟡 Ready to start

#### Objective
Verify Sendgrid configuration in production and set up email automations.

#### Tasks
- [ ] Verify env vars in production (Render.com)
  - `SENDGRID_API_KEY=SG.xxx`
  - `FROM_EMAIL=noreply@commonground.family`
  - `EMAIL_ENABLED=true`
- [ ] Test email sending via Sendgrid API
- [ ] Create email service (`backend/app/services/email.py` if not exists)
- [ ] Create email templates (welcome, reminders, notifications)
- [ ] Set up automations:
  - Welcome email on signup
  - Exchange reminder (24 hours before)
  - Payment due reminder
  - Professional invitation notification
  - Court export ready notification

#### Email Templates Needed
1. **Welcome Email** - Onboarding for new users
2. **Exchange Reminder** - "Your exchange is tomorrow at 6pm"
3. **Payment Due** - "Child support payment due in 3 days"
4. **Professional Invitation** - "You've been added to a case"
5. **Court Export Ready** - "Your evidence package is ready"

#### Critical Files
```
backend/app/core/config.py         - Environment variables
backend/app/services/email.py      - NEW: Email sending service
backend/app/templates/emails/      - Email templates
```

---

### WS9: Marketing Pages Redesign
**Priority:** P2 (Medium - Conversion Optimization)
**Duration:** 1 week
**Status:** 🟡 In Progress (10%)

#### Objective
Simplify static marketing pages for busy users and create audience-specific landing pages for parents, lawyers, and courts.

#### Current Issues
- Pages are too verbose (long paragraphs)
- Too much information for busy people
- Redundant content across pages
- Generic messaging (not audience-specific)

#### New Page Structure
**Core Pages:**
- 🏠 Home (main landing)
- ℹ️ About (condensed story)
- ⭐ Features (scannable bullet points)
- 💳 Pricing (clear comparison table)
- 📝 Blog (articles and updates)
- 📧 Contact (simple form)

**Audience-Specific Landing Pages:**
- 👨‍👩‍👧 **Parents Landing** - "Reduce conflict, protect your kids"
- ⚖️ **Lawyers Landing** - "Streamline your family law practice"
- 🏛️ **Courts Landing** - "Evidence-based custody decisions"

#### Design Principles
- **Scannable**: Bullet points, not paragraphs
- **Visual**: Icons, illustrations, screenshots
- **Clear CTAs**: One primary action per page
- **Mobile-first**: 60%+ users on mobile
- **Fast**: < 3 second load time

#### Tasks

**Phase 1: Content Strategy (Days 1-2)**
- [ ] Audit existing marketing pages
- [ ] Identify redundant content to remove
- [ ] Write shorter, punchier copy
- [ ] Create audience-specific messaging
- [ ] Define CTAs for each page

**Phase 2: Design & Build (Days 3-5)**
- [ ] Use `frontend-design` skill for polished layouts
- [ ] Create hero sections for each landing page
- [ ] Build feature comparison tables
- [ ] Add testimonials and social proof
- [ ] Create pricing cards with clear benefits

**Phase 3: Audience Landing Pages (Days 6-7)**
- [ ] Build parents landing page
  - Pain points: conflict, documentation, peace of mind
  - Features: ARIA, ClearFund, custody tracking
  - CTA: "Start Your Free Trial"
- [ ] Build lawyers landing page
  - Pain points: case management, client communication, evidence
  - Features: Professional portal, exports, intake
  - CTA: "Request Demo"
- [ ] Build courts landing page
  - Pain points: incomplete evidence, biased testimony, time
  - Features: Compliance tracking, verified data, exports
  - CTA: "Learn More"

#### Content Guidelines
**Before (Verbose):**
> "CommonGround is a comprehensive co-parenting platform that helps families manage their custody arrangements through an intuitive interface that includes features like messaging, expense tracking, and schedule management. Our AI-powered system, ARIA, helps reduce conflict by analyzing messages and providing suggestions to keep communication child-focused and productive."

**After (Scannable):**
> **Conflict-free co-parenting made simple**
> - ✅ Safe messaging (ARIA blocks toxic content)
> - ✅ Split expenses fairly (No more "I paid for that")
> - ✅ Court-ready reports (Everything documented)

#### Page-Specific Notes

**Home Page:**
- Hero: Clear value prop in 5 words
- Features: 3-column grid with icons
- Social proof: "Join 10,000+ families"
- CTA: Large "Start Free Trial" button

**Features Page:**
- Tabbed interface: Overview, Messages, Expenses, Schedule, Reports
- Each tab: Screenshot + 3-5 bullet points
- Avoid technical jargon

**Pricing Page:**
- 3-column comparison table
- Highlight "Most Popular" tier
- Annual discount badge
- FAQ accordion below

**About Page:**
- Founder story in 100 words (not 500)
- Mission: "End custody battles"
- Team photos (optional)
- Press mentions (if any)

#### Tools to Use
- `Skill(frontend-design:frontend-design)` - For beautiful, professional layouts
- `Skill(nano-banana-pro:generate)` - For illustrations and graphics
- Tailwind CSS - For responsive design
- Next.js Image - For optimized images

#### Critical Files
```
frontend/app/(marketing)/page.tsx           - Home page
frontend/app/(marketing)/about/page.tsx     - About
frontend/app/(marketing)/features/page.tsx  - Features
frontend/app/(marketing)/pricing/page.tsx   - Pricing
frontend/app/(marketing)/blog/page.tsx      - Blog
frontend/app/(marketing)/contact/page.tsx   - Contact
frontend/app/(marketing)/parents/page.tsx   - NEW: Parents landing
frontend/app/(marketing)/lawyers/page.tsx   - NEW: Lawyers landing
frontend/app/(marketing)/courts/page.tsx    - NEW: Courts landing
```

---

## 🔄 Deployment Strategy

### Week 1: Backend Infrastructure
- **Days 1-3:** WS1 backend (subscription models, migrations)
- **Days 4-5:** WS2 (ClearFund fixes)
- **Days 6-7:** WS3 backend (ARIA refactor)

### Week 2: Frontend Updates
- **Days 1-3:** WS1 frontend (subscription UI), WS3 frontend (ARIA UI)
- **Days 4-5:** WS5 (WebSocket migration - gradual rollout)
- **Days 6-7:** WS2 frontend (ClearFund dashboard)

### Week 3: Feature Additions
- **Days 1-2:** WS7 (custody tracker - already complete ✅)
- **Days 3-4:** WS6 (silent handoff enhancements)
- **Days 5-7:** WS4 (PDF generation fixes)

### Week 4: Polish & Deploy
- **Days 1-3:** WS9 (marketing pages)
- **Days 4-5:** Full regression testing, UAT
- **Days 6-7:** Gradual rollout, monitoring

---

## 🎯 Rollout Priority

### 1. Parents First (Core App)
All features ship here first. This is the highest priority user base.

**Features:**
- New subscriptions
- Fixed ClearFund
- Simplified ARIA
- Real-time messaging
- Silent handoff enhancements
- Accurate custody tracking

**Timeline:** Week 2-3
**Success Metrics:**
- Churn < 5%
- NPS > 7/10
- Real-time latency < 500ms

### 2. Professional Portal Second
Beta test with select attorneys before full rollout.

**Features:**
- New subscription (professional pricing)
- Professional dashboard updates
- Real-time notifications
- Fixed PDF exports

**Timeline:** Week 3-4
**Beta Testers:** 5-10 attorneys
**Success Metrics:**
- Professional satisfaction > 8/10
- Case load increase > 20%

### 3. Court Portal Last
Most conservative rollout - data accuracy is critical.

**Features:**
- Fixed FL-300/FL-311 forms
- Updated compliance reports
- Verified export integrity

**Timeline:** Week 4+
**Beta Testers:** 2-3 GALs
**Success Metrics:**
- PDF accuracy 100%
- Zero data integrity issues

---

## 📋 Critical Blockers

### 🚫 BLOCKER: New Subscription Tiers (WS1)

**What's Needed:**
1. **Tier Names** - e.g., "Free", "Essential", "Premium", "Enterprise"
2. **Pricing Structure**
   - Monthly price per tier
   - Annual price (discount %)
   - Trial days (if any)
3. **Feature Entitlements**
   - Which features per tier
   - Numeric limits (e.g., max children, circle contacts)
   - ClearFund fee exemptions
4. **Migration Strategy**
   - Grandfather existing paid users?
   - Force migration to closest tier?
   - Hybrid approach?

**Impact if Not Resolved:**
- WS1 cannot begin
- Revenue changes delayed
- Feature gating cannot be implemented

**Next Steps:**
1. Review current market research
2. Analyze competitor pricing
3. Define value prop per tier
4. Get stakeholder approval
5. Provide to engineering team

---

## ✅ Success Metrics

### Technical Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Real-time latency | < 500ms | P95 message delivery time |
| PDF generation | > 99% | Success rate for FL-300/FL-311 |
| Subscription migration | > 99.5% | Users successfully migrated |
| WebSocket uptime | > 99% | Connection stability |
| ClearFund accuracy | 100% | Balance calculations match ledger |

### Business Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Subscription churn | < 5% | Monthly recurring revenue loss |
| ARIA precision | > 90% | False positive rate |
| User satisfaction | > 7/10 | Net Promoter Score (NPS) |
| Marketing conversion | > 3% | Landing page → signup |
| Professional adoption | > 50 firms | New professional signups |

---

## 🛡️ Risk Mitigation

### High-Risk Changes

**1. Subscription Migration (WS1)**
- **Risk:** Revenue loss, user confusion
- **Mitigation:**
  - Grandfather existing paid users at current tier
  - 2-week notice before changes
  - Reversible database migrations
  - Feature flag for gradual rollout
  - Clear communication (email + in-app)

**2. ARIA Refactor (WS3)**
- **Risk:** User confusion, workflow disruption
- **Mitigation:**
  - In-app banner explaining changes
  - Email to active users
  - Gradual rollout with feature flag
  - Keep old behavior available for 30 days
  - Monitor user feedback

**3. Real-time Migration (WS5)**
- **Risk:** Connection instability, data loss
- **Mitigation:**
  - Keep HTTP polling as fallback
  - Gradual rollout (10% → 50% → 100%)
  - Load testing before production
  - Monitor Supabase quota
  - Auto-reconnection logic

### Rollback Procedures

**Database Changes:**
- All migrations are reversible
- Keep backups for 90 days
- Test rollback on staging first

**Code Changes:**
- Feature flags for instant disable
- Old code kept in git history
- Canary deployments (10% first)
- Automated rollback on error rate spike

**User Communication:**
- Pre-written rollback messages
- Status page updates
- Email notifications for affected users

---

## 📊 Testing Strategy

### Unit Tests
- Create tests for all new services
- Test subscription entitlement logic
- Test ClearFund calculations
- Test custody day counting
- Coverage target: > 80%

### Integration Tests
- End-to-end subscription flow
- ClearFund payment processing
- ARIA flagging without suggestions
- WebSocket message delivery
- PDF generation with real data

### Load Tests
- 1000 concurrent WebSocket connections
- 100 messages/second through ARIA
- PDF generation under load
- Database query performance

### User Acceptance Testing
- Beta test with 10 families
- Professional portal beta with 5 attorneys
- Court portal beta with 2 GALs
- Collect feedback via surveys

---

## 📅 Timeline Summary

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| **Week 1** | Backend Foundation | Subscription system, ClearFund fixes, ARIA backend |
| **Week 2** | Frontend Updates | Subscription UI, ARIA UI, WebSocket migration |
| **Week 3** | Feature Additions | Silent handoff, PDF fixes |
| **Week 4** | Polish & Deploy | Marketing pages, testing, rollout |

**Total Duration:** 4-6 weeks (depending on parallel execution)

---

## 🎨 Tools & Skills to Use

Throughout this project, leverage these CommonGround skills:

- **frontend-design:frontend-design** - Beautiful, professional UI layouts
- **nano-banana-pro:generate** - Graphics, illustrations, icons
- **vercel:deploy** - Quick deployments to Vercel
- **Render CLI** - Backend deployments
- **code-review:code-review** - Proactive code quality checks

---

## 📝 Documentation Requirements

As you implement each workstream, update:

1. **API Documentation** (`docs/api/`)
   - New endpoints
   - Changed request/response schemas
   - Deprecation notices

2. **Feature Documentation** (`docs/features/`)
   - How new features work
   - User guides
   - Technical architecture

3. **Migration Guides** (`docs/guides/`)
   - Subscription migration steps
   - ARIA behavior changes
   - Real-time setup

4. **CHANGELOG.md**
   - All breaking changes
   - New features
   - Bug fixes

---

## 🔔 Next Actions

### Immediate (This Week)
1. ✅ Create project roadmap (complete)
2. ✅ Verify custody tracker logic (complete)
3. 🟡 Define new subscription tiers (BLOCKER)
4. 🟡 Start marketing pages redesign
5. 🟡 Begin ClearFund audit

### Short-term (Next 2 Weeks)
1. Implement subscription backend
2. Fix ClearFund calculations
3. Refactor ARIA (backend first)
4. Set up Supabase Realtime
5. Complete marketing pages

### Long-term (Weeks 3-4)
1. Deploy subscription UI
2. Migrate to WebSockets
3. Add silent handoff enhancements
4. Fix PDF generation
5. Full regression testing
6. Phased rollout to production

---

## 📞 Contact & Resources

**Project Lead:** TJ
**Documentation:** `/docs/`
**Plan File:** `~/.claude/plans/valiant-percolating-pony.md`
**Issue Tracking:** GitHub Issues (if applicable)

**Key Resources:**
- [Subscription Models](/backend/app/models/subscription.py)
- [ARIA Service](/backend/app/services/aria.py)
- [ClearFund Service](/backend/app/services/clearfund.py)
- [Custody Tracker Docs](/docs/features/CUSTODY_TRACKER.md)
- [Frontend Components](/frontend/components/)

---

**Last Updated:** January 22, 2026
**Next Review:** January 29, 2026 (1 week)
**Version:** 1.0
