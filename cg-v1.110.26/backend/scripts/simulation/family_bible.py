"""
Family bible — each family's persistent story, deterministic from its index
(random.Random(1000 + i)).

The bible drives message coherence: children's names/ages, school, activities,
the exchange location they actually use, and short parent personas. Note the
bible's child NAMES are narrative only (used in message text); API calls use
the real child ids of the server-seeded family.
"""

from __future__ import annotations

import random
from dataclasses import dataclass

from .archetypes import Archetype

# ~10 real exchange-location presets around one metro area (Atlanta, GA).
# (name, lat, lng)
LOCATION_PRESETS: list[tuple[str, float, float]] = [
    ("Piedmont Park — Charles Allen Gate", 33.7851, -84.3738),
    ("Centennial Olympic Park fountain", 33.7603, -84.3936),
    ("Ponce City Market front entrance", 33.7726, -84.3663),
    ("Grant Park — Cherokee Ave lot", 33.7365, -84.3703),
    ("Decatur Library parking lot", 33.7756, -84.2941),
    ("Lenox Square Mall food court entrance", 33.8463, -84.3621),
    ("Marietta Square gazebo", 33.9526, -84.5499),
    ("Stone Mountain Park west gate", 33.8053, -84.1455),
    ("Starbucks Decatur Square", 33.7748, -84.2963),
    ("East Atlanta Village library", 33.7407, -84.3439),
]

FIRST_NAMES = [
    "Ava", "Liam", "Maya", "Noah", "Zoe", "Ethan", "Ruby", "Mason", "Ivy",
    "Lucas", "Nora", "Owen", "Layla", "Caleb", "Sadie", "Jonah", "Priya",
    "Mateo", "Amara", "Finn", "Keisha", "Diego", "Harper", "Andre",
]

SCHOOLS = [
    "Briarwood Elementary", "Lakeside Middle School", "Morningside Elementary",
    "Peachtree Charter", "Druid Hills Academy", "Westview STEM School",
    "Oak Grove Elementary", "Candler Park Primary", "Northside Prep",
    "Springdale Park Elementary",
]

ACTIVITIES = [
    "soccer", "piano", "swim team", "gymnastics", "karate", "ballet",
    "scouts", "robotics club", "basketball", "art class", "violin", "chess club",
]

BASE_TOPICS = [
    "pickup_logistics", "school", "activity_schedule", "doctor_appointment",
    "clothes_and_gear", "bedtime_routine", "weekend_plans", "homework",
]

PERSONA_A = [
    "organized planner, communicates in lists",
    "warm but busy ER nurse, replies late at night",
    "teacher, precise about schedules",
    "software engineer, terse but reliable",
    "small-business owner, juggles a lot",
]
PERSONA_B = [
    "laid-back, loses track of time",
    "shift worker with a rotating schedule",
    "new job, stressed, defensive about money",
    "devoted but disorganized, forgets gear",
    "recently moved apartments, adjusting",
]


@dataclass(frozen=True)
class ChildInfo:
    name: str
    age: int


@dataclass(frozen=True)
class FamilyBible:
    family_index: int
    children: tuple[ChildInfo, ...]
    school: str
    activities: tuple[str, str]
    location_name: str
    location_lat: float
    location_lng: float
    parent_a_persona: str
    parent_b_persona: str
    topics: tuple[str, ...]


def build_bible(family_index: int, archetype: Archetype) -> FamilyBible:
    """Deterministic per-family story (random.Random(1000 + family_index))."""
    rng = random.Random(1000 + family_index)

    n_children = rng.choice([1, 1, 2, 2, 3])
    names = rng.sample(FIRST_NAMES, n_children)
    children = tuple(ChildInfo(name=n, age=rng.randint(4, 14)) for n in names)

    school = rng.choice(SCHOOLS)
    activities = tuple(rng.sample(ACTIVITIES, 2))
    loc_name, lat, lng = LOCATION_PRESETS[family_index % len(LOCATION_PRESETS)]

    topics = list(BASE_TOPICS)
    if archetype.has_one_off_expenses or archetype.has_recurring_support:
        topics.append("expenses")
    if archetype.tone in ("tense", "hostile", "escalating"):
        topics.append("schedule_changes")
    rng.shuffle(topics)

    return FamilyBible(
        family_index=family_index,
        children=children,
        school=school,
        activities=(activities[0], activities[1]),
        location_name=loc_name,
        location_lat=lat,
        location_lng=lng,
        parent_a_persona=rng.choice(PERSONA_A),
        parent_b_persona=rng.choice(PERSONA_B),
        topics=tuple(topics),
    )
