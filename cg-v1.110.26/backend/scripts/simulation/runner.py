"""
SimulationRunner — executes one simulation day for every family.

Stateless-safe: the cohort is recovered from the server by its exact name
(Render cron filesystems are ephemeral), the day index derives from
SIM_START_DATE, and every action is idempotency-tagged with
run_key = f"sim:{day}:{family_id}:{action_index}". When local state is missing,
re-executing a completed action is tolerated: 4xx conflicts are recorded and
the run continues.

NO-FIX POLICY: an action failure is a ledger line, never an abort. One
family's crash never stops the others.
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

from scripts.bug_campaign.admin_client import AdminClient
from scripts.bug_campaign.ai.anthropic_client import AnthropicClient
from scripts.bug_campaign.client import ApiError, ParentAgentClient
from scripts.bug_campaign.geo_oracle import is_within_geofence
from scripts.bug_campaign.ledger import append_ledger, load_state, save_state

from . import timeline as tl
from .archetypes import Archetype, assign_archetypes
from .config import (
    EXCHANGE_HOUR_UTC,
    EXCHANGE_MINUTE_UTC,
    EXCHANGE_WINDOW_AFTER_MIN,
    EXCHANGE_WINDOW_BEFORE_MIN,
    SIM_DAYS,
    SimConfig,
)
from .family_bible import FamilyBible, build_bible
from .messages import generate_message

logger = logging.getLogger("simulation.runner")

GEOFENCE_RADIUS_M = 100
GPS_ACCURACY_M = 15.0
OUTSIDE_OFFSET_DEG = 0.004  # ~440 m north — well outside a 100 m fence + buffer

AGREEMENT_SECTION_FILL = (
    "Both parents agree to follow the parenting schedule described in this "
    "simulation agreement, communicate through the platform, and prioritize "
    "the children's stability. (Auto-completed by the 14-day family simulation.)"
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sim_run_key(day: int, family_id: str, action_index: int) -> str:
    return f"sim:{day}:{family_id}:{action_index}"


class _FamilyCtx:
    """Per-family per-day execution context and caches."""

    def __init__(self, fam: dict, index: int, archetype: Archetype, bible: FamilyBible):
        self.fam = fam
        self.index = index
        self.archetype = archetype
        self.bible = bible
        self.pa: Optional[ParentAgentClient] = None
        self.pb: Optional[ParentAgentClient] = None
        self.child_ids: list[str] = []
        self.instances_today: Optional[list[dict]] = None
        self.events_cache: Optional[list] = None
        self.obligations_cache: Optional[list[dict]] = None
        self.thread_context: list[str] = []
        self.todays_events: list[str] = []

    @property
    def ff(self) -> str:
        return self.fam["family_file_id"]

    def client(self, who: str) -> ParentAgentClient:
        return self.pa if who == "A" else self.pb  # type: ignore[return-value]

    def other(self, who: str) -> ParentAgentClient:
        return self.pb if who == "A" else self.pa  # type: ignore[return-value]


class SimulationRunner:
    def __init__(self, sim: SimConfig):
        self.sim = sim
        self.cfg = sim.campaign
        self.ai = AnthropicClient(self.cfg)
        self.archetypes = assign_archetypes(sim.family_count)
        self.bibles = [build_bible(i, self.archetypes[i]) for i in range(sim.family_count)]

    # ---- cohort recovery / seeding (stateless-safe) --------------------------
    async def ensure_cohort(self, admin: AdminClient) -> tuple[str, list[dict]]:
        state = load_state()
        cohort_id = state.get("sim_cohort_id")
        if not cohort_id:
            # Ephemeral filesystem: recover the cohort from the server by exact name.
            try:
                existing = await admin.list_cohorts(limit=100)
                items = existing.get("items", existing) if isinstance(existing, dict) else existing
                for c in items or []:
                    if c.get("name") == self.sim.cohort_name:
                        cohort_id = c["id"]
                        state["sim_cohort_id"] = cohort_id
                        created = str(c.get("created_at", ""))[:10]
                        if created and not state.get("sim_start_date"):
                            state["sim_start_date"] = created
                        save_state(state)
                        print(f"  recovered sim cohort {cohort_id} from server (created {created or 'unknown'})")
                        break
            except Exception as exc:
                print(f"  cohort recovery check failed ({exc}); will create fresh")
        if not cohort_id:
            cohort = await admin.create_cohort(
                name=self.sim.cohort_name,
                target_feature="exchange",
                family_count=self.sim.family_count,
                description="Two-week family simulation: 50 scripted families living daily co-parenting life.",
                test_instructions="Automated 14-day simulation; see docs/SIMULATION_2WEEK.md. No fixes until day 15.",
            )
            cohort_id = cohort["id"]
            gen = await admin.generate_families(cohort_id)
            warns = (gen or {}).get("synthetic_id_families") or (gen or {}).get("warnings")
            if warns:
                logger.warning("family seeding warnings: %s", warns)
            state = load_state()
            state["sim_cohort_id"] = cohort_id
            state.setdefault("sim_start_date",
                             (self.sim.start_date or date.today()).isoformat())
            state.setdefault("sim_completed", [])
            save_state(state)
            print(f"  created sim cohort {cohort_id} with {self.sim.family_count} families")

        dash = await admin.get_cohort(cohort_id)
        fams = [f for f in dash.get("families", []) if f.get("family_file_id")]
        fams.sort(key=lambda f: f["id"])  # stable family_index mapping across days
        return cohort_id, fams

    def resolve_start_date(self) -> date:
        if self.sim.start_date:
            return self.sim.start_date
        raw = (load_state() or {}).get("sim_start_date")
        if raw:
            try:
                return date.fromisoformat(str(raw)[:10])
            except ValueError:
                pass
        return date.today()

    # ---- day driver ------------------------------------------------------------
    async def run_day(self, admin: AdminClient, day: int) -> None:
        day = max(1, min(SIM_DAYS, day))
        _, fams = await self.ensure_cohort(admin)
        start = self.resolve_start_date()
        sim_date = start + timedelta(days=day - 1)
        print(f"\n▶ SIMULATION day {day}/{SIM_DAYS}  date={sim_date}  "
              f"families={min(len(fams), self.sim.family_count)}  ({self.sim.summary()})")

        for index, fam in enumerate(fams[: self.sim.family_count]):
            try:
                await self._run_family(fam, index, day, start, sim_date)
            except Exception as exc:  # noqa: BLE001 — one family never stops others
                logger.exception("family %s crashed on day %s", fam.get("id"), day)
                append_ledger({
                    "ts": _now_iso(), "type": "sim_family_crash", "day": day,
                    "family_id": fam.get("id"), "family_index": index,
                    "error": repr(exc)[:500],
                })

        append_ledger({
            "ts": _now_iso(), "type": "sim_day_done", "day": day,
            "sim_date": sim_date.isoformat(),
            "families": min(len(fams), self.sim.family_count),
            "ai_degraded": self.ai.degraded, "ai_reason": self.ai.degraded_reason,
        })

    async def _run_family(self, fam: dict, index: int, day: int,
                          start: date, sim_date: date) -> None:
        archetype = self.archetypes[index]
        bible = self.bibles[index]
        plans = tl.compile_timeline(index, archetype, bible, start)
        plan = plans[day - 1]

        state = load_state()
        completed = set(state.get("sim_completed", []))

        ctx = _FamilyCtx(fam, index, archetype, bible)
        ctx.pa = ParentAgentClient(self.cfg, fam["parent_a_email"], fam["parent_a_password"],
                                   fam.get("parent_a_name", "Parent A"))
        ctx.pb = ParentAgentClient(self.cfg, fam["parent_b_email"], fam["parent_b_password"],
                                   fam.get("parent_b_name", "Parent B"))
        try:
            try:
                await ctx.pa.login()
                await ctx.pb.login()
            except Exception as exc:
                append_ledger({"ts": _now_iso(), "type": "sim_action", "day": day,
                               "family_id": fam["id"], "family_index": index,
                               "action": "login", "ok": False, "status": None,
                               "latency_ms": None, "endpoint": "/auth/login",
                               "drift": f"login_failed: {exc}"})
                return
            try:
                children = await ctx.pa.get_children(ctx.ff)
                ctx.child_ids = [c["id"] for c in children if c.get("id")]
            except Exception:
                ctx.child_ids = []

            print(f"  • f{index:02d} {fam['id'][:8]} "
                  f"[{archetype.custody}/{archetype.reliability}/"
                  f"{archetype.financial}/{archetype.tone}] {len(plan.actions)} action(s)")

            for a_idx, action in enumerate(plan.actions):
                key = _sim_run_key(day, fam["id"], a_idx)
                if key in completed:
                    continue
                if self.sim.action_delay_ms:
                    await asyncio.sleep(self.sim.action_delay_ms / 1000)
                record = {
                    "ts": _now_iso(), "type": "sim_action", "day": day,
                    "sim_date": sim_date.isoformat(),
                    "family_id": fam["id"], "family_index": index,
                    "action_index": a_idx, "run_key": key,
                    "action": type(action).__name__,
                    "archetype": {"custody": archetype.custody,
                                  "reliability": archetype.reliability,
                                  "financial": archetype.financial,
                                  "tone": archetype.tone},
                }
                if self.cfg.dry_run:
                    record.update({"ok": True, "status": None, "latency_ms": None,
                                   "endpoint": None, "detail": "dry_run"})
                    append_ledger(record)
                    continue
                t0 = time.perf_counter()
                try:
                    outcome = await self._exec_action(ctx, action, day, sim_date, a_idx)
                except ApiError as e:
                    outcome = {"ok": False, "status": e.status,
                               "endpoint": f"{e.method} {e.path}",
                               "detail": str(e.body)[:300]}
                    if e.status in (400, 404, 409, 422):
                        # Re-run of a completed action (empty state) or a benign
                        # conflict — tolerate, record, continue.
                        outcome["detail"] = f"conflict_tolerated: {outcome['detail']}"
                    else:
                        outcome["drift"] = f"http_{e.status}"
                except Exception as exc:  # noqa: BLE001
                    outcome = {"ok": False, "status": None, "endpoint": None,
                               "detail": repr(exc)[:300], "drift": "exception"}
                outcome.setdefault("latency_ms", int((time.perf_counter() - t0) * 1000))
                record.update(outcome)
                append_ledger(record)

                completed.add(key)
                st = load_state()
                done = set(st.get("sim_completed", []))
                done.add(key)
                st["sim_completed"] = sorted(done)
                save_state(st)
        finally:
            for c in (ctx.pa, ctx.pb):
                if c is not None:
                    try:
                        await c.aclose()
                    except Exception:
                        pass

    # ---- action executors --------------------------------------------------------
    async def _exec_action(self, ctx: _FamilyCtx, action: tl.Action, day: int,
                           sim_date: date, a_idx: int) -> dict:
        if isinstance(action, tl.SeedAgreement):
            return await self._seed_agreement(ctx)
        if isinstance(action, tl.SeedExchangeTemplate):
            return await self._seed_exchange_template(ctx, action, sim_date)
        if isinstance(action, tl.ExchangeAction):
            return await self._do_exchange(ctx, action, sim_date)
        if isinstance(action, tl.SendMessage):
            return await self._do_message(ctx, action, day, a_idx)
        if isinstance(action, tl.CreateEvent):
            return await self._do_create_event(ctx, action, sim_date)
        if isinstance(action, (tl.RsvpEvent, tl.SkipRsvp)):
            return await self._do_rsvp(ctx, action)
        if isinstance(action, tl.CreateObligation):
            return await self._do_create_obligation(ctx, action, day, sim_date)
        if isinstance(action, tl.FundObligation):
            return await self._do_fund(ctx, action)
        if isinstance(action, tl.RespondExpense):
            return await self._do_respond_expense(ctx, action)
        if isinstance(action, tl.GenerateReport):
            return await self._do_report(ctx, action, sim_date)
        return {"ok": False, "status": None, "endpoint": None,
                "detail": f"unknown action {type(action).__name__}", "drift": "unknown_action"}

    # -- seeding ---------------------------------------------------------------
    async def _seed_agreement(self, ctx: _FamilyCtx) -> dict:
        existing = await ctx.pa.list_agreements(ctx.ff)
        if existing:
            return {"ok": True, "status": 200, "endpoint": "GET /family-files/{id}/agreements",
                    "detail": f"agreement_exists ({len(existing)})"}
        created = await ctx.pa.create_family_agreement(ctx.ff, {
            "title": f"[SIM f{ctx.index:02d}] SharedCare Agreement",
            "agreement_type": "shared_care",
            "agreement_version": "v2_lite",
        })
        agreement_id = created["id"]
        detail = {"agreement_id": agreement_id, "sections_completed": 0,
                  "submitted": False, "approved_a": False, "approved_b": False}
        try:
            full = await ctx.pa.get_agreement(agreement_id)
            sections = full.get("sections", []) if isinstance(full, dict) else []
            for s in sections:
                if s.get("is_required") and not s.get("is_completed"):
                    await ctx.pa.update_agreement_section(
                        s["id"], {"content": AGREEMENT_SECTION_FILL})
                    detail["sections_completed"] += 1
            await ctx.pa.submit_agreement(agreement_id)
            detail["submitted"] = True
            await ctx.pa.approve_agreement(agreement_id, notes="sim seed approval A")
            detail["approved_a"] = True
            await ctx.pb.approve_agreement(agreement_id, notes="sim seed approval B")
            detail["approved_b"] = True
        except ApiError as e:
            # Record and continue — an unapproved agreement is a report line.
            return {"ok": False, "status": e.status,
                    "endpoint": f"{e.method} {e.path}",
                    "detail": f"agreement_flow_partial {detail} :: {str(e.body)[:200]}",
                    "drift": "agreement_flow_incomplete"}
        return {"ok": True, "status": 201, "endpoint": "POST /family-files/{id}/agreements",
                "detail": str(detail)}

    async def _seed_exchange_template(self, ctx: _FamilyCtx,
                                      a: tl.SeedExchangeTemplate, sim_date: date) -> dict:
        title = tl.exchange_title(ctx.index, tl.Slot(
            a.slot_key, a.api_weekday, a.direction, a.label, a.local_label, a.cadence))
        upcoming = await ctx.pa.list_upcoming(ctx.ff, limit=100)
        if any((i.get("title") or "") == title for i in upcoming or []):
            return {"ok": True, "status": 200, "endpoint": "GET /exchanges/case/{id}/upcoming",
                    "detail": f"template_exists {title!r}"}

        # First occurrence: first date >= sim_date whose platform weekday matches.
        d = sim_date
        for _ in range(8):
            if (d.weekday() + 1) % 7 == a.api_weekday:
                break
            d += timedelta(days=1)
        scheduled = datetime(d.year, d.month, d.day,
                             EXCHANGE_HOUR_UTC, EXCHANGE_MINUTE_UTC)
        start = self.resolve_start_date()
        end = datetime.combine(start + timedelta(days=15), datetime.min.time())

        from_c = ctx.pa if a.direction == "AB" else ctx.pb
        to_c = ctx.pb if a.direction == "AB" else ctx.pa
        payload = {
            "case_id": ctx.ff,
            "exchange_type": "both",
            "title": title,
            "from_parent_id": from_c.user_id,
            "to_parent_id": to_c.user_id,
            "pickup_child_ids": ctx.child_ids,
            "location": ctx.bible.location_name,
            "location_lat": ctx.bible.location_lat,
            "location_lng": ctx.bible.location_lng,
            "geofence_radius_meters": GEOFENCE_RADIUS_M,
            "check_in_window_before_minutes": EXCHANGE_WINDOW_BEFORE_MIN,
            "check_in_window_after_minutes": EXCHANGE_WINDOW_AFTER_MIN,
            "silent_handoff_enabled": True,
            "scheduled_time": scheduled.isoformat() + "Z",
            "duration_minutes": 30,
            "is_recurring": True,
            "recurrence_pattern": "biweekly" if a.cadence == "biweekly" else "weekly",
            "recurrence_days": [a.api_weekday],
            "recurrence_end_date": end.isoformat() + "Z",
        }
        exchange = await from_c.create_exchange(payload)
        ctx.instances_today = None  # invalidate cache
        return {"ok": True, "status": 201, "endpoint": "POST /exchanges/",
                "detail": f"template {title!r} id={exchange.get('id')}"}

    # -- exchanges ---------------------------------------------------------------
    async def _todays_instance(self, ctx: _FamilyCtx, slot_key: str,
                               sim_date: date) -> Optional[dict]:
        if ctx.instances_today is None:
            items: list[dict] = []
            try:
                items += await ctx.pa.list_upcoming(ctx.ff, limit=100) or []
            except ApiError:
                pass
            try:
                items += await ctx.pa.get_exchange_history(ctx.ff, days=2, upcoming_days=2) or []
            except ApiError:
                pass
            ctx.instances_today = items
        tag = f"[SIM f{ctx.index:02d}:{slot_key}]"
        for inst in ctx.instances_today:
            title = inst.get("title") or ""
            sched = str(inst.get("scheduled_time") or "")[:10]
            if tag in title and sched == sim_date.isoformat():
                return inst
        return None

    async def _do_exchange(self, ctx: _FamilyCtx, a: tl.ExchangeAction,
                           sim_date: date) -> dict:
        inst = await self._todays_instance(ctx, a.slot_key, sim_date)
        endpoint = "POST /exchanges/instances/{id}/check-in/gps"
        if inst is None:
            return {"ok": False, "status": None, "endpoint": endpoint,
                    "detail": f"no instance for slot {a.slot_key} on {sim_date}",
                    "drift": "instance_not_found",
                    "expected": a.behavior}
        instance_id = inst.get("id")

        if a.behavior == "miss_both":
            # Deliberate no-show by both: the platform's own auto-close cron
            # records the miss; nothing to call.
            ctx.todays_events.append("Both parents missed today's exchange (scripted).")
            return {"ok": True, "status": None, "endpoint": None,
                    "detail": f"scripted miss_both instance={instance_id}",
                    "expected": "missed"}

        if a.gps == "inside":
            lat, lng = ctx.bible.location_lat + 0.0001, ctx.bible.location_lng
        else:
            lat, lng = ctx.bible.location_lat + OUTSIDE_OFFSET_DEG, ctx.bible.location_lng
        expect_inside, _dist = is_within_geofence(
            lat, lng, ctx.bible.location_lat, ctx.bible.location_lng,
            GEOFENCE_RADIUS_M, GPS_ACCURACY_M)

        from_c = ctx.pa if a.direction == "AB" else ctx.pb
        to_c = ctx.pb if a.direction == "AB" else ctx.pa
        parties = {"A": ctx.pa, "B": ctx.pb}
        checkers: list[ParentAgentClient] = [from_c, to_c]
        if a.behavior == "miss_one_party" and a.missing_party:
            checkers = [c for c in checkers if c is not parties[a.missing_party]]

        notes = None
        if a.behavior == "late":
            notes = f"scripted late check-in (+{a.late_minutes} min)"

        statuses = []
        for c in checkers:
            res = await c.check_in_gps(instance_id, lat, lng, GPS_ACCURACY_M, notes=notes)
            statuses.append(res.get("status") or "ok")
        if a.behavior == "miss_one_party":
            ctx.todays_events.append(
                f"Parent {a.missing_party} missed today's {a.slot_key} exchange (scripted).")
        return {"ok": True, "status": 200, "endpoint": endpoint,
                "detail": (f"behavior={a.behavior} gps={a.gps} "
                           f"checkers={len(checkers)} oracle_inside={expect_inside} "
                           f"instance={instance_id} results={statuses}"),
                "expected": a.behavior}

    # -- messages ------------------------------------------------------------------
    async def _do_message(self, ctx: _FamilyCtx, a: tl.SendMessage,
                          day: int, a_idx: int) -> dict:
        seed = ctx.index * 100_000 + day * 100 + a_idx
        ai = None if self.ai.degraded else self.ai
        content = await generate_message(
            ctx.bible, a.tone, a.topic, ctx.thread_context, ctx.todays_events,
            a.sender, ai, seed)
        sender = ctx.client(a.sender)
        recipient = ctx.other(a.sender)
        payload = {
            "family_file_id": ctx.ff,
            "recipient_id": recipient.user_id,
            "content": content,
            "message_type": "text",
        }
        status, body = await sender.send_message(payload)
        detail: dict[str, Any] = {"tone": a.tone, "topic": a.topic,
                                  "expect_flag": a.expect_flag, "first_status": status}
        drift = None
        actual_flag = status == 202

        if status == 202 and isinstance(body, dict):
            rewrite = body.get("suggested_rewrite")
            accept = a_idx % 2 == 0 and bool(rewrite)
            final = rewrite if accept else content
            payload2 = dict(payload, content=final, aria_accepted_rewrite=True)
            status2, _body2 = await sender.send_message(payload2)
            detail.update({"aria_score": body.get("toxicity_score"),
                           "aria_categories": body.get("categories"),
                           "accepted_rewrite": accept, "resend_status": status2})
            ctx.thread_context.append(str(final)[:200])
        elif status == 201:
            ctx.thread_context.append(content[:200])
        elif status == 400:
            detail["blocked"] = True
            drift = "hard_blocked (sim scripts avoid threats; investigate)"
        else:
            drift = f"send_status_{status}"

        if a.expect_flag and not actual_flag and status == 201:
            drift = "expected_flag_but_sent_clean"
        if not a.expect_flag and actual_flag and a.tone == "cooperative":
            drift = "cooperative_message_flagged (false positive)"

        out = {"ok": status in (201, 202), "status": status,
               "endpoint": "POST /messages/",
               "detail": str(detail)[:600],
               "expected": "flag" if a.expect_flag else "clean",
               "actual": "flag" if actual_flag else ("blocked" if status == 400 else "clean")}
        if drift:
            out["drift"] = drift
        return out

    # -- events / RSVP ----------------------------------------------------------------
    async def _do_create_event(self, ctx: _FamilyCtx, a: tl.CreateEvent,
                               sim_date: date) -> dict:
        start_dt = datetime.combine(sim_date + timedelta(days=a.day_offset),
                                    datetime.min.time()).replace(hour=17)
        ev = await ctx.pa.create_event({
            "title": a.title,
            "start_time": start_dt.isoformat() + "Z",
            "end_time": (start_dt + timedelta(hours=1)).isoformat() + "Z",
            "child_ids": ctx.child_ids,
            "visibility": "co_parent",
            "family_file_id": ctx.ff,
            "attendance_invites": [
                {"parent_id": ctx.pa.user_id, "invited_role": "parent_a"},
                {"parent_id": ctx.pb.user_id, "invited_role": "parent_b"},
            ],
        })
        ctx.events_cache = None
        return {"ok": True, "status": 201, "endpoint": "POST /schedule/events",
                "detail": f"event {a.title!r} id={ev.get('id')}"}

    async def _find_event(self, ctx: _FamilyCtx, title: str) -> Optional[dict]:
        if ctx.events_cache is None:
            data = await ctx.pa.list_events(ctx.ff)
            ctx.events_cache = data if isinstance(data, list) else \
                (data or {}).get("items", [])
        for e in ctx.events_cache:
            if (e.get("title") or "") == title:
                return e
        return None

    async def _do_rsvp(self, ctx: _FamilyCtx, a: "tl.RsvpEvent | tl.SkipRsvp") -> dict:
        if isinstance(a, tl.SkipRsvp):
            # Deliberate silence — the "ignored event" the report counts.
            return {"ok": True, "status": None, "endpoint": None,
                    "detail": f"scripted skip_rsvp who={a.who} event={a.title!r}",
                    "expected": "no_response"}
        ev = await self._find_event(ctx, a.title)
        if ev is None:
            return {"ok": False, "status": None, "endpoint": "PUT /events/{id}/rsvp",
                    "detail": f"event not found: {a.title!r}", "drift": "event_not_found"}
        await ctx.client(a.who).rsvp_event(ev["id"], a.status)
        return {"ok": True, "status": 200, "endpoint": "PUT /events/{id}/rsvp",
                "detail": f"who={a.who} status={a.status} event={a.title!r}"}

    # -- money --------------------------------------------------------------------------
    async def _do_create_obligation(self, ctx: _FamilyCtx, a: tl.CreateObligation,
                                    day: int, sim_date: date) -> dict:
        title = tl.obligation_title(ctx.index, day, a.description)
        creator = ctx.client(a.creator)
        due = datetime.combine(sim_date + timedelta(days=5), datetime.min.time())
        status, body = await creator.create_obligation({
            "case_id": ctx.ff,
            "purpose_category": a.category,
            "title": title,
            "description": f"{a.description} (14-day simulation, kind={a.kind})",
            "child_ids": ctx.child_ids,
            "total_amount": round(a.amount_cents / 100, 2),
            "petitioner_percentage": a.petitioner_percentage,
            "due_date": due.isoformat() + "Z",
            "verification_required": False,
            "receipt_required": False,
            "source_type": "request",
        })
        ctx.obligations_cache = None
        ok = status == 201
        out = {"ok": ok, "status": status, "endpoint": "POST /clearfund/obligations/",
               "detail": f"kind={a.kind} title={title!r} amount_cents={a.amount_cents} "
                         f"id={(body or {}).get('id') if isinstance(body, dict) else None}"}
        if status in (402, 403):
            out["detail"] += " (subscription-gated)"
            out["drift"] = "clearfund_gated"
        elif not ok:
            out["drift"] = f"obligation_create_{status}"
        return out

    async def _find_obligation(self, ctx: _FamilyCtx, day_ref: int) -> Optional[dict]:
        if ctx.obligations_cache is None:
            data = await ctx.pa.list_obligations(ctx.ff, page_size=100)
            items = data.get("items", []) if isinstance(data, dict) else (data or [])
            ctx.obligations_cache = items
        prefix = f"[SIM f{ctx.index:02d}d{day_ref:02d}]"
        for ob in ctx.obligations_cache:
            if (ob.get("title") or "").startswith(prefix):
                return ob
        return None

    async def _do_fund(self, ctx: _FamilyCtx, a: tl.FundObligation) -> dict:
        ob = await self._find_obligation(ctx, a.day_ref)
        endpoint = "POST /clearfund/obligations/{id}/fund"
        if ob is None:
            return {"ok": False, "status": None, "endpoint": endpoint,
                    "detail": f"obligation from day {a.day_ref} not found",
                    "drift": "obligation_not_found"}
        payer = ctx.client(a.payer)
        share_key = "petitioner_share" if a.payer == "A" else "respondent_share"
        try:
            amount = float(ob.get(share_key) or ob.get("total_amount") or 0)
        except (TypeError, ValueError):
            amount = 0.0
        if amount <= 0:
            return {"ok": True, "status": None, "endpoint": None,
                    "detail": f"payer {a.payer} owes 0 on {ob.get('id')} — nothing to fund"}
        status, body = await payer.fund_obligation(ob["id"], {
            "amount": amount, "payment_method": "manual",
            "notes": "simulation scheduled payment",
        })
        ok = status < 400
        out = {"ok": ok, "status": status, "endpoint": endpoint,
               "detail": f"payer={a.payer} amount={amount} obligation={ob.get('id')}"}
        if not ok:
            # Stripe/payment prerequisites — mark-paid path unavailable; record.
            out["drift"] = f"funding_{status}"
            out["detail"] += f" body={str(body)[:200]}"
        return out

    async def _do_respond_expense(self, ctx: _FamilyCtx, a: tl.RespondExpense) -> dict:
        ob = await self._find_obligation(ctx, a.day_ref)
        if ob is None:
            return {"ok": False, "status": None, "endpoint": None,
                    "detail": f"expense from day {a.day_ref} not found",
                    "drift": "obligation_not_found"}
        responder = ctx.client(a.responder)
        if a.approve:
            share_key = "petitioner_share" if a.responder == "A" else "respondent_share"
            try:
                amount = float(ob.get(share_key) or 0)
            except (TypeError, ValueError):
                amount = 0.0
            if amount <= 0:
                return {"ok": True, "status": None, "endpoint": None,
                        "detail": f"approve: responder {a.responder} owes 0 — noop"}
            status, body = await responder.fund_obligation(ob["id"], {
                "amount": amount, "payment_method": "manual",
                "notes": "simulation expense approval (funding own share)",
            })
            ok = status < 400
            out = {"ok": ok, "status": status,
                   "endpoint": "POST /clearfund/obligations/{id}/fund",
                   "detail": f"approve share={amount} obligation={ob.get('id')}"}
            if not ok:
                out["drift"] = f"expense_approve_{status}"
                out["detail"] += f" body={str(body)[:200]}"
            return out
        status, body = await responder.dispute_obligation(
            ob["id"], "I don't agree this expense is necessary right now — we need to discuss it.")
        ok = status < 400
        out = {"ok": ok, "status": status,
               "endpoint": "POST /clearfund/obligations/{id}/dispute",
               "detail": f"decline(dispute) obligation={ob.get('id')}"}
        if not ok:
            out["drift"] = f"expense_dispute_{status}"
            out["detail"] += f" body={str(body)[:200]}"
        return out

    # -- reports ----------------------------------------------------------------------
    async def _do_report(self, ctx: _FamilyCtx, a: tl.GenerateReport,
                         sim_date: date) -> dict:
        who = ctx.client(a.who)
        start = self.resolve_start_date()
        status, size = await who.generate_parent_report(
            a.report_type, ctx.ff, start.isoformat(), sim_date.isoformat())
        ok = status == 200 and size > 0
        out = {"ok": ok, "status": status,
               "endpoint": "POST /parent-reports/generate/{type}",
               "detail": f"type={a.report_type} who={a.who} pdf_bytes={size}"}
        if not ok:
            out["drift"] = f"report_{a.report_type}_{status}"
        return out
