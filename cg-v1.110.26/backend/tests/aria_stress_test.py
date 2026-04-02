#!/usr/bin/env python3
"""
ARIA Stress Test Harness — Single Messages + Thread Escalation
==============================================================
Tests ARIA's regex engine against a corpus of labeled messages AND
simulates thread-level heat scoring to catch slow-burn escalation.

STANDALONE — imports patterns directly, no database or env vars needed.

Usage:
    python3 tests/aria_stress_test.py                          # Full run
    python3 tests/aria_stress_test.py --failures-only          # Only show misses
    python3 tests/aria_stress_test.py --verbose                # Show every result
    python3 tests/aria_stress_test.py --category hostility     # Filter by category
    python3 tests/aria_stress_test.py --threads-only           # Only run thread tests
    python3 tests/aria_stress_test.py --singles-only           # Only run single msg tests
    python3 tests/aria_stress_test.py --corpus path/to/file.json
    python3 tests/aria_stress_test.py --json-output results.json

Corpus format — two entry types in the same JSON array:

  Single message:
  {
    "text": "message content",
    "should_flag": true,
    "expected_categories": ["hostility"],
    "notes": "why"
  }

  Thread (conversation):
  {
    "thread": [
      {"text": "message 1", "sender": "A"},
      {"text": "message 2", "sender": "B"},
      {"text": "message 3", "sender": "A"}
    ],
    "expected_trajectory": "escalating",
    "expected_heat_above": 2.0,
    "should_flag_by_message": 5,
    "notes": "slow burn — individually clean but together hostile"
  }

Exit codes: 0=pass, 1=false negatives, 2=false positives only
"""

import argparse
import json
import os
import re
import sys
import time
from collections import defaultdict
from enum import Enum
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


# ── ToxicityCategory enum (matches aria.py) ──
class ToxicityCategory(Enum):
    PROFANITY = "profanity"
    INSULT = "insult"
    HOSTILITY = "hostility"
    SARCASM = "sarcasm"
    BLAME = "blame"
    DISMISSIVE = "dismissive"
    THREATENING = "threatening"
    MANIPULATION = "manipulation"
    PASSIVE_AGGRESSIVE = "passive_aggressive"
    ALL_CAPS = "all_caps"
    CUSTODY_WEAPONIZATION = "custody_weaponization"
    FINANCIAL_COERCION = "financial_coercion"
    HATE_SPEECH = "hate_speech"
    SEXUAL_HARASSMENT = "sexual_harassment"


# ── Scoring weights (matches aria.py) ──
WEIGHTS = {
    ToxicityCategory.THREATENING: 0.95,
    ToxicityCategory.HOSTILITY: 0.6,
    ToxicityCategory.PROFANITY: 0.4,
    ToxicityCategory.INSULT: 0.5,
    ToxicityCategory.BLAME: 0.4,
    ToxicityCategory.DISMISSIVE: 0.3,
    ToxicityCategory.PASSIVE_AGGRESSIVE: 0.3,
    ToxicityCategory.SARCASM: 0.3,
    ToxicityCategory.ALL_CAPS: 0.2,
    ToxicityCategory.MANIPULATION: 0.5,
    ToxicityCategory.CUSTODY_WEAPONIZATION: 0.8,
    ToxicityCategory.FINANCIAL_COERCION: 0.6,
    ToxicityCategory.HATE_SPEECH: 1.0,
    ToxicityCategory.SEXUAL_HARASSMENT: 1.0,
}

# V2 rolling window decay weights [oldest, middle, newest]
HEAT_DECAY_WEIGHTS = [0.5, 0.75, 1.0]
HEAT_LLM_TRIGGER = 3.5


