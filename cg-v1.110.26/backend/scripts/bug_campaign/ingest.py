"""Reporter — map a ScenarioResult into the bug-hunt tester API."""

from __future__ import annotations

import logging

from .tester_client import TesterClient
from .types import ScenarioResult

logger = logging.getLogger("bug_campaign.ingest")


async def report(tester: TesterClient | None, result: ScenarioResult, *, dry_run: bool) -> None:
    """Post the experience note + a bug per finding. Mutates result with ids."""
    if dry_run or tester is None:
        return

    # 1) Experience note (always).
    try:
        note = await tester.add_note(result.note or f"Ran {result.scenario_id}", note_type="observation")
        result.note_id = note.get("id")
    except Exception as e:
        logger.warning("note ingest failed for %s: %s", result.scenario_id, e)

    # 2) One bug per finding (Oracle failures + judge findings).
    for finding in result.findings:
        try:
            bug = await tester.submit_bug(
                title=finding.title,
                description=(finding.description + f"\n\n(source: {finding.source})"),
                severity=finding.severity,
                steps_to_reproduce=finding.steps_to_reproduce or None,
            )
            if bug.get("id"):
                result.bugs_posted.append(bug["id"])
        except Exception as e:
            logger.warning("bug ingest failed for %s: %s", result.scenario_id, e)

    # 3) A light UX feedback signal when the scenario passed cleanly.
    if not result.findings and not result.error:
        try:
            await tester.add_feedback(
                content=f"{result.scenario_title}: worked as expected.",
                category="functionality", rating=5, feature_area="custody/handoff",
            )
        except Exception:
            pass
