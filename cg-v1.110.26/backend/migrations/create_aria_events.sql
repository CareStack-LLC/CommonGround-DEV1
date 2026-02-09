-- Create table for tracking ARIA security interventions (blocked/flagged content)
-- This table is required for the Partner Dashboard metrics and general safety logging.

DROP TABLE IF EXISTS aria_events;

CREATE TABLE aria_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL, -- May/May NOT reference a message in messages table (if blocked)
    user_id UUID NOT NULL REFERENCES auth.users(id), -- Link to auth user
    family_file_id UUID, -- Link to family file
    content_type TEXT NOT NULL, -- 'text' or 'image'
    classification_source TEXT, -- 'regex', 'llm', 'vision'
    model_version TEXT,
    toxicity_score FLOAT, -- 0.0 to 1.0
    severity_level TEXT, -- 'low', 'medium', 'high', 'severe'
    labels JSONB, -- Array of detected categories
    action_taken TEXT, -- 'flagged', 'blocked', 'warned'
    intervention_text TEXT, -- Text shown to user
    explanation TEXT, -- Detailed reason
    context_data JSONB, -- Additional metadata
    original_content TEXT, -- The toxic content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics query performance
CREATE INDEX IF NOT EXISTS idx_aria_events_user_id ON aria_events(user_id);
CREATE INDEX IF NOT EXISTS idx_aria_events_family_file_id ON aria_events(family_file_id);
CREATE INDEX IF NOT EXISTS idx_aria_events_created_at ON aria_events(created_at);