def compile_patterns() -> Dict[ToxicityCategory, List[re.Pattern]]:
    """Compile all ARIA patterns — mirrors ARIAService._compile_patterns()."""
    from app.services.aria_patterns import (
        HATE_SPEECH_PATTERNS,
        SEXUAL_HARASSMENT_PATTERNS,
        THREATENING_PATTERNS,
        CUSTODY_WEAPONIZATION_PATTERNS,
        FINANCIAL_COERCION_PATTERNS,
        HOSTILITY_PATTERNS,
        MODERN_SLANG_PATTERNS,
        PROFANITY_PATTERNS,
        EVASION_PATTERNS,
        EMOTIONAL_MANIPULATION_PATTERNS,
        HOSTILE_EMOJI_PATTERNS,
        IMPLICIT_HOSTILITY_PATTERNS,
        COPARENTING_CONFLICT_PATTERNS,
        PARENTAL_ALIENATION_PATTERNS,
        SEXUAL_COERCION_PATTERNS,
        CONTEMPT_PATTERNS,
    )

    SARCASM_PATTERNS = [
        r"\byeah\s+right\b", r"\boh\s+sure\b", r"\bwhatever\b",
        r"\bthanks\s+a\s+lot\b", r"\bgreat\s+job\b.*\bnot\b",
        r"\breal\s+nice\b", r"\bhow\s+thoughtful\b",
    ]
    BLAME_PATTERNS = [
        r"\byour\s+fault\b", r"\byou\s+always\b", r"\byou\s+never\b",
        r"\bbecause\s+of\s+you\b", r"\bthanks\s+to\s+you\b",
        r"\byou\s+caused\b", r"\byou\s+ruined\b", r"\byou\s+made\s+me\b",
    ]
    DISMISSIVE_PATTERNS = [
        r"\bi\s+don'?t\s+care\b", r"\bnot\s+my\s+problem\b",
        r"\bdeal\s+with\s+it\b", r"\bget\s+over\s+it\b",
        r"\bwho\s+cares\b", r"\bnone\s+of\s+your\s+business\b",
    ]
    PASSIVE_AGGRESSIVE_PATTERNS = [
        r"\bfine\.?\s*$", r"\bwhatever\s+you\s+say\b",
        r"\bif\s+that'?s\s+what\s+you\s+want\b",
        r"\bi\s+guess\s+i'?ll\s+just\b", r"\bno\s+worries\b.*\bi\b",
        r"\bmust\s+be\s+nice\b", r"\bi'?m\s+sorry\s+you\s+feel\b",
    ]

    return {
        ToxicityCategory.HATE_SPEECH: [
            re.compile(p, re.IGNORECASE) for p in HATE_SPEECH_PATTERNS
        ],
        ToxicityCategory.SEXUAL_HARASSMENT: (
            [re.compile(p, re.IGNORECASE) for p in SEXUAL_HARASSMENT_PATTERNS] +
            [re.compile(p, re.IGNORECASE) for p in SEXUAL_COERCION_PATTERNS]
        ),
        ToxicityCategory.THREATENING: [
            re.compile(p, re.IGNORECASE) for p in THREATENING_PATTERNS
        ],
        ToxicityCategory.CUSTODY_WEAPONIZATION: [
            re.compile(p, re.IGNORECASE) for p in CUSTODY_WEAPONIZATION_PATTERNS
        ],
        ToxicityCategory.FINANCIAL_COERCION: [
            re.compile(p, re.IGNORECASE) for p in FINANCIAL_COERCION_PATTERNS
        ],
        ToxicityCategory.HOSTILITY: (
            [re.compile(p, re.IGNORECASE) for p in HOSTILITY_PATTERNS] +
            [re.compile(p, re.UNICODE) for p in HOSTILE_EMOJI_PATTERNS] +
            [re.compile(p, re.IGNORECASE) for p in CONTEMPT_PATTERNS] +
            [re.compile(p, re.IGNORECASE) for p in COPARENTING_CONFLICT_PATTERNS]
        ),
        ToxicityCategory.INSULT: [
            re.compile(p, re.IGNORECASE) for p in MODERN_SLANG_PATTERNS
        ],
        ToxicityCategory.PROFANITY: (
            [re.compile(p, re.IGNORECASE) for p in PROFANITY_PATTERNS] +
            [re.compile(p, re.IGNORECASE) for p in EVASION_PATTERNS]
        ),
        ToxicityCategory.ALL_CAPS: [
            re.compile(p, re.IGNORECASE) for p in EVASION_PATTERNS
        ],
        ToxicityCategory.SARCASM: [
            re.compile(p, re.IGNORECASE) for p in SARCASM_PATTERNS
        ],
        ToxicityCategory.BLAME: [
            re.compile(p, re.IGNORECASE) for p in BLAME_PATTERNS
        ],
        ToxicityCategory.DISMISSIVE: [
            re.compile(p, re.IGNORECASE) for p in DISMISSIVE_PATTERNS
        ],
        ToxicityCategory.PASSIVE_AGGRESSIVE: (
            [re.compile(p, re.IGNORECASE) for p in PASSIVE_AGGRESSIVE_PATTERNS] +
            [re.compile(p, re.IGNORECASE) for p in IMPLICIT_HOSTILITY_PATTERNS]
        ),
        ToxicityCategory.MANIPULATION: (
            [re.compile(p, re.IGNORECASE) for p in EMOTIONAL_MANIPULATION_PATTERNS] +
            [re.compile(p, re.IGNORECASE) for p in PARENTAL_ALIENATION_PATTERNS]
        ),
    }


