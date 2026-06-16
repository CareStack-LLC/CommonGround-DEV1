"""
Main API router - combines all endpoint routers.
"""

from fastapi import APIRouter, Depends
from app.core.security import require_parent_user

from app.api.v1.endpoints import (
    admin,
    admin_cleanup,
    admin_leads,
    admin_inbox,
    admin_sales,
    admin_cs,
    admin_marketing as admin_mktg,
    admin_ga4,
    admin_impersonation,
    admin_ops,
    admin_geo,
    auth,
    notifications,
    parent_child_messages,
    circle_parent_messages,
    users,
    partners,
    cases,
    family_files,
    quick_accords,
    agreements,
    messages,
    schedule,
    websocket,
    collections,
    time_blocks,
    events,
    calendar,
    exchanges,
    court,
    court_forms,
    cubbie,
    children,
    clearfund,
    wallet,
    webhook,
    exports,
    intake,
    dashboard,
    activities,
    circle,
    kidcoms,
    my_circle,
    circle_messages,
    subscriptions,
    grants,
    push,
    custody_time,
    reports,
    parent_reports,
    professional,
    professional_events,
    professional_tasks,
    intake_convert,
    parent_calls,
    circle_calls,
    recording_webhooks,
    recordings,
    recording_audit,
    analytics,
    smart_analytics,
    invitations,
    sendgrid_webhooks,
    marketing,
    verify,
    blog,
    kidspace_media,
    chatbot,
    demo,
    chores,
    rewards,
    sdu,
    stripe_issuing_webhooks,
    mux_webhooks,
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(cases.router, prefix="/cases", tags=["Cases"])
api_router.include_router(family_files.router, prefix="/family-files", tags=["Family Files"])
api_router.include_router(quick_accords.router, prefix="/quick-accords", tags=["QuickAccords"], dependencies=[Depends(require_parent_user)])
api_router.include_router(agreements.router, prefix="/agreements", tags=["Agreements"], dependencies=[Depends(require_parent_user)])
api_router.include_router(messages.router, prefix="/messages", tags=["Messages"], dependencies=[Depends(require_parent_user)])
api_router.include_router(schedule.router, prefix="/schedule", tags=["Schedule"], dependencies=[Depends(require_parent_user)])
api_router.include_router(websocket.router, tags=["WebSocket"])

# Schedule V2.0 endpoints
api_router.include_router(collections.router, prefix="/collections", tags=["My Time Collections"])
api_router.include_router(time_blocks.router, prefix="/time-blocks", tags=["Time Blocks"])
api_router.include_router(events.router, prefix="/events", tags=["Events"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["Calendar"])
api_router.include_router(exchanges.router, prefix="/exchanges", tags=["Custody Exchanges"], dependencies=[Depends(require_parent_user)])

# Court Access Mode (MediatorMode)
api_router.include_router(court.router, prefix="/court", tags=["Court Access Mode"])

# Court Form Workflow (FL-300, FL-311, FL-320, FL-340, FL-341, FL-342)
api_router.include_router(court_forms.router, prefix="/court/forms", tags=["Court Form Workflow"])

# KidsCubbie - High-value item tracking
api_router.include_router(cubbie.router, prefix="/cubbie", tags=["KidsCubbie"])

# Child Profiles - Dual-parent approval workflow
api_router.include_router(children.router, prefix="/children", tags=["Child Profiles"], dependencies=[Depends(require_parent_user)])

# ClearFund - Purpose-Locked Financial Obligations
api_router.include_router(clearfund.router, prefix="/clearfund", tags=["ClearFund"], dependencies=[Depends(require_parent_user)])

# Wallet System - Parent/Child Wallets with Stripe Connect
api_router.include_router(wallet.router, prefix="/wallets", tags=["Wallets"])

# Stripe Webhooks
api_router.include_router(webhook.router, prefix="/webhooks", tags=["Webhooks"])

# CaseExport - Court-ready documentation packages
api_router.include_router(exports.router, prefix="/exports", tags=["Case Exports"])

# ARIA Paralegal - Legal Intake
api_router.include_router(intake.router, prefix="/intake", tags=["ARIA Paralegal"])

# Dashboard - Activity aggregation
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])

# Activity Feed - Recent activity tracking
api_router.include_router(activities.router, tags=["Activities"])

