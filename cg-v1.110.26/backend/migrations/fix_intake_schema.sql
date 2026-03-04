-- Add firm_id column
ALTER TABLE intake_sessions ADD COLUMN IF NOT EXISTS firm_id VARCHAR(36);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_intake_sessions_firms') THEN
        ALTER TABLE intake_sessions ADD CONSTRAINT fk_intake_sessions_firms FOREIGN KEY (firm_id) REFERENCES firms(id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS ix_intake_sessions_firm_id ON intake_sessions(firm_id);

-- Add case_assignment_id column
ALTER TABLE intake_sessions ADD COLUMN IF NOT EXISTS case_assignment_id VARCHAR(36);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_intake_sessions_case_assignments') THEN
        ALTER TABLE intake_sessions ADD CONSTRAINT fk_intake_sessions_case_assignments FOREIGN KEY (case_assignment_id) REFERENCES case_assignments(id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS ix_intake_sessions_case_assignment_id ON intake_sessions(case_assignment_id);

-- Make case_id nullable
ALTER TABLE intake_sessions ALTER COLUMN case_id DROP NOT NULL;

-- Make parent_id nullable
ALTER TABLE intake_sessions ALTER COLUMN parent_id DROP NOT NULL;
