"""
ARIA Sentinel Shield V2 — LLM Router & Decision Matrix

4-layer analysis architecture:
  Layer 1: Regex (ALWAYS runs) — fast pattern matching
  Layer 2: Thread Intelligence (rolling window + session memory)
  Layer 3: LLM Deep Analysis — triggered by heat/severity/novelty
  Layer 4: V3 Proactive Intelligence (beta, toggled separately)

OpenAI is the PRIMARY provider. Claude is available as future alternative.
Fallback chain: OpenAI → regex-only (graceful degradation).
"""

import json
import logging
from typing import Dict, Any, List, Optional

from openai import OpenAI

from app.core.config import settings
from app.services.aria_taxonomy_v2 import (
    V2Category, V2Domain, CATEGORY_REGISTRY,
    v2_categories_to_v1_labels, calculate_v2_score,
    get_max_severity, get_reporting_tags, get_domain_scores,
)
from app.services.aria_session_memory import format_session_context_for_llm
from app.services.aria_circuit_breaker import aria_breaker
from app.utils.sentry_helpers import capture_error, ai_span

logger = logging.getLogger(__name__)

# V2 system prompt for LLM deep analysis
V2_SYSTEM_PROMPT = """You are ARIA Sentinel Shield, an AI safety system for CommonGround — a co-parenting communication platform.

CRITICAL CONTEXT: All messages are COURT DOCUMENTATION reviewed by judges, attorneys, and guardians ad litem.

Analyze the message for these 32 categories across 8 domains:

COERCIVE CONTROL (CTRL):
- schedule_control: Unilaterally dictating schedule changes
- financial_control: Using money as leverage
- isolation_tactics: Cutting off support or information
- decision_override: Making joint decisions unilaterally

THREATS (THRT):
- direct_threat: Explicit threats of physical harm (ZERO TOLERANCE)
- veiled_threat: Implied or indirect threats
- legal_weaponization: Using legal system as weapon
- child_threat: Threats involving children (ZERO TOLERANCE)

PSYCHOLOGICAL ABUSE (PSYB):
- gaslighting: Denying reality, questioning memory
- blame_shifting: Deflecting responsibility
- minimization: Downplaying valid concerns
- invalidation: Dismissing feelings or experiences

CONTEMPT (CONT):
- name_calling: Direct insults
- character_attack: Attacking parenting ability
- mockery: Sarcasm and ridicule
- disgust_expression: Expressions of revulsion

ALIENATION (ALNT):
- child_alienation: Turning children against the other parent
- loyalty_conflict: Forcing children to choose sides
- info_gatekeeping: Withholding information about children
- relationship_sabotage: Undermining child-parent relationships

ESCALATION (ESCP):
- anger_escalation: Rapidly increasing aggression
- demand_escalation: Escalating demands or ultimatums
- boundary_violation: Ignoring stated boundaries
- pattern_acceleration: Increasing frequency of problems

MANIPULATION (MNIP):
- guilt_induction: Guilt-tripping
- emotional_blackmail: Threats of self-harm as leverage
- false_victimhood: Playing the victim
- triangulation: Involving third parties to pressure

PASSIVE AGGRESSION (PAGG):
- silent_treatment: Deliberate communication withdrawal
- weaponized_compliance: Technically complying while undermining
- backhanded_compliment: Hidden insults in compliments
- selective_memory: Conveniently forgetting agreements

For EACH detected category, provide a confidence score 0.0-1.0:
- 0.9-1.0: Clear, unambiguous detection
- 0.7-0.89: Strong indicators present
- 0.6-0.69: Moderate indicators, context-dependent
- Below 0.6: Do not include

IMPORTANT MODIFIERS:
- If the speaker uses negation ("I would never...", "I'm not saying..."), reduce confidence by 0.4
- If the statement is hypothetical ("What if...", "Suppose..."), reduce confidence by 0.2

Respond in valid JSON ONLY:
{
    "categories": {"category_name": confidence_score, ...},
    "triggers": ["specific problematic phrases"],
    "explanation": "Brief court-context explanation",
    "suggestion": "BIFF-method rewrite suggestion (Brief, Informative, Friendly, Firm)"
}"""