# KidComs - Child Communication Hub
api_router.include_router(circle.router, prefix="/circle", tags=["Circle Contacts"])
api_router.include_router(kidcoms.router, prefix="/kidcoms", tags=["KidComs"])

# My Circle - Child/Contact Communication Portal
api_router.include_router(my_circle.router, prefix="/my-circle", tags=["My Circle"])

# Family Messaging — persistent parent ↔ child async inbox (Wave 1 A1)
api_router.include_router(
    parent_child_messages.router,
    prefix="/family-messaging",
    tags=["Family Messaging"],
)

# Notifications — in-app inbox + email dispatch (Wave 1 A6)
api_router.include_router(notifications.router, tags=["Notifications"])

# Circle Messages - Text messaging between children, parents, and circle contacts
api_router.include_router(circle_messages.router, prefix="/circle-messages", tags=["Circle Messages"])

# Circle Parent Messages - Dedicated parent ↔ circle-contact coordination thread
api_router.include_router(
    circle_parent_messages.router,
    prefix="/circle-parent-messages",
    tags=["Circle Parent Messages"],
)

# Subscriptions - Pricing tiers and billing
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["Subscriptions"])

# Grants - Nonprofit grant codes
api_router.include_router(grants.router, prefix="/grants", tags=["Grant Codes"])

# Push Notifications - Web Push API
api_router.include_router(push.router, prefix="/push", tags=["Push Notifications"])

# Custody Time - Parenting time tracking and reports
api_router.include_router(custody_time.router, prefix="/custody-time", tags=["Custody Time"])

# Reports - Professional investigation report requests
api_router.include_router(reports.router, prefix="/reports", tags=["Professional Reports"])

# Parent Reports - Self-service branded PDF reports
api_router.include_router(parent_reports.router, prefix="/parent-reports", tags=["Parent Reports"])

# Professional Portal - Attorneys, mediators, paralegals
api_router.include_router(professional.router, prefix="/professional", tags=["Professional Portal"])

# Professional Calendar Events
api_router.include_router(professional_events.router, prefix="/professional/events", tags=["Professional Events"])

# Professional Tasks - Phase 1 Dashboard CRUD
api_router.include_router(professional_tasks.router, prefix="/api/v1", tags=["Professional Tasks"])

# Intake-to-Case Conversion - Phase 3
api_router.include_router(intake_convert.router, prefix="/api/v1", tags=["Intake Convert"])

# Parent Communication - Video/Audio Calls
api_router.include_router(parent_calls.router, prefix="/parent-calls", tags=["Parent Calls"])

# Circle Communication - Video/Audio Calls between Circle Contacts and Children
api_router.include_router(circle_calls.router, prefix="/circle-calls", tags=["Circle Calls"])

# Recording Webhooks - Daily.co recording/transcription events
api_router.include_router(recording_webhooks.router, prefix="/webhooks", tags=["Recording Webhooks"])

# Recordings - Call recordings and transcriptions
api_router.include_router(recordings.router, prefix="/recordings", tags=["Recordings"])

# Recording Audit - Chain of custody, legal hold, evidence export
api_router.include_router(recording_audit.router, prefix="/recordings", tags=["Recording Audit"])

# Analytics - Usage statistics and metric
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

# Smart Analytics - V3 Custody Insights
api_router.include_router(smart_analytics.router, prefix="/analytics", tags=["Smart Analytics"])

# Partner Program - Nonprofit grant partnerships
api_router.include_router(partners.router, prefix="/partners", tags=["Partner Program"])

# Invitations - Case invitation flow with magic link auth
api_router.include_router(invitations.router, prefix="/invitations", tags=["Invitations"])

# SendGrid Webhooks - Email delivery tracking
api_router.include_router(sendgrid_webhooks.router, prefix="/webhooks", tags=["SendGrid Webhooks"])

# Marketing - Newsletter and contact form
api_router.include_router(marketing.router, prefix="/marketing", tags=["Marketing"])

# Report Verification - Public endpoint (no auth required)
api_router.include_router(verify.router, prefix="/verify", tags=["Verification"])

# Blog - Public read + admin CRUD
api_router.include_router(blog.router, prefix="/blog", tags=["Blog"])

# KidSpace Media - Public read + admin CRUD
api_router.include_router(kidspace_media.router, prefix="/kidspace", tags=["KidSpace Media"])

