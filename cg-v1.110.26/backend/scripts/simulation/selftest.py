"""
Offline selftest — pure computation, NO network, NO DB.

  python -m scripts.simulation.selftest

Compiles all 50 family timelines twice (fixed start date), asserts they are
byte-identical (determinism), and prints:
  - the archetype distribution actually assigned,
  - a per-archetype-dimension action-count matrix,
  - expected 14-day totals (exchanges due, scripted misses, expected flags, ...).
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date

from .archetypes import assign_archetypes
from .family_bible import build_bible
from .timeline import compile_timeline, summarize_plan

FIXED_START = date(2026, 7, 6)  # a Monday — stable reference for the selftest
FAMILIES = 50


def main() -> None:
    archetypes = assign_archetypes(FAMILIES)
    bibles = [build_bible(i, archetypes[i]) for i in range(FAMILIES)]

    # -- determinism: two compiles must be identical --------------------------
    first = [compile_timeline(i, archetypes[i], bibles[i], FIXED_START)
             for i in range(FAMILIES)]
    second = [compile_timeline(i, archetypes[i], bibles[i], FIXED_START)
              for i in range(FAMILIES)]
    assert repr(first) == repr(second), "timeline compilation is NOT deterministic"
    print(f"determinism: OK — {FAMILIES} timelines compile identically (start {FIXED_START})\n")

    # -- distribution check -----------------------------------------------------
    for dim in ("custody", "reliability", "financial", "tone"):
        counts: dict[str, int] = defaultdict(int)
        for a in archetypes:
            counts[getattr(a, dim)] += 1
        print(f"{dim:12s}: " + ", ".join(f"{k}={v}" for k, v in sorted(counts.items())))
    late = sum(1 for a in archetypes if a.late_payer)
    print(f"late payers : {late} (recurring_support families that pay late)\n")

    # -- per-dimension action matrix ---------------------------------------------
    keys = ["exchanges_due", "scripted_late", "scripted_miss_one_party",
            "scripted_miss_both", "messages", "expected_flags",
            "events_created", "rsvps", "rsvp_skips",
            "obligations_recurring", "obligations_one_off",
            "fundings", "expense_approvals", "expense_disputes", "reports"]

    def matrix(dim: str) -> None:
        rows: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        fams: dict[str, int] = defaultdict(int)
        for i, a in enumerate(archetypes):
            g = getattr(a, dim)
            fams[g] += 1
            s = summarize_plan(first[i])
            for k in keys:
                rows[g][k] += s.get(k, 0)
        header = f"{dim:>22s} | fam |" + "".join(f"{k[:9]:>10s}" for k in keys)
        print(header)
        print("-" * len(header))
        for g in sorted(rows):
            print(f"{g:>22s} | {fams[g]:>3d} |"
                  + "".join(f"{rows[g][k]:>10d}" for k in keys))
        print()

    for dim in ("custody", "reliability", "financial", "tone"):
        matrix(dim)

    # -- grand totals ---------------------------------------------------------------
    total: dict[str, int] = defaultdict(int)
    for i in range(FAMILIES):
        for k, v in summarize_plan(first[i]).items():
            total[k] += v
    print("14-day expected totals across all 50 families:")
    for k in sorted(total):
        print(f"  {k:28s} {total[k]}")
    scripted = (total["scripted_late"] + total["scripted_miss_one_party"]
                + total["scripted_miss_both"])
    print(f"\n  exchanges due={total['exchanges_due']}  "
          f"scripted deviations={scripted} "
          f"(late={total['scripted_late']}, one-party={total['scripted_miss_one_party']}, "
          f"both={total['scripted_miss_both']})")
    print(f"  messages={total['messages']}  expected ARIA flags={total['expected_flags']}  "
          f"borderline(tense)={total['borderline_tense']}")
    print("\nselftest: PASS")


if __name__ == "__main__":
    main()
