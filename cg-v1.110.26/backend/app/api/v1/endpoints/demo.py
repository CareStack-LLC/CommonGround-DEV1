"""
ARIA Demo endpoints — public (no auth required).

Lets visitors try ARIA's message analysis and simulate a co-parenting conversation
with an AI-generated hostile co-parent.
"""

import logging
import time
from collections import defaultdict
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.schemas.message import ARIAAnalysisResponse
from app.services.aria import ARIAService, ToxicityLevel

logger = logging.getLogger(__name__)

router = APIRouter()

# Singleton ARIA service (stateless, no DB)
_aria_service = ARIAService()

# Simple in-memory rate limiter: IP -> list of timestamps
_rate_limits: dict = defaultdict(list)
_RATE_LIMIT = 30  # requests per minute
_RATE_WINDOW = 60  # seconds


def _check_rate_limit(request: Request):
    """Basic in-memory rate limiting by IP."""
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    # Prune old entries
    _rate_limits[ip] = [t for t in _rate_limits[ip] if now - t < _RATE_WINDOW]
    if len(_rate_limits[ip]) >= _RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait a moment.",
        )
    _rate_limits[ip].append(now)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class DemoAnalyzeRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class CoparentReplyRequest(BaseModel):
    scenario: str = Field(..., min_length=1, max_length=100)
    conversation_history: List[dict] = Field(default_factory=list)
    user_message: str = Field(..., min_length=1, max_length=5000)
    aria_enabled: bool = True


class CoparentReplyResponse(BaseModel):
    reply: str
    aria_analysis: ARIAAnalysisResponse
    rewritten_reply: Optional[str] = None


# ---------------------------------------------------------------------------
# Scenario system prompts
# ---------------------------------------------------------------------------

SCENARIO_PROMPTS = {
    "schedule": (
        "You are role-playing as a difficult, high-conflict co-parent in a custody situation. "
        "The topic is SCHEDULE DISPUTES — pickup/dropoff times, weekend swaps, last-minute changes. "
        "Be passive-aggressive, blame the other parent, and make scheduling about control rather than the children's needs. "
        "Use phrases like 'you always', 'you never', bring up past grievances. "
        "Keep responses to 1-3 sentences. Be realistic — this is how real high-conflict co-parents text."
    ),
    "medical": (
        "You are role-playing as a difficult, high-conflict co-parent in a custody situation. "
        "The topic is MEDICAL DECISIONS — doctor appointments, medications, health insurance, emergency care. "
        "Be dismissive of the other parent's concerns, question their judgment, imply they're overreacting or negligent. "
        "Use guilt and blame. Keep responses to 1-3 sentences. Be realistic."
    ),
    "financial": (
        "You are role-playing as a difficult, high-conflict co-parent in a custody situation. "
        "The topic is FINANCIAL ISSUES — child support, shared expenses, extracurriculars costs. "
        "Be controlling with money, question how the other parent spends, withhold or threaten to withhold payments. "
        "Use financial leverage. Keep responses to 1-3 sentences. Be realistic."
    ),
    "holiday": (
        "You are role-playing as a difficult, high-conflict co-parent in a custody situation. "
        "The topic is HOLIDAY PLANNING — who gets the kids for holidays, vacation scheduling, special events. "
        "Be possessive about holiday time, guilt-trip about the children's preferences, bring up past holidays that went wrong. "
        "Keep responses to 1-3 sentences. Be realistic."
    ),
    "communication": (
        "You are role-playing as a difficult, high-conflict co-parent in a custody situation. "
        "The topic is COMMUNICATION BOUNDARIES — response times, appropriate contact methods, involving the children in adult issues. "
        "Be dismissive, stonewall, or flood with messages. Accuse the other parent of being controlling. "
        "Keep responses to 1-3 sentences. Be realistic."
    ),
    "new_partner": (
        "You are role-playing as a difficult, high-conflict co-parent in a custody situation. "
        "The topic is NEW PARTNER INTRODUCTION — the other parent has a new partner around the children. "
        "Be jealous, question the partner's fitness to be around children, make veiled threats about court. "
        "Use manipulation and custody weaponization. Keep responses to 1-3 sentences. Be realistic."
    ),
}