# Admin Lead Generator - Lead lists, campaigns, SendGrid
api_router.include_router(admin_leads.router, prefix="/admin/leads", tags=["Admin Lead Generator"])

# Public Landing Pages (no auth)
from app.api.v1.endpoints.admin_leads import public_router as landing_page_public_router
api_router.include_router(landing_page_public_router, tags=["Landing Pages"])

# Admin Email Monitor - Gmail integration, AI drafts
api_router.include_router(admin_inbox.router, prefix="/admin/inbox", tags=["Admin Email Monitor"])

# Chatbot - Public Aria Customer Success
api_router.include_router(chatbot.router, prefix="/chatbot", tags=["Chatbot"])

# ARIA Demo - Public interactive demo (no auth)
api_router.include_router(demo.router, prefix="/demo", tags=["ARIA Demo"])

# Chores / Tasks (Wave 3 C2) — parent assigns, child completes, parent approves
api_router.include_router(chores.router, prefix="/chores", tags=["Chores"])

# Rewards Store (Wave 3 C3) — parent catalog, child redeems from wallet
api_router.include_router(rewards.router, prefix="/rewards", tags=["Rewards"])

# State Disbursement Unit redirect + child-support payment log (Wave 4-Alt)
api_router.include_router(sdu.router, prefix="/sdu", tags=["Child Support Tracking"])

# Stripe Issuing webhooks (Wave 4-Alt) — separate from /webhooks/stripe so the
# Stripe dashboard can route issuing.* events to their own handler with
# persistent idempotency via StripeWebhookEvent.
api_router.include_router(
    stripe_issuing_webhooks.router, prefix="/webhooks", tags=["Stripe Issuing Webhooks"]
)

# Mux webhooks (KidSpace theater) — `video.asset.ready` flips a newly
# ingested asset to approved/visible; `video.asset.errored` hides broken
# uploads. Signature verified via MUX_WEBHOOK_SECRET.
api_router.include_router(
    mux_webhooks.router, prefix="/webhooks", tags=["Mux Webhooks"]
)

# Bug Hunt Tester - Public testing portal (no auth)
from app.api.v1.endpoints import bug_hunt_tester
api_router.include_router(bug_hunt_tester.router, prefix="/bug-hunt", tags=["Bug Hunt Tester"])

# Admin Reddit Integration
from app.api.v1.endpoints import admin_reddit
api_router.include_router(admin_reddit.router, prefix="/admin/reddit", tags=["Admin Reddit"])

# Admin Sales Intelligence
api_router.include_router(admin_sales.router, prefix="/admin", tags=["Admin Sales Intelligence"])

# Admin Customer Success
api_router.include_router(admin_cs.router, prefix="/admin", tags=["Admin Customer Success"])

# Admin Marketing Analytics
api_router.include_router(admin_mktg.router, prefix="/admin", tags=["Admin Marketing Analytics"])

# Admin Google Analytics 4
api_router.include_router(admin_ga4.router, prefix="/admin", tags=["Admin GA4 Analytics"])

# SuperAdmin Portal - Platform administration
api_router.include_router(admin.router, prefix="/admin", tags=["SuperAdmin Portal"])

# Admin impersonation + bulk actions + CSV exports (Wave 6 Phase B)
api_router.include_router(
    admin_impersonation.router,
    prefix="/admin",
    tags=["SuperAdmin Impersonation / Bulk / Exports"],
)

# Admin ops infrastructure — alert rules, history, runbooks (Wave 6 Phase C)
api_router.include_router(
    admin_ops.router,
    prefix="/admin",
    tags=["SuperAdmin Ops (Alerts / Runbooks)"],
)

# Admin AI usage — daily token counters + budget state (reliability batch 1)
from app.api.v1.endpoints import admin_ai_usage
api_router.include_router(
    admin_ai_usage.router,
    prefix="/admin",
    tags=["SuperAdmin AI Usage"],
)

# Admin geospatial — users/pros by state + exchange GPS points
api_router.include_router(
    admin_geo.router,
    prefix="/admin",
    tags=["SuperAdmin Geospatial"],
)

# Admin Maintenance — Daily.co room sweeper & other ops jobs (Wave 1 A8)
api_router.include_router(
    admin_cleanup.router,
    prefix="/admin/cleanup",
    tags=["Admin Maintenance"],
)
