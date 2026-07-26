"""
FastAPI application entry point.
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

logger = logging.getLogger(__name__)

# Initialize Sentry before anything else
from app.core.config import settings


def _sentry_before_send(event, hint):
    """Filter, SCRUB, and enrich Sentry error events."""
    # Don't send 404s or rate limit errors to Sentry
    if "exc_info" in hint:
        exc_type, exc_value, _ = hint["exc_info"]
        from fastapi import HTTPException
        if isinstance(exc_value, HTTPException) and exc_value.status_code in (404, 429):
            return None

    # PRIVACY SCRUB: send_default_pii=True lets Sentry capture request context,
    # but on a custody platform the request body can hold message content / PII
    # and the cookies/Authorization header carry auth tokens (incl. the
    # cg_refresh cookie). Strip those — we keep the URL, method, and user id
    # (enough to debug) but never the payload or credentials.
    req = event.get("request")
    if isinstance(req, dict):
        req.pop("data", None)                 # request body
        req.pop("cookies", None)              # includes cg_refresh + session cookies
        headers = req.get("headers")
        if isinstance(headers, dict):
            for h in list(headers):
                if h.lower() in ("authorization", "cookie", "x-loadtest-token"):
                    headers[h] = "[scrubbed]"

    # Tag the event with the platform
    event.setdefault("tags", {})["platform"] = "commonground"
    return event


def _sentry_before_send_transaction(event, hint):
    """Filter noisy transactions (health checks, static assets)."""
    transaction_name = event.get("transaction", "")
    if transaction_name in ("/health", "/", "/health/"):
        return None
    return event


if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    from sentry_sdk.integrations.httpx import HttpxIntegration

    # AI Agent Monitoring — auto-instruments Anthropic + OpenAI calls.
    # PRIVACY: include_prompts=False so Sentry records latency/token-count/model
    # (useful for ARIA debugging) but NOT the prompt/response TEXT. Those prompts
    # are co-parents' and children's actual messages — custody content that must
    # not be stored in a third-party monitoring service.
    _ai_integrations = []
    try:
        from sentry_sdk.integrations.anthropic import AnthropicIntegration
        _ai_integrations.append(AnthropicIntegration(include_prompts=False))
        logger.info("Sentry: Anthropic AI monitoring enabled (prompts NOT captured)")
    except ImportError:
        logger.debug("Sentry: AnthropicIntegration not available (SDK too old?)")

    try:
        from sentry_sdk.integrations.openai import OpenAIIntegration
        _ai_integrations.append(OpenAIIntegration(include_prompts=False))
        logger.info("Sentry: OpenAI AI monitoring enabled (prompts NOT captured)")
    except ImportError:
        logger.debug("Sentry: OpenAIIntegration not available (SDK too old?)")

    # Tie the release to the deployed commit (Render sets RENDER_GIT_COMMIT)
    # so Sentry can attribute errors to specific deploys — enables suspect
    # commits, release health, and regressed-in-release detection. Falls back
    # to the static API version locally.
    _release_sha = os.environ.get("RENDER_GIT_COMMIT", "")[:12]
    _release = (
        f"commonground@{_release_sha}" if _release_sha
        else f"commonground@{settings.API_VERSION}"
    )
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release=_release,

        # ── Traces (Performance Monitoring) ──
        # Sample 30% of transactions in prod, 100% in dev
        traces_sample_rate=0.1 if settings.is_production else 1.0,

        # ── Profiling ──
        # Profile 20% of sampled transactions for CPU/memory insights
        profiles_sample_rate=0.05 if settings.is_production else 0.0,

        # ── Logs (SDK 2.35+) ──
        # Stream Python logs to Sentry Logs (viewable in Explore > Logs)
        _experiments={
            "enable_logs": True,
        },

        # ── Session Tracking ──
        auto_session_tracking=True,

        # ── Integrations ──
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(
                transaction_style="endpoint",
                failed_request_status_codes=[range(400, 600)],
            ),
            SqlalchemyIntegration(),
            LoggingIntegration(
                level=logging.INFO,       # Breadcrumbs from INFO+
                event_level=logging.ERROR, # Sentry events from ERROR+
            ),
            HttpxIntegration(),
            *_ai_integrations,  # Anthropic + OpenAI auto-instrumentation
        ],

        # ── AI Monitoring ──
        # Capture LLM inputs/outputs for ARIA debugging
        # (prompts, responses, token counts, model, latency)
        send_default_pii=True,

        # ── Filtering ──
        before_send=_sentry_before_send,
        before_send_transaction=_sentry_before_send_transaction,
    )
    logger.info(f"Sentry initialized for {settings.ENVIRONMENT} (AI monitoring: {len(_ai_integrations)} providers)")


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.database import init_db, close_db
from app.api.v1.router import api_router
from app.core.rate_limit import RateLimitMiddleware
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info(f"Starting {settings.APP_NAME} ({settings.ENVIRONMENT})")
    logger.info(f"CORS Allowed Origins: {settings.allowed_origins_list}")
    logger.debug(f"CORS Origin Regex: {settings.CORS_ORIGIN_REGEX}")
    if settings.SENDGRID_API_KEY and not settings.EMAIL_ENABLED:
        logger.warning("SENDGRID_API_KEY is set but EMAIL_ENABLED is False — all emails will be silently suppressed")

    # Loudly surface any production-critical secret that is unset, so a feature
    # doesn't silently no-op (payments, recording+safety monitoring, signatures,
    # notifications). Warn-only — we don't hard-fail the deploy.
    if settings.is_production:
        prod_checks = [
            (bool(settings.SIGNING_PRIVATE_KEY_PEM), "SIGNING_PRIVATE_KEY_PEM",
             "e-signatures use an EPHEMERAL key and won't verify across restarts"),
            (bool(getattr(settings, "DAILY_API_KEY", None)), "DAILY_API_KEY",
             "KidSpace call recording AND ARIA call safety-monitoring are DISABLED"),
            (bool(getattr(settings, "DAILY_WEBHOOK_SECRET", None)), "DAILY_WEBHOOK_SECRET",
             "Daily recording/transcription webhooks are rejected"),
            (bool(getattr(settings, "STRIPE_SECRET_KEY", None)), "STRIPE_SECRET_KEY",
             "payments are a no-op (no money moves)"),
            (bool(getattr(settings, "STRIPE_WEBHOOK_SECRET", None)), "STRIPE_WEBHOOK_SECRET",
             "Stripe webhooks can't be verified (subscription state goes stale)"),
            (settings.EMAIL_ENABLED and bool(settings.SENDGRID_API_KEY), "EMAIL (EMAIL_ENABLED + SENDGRID_API_KEY)",
             "transactional emails (resets, invites, reminders) are NOT delivered"),
            (bool(getattr(settings, "VAPID_PRIVATE_KEY", None)) and bool(getattr(settings, "VAPID_PUBLIC_KEY", None)),
             "VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY", "web push notifications silently no-op"),
        ]
        missing = [(name, impact) for ok, name, impact in prod_checks if not ok]
        if missing:
            logger.critical(
                "PROD CONFIG: %d production secret(s) unset — affected features will "
                "silently degrade:", len(missing)
            )
            for name, impact in missing:
                logger.critical("  • %s missing → %s", name, impact)

    if settings.is_development:
        await init_db()  # Auto-create tables in dev
        logger.info("Database tables created")

    # Run safe column migrations (idempotent ALTER TABLE IF NOT EXISTS)
    try:
        from app.core.database import engine
        from sqlalchemy import text
        async with engine.begin() as conn:
            migrations = [
                "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP",
                "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20)",
                "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMP",
                "ALTER TABLE agreements ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE",
                # COPPA consent fields on children table
                "ALTER TABLE children ADD COLUMN IF NOT EXISTS coppa_consent_given BOOLEAN DEFAULT FALSE",
                "ALTER TABLE children ADD COLUMN IF NOT EXISTS coppa_consent_at TIMESTAMP",
                "ALTER TABLE children ADD COLUMN IF NOT EXISTS coppa_consent_by VARCHAR(36)",
                # Blog posts table
                """CREATE TABLE IF NOT EXISTS blog_posts (
                    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    title VARCHAR(500) NOT NULL, slug VARCHAR(500) UNIQUE NOT NULL,
                    content TEXT NOT NULL, excerpt VARCHAR(1000) NOT NULL,
                    author VARCHAR(200) DEFAULT 'CommonGround Team', category VARCHAR(100) NOT NULL,
                    tags JSONB DEFAULT '[]'::jsonb, featured_image_url VARCHAR(2048),
                    status VARCHAR(20) DEFAULT 'draft', published_at TIMESTAMP,
                    seo_title VARCHAR(200), seo_description VARCHAR(500),
                    created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
                )""",
                # KidSpace genres (must be before movies/books for FK)
                """CREATE TABLE IF NOT EXISTS kidspace_genres (
                    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    name VARCHAR(100) NOT NULL, description VARCHAR(500),
                    icon_emoji VARCHAR(10), created_at TIMESTAMP DEFAULT NOW()
                )""",
                # KidSpace authors (must be before books for FK)
                """CREATE TABLE IF NOT EXISTS kidspace_authors (
                    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    name VARCHAR(200) NOT NULL, bio TEXT, photo_url VARCHAR(2048),
                    is_featured BOOLEAN DEFAULT FALSE, showcase_book_id VARCHAR(36),
                    created_at TIMESTAMP DEFAULT NOW()
                )""",
                # KidSpace movies
                """CREATE TABLE IF NOT EXISTS kidspace_movies (
                    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    title VARCHAR(300) NOT NULL, description TEXT,
                    duration_minutes INTEGER, age_min INTEGER DEFAULT 3, age_max INTEGER DEFAULT 12,
                    genre_id VARCHAR(36) REFERENCES kidspace_genres(id),
                    poster_url VARCHAR(2048), video_url VARCHAR(2048), trailer_url VARCHAR(2048),
                    is_featured BOOLEAN DEFAULT FALSE, is_visible BOOLEAN DEFAULT TRUE,
                    view_count INTEGER DEFAULT 0, total_minutes_watched INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW()
                )""",
                # KidSpace books
                """CREATE TABLE IF NOT EXISTS kidspace_books (
                    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    title VARCHAR(300) NOT NULL,
                    author_id VARCHAR(36) REFERENCES kidspace_authors(id),
                    description TEXT, page_count INTEGER,
                    age_min INTEGER DEFAULT 3, age_max INTEGER DEFAULT 12,
                    genre_id VARCHAR(36) REFERENCES kidspace_genres(id),
                    cover_url VARCHAR(2048), pdf_url VARCHAR(2048),
                    is_featured BOOLEAN DEFAULT FALSE, is_visible BOOLEAN DEFAULT TRUE,
                    read_count INTEGER DEFAULT 0, total_pages_turned INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW()
                )""",
                # KidSpace content approval columns
                "ALTER TABLE kidspace_movies ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE",
                "ALTER TABLE kidspace_books ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE",
                # ARIA V2 Phase 3 + 4 — backfill for deployments that
                # stamped past the merge without running the real upgrade
                # (symptom: POST /messages/ 500s with UndefinedTableError on
                # aria_sender_baseline / aria_session_memory).
                """CREATE TABLE IF NOT EXISTS aria_session_memory (
                    id VARCHAR(36) PRIMARY KEY,
                    sender_id VARCHAR(36) NOT NULL,
                    recipient_id VARCHAR(36) NOT NULL,
                    family_file_id VARCHAR(36) NOT NULL,
                    session_date DATE NOT NULL,
                    summary JSON, recurring_patterns JSON,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )""",
                "CREATE INDEX IF NOT EXISTS ix_aria_session_memory_sender_id ON aria_session_memory(sender_id)",
                "CREATE INDEX IF NOT EXISTS ix_aria_session_memory_recipient_id ON aria_session_memory(recipient_id)",
                "CREATE INDEX IF NOT EXISTS ix_aria_session_memory_family_file_id ON aria_session_memory(family_file_id)",
                "CREATE INDEX IF NOT EXISTS ix_aria_session_memory_lookup ON aria_session_memory(sender_id, recipient_id, family_file_id, session_date)",
                """CREATE TABLE IF NOT EXISTS aria_sender_baseline (
                    id VARCHAR(36) PRIMARY KEY,
                    sender_id VARCHAR(36) NOT NULL,
                    family_file_id VARCHAR(36) NOT NULL,
                    session_count INTEGER DEFAULT 0,
                    avg_message_length FLOAT, avg_frequency FLOAT, avg_heat_score FLOAT,
                    sentiment_distribution JSON, std_deviations JSON,
                    baseline_established BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )""",
                "CREATE INDEX IF NOT EXISTS ix_aria_sender_baseline_sender_id ON aria_sender_baseline(sender_id)",
                "CREATE INDEX IF NOT EXISTS ix_aria_sender_baseline_family_file_id ON aria_sender_baseline(family_file_id)",
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_aria_sender_baseline_lookup ON aria_sender_baseline(sender_id, family_file_id)",
                "ALTER TABLE message_flags ADD COLUMN IF NOT EXISTS time_frequency_flags JSON",
                "ALTER TABLE message_flags ADD COLUMN IF NOT EXISTS recipient_coaching TEXT",
                "ALTER TABLE message_flags ADD COLUMN IF NOT EXISTS reporting_tags JSON",
                # Wave 4-Alt + CS interventions + alerts/runbooks — same
                # self-heal story as ARIA V2. These migrations are on the
                # alembic chain but on this deploy the 8-head merge stamped
                # past them without running the DDL. Idempotent so re-runs
                # are safe.
                """CREATE TABLE IF NOT EXISTS child_support_payment_logs (
                    id VARCHAR(36) PRIMARY KEY,
                    family_file_id VARCHAR(36) NOT NULL REFERENCES family_files(id) ON DELETE CASCADE,
                    obligation_id VARCHAR(36) REFERENCES obligations(id),
                    logged_by VARCHAR(36) NOT NULL REFERENCES users(id),
                    payer_id VARCHAR(36) NOT NULL REFERENCES users(id),
                    state_code VARCHAR(2) NOT NULL,
                    county VARCHAR(100),
                    amount NUMERIC(10,2) NOT NULL,
                    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
                    payment_date TIMESTAMP NOT NULL,
                    confirmation_number VARCHAR(200),
                    receipt_url VARCHAR(500),
                    payment_channel VARCHAR(20) NOT NULL DEFAULT 'sdu',
                    notes TEXT,
                    status VARCHAR(20) NOT NULL DEFAULT 'logged',
                    contested_by VARCHAR(36) REFERENCES users(id),
                    contested_reason TEXT,
                    contested_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )""",
                "CREATE INDEX IF NOT EXISTS ix_cs_payment_logs_family_file_id ON child_support_payment_logs(family_file_id)",
                "CREATE INDEX IF NOT EXISTS ix_cs_payment_logs_obligation_id ON child_support_payment_logs(obligation_id)",
                "CREATE INDEX IF NOT EXISTS ix_cs_payment_logs_payment_date ON child_support_payment_logs(payment_date)",
                "CREATE INDEX IF NOT EXISTS ix_cs_payment_logs_status ON child_support_payment_logs(status)",
                """CREATE TABLE IF NOT EXISTS stripe_webhook_events (
                    id VARCHAR(36) PRIMARY KEY,
                    stripe_event_id VARCHAR(100) NOT NULL UNIQUE,
                    event_type VARCHAR(100) NOT NULL,
                    received_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    processed_at TIMESTAMP,
                    payload JSON,
                    error TEXT
                )""",
                "CREATE INDEX IF NOT EXISTS ix_stripe_webhook_events_event_type ON stripe_webhook_events(event_type)",
                """CREATE TABLE IF NOT EXISTS recurring_parent_cards (
                    id VARCHAR(36) PRIMARY KEY,
                    family_file_id VARCHAR(36) NOT NULL REFERENCES family_files(id) ON DELETE CASCADE,
                    parent_user_id VARCHAR(36) NOT NULL REFERENCES users(id),
                    stripe_cardholder_id VARCHAR(100),
                    stripe_card_id VARCHAR(100),
                    monthly_limit_amount NUMERIC(10,2) NOT NULL,
                    current_cycle_spent NUMERIC(10,2) NOT NULL DEFAULT 0,
                    allowed_mccs JSON,
                    cycle_start TIMESTAMP NOT NULL,
                    cycle_end TIMESTAMP NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )""",
                "CREATE INDEX IF NOT EXISTS ix_recurring_parent_cards_family_parent ON recurring_parent_cards(family_file_id, parent_user_id)",
                "CREATE INDEX IF NOT EXISTS ix_recurring_parent_cards_stripe_card_id ON recurring_parent_cards(stripe_card_id)",
                """CREATE TABLE IF NOT EXISTS cs_interventions (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    type VARCHAR(50) NOT NULL,
                    channel VARCHAR(50),
                    notes TEXT,
                    follow_up_date DATE,
                    outcome VARCHAR(50),
                    status VARCHAR(30) NOT NULL DEFAULT 'open',
                    created_by VARCHAR(36) NOT NULL REFERENCES users(id),
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )""",
                "CREATE INDEX IF NOT EXISTS ix_cs_interventions_user_created ON cs_interventions(user_id, created_at)",
                "CREATE INDEX IF NOT EXISTS ix_cs_interventions_status ON cs_interventions(status)",
                """CREATE TABLE IF NOT EXISTS runbooks (
                    id VARCHAR(36) PRIMARY KEY,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    title VARCHAR(200) NOT NULL,
                    category VARCHAR(32) NOT NULL DEFAULT 'incident',
                    summary TEXT,
                    steps_json JSON,
                    notes TEXT,
                    owner_id VARCHAR(36),
                    tags JSON,
                    enabled BOOLEAN NOT NULL DEFAULT TRUE
                )""",
                "CREATE INDEX IF NOT EXISTS ix_runbooks_title ON runbooks(title)",
                "CREATE INDEX IF NOT EXISTS ix_runbooks_category ON runbooks(category)",
                """CREATE TABLE IF NOT EXISTS alert_history (
                    id VARCHAR(36) PRIMARY KEY,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    rule_id VARCHAR(36) NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
                    rule_name_snapshot VARCHAR(200) NOT NULL,
                    metric_path_snapshot VARCHAR(128) NOT NULL,
                    fired_at TIMESTAMP NOT NULL,
                    fired_value FLOAT NOT NULL,
                    threshold_value_snapshot FLOAT NOT NULL,
                    comparison_snapshot VARCHAR(8) NOT NULL,
                    resolved_at TIMESTAMP,
                    resolved_value FLOAT,
                    notifications_sent JSON
                )""",
                "CREATE INDEX IF NOT EXISTS ix_alert_history_rule_fired ON alert_history(rule_id, fired_at)",
                "CREATE INDEX IF NOT EXISTS ix_alert_history_unresolved ON alert_history(resolved_at)",
                # circle_messages model columns that were missing from prod.
                # The SQLAlchemy model defines attachment_* + the v2 ARIA
                # intervention-tracking fields (user_action, intervention_level,
                # etc.) but prod was stamped past the migrations without
                # running the ADD COLUMN DDL. Any report touching
                # CircleMessage (kidspace_communication) 500's with
                # "column does not exist" until these are present. All
                # additions are idempotent.
                "ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT",
                "ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(20)",
                "ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255)",
                "ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS attachment_size INTEGER",
                "ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS user_action VARCHAR(20)",
                "ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS aria_intervention_level INTEGER",
                "ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS aria_all_categories TEXT",
                "ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS aria_suggested_rewrite TEXT",
                "ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS aria_response_time_ms INTEGER",
                # family_files model columns that are NOT in the
                # a1b2c3d4e5f6 create-table migration and either have no
                # follow-up migration at all OR live in a migration whose
                # down_revision is None (g1a2p3_gap) so alembic never
                # chained it in. Result: `SELECT family_files.*` from the
                # ORM fails with UndefinedColumnError on the parent-side
                # dashboard (GET /family-files/) — which was the exact
                # 500 the user flagged. All additions are idempotent.
                #
                # Safety case: DV-mode + granular ARIA sensitivity (from
                # the orphaned g1a2p3 migration).
                "ALTER TABLE family_files ADD COLUMN IF NOT EXISTS is_dv_case BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE family_files ADD COLUMN IF NOT EXISTS aria_sensitivity_level VARCHAR(20) NOT NULL DEFAULT 'standard'",
                # Model-defined ARIA mode + smart config (no migration).
                "ALTER TABLE family_files ADD COLUMN IF NOT EXISTS aria_mode VARCHAR(20) NOT NULL DEFAULT 'balanced'",
                "ALTER TABLE family_files ADD COLUMN IF NOT EXISTS smart_config JSON",
                # Agreement activation — expense split configuration
                # (model adds these to persist the agreed-on split when
                # an Agreement is activated; no migration ships them).
                "ALTER TABLE family_files ADD COLUMN IF NOT EXISTS agreement_expense_split_ratio VARCHAR(20)",
                "ALTER TABLE family_files ADD COLUMN IF NOT EXISTS agreement_split_parent_a_percentage INTEGER",
                "ALTER TABLE family_files ADD COLUMN IF NOT EXISTS agreement_split_locked BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE family_files ADD COLUMN IF NOT EXISTS agreement_split_source_id VARCHAR(36)",
                "ALTER TABLE family_files ADD COLUMN IF NOT EXISTS agreement_split_set_at TIMESTAMP",
                "ALTER TABLE family_files ADD COLUMN IF NOT EXISTS agreement_category_splits JSON",
                # Default exchange location (from Agreement activation).
                "ALTER TABLE family_files ADD COLUMN IF NOT EXISTS default_exchange_location VARCHAR(500)",
                "ALTER TABLE family_files ADD COLUMN IF NOT EXISTS default_exchange_location_type VARCHAR(50)",
                # Ensure admin accounts are properly flagged (idempotent).
                # thomas.wilform@gmail.com is the real primary admin —
                # was missing from the hardcoded set until now, so it
                # was slipping through "exclude admin from metrics"
                # filters that relied on the is_admin flag being set.
                """UPDATE users SET is_admin = true, admin_role = 'super_admin'
                   WHERE email IN (
                       'thomas.wilform@gmail.com',
                       'thomas@carestack.us',
                       'founders@commonground.family',
                       'commonground.notify@gmail.com'
                   )
                   AND is_admin = false""",
            ]
            # Schema is now owned by Alembic (the startup_ddl_consolidate
            # migration). This idempotent self-heal used to run ~66 no-op
            # ALTERs on EVERY prod startup under brief ACCESS EXCLUSIVE locks
            # (terms_accepted_at alone ran 565x / 479s cumulative). Gate the
            # DDL to dev — where developers may not run migrations — while the
            # trailing admin-flag data fix stays idempotent across all envs.
            ddl_stmts = [s for s in migrations if not s.strip().upper().startswith("UPDATE")]
            data_stmts = [s for s in migrations if s.strip().upper().startswith("UPDATE")]
            if settings.is_development:
                for sql in ddl_stmts:
                    await conn.execute(text(sql))
                logger.info("Startup column self-heal applied (dev): %d statements", len(ddl_stmts))
            for sql in data_stmts:
                await conn.execute(text(sql))
    except Exception as e:
        logger.warning(f"Startup migration warning (may already exist): {e}")

    # Initialize Redis-backed services for multi-instance support
    from app.core.websocket import manager as ws_manager
    await ws_manager.init_redis()
    await ws_manager.start_subscriber()
    from app.core.rate_limit import _redis_limiter
    await _redis_limiter.init()

    # Background scheduler — sweeps abandoned KidComs / Daily.co rooms (Wave 1 A8)
    start_scheduler(app)

    yield
    # Shutdown
    logger.info("Shutting down...")
    stop_scheduler()
    await ws_manager.shutdown()
    try:
        from app.core.redis_client import close_redis
        await close_redis()
    except Exception:
        pass
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    description="Co-Parenting Operating System API",
    version=settings.API_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Middleware
# Allow all Vercel preview URLs and configured origins
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    # sentry-trace + baggage let the frontend's Sentry trace propagate to the API
    # so a user's browser transaction links to the backend spans (distributed
    # tracing across the www→api subdomains).
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-Request-ID", "sentry-trace", "baggage"],
)

# Rate limiting — re-enabled for production scaling
app.add_middleware(RateLimitMiddleware)

# Request ID tracing + canonical log lines (wide events)
from app.middleware.request_id import RequestIDMiddleware
app.add_middleware(RequestIDMiddleware)

# Activity tracking: update User.last_active on authenticated requests
from app.middleware.activity import ActivityTrackingMiddleware
app.add_middleware(ActivityTrackingMiddleware)


# ---------------------------------------------------------------------------
# Unified exception handling.
#
# Every error response carries a `reference` (the request id, also on the
# X-Request-ID header, the Sentry event, and the canonical log line) so the
# user-facing message and the full server-side detail are always joinable.
# Handlers also set CORS headers themselves, since uncaught exceptions bypass
# the CORS middleware (otherwise the browser masks the real error).
# ---------------------------------------------------------------------------
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback

from app.core.error_responses import build_error_response, get_request_reference


def _capture_to_sentry(request: Request, exc: Exception, *, reference: str) -> None:
    """Report an exception to Sentry with request context attached.

    The reference is set both as a tag (already done by RequestIDMiddleware,
    repeated here defensively) and echoed in the message so it is greppable
    from the issue title.
    """
    if not settings.SENTRY_DSN:
        return
    try:
        import sentry_sdk
        with sentry_sdk.new_scope() as scope:
            scope.set_tag("request_id", reference)
            scope.set_context(
                "request",
                {
                    "method": request.method,
                    "path": request.url.path,
                    "query": str(request.url.query),
                    "reference": reference,
                },
            )
            sentry_sdk.capture_exception(exc)
    except Exception:  # never let error reporting raise
        pass


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """500 handler for anything uncaught.

    Hides internals in production but ALWAYS returns a reference the user can
    quote to support, so a 500 is diagnosable instead of a dead end.
    """
    reference = get_request_reference(request)
    tb_str = traceback.format_exc()
    logger.error(
        "Unhandled exception [ref=%s] %s: %s\n%s",
        reference, type(exc).__name__, exc, tb_str,
    )
    _capture_to_sentry(request, exc, reference=reference)

    if settings.is_production:
        message = (
            "Something went wrong on our end. Our team has been alerted. "
            f"If this keeps happening, quote reference {reference} to support."
        )
        debug = None
    else:
        message = f"{type(exc).__name__}: {exc}"
        debug = {
            "type": type(exc).__name__,
            "message": str(exc),
            "traceback": tb_str.splitlines()[-12:],
        }

    return build_error_response(
        request,
        status_code=500,
        message=message,
        error_type="internal_error",
        debug=debug,
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Deliberate HTTP errors (404/403/409/...).

    These `detail` messages are author-written and safe to show, so we preserve
    them verbatim and just attach the reference + a stable machine `type`.
    """
    reference = get_request_reference(request)
    detail = exc.detail if isinstance(exc.detail, str) else "Request could not be completed."

    # 5xx raised as HTTPException still deserves a Sentry breadcrumb.
    if exc.status_code >= 500:
        logger.error("HTTP %s [ref=%s]: %s", exc.status_code, reference, detail)
        _capture_to_sentry(request, exc, reference=reference)

    type_by_status = {
        400: "bad_request", 401: "unauthorized", 403: "forbidden",
        404: "not_found", 409: "conflict", 422: "unprocessable", 429: "rate_limited",
    }
    return build_error_response(
        request,
        status_code=exc.status_code,
        message=detail,
        error_type=type_by_status.get(exc.status_code, "http_error"),
        extra_headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """422 handler that tells the user EXACTLY which fields were wrong.

    Validation detail is safe and genuinely useful to end users, so we surface a
    clean per-field list plus a readable summary — instead of FastAPI's raw,
    nested default shape.
    """
    reference = get_request_reference(request)
    fields: list[dict] = []
    for err in exc.errors():
        loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
        field = ".".join(loc) if loc else "(request)"
        fields.append({"field": field, "message": err.get("msg", "invalid value")})

    if not fields:
        summary = "The request could not be validated."
    else:
        head = f"{fields[0]['field']}: {fields[0]['message']}"
        summary = f"Validation failed — {head}"
        if len(fields) > 1:
            summary += f" (and {len(fields) - 1} more field{'s' if len(fields) > 2 else ''})"

    logger.info("Validation error [ref=%s] on %s: %s", reference, request.url.path, fields)
    return build_error_response(
        request,
        status_code=422,
        message=summary,
        error_type="validation_error",
        fields=fields,
    )


# Include API router
app.include_router(api_router, prefix=f"/api/{settings.API_VERSION}")

@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "app": settings.APP_NAME,
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "running",
    }


