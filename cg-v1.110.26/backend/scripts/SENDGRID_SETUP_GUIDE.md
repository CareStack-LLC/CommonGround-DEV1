# SendGrid Marketing Setup Guide — CommonGround

## Step 1: Run the Setup Script (Creates Lists + Custom Fields)

```bash
# From the backend directory
cd backend
export SENDGRID_API_KEY=SG.your_key_here
python scripts/setup_sendgrid_lists.py
```

This creates 5 contact lists and 3 custom fields via the API, then prints the IDs.
Copy the printed env vars into your `.env` file and Render dashboard.

---

## Step 2: Set Up Your 1 Automation (Newsletter Welcome Series)

SendGrid Free gives you **1 automation**. Use it for the Newsletter Welcome Series.

### In SendGrid Dashboard:

1. Go to **Marketing → Automations → Create an Automation**
2. Choose **Custom Automation**
3. **Entry criteria**: Contact joins list → select **"Newsletter Subscribers"**
4. Add 3 emails:

### Email 1: Welcome (sends immediately)
- **Subject**: Welcome to the CommonGround community!
- **Content**:

```
Hi {{first_name | default: "there"}},

Thanks for subscribing! CommonGround is an AI-powered co-parenting platform that helps families communicate better, track agreements, and co-parent without conflict.

Here's what makes us different:

• ARIA — AI that coaches your tone before you send, so every message lands the way you intend
• TimeBridge — Automated custody schedules that update themselves
• ClearFund — Transparent expense tracking both parents can trust

We'll send you practical co-parenting tips and product updates — never spam.

Talk soon,
The CommonGround Team

[Visit CommonGround](https://www.find-commonground.com)
```

### Email 2: Feature Spotlight (Day 3)
- **Wait**: 3 days
- **Subject**: 3 tools that change how families co-parent
- **Content**:

```
Hi {{first_name | default: "there"}},

Whether you're navigating a fresh start or a high-conflict situation, these three tools can help:

🛡️ ARIA Messaging
Every message gets a tone check before it's sent. No censoring — just a gentle heads-up when something might be misread.

📅 TimeBridge Scheduling
Set your custody schedule once. TimeBridge handles holidays, swaps, and reminders automatically.

💰 ClearFund Expenses
Track shared expenses with receipts and auto-split calculations. No more "I already paid for that" arguments.

All three are included in the free Web Starter plan.

[Start Free](https://www.find-commonground.com/register)
```

### Email 3: Invite to Try (Day 7)
- **Wait**: 4 days (7 total)
- **Subject**: Ready to try a calmer way?
- **Content**:

```
Hi {{first_name | default: "there"}},

Thousands of co-parenting conversations happen every day that don't need to be hard.

CommonGround's free tier includes:
✓ ARIA-assisted messaging (unlimited)
✓ Shared custody calendar
✓ ClearFund expense tracking
✓ No ads, no message caps

No credit card required. Set up in 2 minutes.

[Get Started Free](https://www.find-commonground.com/register)

P.S. Our first 50 early adopters get 30% off paid plans for life. Spots are going fast.

[Claim Your Spot](https://www.find-commonground.com/for-moms)
```

5. **Set the automation to LIVE**

---

## Step 3: Create Useful Segments

Segments let you target specific groups for Single Sends (one-time campaigns).

### In SendGrid Dashboard:

Go to **Marketing → Contacts → Segments → Create Segment**

### Segment 1: "Early Adopters — Moms"
- **Condition**: Contact is in list "Early Adopters"
- **AND** signup_source contains "for_moms"

### Segment 2: "Early Adopters — Dads"
- **Condition**: Contact is in list "Early Adopters"
- **AND** signup_source contains "for_dads"

### Segment 3: "Professional Attorneys"
- **Condition**: Contact is in list "Professional Leads"
- **AND** inquiry_type equals "attorney"

### Segment 4: "All Marketing Contacts"
- **Condition**: Contact is in list "Early Adopters"
- **OR** Contact is in list "Newsletter Subscribers"
- **OR** Contact is in list "Contact Form Leads"
- **OR** Contact is in list "Professional Leads"

### Segment 5: "High-Intent Leads"
- **Condition**: Contact is in list "Early Adopters"
- **OR** Contact is in list "Professional Leads"

---

## Step 4: Send Your First Single Send (One-Time Campaign)

Single Sends are unlimited on the free tier. Use them for announcements, product launches, or monthly newsletters.

### In SendGrid Dashboard:

1. Go to **Marketing → Single Sends → Create Single Send**
2. Choose a Design Editor template (or Code Editor for HTML)
3. **From**: noreply@find-commonground.com
4. **To**: Select a list or segment (e.g., "All Marketing Contacts")
5. Design your email
6. **Review** and send (or schedule for later)

### Campaign Ideas:
- **Monthly Newsletter**: Co-parenting tip + feature update + blog highlight
- **Product Launch**: New feature announcement to all contacts
- **Early Adopter Update**: Progress update to early adopters only
- **Professional Webinar Invite**: Demo invite to professional leads

---

## Your Complete SendGrid Architecture

```
CONTACT LISTS (5)
├── Early Adopters .......... Landing page signups (for-moms, for-dads, etc.)
├── Newsletter Subscribers .. Footer + blog + pricing email signups
├── Contact Form Leads ..... Contact page form submissions
├── Professional Leads ..... /professionals demo request form
└── Registered Users ....... Anyone who creates an account

CUSTOM FIELDS (3)
├── signup_source ........... Which page/form they came from
├── user_type ............... parent, professional, admin
└── inquiry_type ............ general, support, professional, attorney, etc.

AUTOMATION (1)
└── Newsletter Welcome Series (3 emails over 7 days)

TRANSACTIONAL EMAILS (via API — unlimited)
├── Welcome email ........... On registration
├── Getting started ......... After profile setup
├── Case invitations ........ When invited to a case
├── Contact confirmations ... After contact form submit
├── Early adopter welcome ... After early adopter signup
├── Password reset .......... On request
└── 30+ more notification types
```

---

## Daily Email Budget (100/day on Free)

Your 100/day budget is for **transactional emails only** (sent via API).
Marketing emails (Single Sends, Automations) use a separate quota.

At your current scale, 100/day is plenty. When you need more:
- **Essentials plan**: $19.95/mo for 50,000 emails/mo
- Upgrade at: SendGrid Dashboard → Settings → Account Details → Your Plan
