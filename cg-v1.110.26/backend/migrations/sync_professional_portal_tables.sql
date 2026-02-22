-- =============================================================================
-- Professional Portal: Consolidated Gap Migration
-- Apply in Supabase SQL Editor or via psql
-- Created: 2026-02-22
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. PROFESSIONAL TASKS
-- =============================================================================
CREATE TABLE IF NOT EXISTS professional_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL,
  case_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_professional ON professional_tasks(professional_id);
CREATE INDEX IF NOT EXISTS idx_tasks_case ON professional_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON professional_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON professional_tasks(completed);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_professional_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_professional_tasks ON professional_tasks;
CREATE TRIGGER trigger_update_professional_tasks
  BEFORE UPDATE ON professional_tasks
  FOR EACH ROW EXECUTE FUNCTION update_professional_tasks_updated_at();

-- =============================================================================
-- 2. CASE TAGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS case_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL,
  tag VARCHAR(100) NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(case_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_case_tags_case ON case_tags(case_id);
CREATE INDEX IF NOT EXISTS idx_case_tags_tag ON case_tags(tag);

-- =============================================================================
-- 3. PROFESSIONAL SAVED VIEWS
-- =============================================================================
CREATE TABLE IF NOT EXISTS professional_saved_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  view_type VARCHAR(50) DEFAULT 'cases',
  filters JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_views_professional ON professional_saved_views(professional_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_default ON professional_saved_views(professional_id, is_default);

-- =============================================================================
-- 4. PROFESSIONAL NOTIFICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS professional_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,           -- intake_pending | access_request | court_event | message | compliance | task_due
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,                     -- deep link to navigate on click
  resource_type VARCHAR(50),           -- intake | case | message | report
  resource_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_professional ON professional_notifications(professional_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON professional_notifications(professional_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON professional_notifications(professional_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON professional_notifications(professional_id, type);

-- =============================================================================
-- 5. PROFESSIONAL NOTIFICATION PREFERENCES
-- =============================================================================
CREATE TABLE IF NOT EXISTS professional_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL UNIQUE,
  -- Per-type preferences stored as JSONB: { "intake_pending": { "email": true, "in_app": true, "push": true, "sms": false }, ... }
  channel_prefs JSONB NOT NULL DEFAULT '{
    "intake_pending":   {"email": true,  "in_app": true,  "push": true,  "sms": false},
    "access_request":  {"email": true,  "in_app": true,  "push": true,  "sms": false},
    "court_event":     {"email": true,  "in_app": true,  "push": true,  "sms": true},
    "message":         {"email": false, "in_app": true,  "push": true,  "sms": false},
    "compliance":      {"email": true,  "in_app": true,  "push": false, "sms": false},
    "task_due":        {"email": false, "in_app": true,  "push": true,  "sms": false}
  }',
  -- Quiet hours (no push/SMS)
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  -- Weekend mode: 'normal' | 'urgent_only' | 'off'
  weekend_mode VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 6. HELP ARTICLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS help_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(50) NOT NULL CHECK (category IN ('getting-started', 'features', 'faqs')),
  title TEXT NOT NULL,
  excerpt TEXT,                        -- Short summary for list view
  content TEXT NOT NULL,              -- Markdown content
  video_url TEXT,                     -- Optional YouTube/Vimeo URL
  read_time_minutes INT DEFAULT 2,
  is_published BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category);
CREATE INDEX IF NOT EXISTS idx_help_articles_published ON help_articles(is_published, category);

-- =============================================================================
-- 7. PROFESSIONAL TOURS COMPLETED
-- =============================================================================
CREATE TABLE IF NOT EXISTS professional_tours_completed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL,
  tour_id VARCHAR(50) NOT NULL,       -- dashboard | intake | cases | reports
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(professional_id, tour_id)
);

CREATE INDEX IF NOT EXISTS idx_tours_professional ON professional_tours_completed(professional_id);

-- =============================================================================
-- 8. PROFESSIONAL ACTIVITY LOG (bonus – used by dashboard feed)
-- =============================================================================
CREATE TABLE IF NOT EXISTS professional_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID,
  firm_id UUID,
  case_id UUID,
  activity_type VARCHAR(50),
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_professional ON professional_activity_log(professional_id);
CREATE INDEX IF NOT EXISTS idx_activity_firm ON professional_activity_log(firm_id);
CREATE INDEX IF NOT EXISTS idx_activity_case ON professional_activity_log(case_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON professional_activity_log(created_at DESC);

-- =============================================================================
-- SEED: Help Articles
-- =============================================================================
INSERT INTO help_articles (category, title, excerpt, content, read_time_minutes, sort_order) VALUES

-- Getting Started
('getting-started', 'Welcome to CommonGround Professional',
 'Learn the basics of the Professional Portal in 5 minutes.',
 E'# Welcome to CommonGround Professional\n\nCommonGround Professional gives attorneys, mediators, and parenting coordinators a unified view of all their family law cases.\n\n## Key Features\n\n- **Dashboard** — Real-time case alerts and upcoming events\n- **Case Management** — Filter, tag, and bulk-manage all assigned cases\n- **ARIA Intake Center** — Send AI-powered intake sessions to clients\n- **Compliance Reports** — Generate court-ready PDF/Excel reports with SHA-256 verification\n- **Messaging** — Secure client and co-professional communications\n\n## Getting Your First Case\n\n1. Complete your professional profile at **Profile → Edit**\n2. Submit your bar license for verification\n3. A client or firm admin will invite you to a case\n4. Accept the invitation on your **Dashboard**\n\n> **Tip:** Complete your profile to appear in the Professional Directory so clients can find you.',
 3, 1),

('getting-started', 'Setting Up Your Professional Profile',
 'Add your credentials, practice areas, and bio to attract clients.',
 E'# Setting Up Your Professional Profile\n\n## Required Fields\n\n- **Full Name** — As it appears on your bar card\n- **Professional Type** — Attorney, Mediator, Parenting Coordinator, etc.\n- **License Number & State** — Required for verification\n- **Bar Number** — For verification workflow\n\n## Recommended Fields\n\n- **Headline** — One-sentence description (e.g., "Family law attorney focused on collaborative divorce")\n- **Bio** — 2-3 paragraphs about your background and philosophy\n- **Practice Areas** — Select all that apply\n- **Languages Spoken**\n- **Hourly Rate / Consultation Fee**\n\n## Visibility\n\nOnce your license is **verified**, toggle **Public Profile** to appear in the Professional Directory.',
 3, 2),

('getting-started', 'Joining or Creating a Firm',
 'Work as a solo professional or join a multi-member firm.',
 E'# Joining or Creating a Firm\n\n## Option A: Join an Existing Firm\n\nAsk your firm admin to invite you via **Firm → Team → Invite Member**. You will receive an email invitation.\n\n## Option B: Create a New Firm\n\n1. Go to **Firm → New Firm**\n2. Enter firm name, address, and contact details\n3. Upload your firm logo (optional)\n4. Set firm visibility (public or private)\n\n## Firm Roles\n\n| Role | Permissions |\n|------|-------------|\n| Owner | Full admin, billing, delete firm |\n| Admin | Invite/remove members, manage cases |\n| Partner | Manage own cases, view firm analytics |\n| Associate | Assigned cases only |\n| Paralegal | Limited read access per case |\n\n> **Tip:** You can belong to multiple firms. Use the firm switcher in the top navigation.',
 4, 3),

-- Features
('features', 'How to Send an ARIA Intake Session',
 'Send clients an AI-powered intake form that extracts data automatically.',
 E'# How to Send an ARIA Intake Session\n\n## What is ARIA Intake?\n\nARIA is CommonGround''s AI paralegal. When you send an intake session, ARIA conducts a conversational interview with your client, extracts structured data, and generates a professional summary for your review.\n\n## Steps\n\n1. Go to **Intake Center**\n2. Click **New Intake**\n3. Enter client name, email, and phone\n4. Select an intake template (Comprehensive Custody, Parenting Plan, Financial Disclosure, etc.)\n5. Click **Send** — Client receives a secure link via email\n\n## After the Client Completes Intake\n\n- Status changes to **Completed**\n- Review the **AI Summary**, **Extracted Data**, and **Transcript**\n- Click **Mark as Reviewed** to close out\n- Click **Convert to Case** to create a new case file\n\n## Requesting Clarification\n\nIf the intake is missing information, click **Request Clarification** to send the client a follow-up question.',
 5, 4),

('features', 'Generating Compliance Reports',
 'Create court-ready PDF and Excel compliance reports with SHA-256 verification.',
 E'# Generating Compliance Reports\n\n## Overview\n\nCompliance reports aggregate exchange, communication, and financial data into a court-ready document with a tamper-proof SHA-256 hash.\n\n## Steps\n\n1. Navigate to a case and open the **Compliance** tab, or go to **Reports** from the main nav\n2. Click **Generate Report**\n3. Select:\n   - **Report type** — Full Compliance, Exchange Only, Communication Only\n   - **Date range** — Last 30 / 90 / 180 / 365 days or custom\n   - **Export format** — PDF or Excel\n4. Enter an optional **signature line** (your name and bar number)\n5. Click **Generate**\n\n## Verifying Report Integrity\n\nEach report shows a **SHA-256 hash**. Courts can use this hash to verify the document has not been altered since generation.\n\n## Download Count Tracking\n\nEvery download is logged. The report detail page shows how many times the file has been downloaded.',
 4, 5),

('features', 'OCR: Importing Court Orders',
 'Upload a court order PDF and let ARIA extract and lock fields automatically.',
 E'# OCR: Importing Court Orders\n\n## Overview\n\nThe OCR feature extracts structured data from scanned California family court forms (FL-300, FL-311, FL-320, FL-340, FL-341, FL-342) and uses it to populate or lock agreement fields.\n\n## Steps\n\n1. Go to **Documents → Upload Court Order**\n2. Select a supported court form PDF\n3. ARIA detects the form type and extracts all fields\n4. Review the extracted data. Correct any low-confidence fields\n5. Click **Approve** — ARIA creates the agreement and **locks all populated fields**\n\n## Field Locks\n\nLocked fields display 🔒 **Locked by Case-[number]**. Parents cannot edit locked fields. You can unlock fields individually (with a reason) or unlock all locks when a new order supersedes the previous one.',
 4, 6),

-- FAQs
('faqs', 'What does my subscription tier include?',
 'Compare Starter, Solo, and Firm plan features.',
 E'# What Does My Subscription Tier Include?\n\n| Feature | Starter | Solo | Firm |\n|---------|---------|------|------|\n| Active Cases | 5 | 20 | Unlimited |\n| Team Members | 1 | 1 | Unlimited |\n| ARIA Intake | Basic templates | All templates | All templates + custom |\n| OCR Court Forms | ✗ | ✓ | ✓ |\n| Compliance Reports | ✗ | ✓ PDF | ✓ PDF + Excel |\n| Firm Analytics | ✗ | ✗ | ✓ |\n| Priority Support | ✗ | ✗ | ✓ |\n\n## Upgrading\n\nGo to **Settings → Subscription** to upgrade your plan.',
 2, 7),

('faqs', 'How does ARIA flag messages?',
 'Understanding ARIA''s safety shield and communication analysis.',
 E'# How Does ARIA Flag Messages?\n\n## What ARIA Monitors\n\nARIA analyzes all inter-parent messages for:\n- **Harassment or threats**\n- **Alienation language**\n- **Coordination violations** (encouraging children to disobey orders)\n- **Financial coercion**\n- **Profanity or hostile tone**\n\n## What Happens When a Message is Flagged\n\n1. ARIA assigns a **severity** (low / medium / high / severe)\n2. The message is tagged with one or more **categories**\n3. Flagged messages appear in the **ARIA Analysis** tab\n4. High-severity flags create dashboard alerts\n\n## Does ARIA Block Messages?\n\nIn **Active Intervention** mode, ARIA can block or rewrite messages before delivery. This is controlled by the professional under **Case → ARIA Controls**.\n\n## Good Faith Score\n\nEach parent receives a **Good Faith Score** (0–100) based on their overall flag rate and severity over 30 days. This score can be included in compliance reports.',
 3, 8)

ON CONFLICT DO NOTHING;

-- =============================================================================
-- DONE
-- =============================================================================
SELECT 
  (SELECT COUNT(*) FROM professional_tasks) as tasks_rows,
  (SELECT COUNT(*) FROM case_tags) as tags_rows,
  (SELECT COUNT(*) FROM professional_saved_views) as saved_views_rows,
  (SELECT COUNT(*) FROM professional_notifications) as notifications_rows,
  (SELECT COUNT(*) FROM professional_notification_preferences) as notif_prefs_rows,
  (SELECT COUNT(*) FROM help_articles) as help_articles_rows,
  (SELECT COUNT(*) FROM professional_tours_completed) as tours_rows;
