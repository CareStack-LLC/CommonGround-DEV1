"""
ARIA Worker Process (Simulated Render Worker)
Polls `aria_jobs` table for pending tasks and executes LLM inference.
"""

import os
import sys
import asyncio
import json
import time
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Add project root to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

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
        print("❌ DATABASE_URL missing. Worker cannot start.")
        return

    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")

    # Connect with prepared statements disabled for Supabase
    engine = create_async_engine(
        database_url, 
        echo=False, 
        connect_args={"statement_cache_size": 0}
    )

    print("🚀 ARIA Worker Started. Polling for jobs...")

    while True:
        async with engine.begin() as conn:
            # 1. Fetch pending job (FOR UPDATE SKIP LOCKED pattern is best, 
            # but simple update returning is fine for this simulated MVP)
            
            # Find pending jobs OR failed jobs eligible for retry (max 3 attempts)
            result = await conn.execute(text("""
                SELECT id, message_id, message_text, context,
                       COALESCE(retry_count, 0) as retry_count
                FROM aria_jobs
                WHERE status = 'pending'
                   OR (status = 'failed' AND COALESCE(retry_count, 0) < 3)
                ORDER BY
                    CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
                    created_at ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            """))
            job = result.first()

            if not job:
                # No jobs, sleep and continue
                await asyncio.sleep(2) 
                continue

            print(f"⚡ Processing Job {job.id} (Msg: {job.message_id})...")

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
                    print(f"👁️ Analyzing Image for Job {job.id}...")
                    analysis = analyze_image_with_llm(str(job.message_id), context_list.get("image_url"))
                    model_used = "gpt-4o"
                else:
                    # Text Analysis
                    analysis = analyze_message_with_llm(str(job.message_id), job.message_text, context_list)
                    model_used = "gpt-4o-mini"
                # ----------------
                
                # Insert Result into aria_events
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
                
                print(f"✅ Job {job.id} Completed. Action: {analysis.get('action')}")

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
                if new_retry >= 3:
                    # Max retries exceeded — move to dead letter
                    print(f"Job {job.id} dead-lettered after {new_retry} attempts: {e}")
                    await conn.execute(text("""
                        UPDATE aria_jobs SET status = 'dead_letter', error_message = :err,
                               retry_count = :retry WHERE id = :id
                    """), {"id": job.id, "err": str(e), "retry": new_retry})
                else:
                    # Mark as failed with incremented retry count — will be picked up again
                    print(f"❌ Job {job.id} Failed (attempt {new_retry}/3): {e}")
                    await conn.execute(text("""
                        UPDATE aria_jobs SET status = 'failed', error_message = :err,
                               retry_count = :retry WHERE id = :id
                    """), {"id": job.id, "err": str(e), "retry": new_retry})

        # Small sleep between loops
        await asyncio.sleep(0.5)

if __name__ == "__main__":
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        print("\n🛑 Worker stopped.")
