-- Create landing_pages table for the superadmin landing page generator
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(200) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  headline VARCHAR(500),
  subheadline TEXT,
  hero_image_url TEXT,
  body_html TEXT,
  cta_text VARCHAR(200) DEFAULT 'Get Started',
  cta_url TEXT DEFAULT 'https://www.find-commonground.com/register',
  target_audience VARCHAR(200),
  status VARCHAR(20) DEFAULT 'draft',
  seo_title VARCHAR(200),
  seo_description VARCHAR(500),
  og_image_url TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(200),
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS ix_landing_pages_status ON landing_pages(status);

-- Also create other missing tables that various superadmin features need

CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  scopes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitored_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id VARCHAR(500) UNIQUE NOT NULL,
  from_email VARCHAR(255),
  to_email VARCHAR(255),
  subject TEXT,
  snippet TEXT,
  body_preview TEXT,
  received_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  is_urgent BOOLEAN DEFAULT false,
  category VARCHAR(100),
  ai_summary TEXT,
  ai_action_needed TEXT,
  ai_draft_reply TEXT,
  labels TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bug_triage_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  days INTEGER DEFAULT 7,
  issues_data JSONB,
  triage_result JSONB,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lead_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  lead_type VARCHAR(20) NOT NULL,
  search_criteria JSONB,
  source VARCHAR(50) DEFAULT 'manual',
  sendgrid_list_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES lead_lists(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  source VARCHAR(50) DEFAULT 'manual',
  status VARCHAR(20) DEFAULT 'new',
  metadata JSONB,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(200),
  converted_user_id UUID,
  converted_at TIMESTAMPTZ,
  sendgrid_contact_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(list_id, email)
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  subject VARCHAR(500),
  from_name VARCHAR(200) DEFAULT 'CommonGround',
  from_email VARCHAR(255),
  html_content TEXT,
  plain_content TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  list_id UUID REFERENCES lead_lists(id),
  sendgrid_campaign_id VARCHAR(100),
  sent_at TIMESTAMPTZ,
  stats JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  subject VARCHAR(500),
  html_content TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);