# ═══════════════════════════════════════════════════════════════════
# SINGLE MESSAGE ANALYSIS
# ═══════════════════════════════════════════════════════════════════

def analyze_message(
    compiled_patterns: Dict[ToxicityCategory, List[re.Pattern]],
    message: str
) -> Tuple[float, List[str], List[str], bool]:
    """
    Run message through ARIA regex engine.
    Returns (score, categories, triggers, is_flagged).
    """
    triggers = []
    categories = []

    # ALL CAPS check
    words = message.split()
    if len(words) > 3:
        caps_words = sum(1 for w in words if w.isupper() and len(w) > 1)
        if caps_words / len(words) > 0.6:
            categories.append(ToxicityCategory.ALL_CAPS)
            triggers.append("EXCESSIVE CAPS")

    # Pattern matching
    for category, patterns in compiled_patterns.items():
        if category == ToxicityCategory.ALL_CAPS:
            continue
        for pattern in patterns:
            matches = pattern.finditer(message)
            for match in matches:
                full_phrase = match.group().strip()
                if full_phrase:
                    if category not in categories:
                        categories.append(category)
                    triggers.append(full_phrase)

    # Score
    if not categories:
        score = 0.0
    else:
        score = sum(WEIGHTS.get(cat, 0.2) for cat in set(categories))
        score += len(triggers) * 0.1
        score = min(1.0, score)

    is_flagged = score > 0
    cat_names = sorted(cat.value for cat in categories)
    return score, cat_names, triggers, is_flagged


# ═══════════════════════════════════════════════════════════════════
# THREAD-LEVEL HEAT SIMULATION
# ═══════════════════════════════════════════════════════════════════

