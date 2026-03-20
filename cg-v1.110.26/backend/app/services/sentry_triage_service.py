"""Sentry bug triage service — fetches issues, categorizes, and generates sprint plans via AI."""

import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings

logger = logging.getLogger(__name__)
settings = Settings()

SENTRY_API_BASE = "https://sentry.io/api/0"


async def fetch_sentry_issues(
    project_slug: Optional[str] = None,
    days: int = 7,
    limit: int = 100,
) -> list[dict]:
    """Fetch unresolved issues from Sentry for the given project."""
    if not settings.SENTRY_AUTH_TOKEN:
        raise ValueError("SENTRY_AUTH_TOKEN not configured")

    slug = project_slug or settings.SENTRY_PROJECT_SLUG
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()

    issues = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{SENTRY_API_BASE}/projects/{settings.SENTRY_ORG_SLUG}/{slug}/issues/",
            headers={"Authorization": f"Bearer {settings.SENTRY_AUTH_TOKEN}"},
            params={
                "query": f"is:unresolved firstSeen:>{since[:10]}",
                "limit": limit,
                "sort": "freq",
            },
        )
        resp.raise_for_status()
        raw_issues = resp.json()

    for issue in raw_issues:
        issues.append(
            {
                "id": issue["id"],
                "title": issue["title"],
                "culprit": issue.get("culprit", ""),
                "level": issue.get("level", "error"),
                "count": issue.get("count", 0),
                "user_count": issue.get("userCount", 0),
                "first_seen": issue.get("firstSeen"),
                "last_seen": issue.get("lastSeen"),
                "is_unhandled": issue.get("isUnhandled", False),
                "short_id": issue.get("shortId", ""),
                "permalink": issue.get("permalink", ""),
                "has_user_feedback": issue.get("hasSeen", False),
                "platform": issue.get("platform", ""),
                "metadata": {
                    "type": issue.get("metadata", {}).get("type", ""),
                    "value": issue.get("metadata", {}).get("value", ""),
                },
            }
        )

    return issues


def categorize_issues(issues: list[dict]) -> dict:
    """Categorize issues by severity and source."""
    categories = {
        "critical": [],
        "high": [],
        "medium": [],
        "low": [],
        "user_reported": [],
        "by_platform": {"frontend": [], "backend": []},
    }

    for issue in issues:
        # Severity based on frequency and unhandled status
        if issue["is_unhandled"] and issue["user_count"] > 10:
            categories["critical"].append(issue)
        elif issue["user_count"] > 5 or issue["count"] > 50:
            categories["high"].append(issue)
        elif issue["user_count"] > 1 or issue["count"] > 10:
            categories["medium"].append(issue)
        else:
            categories["low"].append(issue)

        # User-reported
        if issue["has_user_feedback"] or issue["user_count"] > 0:
            categories["user_reported"].append(issue)

        # Platform
        if issue.get("platform") in ("javascript", "node"):
            categories["by_platform"]["frontend"].append(issue)
        else:
            categories["by_platform"]["backend"].append(issue)

    return {
        "total": len(issues),
        "critical": len(categories["critical"]),
        "high": len(categories["high"]),
        "medium": len(categories["medium"]),
        "low": len(categories["low"]),
        "user_reported": len(categories["user_reported"]),
        "frontend": len(categories["by_platform"]["frontend"]),
        "backend": len(categories["by_platform"]["backend"]),
        "issues": categories,
    }


async def ai_triage(issues: list[dict]) -> dict:
    """Use Claude to analyze and prioritize Sentry issues."""
    if not issues:
        return {"summary": "No issues to triage.", "recommendations": []}

    # Build a concise summary of issues for Claude
    issue_summaries = []
    for i, issue in enumerate(issues[:30]):  # Cap at 30 for context limits
        issue_summaries.append(
            f"{i+1}. [{issue['level'].upper()}] {issue['title']}\n"
            f"   Culprit: {issue['culprit']}\n"
            f"   Occurrences: {issue['count']}, Users affected: {issue['user_count']}\n"
            f"   First seen: {issue['first_seen']}, Last seen: {issue['last_seen']}\n"
            f"   Unhandled: {issue['is_unhandled']}"
        )

    prompt = (
        "You are a senior software engineer triaging bugs for CommonGround, "
        "a co-parenting SaaS platform.\n\n"
        f"Here are {len(issue_summaries)} unresolved Sentry issues from the past week:\n\n"
        f"{chr(10).join(issue_summaries)}\n\n"
        "For each issue, provide:\n"
        "1. **Severity**: critical / high / medium / low\n"
        "2. **Action**: resolve (fix this sprint) / defer (not urgent) / "
        "investigate (need more info) / ignore (noise/expected)\n"
        "3. **Reason**: 1-sentence explanation\n\n"
        "Then provide an overall summary with:\n"
        "- Top 3 most impactful issues to fix\n"
        "- Common patterns or root causes\n"
        "- Recommendations for the 3-day sprint\n\n"
        "Format your response as JSON:\n"
        "{\n"
        '  "summary": "Overall assessment...",\n'
        '  "top_3": ["issue description 1", "issue description 2", "issue description 3"],\n'
        '  "patterns": ["pattern 1", "pattern 2"],\n'
        '  "recommendations": [\n'
        '    {"issue_id": "123", "title": "...", "severity": "high", '
        '"action": "resolve", "reason": "...", "estimated_effort": "1h"}\n'
        "  ]\n"
        "}"
    )

    try:
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-sonnet-4-5-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )

        import json

        text = response.content[0].text
        # Try to parse JSON from the response
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        return json.loads(text.strip())
    except Exception as e:
        logger.error(f"AI triage failed: {e}")
        return {
            "summary": f"AI triage failed: {str(e)}",
            "recommendations": [],
            "error": True,
        }


async def generate_sprint_plan(triaged_data: dict, days: int = 3) -> dict:
    """Generate a prioritized sprint plan from triaged issues."""
    recommendations = triaged_data.get("recommendations", [])

    # Group by day based on severity and effort
    plan = {f"day_{i+1}": [] for i in range(days)}

    resolve_items = [
        r for r in recommendations if r.get("action") == "resolve"
    ]

    # Distribute across days: critical first, then high, etc.
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    resolve_items.sort(
        key=lambda x: severity_order.get(x.get("severity", "low"), 3)
    )

    for i, item in enumerate(resolve_items):
        day_key = f"day_{(i % days) + 1}"
        plan[day_key].append(item)

    return {
        "days": days,
        "plan": plan,
        "total_items": len(resolve_items),
        "deferred": [
            r for r in recommendations if r.get("action") == "defer"
        ],
        "investigate": [
            r for r in recommendations if r.get("action") == "investigate"
        ],
        "summary": triaged_data.get("summary", ""),
        "top_3": triaged_data.get("top_3", []),
    }


async def save_sprint(
    db: AsyncSession,
    sprint_plan: dict,
    triaged_data: dict,
    period_days: int = 7,
) -> str:
    """Save a sprint plan to the database."""
    from app.models.bug_triage import BugTriageSprint

    now = datetime.utcnow()
    sprint = BugTriageSprint(
        period_start=now.date() - timedelta(days=period_days),
        period_end=now.date(),
        status="draft",
        summary_json={
            "total": triaged_data.get("total", 0),
            "critical": triaged_data.get("critical", 0),
            "high": triaged_data.get("high", 0),
            "medium": triaged_data.get("medium", 0),
            "low": triaged_data.get("low", 0),
        },
        sprint_plan_json=sprint_plan,
        ai_analysis=triaged_data.get("summary", ""),
    )
    db.add(sprint)
    await db.flush()
    return sprint.id
