# Working with Claude - Prompt Guide for Non-Coders

A practical guide for getting the best results from Claude when building and maintaining CommonGround.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Creating New Features](#creating-new-features)
3. [Debugging & Fixing Errors](#debugging--fixing-errors)
4. [Code Review & Quality Checks](#code-review--quality-checks)
5. [When Things Go Wrong](#when-things-go-wrong)
6. [Manual Checks You Can Do](#manual-checks-you-can-do)
7. [Token-Saving Tips](#token-saving-tips)
8. [Common Scenarios](#common-scenarios)

---

## Quick Reference

### The Golden Rules

1. **Be specific** - Tell me exactly what you want, not how to code it
2. **Give context** - Mention the feature, page, or component name
3. **Share errors** - Copy/paste the full error message
4. **One thing at a time** - Break big tasks into smaller requests
5. **Tell me the outcome** - Describe what should happen, not the implementation

### Power Words That Help

| Word | What It Does |
|------|--------------|
| "Fix" | I'll find and repair the problem |
| "Add" | I'll create something new |
| "Update" | I'll modify existing code |
| "Check" | I'll review without changing |
| "Explain" | I'll describe what's happening |
| "Debug" | I'll investigate an issue |
| "Test" | I'll verify something works |

---

## Creating New Features

### Template: New Feature Request

```
Add [FEATURE NAME] to [LOCATION/PAGE]

What it should do:
- [Behavior 1]
- [Behavior 2]
- [Behavior 3]

Similar to: [Reference existing feature if applicable]

Should work on: [desktop/mobile/both]
```

### Examples

**Good prompt:**
```
Add a "Mark as Urgent" button to expense requests in ClearFund

What it should do:
- Show a red flag icon next to urgent expenses
- Send a notification to the other parent
- Urgent items appear at top of the list

Similar to: The flagging system in messages
```

**Bad prompt:**
```
Make expenses better
```

### For UI/Design Changes

```
Update the [COMPONENT] design:
- Change [specific element] to [new style]
- Make it look like [reference]
- Keep the existing functionality
```

**Example:**
```
Update the custody status card on the dashboard:
- Make the progress bar thicker
- Add the child's photo next to their name
- Use the sage green color for "with me" status
```

### For Backend/API Features

```
Create an endpoint for [PURPOSE]

Input needed: [what data goes in]
Output expected: [what should come back]
Who can access: [parents/children/circle contacts/court]
```

**Example:**
```
Create an endpoint for getting a child's weekly screen time

Input needed: child_id, week_start_date
Output expected: total minutes, breakdown by day, comparison to last week
Who can access: both parents
```

---

## Debugging & Fixing Errors

### Template: Error Report

```
Error on [PAGE/FEATURE]

What I did:
1. [Step 1]
2. [Step 2]
3. [Step 3]

What happened: [Describe the error]

Error message:
[Paste the full error here]

Expected: [What should have happened]
```

### Examples

**Frontend Error:**
```
Error on the KidComs video call page

What I did:
1. Clicked "Start Call" with Emma
2. Camera permission granted
3. Page shows spinning loader forever

What happened: Call never connects, stuck on loading

Error message (from browser console):
TypeError: Cannot read property 'join' of undefined at DailyCall.tsx:142

Expected: Video call should start and show both participants
```

**Backend Error:**
```
Error when creating a new expense

What I did:
1. Went to ClearFund > Add Expense
2. Filled in amount: $150, category: Medical
3. Clicked Submit

What happened: Red error toast appeared

Error message:
422 Unprocessable Entity: {"detail": "child_id is required"}

Expected: Expense should be created and appear in the list
```

### Quick Debug Prompts

| Situation | Prompt |
|-----------|--------|
| Page won't load | "Debug why [page] shows a blank screen" |
| Button doesn't work | "Fix the [button name] button on [page] - clicking does nothing" |
| Data not showing | "The [component] isn't displaying [data type] - check the API connection" |
| Wrong data | "[Feature] is showing [wrong thing] instead of [right thing]" |
| Slow performance | "The [page/feature] is very slow - find out why" |

---

## Code Review & Quality Checks

### Before Deploying

```
Review the changes we just made for:
- Bugs or errors
- Security issues
- Missing error handling
- Mobile responsiveness
```

### Full System Check

```
Check [area] for issues:
- Backend: [specific service or endpoint]
- Frontend: [specific page or component]
- Look for: [errors/security/performance/all]
```

### Examples

**Quick check:**
```
Check the KidComs video calling for any obvious bugs before we deploy
```

**Thorough review:**
```
Do a full review of the My Circle feature:
- Check all API endpoints work correctly
- Verify permissions are enforced
- Test the invite flow end-to-end
- Look for any security issues
```

### Testing Prompts

```
Test the [feature] by:
1. [Scenario 1 to test]
2. [Scenario 2 to test]
3. [Edge case to check]

Tell me what works and what doesn't
```

---

## When Things Go Wrong

### When I Get Stuck or Fail

**Prompt to reset:**
```
Let's try a different approach. The previous attempt didn't work because [reason].

Start fresh and [describe what you need]
```

**Prompt for simpler solution:**
```
That solution is too complex. Give me the simplest possible fix for [problem]
```

**Prompt to break it down:**
```
Break this into smaller steps. What's the first thing we need to fix?
```

### When I Can't Access Files

**If I can't read a file:**
```
I'll paste the file contents here:

[Paste the file content]

Now [what you need done with it]
```

**If I can't run commands:**
```
Run this command and tell me the output:
[command I suggested]

Then I'll tell you what to do next
```

### When Changes Don't Work

```
The fix didn't work. Here's what's happening now:

Before: [what was happening]
After your change: [what's happening now]
New error (if any): [paste error]

Try again with a different approach
```

### Recovery Prompts

| Problem | Prompt |
|---------|--------|
| Made things worse | "Undo the last change and try something else" |
| Lost track | "Summarize what we've done and what's left" |
| Going in circles | "Stop. What's the root cause of this issue?" |
| Too complicated | "Simplify. What's the minimum change needed?" |

---

## Manual Checks You Can Do

### Browser Console Errors (Frontend)

1. Open your browser (Chrome recommended)
2. Go to the page with the issue
3. Press `F12` or right-click > "Inspect"
4. Click the "Console" tab
5. Look for red error messages
6. Copy and paste them to me

**Tell me:**
```
Browser console shows these errors on [page]:

[Paste red error messages]
```

### Network Requests (API Issues)

1. Open browser dev tools (`F12`)
2. Click "Network" tab
3. Reproduce the issue
4. Look for red requests (failed)
5. Click the failed request
6. Copy the response

**Tell me:**
```
API request to [endpoint] failed:

Status: [number like 400, 500]
Response: [paste the response body]
```

### Check if Backend is Running

**Mac Terminal:**
```bash
curl http://localhost:8000/health
```

**Tell me:**
```
Health check returned: [paste response]
```

Or: "Health check failed - connection refused"

### Check if Frontend is Running

1. Go to http://localhost:3000 in browser
2. Does the page load?

**Tell me:**
- "Frontend loads but [specific issue]"
- "Frontend shows blank page"
- "Frontend shows error: [error text]"

### Check Recent Git Changes

```bash
git log --oneline -10
git status
```

**Tell me:**
```
Recent commits:
[paste output]

Current status:
[paste output]
```

---

## Token-Saving Tips

### Do This (Efficient)

| Instead of... | Say this... |
|---------------|-------------|
| Long explanation of problem | "Fix [specific error] on [page]" |
| Asking how to do something | "Do [thing] for me" |
| Multiple questions | One focused request |
| Vague descriptions | Exact file/component names |

### Efficient Prompt Patterns

**For quick fixes:**
```
Fix: [one-line description]
File: [filename if known]
Error: [paste error]
```

**For small additions:**
```
Add [thing] to [location]. Make it [behavior].
```

**For updates:**
```
Change [current behavior] to [new behavior] in [location]
```

### When to Start a New Conversation

Start fresh when:
- Switching to a completely different feature
- The conversation is getting long (50+ messages)
- We've been going in circles on an issue
- You want to reset context

### Keep Me Focused

```
Only fix [specific thing]. Don't change anything else.
```

```
Quick fix only - no refactoring or improvements.
```

---

## Common Scenarios

### Scenario 1: Something Broke After an Update

```
[Feature] stopped working after recent changes.

It was working: [when/what version]
Now it shows: [current behavior/error]
Last thing changed: [if you know]

Find and fix the regression.
```

### Scenario 2: New Feature Request from User Feedback

```
Users are asking for [feature].

Use case: [why they need it]
Where it should go: [page/location]
Priority: [high/medium/low]

Design and implement this feature.
```

### Scenario 3: Performance Issue

```
[Page/feature] is slow.

How slow: [seconds to load, or description]
When it's slow: [always / specific conditions]
What data: [how much data is involved]

Find the bottleneck and fix it.
```

### Scenario 4: Mobile Not Working

```
[Feature] doesn't work on mobile.

Device: [iPhone/Android/both]
Browser: [Safari/Chrome]
What happens: [description]
Works on desktop: [yes/no]

Fix the mobile version.
```

### Scenario 5: Integration Issue

```
[Feature A] and [Feature B] aren't working together.

Expected: [how they should interact]
Actual: [what's happening]
Error: [if any]

Fix the integration.
```

### Scenario 6: Deploy Preparation

```
We're ready to deploy. Do a final check:

1. Run the build and fix any errors
2. Check for console warnings
3. Verify all API endpoints respond
4. Test on mobile viewport
5. List any issues found
```

### Scenario 7: Documentation Needed

```
Document [feature/system] for:
- How it works
- API endpoints involved
- Configuration options
- Common issues and solutions

Put it in docs/[appropriate folder]
```

---

## Emergency Prompts

### Site is Down

```
URGENT: Production site is down.

Error showing: [what users see]
When it started: [time]
Recent deploys: [yes/no, when]

Diagnose and fix immediately.
```

### Data Issue

```
URGENT: Data problem detected.

What's wrong: [missing/corrupted/wrong data]
Affected: [which users/cases]
When noticed: [time]

Investigate without making changes first.
```

### Security Concern

```
URGENT: Possible security issue.

What happened: [description]
Who reported: [user/system/you noticed]
Potential impact: [what could be affected]

Investigate and advise on immediate steps.
```

---

## Templates to Copy/Paste

### New Feature
```
Add [FEATURE] to [LOCATION]

Should do:
-
-
-

Works like: [similar feature]
```

### Bug Fix
```
Fix:
Page:
Error:

Steps to reproduce:
1.
2.
3.
```

### Quick Task
```
[ACTION] the [THING] in [LOCATION]
```

### Code Review
```
Review [FILE/FEATURE] for [bugs/security/performance]
```

### Investigation
```
Why is [THING] doing [BEHAVIOR]? Find the cause.
```

---

## Our Project-Specific Tips

### CommonGround File Locations

| What | Where |
|------|-------|
| Frontend pages | `frontend/app/[page-name]/page.tsx` |
| Frontend components | `frontend/components/` |
| API endpoints | `backend/app/api/v1/endpoints/` |
| Business logic | `backend/app/services/` |
| Database models | `backend/app/models/` |

### Commonly Referenced Features

- **ARIA** - AI message analysis (`services/aria.py`)
- **KidComs** - Video calling (`endpoints/kidcoms.py`)
- **ClearFund** - Expense tracking (`endpoints/clearfund.py`)
- **My Circle** - Contact management (`endpoints/circle.py`)
- **Family File** - Case/children management (`endpoints/family_files.py`)

### Commands You'll Use Often

```bash
# Start backend
cd backend && uvicorn app.main:app --reload

# Start frontend
cd frontend && npm run dev

# Check git status
git status

# See recent changes
git log --oneline -10

# Run backend tests
cd backend && pytest

# Build frontend (check for errors)
cd frontend && npm run build
```

---

## Final Tips

1. **Trust the process** - If I suggest something, try it before asking why
2. **Paste full errors** - Partial errors make debugging harder
3. **Be patient with debugging** - Sometimes we need 2-3 attempts
4. **Tell me outcomes** - "That worked!" or "Still broken" helps me learn
5. **Ask for explanations** - If you want to understand, just ask "Explain what you did"

**Remember:** You don't need to understand the code to direct me effectively. Focus on **what** you want, and I'll figure out **how** to do it.

---

*Last Updated: January 2025*
