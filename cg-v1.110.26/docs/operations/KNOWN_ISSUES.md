# CommonGround V1 - Known Issues & Limitations

**Last Updated:** January 10, 2026
**Version:** 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Critical Issues](#critical-issues)
3. [High Priority Issues](#high-priority-issues)
4. [Medium Priority Issues](#medium-priority-issues)
5. [Low Priority Issues](#low-priority-issues)
6. [Planned Improvements (TODOs)](#planned-improvements-todos)
7. [Feature Limitations](#feature-limitations)
8. [Known Workarounds](#known-workarounds)
9. [Browser Compatibility](#browser-compatibility)
10. [Mobile Considerations](#mobile-considerations)
11. [Issue Reporting](#issue-reporting)

---

## Overview

This document tracks all known issues, limitations, and planned improvements in CommonGround V1. Issues are categorized by severity and status.

### Issue Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| **CRITICAL** | System down, data loss, security vulnerability | Immediate |
| **HIGH** | Major feature broken, significant user impact | 24-48 hours |
| **MEDIUM** | Feature degraded, workaround available | 1 week |
| **LOW** | Minor issue, cosmetic, enhancement | Future release |

### Issue Status

| Status | Icon | Description |
|--------|------|-------------|
| OPEN | 🔴 | Issue confirmed, not yet addressed |
| IN PROGRESS | 🟡 | Actively being worked on |
| FIXED | 🟢 | Fixed, pending deployment |
| DEPLOYED | ✅ | Fix deployed to production |
| WONT FIX | ⚪ | Decision not to fix |
| DEFERRED | 🔵 | Postponed to future release |

---

## Critical Issues

### Currently no critical issues

*All critical issues have been resolved or none currently exist.*

---

## High Priority Issues

### ISSUE-001: Email Notifications Not Implemented

**Status:** 🔵 DEFERRED (V1.1)
**Severity:** HIGH
**Component:** Notifications

**Description:**
Email notifications for case invitations, agreement approvals, and schedule reminders are not functional. Users must manually check the application for updates.

**Impact:**
- Users miss important case invitations
- Agreement approvals delayed
- Exchange reminders not sent
- Reduced user engagement

**Affected Files:**
- `app/services/email.py:448` - TODO: Integrate with SendGrid

**Workaround:**
Users should regularly check the application dashboard for updates.

**Planned Fix:**
Integrate SendGrid for transactional emails in V1.1 release.

**Reference:**
- Backend TODO: `app/services/email.py`
- V1.1 Roadmap: Week 17

---

### ISSUE-002: KidComs Call Notifications Incomplete

**Status:** 🔴 OPEN
**Severity:** HIGH
**Component:** KidComs (Video Calling)

**Description:**
Call notifications to target contacts and parents are not being sent when calls are initiated.

**Impact:**
- Missed calls for children
- Parents unaware of incoming calls
- Reduced feature adoption

**Affected Files:**
- `app/api/v1/endpoints/kidcoms.py:774` - TODO: Send notification to target contact
- `app/api/v1/endpoints/kidcoms.py:1114` - TODO: Send notification to child/parents

**Workaround:**
Coordinate calls via messaging before initiating video calls.

**Planned Fix:**
Implement push notifications and SMS alerts for incoming calls.

---

### ISSUE-003: ARIA Analysis Not Integrated in KidComs

**Status:** 🔴 OPEN
**Severity:** HIGH
**Component:** KidComs, ARIA

**Description:**
ARIA sentiment analysis for video call transcripts is not functional.

**Affected Files:**
- `app/api/v1/endpoints/kidcoms.py:1587` - TODO: Call ARIA for analysis
- `app/api/v1/endpoints/kidcoms.py:1685` - TODO: Integrate with AI for analysis

**Workaround:**
Monitor calls manually; use messaging for sensitive topics.

**Planned Fix:**
Integrate Claude/OpenAI for real-time transcript analysis.

---

## Medium Priority Issues

### ISSUE-010: Agreement PDF Upload Not Implemented

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** Agreements

**Description:**
Generated agreement PDFs are created locally but not uploaded to cloud storage. The `pdf_url` field remains empty.

**Affected Files:**
- `app/services/agreement.py:562` - TODO: Upload PDF to storage and set pdf_url

**Workaround:**
PDFs are generated and returned in the response but not persistently stored. Save locally after generation.

**Planned Fix:**
Integrate Supabase Storage or S3 for PDF persistence.

---

### ISSUE-011: Time Block Recurring Expansion Not Implemented

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** Schedule

**Description:**
Recurring time blocks within a date range are not expanded when querying schedule data.

**Affected Files:**
- `app/services/time_block.py:526` - TODO: Expand recurring blocks within date range

**Workaround:**
Create individual events for each occurrence manually.

**Planned Fix:**
Implement recurrence rule expansion using rrule library.

---

### ISSUE-012: My Circle Email/SMS Invites Not Sent

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** My Circle

**Description:**
When inviting contacts to My Circle, email and SMS notifications are not sent.

**Affected Files:**
- `app/api/v1/endpoints/my_circle.py:568` - TODO: Send email with invite link
- `app/api/v1/endpoints/circle.py:401-420` - TODO: Integrate with SendGrid/Twilio

**Workaround:**
Manually share invite links with contacts.

**Planned Fix:**
Integrate email/SMS service for automated invitations.

---

### ISSUE-013: QuickAccord Notifications Missing

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** QuickAccord

**Description:**
Notifications are not sent to the other parent when a QuickAccord is created or modified.

**Affected Files:**
- `app/services/quick_accord.py:291` - TODO: Send notification to other parent

**Workaround:**
Manually notify co-parent via messaging about pending QuickAccords.

**Planned Fix:**
Add notification triggers for QuickAccord lifecycle events.

---

### ISSUE-014: ARIA Paralegal Notifications Missing

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** ARIA Paralegal

**Description:**
When ARIA Paralegal generates suggestions or requires parent action, notifications are not sent.

**Affected Files:**
- `app/services/aria_paralegal.py:505` - TODO: Send notification to parent

**Workaround:**
Check ARIA Paralegal dashboard regularly for suggestions.

**Planned Fix:**
Implement notification system for ARIA Paralegal events.

---

### ISSUE-015: Court Form Access Code Email Not Sent

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** Court Forms

**Description:**
When court forms are generated, the access code is not emailed to the assigned recipient.

**Affected Files:**
- `app/services/court_form.py:586` - TODO: Send notification email with access code

**Workaround:**
Manually communicate access codes to recipients.

**Planned Fix:**
Integrate email service for automatic access code delivery.

---

### ISSUE-016: ClearFund Monthly Totals Not Implemented

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** ClearFund Analytics

**Description:**
The monthly totals array in ClearFund analytics returns empty.

**Affected Files:**
- `app/api/v1/endpoints/clearfund.py:472` - TODO: Implement monthly_totals

**Workaround:**
Calculate monthly totals manually from individual obligations.

**Planned Fix:**
Aggregate obligation data by month for analytics display.

---

### ISSUE-017: KidComs Favorite Contacts Not Calculated

**Status:** 🔴 OPEN
**Severity:** MEDIUM
**Component:** KidComs Analytics

**Description:**
Child dashboard favorite contacts and last session information are not calculated from usage data.

**Affected Files:**
- `app/api/v1/endpoints/kidcoms.py:1779` - TODO: Calculate favorite_contacts
- `app/api/v1/endpoints/kidcoms.py:1783` - TODO: Determine last_session_with

**Workaround:**
None - feature displays empty data.

**Planned Fix:**
Implement call frequency tracking and analysis.

---

## Low Priority Issues

### ISSUE-020: Circle Contact Verification Expiry Not Proper

**Status:** 🔴 OPEN
**Severity:** LOW
**Component:** Circle

**Description:**
Verification expiry for circle contacts is set to current time instead of proper expiry duration.

**Affected Files:**
- `app/api/v1/endpoints/circle.py:420` - TODO: Add proper expiry

**Workaround:**
Manually verify contacts again if expired.

**Planned Fix:**
Set proper 24/48 hour verification expiry windows.

---

### ISSUE-021: Frontend Manual Custody Override Not Implemented

**Status:** 🔴 OPEN
**Severity:** LOW
**Component:** Frontend Dashboard

**Description:**
Backend endpoint for manual custody override from dashboard is not implemented.

**Affected Files:**
- `frontend/app/dashboard/page.tsx:754` - TODO: Implement backend endpoint

**Workaround:**
Use schedule page to modify custody assignments.

**Planned Fix:**
Create quick-override API endpoint for dashboard.

---

### ISSUE-022: Settings Notification API Not Implemented

**Status:** 🔴 OPEN
**Severity:** LOW
**Component:** Frontend Settings

**Description:**
Notification settings page doesn't save preferences to backend.

**Affected Files:**
- `frontend/app/settings/notifications/page.tsx:155` - TODO: Implement actual API call

**Workaround:**
Settings appear to save but are not persisted.

**Planned Fix:**
Implement user preferences API endpoint.

---

### ISSUE-023: Settings Security APIs Not Implemented

**Status:** 🔴 OPEN
**Severity:** LOW
**Component:** Frontend Settings

**Description:**
Security settings (password change, MFA, session management) don't connect to backend.

**Affected Files:**
- `frontend/app/settings/security/page.tsx:107,133,147` - TODO: Implement actual API call

**Workaround:**
Use Supabase dashboard for password reset; MFA not available.

**Planned Fix:**
Implement security management API endpoints.

---

### ISSUE-024: Children Admin/Court Verification Missing

**Status:** 🔴 OPEN
**Severity:** LOW
**Component:** Children Endpoint

**Description:**
Admin and court role verification not implemented for sensitive child operations.

**Affected Files:**
- `app/api/v1/endpoints/children.py:537,557` - TODO: Add admin/court role verification

**Workaround:**
Role verification performed at middleware level only.

**Planned Fix:**
Add endpoint-level role verification for sensitive operations.

---

## Planned Improvements (TODOs)

### Development TODOs

These are tracked improvements that don't impact current functionality:

| Location | Description | Priority |
|----------|-------------|----------|
| `agreement.py:562` | Upload PDF to storage | MEDIUM |
| `time_block.py:526` | Expand recurring blocks | MEDIUM |
| `email.py:448` | Integrate SendGrid | HIGH |
| `aria_agreement.py:151` | Query children names | LOW |
| `court.py:3369` | Implement form logic | MEDIUM |

### Test Suite TODOs

Pending test implementations:

| Location | Description | Status |
|----------|-------------|--------|
| `test_health_checks.py:29` | Database model import | DEFERRED |
| `test_health_checks.py:82` | Redis client tests | DEFERRED |
| `test_health_checks.py:131` | Supabase client tests | DEFERRED |
| `test_health_checks.py:152` | Anthropic client tests | DEFERRED |
| `test_security.py:78` | Full integration test | DEFERRED |

### Seed Data TODOs

| Location | Description | Status |
|----------|-------------|--------|
| `seed_test_data.py:487` | MyTimeCollection family_file_id | PENDING |

---

## Feature Limitations

### ARIA Sentiment Analysis

| Limitation | Description | Impact |
|------------|-------------|--------|
| Three-tier fallback | Claude → OpenAI → Regex | Degraded analysis in fallback |
| Rate limits | 100 requests/minute | May throttle high-volume users |
| Context window | 4000 tokens per message | Very long messages truncated |
| Language support | English only | Non-English messages not analyzed |

### KidComs Video Calling

| Limitation | Description | Impact |
|------------|-------------|--------|
| Recording duration | 60 minutes max | Long calls need restart |
| Participant limit | 2 participants per call | Group calls not supported |
| Browser support | Chrome/Firefox/Safari | Some mobile browsers unsupported |
| Bandwidth requirement | 1.5 Mbps minimum | Poor quality on slow connections |

### ClearFund Financial Tracking

| Limitation | Description | Impact |
|------------|-------------|--------|
| Currency | USD only | International users unsupported |
| Payment integration | Not connected to Stripe | Manual payment recording only |
| Receipt storage | URL-based only | No file upload |
| Split calculations | Fixed percentages | Dynamic splits require new obligation |

### Schedule/TimeBridge

| Limitation | Description | Impact |
|------------|-------------|--------|
| Recurrence rules | Limited iCal support | Complex patterns may not work |
| Timezone handling | UTC storage | Timezone conversion on client |
| Calendar sync | Not implemented | Manual entry only |
| Conflict detection | Basic overlap check | Complex conflicts not detected |

### Court Portal

| Limitation | Description | Impact |
|------------|-------------|--------|
| Court types | Family court only | Other court types unsupported |
| Filing integration | Not connected | Forms require manual filing |
| Jurisdiction | US only | State-specific forms for CA, FL, TX |
| Signature capture | Electronic only | Wet signatures not supported |

---

## Known Workarounds

### Workaround W-001: Manual Email Notifications

**Issue:** Email notifications not sent
**Workaround:**
1. Enable browser notifications for the application
2. Check dashboard daily for updates
3. Use messaging for time-sensitive communication
4. Set phone reminders for scheduled exchanges

### Workaround W-002: PDF Agreement Storage

**Issue:** PDFs not uploaded to storage
**Workaround:**
1. Generate PDF via API
2. Download immediately from response
3. Store locally or in personal cloud
4. Share via email if needed

### Workaround W-003: Circle Invitations

**Issue:** Invite emails not sent
**Workaround:**
1. Create invitation in system
2. Copy invite link manually
3. Send via text/email/messaging app
4. Confirm verification in person if needed

### Workaround W-004: KidComs Call Coordination

**Issue:** Call notifications not sent
**Workaround:**
1. Schedule calls in advance via messaging
2. Send confirmation message before calling
3. Use in-app messaging to alert
4. Establish regular call schedules

### Workaround W-005: Recurring Time Blocks

**Issue:** Recurring blocks not expanded
**Workaround:**
1. Create individual time block events
2. Use bulk creation if available
3. Copy events manually for each occurrence
4. Use external calendar with sync

---

## Browser Compatibility

### Fully Supported

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 90+ | Recommended |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support |
| Edge | 90+ | Full support |

### Partially Supported

| Browser | Version | Limitations |
|---------|---------|-------------|
| Chrome | 80-89 | Video quality reduced |
| Firefox | 78-87 | WebRTC issues |
| Safari | 13 | No video calling |

### Not Supported

| Browser | Reason |
|---------|--------|
| Internet Explorer | End of life |
| Opera Mini | Limited JavaScript |
| UC Browser | WebRTC unsupported |

### Known Browser Issues

| Browser | Issue | Status |
|---------|-------|--------|
| Safari iOS | Video autoplay blocked | WONT FIX (OS limitation) |
| Firefox Private | IndexedDB errors | Workaround available |
| Chrome Mobile | Notification permission | User action required |

---

## Mobile Considerations

### Responsive Design Issues

| Page | Issue | Status |
|------|-------|--------|
| Agreement Builder | Long forms difficult | 🟡 IN PROGRESS |
| Court Forms | PDF preview small | 🔴 OPEN |
| Dashboard | Cards overflow | ✅ FIXED |

### Mobile-Specific Features

| Feature | Status | Notes |
|---------|--------|-------|
| Push notifications | 🔵 DEFERRED | Requires native app |
| Camera access | ✅ WORKING | For receipts/documents |
| GPS for exchanges | ✅ WORKING | Browser permission required |
| Offline mode | ❌ NOT AVAILABLE | Requires PWA implementation |

### Performance on Mobile

| Device Class | Performance | Notes |
|--------------|-------------|-------|
| High-end (iPhone 12+, Pixel 5+) | Excellent | All features work |
| Mid-range | Good | Video may buffer |
| Low-end | Fair | Reduce video quality |

---

## Issue Reporting

### How to Report Issues

1. **Check this document first** for known issues
2. **Search existing issues** in the issue tracker
3. **Gather information:**
   - Browser and version
   - Device type
   - Steps to reproduce
   - Error messages (screenshots)
   - Request ID (if available)

### Report Template

```markdown
## Issue Title

**Severity:** [CRITICAL/HIGH/MEDIUM/LOW]
**Browser:** [Chrome 100, iOS Safari 15, etc.]
**Device:** [Desktop, iPhone 14, Pixel 7, etc.]

### Description
Clear description of the issue

### Steps to Reproduce
1. Go to...
2. Click on...
3. Observe error...

### Expected Behavior
What should happen

### Actual Behavior
What actually happens

### Error Message/Screenshot
[Include if available]

### Request ID
[From error response if available]
```

### Contact

- **GitHub Issues:** [repository issues link]
- **Support Email:** support@commonground.app
- **Status Page:** status.commonground.app

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-10 | Initial documentation |

---

*Last Updated: January 10, 2026*
*Document Version: 1.0.0*
