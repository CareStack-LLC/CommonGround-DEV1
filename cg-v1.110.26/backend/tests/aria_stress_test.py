#!/usr/bin/env python3
"""
ARIA Stress Test Harness
========================
Runs a corpus of real-world co-parenting messages through the ARIA regex engine
and reports false negatives (missed hostility) and false positives (over-flagging).

This script is STANDALONE — it imports patterns directly without loading the
full app config, so it can run without database/env vars.

Usage:
    # From backend/ directory:
    python3 tests/aria_stress_test.py                          # Run all
    python3 tests/aria_stress_test.py --verbose                # Show every result
    python3 tests/aria_stress_test.py --category hostility     # Filter by category
    python3 tests/aria_stress_test.py --failures-only          # Only show failures
    python3 tests/aria_stress_test.py --corpus path/to/file.json  # Custom corpus

Corpus format (JSON array):
[
  {
    "text": "message content",
    "should_flag": true,
    "expected_categories": ["hostility", "blame"],
    "notes": "optional context"
  }
]

Exit code:
    0 = all pass
    1 = false negatives found (dangerous — hostile content got through)
    2 = false positives only (annoying but safe)
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

# Add project root to path so we can import patterns
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


# ── Minimal ToxicityCategory enum (matches aria.py) ──
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


# ── Scoring weights (matches aria.py _calculate_score) ──
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
        ToxicityCategory.PROFANITY: [
            re.compile(p, re.IGNORECASE) for p in PROFANITY_PATTERNS
        ],
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


def analyze_message(
    compiled_patterns: Dict[ToxicityCategory, List[re.Pattern]],
    message: str
) -> Tuple[float, List[str], List[str], bool]:
    """
    Run message through ARIA regex engine.
    Returns (score, categories, triggers, is_flagged).
    Mirrors ARIAService.analyze_message() logic.
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

    # Calculate score (matches _calculate_score)
    if not categories:
        score = 0.0
    else:
        score = sum(WEIGHTS.get(cat, 0.2) for cat in set(categories))
        score += len(triggers) * 0.1
        score = min(1.0, score)

    # is_flagged matches _get_level: score > 0 means at least LOW
    is_flagged = score > 0

    cat_names = sorted(cat.value for cat in categories)
    return score, cat_names, triggers, is_flagged


def load_corpus(path: str) -> List[Dict[str, Any]]:
    """Load test corpus from JSON file."""
    with open(path, "r") as f:
        corpus = json.load(f)
    for i, entry in enumerate(corpus):
        if "text" not in entry:
            raise ValueError(f"Corpus entry {i} missing 'text' field")
        if "should_flag" not in entry:
            raise ValueError(f"Corpus entry {i} missing 'should_flag' field")
        entry.setdefault("expected_categories", [])
        entry.setdefault("notes", "")
    return corpus


def run_test(
    compiled_patterns: Dict[ToxicityCategory, List[re.Pattern]],
    entry: Dict[str, Any]
) -> Dict[str, Any]:
    """Run a single message through ARIA and compare to expected outcome."""
    text = entry["text"]
    should_flag = entry["should_flag"]
    expected_cats = set(entry.get("expected_categories", []))

    score, actual_cats_list, actual_triggers, actual_flagged = analyze_message(
        compiled_patterns, text
    )
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


def print_result(r: Dict, verbose: bool = False):
    """Pretty-print a single test result."""
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


