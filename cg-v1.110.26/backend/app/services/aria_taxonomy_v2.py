"""
ARIA Sentinel Shield V2 — 32-Category Taxonomy

8 domains, 32 categories. Each category has:
- weight: scoring weight (0.0-1.0)
- severity_floor: minimum severity level (1-5)
- reporting_tags: tags for court reports
- description: human-readable explanation
"""

from enum import Enum
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple


class V2Domain(str, Enum):
    """8 high-level abuse/conflict domains."""
    CTRL = "coercive_control"
    THRT = "threats"
    PSYB = "psychological_abuse"
    CONT = "contempt"
    ALNT = "alienation"
    ESCP = "escalation"
    PAGG = "passive_aggression"
    MNIP = "manipulation"


class V2Category(str, Enum):
    """32 V2 toxicity categories across 8 domains."""
    # CTRL — Coercive Control
    SCHEDULE_CONTROL = "schedule_control"
    FINANCIAL_CONTROL = "financial_control"
    ISOLATION_TACTICS = "isolation_tactics"
    DECISION_OVERRIDE = "decision_override"

    # THRT — Threats
    DIRECT_THREAT = "direct_threat"
    VEILED_THREAT = "veiled_threat"
    LEGAL_WEAPONIZATION = "legal_weaponization"
    CHILD_THREAT = "child_threat"

    # PSYB — Psychological Abuse
    GASLIGHTING = "gaslighting"
    BLAME_SHIFTING = "blame_shifting"
    MINIMIZATION = "minimization"
    INVALIDATION = "invalidation"

    # CONT — Contempt
    NAME_CALLING = "name_calling"
    CHARACTER_ATTACK = "character_attack"
    MOCKERY = "mockery"
    DISGUST_EXPRESSION = "disgust_expression"

    # ALNT — Alienation
    CHILD_ALIENATION = "child_alienation"
    LOYALTY_CONFLICT = "loyalty_conflict"
    INFO_GATEKEEPING = "info_gatekeeping"
    RELATIONSHIP_SABOTAGE = "relationship_sabotage"

    # ESCP — Escalation
    ANGER_ESCALATION = "anger_escalation"
    DEMAND_ESCALATION = "demand_escalation"
    BOUNDARY_VIOLATION = "boundary_violation"
    PATTERN_ACCELERATION = "pattern_acceleration"

    # MNIP — Manipulation
    GUILT_INDUCTION = "guilt_induction"
    EMOTIONAL_BLACKMAIL = "emotional_blackmail"
    FALSE_VICTIMHOOD = "false_victimhood"
    TRIANGULATION = "triangulation"

    # PAGG — Passive Aggression
    SILENT_TREATMENT = "silent_treatment"
    WEAPONIZED_COMPLIANCE = "weaponized_compliance"
    BACKHANDED_COMPLIMENT = "backhanded_compliment"
    SELECTIVE_MEMORY = "selective_memory"


@dataclass(frozen=True)
class CategoryMeta:
    """Metadata for a V2 category."""
    domain: V2Domain
    weight: float          # 0.0-1.0 scoring weight
    severity_floor: int    # 1-5 minimum severity
    reporting_tags: Tuple[str, ...]
    description: str


