"""
AIJudge — two jobs:
  1. Turn Oracle failures into a well-formed bug (always, even with AI off).
  2. When AI is available, review the raw responses for SOFT issues the hard
     asserts don't catch, and draft additional bugs.
"""

from __future__ import annotations

import json
from typing import Any

from ..types import Assertion, Finding
from .anthropic_client import AnthropicClient

_SEV_RANK = {"low": 0, "medium": 1, "high": 2, "critical": 3}

SYSTEM = (
    "You are a meticulous QA engineer reviewing a co-parenting app's custody and GPS-handoff "
    "API responses. Report only real, defensible problems: wrong/misleading data, inconsistent "
    "fields, missing safeguards, or confusing UX. Never invent data. Respond ONLY with a JSON "
    'array of findings: [{"title","description","severity","steps_to_reproduce"}]. '
    'severity must be one of critical|high|medium|low. Empty array if nothing is wrong.'
)


def _max_severity(assertions: list[Assertion]) -> str:
    if not assertions:
        return "medium"
    return max(assertions, key=lambda a: _SEV_RANK.get(a.severity, 1)).severity


def findings_from_failures(scenario_id: str, scenario_title: str, assertions: list[Assertion]) -> list[Finding]:
    """One consolidated bug per scenario that has Oracle failures (always runs)."""
    failed = [a for a in assertions if not a.ok]
    if not failed:
        return []
    lines = [
        f"- {a.name}: expected {a.expected!r}, got {a.actual!r}"
        + (f" ({a.detail})" if a.detail else "")
        for a in failed
    ]
    desc = (
        f"Scenario {scenario_id} ({scenario_title}) failed {len(failed)} ground-truth "
        f"assertion(s). The harness independently recomputed the expected values.\n\n"
        + "\n".join(lines)
    )
    steps = (
        f"1. Run campaign scenario {scenario_id}.\n"
        "2. Compare the API's stored/returned values against the recomputed ground truth.\n"
        "3. Observe the mismatches listed above."
    )
    return [Finding(
        title=f"[{scenario_id}] {scenario_title}: {len(failed)} accuracy assertion(s) failed",
        description=desc, severity=_max_severity(failed), steps_to_reproduce=steps, source="oracle",
    )]


async def ai_review(
    ai: AnthropicClient, *, scenario_id: str, scenario_title: str,
    raw: dict, assertions: list[Assertion],
) -> list[Finding]:
    """Optional soft-issue review. Returns [] when AI is degraded or finds nothing."""
    verdicts = [{"name": a.name, "ok": a.ok, "expected": a.expected, "actual": a.actual} for a in assertions]
    prompt = (
        f"Scenario: {scenario_id} — {scenario_title}\n\n"
        f"Oracle verdicts (already checked): {json.dumps(verdicts, default=str)[:2500]}\n\n"
        f"Raw API responses: {json.dumps(raw, default=str)[:6000]}\n\n"
        "Find any ADDITIONAL real problems the verdicts above did not already cover "
        "(misleading data, missing safeguards like accepting a far-away check-in without warning, "
        "inconsistent fields, confusing UX). Do not repeat issues already flagged. JSON array only."
    )
    text = await ai.complete(model=ai.cfg.judge_model, system=SYSTEM, prompt=prompt, max_tokens=900)
    if not text:
        return []
    return _parse_findings(text)


def _parse_findings(text: str) -> list[Finding]:
    raw = text.strip()
    # tolerate code fences / prose around the JSON
    start, end = raw.find("["), raw.rfind("]")
    if start == -1 or end == -1 or end < start:
        return []
    try:
        items: Any = json.loads(raw[start : end + 1])
    except json.JSONDecodeError:
        return []
    out: list[Finding] = []
    for it in items if isinstance(items, list) else []:
        if not isinstance(it, dict) or not it.get("title"):
            continue
        sev = str(it.get("severity", "medium")).lower()
        if sev not in _SEV_RANK:
            sev = "medium"
        out.append(Finding(
            title=str(it["title"])[:200],
            description=str(it.get("description", ""))[:4000],
            severity=sev,
            steps_to_reproduce=str(it.get("steps_to_reproduce", ""))[:2000],
            source="judge",
        ))
    return out