class ThreadScorer:
    """
    Simulates V2 rolling window heat scoring offline.
    Mirrors aria_heat_window.py logic without database.

    Tracks per-sender scores in a sliding window of 3.
    Calculates weighted heat and detects escalation trajectory.
    """

    def __init__(self, compiled_patterns):
        self.compiled = compiled_patterns
        # Per-sender sliding window of recent scores
        self.sender_windows: Dict[str, List[float]] = defaultdict(list)
        # Full timeline for trajectory analysis
        self.timeline: List[Dict[str, Any]] = []
        # Tracking
        self.total_flags = 0
        self.first_flag_idx = None
        self.max_heat = 0.0
        self.categories_seen = defaultdict(int)

    def process_message(self, text: str, sender: str, idx: int) -> Dict[str, Any]:
        """Process a single message in thread context. Returns per-message analysis."""
        score, cats, triggers, flagged = analyze_message(self.compiled, text)

        # Update sender's sliding window
        window = self.sender_windows[sender]
        window.append(score)
        # Keep only last 3
        if len(window) > 3:
            window.pop(0)

        # Calculate rolling heat (V2 decay weights)
        padded = [0.0] * (3 - len(window)) + window[-3:]
        heat = sum(s * w for s, w in zip(padded, HEAT_DECAY_WEIGHTS))
        heat = round(heat, 3)

        if heat > self.max_heat:
            self.max_heat = heat

        if flagged:
            self.total_flags += 1
            if self.first_flag_idx is None:
                self.first_flag_idx = idx
            for cat in cats:
                self.categories_seen[cat] += 1

        entry = {
            "idx": idx,
            "sender": sender,
            "text": text[:60] + ("..." if len(text) > 60 else ""),
            "score": score,
            "heat": heat,
            "flagged": flagged,
            "categories": cats,
            "triggers": triggers[:3],
            "would_trigger_llm": heat >= HEAT_LLM_TRIGGER,
        }
        self.timeline.append(entry)
        return entry

    def get_trajectory(self) -> str:
        """Determine heat trajectory: escalating, stable, cooling, or clean."""
        if not self.timeline:
            return "clean"

        heats = [e["heat"] for e in self.timeline]
        if max(heats) == 0:
            return "clean"

        # Compare first half vs second half average
        mid = len(heats) // 2
        if mid == 0:
            return "stable"

        first_half = sum(heats[:mid]) / mid
        second_half = sum(heats[mid:]) / len(heats[mid:])

        if second_half > first_half + 0.5:
            return "escalating"
        elif second_half < first_half - 0.5:
            return "cooling"
        return "stable"

    def get_summary(self) -> Dict[str, Any]:
        """Get full thread analysis summary."""
        per_sender_heat = {}
        for sender, window in self.sender_windows.items():
            padded = [0.0] * (3 - len(window)) + window[-3:]
            h = sum(s * w for s, w in zip(padded, HEAT_DECAY_WEIGHTS))
            per_sender_heat[sender] = round(h, 3)

        return {
            "message_count": len(self.timeline),
            "total_flags": self.total_flags,
            "first_flag_at": self.first_flag_idx,
            "max_heat": self.max_heat,
            "final_heat_per_sender": per_sender_heat,
            "trajectory": self.get_trajectory(),
            "categories_seen": dict(self.categories_seen),
            "llm_would_trigger": any(e["would_trigger_llm"] for e in self.timeline),
        }


# ═══════════════════════════════════════════════════════════════════
# CORPUS LOADING
# ═══════════════════════════════════════════════════════════════════

def load_corpus(path: str) -> Tuple[List[Dict], List[Dict]]:
    """Load corpus, split into singles and threads."""
    with open(path, "r") as f:
        corpus = json.load(f)

    singles = []
    threads = []

    for i, entry in enumerate(corpus):
        if "thread" in entry:
            # Thread entry
            if not isinstance(entry["thread"], list) or len(entry["thread"]) < 2:
                raise ValueError(f"Corpus entry {i}: 'thread' must be array of 2+ messages")
            entry.setdefault("expected_trajectory", None)
            entry.setdefault("expected_heat_above", None)
            entry.setdefault("should_flag_by_message", None)
            entry.setdefault("notes", "")
            threads.append(entry)
        else:
            # Single message entry
            if "text" not in entry:
                raise ValueError(f"Corpus entry {i} missing 'text'")
            if "should_flag" not in entry:
                raise ValueError(f"Corpus entry {i} missing 'should_flag'")
            entry.setdefault("expected_categories", [])
            entry.setdefault("notes", "")
            singles.append(entry)

    return singles, threads


# ═══════════════════════════════════════════════════════════════════
# SINGLE MESSAGE TEST RUNNER
# ═══════════════════════════════════════════════════════════════════

def run_single_test(compiled, entry):
    """Run single message test."""
    text = entry["text"]
    should_flag = entry["should_flag"]
    expected_cats = set(entry.get("expected_categories", []))

    score, actual_cats_list, actual_triggers, actual_flagged = analyze_message(compiled, text)
    actual_cats = set(actual_cats_list)

    if should_flag and not actual_flagged:
        status = "FALSE_NEGATIVE"
    elif not should_flag and actual_flagged:
        status = "FALSE_POSITIVE"
    else:
        status = "PASS"

    missing_cats = expected_cats - actual_cats if should_flag else set()

    return {
        "text": text,
        "should_flag": should_flag,
        "actual_flagged": actual_flagged,
        "status": status,
        "score": score,
        "expected_categories": sorted(expected_cats),
        "actual_categories": sorted(actual_cats),
        "missing_categories": sorted(missing_cats),
        "triggers": actual_triggers[:10],
        "notes": entry.get("notes", ""),
    }


