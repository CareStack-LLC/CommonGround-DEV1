"""CampaignOrchestrator — sets up the cohort and drives smoke / fast / soak runs."""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone

from .admin_client import AdminClient
from .ai.anthropic_client import AnthropicClient
from .ai.rollup import rollup
from .client import ParentAgentClient
from .config import CampaignConfig
from .ingest import report
from .ledger import append_ledger, load_state, run_key, save_state
from .runner import ScenarioRunner
from .scenarios import scenarios_for
from .scenarios.base import FamilyContext
from .tester_client import TesterClient
from .types import ScenarioResult

logger = logging.getLogger("bug_campaign.orch")

TARGET_FEATURE = "exchange"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class CampaignOrchestrator:
    def __init__(self, cfg: CampaignConfig):
        self.cfg = cfg
        self.ai = AnthropicClient(cfg)
        self.runner = ScenarioRunner(cfg, self.ai)

    # ---- setup -------------------------------------------------------------
    async def ensure_cohort(self, admin: AdminClient, family_count: int, *, refresh_tokens: bool = False) -> dict:
        """Create-or-reuse the cohort, seed families, and ensure each has a tester token."""
        state = load_state()
        cohort_id = state.get("cohort_id")

        if not cohort_id:
            cohort = await admin.create_cohort(
                name=self.cfg.cohort_name, target_feature=TARGET_FEATURE,
                family_count=family_count,
                description="AI-agent campaign verifying custody tracking + GPS Silent Handoff accuracy.",
                test_instructions="Automated agents drive real endpoints; bugs are auto-filed by the harness.",
            )
            cohort_id = cohort["id"]
            gen = await admin.generate_families(cohort_id)
            warns = (gen or {}).get("synthetic_id_families") or (gen or {}).get("warnings")
            if warns:
                logger.warning("Seeding produced warnings (auth may have failed): %s", warns)
            state = {"cohort_id": cohort_id, "start_date": _now(), "completed_runs": [], "families": {}}
            save_state(state)

        dash = await admin.get_cohort(cohort_id)
        families_out: list[dict] = []
        for fam in dash.get("families", []):
            if not fam.get("family_file_id"):
                logger.warning("family %s has no family_file_id (synthetic seed) — skipping", fam.get("id"))
                continue
            token = None
            cached = state.get("families", {}).get(fam["id"], {})
            if cached.get("token") and not refresh_tokens:
                token = cached["token"]
            else:
                token = await self._ensure_token(admin, cohort_id, fam)
            rec = {
                "id": fam["id"], "family_file_id": fam["family_file_id"],
                "parent_a_email": fam["parent_a_email"], "parent_a_password": fam["parent_a_password"],
                "parent_a_name": fam.get("parent_a_name", "Parent A"),
                "parent_b_email": fam["parent_b_email"], "parent_b_password": fam["parent_b_password"],
                "parent_b_name": fam.get("parent_b_name", "Parent B"),
                "token": token,
            }
            families_out.append(rec)
            state.setdefault("families", {})[fam["id"]] = {"token": token}
        save_state(state)
        return {"cohort_id": cohort_id, "families": families_out}

    async def _ensure_token(self, admin: AdminClient, cohort_id: str, fam: dict) -> str | None:
        existing = fam.get("tester")
        try:
            if existing:
                r = await admin.resend_tester(cohort_id, existing["id"])
            else:
                r = await admin.assign_tester(
                    cohort_id, fam["id"], tester_name="AI Agent",
                    tester_email=f"agent+{fam['id'][:8]}@cg-qa.com",
                )
            return r.get("access_token")
        except Exception as e:
            logger.warning("could not obtain tester token for family %s: %s", fam.get("id"), e)
            return None

    # ---- context -----------------------------------------------------------
    async def _build_context(self, fam: dict, day: int) -> tuple[FamilyContext | None, list]:
        """Login both parents + fetch children. Returns (ctx or None, clients_to_close)."""
        pa = ParentAgentClient(self.cfg, fam["parent_a_email"], fam["parent_a_password"], fam["parent_a_name"])
        pb = ParentAgentClient(self.cfg, fam["parent_b_email"], fam["parent_b_password"], fam["parent_b_name"])
        closers: list = [pa, pb]
        try:
            await pa.login()
            await pb.login()
        except Exception as e:
            logger.warning("login failed for family %s: %s", fam["id"], e)
            return None, closers

        children = await pa.get_children(fam["family_file_id"])
        child_ids = [c["id"] for c in children if c.get("id")]
        if not child_ids:
            logger.warning("family %s has no children — cannot run custody scenarios", fam["id"])
            return None, closers

        tester = None
        if fam.get("token") and not self.cfg.dry_run:
            tester = TesterClient(self.cfg, fam["token"], family_label=fam["id"])
            closers.append(tester)

        ctx = FamilyContext(
            family_id=fam["id"], family_file_id=fam["family_file_id"],
            parent_a=pa, parent_b=pb, child_ids=child_ids, tester=tester, day=day,
            label=f"{fam['parent_a_name']} & {fam['parent_b_name']}",
        )
        return ctx, closers

    # ---- running -----------------------------------------------------------
    async def _run_family(self, fam: dict, scenarios, day: int, *, idempotent: bool) -> list[ScenarioResult]:
        state = load_state() if idempotent else {}
        completed = set(state.get("completed_runs", [])) if idempotent else set()
        ctx, closers = await self._build_context(fam, day)
        results: list[ScenarioResult] = []
        try:
            if ctx is None:
                return results
            for sc in scenarios:
                key = run_key(day, fam["id"], sc.id)
                if idempotent and key in completed:
                    continue
                result = await self.runner.run(sc, ctx)
                await report(ctx.tester, result, dry_run=self.cfg.dry_run)
                append_ledger({"ts": _now(), "run_key": key, **result.to_dict()})
                results.append(result)
                if idempotent:
                    completed.add(key)
                    st = load_state()
                    st["completed_runs"] = sorted(completed)
                    save_state(st)
                self._print_result(result)
        finally:
            for c in closers:
                try:
                    await c.aclose()
                except Exception:
                    pass
        return results

    def _print_result(self, r: ScenarioResult) -> None:
        status = "PASS" if r.passed else ("ERROR" if r.error else "FAIL")
        extra = f" | {len(r.findings)} bug(s)" if r.findings else ""
        print(f"    [{status}] {r.scenario_id} {r.scenario_title} ({r.duration_ms}ms){extra}")
        for a in r.failed_assertions:
            print(f"        ✗ {a.name}: expected {a.expected!r}, got {a.actual!r}")

    # ---- modes -------------------------------------------------------------
    async def smoke(self, admin: AdminClient) -> list[ScenarioResult]:
        print(f"\n▶ SMOKE  ({self.cfg.summary()})")
        setup = await self.ensure_cohort(admin, family_count=1)
        if not setup["families"]:
            raise SystemExit("Smoke aborted: no usable seeded family (check Supabase seeding).")
        fam = setup["families"][0]
        from .scenarios.handoff import geo_01_inside
        from .scenarios.base import Scenario
        sc = Scenario("S-GEO-01", "Silent handoff inside geofence", "exchange", geo_01_inside)
        results = await self._run_family(fam, [sc], day=0, idempotent=False)
        await self._finalize(admin, setup["cohort_id"], day=0, results=results)
        return results

    async def fast(self, admin: AdminClient) -> list[ScenarioResult]:
        print(f"\n▶ FAST PASS  ({self.cfg.summary()})")
        setup = await self.ensure_cohort(admin, family_count=self.cfg.family_count)
        scenarios = scenarios_for(self.cfg.mapbox_enabled)
        all_results: list[ScenarioResult] = []
        for fam in setup["families"]:
            print(f"  • family {fam['id'][:8]} ({fam['parent_a_name']} & {fam['parent_b_name']})")
            all_results += await self._run_family(fam, scenarios, day=0, idempotent=False)
        await self._finalize(admin, setup["cohort_id"], day=0, results=all_results)
        return all_results

    async def soak(self, admin: AdminClient, day: int) -> list[ScenarioResult]:
        refresh = day == 7  # regenerate tokens mid-campaign (7-day default expiry)
        setup = await self.ensure_cohort(admin, family_count=self.cfg.family_count, refresh_tokens=refresh)
        scenarios = scenarios_for(self.cfg.mapbox_enabled)
        todays = _soak_slice(day, scenarios, per_day=3)
        print(f"\n▶ SOAK day {day}  ({self.cfg.summary()}) — {[s.id for s in todays]}")
        all_results: list[ScenarioResult] = []
        for fam in setup["families"]:
            all_results += await self._run_family(fam, todays, day=day, idempotent=True)
        await self._finalize(admin, setup["cohort_id"], day=day, results=all_results)
        return all_results

    # ---- 3-day custody-accuracy soak (dedicated FRESH cohort) --------------
    _CUSTODY_COHORT_NAME = "Custody Accuracy — Multi-Day Soak"

    async def _ensure_custody_family(self, admin: AdminClient) -> dict:
        state = load_state()
        cid = state.get("custody_cohort_id")
        if not cid:
            # Stateless runners (e.g. Render cron — fresh filesystem each run)
            # have no local day_state.json. The cohort lives in the app DB, so
            # recover it by name from the server before creating a new one.
            try:
                existing = await admin.list_cohorts()
                items = existing.get("items", existing) if isinstance(existing, dict) else existing
                for c in items or []:
                    if c.get("name") == self._CUSTODY_COHORT_NAME:
                        cid = c["id"]
                        state["custody_cohort_id"] = cid
                        created = str(c.get("created_at", ""))[:10]
                        if created and not state.get("custody_soak_start"):
                            state["custody_soak_start"] = created
                        save_state(state)
                        print(f"  recovered soak cohort {cid} from server (created {created or 'unknown'})")
                        break
            except Exception as exc:
                print(f"  cohort recovery check failed ({exc}); will create fresh")
        if not cid:
            cohort = await admin.create_cohort(
                name=self._CUSTODY_COHORT_NAME, target_feature="exchange", family_count=1,
                description="Real-time multi-day custody-tracker accuracy check via daily exchanges.",
                test_instructions="Automated daily exchanges; harness verifies cumulative custody accuracy.",
            )
            cid = cohort["id"]
            await admin.generate_families(cid)
            state = load_state()
            state["custody_cohort_id"] = cid
            state["custody_soak_start"] = date.today().isoformat()
            save_state(state)
        dash = await admin.get_cohort(cid)
        fams: list[dict] = []
        for fam in dash.get("families", []):
            if not fam.get("family_file_id"):
                continue
            token = await self._ensure_token(admin, cid, fam)
            fams.append({
                "id": fam["id"], "family_file_id": fam["family_file_id"],
                "parent_a_email": fam["parent_a_email"], "parent_a_password": fam["parent_a_password"],
                "parent_a_name": fam.get("parent_a_name", "Parent A"),
                "parent_b_email": fam["parent_b_email"], "parent_b_password": fam["parent_b_password"],
                "parent_b_name": fam.get("parent_b_name", "Parent B"), "token": token,
            })
        return {"cohort_id": cid, "families": fams}

    async def custody_soak(self, admin: AdminClient, day: int | None = None) -> list[ScenarioResult]:
        from .scenarios.soak_custody import SCENARIOS as CUSTODY_SCENARIOS

        setup = await self._ensure_custody_family(admin)
        if day is None:
            start = (load_state() or {}).get("custody_soak_start")
            try:
                day = (date.today() - date.fromisoformat(start)).days + 1
            except Exception:
                day = 1
        print(f"\n▶ CUSTODY SOAK day {day}  ({self.cfg.summary()})")
        if not setup["families"]:
            raise SystemExit("Custody soak aborted: no usable seeded family.")
        results: list[ScenarioResult] = []
        for fam in setup["families"]:
            results += await self._run_family(fam, CUSTODY_SCENARIOS, day=day, idempotent=True)
        await self._finalize(admin, setup["cohort_id"], day=day, results=results)
        return results

    async def _finalize(self, admin: AdminClient, cohort_id: str, *, day: int, results: list[ScenarioResult]) -> None:
        digest = await rollup(self.ai, day, results)
        print(f"\n  ── Day {day} digest ──\n  {digest}\n")
        append_ledger({"ts": _now(), "type": "rollup", "day": day, "digest": digest,
                       "ai_degraded": self.ai.degraded, "ai_reason": self.ai.degraded_reason})
        if not self.cfg.dry_run:
            try:
                await admin.ai_overview(cohort_id)
            except Exception as e:
                logger.warning("ai-overview refresh failed: %s", e)


def _soak_slice(day: int, scenarios: list, per_day: int = 3) -> list:
    n = len(scenarios)
    if n == 0:
        return []
    start = ((max(day, 1) - 1) * per_day) % n
    return [scenarios[(start + i) % n] for i in range(min(per_day, n))]
