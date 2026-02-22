-- Phase 1: Professional Tasks & Activity Log
-- Run this in your Supabase SQL editor or DB console

-- Tasks table
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

-- Activity log table
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

-- Automatically update updated_at on task changes
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
  FOR EACH ROW
  EXECUTE FUNCTION update_professional_tasks_updated_at();
