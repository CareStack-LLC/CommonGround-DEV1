"""Alert rule evaluator — runs on schedule, checks each enabled rule, and
fires notifications on state transitions.

Runs every 5 minutes via APScheduler (see services/scheduler.py for the
registration). A single invocation:

  1. Loads all AlertRule rows where enabled=TRUE.
  2. For each, resolves the metric via alert_metric_registry.resolve_metric.
  3. Compares to threshold using the stored comparison op.
  4. If the rule transitions OK → firing: creates AlertHistory, fires
     push + email notifications.
  5. If it transitions firing → OK: stamps resolved_at on the open history
     row, fires a "recovered" notification (best-effort).

Notifications are non-blocking: a single SendGrid or push failure does not
stop the evaluator from processing subsequent rules.
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal as async_session_factory
from app.models.alert_rule import AlertHistory, AlertRule, VALID_COMPARISONS
from app.models.runbook import Runbook
from app.services.alert_metric_registry import resolve_metric

logger = logging.getLogger(__name__)


def _eval_comparison(value: float, op: str, threshold: float) -> bool:
    """Return True if `value op threshold` is satisfied."""
    if op == "gt":
        return value > threshold
    if op == "lt":
        return value < threshold
    if op == "gte":
        return value >= threshold
    if op == "lte":
        return value <= threshold
    if op == "eq":
        return value == threshold
    return False


async def _runbook_link(db: AsyncSession, runbook_id: Optional[str]) -> Optional[str]:
    """Build the UI link for a runbook, if attached."""
    if not runbook_id:
        return None
    rb_q = await db.execute(select(Runbook).where(Runbook.id == runbook_id))
    rb = rb_q.scalar_one_or_none()
    if not rb:
        return None
    return f"/superadmin/runbook?id={rb.id}"


async def _send_notifications(
    db: AsyncSession,
    rule: AlertRule,
    value: float,
    event: str,  # "firing" | "recovered"
) -> dict:
    """Send push + email notifications for a rule transition. Returns a
    result dict summarizing what was sent / which parts failed."""
    result: dict = {"push": [], "email": [], "errors": []}

    title = f"[{event.upper()}] {rule.name}"
    body = (
        f"{rule.metric_path} = {value} "
        f"({rule.comparison} {rule.threshold_value})."
    )
    runbook_url = await _runbook_link(db, rule.runbook_id)
    if runbook_url:
        body += f" Runbook: {runbook_url}"

    # ── Push notifications to all admins who have subscriptions
    if rule.notify_push:
        try:
            from app.models.user import User
            from app.services.push import push_service
            admins_q = await db.execute(
                select(User.id).where(User.is_admin.is_(True)).where(User.is_active.is_(True))
            )
            admin_ids = [row[0] for row in admins_q]
            for uid in admin_ids:
                try:
                    sent = await push_service.send_notification(
                        db, user_id=uid, title=title, body=body,
                        url="/superadmin/system-health",
                        tag=f"alert:{rule.id}",
                    )
                    if sent:
                        result["push"].append(uid)
                except Exception as e:
                    result["errors"].append(f"push {uid}: {e}")
        except Exception as e:
            result["errors"].append(f"push lookup: {e}")

    # ── Email notifications via SendGrid (reuses the generic notification
    # template from app.services.email.email_service)
    if rule.notify_emails:
        try:
            from app.services.email import email_service
            for addr in rule.notify_emails:
                try:
                    ok = await email_service.send_generic_notification(
                        to_email=addr,
                        to_name="Admin",
                        subject=title,
                        message=body,
                        cta_url=(
                            f"{_frontend_url()}/superadmin/system-health"
                            if runbook_url is None
                            else f"{_frontend_url()}{runbook_url}"
                        ),
                        cta_text="View in superadmin",
                        title=title,
                    )
                    if ok:
                        result["email"].append(addr)
                    else:
                        result["errors"].append(f"email {addr}: send returned False")
                except Exception as e:
                    result["errors"].append(f"email {addr}: {e}")
        except ImportError:
            pass
        except Exception as e:
            result["errors"].append(f"email: {e}")

    return result


def _frontend_url() -> str:
    """Frontend base URL — used to build CTA links in notifications."""
    from app.core.config import settings as _s
    return (getattr(_s, "FRONTEND_URL", "") or "https://www.find-commonground.com").rstrip("/")


async def evaluate_rule(db: AsyncSession, rule: AlertRule) -> None:
    """Evaluate a single rule. Mutates rule.current_state + last_value and
    writes AlertHistory + notifications on state transitions."""
    value = await resolve_metric(db, rule.metric_path)
    if value is None:
        # Unknown metric / resolver failed — skip without transitioning.
        logger.warning(
            "alert rule %s: metric %s returned None (unregistered or resolver error)",
            rule.id, rule.metric_path,
        )
        rule.last_evaluated_at = datetime.utcnow()
        return

    rule.last_value = value
    rule.last_evaluated_at = datetime.utcnow()

    should_fire = _eval_comparison(value, rule.comparison, rule.threshold_value)
    prev_state = rule.current_state

    if should_fire and prev_state != "firing":
        # Transition OK → firing
        rule.current_state = "firing"
        history = AlertHistory(
            rule_id=rule.id,
            rule_name_snapshot=rule.name,
            metric_path_snapshot=rule.metric_path,
            fired_at=datetime.utcnow(),
            fired_value=value,
            threshold_value_snapshot=rule.threshold_value,
            comparison_snapshot=rule.comparison,
        )
        db.add(history)
        notif_result = await _send_notifications(db, rule, value, event="firing")
        history.notifications_sent = notif_result

    elif (not should_fire) and prev_state == "firing":
        # Transition firing → OK — find the open history row and close it
        open_q = await db.execute(
            select(AlertHistory)
            .where(AlertHistory.rule_id == rule.id)
            .where(AlertHistory.resolved_at.is_(None))
            .order_by(AlertHistory.fired_at.desc())
            .limit(1)
        )
        open_row = open_q.scalar_one_or_none()
        if open_row:
            open_row.resolved_at = datetime.utcnow()
            open_row.resolved_value = value
        rule.current_state = "ok"
        # Best-effort recovery notification
        try:
            await _send_notifications(db, rule, value, event="recovered")
        except Exception as e:
            logger.warning("recovery notification failed for %s: %s", rule.id, e)


async def run_alert_evaluator() -> dict:
    """Entry point for the scheduler. Opens its own session so it's safe to
    invoke outside a request context.

    Returns a summary dict useful for logs / health checks:
      {"evaluated": N, "transitions": K, "errors": [...]}
    """
    evaluated = 0
    transitions = 0
    errors: list[str] = []

    async with async_session_factory() as db:
        try:
            q = await db.execute(select(AlertRule).where(AlertRule.enabled.is_(True)))
            rules = list(q.scalars())
        except Exception as e:
            # Schema drift (table not yet migrated) — surface but don't crash scheduler
            logger.warning("alert_evaluator: failed to load rules (%s)", e)
            return {"evaluated": 0, "transitions": 0, "errors": [str(e)]}

        for rule in rules:
            prev_state = rule.current_state
            try:
                await evaluate_rule(db, rule)
                evaluated += 1
                if rule.current_state != prev_state:
                    transitions += 1
            except Exception as e:
                logger.exception("alert rule %s failed", rule.id)
                errors.append(f"{rule.id}: {e}")

        await db.commit()

    return {"evaluated": evaluated, "transitions": transitions, "errors": errors}
