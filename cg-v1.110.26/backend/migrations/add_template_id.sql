-- ARIA Intake Template System Migration
-- Adds template_id column to intake_sessions table
-- Date: 2026-02-18

-- Add template_id column
ALTER TABLE intake_sessions
ADD COLUMN IF NOT EXISTS template_id VARCHAR(50) DEFAULT 'comprehensive-custody';

-- Add comment for documentation
COMMENT ON COLUMN intake_sessions.template_id IS 'Which intake template drives this session (e.g. comprehensive-custody, child-support, modification)';

-- Backfill existing sessions with default template
UPDATE intake_sessions
SET template_id = 'comprehensive-custody'
WHERE template_id IS NULL;

-- Create index for filtering by template
CREATE INDEX IF NOT EXISTS idx_intake_sessions_template_id
ON intake_sessions (template_id);
