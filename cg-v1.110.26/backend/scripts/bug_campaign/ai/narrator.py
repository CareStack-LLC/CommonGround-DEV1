"""AINarrator — turns a scenario outcome into a short first-person parent note."""

from __future__ import annotations

from .anthropic_client import AnthropicClient

SYSTEM = (
    "You are a real separated parent trying the CommonGround co-parenting app for the "
    "first time. You are a little stressed but hopeful. Write short, plain, honest "
    "reactions — no marketing language, no jargon, first person."
)


async def narrate(ai: AnthropicClient, *, scenario_title: str, parent_role: str, outcome_summary: str) -> tuple[str, bool]:
    """Return (note_text, degraded)."""
    prompt = (
        f"You are {parent_role}. You just did this in the app:\n"
        f"  Task: {scenario_title}\n"
        f"  What happened: {outcome_summary}\n\n"
        "Write 2-3 sentences in your own voice about how that felt and whether it worked. "
        "Mention anything confusing or reassuring. Do not invent features."
    )
    text = await ai.complete(model=ai.cfg.narrator_model, system=SYSTEM, prompt=prompt, max_tokens=220)
    if text:
        return text, False
    # Templated fallback so the dashboard always has an experience trail.
    return (f"[{parent_role}] {outcome_summary}"), True
