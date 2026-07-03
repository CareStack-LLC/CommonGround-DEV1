"""Consolidate startup ALTER TABLE self-heal into a real migration.

These idempotent DDL statements used to run on EVERY app startup (66 no-op
ALTERs under brief locks). Several columns had NO migration and existed
only because this startup block created them — so a fresh DB built from
migrations alone was missing them. This migration makes Alembic the single
source of truth; the startup block is now gated to dev-only. All statements
are IF NOT EXISTS, so this is a no-op on the existing production DB.
"""
from alembic import op

revision = 'startup_ddl_consolidate_20260703'
down_revision = 'announcements_20260619'
branch_labels = None
depends_on = None

_STATEMENTS = [
    'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP',
    'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20)',
    'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMP',
    'ALTER TABLE agreements ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE',
    'ALTER TABLE children ADD COLUMN IF NOT EXISTS coppa_consent_given BOOLEAN DEFAULT FALSE',
    'ALTER TABLE children ADD COLUMN IF NOT EXISTS coppa_consent_at TIMESTAMP',
    'ALTER TABLE children ADD COLUMN IF NOT EXISTS coppa_consent_by VARCHAR(36)',
    "CREATE TABLE IF NOT EXISTS blog_posts ( id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, title VARCHAR(500) NOT NULL, slug VARCHAR(500) UNIQUE NOT NULL, content TEXT NOT NULL, excerpt VARCHAR(1000) NOT NULL, author VARCHAR(200) DEFAULT 'CommonGround Team', category VARCHAR(100) NOT NULL, tags JSONB DEFAULT '[]'::jsonb, featured_image_url VARCHAR(2048), status VARCHAR(20) DEFAULT 'draft', published_at TIMESTAMP, seo_title VARCHAR(200), seo_description VARCHAR(500), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW() )",
    'CREATE TABLE IF NOT EXISTS kidspace_genres ( id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, name VARCHAR(100) NOT NULL, description VARCHAR(500), icon_emoji VARCHAR(10), created_at TIMESTAMP DEFAULT NOW() )',
    'CREATE TABLE IF NOT EXISTS kidspace_authors ( id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, name VARCHAR(200) NOT NULL, bio TEXT, photo_url VARCHAR(2048), is_featured BOOLEAN DEFAULT FALSE, showcase_book_id VARCHAR(36), created_at TIMESTAMP DEFAULT NOW() )',
    'CREATE TABLE IF NOT EXISTS kidspace_movies ( id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, title VARCHAR(300) NOT NULL, description TEXT, duration_minutes INTEGER, age_min INTEGER DEFAULT 3, age_max INTEGER DEFAULT 12, genre_id VARCHAR(36) REFERENCES kidspace_genres(id), poster_url VARCHAR(2048), video_url VARCHAR(2048), trailer_url VARCHAR(2048), is_featured BOOLEAN DEFAULT FALSE, is_visible BOOLEAN DEFAULT TRUE, view_count INTEGER DEFAULT 0, total_minutes_watched INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW() )',
    'CREATE TABLE IF NOT EXISTS kidspace_books ( id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, title VARCHAR(300) NOT NULL, author_id VARCHAR(36) REFERENCES kidspace_authors(id), description TEXT, page_count INTEGER, age_min INTEGER DEFAULT 3, age_max INTEGER DEFAULT 12, genre_id VARCHAR(36) REFERENCES kidspace_genres(id), cover_url VARCHAR(2048), pdf_url VARCHAR(2048), is_featured BOOLEAN DEFAULT FALSE, is_visible BOOLEAN DEFAULT TRUE, read_count INTEGER DEFAULT 0, total_pages_turned INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW() )',
    'ALTER TABLE kidspace_movies ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE',
    'ALTER TABLE kidspace_books ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE',
    'CREATE TABLE IF NOT EXISTS aria_session_memory ( id VARCHAR(36) PRIMARY KEY, sender_id VARCHAR(36) NOT NULL, recipient_id VARCHAR(36) NOT NULL, family_file_id VARCHAR(36) NOT NULL, session_date DATE NOT NULL, summary JSON, recurring_patterns JSON, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW() )',
    'CREATE INDEX IF NOT EXISTS ix_aria_session_memory_sender_id ON aria_session_memory(sender_id)',
    'CREATE INDEX IF NOT EXISTS ix_aria_session_memory_recipient_id ON aria_session_memory(recipient_id)',
    'CREATE INDEX IF NOT EXISTS ix_aria_session_memory_family_file_id ON aria_session_memory(family_file_id)',
    'CREATE INDEX IF NOT EXISTS ix_aria_session_memory_lookup ON aria_session_memory(sender_id, recipient_id, family_file_id, session_date)',
    'CREATE TABLE IF NOT EXISTS aria_sender_baseline ( id VARCHAR(36) PRIMARY KEY, sender_id VARCHAR(36) NOT NULL, family_file_id VARCHAR(36) NOT NULL, session_count INTEGER DEFAULT 0, avg_message_length FLOAT, avg_frequency FLOAT, avg_heat_score FLOAT, sentiment_distribution JSON, std_deviations JSON, baseline_established BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW() )',
    'CREATE INDEX IF NOT EXISTS ix_aria_sender_baseline_sender_id ON aria_sender_baseline(sender_id)',
    'CREATE INDEX IF NOT EXISTS ix_aria_sender_baseline_family_file_id ON aria_sender_baseline(family_file_id)',
    'CREATE UNIQUE INDEX IF NOT EXISTS ix_aria_sender_baseline_lookup ON aria_sender_baseline(sender_id, family_file_id)',
    'ALTER TABLE message_flags ADD COLUMN IF NOT EXISTS time_frequency_flags JSON',
    'ALTER TABLE message_flags ADD COLUMN IF NOT EXISTS recipient_coaching TEXT',
    'ALTER TABLE message_flags ADD COLUMN IF NOT EXISTS reporting_tags JSON',
    "CREATE TABLE IF NOT EXISTS child_support_payment_logs ( id VARCHAR(36) PRIMARY KEY, family_file_id VARCHAR(36) NOT NULL REFERENCES family_files(id) ON DELETE CASCADE, obligation_id VARCHAR(36) REFERENCES obligations(id), logged_by VARCHAR(36) NOT NULL REFERENCES users(id), payer_id VARCHAR(36) NOT NULL REFERENCES users(id), state_code VARCHAR(2) NOT NULL, county VARCHAR(100), amount NUMERIC(10,2) NOT NULL, currency VARCHAR(3) NOT NULL DEFAULT 'USD', payment_date TIMESTAMP NOT NULL, confirmation_number VARCHAR(200), receipt_url VARCHAR(500), payment_channel VARCHAR(20) NOT NULL DEFAULT 'sdu', notes TEXT, status VARCHAR(20) NOT NULL DEFAULT 'logged', contested_by VARCHAR(36) REFERENCES users(id), contested_reason TEXT, contested_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW() )",
    'CREATE INDEX IF NOT EXISTS ix_cs_payment_logs_family_file_id ON child_support_payment_logs(family_file_id)',
    'CREATE INDEX IF NOT EXISTS ix_cs_payment_logs_obligation_id ON child_support_payment_logs(obligation_id)',
    'CREATE INDEX IF NOT EXISTS ix_cs_payment_logs_payment_date ON child_support_payment_logs(payment_date)',
    'CREATE INDEX IF NOT EXISTS ix_cs_payment_logs_status ON child_support_payment_logs(status)',
    'CREATE TABLE IF NOT EXISTS stripe_webhook_events ( id VARCHAR(36) PRIMARY KEY, stripe_event_id VARCHAR(100) NOT NULL UNIQUE, event_type VARCHAR(100) NOT NULL, received_at TIMESTAMP NOT NULL DEFAULT NOW(), processed_at TIMESTAMP, payload JSON, error TEXT )',
    'CREATE INDEX IF NOT EXISTS ix_stripe_webhook_events_event_type ON stripe_webhook_events(event_type)',
    'CREATE TABLE IF NOT EXISTS recurring_parent_cards ( id VARCHAR(36) PRIMARY KEY, family_file_id VARCHAR(36) NOT NULL REFERENCES family_files(id) ON DELETE CASCADE, parent_user_id VARCHAR(36) NOT NULL REFERENCES users(id), stripe_cardholder_id VARCHAR(100), stripe_card_id VARCHAR(100), monthly_limit_amount NUMERIC(10,2) NOT NULL, current_cycle_spent NUMERIC(10,2) NOT NULL DEFAULT 0, allowed_mccs JSON, cycle_start TIMESTAMP NOT NULL, cycle_end TIMESTAMP NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW() )',
    'CREATE INDEX IF NOT EXISTS ix_recurring_parent_cards_family_parent ON recurring_parent_cards(family_file_id, parent_user_id)',
    'CREATE INDEX IF NOT EXISTS ix_recurring_parent_cards_stripe_card_id ON recurring_parent_cards(stripe_card_id)',
    "CREATE TABLE IF NOT EXISTS cs_interventions ( id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE, type VARCHAR(50) NOT NULL, channel VARCHAR(50), notes TEXT, follow_up_date DATE, outcome VARCHAR(50), status VARCHAR(30) NOT NULL DEFAULT 'open', created_by VARCHAR(36) NOT NULL REFERENCES users(id), created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW() )",
    'CREATE INDEX IF NOT EXISTS ix_cs_interventions_user_created ON cs_interventions(user_id, created_at)',
    'CREATE INDEX IF NOT EXISTS ix_cs_interventions_status ON cs_interventions(status)',
    "CREATE TABLE IF NOT EXISTS runbooks ( id VARCHAR(36) PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(), title VARCHAR(200) NOT NULL, category VARCHAR(32) NOT NULL DEFAULT 'incident', summary TEXT, steps_json JSON, notes TEXT, owner_id VARCHAR(36), tags JSON, enabled BOOLEAN NOT NULL DEFAULT TRUE )",
    'CREATE INDEX IF NOT EXISTS ix_runbooks_title ON runbooks(title)',
    'CREATE INDEX IF NOT EXISTS ix_runbooks_category ON runbooks(category)',
    'CREATE TABLE IF NOT EXISTS alert_history ( id VARCHAR(36) PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(), rule_id VARCHAR(36) NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE, rule_name_snapshot VARCHAR(200) NOT NULL, metric_path_snapshot VARCHAR(128) NOT NULL, fired_at TIMESTAMP NOT NULL, fired_value FLOAT NOT NULL, threshold_value_snapshot FLOAT NOT NULL, comparison_snapshot VARCHAR(8) NOT NULL, resolved_at TIMESTAMP, resolved_value FLOAT, notifications_sent JSON )',
    'CREATE INDEX IF NOT EXISTS ix_alert_history_rule_fired ON alert_history(rule_id, fired_at)',
    'CREATE INDEX IF NOT EXISTS ix_alert_history_unresolved ON alert_history(resolved_at)',
    'ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT',
    'ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(20)',
    'ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255)',
    'ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS attachment_size INTEGER',
    'ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS user_action VARCHAR(20)',
    'ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS aria_intervention_level INTEGER',
    'ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS aria_all_categories TEXT',
    'ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS aria_suggested_rewrite TEXT',
    'ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS aria_response_time_ms INTEGER',
    'ALTER TABLE family_files ADD COLUMN IF NOT EXISTS is_dv_case BOOLEAN NOT NULL DEFAULT FALSE',
    "ALTER TABLE family_files ADD COLUMN IF NOT EXISTS aria_sensitivity_level VARCHAR(20) NOT NULL DEFAULT 'standard'",
    "ALTER TABLE family_files ADD COLUMN IF NOT EXISTS aria_mode VARCHAR(20) NOT NULL DEFAULT 'balanced'",
    'ALTER TABLE family_files ADD COLUMN IF NOT EXISTS smart_config JSON',
    'ALTER TABLE family_files ADD COLUMN IF NOT EXISTS agreement_expense_split_ratio VARCHAR(20)',
    'ALTER TABLE family_files ADD COLUMN IF NOT EXISTS agreement_split_parent_a_percentage INTEGER',
    'ALTER TABLE family_files ADD COLUMN IF NOT EXISTS agreement_split_locked BOOLEAN NOT NULL DEFAULT FALSE',
    'ALTER TABLE family_files ADD COLUMN IF NOT EXISTS agreement_split_source_id VARCHAR(36)',
    'ALTER TABLE family_files ADD COLUMN IF NOT EXISTS agreement_split_set_at TIMESTAMP',
    'ALTER TABLE family_files ADD COLUMN IF NOT EXISTS agreement_category_splits JSON',
    'ALTER TABLE family_files ADD COLUMN IF NOT EXISTS default_exchange_location VARCHAR(500)',
    'ALTER TABLE family_files ADD COLUMN IF NOT EXISTS default_exchange_location_type VARCHAR(50)',
]

def upgrade():
    for stmt in _STATEMENTS:
        op.execute(stmt)

def downgrade():
    # Idempotent self-heal columns — no safe automatic drop (data-bearing).
    pass