# Health-check state (module-level, per-process):
#  - a short result cache so frequent monitor polls don't hammer Redis/DB
#    (each Redis ping counts against the Upstash command quota), and
#  - throttles so a degraded dependency alerts Sentry at most once per window
#    instead of on every poll.
_HEALTH_CACHE_TTL = 15.0          # seconds to reuse the last deep-check result
_HEALTH_ALERT_THROTTLE = 600.0    # seconds between Sentry alerts per component
_health_cache: dict = {"ts": 0.0, "result": None}
_health_alert_ts: dict = {}       # component -> last-alerted monotonic ts


def _alert_unhealthy(component: str, detail: str) -> None:
    """Fire a throttled Sentry alert when a health dependency is unhealthy.

    Throttled per-component so a monitor polling /health every minute doesn't
    spam Sentry — one alert per _HEALTH_ALERT_THROTTLE window while degraded.
    """
    if not settings.SENTRY_DSN:
        return
    import time as _t
    now = _t.monotonic()
    last = _health_alert_ts.get(component, 0.0)
    if now - last < _HEALTH_ALERT_THROTTLE:
        return
    _health_alert_ts[component] = now
    try:
        import sentry_sdk
        sentry_sdk.capture_message(
            f"Health check: {component} unhealthy — {detail}",
            level="error",
            tags={"health_component": component, "health_status": "degraded"},
        )
    except Exception:
        pass


