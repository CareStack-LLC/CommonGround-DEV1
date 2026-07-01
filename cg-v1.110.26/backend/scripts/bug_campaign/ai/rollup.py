"""Daily AI rollup — a short human digest of a day's results."""

from __future__ import annotations

import json

from ..types import ScenarioResult
from .anthropic_client import AnthropicClient

SYSTEM = (
    "You are a QA lead writing a brief daily status for a co-parenting app bug campaign. "
    "Be concise, factual, and specific about custody-tracking and GPS-handoff accuracy."
)


def _counts(results: list[ScenarioResult]) -> dict:
    bugs = sum(len(r.findings) for r in results)
    by_sev: dict[str, int] = {}
    for r in results:
        for f in r.findings:
            by_sev[f.severity] = by_sev.get(f.severity, 0) + 1
    return {
        "scenarios_run": len(results),
        "scenarios_passed": sum(1 for r in results if r.passed),
        "scenarios_failed": sum(1 for r in results if not r.passed),
        "bugs_filed": bugs,
        "bugs_by_severity": by_sev,
    }


async def rollup(ai: AnthropicClient, day: int, results: list[ScenarioResult]) -> str:
    counts = _counts(results)
    fallback = (
        f"Day {day}: {counts['scenarios_passed']}/{counts['scenarios_run']} scenarios passed, "
        f"{counts['bugs_filed']} bug(s) filed {counts['bugs_by_severity'] or ''}."
    )
    failures = [
        {"scenario": r.scenario_id, "failed": [a.name for a in r.failed_assertions],
         "findings": [f.title for f in r.findings]}
        for r in results if not r.passed
    ][:20]
    prompt = (
        f"Day {day} results:\n{json.dumps(counts)}\n\n"
        f"Failures/findings:\n{json.dumps(failures, default=str)[:5000]}\n\n"
        "Write a 3-5 sentence digest: overall health of custody tracking and GPS handoff, "
        "the most important issues, and what to look at next."
    )
    text = await ai.complete(model=ai.cfg.judge_model, system=SYSTEM, prompt=prompt, max_tokens=500)
    return text or fallback
