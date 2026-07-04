"""
Family archetypes — EXACTLY the tables in docs/SIMULATION_2WEEK.md.

Every family gets an archetype tuple that fixes its custody pattern,
reliability, financial profile, and communication tone. Distributions are
deliberately uneven to mirror reality.

Deterministic assignment: each dimension's list is built from the distribution
counts in order, then shuffled with a single seeded RNG (random.Random(42)).
Family index i -> (custody[i], reliability[i], financial[i], tone[i]).
Same seed, same count -> same assignment, forever.
"""

from __future__ import annotations

import random
from dataclasses import dataclass

# ---- distribution tables (docs/SIMULATION_2WEEK.md) -------------------------

# Custody patterns (drop-off cadence)
CUSTODY_DISTRIBUTION: list[tuple[str, int]] = [
    ("every_weekend", 10),        # Parent B has kids Fri 18:00 -> Sun 18:00 every week
    ("alternating_weekends", 10), # every other weekend + Wed dinner exchange
    ("2_2_3", 10),                # Mon-Tue A / Wed-Thu B / Fri-Sun alternating
    ("week_on_week_off", 10),     # handoff every Monday 08:00
    ("3_4_4_3", 5),               # Wed + Sat handoffs, alternating long half
    ("split_week_5_2", 5),        # weekdays A, weekends B, Sun-evening return
]

# Reliability profiles (exchange + event behavior)
RELIABILITY_DISTRIBUTION: list[tuple[str, int]] = [
    ("always_reliable", 15),   # never misses; on time, GPS inside geofence
    ("mostly_reliable", 20),   # ~10% missed/late (scripted), events occasionally ignored
    ("one_flaky_parent", 10),  # A perfect; B misses ~25% of exchanges + most events
    ("chaotic", 5),            # both parents late/missing frequently; no-shows
]

# Financial profiles
FINANCIAL_DISTRIBUTION: list[tuple[str, int]] = [
    ("recurring_support", 20),  # monthly child support; payer marks paid on schedule; 5 pay late
    ("one_off_expenses", 15),   # 2-4 one-off expense requests, approve/decline mix
    ("both", 10),               # recurring support + occasional expense requests
    ("disputed", 5),            # expense requests declined + argued about in messages
]

# Communication tone
TONE_DISTRIBUTION: list[tuple[str, int]] = [
    ("cooperative", 20),  # polite logistics, zero expected ARIA flags
    ("tense", 15),        # mostly fine; 2-3 scripted borderline messages/wk
    ("hostile", 10),      # regular hostility/blame; ARIA should flag + suggest rewrites
    ("escalating", 5),    # week 1 cooperative -> week 2 increasingly hostile
]

LATE_PAYER_COUNT = 5  # "5 of these pay late" among recurring_support families


@dataclass(frozen=True)
class Archetype:
    custody: str
    reliability: str
    financial: str
    tone: str
    late_payer: bool  # recurring-support payer who pays late (scripted)

    @property
    def has_recurring_support(self) -> bool:
        return self.financial in ("recurring_support", "both")

    @property
    def has_one_off_expenses(self) -> bool:
        return self.financial in ("one_off_expenses", "both", "disputed")


def _expand(distribution: list[tuple[str, int]], count: int) -> list[str]:
    """Expand (name, n) pairs in order; cycle if count exceeds the table total."""
    base: list[str] = []
    for name, n in distribution:
        base.extend([name] * n)
    if count <= len(base):
        return base[:count]
    out = list(base)
    i = 0
    while len(out) < count:
        out.append(base[i % len(base)])
        i += 1
    return out


def assign_archetypes(count: int = 50) -> list[Archetype]:
    """Deterministic archetype per family index (seeded shuffle, seed=42)."""
    rng = random.Random(42)
    custody = _expand(CUSTODY_DISTRIBUTION, count)
    reliability = _expand(RELIABILITY_DISTRIBUTION, count)
    financial = _expand(FINANCIAL_DISTRIBUTION, count)
    tone = _expand(TONE_DISTRIBUTION, count)
    rng.shuffle(custody)
    rng.shuffle(reliability)
    rng.shuffle(financial)
    rng.shuffle(tone)

    # The first LATE_PAYER_COUNT recurring_support families (by index) pay late.
    late_indices: set[int] = set()
    for i in range(count):
        if financial[i] == "recurring_support" and len(late_indices) < LATE_PAYER_COUNT:
            late_indices.add(i)

    return [
        Archetype(
            custody=custody[i],
            reliability=reliability[i],
            financial=financial[i],
            tone=tone[i],
            late_payer=i in late_indices,
        )
        for i in range(count)
    ]
