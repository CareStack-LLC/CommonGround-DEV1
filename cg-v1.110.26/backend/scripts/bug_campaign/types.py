"""Shared result types used across the harness (no heavy deps → no import cycles)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

# Valid bug-hunt severities (mirror bug_hunt_tester.VALID_SEVERITIES).
SEVERITIES = {"critical", "high", "medium", "low"}


@dataclass
class Assertion:
    """A single ground-truth check with expected vs actual for the ledger."""
    name: str
    ok: bool
    expected: Any = None
    actual: Any = None
    detail: str = ""
    severity: str = "high"  # severity to file if this fails

    def to_dict(self) -> dict:
        return {
            "name": self.name, "ok": self.ok, "expected": self.expected,
            "actual": self.actual, "detail": self.detail, "severity": self.severity,
        }


@dataclass
class Finding:
    """A bug to file (from a failed assertion or the AI judge)."""
    title: str
    description: str
    severity: str = "high"
    steps_to_reproduce: str = ""
    source: str = "oracle"  # oracle | judge

    def to_dict(self) -> dict:
        return {
            "title": self.title, "description": self.description, "severity": self.severity,
            "steps_to_reproduce": self.steps_to_reproduce, "source": self.source,
        }


@dataclass
class ScenarioResult:
    scenario_id: str
    scenario_title: str
    family_id: str
    day: int
    assertions: list[Assertion] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)
    note: str = ""                       # narrator "parent experience" note
    raw: dict = field(default_factory=dict)   # captured API responses (trimmed)
    error: Optional[str] = None          # scenario crashed before finishing
    ai_degraded: bool = False
    duration_ms: int = 0
    bugs_posted: list[str] = field(default_factory=list)
    note_id: Optional[str] = None

    @property
    def passed(self) -> bool:
        return self.error is None and all(a.ok for a in self.assertions)

    @property
    def failed_assertions(self) -> list[Assertion]:
        return [a for a in self.assertions if not a.ok]

    def to_dict(self) -> dict:
        return {
            "scenario_id": self.scenario_id, "scenario_title": self.scenario_title,
            "family_id": self.family_id, "day": self.day, "passed": self.passed,
            "error": self.error, "ai_degraded": self.ai_degraded, "duration_ms": self.duration_ms,
            "assertions": [a.to_dict() for a in self.assertions],
            "findings": [f.to_dict() for f in self.findings],
            "bugs_posted": self.bugs_posted, "note_id": self.note_id,
        }
