"""
Main API router - combines all endpoint routers.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
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
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(cases.router, prefix="/cases", tags=["Cases"])
api_router.include_router(family_files.router, prefix="/family-files", tags=["Family Files"])
api_router.include_router(quick_accords.router, prefix="/quick-accords", tags=["QuickAccords"])
api_router.include_router(agreements.router, prefix="/agreements", tags=["Agreements"])
api_router.include_router(messages.router, prefix="/messages", tags=["Messages"])
api_router.include_router(schedule.router, prefix="/schedule", tags=["Schedule"])
api_router.include_router(websocket.router, tags=["WebSocket"])

# Schedule V2.0 endpoints
api_router.include_router(collections.router, prefix="/collections", tags=["My Time Collections"])
api_router.include_router(time_blocks.router, prefix="/time-blocks", tags=["Time Blocks"])
api_router.include_router(events.router, prefix="/events", tags=["Events"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["Calendar"])
api_router.include_router(exchanges.router, prefix="/exchanges", tags=["Custody Exchanges"])

# Court Access Mode (MediatorMode)
api_router.include_router(court.router, prefix="/court", tags=["Court Access Mode"])

# Court Form Workflow (FL-300, FL-311, FL-320, FL-340, FL-341, FL-342)
api_router.include_router(court_forms.router, prefix="/court/forms", tags=["Court Form Workflow"])

# KidsCubbie - High-value item tracking
api_router.include_router(cubbie.router, prefix="/cubbie", tags=["KidsCubbie"])

# Child Profiles - Dual-parent approval workflow
api_router.include_router(children.router, prefix="/children", tags=["Child Profiles"])

# ClearFund - Purpose-Locked Financial Obligations
api_router.include_router(clearfund.router, prefix="/clearfund", tags=["ClearFund"])

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