# ═══════════════════════════════════════════════════════════════════
# THREAD TEST RUNNER
# ═══════════════════════════════════════════════════════════════════

def run_thread_test(compiled, entry) -> Dict[str, Any]:
    """Run a thread-level escalation test."""
    thread = entry["thread"]
    expected_trajectory = entry.get("expected_trajectory")
    expected_heat_above = entry.get("expected_heat_above")
    should_flag_by = entry.get("should_flag_by_message")

    scorer = ThreadScorer(compiled)

    for idx, msg in enumerate(thread):
        scorer.process_message(msg["text"], msg.get("sender", "A"), idx)

    summary = scorer.get_summary()

    # Determine pass/fail
    failures = []

    if expected_trajectory and summary["trajectory"] != expected_trajectory:
        failures.append(
            f"trajectory: expected '{expected_trajectory}', got '{summary['trajectory']}'"
        )

    if expected_heat_above is not None and summary["max_heat"] < expected_heat_above:
        failures.append(
            f"max_heat: expected >= {expected_heat_above}, got {summary['max_heat']:.2f}"
        )

    if should_flag_by is not None:
        if summary["first_flag_at"] is None:
            failures.append(f"should_flag_by_message {should_flag_by}: never flagged anything")
        elif summary["first_flag_at"] > should_flag_by:
            failures.append(
                f"should_flag_by_message {should_flag_by}: first flag at message {summary['first_flag_at']}"
            )

    return {
        "type": "thread",
        "status": "FAIL" if failures else "PASS",
        "failures": failures,
        "notes": entry.get("notes", ""),
        "summary": summary,
        "timeline": scorer.timeline,
    }


# ═══════════════════════════════════════════════════════════════════
# DISPLAY
# ═══════════════════════════════════════════════════════════════════

def print_single_result(r, verbose=False):
    icon = {
        "PASS": "\033[92m\u2713\033[0m",
        "FALSE_NEGATIVE": "\033[91m\u2717 MISSED\033[0m",
        "FALSE_POSITIVE": "\033[93m\u26a0 OVER-FLAG\033[0m",
    }[r["status"]]

    text_preview = r["text"][:80] + ("..." if len(r["text"]) > 80 else "")
    print(f"  {icon}  [{r['score']:.2f}] {text_preview}")

    if r["status"] != "PASS" or verbose:
        if r["should_flag"]:
            print(f"       Expected: FLAG with {r['expected_categories']}")
        else:
            print(f"       Expected: PASS (clean)")
        print(f"       Got:      {'FLAG' if r['actual_flagged'] else 'PASS'} with {r['actual_categories']}")
        if r["triggers"]:
            print(f"       Triggers: {r['triggers'][:5]}")
        if r["missing_categories"]:
            print(f"       \033[91mMissing categories: {r['missing_categories']}\033[0m")
        if r["notes"]:
            print(f"       Note: {r['notes']}")
        print()


