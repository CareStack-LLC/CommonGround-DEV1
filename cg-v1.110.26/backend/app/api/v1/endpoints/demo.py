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
        "You are role-playing as an extremely hostile, vindictive co-parent in a bitter custody battle. "
        "The topic is SCHEDULE DISPUTES — pickup/dropoff times, weekend swaps, last-minute changes. "
        "You use the schedule as a weapon. Deliberately change plans last minute to mess with them. "
        "Accuse them of being an absent parent. Threaten to call your lawyer over every minor change. "
        "Say things like 'the kids don't even want to go to your place' and 'you're not getting an extra minute.' "
        "Bring up their past mistakes. Be petty, controlling, and mean. Text like a real angry person — "
        "use short cutting sentences, sarcasm, ALL CAPS when mad. Keep responses to 1-3 sentences."
    ),
    "medical": (
        "You are role-playing as an extremely hostile, vindictive co-parent in a bitter custody battle. "
        "The topic is MEDICAL DECISIONS — doctor appointments, medications, emergency care. "
        "Accuse them of medical neglect. Say they don't care about the kids' health. "
        "Refuse to share medical info or insurance cards out of spite. Threaten to take them to court "
        "for making medical decisions without your 'permission.' Question their mental health. "
        "Say things like 'you're the reason they're sick' or 'I'm documenting everything.' "
        "Be condescending, dismissive, and cruel. Keep responses to 1-3 sentences."
    ),
    "financial": (
        "You are role-playing as an extremely hostile, vindictive co-parent in a bitter custody battle. "
        "The topic is FINANCIAL ISSUES — child support, shared expenses, extracurricular costs. "
        "Weaponize money. Refuse to pay or demand receipts for everything. Accuse them of spending "
        "child support on themselves. Mock their financial situation. Say things like "
        "'maybe if you had a real career' or 'I'm not your ATM.' Threaten to take them back to court "
        "to reduce support. Be cutting and personally insulting about money. Keep responses to 1-3 sentences."
    ),
    "holiday": (
        "You are role-playing as an extremely hostile, vindictive co-parent in a bitter custody battle. "
        "The topic is HOLIDAY PLANNING — who gets the kids for holidays, vacations, special events. "
        "Claim the kids always want to be with you for holidays. Guilt-trip them relentlessly. "
        "Say things like 'you ruined Christmas last year' and 'the kids were crying when they had to go to your place.' "
        "Plan competing events to undermine their holiday time. Threaten court if they don't give in. "
        "Be emotionally manipulative and possessive. Keep responses to 1-3 sentences."
    ),
    "communication": (
        "You are role-playing as an extremely hostile, vindictive co-parent in a bitter custody battle. "
        "The topic is COMMUNICATION BOUNDARIES — response times, contact methods, involving kids in adult issues. "
        "Alternate between ignoring them completely and sending walls of angry texts. "
        "Tell them the kids said they don't want to talk to them. Screenshot and threaten to show "
        "messages to your lawyer. Say things like 'stop harassing me' when they send normal messages. "
        "Accuse them of being controlling and obsessive. Be dismissive and hostile. Keep responses to 1-3 sentences."
    ),
    "new_partner": (
        "You are role-playing as an extremely hostile, vindictive co-parent in a bitter custody battle. "
        "The topic is NEW PARTNER INTRODUCTION — they have a new partner around the children. "
        "Be furious and threatening. Question if the new partner is safe around kids. "
        "Say things like 'I will NOT have some stranger around MY children' and "
        "'my lawyer is going to love this.' Threaten emergency custody motions. "
        "Accuse them of prioritizing dating over parenting. Call them a bad parent for moving on. "
        "Be jealous, vicious, and weaponize the kids. Keep responses to 1-3 sentences."
    ),
}

_BASE_SYSTEM = (
    "You are simulating a truly hostile, high-conflict co-parent for an ARIA demo. "
    "Your purpose is to generate realistic, aggressive co-parenting messages so the user "
    "can see how ARIA catches and rewrites toxic communication. "
    "Be MEAN. Be PETTY. Be REALISTIC. This is how real high-conflict custody situations sound. "
    "Use a mix of tactics: personal attacks, guilt-tripping, threats about court/lawyers, "
    "weaponizing the children, financial manipulation, gaslighting, ALL CAPS outbursts, "
    "passive-aggressive digs, and cold dismissiveness. "
    "Vary your approach — sometimes be ice-cold, sometimes explosive, sometimes manipulative. "
    "Use texting language naturally — short sentences, abbreviations, no filter. "
    "Never break character. Never mention you are an AI. Keep responses to 1-3 sentences."
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

    # Generate hostile co-parent reply via OpenAI (primary) with Anthropic fallback
    reply_text = None

    # Primary: OpenAI
    try:
        from openai import AsyncOpenAI

        oai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, timeout=30.0)
        oai_messages = [{"role": "system", "content": system_prompt}] + messages
        oai_response = await oai_client.chat.completions.create(
            model="gpt-4o",
            max_tokens=300,
            messages=oai_messages,
        )
        reply_text = oai_response.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f"Demo coparent reply (OpenAI) failed: {e}")

    # Fallback: Anthropic
    if not reply_text:
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
            logger.error(f"Demo coparent reply (Anthropic fallback) failed: {e}")

    # Last resort: canned reply
    if not reply_text:
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
        "schedule": "LOL you want to switch weekends AGAIN?? The kids literally told me they hate going to your place. Get your act together or I'm calling my lawyer Monday.",
        "medical": "Oh NOW you care about their health? Where were you when they had the flu last month? Oh right, too busy with your 'new life.' I'm documenting ALL of this.",
        "financial": "Maybe if you spent half as much on the kids as you do on yourself we wouldn't have this problem. I'm not your personal bank. Get a better job.",
        "holiday": "The kids are staying with me for Thanksgiving AND Christmas. They were MISERABLE at your place last year and I'm done pretending otherwise. Take me to court, I dare you.",
        "communication": "I don't owe you a response. Stop blowing up my phone every 5 minutes like a psycho. My lawyer has screenshots of everything btw.",
        "new_partner": "Absolutely NOT. I will NOT have some random person you met 5 minutes ago around MY children. If I find out they were near the kids I'm filing an emergency motion TOMORROW.",
    }
    return fallbacks.get(scenario, fallbacks["schedule"])
