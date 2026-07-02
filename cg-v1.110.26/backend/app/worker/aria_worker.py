"""
ARIA Worker Process (Simulated Render Worker)
Polls `aria_jobs` table for pending tasks and executes LLM inference.
"""

import os
import sys
import asyncio
import json
import logging
from sqlalchemy import text

# Add project root to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("aria_worker")

# Initialize Sentry for the worker process
sentry_dsn = os.environ.get("SENTRY_DSN")
if sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=os.environ.get("ENVIRONMENT", "production"),
        release=f"commonground-worker@v1",
        traces_sample_rate=0.5,
        integrations=[SqlalchemyIntegration()],
        send_default_pii=False,
    )

# Import the inference service
from app.services.aria_inference import analyze_message_with_llm


def _max_retries() -> int:
    try:
        return int(os.environ.get("ARIA_JOB_MAX_RETRIES", "3"))
    except ValueError:
        return 3


async def run_worker():
    # Load DB URL similar to schema script
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        env_path = os.path.join(os.getcwd(), 'backend', '.env')
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    if line.startswith('DATABASE_URL='):
                        database_url = line.split('=', 1)[1].strip().strip('"').strip("'")
                        break

    if not database_url:
        logger.error("DATABASE_URL missing. Worker cannot start.")
        return

    from app.core.database import create_app_engine
    engine = create_app_engine(database_url, app_name="commonground_aria_worker")

    max_retries = _max_retries()
    logger.info("ARIA Worker started. Polling for jobs (max_retries=%d)...", max_retries)

    while True:
        async with engine.begin() as conn:
            # Find pending jobs OR failed jobs whose backoff window has
            # elapsed (next_attempt_at). FOR UPDATE SKIP LOCKED lets
            # multiple workers partition the queue safely.
            result = await conn.execute(text("""
                SELECT id, message_id, message_text, context,
                       COALESCE(retry_count, 0) as retry_count
                FROM aria_jobs
                WHERE status = 'pending'
                   OR (
                       status = 'failed'
                       AND COALESCE(retry_count, 0) < :max_retries
                       AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
                   )
                ORDER BY
                    CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
                    created_at ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            """), {"max_retries": max_retries})
            job = result.first()

            if not job:
                # No jobs, sleep and continue
                await asyncio.sleep(2)
                continue

            logger.info("Processing job %s (msg %s)...", job.id, job.message_id)

            try:
                # Update status to processing
                await conn.execute(text("""
                    UPDATE aria_jobs SET status = 'processing', updated_at = NOW() WHERE id = :id
                """), {"id": job.id})

                # RUN INFERENCE (Synchronous LLM call wrapped in thread execution if needed,
                # but for this script blocking is acceptable as it's a dedicated worker)
                # In production we'd use run_in_executor

                context_list = json.loads(job.context) if job.context else []

                # --- LLM CALL ---
                if isinstance(context_list, dict) and context_list.get("type") == "image":
                    # Vision Analysis
                    from app.services.aria_inference import analyze_image_with_llm
                    logger.info("Analyzing image for job %s...", job.id)
                    analysis = analyze_image_with_llm(str(job.message_id), context_list.get("image_url"))
                    model_used = "gpt-4o"
                else:
                    # Text Analysis
                    analysis = analyze_message_with_llm(str(job.message_id), job.message_text, context_list)
                    model_used = "gpt-4o-mini"
                # ----------------

                # Insert Result into aria_events
                await conn.execute(text("""
                    INSERT INTO aria_events (
                        job_id, message_id, classification_source, model_version,
                        toxicity_score, severity_level, labels,
                        action_taken, intervention_text, explanation,
                        user_id, family_file_id, content_type, context_data,
                        original_content
                    ) VALUES (
                        :job_id, :msg_id, 'llm', :model_ver,
                        :score, 'computed_later', :labels,
                        :action, :explanation, :explanation,
                        :uid, :ff_id, :ctype, :ctx_data,
                        :orig_content
                    )
                """), {
                    "job_id": job.id,
                    "msg_id": job.message_id,
                    "model_ver": model_used,
                    "score": analysis.get("severity", 0.0),
                    "labels": json.dumps(analysis.get("labels", [])),
                    "action": analysis.get("action", "ALLOW"),
                    "explanation": analysis.get("explanation", ""),
                    "uid": context_list.get("user_id") if isinstance(context_list, dict) else None,
                    "ff_id": context_list.get("family_file_id") if isinstance(context_list, dict) else None,
                    "ctype": context_list.get("type", "text") if isinstance(context_list, dict) else "text",
                    "ctx_data": None,
                    "orig_content": job.message_text
                })

                # Mark Job Complete
                await conn.execute(text("""
                    UPDATE aria_jobs SET status = 'completed', processed_at = NOW() WHERE id = :id
                """), {"id": job.id})

                logger.info("Job %s completed. Action: %s", job.id, analysis.get('action'))

            except Exception as e:
                # Report to Sentry
                try:
                    import sentry_sdk as _sentry
                    _sentry.set_context("aria_job", {"job_id": str(job.id)})
                    _sentry.capture_exception(e)
                except Exception:
                    pass

                retry_count = getattr(job, 'retry_count', 0) or 0
                new_retry = retry_count + 1
                if new_retry >= max_retries:
                    # Max retries exceeded — move to dead letter. Flagged as its
                    # own Sentry event (distinct from the per-attempt
                    # capture_exception above) so dead-lettered jobs can be
                    # alerted on / filtered separately from transient retries.
                    logger.error("Job %s dead-lettered after %d attempts: %s", job.id, new_retry, e)
                    try:
                        import sentry_sdk as _sentry
                        _sentry.capture_message(
                            f"ARIA job dead-lettered after {new_retry} attempts: {e}",
                            level="error",
                            tags={"aria_job_dead_letter": "true"},
                        )
                    except Exception:
                        pass
                    await conn.execute(text("""
                        UPDATE aria_jobs SET status = 'dead_letter', error_message = :err,
                               retry_count = :retry WHERE id = :id
                    """), {"id": job.id, "err": str(e), "retry": new_retry})
                else:
                    # Mark as failed with exponential backoff: 30s, 60s, 120s...
                    # so a degraded LLM provider isn't hammered with immediate
                    # re-picks of the same job.
                    logger.warning("Job %s failed (attempt %d/%d): %s", job.id, new_retry, max_retries, e)
                    await conn.execute(text("""
                        UPDATE aria_jobs SET status = 'failed', error_message = :err,
                               retry_count = :retry,
                               next_attempt_at = NOW() + (interval '30 seconds' * power(2, :backoff))
                        WHERE id = :id
                    """), {"id": job.id, "err": str(e), "retry": new_retry, "backoff": retry_count})

        # Small sleep between loops
        await asyncio.sleep(0.5)

if __name__ == "__main__":
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        logger.info("Worker stopped.")
