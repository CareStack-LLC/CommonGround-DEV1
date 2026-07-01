"""Thin, graceful-degrading async wrapper around the Anthropic SDK."""

from __future__ import annotations

import logging
from typing import Optional

from ..config import CampaignConfig

logger = logging.getLogger("bug_campaign.ai")


class AnthropicClient:
    def __init__(self, cfg: CampaignConfig):
        self.cfg = cfg
        self.enabled = bool(cfg.ai_enabled and cfg.anthropic_api_key)
        self.spent_tokens = 0
        self._client = None
        self.degraded_reason: Optional[str] = None
        if not self.enabled:
            self.degraded_reason = "disabled_or_no_key"
            return
        try:
            from anthropic import AsyncAnthropic  # type: ignore

            self._client = AsyncAnthropic(api_key=cfg.anthropic_api_key)
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
            msg = await self._client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": prompt}],
            )
            usage = getattr(msg, "usage", None)
            if usage is not None:
                self.spent_tokens += (getattr(usage, "input_tokens", 0) or 0) + (
                    getattr(usage, "output_tokens", 0) or 0
                )
            parts = [b.text for b in msg.content if getattr(b, "type", None) == "text"]
            return "".join(parts).strip() or None
        except Exception as e:
            logger.warning("Anthropic call failed (degrading): %s", e)
            self.degraded_reason = f"api_error: {e}"
            return None
