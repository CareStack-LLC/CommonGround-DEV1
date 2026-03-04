-- Intake Sessions: Add client contact info columns
-- Date: 2026-02-22

ALTER TABLE intake_sessions
ADD COLUMN IF NOT EXISTS client_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS client_email VARCHAR(200),
ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS client_notes TEXT;

-- Index for searching by email
CREATE INDEX IF NOT EXISTS idx_intake_sessions_client_email
ON intake_sessions (client_email);

-- Backfill client_name and client_email from the system message for existing sessions
-- The system message format is: "Intake session for {name}. Email: {email}."
-- NOTE: uses json_ (not jsonb_) because the messages column is JSON type
UPDATE intake_sessions
SET
    client_name = NULLIF(TRIM(SUBSTRING(
        (messages->0->>'content'),
        POSITION('Intake session for ' IN (messages->0->>'content')) + LENGTH('Intake session for '),
        POSITION('. Email:' IN (messages->0->>'content'))
        - POSITION('Intake session for ' IN (messages->0->>'content'))
        - LENGTH('Intake session for ')
    )), ''),
    client_email = NULLIF(TRIM(SUBSTRING(
        (messages->0->>'content'),
        POSITION('Email: ' IN (messages->0->>'content')) + LENGTH('Email: '),
        POSITION('. Phone:' IN (messages->0->>'content'))
        - POSITION('Email: ' IN (messages->0->>'content'))
        - LENGTH('Email: ')
    )), '')
WHERE
    messages IS NOT NULL
    AND json_array_length(messages) > 0
    AND messages->0->>'role' = 'system'
    AND client_name IS NULL;
