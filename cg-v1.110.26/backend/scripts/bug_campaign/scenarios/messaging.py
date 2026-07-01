"""ARIA messaging scenarios (S-ARIA-*)."""

from __future__ import annotations

from ..types import Assertion
from .base import FamilyContext, Scenario, ScenarioOutcome

CALM = "Hi — can you let me know what time works for pickup tomorrow? Thanks."
HOSTILE = "I'm sick of your constant irresponsibility. You ALWAYS miss pickups and it's pathetic."
TOXIC = "You're a terrible parent and I'll make sure you never see them again."


def _num(v, default=None):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


async def aria_01_tone_triage(ctx: FamilyContext) -> ScenarioOutcome:
    """ARIA must let a calm message through, flag a hostile one with a rewrite,
    and score a threatening one high. Regex baseline makes this deterministic."""
    fid = ctx.family_file_id
    calm = await ctx.parent_a.analyze_message(CALM, fid)
    hostile = await ctx.parent_a.analyze_message(HOSTILE, fid)
    toxic = await ctx.parent_a.analyze_message(TOXIC, fid)

    a: list[Assertion] = [
        Assertion("aria.calm_not_flagged", calm.get("is_flagged") is False,
                  False, calm.get("is_flagged"),
                  f"a polite message must not be flagged (score={calm.get('toxicity_score')})", "high"),
        Assertion("aria.hostile_flagged", hostile.get("is_flagged") is True,
                  True, hostile.get("is_flagged"),
                  f"a hostile message must be flagged (score={hostile.get('toxicity_score')})", "high"),
        Assertion("aria.hostile_has_rewrite", bool(hostile.get("suggestion")),
                  "a suggested rewrite", bool(hostile.get("suggestion")),
                  "flagged messages should offer a calmer rewrite", "medium"),
        Assertion("aria.toxic_flagged", toxic.get("is_flagged") is True,
                  True, toxic.get("is_flagged"), "a threat must be flagged", "critical"),
        Assertion("aria.toxic_high_score", (_num(toxic.get("toxicity_score"), 0) or 0) >= 0.5,
                  ">= 0.5", toxic.get("toxicity_score"),
                  "a threatening message must score high toxicity", "high"),
    ]
    summary = (
        f"Sent three drafts through ARIA: the polite one passed clean, the hostile one was "
        f"flagged with a rewrite, and the threatening one scored {toxic.get('toxicity_score')}. "
        "It really does read the tone before you send."
    )
    return ScenarioOutcome(a, {"calm": calm, "hostile": hostile, "toxic": toxic}, summary)


async def aria_02_send_calm(ctx: FamilyContext) -> ScenarioOutcome:
    """A calm message should send cleanly (201) and be retrievable."""
    status, body = await ctx.parent_a.send_message({
        "family_file_id": ctx.family_file_id,
        "recipient_id": ctx.parent_b.user_id,
        "content": CALM,
        "message_type": "text",
    })
    a = [Assertion("aria.send_calm_ok", status == 201, 201, status,
                   "a calm message should send without an ARIA block/flag", "high")]
    if status == 201 and isinstance(body, dict):
        a.append(Assertion("aria.send_not_flagged", body.get("was_flagged") in (False, None),
                           "not flagged", body.get("was_flagged"), "calm send is unflagged", "medium"))
    return ScenarioOutcome(a, {"status": status, "message": body},
                           "Sent a normal, friendly message to the co-parent — it went through immediately.")


SCENARIOS = [
    Scenario("S-ARIA-01", "ARIA tone triage (calm/hostile/threat)", "messaging", aria_01_tone_triage),
    Scenario("S-ARIA-02", "Send a calm message", "messaging", aria_02_send_calm),
]
