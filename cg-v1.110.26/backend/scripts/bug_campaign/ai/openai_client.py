"""Thin, graceful-degrading async OpenAI completer for the simulation narrator.

Same interface as AnthropicClient (complete / degraded / degraded_reason) so the
runner can use either. OpenAI's models are markedly more willing to produce the
labeled adversarial co-parenting messages the sim needs to exercise ARIA's
toxicity filter — Claude Haiku refuses the tone=hostile prompt and its refusal
prose was being sent as the message, so ARIA had nothing real to catch.
"""

from __future__ import annotations

import logging
from typing import Optional

from ..config import CampaignConfig

logger = logging.getLogger("bug_campaign.ai")

# gpt-4o-mini: cheap, fast, and reliably complies with clearly-framed
# moderation-test content generation.
DEFAULT_OPENAI_MODEL = "gpt-4o-mini"


class OpenAIClient:
    def __init__(self, cfg: CampaignConfig):
        self.cfg = cfg
        self.model = DEFAULT_OPENAI_MODEL
        self.enabled = bool(cfg.ai_enabled and cfg.openai_api_key)
        self.spent_tokens = 0
        self._client = None
        self.degraded_reason: Optional[str] = None
        if not self.enabled:
            self.degraded_reason = "disabled_or_no_key"
            return
        try:
            from openai import AsyncOpenAI  # type: ignore

            self._client = AsyncOpenAI(api_key=cfg.openai_api_key)
        except Exception as e:  # SDK missing or bad key
            self.enabled = False
            self.degraded_reason = f"sdk_unavailable: {e}"

    @property
    def degraded(self) -> bool:
        return not self.enabled

    async def complete(self, *, model: str, system: str, prompt: str, max_tokens: int = 600) -> Optional[str]:
        """Return the model's text, or None if degraded / over budget / on error."""
        if not self.enabled or self._client is None:
            return None
        if self.cfg.ai_daily_token_budget and self.spent_tokens >= self.cfg.ai_daily_token_budget:
            self.degraded_reason = "budget_exhausted"
            return None
        try:
            resp = await self._client.chat.completions.create(
                model=model or self.model,
                max_tokens=max_tokens,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
            )
            usage = getattr(resp, "usage", None)
            if usage is not None:
                self.spent_tokens += (getattr(usage, "prompt_tokens", 0) or 0) + (
                    getattr(usage, "completion_tokens", 0) or 0
                )
            choice = resp.choices[0] if resp.choices else None
            text = (choice.message.content if choice and choice.message else "") or ""
            return text.strip() or None
        except Exception as e:
            logger.warning("OpenAI call failed (degrading): %s", e)
            self.degraded_reason = f"api_error: {e}"
            return None
