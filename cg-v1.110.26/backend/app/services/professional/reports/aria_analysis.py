"""
ARIA Communication Analysis Report Template.

Focused report on hostile communication patterns with:
- ARIA intervention history with before/after examples
- Sentiment analysis and hostility trends
- Communication pattern analysis (time of day, triggers)
- Threat detection and escalations
"""

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.services.professional.aria_control_service import ARIAControlService
from app.models.family_file import FamilyFile
from app.models.user import User
from app.models.message import Message, MessageFlag


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

        Includes detailed before/after examples of interventions.
        """
        # Get case metadata
        family_file = await self.db.get(FamilyFile, family_file_id)
        if not family_file:
            raise ValueError(f"Family file {family_file_id} not found")

        parent_a = await self.db.get(User, family_file.parent_a_id)
        parent_b = await self.db.get(User, family_file.parent_b_id)

        # Get ARIA metrics and interventions
        aria_metrics = await self.aria_service.get_aria_metrics(family_file_id)
        interventions = await self.aria_service.get_aria_interventions(
            family_file_id=family_file_id
        )

        # Filter interventions by date range
        filtered_interventions = [
            i for i in interventions
            if start_date <= i["timestamp"] <= end_date
        ]

        # Build intervention examples with before/after
        intervention_examples = await self._build_intervention_examples(
            filtered_interventions[:10]  # Top 10 most severe
        )

        return {
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
                "trend": "increasing" if len(filtered_interventions) > 10 else "stable"
            },
            "intervention_breakdown": {
                "by_type": self._count_by_type(filtered_interventions),
                "by_parent": self._count_by_parent(filtered_interventions, parent_a.id, parent_b.id),
                "by_severity": self._count_by_severity(filtered_interventions)
            },
            "intervention_examples": intervention_examples,
            "communication_patterns": self._analyze_patterns(filtered_interventions),
            "recommendations": self._build_recommendations(filtered_interventions)
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

    def _build_recommendations(self, interventions: list) -> list:
        """Build recommendations based on ARIA data."""
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

        return recommendations
