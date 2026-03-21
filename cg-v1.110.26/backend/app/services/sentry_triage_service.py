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
    org = settings.SENTRY_ORG_SLUG

    # Fetch ALL unresolved issues active in the last N days (not just first-seen)
    since = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

    url = f"{SENTRY_API_BASE}/projects/{org}/{slug}/issues/"
    logger.info(
        "Fetching Sentry issues: org=%s project=%s since=%s url=%s",
        org, slug, since, url,
    )

    issues = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Primary fetch: all unresolved issues with activity in the window
        resp = await client.get(
            url,
            headers={"Authorization": f"Bearer {settings.SENTRY_AUTH_TOKEN}"},
            params={
                "query": f"is:unresolved lastSeen:>{since}",
                "limit": limit,
                "sort": "freq",
            },
        )

        if resp.status_code != 200:
            logger.error(
                "Sentry API error (HTTP %s): %s", resp.status_code, resp.text[:500]
            )
            resp.raise_for_status()

        raw_issues = resp.json()
        logger.info("Sentry returned %d issues", len(raw_issues))

        # Fetch user feedback — the new Sentry widget creates issues
        # with category "feedback", queryable via the issues endpoint
        feedback_issues_raw = []
        try:
            fb_resp = await client.get(
                url,
                headers={"Authorization": f"Bearer {settings.SENTRY_AUTH_TOKEN}"},
                params={
                    "query": f"issue.category:feedback lastSeen:>{since}",
                    "limit": 50,
                    "sort": "date",
                },
            )
            if fb_resp.status_code == 200:
                feedback_issues_raw = fb_resp.json()
                logger.info("Sentry returned %d user feedback issues", len(feedback_issues_raw))
            else:
                logger.warning("User feedback fetch failed (HTTP %s): %s", fb_resp.status_code, fb_resp.text[:300])
        except Exception as exc:
            logger.warning("Failed to fetch user feedback: %s", exc)

    # Track which issue IDs came from the feedback query
    feedback_issue_ids = {str(fb["id"]) for fb in feedback_issues_raw}
    # Also track IDs already in the main issues list to avoid duplicates
    existing_ids = {str(issue["id"]) for issue in raw_issues}

    for issue in raw_issues:
        issue_id = str(issue["id"])
        issues.append(
            {
                "id": issue_id,
                "title": issue["title"],
                "culprit": issue.get("culprit", ""),
                "level": issue.get("level", "error"),
                "count": int(issue.get("count", 0)),
                "user_count": int(issue.get("userCount", 0)),
                "first_seen": issue.get("firstSeen"),
                "last_seen": issue.get("lastSeen"),
                "is_unhandled": issue.get("isUnhandled", False),
                "short_id": issue.get("shortId", ""),
                "permalink": issue.get("permalink", ""),
                "has_user_feedback": issue_id in feedback_issue_ids,
                "platform": issue.get("platform", ""),
                "metadata": {
                    "type": issue.get("metadata", {}).get("type", ""),
                    "value": issue.get("metadata", {}).get("value", ""),
                },
            }
        )

    # Append feedback issues that weren't in the main issues query
    for fb_issue in feedback_issues_raw:
        fb_id = str(fb_issue["id"])
        if fb_id not in existing_ids:
            issues.append(
                {
                    "id": fb_id,
                    "title": fb_issue.get("title", "User Feedback"),
                    "culprit": fb_issue.get("culprit", ""),
                    "level": fb_issue.get("level", "info"),
                    "count": int(fb_issue.get("count", 1)),
                    "user_count": int(fb_issue.get("userCount", 1)),
                    "first_seen": fb_issue.get("firstSeen"),
                    "last_seen": fb_issue.get("lastSeen"),
                    "is_unhandled": False,
                    "short_id": fb_issue.get("shortId", ""),
                    "permalink": fb_issue.get("permalink", ""),
                    "has_user_feedback": True,
                    "platform": fb_issue.get("platform", ""),
                    "metadata": {
                        "type": fb_issue.get("metadata", {}).get("type", "user_feedback"),
                        "value": fb_issue.get("metadata", {}).get("value", ""),
                    },
                }
            )

    logger.info("Total issues after merging feedback: %d", len(issues))
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

        # User-reported (from widget feedback or has affected users)
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
            f"{'  [USER REPORTED]' if issue.get('has_user_feedback') else ''}"
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

    import json

    def _parse_ai_response(text: str) -> dict:
        """Extract JSON from an AI response that may contain markdown fences."""
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return json.loads(text.strip())

    # --- Try Claude first ---
    if settings.ANTHROPIC_API_KEY:
        try:
            import anthropic

            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = await client.messages.create(
                model="claude-sonnet-4-5-20250514",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.content[0].text
            result = _parse_ai_response(text)
            result["provider"] = "claude"
            return result
        except Exception as e:
            logger.warning("Claude triage failed, falling back to OpenAI: %s", e)

    # --- Fallback to OpenAI ---
    if settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI

            oai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            oai_response = await oai_client.chat.completions.create(
                model="gpt-4o",
                max_tokens=4096,
                messages=[
                    {"role": "system", "content": "You are a senior software engineer. Respond only with valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
            text = oai_response.choices[0].message.content or "{}"
            result = json.loads(text)
            result["provider"] = "openai"
            return result
        except Exception as e:
            logger.error("OpenAI triage also failed: %s", e)
            return {
                "summary": f"AI triage failed (both Claude and OpenAI): {str(e)}",
                "recommendations": [],
                "error": True,
            }

    return {
        "summary": "No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.",
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


async def fetch_performance_data(days: int = 7) -> dict:
    """Fetch performance metrics from Sentry's Discover API."""
    if not settings.SENTRY_AUTH_TOKEN:
        raise ValueError("SENTRY_AUTH_TOKEN not configured")

    org = settings.SENTRY_ORG_SLUG
    slug = settings.SENTRY_PROJECT_SLUG
    since = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S")
    until = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
    headers = {"Authorization": f"Bearer {settings.SENTRY_AUTH_TOKEN}"}

    result = {
        "period_days": days,
        "transactions": [],
        "ai_calls": [],
        "slow_queries": [],
        "summary": {},
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Top transactions by volume and p75 duration
        try:
            resp = await client.get(
                f"{SENTRY_API_BASE}/organizations/{org}/events/",
                headers=headers,
                params={
                    "field": ["transaction", "count()", "p75(transaction.duration)", "p95(transaction.duration)", "failure_rate()"],
                    "sort": "-count()",
                    "per_page": 20,
                    "query": f"event.type:transaction project:{slug}",
                    "start": since,
                    "end": until,
                },
            )
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                result["transactions"] = [
                    {
                        "name": row.get("transaction", ""),
                        "count": row.get("count()", 0),
                        "p75_ms": round(row.get("p75(transaction.duration)", 0), 1),
                        "p95_ms": round(row.get("p95(transaction.duration)", 0), 1),
                        "failure_rate": round(row.get("failure_rate()", 0) * 100, 1),
                    }
                    for row in data
                ]
                logger.info("Fetched %d transaction metrics from Sentry", len(data))
            else:
                logger.warning("Sentry transactions query failed (HTTP %s): %s", resp.status_code, resp.text[:300])
        except Exception as exc:
            logger.warning("Failed to fetch transaction data: %s", exc)

        # 2. AI/LLM calls — query ai.pipeline spans (matches Sentry AI Insights)
        try:
            # Strategy A: Query ai.pipeline and ai.chat_completions spans
            for span_op in ["ai.chat_completions.create.v2", "ai.chat_completions", "ai.pipeline", "ai.*"]:
                resp = await client.get(
                    f"{SENTRY_API_BASE}/organizations/{org}/events/",
                    headers=headers,
                    params={
                        "field": [
                            "span.description",
                            "count()",
                            "avg(span.duration)",
                            "sum(ai.total_tokens.used)",
                        ],
                        "sort": "-count()",
                        "per_page": 20,
                        "query": f"span.op:{span_op} project:{slug}",
                        "dataset": "spansIndexed",
                        "start": since,
                        "end": until,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json().get("data", [])
                    if data:
                        result["ai_calls"] = [
                            {
                                "description": row.get("span.description", row.get("description", "")),
                                "count": row.get("count()", 0),
                                "avg_duration_ms": round(row.get("avg(span.duration)", 0), 1),
                                "total_tokens": row.get("sum(ai.total_tokens.used)", 0) or 0,
                            }
                            for row in data
                        ]
                        result["ai_source"] = "spans"
                        logger.info("Fetched %d AI calls from Sentry spans (op=%s)", len(data), span_op)
                        break
                else:
                    logger.debug("Sentry AI span query (op=%s) failed HTTP %s", span_op, resp.status_code)

            # Strategy B: Try the simpler field names
            if not result["ai_calls"]:
                resp = await client.get(
                    f"{SENTRY_API_BASE}/organizations/{org}/events/",
                    headers=headers,
                    params={
                        "field": ["description", "count()", "avg(span.duration)"],
                        "sort": "-count()",
                        "per_page": 20,
                        "query": f"span.op:ai.* project:{slug}",
                        "dataset": "spansIndexed",
                        "start": since,
                        "end": until,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json().get("data", [])
                    if data:
                        result["ai_calls"] = [
                            {
                                "description": row.get("description", ""),
                                "count": row.get("count()", 0),
                                "avg_duration_ms": round(row.get("avg(span.duration)", 0), 1),
                                "total_tokens": 0,
                            }
                            for row in data
                        ]
                        result["ai_source"] = "spans_basic"
                        logger.info("Fetched %d AI calls (basic fields)", len(data))

            # Strategy C: Fall back to AI-related transactions
            if not result["ai_calls"]:
                resp2 = await client.get(
                    f"{SENTRY_API_BASE}/organizations/{org}/events/",
                    headers=headers,
                    params={
                        "field": ["transaction", "count()", "p75(transaction.duration)", "failure_rate()"],
                        "sort": "-count()",
                        "per_page": 20,
                        "query": f"event.type:transaction project:{slug} (transaction:*aria* OR transaction:*analyze* OR transaction:*triage*)",
                        "start": since,
                        "end": until,
                    },
                )
                if resp2.status_code == 200:
                    data2 = resp2.json().get("data", [])
                    result["ai_calls"] = [
                        {
                            "description": row.get("transaction", ""),
                            "count": row.get("count()", 0),
                            "avg_duration_ms": round(row.get("p75(transaction.duration)", 0), 1),
                            "total_tokens": 0,
                        }
                        for row in data2
                    ]
                    if data2:
                        logger.info("Fetched %d AI transactions (fallback)", len(data2))
                    result["ai_source"] = "transactions"
        except Exception as exc:
            logger.warning("Failed to fetch AI span data: %s", exc)

        # 3. Slow DB queries — try spans, fall back to slow transactions
        try:
            resp = await client.get(
                f"{SENTRY_API_BASE}/organizations/{org}/events/",
                headers=headers,
                params={
                    "field": ["description", "count()", "avg(span.duration)", "p95(span.duration)"],
                    "sort": "-p95(span.duration)",
                    "per_page": 15,
                    "query": f"span.op:db project:{slug} span.duration:>50",
                    "dataset": "spansIndexed",
                    "start": since,
                    "end": until,
                },
            )
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                if data:
                    result["slow_queries"] = [
                        {
                            "query": (row.get("description", "")[:200]),
                            "count": row.get("count()", 0),
                            "avg_ms": round(row.get("avg(span.duration)", 0), 1),
                            "p95_ms": round(row.get("p95(span.duration)", 0), 1),
                        }
                        for row in data
                    ]
                    logger.info("Fetched %d slow query metrics from Sentry spans", len(data))

            # Fallback: show slowest transactions overall (p95 > 1s)
            if not result["slow_queries"]:
                resp2 = await client.get(
                    f"{SENTRY_API_BASE}/organizations/{org}/events/",
                    headers=headers,
                    params={
                        "field": ["transaction", "count()", "p75(transaction.duration)", "p95(transaction.duration)"],
                        "sort": "-p95(transaction.duration)",
                        "per_page": 15,
                        "query": f"event.type:transaction project:{slug} p95(transaction.duration):>1000",
                        "start": since,
                        "end": until,
                    },
                )
                if resp2.status_code == 200:
                    data2 = resp2.json().get("data", [])
                    result["slow_queries"] = [
                        {
                            "query": row.get("transaction", "")[:200],
                            "count": row.get("count()", 0),
                            "avg_ms": round(row.get("p75(transaction.duration)", 0), 1),
                            "p95_ms": round(row.get("p95(transaction.duration)", 0), 1),
                        }
                        for row in data2
                    ]
                    if data2:
                        logger.info("Fetched %d slow transactions (fallback)", len(data2))
                    result["db_source"] = "transactions"
                else:
                    logger.warning("Sentry slow tx fallback failed (HTTP %s): %s", resp2.status_code, resp2.text[:200])
        except Exception as exc:
            logger.warning("Failed to fetch slow query data: %s", exc)

        # 4. Summary stats
        total_tx = sum(t.get("count", 0) for t in result["transactions"])
        total_ai = sum(a.get("count", 0) for a in result["ai_calls"])
        total_tokens = sum(a.get("total_tokens", 0) for a in result["ai_calls"])
        avg_p75 = (
            sum(t.get("p75_ms", 0) for t in result["transactions"]) / len(result["transactions"])
            if result["transactions"] else 0
        )
        result["summary"] = {
            "total_requests": total_tx,
            "total_ai_calls": total_ai,
            "total_tokens_used": total_tokens,
            "avg_response_p75_ms": round(avg_p75, 1),
            "slow_queries_count": len(result["slow_queries"]),
        }

    return result


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
