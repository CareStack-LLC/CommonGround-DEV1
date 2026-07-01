"""ScenarioRunner — execute one scenario for one family and produce a ScenarioResult."""

from __future__ import annotations

import logging
import time

from .ai import judge as judge_mod
from .ai.anthropic_client import AnthropicClient
from .ai.narrator import narrate
from .config import CampaignConfig
from .scenarios.base import FamilyContext, Scenario
from .types import Finding, ScenarioResult

logger = logging.getLogger("bug_campaign.runner")

_MAX_RAW_CHARS = 20000


def _trim_raw(raw: dict) -> dict:
    import json

    try:
        s = json.dumps(raw, default=str)
    except Exception:
        return {"_note": "raw not serializable"}
    if len(s) <= _MAX_RAW_CHARS:
        return raw
    return {"_truncated": True, "_preview": s[:_MAX_RAW_CHARS]}


class ScenarioRunner:
    def __init__(self, cfg: CampaignConfig, ai: AnthropicClient):
        self.cfg = cfg
        self.ai = ai

    async def run(self, scenario: Scenario, ctx: FamilyContext) -> ScenarioResult:
        start = time.monotonic()
        result = ScenarioResult(
            scenario_id=scenario.id, scenario_title=scenario.title,
            family_id=ctx.family_id, day=ctx.day,
        )
        try:
            outcome = await scenario.run(ctx)
            result.assertions = outcome.assertions
            result.raw = _trim_raw(outcome.raw)

            note, degraded = await narrate(
                self.ai, scenario_title=scenario.title,
                parent_role="Parent A" if scenario.feature != "geocode" else "a parent",
                outcome_summary=outcome.summary or scenario.title,
            )
            result.note = note
            result.ai_degraded = degraded or self.ai.degraded

            result.findings = judge_mod.findings_from_failures(
                scenario.id, scenario.title, outcome.assertions
            )
            result.findings += await judge_mod.ai_review(
                self.ai, scenario_id=scenario.id, scenario_title=scenario.title,
                raw=result.raw, assertions=outcome.assertions,
            )
        except Exception as e:  # a scenario crash is itself a finding
            logger.warning("scenario %s crashed: %s", scenario.id, e)
            result.error = f"{type(e).__name__}: {e}"
            result.findings.append(Finding(
                title=f"[{scenario.id}] {scenario.title}: scenario crashed",
                description=f"The scenario raised an unhandled error while driving the real API:\n{e}",
                severity="high",
                steps_to_reproduce=f"Run campaign scenario {scenario.id} for this family.",
                source="oracle",
            ))
            if not result.note:
                result.note = f"[Parent A] Tried '{scenario.title}' but the app errored: {e}"
                result.ai_degraded = True

        result.duration_ms = int((time.monotonic() - start) * 1000)
        return result
