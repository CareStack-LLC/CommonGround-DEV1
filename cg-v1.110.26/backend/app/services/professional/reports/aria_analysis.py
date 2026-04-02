"""
ARIA Communication Analysis Report Template.

Focused report on hostile communication patterns with:
- ARIA intervention history with before/after examples
- Sentiment analysis and hostility trends
- Communication pattern analysis (time of day, triggers)
- Threat detection and escalations
- V2 Sentinel Shield: domain analysis, heat tracking, legal flags,
  session patterns, time signals, coaching effectiveness
"""

import hashlib
import json
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from sqlalchemy import func
from sqlalchemy.orm import selectinload

from app.services.professional.aria_control_service import ARIAControlService
from app.models.family_file import FamilyFile
from app.models.user import User
from app.models.message import Message, MessageFlag
from app.models.circle_message import CircleMessage
from app.models.circle_call import CircleCallSession, CircleCallFlag


class ARIAAnalysisReport:
    """Generate ARIA communication analysis report for court."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.aria_service = ARIAControlService(db)

    async def generate_data(
        self,
        family_file_id: str,
        professional_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> dict:
        """
        Generate ARIA communication analysis payload.

        Includes V1 intervention examples and V2 Sentinel Shield analysis.
        """
        family_file = await self.db.get(FamilyFile, family_file_id)
        if not family_file:
            raise ValueError(f"Family file {family_file_id} not found")

        parent_a = await self.db.get(User, family_file.parent_a_id)
        parent_b = await self.db.get(User, family_file.parent_b_id)

        # Get ARIA metrics (now includes V2) and interventions
        aria_metrics = await self.aria_service.get_aria_metrics(family_file_id)
        interventions = await self.aria_service.get_aria_interventions(
            family_file_id=family_file_id
        )

        filtered_interventions = [
            i for i in interventions
            if start_date <= i["timestamp"] <= end_date
        ]

        intervention_examples = await self._build_intervention_examples(
            filtered_interventions[:10]
        )

        circle_aria_data = await self._build_circle_aria_section(
            family_file_id, start_date, end_date
        )

        # V2 Sentinel Shield aggregation
        v2_shield = await self._build_v2_sentinel_shield(
            family_file_id, parent_a, parent_b, start_date, end_date
        )

        report_data = {
            "report_type": "aria_analysis",
            "metadata": {
                "family_file_id": family_file_id,
                "family_file_number": family_file.family_file_number,
                "case_number": family_file.case_number or family_file.family_file_number,
                "parents": {
                    "parent_a": f"{parent_a.first_name} {parent_a.last_name}",
                    "parent_b": f"{parent_b.first_name} {parent_b.last_name}"
                },
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "generated_at": datetime.utcnow().isoformat()
            },
            "executive_summary": {
                "total_messages": aria_metrics.get("total_messages", 0),
                "intervention_count": len(filtered_interventions),
                "intervention_rate": aria_metrics.get("intervention_rate", 0),
                "escalations": aria_metrics.get("escalations", 0),
                "threat_count": sum(1 for i in filtered_interventions if "threat" in i.get("flag_type", "").lower()),
                "trend": "increasing" if len(filtered_interventions) > 10 else "stable",
                "circle_flagged_messages": circle_aria_data.get("flagged_messages", 0),
                "circle_terminated_calls": circle_aria_data.get("terminated_calls", 0),
                # V2 summary
                "v2_avg_heat": aria_metrics.get("v2_avg_heat"),
                "v2_legal_flag_count": aria_metrics.get("v2_legal_flag_count", 0),
                "v2_good_faith_score": aria_metrics.get("good_faith_score"),
            },
            "intervention_breakdown": {
                "by_type": self._count_by_type(filtered_interventions),
                "by_parent": self._count_by_parent(filtered_interventions, parent_a.id, parent_b.id),
                "by_severity": self._count_by_severity(filtered_interventions)
            },
            "intervention_examples": intervention_examples,
            "communication_patterns": self._analyze_patterns(filtered_interventions),
            "circle_aria_activity": circle_aria_data,
            "v2_sentinel_shield": v2_shield,
            "recommendations": self._build_recommendations(
                filtered_interventions, circle_aria_data, v2_shield
            ),
        }

        # Compute content hash for court verification
        hash_payload = json.dumps(report_data, sort_keys=True, default=str)
        report_data["content_hash"] = hashlib.sha256(hash_payload.encode()).hexdigest()

        return report_data

    async def _build_v2_sentinel_shield(
        self,
        family_file_id: str,
        parent_a: User,
        parent_b: User,
        start_date: datetime,
        end_date: datetime,
    ) -> dict:
        """Build V2 Sentinel Shield section from MessageFlag V2 columns."""
        legal_categories = {
            "threats", "grooming", "hate_speech", "sexual_harassment",
            "custody_weaponization", "parental_alienation",
        }

        result = await self.db.execute(
            select(Message.sender_id, Message.created_at, MessageFlag)
            .join(MessageFlag, MessageFlag.message_id == Message.id)
            .where(
                and_(
                    Message.family_file_id == family_file_id,
                    Message.created_at >= start_date,
                    Message.created_at <= end_date,
                )
            )
        )
        rows = result.fetchall()

        # Accumulators
        heat_a, heat_b = [], []
        heat_timeline = []
        domain_totals: dict = defaultdict(lambda: {"total": 0.0, "count": 0})
        category_totals: dict = defaultdict(
            lambda: {"count": 0, "conf_total": 0.0, "conf_count": 0, "parent_a": 0, "parent_b": 0}
        )
        legal_flags = []
        time_signal_counts: dict = defaultdict(int)
        pattern_counts: dict = defaultdict(int)
        coaching_offered = 0
        coaching_accepted = 0

        for sender_id, created_at, flag in rows:
            is_parent_a = sender_id == parent_a.id

            # Heat
            if flag.window_heat_score is not None:
                heat_val = float(flag.window_heat_score)
                (heat_a if is_parent_a else heat_b).append(heat_val)
                heat_timeline.append({
                    "date": created_at.isoformat(),
                    "parent_a": round(heat_val, 2) if is_parent_a else None,
                    "parent_b": round(heat_val, 2) if not is_parent_a else None,
                })

            # Domains
            if isinstance(flag.domain_scores, dict):
                for domain, score in flag.domain_scores.items():
                    domain_totals[domain]["total"] += float(score)
                    domain_totals[domain]["count"] += 1

            # Categories
            if isinstance(flag.v2_categories, list):
                conf = flag.category_confidence if isinstance(flag.category_confidence, dict) else {}
                for cat in flag.v2_categories:
                    category_totals[cat]["count"] += 1
                    if is_parent_a:
                        category_totals[cat]["parent_a"] += 1
                    else:
                        category_totals[cat]["parent_b"] += 1
                    if cat in conf:
                        category_totals[cat]["conf_total"] += float(conf[cat])
                        category_totals[cat]["conf_count"] += 1

            # Reporting tags / legal flags
            if isinstance(flag.reporting_tags, list):
                for tag in flag.reporting_tags:
                    pattern_counts[tag] += 1
                    if tag in legal_categories:
                        legal_flags.append({
                            "date": created_at.isoformat(),
                            "category": tag,
                            "severity": flag.severity or "unknown",
                            "parent": "Parent A" if is_parent_a else "Parent B",
                        })

            # Time signals
            if isinstance(flag.time_frequency_flags, list):
                for sig in flag.time_frequency_flags:
                    time_signal_counts[sig] += 1

            # Coaching
            if flag.recipient_coaching:
                coaching_offered += 1
                if flag.user_action in ("accepted", "modified"):
                    coaching_accepted += 1

        # Compute heat trend
        def _heat_trend(heats: list) -> str:
            if len(heats) < 4:
                return "insufficient_data"
            mid = len(heats) // 2
            first_avg = sum(heats[:mid]) / mid
            second_avg = sum(heats[mid:]) / (len(heats) - mid)
            if second_avg > first_avg + 0.3:
                return "escalating"
            elif second_avg < first_avg - 0.3:
                return "de-escalating"
            return "stable"

        all_heats = heat_a + heat_b
        heat_trend = _heat_trend(all_heats)

        return {
            "heat_analysis": {
                "parent_a_avg_heat": round(sum(heat_a) / len(heat_a), 2) if heat_a else None,
                "parent_b_avg_heat": round(sum(heat_b) / len(heat_b), 2) if heat_b else None,
                "overall_avg_heat": round(sum(all_heats) / len(all_heats), 2) if all_heats else None,
                "heat_trend": heat_trend,
                "heat_timeline": heat_timeline,
            },
            "domain_analysis": {
                domain: {
                    "count": data["count"],
                    "avg_score": round(data["total"] / data["count"], 3),
                }
                for domain, data in domain_totals.items()
            },
            "category_analysis": {
                cat: {
                    "count": data["count"],
                    "avg_confidence": round(data["conf_total"] / data["conf_count"], 3)
                    if data["conf_count"] > 0 else None,
                    "by_parent": {"a": data["parent_a"], "b": data["parent_b"]},
                }
                for cat, data in category_totals.items()
            },
            "session_patterns": {
                "frequency": dict(pattern_counts),
            },
            "time_signals": dict(time_signal_counts),
            "legal_flags": {
                "count": len(legal_flags),
                "details": legal_flags,
            },
            "coaching_effectiveness": {
                "offered": coaching_offered,
                "accepted": coaching_accepted,
                "rate": round(coaching_accepted / coaching_offered, 3) if coaching_offered > 0 else None,
            },
        }

    def _count_by_type(self, interventions: list) -> dict:
        """Count interventions by flag type."""
        type_counts = {}
        for intervention in interventions:
            flag_type = intervention.get("flag_type", "unknown")
            type_counts[flag_type] = type_counts.get(flag_type, 0) + 1
        return type_counts

    def _count_by_parent(self, interventions: list, parent_a_id: str, parent_b_id: str) -> dict:
        """Count interventions by which parent sent the hostile message."""
        parent_counts = {"parent_a": 0, "parent_b": 0}
        for intervention in interventions:
            sender_id = intervention.get("sender_id")
            if sender_id == parent_a_id:
                parent_counts["parent_a"] += 1
            elif sender_id == parent_b_id:
                parent_counts["parent_b"] += 1
        return parent_counts

    def _count_by_severity(self, interventions: list) -> dict:
        """Count interventions by severity level."""
        severity_counts = {"low": 0, "medium": 0, "high": 0, "severe": 0}
        for intervention in interventions:
            severity = intervention.get("severity", "medium")
            if severity in severity_counts:
                severity_counts[severity] += 1
        return severity_counts

    async def _build_intervention_examples(self, interventions: list) -> list:
        """Build detailed before/after examples for report."""
        examples = []
        for intervention in interventions:
            examples.append({
                "date": intervention.get("timestamp", datetime.utcnow()).isoformat(),
                "flag_type": intervention.get("flag_type", "hostile"),
                "severity": intervention.get("severity", "medium"),
                "original_message": intervention.get("original_message", ""),
                "rewritten_message": intervention.get("rewritten_message", ""),
                "action_taken": intervention.get("action", "rewritten"),
                "sender": "Parent A" if intervention.get("is_parent_a") else "Parent B"
            })
        return examples

    def _analyze_patterns(self, interventions: list) -> dict:
        """Analyze communication patterns from interventions."""
        # Group by time of day
        morning = sum(1 for i in interventions if 6 <= i.get("timestamp", datetime.utcnow()).hour < 12)
        afternoon = sum(1 for i in interventions if 12 <= i.get("timestamp", datetime.utcnow()).hour < 18)
        evening = sum(1 for i in interventions if 18 <= i.get("timestamp", datetime.utcnow()).hour < 24)
        night = sum(1 for i in interventions if 0 <= i.get("timestamp", datetime.utcnow()).hour < 6)

        return {
            "time_of_day_distribution": {
                "morning": morning,
                "afternoon": afternoon,
                "evening": evening,
                "night": night
            },
            "peak_conflict_time": max(
                [("morning", morning), ("afternoon", afternoon), ("evening", evening), ("night", night)],
                key=lambda x: x[1]
            )[0] if interventions else "unknown",
            "escalation_trend": "increasing" if len(interventions) > 15 else "stable"
        }

    async def _build_circle_aria_section(
        self,
        family_file_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> dict:
        """Build circle ARIA child-safety section for the analysis report.

        Includes intervention tracking: acceptance rates, category breakdowns,
        per-sender metrics, severity distribution, user action tracking,
        and escalation patterns for court-ready reporting.
        """
        import json

        section = {
            "total_circle_messages": 0,
            "flagged_messages": 0,
            "hidden_messages": 0,
            "flag_rate": 0.0,
            "flagged_categories": {},
            "all_categories_breakdown": {},
            "by_sender_type": {},
            "by_severity": {"mild": 0, "moderate": 0, "severe": 0},
            "by_user_action": {},
            "intervention_acceptance_rate": 0.0,
            "sent_anyway_count": 0,
            "avg_response_time_ms": 0,
            "escalation_trend": "stable",
            "total_calls": 0,
            "terminated_calls": 0,
            "call_aria_interventions": 0,
            "call_flags_by_severity": {"low": 0, "medium": 0, "high": 0, "severe": 0},
        }

        try:
            # Circle message ARIA stats
            msg_result = await self.db.execute(
                select(
                    func.count(CircleMessage.id),
                    func.count(CircleMessage.id).filter(CircleMessage.aria_flagged == True),
                    func.count(CircleMessage.id).filter(CircleMessage.is_hidden == True),
                ).where(
                    and_(
                        CircleMessage.family_file_id == family_file_id,
                        CircleMessage.sent_at >= start_date,
                        CircleMessage.sent_at <= end_date,
                    )
                )
            )
            row = msg_result.one()
            section["total_circle_messages"] = row[0] or 0
            section["flagged_messages"] = row[1] or 0
            section["hidden_messages"] = row[2] or 0
            section["flag_rate"] = round(
                section["flagged_messages"] / section["total_circle_messages"], 4
            ) if section["total_circle_messages"] > 0 else 0.0

            # Primary category breakdown
            flagged_msgs_result = await self.db.execute(
                select(CircleMessage.aria_category, func.count(CircleMessage.id)).where(
                    and_(
                        CircleMessage.family_file_id == family_file_id,
                        CircleMessage.sent_at >= start_date,
                        CircleMessage.sent_at <= end_date,
                        CircleMessage.aria_flagged == True,
                        CircleMessage.aria_category.isnot(None),
                    )
                ).group_by(CircleMessage.aria_category)
            )
            for cat_row in flagged_msgs_result.all():
                section["flagged_categories"][cat_row[0]] = cat_row[1]

            # Get all flagged messages for detailed intervention analysis
            flagged_detail_result = await self.db.execute(
                select(CircleMessage).where(
                    and_(
                        CircleMessage.family_file_id == family_file_id,
                        CircleMessage.sent_at >= start_date,
                        CircleMessage.sent_at <= end_date,
                        CircleMessage.aria_flagged == True,
                    )
                ).order_by(CircleMessage.sent_at)
            )
            flagged_msgs = flagged_detail_result.scalars().all()

            # All categories breakdown (from aria_all_categories JSON)
            all_cats = {}
            for msg in flagged_msgs:
                cats = []
                if msg.aria_all_categories:
                    try:
                        cats = json.loads(msg.aria_all_categories)
                    except (json.JSONDecodeError, TypeError):
                        cats = [msg.aria_category] if msg.aria_category else []
                elif msg.aria_category:
                    cats = [msg.aria_category]
                for cat in cats:
                    all_cats[cat] = all_cats.get(cat, 0) + 1
            section["all_categories_breakdown"] = all_cats

            # By sender type
            sender_stats = {}
            for msg in flagged_msgs:
                st = msg.sender_type
                if st not in sender_stats:
                    sender_stats[st] = {"flagged": 0, "hidden": 0}
                sender_stats[st]["flagged"] += 1
                if msg.is_hidden:
                    sender_stats[st]["hidden"] += 1
            section["by_sender_type"] = sender_stats

            # By severity (from intervention level)
            severity_names = {1: "mild", 2: "moderate", 3: "severe"}
            for msg in flagged_msgs:
                level = msg.aria_intervention_level
                name = severity_names.get(level)
                if name:
                    section["by_severity"][name] += 1

            # By user action
            action_counts = {}
            accepted_count = 0
            total_with_action = 0
            for msg in flagged_msgs:
                action = msg.user_action or "no_response"
                action_counts[action] = action_counts.get(action, 0) + 1
                if action in ("accepted", "modified"):
                    accepted_count += 1
                if action != "no_response":
                    total_with_action += 1
                if action == "sent_anyway":
                    section["sent_anyway_count"] += 1
            section["by_user_action"] = action_counts
            section["intervention_acceptance_rate"] = round(
                accepted_count / total_with_action, 4
            ) if total_with_action > 0 else 0.0

            # Average response time
            response_times = [
                msg.aria_response_time_ms for msg in flagged_msgs
                if msg.aria_response_time_ms is not None
            ]
            section["avg_response_time_ms"] = (
                round(sum(response_times) / len(response_times))
                if response_times else 0
            )

            # Escalation trend
            if len(flagged_msgs) >= 4:
                midpoint = len(flagged_msgs) // 2
                first_half = [m.aria_intervention_level or 0 for m in flagged_msgs[:midpoint]]
                second_half = [m.aria_intervention_level or 0 for m in flagged_msgs[midpoint:]]
                first_avg = sum(first_half) / len(first_half)
                second_avg = sum(second_half) / len(second_half)
                if second_avg > first_avg + 0.3:
                    section["escalation_trend"] = "increasing"
                elif second_avg < first_avg - 0.3:
                    section["escalation_trend"] = "decreasing"

            # Circle call ARIA stats
            call_result = await self.db.execute(
                select(
                    func.count(CircleCallSession.id),
                    func.count(CircleCallSession.id).filter(
                        CircleCallSession.aria_terminated_call == True
                    ),
                    func.coalesce(func.sum(CircleCallSession.aria_intervention_count), 0),
                ).where(
                    and_(
                        CircleCallSession.family_file_id == family_file_id,
                        CircleCallSession.initiated_at >= start_date,
                        CircleCallSession.initiated_at <= end_date,
                    )
                )
            )
            crow = call_result.one()
            section["total_calls"] = crow[0] or 0
            section["terminated_calls"] = crow[1] or 0
            section["call_aria_interventions"] = int(crow[2] or 0)

            # Call flags by severity
            flag_result = await self.db.execute(
                select(CircleCallFlag.severity, func.count(CircleCallFlag.id)).join(
                    CircleCallSession
                ).where(
                    and_(
                        CircleCallSession.family_file_id == family_file_id,
                        CircleCallSession.initiated_at >= start_date,
                        CircleCallSession.initiated_at <= end_date,
                    )
                ).group_by(CircleCallFlag.severity)
            )
            for frow in flag_result.all():
                if frow[0] in section["call_flags_by_severity"]:
                    section["call_flags_by_severity"][frow[0]] = frow[1]

        except Exception:
            # Circle tables may not be migrated yet; return empty section
            pass

        return section

    def _build_recommendations(
        self, interventions: list, circle_data: Optional[dict] = None,
        v2_shield: Optional[dict] = None,
    ) -> list:
        """Build recommendations based on ARIA V1 and V2 data."""
        recommendations = []

        if len(interventions) > 20:
            recommendations.append({
                "priority": "high",
                "recommendation": "Request communication restrictions - pattern shows persistent hostile communication"
            })

        threat_count = sum(1 for i in interventions if "threat" in i.get("flag_type", "").lower())
        if threat_count > 0:
            recommendations.append({
                "priority": "urgent",
                "recommendation": f"{threat_count} threat(s) detected - consider protective order or emergency intervention"
            })

        if len(interventions) > 10:
            recommendations.append({
                "priority": "medium",
                "recommendation": "Recommend parenting coordinator appointment to mediate communication"
            })

        # V2 Sentinel Shield recommendations
        if v2_shield:
            heat = v2_shield.get("heat_analysis", {})
            if heat.get("overall_avg_heat") and heat["overall_avg_heat"] > 3.0:
                recommendations.append({
                    "priority": "high",
                    "recommendation": (
                        f"Sustained high conversation heat ({heat['overall_avg_heat']:.1f}/5.0) — "
                        "recommend communication restrictions or supervised messaging"
                    )
                })
            if heat.get("heat_trend") == "escalating":
                recommendations.append({
                    "priority": "high",
                    "recommendation": (
                        "Escalating heat trajectory detected — intervention urgency increasing. "
                        "Consider immediate professional mediation session"
                    )
                })

            domains = v2_shield.get("domain_analysis", {})
            severe_domains = {d: v for d, v in domains.items() if d in ("THRT", "CTRL")}
            if severe_domains:
                domain_details = ", ".join(
                    f"{d} ({v['count']} instances, avg {v['avg_score']:.2f})"
                    for d, v in severe_domains.items()
                )
                recommendations.append({
                    "priority": "urgent",
                    "recommendation": (
                        f"Severe behavioral domains active: {domain_details} — "
                        "document for court review and consider protective measures"
                    )
                })

            legal = v2_shield.get("legal_flags", {})
            if legal.get("count", 0) > 0:
                recommendations.append({
                    "priority": "urgent",
                    "recommendation": (
                        f"{legal['count']} legal flag(s) detected across communication — "
                        "review flagged instances for court documentation"
                    )
                })

            coaching = v2_shield.get("coaching_effectiveness", {})
            if coaching.get("rate") is not None and coaching["rate"] < 0.3 and coaching.get("offered", 0) >= 5:
                recommendations.append({
                    "priority": "medium",
                    "recommendation": (
                        f"Low coaching acceptance rate ({coaching['rate']:.0%}) — "
                        "parent may benefit from mandatory communication coaching sessions"
                    )
                })

        # Circle child-safety recommendations
        if circle_data:
            if circle_data.get("terminated_calls", 0) > 0:
                recommendations.append({
                    "priority": "urgent",
                    "recommendation": (
                        f"{circle_data['terminated_calls']} circle call(s) terminated by ARIA child safety — "
                        "review and restrict contact permissions immediately"
                    )
                })
            if circle_data.get("hidden_messages", 0) > 0:
                recommendations.append({
                    "priority": "high",
                    "recommendation": (
                        f"{circle_data['hidden_messages']} circle message(s) hidden due to severe safety flags — "
                        "assess whether contact should remain in child's circle"
                    )
                })
            if circle_data.get("flagged_messages", 0) > 3:
                recommendations.append({
                    "priority": "medium",
                    "recommendation": (
                        "Pattern of flagged circle messages detected — "
                        "consider supervised-only communication for affected contacts"
                    )
                })

            # Intervention acceptance/override tracking
            if circle_data.get("sent_anyway_count", 0) > 2:
                recommendations.append({
                    "priority": "high",
                    "recommendation": (
                        f"User overrode ARIA suggestions {circle_data['sent_anyway_count']} time(s) — "
                        "consider enabling strict mode to prevent bypass of safety interventions"
                    )
                })

            # Grooming/alienation specific recommendations
            all_cats = circle_data.get("all_categories_breakdown", {})
            if all_cats.get("grooming", 0) > 0:
                recommendations.append({
                    "priority": "urgent",
                    "recommendation": (
                        f"Grooming patterns detected in {all_cats['grooming']} message(s) — "
                        "immediate review and potential contact restriction required"
                    )
                })
            if all_cats.get("parental_alienation", 0) > 0:
                recommendations.append({
                    "priority": "high",
                    "recommendation": (
                        f"Parental alienation language detected in {all_cats['parental_alienation']} message(s) — "
                        "recommend therapeutic intervention and communication coaching"
                    )
                })
            if all_cats.get("custody_weaponization", 0) > 0:
                recommendations.append({
                    "priority": "high",
                    "recommendation": (
                        f"Custody weaponization detected in {all_cats['custody_weaponization']} message(s) — "
                        "document for court review and consider communication restrictions"
                    )
                })

            # Escalation trend
            if circle_data.get("escalation_trend") == "increasing":
                recommendations.append({
                    "priority": "high",
                    "recommendation": (
                        "Escalation trend detected — intervention severity increasing over time. "
                        "Recommend immediate professional mediation"
                    )
                })

        return recommendations
