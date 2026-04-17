"""Ops infrastructure endpoints — alert rules, alert history, runbooks.

Routes (all require admin):
    GET    /admin/alerts/metrics            — registry introspection (UI populates selectors)
    GET    /admin/alerts/rules              — list all rules
    POST   /admin/alerts/rules              — create a rule
    PATCH  /admin/alerts/rules/{id}         — update a rule
    DELETE /admin/alerts/rules/{id}         — delete a rule
    POST   /admin/alerts/rules/{id}/evaluate — force-evaluate one rule (debug)
    GET    /admin/alerts/history            — paginated firing history

    GET    /admin/runbooks                  — list runbooks
    GET    /admin/runbooks/{id}             — single runbook
    POST   /admin/runbooks                  — create
    PATCH  /admin/runbooks/{id}             — update
    DELETE /admin/runbooks/{id}             — delete
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.alert_rule import AlertHistory, AlertRule, VALID_COMPARISONS
from app.models.audit import AuditLog
from app.models.runbook import RUNBOOK_CATEGORIES, Runbook
from app.models.user import User
from app.services.alert_metric_registry import (
    METRIC_REGISTRY,
    list_available_metrics,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════
# Alert metric registry introspection
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/alerts/metrics")
async def list_metrics(
    admin: User = Depends(get_current_admin_user),
) -> dict:
    """Return the metric registry so the UI can populate a rule-creation form."""
    return {
        "metrics": list_available_metrics(),
        "comparisons": sorted(VALID_COMPARISONS),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Alert rules CRUD
# ═══════════════════════════════════════════════════════════════════════════

class AlertRuleIn(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    metric_path: str
    comparison: str
    threshold_value: float
    check_interval_minutes: int = Field(5, ge=1, le=60)
    stability_factor: float = Field(1.0, ge=0.0, le=1.0)
    notify_emails: Optional[list[str]] = None
    notify_push: bool = True
    runbook_id: Optional[str] = None
    enabled: bool = True


def _rule_to_dict(rule: AlertRule) -> dict:
    return {
        "id": rule.id,
        "name": rule.name,
        "description": rule.description,
        "metric_path": rule.metric_path,
        "comparison": rule.comparison,
        "threshold_value": rule.threshold_value,
        "check_interval_minutes": rule.check_interval_minutes,
        "stability_factor": rule.stability_factor,
        "notify_emails": rule.notify_emails or [],
        "notify_push": rule.notify_push,
        "runbook_id": rule.runbook_id,
        "enabled": rule.enabled,
        "last_evaluated_at": rule.last_evaluated_at.isoformat() if rule.last_evaluated_at else None,
        "last_value": rule.last_value,
        "current_state": rule.current_state,
        "created_at": rule.created_at.isoformat() if rule.created_at else None,
    }


def _validate_rule_input(data: AlertRuleIn) -> None:
    if data.comparison not in VALID_COMPARISONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid comparison '{data.comparison}'. Must be one of: {sorted(VALID_COMPARISONS)}",
        )
    if data.metric_path not in METRIC_REGISTRY:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown metric '{data.metric_path}'. See /admin/alerts/metrics for valid paths.",
        )


@router.get("/alerts/rules")
async def list_alert_rules(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> list[dict]:
    q = await db.execute(select(AlertRule).order_by(AlertRule.name))
    return [_rule_to_dict(r) for r in q.scalars()]


@router.post("/alerts/rules", status_code=201)
async def create_alert_rule(
    data: AlertRuleIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> dict:
    _validate_rule_input(data)
    rule = AlertRule(
        name=data.name,
        description=data.description,
        metric_path=data.metric_path,
        comparison=data.comparison,
        threshold_value=data.threshold_value,
        check_interval_minutes=data.check_interval_minutes,
        stability_factor=data.stability_factor,
        notify_emails=data.notify_emails,
        notify_push=data.notify_push,
        runbook_id=data.runbook_id,
        enabled=data.enabled,
        created_by=str(admin.id),
    )
    db.add(rule)
    db.add(AuditLog(
        user_id=str(admin.id), user_email=admin.email,
        action="admin:alert_rule_create",
        resource_type="alert_rule", resource_id=None,
        method="POST", status="success",
        description=f"Created rule '{data.name}' on metric {data.metric_path}",
    ))
    await db.commit()
    await db.refresh(rule)
    return _rule_to_dict(rule)


class AlertRulePatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    metric_path: Optional[str] = None
    comparison: Optional[str] = None
    threshold_value: Optional[float] = None
    check_interval_minutes: Optional[int] = Field(None, ge=1, le=60)
    stability_factor: Optional[float] = Field(None, ge=0.0, le=1.0)
    notify_emails: Optional[list[str]] = None
    notify_push: Optional[bool] = None
    runbook_id: Optional[str] = None
    enabled: Optional[bool] = None


@router.patch("/alerts/rules/{rule_id}")
async def update_alert_rule(
    rule_id: str,
    data: AlertRulePatch,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> dict:
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    # Validate new metric_path / comparison if provided
    if data.comparison is not None and data.comparison not in VALID_COMPARISONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid comparison '{data.comparison}'",
        )
    if data.metric_path is not None and data.metric_path not in METRIC_REGISTRY:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown metric '{data.metric_path}'",
        )

    changes = {}
    for field, value in data.model_dump(exclude_unset=True).items():
        old = getattr(rule, field)
        if old != value:
            changes[field] = {"old": old, "new": value}
            setattr(rule, field, value)

    if changes:
        db.add(AuditLog(
            user_id=str(admin.id), user_email=admin.email,
            action="admin:alert_rule_update",
            resource_type="alert_rule", resource_id=rule_id,
            method="PATCH", status="success",
            description=f"Updated rule '{rule.name}'",
            old_values={k: v["old"] for k, v in changes.items()},
            new_values={k: v["new"] for k, v in changes.items()},
        ))
    await db.commit()
    await db.refresh(rule)
    return _rule_to_dict(rule)


@router.delete("/alerts/rules/{rule_id}")
async def delete_alert_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> dict:
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    name = rule.name
    await db.delete(rule)
    db.add(AuditLog(
        user_id=str(admin.id), user_email=admin.email,
        action="admin:alert_rule_delete",
        resource_type="alert_rule", resource_id=rule_id,
        method="DELETE", status="success",
        description=f"Deleted rule '{name}'",
    ))
    await db.commit()
    return {"deleted": True, "id": rule_id}


@router.post("/alerts/rules/{rule_id}/evaluate")
async def force_evaluate_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> dict:
    """Force a one-off evaluation of a single rule. Used for debugging +
    testing notification routing without waiting for the 5-min scheduler."""
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    from app.services.alert_evaluator import evaluate_rule
    prev_state = rule.current_state
    await evaluate_rule(db, rule)
    await db.commit()
    await db.refresh(rule)
    return {
        "rule": _rule_to_dict(rule),
        "previous_state": prev_state,
        "transitioned": prev_state != rule.current_state,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Alert history
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/alerts/history")
async def list_alert_history(
    rule_id: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    open_only: bool = Query(False, description="Only unresolved alerts"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> dict:
    cutoff = datetime.utcnow() - timedelta(days=days)

    q = select(AlertHistory).where(AlertHistory.fired_at >= cutoff)
    count_q = select(func.count(AlertHistory.id)).where(AlertHistory.fired_at >= cutoff)
    if rule_id:
        q = q.where(AlertHistory.rule_id == rule_id)
        count_q = count_q.where(AlertHistory.rule_id == rule_id)
    if open_only:
        q = q.where(AlertHistory.resolved_at.is_(None))
        count_q = count_q.where(AlertHistory.resolved_at.is_(None))

    total = (await db.execute(count_q)).scalar() or 0

    q = q.order_by(desc(AlertHistory.fired_at))
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = list((await db.execute(q)).scalars())

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": r.id,
                "rule_id": r.rule_id,
                "rule_name": r.rule_name_snapshot,
                "metric_path": r.metric_path_snapshot,
                "fired_at": r.fired_at.isoformat() if r.fired_at else None,
                "fired_value": r.fired_value,
                "threshold_value": r.threshold_value_snapshot,
                "comparison": r.comparison_snapshot,
                "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
                "resolved_value": r.resolved_value,
                "duration_seconds": (
                    int((r.resolved_at - r.fired_at).total_seconds())
                    if r.resolved_at and r.fired_at else None
                ),
                "notifications_sent": r.notifications_sent,
            }
            for r in rows
        ],
    }


# ═══════════════════════════════════════════════════════════════════════════
# Runbooks CRUD
# ═══════════════════════════════════════════════════════════════════════════

class RunbookStep(BaseModel):
    title: str
    body: str = ""
    expected_outcome: Optional[str] = None


class RunbookIn(BaseModel):
    title: str = Field(..., max_length=200)
    category: str = "incident"
    summary: Optional[str] = None
    steps: list[RunbookStep] = Field(default_factory=list)
    notes: Optional[str] = None
    tags: Optional[list[str]] = None
    enabled: bool = True


def _runbook_to_dict(rb: Runbook) -> dict:
    return {
        "id": rb.id,
        "title": rb.title,
        "category": rb.category,
        "summary": rb.summary,
        "steps": rb.steps_json or [],
        "notes": rb.notes,
        "tags": rb.tags or [],
        "enabled": rb.enabled,
        "owner_id": rb.owner_id,
        "created_at": rb.created_at.isoformat() if rb.created_at else None,
        "updated_at": rb.updated_at.isoformat() if rb.updated_at else None,
    }


@router.get("/runbooks")
async def list_runbooks(
    category: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> list[dict]:
    q = select(Runbook).where(Runbook.enabled.is_(True)).order_by(Runbook.title)
    if category:
        q = q.where(Runbook.category == category)
    rows = list((await db.execute(q)).scalars())
    if tag:
        rows = [r for r in rows if r.tags and tag in r.tags]
    return [_runbook_to_dict(r) for r in rows]


@router.get("/runbooks/{runbook_id}")
async def get_runbook(
    runbook_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> dict:
    result = await db.execute(select(Runbook).where(Runbook.id == runbook_id))
    rb = result.scalar_one_or_none()
    if not rb:
        raise HTTPException(status_code=404, detail="Runbook not found")
    return _runbook_to_dict(rb)


@router.post("/runbooks", status_code=201)
async def create_runbook(
    data: RunbookIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> dict:
    if data.category not in RUNBOOK_CATEGORIES:
        # Not a hard constraint — we allow anything, just warn the UI.
        logger.debug("runbook created with non-standard category %s", data.category)
    rb = Runbook(
        title=data.title,
        category=data.category,
        summary=data.summary,
        steps_json=[s.model_dump() for s in data.steps],
        notes=data.notes,
        tags=data.tags,
        enabled=data.enabled,
        owner_id=str(admin.id),
    )
    db.add(rb)
    db.add(AuditLog(
        user_id=str(admin.id), user_email=admin.email,
        action="admin:runbook_create",
        resource_type="runbook", resource_id=None,
        method="POST", status="success",
        description=f"Created runbook '{data.title}'",
    ))
    await db.commit()
    await db.refresh(rb)
    return _runbook_to_dict(rb)


class RunbookPatch(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    summary: Optional[str] = None
    steps: Optional[list[RunbookStep]] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None
    enabled: Optional[bool] = None


@router.patch("/runbooks/{runbook_id}")
async def update_runbook(
    runbook_id: str,
    data: RunbookPatch,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> dict:
    result = await db.execute(select(Runbook).where(Runbook.id == runbook_id))
    rb = result.scalar_one_or_none()
    if not rb:
        raise HTTPException(status_code=404, detail="Runbook not found")

    payload = data.model_dump(exclude_unset=True)
    if "steps" in payload and payload["steps"] is not None:
        payload["steps_json"] = [s for s in payload.pop("steps")]
    else:
        payload.pop("steps", None)

    for field, value in payload.items():
        setattr(rb, field, value)

    db.add(AuditLog(
        user_id=str(admin.id), user_email=admin.email,
        action="admin:runbook_update",
        resource_type="runbook", resource_id=runbook_id,
        method="PATCH", status="success",
        description=f"Updated runbook '{rb.title}'",
    ))
    await db.commit()
    await db.refresh(rb)
    return _runbook_to_dict(rb)


@router.delete("/runbooks/{runbook_id}")
async def delete_runbook(
    runbook_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> dict:
    result = await db.execute(select(Runbook).where(Runbook.id == runbook_id))
    rb = result.scalar_one_or_none()
    if not rb:
        raise HTTPException(status_code=404, detail="Runbook not found")
    title = rb.title
    await db.delete(rb)
    db.add(AuditLog(
        user_id=str(admin.id), user_email=admin.email,
        action="admin:runbook_delete",
        resource_type="runbook", resource_id=runbook_id,
        method="DELETE", status="success",
        description=f"Deleted runbook '{title}'",
    ))
    await db.commit()
    return {"deleted": True, "id": runbook_id}