@app.get("/health")
async def health_check():
    """
    Lightweight health check for monitoring (UptimeRobot, Render, etc.).

    Returns fast — DB and Redis checks are best-effort with short timeouts and a
    short result cache (so frequent polls don't burn the Redis command quota).
    A degraded dependency fires a throttled Sentry alert. Use
    /api/v1/admin/system-status for deep checks.
    """
    import time as _t

    # Serve a cached result if it's fresh — avoids a DB round-trip and a Redis
    # command on every monitor poll.
    now = _t.monotonic()
    cached = _health_cache.get("result")
    if cached is not None and (now - _health_cache["ts"]) < _HEALTH_CACHE_TTL:
        return cached

    checks = {"api": "healthy"}

    # Check database connectivity (with short timeout)
    try:
        from sqlalchemy import text as sa_text
        from app.core.database import engine
        async with engine.connect() as conn:
            await conn.execute(sa_text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = "unhealthy"
        _alert_unhealthy("database", str(e)[:200])

    # Check Redis connectivity. Async client + short timeout so a slow/unreachable
    # Redis can't block the event loop. A raised error here also covers the
    # Upstash "max requests limit exceeded" case (quota exhausted → all commands,
    # incl. PING, are rejected), which correctly reports redis as unhealthy.
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(
            settings.REDIS_URL, socket_timeout=1, socket_connect_timeout=1
        )
        try:
            await r.ping()
            checks["redis"] = "healthy"
        finally:
            await r.aclose()
    except Exception as e:
        checks["redis"] = "unhealthy"
        _alert_unhealthy("redis", str(e)[:200])

    overall = "healthy" if all(v == "healthy" for v in checks.values()) else "degraded"

    result = {"status": overall, "checks": checks}
    _health_cache["ts"] = now
    _health_cache["result"] = result
    return result


# Debug endpoints — only available in development
if settings.is_development:
    from sqlalchemy import text
    from app.core.database import get_db
    from sqlalchemy.ext.asyncio import AsyncSession
    from fastapi import Depends

    @app.get("/debug/cors")
    async def debug_cors():
        """Debug endpoint to check CORS configuration (dev only)."""
        return {
            "allowed_origins_raw": settings.ALLOWED_ORIGINS,
            "allowed_origins_list": settings.allowed_origins_list,
            "regex": settings.CORS_ORIGIN_REGEX
        }

    @app.get("/debug/db")
    async def debug_db(db: AsyncSession = Depends(get_db)):
        """Debug endpoint to check database connection (dev only)."""
        try:
            raw_url = settings.DATABASE_URL
            if "@" in raw_url:
                masked_url = raw_url.split("://")[0] + "://***:***@" + raw_url.split("@")[1]
            else:
                masked_url = "Malformed or missing DATABASE_URL"

            result = await db.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users';"))
            users_exists = result.scalar() == 1
            path_result = await db.execute(text("SHOW search_path;"))
            search_path = path_result.scalar()

            return {
                "database_url_host": masked_url,
                "public_users_table_exists": users_exists,
                "search_path": search_path
            }
        except Exception as e:
            return {"error": "Database check failed", "type": type(e).__name__}

    @app.get("/debug/email-config")
    async def debug_email_config():
        """Debug endpoint to check email configuration (dev only)."""
        return {
            "email_enabled": settings.EMAIL_ENABLED,
            "from_email": settings.FROM_EMAIL,
            "from_name": settings.FROM_NAME,
            "sendgrid_key_set": bool(settings.SENDGRID_API_KEY),
        }

    @app.post("/debug/test-email")
    async def test_email(to_email: str):
        """Send a test email to verify SendGrid configuration (dev only)."""
        from app.services.email import email_service
        if not email_service.enabled:
            return {"success": False, "error": "Email is disabled"}
        try:
            result = await email_service._send_email(
                to_email=to_email,
                subject="CommonGround Test Email",
                html_body="<p>SendGrid test from CommonGround dev environment.</p>"
            )
            return {"success": result}
        except Exception as e:
            return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.is_development,
        log_level="debug" if settings.DEBUG else "info",
    )