def print_summary(results: List[Dict]):
    """Print overall summary statistics."""
    total = len(results)
    passes = sum(1 for r in results if r["status"] == "PASS")
    false_neg = [r for r in results if r["status"] == "FALSE_NEGATIVE"]
    false_pos = [r for r in results if r["status"] == "FALSE_POSITIVE"]

    should_flag = [r for r in results if r["should_flag"]]
    should_pass = [r for r in results if not r["should_flag"]]

    caught = sum(1 for r in should_flag if r["actual_flagged"])
    correct_pass = sum(1 for r in should_pass if not r["actual_flagged"])

    print("\n" + "=" * 70)
    print("ARIA STRESS TEST RESULTS")
    print("=" * 70)
    print(f"  Total messages:     {total}")
    print(f"  Passed:             \033[92m{passes}\033[0m")
    print(f"  False negatives:    \033[91m{len(false_neg)}\033[0m (hostile content got through)")
    print(f"  False positives:    \033[93m{len(false_pos)}\033[0m (clean content over-flagged)")
    print()
    if should_flag:
        detection_rate = caught / len(should_flag) * 100
        print(f"  Detection rate:     {caught}/{len(should_flag)} = \033[{'92' if detection_rate >= 90 else '91'}m{detection_rate:.1f}%\033[0m")
    if should_pass:
        precision = correct_pass / len(should_pass) * 100
        print(f"  Clean pass rate:    {correct_pass}/{len(should_pass)} = \033[{'92' if precision >= 85 else '93'}m{precision:.1f}%\033[0m")

    if false_neg:
        print(f"\n  \033[91m-- FALSE NEGATIVES (MUST FIX) --\033[0m")
        missed_cats = defaultdict(int)
        for r in false_neg:
            for cat in r["expected_categories"]:
                missed_cats[cat] += 1
            if not r["expected_categories"]:
                missed_cats["(uncategorized)"] += 1
        for cat, count in sorted(missed_cats.items(), key=lambda x: -x[1]):
            print(f"    {cat}: {count} missed")

    if false_pos:
        print(f"\n  \033[93m-- FALSE POSITIVES --\033[0m")
        over_cats = defaultdict(int)
        for r in false_pos:
            for cat in r["actual_categories"]:
                over_cats[cat] += 1
        for cat, count in sorted(over_cats.items(), key=lambda x: -x[1]):
            print(f"    {cat}: {count} over-flagged")

    flagged_scores = [r["score"] for r in results if r["actual_flagged"]]
    clean_scores = [r["score"] for r in results if not r["actual_flagged"]]
    if flagged_scores:
        print(f"\n  Flagged score range: {min(flagged_scores):.2f} - {max(flagged_scores):.2f} (avg {sum(flagged_scores)/len(flagged_scores):.2f})")
    if clean_scores:
        print(f"  Clean score range:   {min(clean_scores):.2f} - {max(clean_scores):.2f} (avg {sum(clean_scores)/len(clean_scores):.2f})")

    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(description="ARIA Stress Test Harness")
    parser.add_argument("--corpus", type=str, default=None,
                        help="Path to corpus JSON file (default: tests/aria_corpus.json)")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Show details for every test, not just failures")
    parser.add_argument("--failures-only", "-f", action="store_true",
                        help="Only show failures")
    parser.add_argument("--category", "-c", type=str, default=None,
                        help="Filter corpus to entries with this expected category")
    parser.add_argument("--json-output", type=str, default=None,
                        help="Write full results to JSON file")
    args = parser.parse_args()

    corpus_path = args.corpus
    if not corpus_path:
        tests_dir = Path(__file__).parent
        corpus_path = str(tests_dir / "aria_corpus.json")
        if not os.path.exists(corpus_path):
            print(f"\033[91mError: No corpus found at {corpus_path}\033[0m")
            print("Create one or specify --corpus path/to/file.json")
            sys.exit(1)

    print(f"Loading corpus from {corpus_path}...")
    corpus = load_corpus(corpus_path)
    print(f"Loaded {len(corpus)} test messages.\n")

    if args.category:
        corpus = [e for e in corpus if args.category in e.get("expected_categories", [])]
        print(f"Filtered to {len(corpus)} messages with category '{args.category}'.\n")

    # Compile patterns (standalone — no app config needed)
    print("Compiling ARIA patterns...")
    compiled = compile_patterns()
    pattern_count = sum(len(p) for p in compiled.values())
    print(f"Compiled {pattern_count} patterns across {len(compiled)} categories.\n")

    # Run tests
    results = []
    start = time.time()

    for entry in corpus:
        result = run_test(compiled, entry)
        results.append(result)

        if args.failures_only and result["status"] == "PASS":
            continue
        if not args.failures_only or result["status"] != "PASS":
            print_result(result, verbose=args.verbose)

    elapsed = time.time() - start
    print(f"\n  Completed in {elapsed:.3f}s ({len(corpus)/max(elapsed, 0.001):.0f} msg/s)")

    print_summary(results)

    if args.json_output:
        with open(args.json_output, "w") as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\nFull results written to {args.json_output}")

    false_neg = sum(1 for r in results if r["status"] == "FALSE_NEGATIVE")
    false_pos = sum(1 for r in results if r["status"] == "FALSE_POSITIVE")

    if false_neg > 0:
        sys.exit(1)
    elif false_pos > 0:
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
