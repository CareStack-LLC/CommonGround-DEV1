"""
BizOps AI Service - AI-powered analytics and insights for the SuperAdmin portal.

Provides Claude-driven summaries, triage, customer success analysis,
sales intelligence, and marketing suggestions.
"""

import json
import logging
from typing import Any, Dict, List, Optional

import anthropic

from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Anthropic client
_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    """Get or create the Anthropic client."""
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


async def generate_executive_summary(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a 3-bullet executive summary from platform metrics.

    Args:
        metrics: Dict containing current platform KPIs (users, MRR, growth, etc.)

    Returns:
        Dict with summary bullets and generation timestamp.
    """
    try:
        client = _get_client()

        prompt = f"""You are a BizOps analyst for CommonGround, a co-parenting platform.
Analyze these platform metrics and provide exactly 3 concise bullet points highlighting:
1. The most notable positive trend or achievement
2. Any area of concern or risk
3. A strategic opportunity or recommendation

Metrics:
{json.dumps(metrics, indent=2, default=str)}

Respond in JSON format:
{{"summary": ["bullet 1", "bullet 2", "bullet 3"]}}"""

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text
        # Parse JSON from response
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
            return {"summary": data.get("summary", []), "generated": True}

        return {"summary": ["Unable to parse AI summary."], "generated": False}

    except Exception as e:
        logger.error(f"Executive summary generation failed: {e}")
        return {"summary": [f"AI summary unavailable: {str(e)}"], "generated": False}


async def generate_devops_triage(
    bugs: List[Dict[str, Any]],
    recent_deployments: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    AI-powered bug triage with pattern detection and effort estimation.
    """
    try:
        client = _get_client()

        prompt = f"""You are a DevOps engineer analyzing bugs for CommonGround, a co-parenting platform.

Current bugs:
{json.dumps(bugs, indent=2, default=str)}

{f"Recent deployments: {json.dumps(recent_deployments, indent=2, default=str)}" if recent_deployments else ""}

Analyze and respond in JSON:
{{
  "root_cause_clusters": [
    {{"name": "cluster name", "count": N, "issue_ids": ["..."], "description": "..."}}
  ],
  "patterns": ["pattern 1", "pattern 2"],
  "effort_estimates": {{
    "total_hours": N,
    "by_severity": {{"critical": N, "high": N, "medium": N, "low": N}}
  }},
  "priority_order": ["issue_id_1", "issue_id_2"],
  "recommendations": ["rec 1", "rec 2"]
}}"""

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])

        return {"error": "Unable to parse triage response"}

    except Exception as e:
        logger.error(f"DevOps triage failed: {e}")
        return {"error": str(e)}


async def generate_cs_analysis(
    user_context: Dict[str, Any],
    issue_description: str,
) -> Dict[str, Any]:
    """
    AI customer success agent - analyzes user issues and suggests resolutions.
    """
    try:
        client = _get_client()

        prompt = f"""You are a Customer Success agent for CommonGround, a co-parenting platform.

User context:
{json.dumps(user_context, indent=2, default=str)}

Issue description: {issue_description}

Analyze the issue and respond in JSON:
{{
  "analysis": "What's happening and why",
  "root_cause": "Likely root cause",
  "suggestions": [
    {{"action": "what to do", "reasoning": "why", "priority": "high/medium/low"}}
  ],
  "draft_message": "A friendly, empathetic message to the user addressing their concern",
  "escalation_needed": false,
  "follow_up_recommended": true,
  "follow_up_days": 3
}}"""

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])

        return {"error": "Unable to parse CS analysis"}

    except Exception as e:
        logger.error(f"CS analysis failed: {e}")
        return {"error": str(e)}


async def generate_sales_suggestions(
    pipeline_data: Dict[str, Any],
    conversion_data: Dict[str, Any],
    at_risk_accounts: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    AI sales advisor - provides data-driven sales suggestions.
    """
    try:
        client = _get_client()

        prompt = f"""You are a Sales Intelligence advisor for CommonGround, a co-parenting SaaS platform.
Subscription tiers: Starter (free), Plus ($12/mo), Family Plus ($25/mo).
Professional tiers: Solo ($99/mo), Small Firm ($299/mo), Mid-Size ($799/mo).

Pipeline data:
{json.dumps(pipeline_data, indent=2, default=str)}

Conversion data:
{json.dumps(conversion_data, indent=2, default=str)}

{f"At-risk accounts: {json.dumps(at_risk_accounts, indent=2, default=str)}" if at_risk_accounts else ""}

Provide actionable suggestions in JSON:
{{
  "suggestions": [
    {{
      "type": "retention/upsell/acquisition/engagement",
      "target": "segment or specific action",
      "action": "what to do",
      "reasoning": "data-driven justification",
      "expected_impact": "estimated revenue or metric impact",
      "priority": "high/medium/low"
    }}
  ],
  "key_insight": "One sentence summary of the most important finding",
  "revenue_opportunity": "Estimated monthly revenue opportunity"
}}"""

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])

        return {"error": "Unable to parse sales suggestions"}

    except Exception as e:
        logger.error(f"Sales suggestions failed: {e}")
        return {"error": str(e)}


async def generate_marketing_suggestions(
    content_performance: Optional[List[Dict[str, Any]]] = None,
    campaign_metrics: Optional[Dict[str, Any]] = None,
    acquisition_sources: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    AI marketing advisor - suggests content ideas, campaigns, and optimizations.
    """
    try:
        client = _get_client()

        prompt = f"""You are a Marketing Intelligence advisor for CommonGround, a co-parenting platform.
The platform helps divorced/separated parents manage custody, communication, and finances.
Target audience: parents going through separation/divorce, family law attorneys, mediators.

{f"Content performance: {json.dumps(content_performance, indent=2, default=str)}" if content_performance else ""}
{f"Campaign metrics: {json.dumps(campaign_metrics, indent=2, default=str)}" if campaign_metrics else ""}
{f"Acquisition sources: {json.dumps(acquisition_sources, indent=2, default=str)}" if acquisition_sources else ""}

Provide marketing suggestions in JSON:
{{
  "content_ideas": [
    {{"title": "...", "type": "blog/guide/video/social", "target_audience": "...", "estimated_impact": "..."}}
  ],
  "campaign_suggestions": [
    {{"name": "...", "channel": "email/social/paid/seo", "target_segment": "...", "messaging": "...", "cta": "..."}}
  ],
  "audience_insights": ["insight 1", "insight 2"],
  "timing_recommendations": ["when to post/send what"],
  "quick_wins": ["immediately actionable items"]
}}"""

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])

        return {"error": "Unable to parse marketing suggestions"}

    except Exception as e:
        logger.error(f"Marketing suggestions failed: {e}")
        return {"error": str(e)}