def print_thread_result(r, verbose=False):
    """Print thread test result with heat timeline visualization."""
    s = r["summary"]
    status = r["status"]

    if status == "PASS":
        icon = "\033[92m\u2713\033[0m"
    else:
        icon = "\033[91m\u2717 FAIL\033[0m"

    notes = r["notes"][:60] + ("..." if len(r["notes"]) > 60 else "")
    print(f"  {icon}  THREAD [{s['message_count']} msgs] {notes}")
    print(f"       Trajectory: {s['trajectory']}  |  Max Heat: {s['max_heat']:.2f}  |  Flags: {s['total_flags']}/{s['message_count']}")

    if status == "FAIL":
        for f in r["failures"]:
            print(f"       \033[91m\u2717 {f}\033[0m")

    # Heat timeline sparkline
    if r["timeline"]:
        heat_bar = "       Heat: "
        for e in r["timeline"]:
            h = e["heat"]
            if h == 0:
                heat_bar += "\033[90m\u2581\033[0m"  # dark gray — clean
            elif h < 1.0:
                heat_bar += "\033[92m\u2582\033[0m"  # green — low
            elif h < 2.0:
                heat_bar += "\033[93m\u2584\033[0m"  # yellow — moderate
            elif h < 3.0:
                heat_bar += "\033[33m\u2586\033[0m"  # orange — elevated
            elif h < HEAT_LLM_TRIGGER:
                heat_bar += "\033[91m\u2587\033[0m"  # red — high
            else:
                heat_bar += "\033[91m\u2588\033[0m"  # full red — LLM trigger
        print(heat_bar)

    # Per-sender final heat
    for sender, heat in s["final_heat_per_sender"].items():
        print(f"       Sender {sender}: final heat {heat:.2f}")

    if s["llm_would_trigger"]:
        print(f"       \033[91m\u26a0 LLM deep analysis would trigger (heat >= {HEAT_LLM_TRIGGER})\033[0m")

    if verbose or status == "FAIL":
        print(f"       Categories seen: {s['categories_seen']}")
        print()
        # Show message-by-message timeline
        for e in r["timeline"]:
            flag_icon = "\033[91m\u25cf\033[0m" if e["flagged"] else "\033[92m\u25cb\033[0m"
            llm_mark = " \033[91m[LLM!]\033[0m" if e["would_trigger_llm"] else ""
            print(f"         {flag_icon} [{e['sender']}] heat={e['heat']:.2f} score={e['score']:.2f} {e['text']}{llm_mark}")
            if e["categories"]:
                print(f"           cats={e['categories']} triggers={e['triggers']}")
        print()

    print()


def print_summary(single_results, thread_results):
    """Print overall summary."""
    total_singles = len(single_results)
    single_pass = sum(1 for r in single_results if r["status"] == "PASS")
    false_neg = [r for r in single_results if r["status"] == "FALSE_NEGATIVE"]
    false_pos = [r for r in single_results if r["status"] == "FALSE_POSITIVE"]

    should_flag = [r for r in single_results if r["should_flag"]]
    should_pass = [r for r in single_results if not r["should_flag"]]
    caught = sum(1 for r in should_flag if r["actual_flagged"])
    correct_pass = sum(1 for r in should_pass if not r["actual_flagged"])

    total_threads = len(thread_results)
    thread_pass = sum(1 for r in thread_results if r["status"] == "PASS")
    thread_fail = [r for r in thread_results if r["status"] == "FAIL"]

    print("\n" + "=" * 70)
    print("ARIA STRESS TEST RESULTS")
    print("=" * 70)

    # Singles
    if total_singles:
        print(f"\n  \033[1mSINGLE MESSAGES\033[0m ({total_singles})")
        print(f"  Passed:             \033[92m{single_pass}\033[0m")
        print(f"  False negatives:    \033[91m{len(false_neg)}\033[0m (hostile content got through)")
        print(f"  False positives:    \033[93m{len(false_pos)}\033[0m (clean content over-flagged)")
        if should_flag:
            rate = caught / len(should_flag) * 100
            print(f"  Detection rate:     {caught}/{len(should_flag)} = \033[{'92' if rate >= 90 else '91'}m{rate:.1f}%\033[0m")
        if should_pass:
            prec = correct_pass / len(should_pass) * 100
            print(f"  Clean pass rate:    {correct_pass}/{len(should_pass)} = \033[{'92' if prec >= 85 else '93'}m{prec:.1f}%\033[0m")

        if false_neg:
            print(f"\n  \033[91m-- FALSE NEGATIVES --\033[0m")
            missed_cats = defaultdict(int)
            for r in false_neg:
                for cat in r["expected_categories"]:
                    missed_cats[cat] += 1
                if not r["expected_categories"]:
                    missed_cats["(uncategorized)"] += 1
            for cat, count in sorted(missed_cats.items(), key=lambda x: -x[1]):
                print(f"    {cat}: {count} missed")

        flagged_scores = [r["score"] for r in single_results if r["actual_flagged"]]
        clean_scores = [r["score"] for r in single_results if not r["actual_flagged"]]
        if flagged_scores:
            print(f"\n  Flagged score range: {min(flagged_scores):.2f} - {max(flagged_scores):.2f} (avg {sum(flagged_scores)/len(flagged_scores):.2f})")
        if clean_scores:
            print(f"  Clean score range:   {min(clean_scores):.2f} - {max(clean_scores):.2f}")

    # Threads
    if total_threads:
        print(f"\n  \033[1mTHREAD ESCALATION\033[0m ({total_threads})")
        print(f"  Passed:           \033[92m{thread_pass}\033[0m")
        print(f"  Failed:           \033[91m{len(thread_fail)}\033[0m")

        if thread_fail:
            print(f"\n  \033[91m-- THREAD FAILURES --\033[0m")
            for r in thread_fail:
                print(f"    {r['notes'][:60]}")
                for f in r["failures"]:
                    print(f"      \033[91m\u2717 {f}\033[0m")

    print("\n  \033[90mHeat scale: \u2581=clean \033[92m\u2582\033[90m=low \033[93m\u2584\033[90m=moderate \033[33m\u2586\033[90m=elevated \033[91m\u2587\033[90m=high \033[91m\u2588\033[90m=LLM trigger\033[0m")
    print("=" * 70)


# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="ARIA Stress Test Harness")
    parser.add_argument("--corpus", type=str, default=None)
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--failures-only", "-f", action="store_true")
    parser.add_argument("--category", "-c", type=str, default=None)
    parser.add_argument("--threads-only", action="store_true")
    parser.add_argument("--singles-only", action="store_true")
    parser.add_argument("--json-output", type=str, default=None)
    args = parser.parse_args()

    corpus_path = args.corpus or str(Path(__file__).parent / "aria_corpus.json")
    if not os.path.exists(corpus_path):
        print(f"\033[91mError: No corpus at {corpus_path}\033[0m")
        sys.exit(1)

    print(f"Loading corpus from {corpus_path}...")
    singles, threads = load_corpus(corpus_path)
    print(f"Loaded {len(singles)} single messages + {len(threads)} threads.\n")

    if args.category:
        singles = [e for e in singles if args.category in e.get("expected_categories", [])]
        print(f"Filtered to {len(singles)} singles with category '{args.category}'.\n")

    print("Compiling ARIA patterns...")
    compiled = compile_patterns()
    pattern_count = sum(len(p) for p in compiled.values())
    print(f"Compiled {pattern_count} patterns across {len(compiled)} categories.\n")

    single_results = []
    thread_results = []
    start = time.time()

    # Run single message tests
    if not args.threads_only:
        if singles:
            print(f"\033[1m--- SINGLE MESSAGES ({len(singles)}) ---\033[0m\n")
        for entry in singles:
            result = run_single_test(compiled, entry)
            single_results.append(result)
            if args.failures_only and result["status"] == "PASS":
                continue
            print_single_result(result, verbose=args.verbose)

    # Run thread tests
    if not args.singles_only:
        if threads:
            print(f"\n\033[1m--- THREAD ESCALATION ({len(threads)}) ---\033[0m\n")
        for entry in threads:
            result = run_thread_test(compiled, entry)
            thread_results.append(result)
            if args.failures_only and result["status"] == "PASS":
                continue
            print_thread_result(result, verbose=args.verbose)

    elapsed = time.time() - start
    total = len(singles) + sum(len(t["thread"]) for t in threads)
    print(f"\n  Completed in {elapsed:.3f}s ({total/max(elapsed,0.001):.0f} msg/s)")

    print_summary(single_results, thread_results)

    if args.json_output:
        with open(args.json_output, "w") as f:
            json.dump({"singles": single_results, "threads": thread_results}, f, indent=2)
        print(f"\nResults written to {args.json_output}")

    false_neg = sum(1 for r in single_results if r["status"] == "FALSE_NEGATIVE")
    thread_fail = sum(1 for r in thread_results if r["status"] == "FAIL")

    if false_neg > 0 or thread_fail > 0:
        sys.exit(1)
    elif sum(1 for r in single_results if r["status"] == "FALSE_POSITIVE") > 0:
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