# Master registry: every V2 category → its metadata
CATEGORY_REGISTRY: Dict[V2Category, CategoryMeta] = {
    # ── CTRL ──
    V2Category.SCHEDULE_CONTROL: CategoryMeta(
        domain=V2Domain.CTRL, weight=0.7, severity_floor=2,
        reporting_tags=("coercive_control", "schedule"),
        description="Unilaterally dictating or blocking schedule changes",
    ),
    V2Category.FINANCIAL_CONTROL: CategoryMeta(
        domain=V2Domain.CTRL, weight=0.7, severity_floor=2,
        reporting_tags=("coercive_control", "financial"),
        description="Using money/expenses as leverage over parenting",
    ),
    V2Category.ISOLATION_TACTICS: CategoryMeta(
        domain=V2Domain.CTRL, weight=0.8, severity_floor=3,
        reporting_tags=("coercive_control", "isolation"),
        description="Attempting to cut off the other parent from support or information",
    ),
    V2Category.DECISION_OVERRIDE: CategoryMeta(
        domain=V2Domain.CTRL, weight=0.7, severity_floor=2,
        reporting_tags=("coercive_control", "decision"),
        description="Making unilateral decisions that should be joint",
    ),

    # ── THRT ──
    V2Category.DIRECT_THREAT: CategoryMeta(
        domain=V2Domain.THRT, weight=1.0, severity_floor=5,
        reporting_tags=("threat", "physical", "zero_tolerance"),
        description="Explicit threats of physical harm",
    ),
    V2Category.VEILED_THREAT: CategoryMeta(
        domain=V2Domain.THRT, weight=0.85, severity_floor=4,
        reporting_tags=("threat", "implied"),
        description="Implied or indirect threats",
    ),
    V2Category.LEGAL_WEAPONIZATION: CategoryMeta(
        domain=V2Domain.THRT, weight=0.8, severity_floor=3,
        reporting_tags=("threat", "legal", "custody"),
        description="Using legal system as weapon (CPS threats, custody threats)",
    ),
    V2Category.CHILD_THREAT: CategoryMeta(
        domain=V2Domain.THRT, weight=1.0, severity_floor=5,
        reporting_tags=("threat", "child", "zero_tolerance"),
        description="Threats involving children's safety or wellbeing",
    ),

    # ── PSYB ──
    V2Category.GASLIGHTING: CategoryMeta(
        domain=V2Domain.PSYB, weight=0.8, severity_floor=3,
        reporting_tags=("psychological", "gaslighting"),
        description="Denying reality, making the other parent question their memory",
    ),
    V2Category.BLAME_SHIFTING: CategoryMeta(
        domain=V2Domain.PSYB, weight=0.6, severity_floor=2,
        reporting_tags=("psychological", "blame"),
        description="Deflecting responsibility onto the other parent",
    ),
    V2Category.MINIMIZATION: CategoryMeta(
        domain=V2Domain.PSYB, weight=0.6, severity_floor=2,
        reporting_tags=("psychological", "minimization"),
        description="Downplaying the other parent's valid concerns",
    ),
    V2Category.INVALIDATION: CategoryMeta(
        domain=V2Domain.PSYB, weight=0.6, severity_floor=2,
        reporting_tags=("psychological", "invalidation"),
        description="Dismissing the other parent's feelings or experiences",
    ),

    # ── CONT ──
    V2Category.NAME_CALLING: CategoryMeta(
        domain=V2Domain.CONT, weight=0.6, severity_floor=2,
        reporting_tags=("contempt", "insult"),
        description="Direct insults or name-calling",
    ),
    V2Category.CHARACTER_ATTACK: CategoryMeta(
        domain=V2Domain.CONT, weight=0.7, severity_floor=3,
        reporting_tags=("contempt", "character"),
        description="Attacks on the other parent's character or parenting ability",
    ),
    V2Category.MOCKERY: CategoryMeta(
        domain=V2Domain.CONT, weight=0.5, severity_floor=2,
        reporting_tags=("contempt", "mockery"),
        description="Sarcasm, ridicule, or mocking the other parent",
    ),
    V2Category.DISGUST_EXPRESSION: CategoryMeta(
        domain=V2Domain.CONT, weight=0.5, severity_floor=2,
        reporting_tags=("contempt", "disgust"),
        description="Expressions of disgust or revulsion toward the other parent",
    ),

    # ── ALNT ──
    V2Category.CHILD_ALIENATION: CategoryMeta(
        domain=V2Domain.ALNT, weight=1.0, severity_floor=4,
        reporting_tags=("alienation", "child", "high_risk"),
        description="Turning children against the other parent",
    ),
    V2Category.LOYALTY_CONFLICT: CategoryMeta(
        domain=V2Domain.ALNT, weight=0.8, severity_floor=3,
        reporting_tags=("alienation", "loyalty"),
        description="Forcing children to choose sides",
    ),
    V2Category.INFO_GATEKEEPING: CategoryMeta(
        domain=V2Domain.ALNT, weight=0.7, severity_floor=2,
        reporting_tags=("alienation", "information"),
        description="Withholding important information about children",
    ),
    V2Category.RELATIONSHIP_SABOTAGE: CategoryMeta(
        domain=V2Domain.ALNT, weight=0.8, severity_floor=3,
        reporting_tags=("alienation", "sabotage"),
        description="Actively undermining the child's relationship with the other parent",
    ),

    # ── ESCP ──
    V2Category.ANGER_ESCALATION: CategoryMeta(
        domain=V2Domain.ESCP, weight=0.7, severity_floor=3,
        reporting_tags=("escalation", "anger"),
        description="Rapidly increasing anger or aggression in the conversation",
    ),
    V2Category.DEMAND_ESCALATION: CategoryMeta(
        domain=V2Domain.ESCP, weight=0.6, severity_floor=2,
        reporting_tags=("escalation", "demands"),
        description="Escalating demands or ultimatums",
    ),
    V2Category.BOUNDARY_VIOLATION: CategoryMeta(
        domain=V2Domain.ESCP, weight=0.7, severity_floor=3,
        reporting_tags=("escalation", "boundaries"),
        description="Ignoring stated boundaries or limits",
    ),
    V2Category.PATTERN_ACCELERATION: CategoryMeta(
        domain=V2Domain.ESCP, weight=0.6, severity_floor=2,
        reporting_tags=("escalation", "pattern"),
        description="Increasing frequency or intensity of problematic behavior",
    ),

    # ── MNIP ──
    V2Category.GUILT_INDUCTION: CategoryMeta(
        domain=V2Domain.MNIP, weight=0.6, severity_floor=2,
        reporting_tags=("manipulation", "guilt"),
        description="Guilt-tripping the other parent",
    ),
    V2Category.EMOTIONAL_BLACKMAIL: CategoryMeta(
        domain=V2Domain.MNIP, weight=0.8, severity_floor=3,
        reporting_tags=("manipulation", "blackmail"),
        description="Using threats of self-harm or emotional pressure as leverage",
    ),
    V2Category.FALSE_VICTIMHOOD: CategoryMeta(
        domain=V2Domain.MNIP, weight=0.7, severity_floor=2,
        reporting_tags=("manipulation", "victim"),
        description="Playing the victim to manipulate the other parent",
    ),
    V2Category.TRIANGULATION: CategoryMeta(
        domain=V2Domain.MNIP, weight=0.7, severity_floor=3,
        reporting_tags=("manipulation", "triangulation"),
        description="Involving third parties to manipulate or pressure",
    ),

    # ── PAGG ──
    V2Category.SILENT_TREATMENT: CategoryMeta(
        domain=V2Domain.PAGG, weight=0.4, severity_floor=1,
        reporting_tags=("passive_aggression", "avoidance"),
        description="Deliberately ignoring communication as punishment",
    ),
    V2Category.WEAPONIZED_COMPLIANCE: CategoryMeta(
        domain=V2Domain.PAGG, weight=0.4, severity_floor=1,
        reporting_tags=("passive_aggression", "compliance"),
        description="Technically complying while undermining the spirit of agreements",
    ),
    V2Category.BACKHANDED_COMPLIMENT: CategoryMeta(
        domain=V2Domain.PAGG, weight=0.3, severity_floor=1,
        reporting_tags=("passive_aggression", "sarcasm"),
        description="Compliments that contain hidden insults or criticism",
    ),
    V2Category.SELECTIVE_MEMORY: CategoryMeta(
        domain=V2Domain.PAGG, weight=0.4, severity_floor=1,
        reporting_tags=("passive_aggression", "memory"),
        description="Conveniently forgetting agreements or commitments",
    ),
}


