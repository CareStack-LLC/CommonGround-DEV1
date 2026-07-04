"""
Timeline compiler — turns (family index, archetype, bible, start date) into a
deterministic 14-day script of Action objects.

ALL randomness is drawn at compile time from random.Random(2000 + family_index)
so reruns produce the same script; the runtime NEVER draws unseeded randomness
for behavior decisions. Misses/lates are scripted into specific occurrences, so
expected numbers are known in advance and the daily report can compare
expected vs recorded.

Custody pattern -> weekly exchange slots follow docs/SIMULATION_2WEEK.md:
  every_weekend:        Fri 18:00 pickup + Sun 18:00 return, weekly
  alternating_weekends: Fri + Sun every other week, + Wed dinner both weeks
  2_2_3:                Mon / Wed / Fri handoffs, weekly
  week_on_week_off:     Mon 08:00 handoff, weekly
  3_4_4_3:              Wed + Sat handoffs, weekly
  split_week_5_2:       Fri evening + Sun evening, weekly

NOTE on times: the narrative local times above live in slot labels; the actual
scheduled_time of every slot is 15:40 UTC with a ±120 min check-in window so
the daily 15:00 UTC cron can physically check in (see config.py).
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Union

from .archetypes import Archetype
from .config import SIM_DAYS
from .family_bible import FamilyBible

# ---- actions ----------------------------------------------------------------


@dataclass(frozen=True)
class SeedAgreement:
    """Day 1: create SharedCare agreement, complete sections, submit, both approve."""


@dataclass(frozen=True)
class SeedExchangeTemplate:
    """Day 1: create one recurring CustodyExchange template."""
    slot_key: str            # stable id, also embedded in the exchange title
    api_weekday: int         # 0=Sun .. 6=Sat (platform convention)
    direction: str           # 'AB' (A hands to B) | 'BA'
    label: str               # e.g. "Friday pickup"
    local_label: str         # narrative local time, e.g. "Fri 18:00"
    cadence: str             # 'weekly' | 'biweekly'


@dataclass(frozen=True)
class ExchangeAction:
    slot_key: str
    direction: str                  # 'AB' | 'BA'
    behavior: str                   # 'on_time' | 'late' | 'miss_one_party' | 'miss_both'
    gps: str                        # 'inside' | 'outside'
    missing_party: str | None = None  # 'A' | 'B' when behavior == miss_one_party
    late_minutes: int = 0           # scripted +20..90 for behavior == 'late'


@dataclass(frozen=True)
class SendMessage:
    sender: str                     # 'A' | 'B'
    topic: str
    tone: str                       # 'cooperative' | 'tense' | 'hostile'
    expect_flag: bool


@dataclass(frozen=True)
class CreateEvent:
    title: str                      # unique tag included, used for recovery
    day_offset: int                 # event start = sim day + offset


@dataclass(frozen=True)
class RsvpEvent:
    who: str                        # 'A' | 'B'
    status: str                     # 'going' | 'not_going' | 'maybe'
    day_ref: int                    # day the event was created
    title: str


@dataclass(frozen=True)
class SkipRsvp:
    """Deliberate non-response — counted as an ignored TimeBridge event."""
    who: str
    day_ref: int
    title: str


@dataclass(frozen=True)
class CreateObligation:
    kind: str                       # 'recurring_support' | 'one_off'
    amount_cents: int
    description: str
    creator: str                    # 'A' | 'B'
    petitioner_percentage: int      # A's share %; 0 => B pays all
    category: str = "other"


@dataclass(frozen=True)
class FundObligation:
    day_ref: int                    # day the obligation was created
    payer: str                      # 'A' | 'B'


@dataclass(frozen=True)
class RespondExpense:
    day_ref: int
    approve: bool                   # True => fund own share; False => dispute
    responder: str                  # 'A' | 'B'


@dataclass(frozen=True)
class GenerateReport:
    report_type: str                # custody_time | communication | expense
    who: str                        # 'A' | 'B'


Action = Union[
    SeedAgreement, SeedExchangeTemplate, ExchangeAction, SendMessage,
    CreateEvent, RsvpEvent, SkipRsvp, CreateObligation, FundObligation,
    RespondExpense, GenerateReport,
]


@dataclass
class DayPlan:
    day: int
    actions: list[Action] = field(default_factory=list)


# ---- custody pattern -> slots ------------------------------------------------

@dataclass(frozen=True)
class Slot:
    key: str
    api_weekday: int   # 0=Sun..6=Sat
    direction: str
    label: str
    local_label: str
    cadence: str       # weekly | biweekly


PATTERN_SLOTS: dict[str, list[Slot]] = {
    "every_weekend": [
        Slot("fri_pickup", 5, "AB", "Friday pickup", "Fri 18:00", "weekly"),
        Slot("sun_return", 0, "BA", "Sunday return", "Sun 18:00", "weekly"),
    ],
    "alternating_weekends": [
        Slot("fri_pickup", 5, "AB", "Friday pickup", "Fri 18:00", "biweekly"),
        Slot("sun_return", 0, "BA", "Sunday return", "Sun 18:00", "biweekly"),
        Slot("wed_dinner", 3, "AB", "Wednesday dinner exchange", "Wed 17:30", "weekly"),
    ],
    "2_2_3": [
        Slot("mon_handoff", 1, "AB", "Monday handoff", "Mon 18:00", "weekly"),
        Slot("wed_handoff", 3, "BA", "Wednesday handoff", "Wed 18:00", "weekly"),
        Slot("fri_handoff", 5, "AB", "Friday handoff", "Fri 18:00", "weekly"),
    ],
    "week_on_week_off": [
        Slot("mon_handoff", 1, "AB", "Monday morning handoff", "Mon 08:00", "weekly"),
    ],
    "3_4_4_3": [
        Slot("wed_handoff", 3, "AB", "Wednesday handoff", "Wed 18:00", "weekly"),
        Slot("sat_handoff", 6, "BA", "Saturday handoff", "Sat 10:00", "weekly"),
    ],
    "split_week_5_2": [
        Slot("fri_evening", 5, "AB", "Friday evening handoff", "Fri 18:00", "weekly"),
        Slot("sun_evening", 0, "BA", "Sunday evening return", "Sun 19:00", "weekly"),
    ],
}

EXPENSE_POOL = [
    "school supplies", "medical copay", "soccer cleats", "winter coat",
    "field trip fee", "birthday party supplies", "new backpack",
    "eyeglasses", "swim lessons block", "science fair materials",
]

REPORT_ROTATION = ["custody_time", "communication", "expense"]


def _api_weekday(d: date) -> int:
    """Python Mon=0..Sun=6 -> platform 0=Sun..6=Sat."""
    return (d.weekday() + 1) % 7


def exchange_title(family_index: int, slot: Slot) -> str:
    """Deterministic template title — the runner recovers instances by it."""
    return f"[SIM f{family_index:02d}:{slot.key}] {slot.label} ({slot.local_label})"


def event_title(family_index: int, day: int, seq: int, text: str) -> str:
    return f"[SIM f{family_index:02d}d{day:02d}e{seq}] {text}"


def obligation_title(family_index: int, day: int, text: str) -> str:
    return f"[SIM f{family_index:02d}d{day:02d}] {text}"


# ---- occurrence + behavior compilation ---------------------------------------

def _occurrences(custody: str, start_date: date) -> list[tuple[int, Slot]]:
    """All (day, slot) exchange occurrences within days 1..SIM_DAYS."""
    occ: list[tuple[int, Slot]] = []
    for slot in PATTERN_SLOTS[custody]:
        step = 14 if slot.cadence == "biweekly" else 7
        first = None
        for d in range(1, SIM_DAYS + 1):
            if _api_weekday(start_date + timedelta(days=d - 1)) == slot.api_weekday:
                first = d
                break
        if first is None:
            continue
        d = first
        while d <= SIM_DAYS:
            occ.append((d, slot))
            d += step
    occ.sort(key=lambda t: (t[0], t[1].key))
    return occ


def _assign_behaviors(
    rng: random.Random, reliability: str, n: int
) -> list[tuple[str, str, str | None, int]]:
    """Per occurrence: (behavior, gps, missing_party, late_minutes). Deterministic."""
    plan: list[tuple[str, str, str | None, int]] = [("on_time", "inside", None, 0)] * n
    if n == 0 or reliability == "always_reliable":
        return plan

    def sample(k: int, exclude: set[int]) -> list[int]:
        pool = [i for i in range(n) if i not in exclude]
        k = min(k, len(pool))
        return rng.sample(pool, k) if k else []

    used: set[int] = set()
    if reliability == "mostly_reliable":
        bad = sample(max(1, round(0.10 * n)), used)
        for j, i in enumerate(bad):
            if j % 2 == 0:
                plan[i] = ("late", "inside", None, rng.randint(20, 90))
            else:
                plan[i] = ("miss_one_party", "inside", "B", 0)
        used.update(bad)
    elif reliability == "one_flaky_parent":
        bad = sample(max(1, round(0.25 * n)), used)
        for i in bad:
            plan[i] = ("miss_one_party", "inside", "B", 0)
        used.update(bad)
    elif reliability == "chaotic":
        late = sample(max(1, round(0.25 * n)), used)
        for i in late:
            plan[i] = ("late", "inside", None, rng.randint(20, 90))
        used.update(late)
        m1 = sample(max(1, round(0.20 * n)), used)
        for j, i in enumerate(m1):
            plan[i] = ("miss_one_party", "inside", "A" if j % 2 else "B", 0)
        used.update(m1)
        mb = sample(max(1, round(0.15 * n)), used)
        for i in mb:
            plan[i] = ("miss_both", "inside", None, 0)
        used.update(mb)
        # one scripted outside-geofence check-in among remaining attended slots
        attended = [i for i in range(n) if plan[i][0] in ("on_time", "late")]
        if attended:
            i = rng.choice(attended)
            b, _, m, lm = plan[i]
            plan[i] = (b, "outside", m, lm)
    return plan


# ---- message tone scripting ---------------------------------------------------

def _day_message_specs(
    rng: random.Random, tone: str, day: int, count: int, borderline_days: set[int],
) -> list[tuple[str, bool]]:
    """List of (tone, expect_flag) for a day's messages."""
    specs: list[tuple[str, bool]] = []
    hostile_today = 0
    if tone == "hostile":
        hostile_today = 1 if rng.random() < 0.6 else 2
    elif tone == "escalating" and day >= 11:
        hostile_today = rng.randint(1, 2)

    tense_today = 0
    if tone == "tense" and day in borderline_days:
        tense_today = 1
    elif tone == "escalating" and 8 <= day <= 10:
        tense_today = 1
    elif tone == "hostile":
        tense_today = 1 if rng.random() < 0.4 else 0

    for _ in range(min(hostile_today, count)):
        specs.append(("hostile", True))
    for _ in range(min(tense_today, max(0, count - len(specs)))):
        specs.append(("tense", False))
    while len(specs) < count:
        specs.append(("cooperative", False))
    rng.shuffle(specs)
    return specs


