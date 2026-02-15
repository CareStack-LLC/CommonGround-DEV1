-- ARIA V3 Schema

-- 1. ARIA Rules (Dynamic Pattern Configuration)
CREATE TABLE IF NOT EXISTS aria_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    pattern TEXT NOT NULL, -- Regex pattern
    category TEXT NOT NULL, -- 'hate_speech', 'custody_weaponization', etc.
    severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'severe'
    action TEXT NOT NULL, -- 'block', 'flag', 'log_only'
    weight FLOAT DEFAULT 1.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- @@@

-- 2. ARIA Jobs (Async Inference Queue)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aria_job_status') THEN
        CREATE TYPE aria_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
    END IF;
END $$;
-- @@@

CREATE TABLE IF NOT EXISTS aria_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL, -- Link to your existing messages table
    message_text TEXT NOT NULL,
    context JSONB, -- Previous messages or metadata
    status aria_job_status DEFAULT 'pending',
    attempts INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
-- @@@

-- 3. ARIA Events (The "Truth" - Analysis Results)
CREATE TABLE IF NOT EXISTS aria_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES aria_jobs(id),
    message_id UUID NOT NULL,
    
    -- Analysis Results
    classification_source TEXT NOT NULL, -- 'pattern', 'llm', 'hybrid'
    model_version TEXT, -- 'aria-pattern-v2', 'gpt-4o-mini', etc.
    
    -- Scoring
    toxicity_score FLOAT, -- 0.0 to 1.0
    severity_level TEXT, -- 'low', 'medium', 'high', 'severe'
    
    -- Multi-label classification results
    labels JSONB, -- [{"name": "Threat", "score": 0.9}, ...]
    
    -- Outcomes
    action_taken TEXT, -- 'blocked', 'flagged', 'allowed'
    intervention_text TEXT, -- The "Nudge" shown to user
    explanation TEXT, -- Internal or court-facing explanation
    
    -- Analytics & Context
    family_file_id UUID,
    user_id UUID,
    content_type TEXT DEFAULT 'text', -- 'text' or 'image'
    original_content TEXT, -- Captured content (especially for blocked messages)
    context_data JSONB, -- Snapshot of preceding messages for reporting
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- @@@

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_aria_jobs_status ON aria_jobs(status);
-- @@@
CREATE INDEX IF NOT EXISTS idx_aria_events_message_id ON aria_events(message_id);
-- @@@
