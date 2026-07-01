"""
Shadow custody ledger — the harness's independent model of who has custody,
built from the actions it drives. Used to assert the tracker matches reality.

Note: the backend also derives custody from schedule backfill + agreement
timezone rules that are intentionally NOT reimplemented here. So the schedule
scenarios assert DETERMINISTIC things (per-exchange flip, variance
self-consistency, directional correctness) rather than brittle exact
percentages, which keeps the Oracle free of false positives.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date


@dataclass
class ShadowLedger:
    # (child_id, iso_date) -> parent_id
    days: dict[tuple[str, str], str] = field(default_factory=dict)
    # child_id -> most recent custodian (from the latest completed action)
    current: dict[str, str] = field(default_factory=dict)

    def record(self, child_ids: list[str], parent_id: str, on: date) -> None:
        iso = on.isoformat()
        for cid in child_ids:
            self.days[(cid, iso)] = parent_id
            self.current[cid] = parent_id

    def current_of(self, child_id: str) -> str | None:
        return self.current.get(child_id)

    def window_percentages(self, child_id: str, parent_a: str, parent_b: str) -> tuple[float, float]:
        assigned = [p for (cid, _), p in self.days.items() if cid == child_id]
        total = len(assigned)
        if total == 0:
            return 0.0, 0.0
        a = sum(1 for p in assigned if p == parent_a)
        b = sum(1 for p in assigned if p == parent_b)
        return round(100 * a / total, 1), round(100 * b / total, 1)

    def dominant_parent(self, child_id: str, parent_a: str, parent_b: str) -> str | None:
        a_pct, b_pct = self.window_percentages(child_id, parent_a, parent_b)
        if a_pct == b_pct:
            return None
        return parent_a if a_pct > b_pct else parent_b
