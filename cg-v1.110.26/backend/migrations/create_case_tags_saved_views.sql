-- Phase 2: Case Tags & Saved Views
-- Run in Supabase SQL editor

-- Case tags
CREATE TABLE IF NOT EXISTS case_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL,
  tag VARCHAR(100) NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_case_tags_case ON case_tags(case_id);
CREATE INDEX IF NOT EXISTS idx_case_tags_tag ON case_tags(tag);

-- Saved filter views for professionals
CREATE TABLE IF NOT EXISTS professional_saved_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  view_type VARCHAR(50) DEFAULT 'cases',
  filters JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_views_professional ON professional_saved_views(professional_id);

-- Seed default system views (non-professional-specific, used as templates)
-- These are handled in the frontend as static quickfilters
