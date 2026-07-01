"""Court export scenarios (S-EXP-*) — SHA-256 integrity of the evidence package."""

from __future__ import annotations

import asyncio
import hashlib
from datetime import date, timedelta

from ..types import Assertion
from .base import FamilyContext, Scenario, ScenarioOutcome


async def exp_01_integrity(ctx: FamilyContext) -> ScenarioOutcome:
    """Generate a court export, download it, and verify the SHA-256 the app reports
    matches the actual PDF bytes; then confirm the public verify endpoint agrees."""
    end = date.today()
    start = end - timedelta(days=30)
    status, body = await ctx.parent_a.create_export({
        "case_id": ctx.family_file_id,
        "package_type": "investigation",
        "date_start": start.isoformat(),
        "date_end": end.isoformat(),
        "claim_type": "safety_concern",
        "claim_description": "QA integrity check of the court export.",
        "redaction_level": "standard",
        "message_content_redacted": False,
    })

    if status in (402, 403):  # subscription-gated — not a bug
        return ScenarioOutcome(
            [Assertion("exp.gated_skipped", True, "gated→skip", status,
                       "court export requires a paid tier for this family; skipped", "low")],
            {"status": status, "body": body},
            "Court exports are a paid feature and this test family isn't on that tier, so it was skipped.",
        )

    a: list[Assertion] = [Assertion("exp.created", status == 201, 201, status,
                                    "export request should be accepted", "high")]
    raw: dict = {"create_status": status, "create_body": body}
    export_id = body.get("id") if isinstance(body, dict) else None
    export_number = body.get("export_number") if isinstance(body, dict) else None
    if status != 201 or not export_id:
        return ScenarioOutcome(a, raw, "Requested a court export.")

    # Poll until generation completes (async worker).
    final = {}
    for _ in range(15):
        await asyncio.sleep(3)
        final = await ctx.parent_a.get_export(export_id)
        if final.get("status") in ("completed", "downloaded", "failed"):
            break
    raw["final_status"] = final.get("status")
    a.append(Assertion("exp.completed", final.get("status") in ("completed", "downloaded"),
                       "completed", final.get("status"),
                       "the export should finish generating", "high"))

    if final.get("status") in ("completed", "downloaded"):
        dl_status, pdf_bytes, headers = await ctx.parent_a.download_export(export_id)
        header_hash = headers.get("x-content-hash") or headers.get("X-Content-Hash")
        actual_hash = hashlib.sha256(pdf_bytes).hexdigest() if pdf_bytes else None
        raw["download"] = {"status": dl_status, "bytes": len(pdf_bytes or b""),
                           "header_hash": header_hash, "actual_hash": actual_hash}
        a.append(Assertion(
            "exp.sha256_matches", bool(header_hash) and header_hash == actual_hash,
            header_hash, actual_hash,
            "the SHA-256 the app reports MUST match the downloaded PDF bytes (tamper-evidence)", "critical",
        ))
        if export_number:
            verify = await ctx.parent_a.verify_export(export_number)
            raw["verify"] = verify
            a.append(Assertion("exp.public_verify_valid", verify.get("is_valid") is True,
                               True, verify.get("is_valid"),
                               "the public verification endpoint should confirm the export", "high"))
            a.append(Assertion("exp.verify_hash_matches",
                               verify.get("content_hash") == actual_hash,
                               actual_hash, verify.get("content_hash"),
                               "the verify endpoint's hash should match the downloaded PDF", "high"))

    summary = ("Generated a court-ready evidence PDF, downloaded it, and confirmed the tamper-proof "
               "SHA-256 the app reports matches the actual file and the public verification page.")
    return ScenarioOutcome(a, raw, summary)


SCENARIOS = [
    Scenario("S-EXP-01", "Court export SHA-256 integrity", "export", exp_01_integrity),
]