# ---- main compiler -------------------------------------------------------------

def compile_timeline(
    family_index: int,
    archetype: Archetype,
    bible: FamilyBible,
    start_date: date,
) -> list[DayPlan]:
    """Compile the full deterministic 14-day script for one family."""
    rng = random.Random(2000 + family_index)
    days: dict[int, DayPlan] = {d: DayPlan(day=d) for d in range(1, SIM_DAYS + 1)}

    # -- Day 1 seed: agreement + recurring exchange templates ------------------
    days[1].actions.append(SeedAgreement())
    for slot in PATTERN_SLOTS[archetype.custody]:
        days[1].actions.append(SeedExchangeTemplate(
            slot_key=slot.key, api_weekday=slot.api_weekday, direction=slot.direction,
            label=slot.label, local_label=slot.local_label, cadence=slot.cadence,
        ))

    # -- exchanges with scripted behaviors -------------------------------------
    occ = _occurrences(archetype.custody, start_date)
    behaviors = _assign_behaviors(rng, archetype.reliability, len(occ))
    miss_days: dict[int, tuple[str, str | None]] = {}  # day -> (behavior, missing_party)
    for (day, slot), (behavior, gps, missing, late_min) in zip(occ, behaviors):
        days[day].actions.append(ExchangeAction(
            slot_key=slot.key, direction=slot.direction, behavior=behavior,
            gps=gps, missing_party=missing, late_minutes=late_min,
        ))
        if behavior in ("miss_one_party", "miss_both"):
            miss_days[day] = (behavior, missing)

    # -- TimeBridge events: 3 on day 1, then one every ~3 days ------------------
    child = bible.children[0]
    initial_events = [
        (2, f"Dentist — {child.name}"),
        (4, f"{bible.activities[0].title()} practice — {child.name}"),
        (6, f"Parent-teacher night — {bible.school}"),
    ]
    event_registry: list[tuple[int, str]] = []  # (created_day, title)
    for seq, (offset, text) in enumerate(initial_events):
        title = event_title(family_index, 1, seq, text)
        days[1].actions.append(CreateEvent(title=title, day_offset=offset))
        event_registry.append((1, title))
    extra_pool = [
        f"Pediatric checkup — {child.name}",
        f"{bible.activities[1].title()} recital — {child.name}",
        f"School book fair — {bible.school}",
        f"Team photos — {bible.activities[0]}",
        f"Half-day pickup — {bible.school}",
    ]
    for k, day in enumerate((3, 6, 9, 12)):
        title = event_title(family_index, day, 0, extra_pool[k % len(extra_pool)])
        days[day].actions.append(CreateEvent(title=title, day_offset=rng.randint(2, 4)))
        event_registry.append((day, title))

    # RSVPs the day after creation, per reliability profile
    for created_day, title in event_registry:
        rsvp_day = created_day + 1
        if rsvp_day > SIM_DAYS:
            continue
        for who in ("A", "B"):
            r = rng.random()
            rel = archetype.reliability
            if rel == "always_reliable":
                act: Action = RsvpEvent(who, "going", created_day, title)
            elif rel == "mostly_reliable":
                if who == "A" or r < 0.7:
                    act = RsvpEvent(who, "going", created_day, title)
                else:
                    act = SkipRsvp(who, created_day, title)
            elif rel == "one_flaky_parent":
                if who == "A":
                    act = RsvpEvent(who, "going", created_day, title)
                else:
                    act = RsvpEvent(who, "going", created_day, title) if r < 0.2 \
                        else SkipRsvp(who, created_day, title)
            else:  # chaotic
                if r < 0.4:
                    act = RsvpEvent(who, "going", created_day, title)
                elif r < 0.6:
                    act = RsvpEvent(who, "maybe", created_day, title)
                elif r < 0.7:
                    act = RsvpEvent(who, "not_going", created_day, title)
                else:
                    act = SkipRsvp(who, created_day, title)
            days[rsvp_day].actions.append(act)

    # -- money -------------------------------------------------------------------
    argument_msgs: list[tuple[int, str, bool]] = []  # (day, tone, expect_flag)
    if archetype.has_recurring_support:
        month_label = start_date.strftime("%B %Y")
        days[1].actions.append(CreateObligation(
            kind="recurring_support",
            amount_cents=rng.choice(range(40000, 120001, 5000)),
            description=f"Monthly child support — {month_label}",
            creator="A", petitioner_percentage=0,  # Parent B pays 100%
            category="child_support",
        ))
        pay_day = 10 if archetype.late_payer else 3
        days[pay_day].actions.append(FundObligation(day_ref=1, payer="B"))

    if archetype.has_one_off_expenses:
        n_exp = 2 if archetype.financial == "disputed" else rng.randint(2, 4)
        create_days = sorted(rng.sample(range(2, 12), n_exp))
        for j, cday in enumerate(create_days):
            creator = "A" if (j + rng.randint(0, 1)) % 2 == 0 else "B"
            responder = "B" if creator == "A" else "A"
            days[cday].actions.append(CreateObligation(
                kind="one_off",
                amount_cents=rng.randrange(2500, 30001, 250),
                description=EXPENSE_POOL[(family_index + j) % len(EXPENSE_POOL)],
                creator=creator, petitioner_percentage=50,
                category=rng.choice(["education", "medical", "sports", "clothing", "other"]),
            ))
            respond_day = min(SIM_DAYS, cday + rng.randint(0, 2))
            approve = False if archetype.financial == "disputed" else rng.random() < 0.75
            days[respond_day].actions.append(RespondExpense(
                day_ref=cday, approve=approve, responder=responder,
            ))
            if not approve and archetype.financial == "disputed":
                arg_tone = "hostile" if archetype.tone in ("hostile", "escalating") else "tense"
                argument_msgs.append((respond_day, arg_tone, arg_tone == "hostile"))

    # -- weekly parent reports (days 7 and 14, subsets) ---------------------------
    if family_index % 5 == 0:
        days[7].actions.append(GenerateReport(
            report_type=REPORT_ROTATION[family_index % 3], who="A"))
    if family_index % 2 == 0:
        days[14].actions.append(GenerateReport(
            report_type=REPORT_ROTATION[(family_index // 2) % 3], who="B"))

    # -- messages ------------------------------------------------------------------
    borderline_days: set[int] = set()
    if archetype.tone == "tense":
        borderline_days = set(rng.sample(range(1, SIM_DAYS + 1), 5))  # 2-3/week

    for day in range(1, SIM_DAYS + 1):
        d_date = start_date + timedelta(days=day - 1)
        weekend = _api_weekday(d_date) in (0, 6)
        count = rng.randint(2, 6) if weekend else rng.randint(3, 8)
        if day == 1:
            count = 2  # seeding day: two intro messages
        tone_for_day = archetype.tone
        if archetype.tone == "escalating" and day <= 7:
            tone_for_day = "cooperative"
        specs = _day_message_specs(rng, tone_for_day, day, count, borderline_days)

        # reaction to today's scripted miss ("you missed pickup again")
        if day in miss_days:
            behavior, missing = miss_days[day]
            sender = "A" if missing in ("B", None) else "B"
            r_tone = "hostile" if tone_for_day in ("hostile",) or (
                archetype.tone == "escalating" and day >= 11) else (
                "tense" if tone_for_day in ("tense", "escalating") or
                archetype.reliability == "chaotic" else "cooperative")
            days[day].actions.append(SendMessage(
                sender=sender, topic="missed_exchange", tone=r_tone,
                expect_flag=r_tone == "hostile",
            ))

        sender = rng.choice(["A", "B"])
        for tone, expect_flag in specs:
            topic = "intro" if day == 1 else bible.topics[rng.randrange(len(bible.topics))]
            days[day].actions.append(SendMessage(
                sender=sender, topic=topic, tone=tone, expect_flag=expect_flag,
            ))
            sender = "B" if sender == "A" else "A"

        for arg_day, arg_tone, arg_flag in argument_msgs:
            if arg_day == day:
                days[day].actions.append(SendMessage(
                    sender=rng.choice(["A", "B"]), topic="expense_dispute",
                    tone=arg_tone, expect_flag=arg_flag,
                ))

    return [days[d] for d in range(1, SIM_DAYS + 1)]


# ---- expected-count summaries (used by report + selftest) ----------------------

def summarize_plan(plans: list[DayPlan], upto_day: int | None = None) -> dict[str, int]:
    """Deterministic expected counters, recompiled — never taken from the ledger."""
    c: dict[str, int] = {
        "exchanges_due": 0, "scripted_late": 0, "scripted_miss_one_party": 0,
        "scripted_miss_both": 0, "gps_outside": 0, "messages": 0,
        "expected_flags": 0, "borderline_tense": 0, "events_created": 0,
        "rsvps": 0, "rsvp_skips": 0, "obligations_recurring": 0,
        "obligations_one_off": 0, "fundings": 0, "expense_approvals": 0,
        "expense_disputes": 0, "reports": 0, "seed_agreements": 0,
        "exchange_templates": 0,
    }
    for plan in plans:
        if upto_day is not None and plan.day > upto_day:
            continue
        for a in plan.actions:
            if isinstance(a, ExchangeAction):
                c["exchanges_due"] += 1
                if a.behavior == "late":
                    c["scripted_late"] += 1
                elif a.behavior == "miss_one_party":
                    c["scripted_miss_one_party"] += 1
                elif a.behavior == "miss_both":
                    c["scripted_miss_both"] += 1
                if a.gps == "outside":
                    c["gps_outside"] += 1
            elif isinstance(a, SendMessage):
                c["messages"] += 1
                if a.expect_flag:
                    c["expected_flags"] += 1
                if a.tone == "tense":
                    c["borderline_tense"] += 1
            elif isinstance(a, CreateEvent):
                c["events_created"] += 1
            elif isinstance(a, RsvpEvent):
                c["rsvps"] += 1
            elif isinstance(a, SkipRsvp):
                c["rsvp_skips"] += 1
            elif isinstance(a, CreateObligation):
                key = "obligations_recurring" if a.kind == "recurring_support" \
                    else "obligations_one_off"
                c[key] += 1
            elif isinstance(a, FundObligation):
                c["fundings"] += 1
            elif isinstance(a, RespondExpense):
                c["expense_approvals" if a.approve else "expense_disputes"] += 1
            elif isinstance(a, GenerateReport):
                c["reports"] += 1
            elif isinstance(a, SeedAgreement):
                c["seed_agreements"] += 1
            elif isinstance(a, SeedExchangeTemplate):
                c["exchange_templates"] += 1
    return c