# ── V1 → V2 bridging ──

# Maps old V1 ToxicityCategory values to their V2 equivalents
V1_TO_V2_MAP: Dict[str, List[V2Category]] = {
    "profanity": [V2Category.DISGUST_EXPRESSION],
    "insult": [V2Category.NAME_CALLING],
    "hostility": [V2Category.NAME_CALLING, V2Category.CHARACTER_ATTACK],
    "sarcasm": [V2Category.MOCKERY, V2Category.BACKHANDED_COMPLIMENT],
    "blame": [V2Category.BLAME_SHIFTING],
    "dismissive": [V2Category.INVALIDATION, V2Category.MINIMIZATION],
    "threatening": [V2Category.DIRECT_THREAT, V2Category.VEILED_THREAT],
    "manipulation": [V2Category.GUILT_INDUCTION, V2Category.EMOTIONAL_BLACKMAIL],
    "passive_aggressive": [V2Category.BACKHANDED_COMPLIMENT, V2Category.WEAPONIZED_COMPLIANCE],
    "all_caps": [V2Category.ANGER_ESCALATION],
    "custody_weaponization": [V2Category.CHILD_ALIENATION, V2Category.LEGAL_WEAPONIZATION],
    "financial_coercion": [V2Category.FINANCIAL_CONTROL],
    "hate_speech": [V2Category.DISGUST_EXPRESSION, V2Category.CHARACTER_ATTACK],
    "sexual_harassment": [V2Category.BOUNDARY_VIOLATION],
}

