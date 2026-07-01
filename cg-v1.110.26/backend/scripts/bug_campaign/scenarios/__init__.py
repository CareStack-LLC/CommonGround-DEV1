"""Scenario registry."""

from __future__ import annotations

from .base import FamilyContext, Scenario, ScenarioOutcome
from . import geocode, handoff, schedules

ALL_SCENARIOS: list[Scenario] = [*handoff.SCENARIOS, *schedules.SCENARIOS, *geocode.SCENARIOS]

SCENARIO_REGISTRY: dict[str, Scenario] = {s.id: s for s in ALL_SCENARIOS}


def scenarios_for(mapbox_enabled: bool = True) -> list[Scenario]:
    if mapbox_enabled:
        return list(ALL_SCENARIOS)
    return [s for s in ALL_SCENARIOS if s.feature != "geocode"]


__all__ = ["FamilyContext", "Scenario", "ScenarioOutcome", "ALL_SCENARIOS", "SCENARIO_REGISTRY", "scenarios_for"]