async def run_llm_deep_analysis(
    message: str,
    session_context: str = "",
    baseline_info: str = "",
    time_signals: Optional[List[str]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Layer 3: LLM Deep Analysis using OpenAI (primary).

    Only called when triggered by:
    - window_heat >= 3.5
    - regex severity >= 3
    - new pattern not in baseline

    Args:
        message: The message content to analyze
        session_context: Formatted session memory for context
        baseline_info: Baseline deviation info
        time_signals: Active time signal flags

    Returns:
        Dict with LLM analysis results, or None on failure.
    """
    if not settings.OPENAI_API_KEY:
        logger.warning("[ARIA V2] No OpenAI API key configured, skipping LLM analysis")
        return None

    if await aria_breaker.is_open():
        logger.info("[ARIA V2] Circuit breaker OPEN, skipping LLM deep analysis")
        return None

    try:
        from app.core.ai_clients import get_openai
        client = get_openai()

        # Build enriched user prompt
        context_parts = []
        if session_context:
            context_parts.append(f"SESSION HISTORY:\n{session_context}")
        if baseline_info:
            context_parts.append(f"BASELINE DEVIATION:\n{baseline_info}")
        if time_signals:
            context_parts.append(f"TIME SIGNALS: {', '.join(time_signals)}")

        context_block = "\n\n".join(context_parts)

        user_prompt = f"""Analyze this co-parenting message:

MESSAGE: "{message}"

{context_block}

Respond in JSON format with categories, triggers, explanation, and suggestion."""

        with ai_span("aria_v2_deep_analysis", "gpt-4o-mini", "openai") as span:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": V2_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
                max_tokens=512,
                response_format={"type": "json_object"},
            )
            if hasattr(response, "usage") and response.usage:
                span.set_data("input_tokens", response.usage.prompt_tokens)
                span.set_data("output_tokens", response.usage.completion_tokens)

        raw = response.choices[0].message.content
        result = json.loads(raw)

        # Parse LLM categories into V2Category format
        llm_categories: Dict[V2Category, float] = {}
        for cat_name, confidence in result.get("categories", {}).items():
            cat_name_clean = cat_name.lower().strip()
            try:
                v2_cat = V2Category(cat_name_clean)
                llm_categories[v2_cat] = float(confidence)
            except ValueError:
                # Try partial matching
                for member in V2Category:
                    if member.value in cat_name_clean or cat_name_clean in member.value:
                        llm_categories[member] = float(confidence)
                        break

        await aria_breaker.record_success()
        return {
            "categories": llm_categories,
            "triggers": result.get("triggers", []),
            "explanation": result.get("explanation", ""),
            "suggestion": result.get("suggestion"),
            "provider": "openai",
            "model": "gpt-4o-mini",
        }

    except Exception as e:
        await aria_breaker.record_failure(e)
        logger.error(f"[ARIA V2] LLM deep analysis failed: {e}")
        capture_error(e, tags={"service": "aria_v2", "operation": "llm_deep_analysis"})
        return None


async def run_llm_severity_analysis(
    message: str,
    session_context: str = "",
) -> Optional[Dict[str, Any]]:
    """
    Elevated analysis for severity 4-5 messages using a more capable model.
    Uses gpt-4o for higher accuracy on critical threats.

    Falls back to gpt-4o-mini if gpt-4o fails.
    """
    if not settings.OPENAI_API_KEY:
        return None

    if await aria_breaker.is_open():
        logger.info("[ARIA V2] Circuit breaker OPEN, skipping severity analysis")
        return None

    try:
        from app.core.ai_clients import get_openai
        client = get_openai()

        user_prompt = f"""CRITICAL SEVERITY ANALYSIS — this message requires careful review:

MESSAGE: "{message}"

{session_context}

This message has been flagged as severity 4-5 (high/severe). Analyze with extra care.
Respond in JSON format with categories, triggers, explanation, and suggestion."""

        with ai_span("aria_v2_severity_analysis", "gpt-4o", "openai") as span:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": V2_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
                max_tokens=512,
                response_format={"type": "json_object"},
            )
            if hasattr(response, "usage") and response.usage:
                span.set_data("input_tokens", response.usage.prompt_tokens)
                span.set_data("output_tokens", response.usage.completion_tokens)

        raw = response.choices[0].message.content
        result = json.loads(raw)

        llm_categories: Dict[V2Category, float] = {}
        for cat_name, confidence in result.get("categories", {}).items():
            try:
                v2_cat = V2Category(cat_name.lower().strip())
                llm_categories[v2_cat] = float(confidence)
            except ValueError:
                pass

        await aria_breaker.record_success()
        return {
            "categories": llm_categories,
            "triggers": result.get("triggers", []),
            "explanation": result.get("explanation", ""),
            "suggestion": result.get("suggestion"),
            "provider": "openai",
            "model": "gpt-4o",
        }

    except Exception as e:
        await aria_breaker.record_failure(e)
        logger.error(f"[ARIA V2] Severity analysis (gpt-4o) failed, trying gpt-4o-mini: {e}")
        # Fallback to standard analysis (respects breaker)
        return await run_llm_deep_analysis(message, session_context)


def merge_regex_and_llm_results(
    regex_categories: Dict[V2Category, float],
    llm_result: Optional[Dict[str, Any]],
) -> Dict[V2Category, float]:
    """
    Merge regex confidence scores with LLM confidence scores.

    Strategy: take the MAX confidence per category from either source.
    LLM can add NEW categories that regex missed.
    LLM can LOWER confidence if it determines regex was a false positive.
    """
    merged = dict(regex_categories)

    if not llm_result or "categories" not in llm_result:
        return merged

    llm_cats = llm_result["categories"]

    for cat, llm_conf in llm_cats.items():
        if isinstance(cat, V2Category):
            regex_conf = merged.get(cat, 0.0)
            # If LLM says low confidence and regex said high, trust LLM
            # (it has more context). Use weighted average favoring LLM.
            if regex_conf > 0 and llm_conf < 0.4:
                # LLM overrides regex false positive
                merged[cat] = llm_conf
            else:
                # Take the higher confidence
                merged[cat] = max(regex_conf, llm_conf)

    # Filter out below-threshold
    return {cat: conf for cat, conf in merged.items() if conf >= 0.6}