# Reverse map: V2 category → best V1 label (for backward-compat API responses)
V2_TO_V1_MAP: Dict[V2Category, str] = {
    V2Category.SCHEDULE_CONTROL: "controlling",
    V2Category.FINANCIAL_CONTROL: "financial_coercion",
    V2Category.ISOLATION_TACTICS: "manipulation",
    V2Category.DECISION_OVERRIDE: "controlling",
    V2Category.DIRECT_THREAT: "threatening",
    V2Category.VEILED_THREAT: "threatening",
    V2Category.LEGAL_WEAPONIZATION: "custody_weaponization",
    V2Category.CHILD_THREAT: "threatening",
    V2Category.GASLIGHTING: "manipulation",
    V2Category.BLAME_SHIFTING: "blame",
    V2Category.MINIMIZATION: "dismissive",
    V2Category.INVALIDATION: "dismissive",
    V2Category.NAME_CALLING: "insult",
    V2Category.CHARACTER_ATTACK: "hostility",
    V2Category.MOCKERY: "sarcasm",
    V2Category.DISGUST_EXPRESSION: "hostility",
    V2Category.CHILD_ALIENATION: "custody_weaponization",
    V2Category.LOYALTY_CONFLICT: "custody_weaponization",
    V2Category.INFO_GATEKEEPING: "manipulation",
    V2Category.RELATIONSHIP_SABOTAGE: "custody_weaponization",
    V2Category.ANGER_ESCALATION: "hostility",
    V2Category.DEMAND_ESCALATION: "hostility",
    V2Category.BOUNDARY_VIOLATION: "hostility",
    V2Category.PATTERN_ACCELERATION: "hostility",
    V2Category.GUILT_INDUCTION: "manipulation",
    V2Category.EMOTIONAL_BLACKMAIL: "manipulation",
    V2Category.FALSE_VICTIMHOOD: "manipulation",
    V2Category.TRIANGULATION: "manipulation",
    V2Category.SILENT_TREATMENT: "passive_aggressive",
    V2Category.WEAPONIZED_COMPLIANCE: "passive_aggressive",
    V2Category.BACKHANDED_COMPLIMENT: "passive_aggressive",
    V2Category.SELECTIVE_MEMORY: "passive_aggressive",
}


def get_domain_categories(domain: V2Domain) -> List[V2Category]:
    """Return all categories belonging to a domain."""
    return [cat for cat, meta in CATEGORY_REGISTRY.items() if meta.domain == domain]


def get_domain_for_category(category: V2Category) -> V2Domain:
    """Return the domain for a given category."""
    return CATEGORY_REGISTRY[category].domain


def v2_categories_to_v1_labels(v2_cats: List[V2Category]) -> List[str]:
    """Convert V2 categories to V1 label strings for backward-compat responses."""
    v1_labels = set()
    for cat in v2_cats:
        label = V2_TO_V1_MAP.get(cat)
        if label:
            v1_labels.add(label)
    return sorted(v1_labels)


def calculate_v2_score(
    category_confidence: Dict[V2Category, float],
) -> float:
    """
    Calculate a composite toxicity score from V2 category detections.

    Only categories with confidence >= 0.6 are counted.
    Score = sum(weight * confidence) for qualifying categories, capped at 1.0.
    """
    score = 0.0
    for cat, confidence in category_confidence.items():
        if confidence < 0.6:
            continue
        meta = CATEGORY_REGISTRY.get(cat)
        if meta:
            score += meta.weight * confidence
    return min(1.0, score)


def get_max_severity(categories: List[V2Category]) -> int:
    """Return the highest severity floor among the given categories."""
    if not categories:
        return 0
    return max(CATEGORY_REGISTRY[cat].severity_floor for cat in categories if cat in CATEGORY_REGISTRY)


def get_reporting_tags(categories: List[V2Category]) -> List[str]:
    """Collect all unique reporting tags for the given categories."""
    tags = set()
    for cat in categories:
        meta = CATEGORY_REGISTRY.get(cat)
        if meta:
            tags.update(meta.reporting_tags)
    return sorted(tags)


def get_domain_scores(category_confidence: Dict[V2Category, float]) -> Dict[str, float]:
    """Aggregate confidence scores by domain."""
    domain_totals: Dict[str, float] = {}
    domain_counts: Dict[str, int] = {}
    for cat, conf in category_confidence.items():
        if conf < 0.6:
            continue
        meta = CATEGORY_REGISTRY.get(cat)
        if not meta:
            continue
        d = meta.domain.value
        domain_totals[d] = domain_totals.get(d, 0.0) + conf
        domain_counts[d] = domain_counts.get(d, 0) + 1
    # Average confidence per domain
    return {d: round(domain_totals[d] / domain_counts[d], 3) for d in domain_totals}