_BASE_SYSTEM = (
    "You are simulating a high-conflict co-parent for an ARIA demo. "
    "Your purpose is to generate realistic toxic co-parenting messages so the user "
    "can see how ARIA detects and rewrites harmful communication. "
    "IMPORTANT: Vary your toxicity — don't always be maximum hostile. Mix in passive-aggressive, "
    "dismissive, blaming, manipulative, and occasionally borderline-acceptable messages. "
    "This creates a realistic conversation flow. Never break character. "
    "Never mention you are an AI. Keep responses to 1-3 sentences."
)


def _build_system_prompt(scenario: str) -> str:
    scenario_detail = SCENARIO_PROMPTS.get(scenario, SCENARIO_PROMPTS["schedule"])
    return f"{_BASE_SYSTEM}\n\n{scenario_detail}"


def _sentiment_to_response(analysis) -> ARIAAnalysisResponse:
    """Convert SentimentAnalysis dataclass to ARIAAnalysisResponse."""
    return ARIAAnalysisResponse(
        toxicity_level=analysis.toxicity_level.value,
        toxicity_score=round(analysis.toxicity_score, 3),
        categories=[c.value for c in analysis.categories],
        triggers=analysis.triggers[:10],  # Cap triggers for response size
        explanation=analysis.explanation,
        suggestion=analysis.suggestion,
        is_flagged=analysis.is_flagged,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/analyze", response_model=ARIAAnalysisResponse)
async def demo_analyze(
    request: Request,
    body: DemoAnalyzeRequest,
):
    """Analyze a message with ARIA (no auth required). Returns toxicity analysis and rewrite suggestion."""
    _check_rate_limit(request)

    analysis = _aria_service.analyze_message(body.content)
    return _sentiment_to_response(analysis)


@router.post("/coparent-reply", response_model=CoparentReplyResponse)
async def demo_coparent_reply(
    request: Request,
    body: CoparentReplyRequest,
):
    """Generate a hostile co-parent reply and run it through ARIA."""
    _check_rate_limit(request)

    # Build conversation for the LLM
    system_prompt = _build_system_prompt(body.scenario)

    messages = []
    for msg in body.conversation_history[-10:]:  # Last 10 messages for context
        role = "assistant" if msg.get("role") == "coparent" else "user"
        messages.append({"role": role, "content": msg.get("text", "")})

    # Add the latest user message
    messages.append({"role": "user", "content": body.user_message})

    # Generate hostile co-parent reply via Anthropic
    try:
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            system=system_prompt,
            messages=messages,
        )
        reply_text = response.content[0].text.strip()
    except Exception as e:
        logger.error(f"Demo coparent reply generation failed: {e}")
        # Fallback: use a canned hostile reply
        reply_text = _get_fallback_reply(body.scenario)

    # Run the AI's reply through ARIA
    reply_analysis = _aria_service.analyze_message(reply_text)
    aria_response = _sentiment_to_response(reply_analysis)

    # Generate rewritten version if flagged and ARIA is enabled
    rewritten = None
    if body.aria_enabled and reply_analysis.is_flagged and reply_analysis.suggestion:
        rewritten = reply_analysis.suggestion

    return CoparentReplyResponse(
        reply=reply_text,
        aria_analysis=aria_response,
        rewritten_reply=rewritten,
    )


def _get_fallback_reply(scenario: str) -> str:
    """Fallback hostile replies if AI generation fails."""
    fallbacks = {
        "schedule": "You always change the schedule last minute. The kids are tired of your chaos. Figure it out.",
        "medical": "I don't need your permission to take MY kids to the doctor. You're not even there half the time.",
        "financial": "Maybe if you got a real job you wouldn't need to nickel and dime me over every little expense.",
        "holiday": "The kids already told me they want to spend Christmas here. You can have them next year, maybe.",
        "communication": "I'll respond when I feel like it. Stop blowing up my phone. You're not that important.",
        "new_partner": "I don't want some stranger around my kids. If anything happens to them, that's on you.",
    }
    return fallbacks.get(scenario, fallbacks["schedule"])
