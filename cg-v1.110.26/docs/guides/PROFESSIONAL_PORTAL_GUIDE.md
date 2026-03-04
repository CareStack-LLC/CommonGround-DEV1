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
