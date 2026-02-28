"""
Full Compliance Report Template.

Generates comprehensive evidence package for court including:
- Exchange compliance (on-time rates, missed/late)
- Financial compliance (support payments, arrears)
- Communication compliance (ARIA interventions, hostile patterns)
- Overall compliance score and trends
"""

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.professional.compliance_service import ProfessionalComplianceService
from app.services.professional.aria_control_service import ARIAControlService
from app.models.family_file import FamilyFile
from app.models.user import User
from sqlalchemy import select


class FullComplianceReport:
    """Generate full compliance report for court submission."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.compliance_service = ProfessionalComplianceService(db)
        self.aria_service = ARIAControlService(db)

    async def generate_data(
        self,
        family_file_id: str,
        professional_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> dict:
        """
        Generate structured JSON payload for full compliance report.

        Returns all data needed for React-PDF template or backend PDF generation.
        """
        # Calculate period in days
        days = (end_date - start_date).days

        # Get case metadata
        family_file = await self.db.get(FamilyFile, family_file_id)
        if not family_file:
            raise ValueError(f"Family file {family_file_id} not found")

        # Get parent names
        parent_a = await self.db.get(User, family_file.parent_a_id)
        parent_b = await self.db.get(User, family_file.parent_b_id)

        # Get compliance dashboard data
        compliance_data = await self.compliance_service.get_compliance_dashboard(
            family_file_id=family_file_id,
            professional_id=professional_id,
            days=days
        )

        # Get ARIA metrics
        aria_metrics = await self.aria_service.get_aria_metrics(
            family_file_id=family_file_id
        )

        # Build executive summary
        executive_summary = self._build_executive_summary(
            compliance_data, aria_metrics
        )

        # Build sections
        exchange_section = self._build_exchange_section(compliance_data)
        financial_section = self._build_financial_section(compliance_data)
        communication_section = self._build_communication_section(
            compliance_data, aria_metrics
        )

        return {
            "report_type": "full_compliance",
            "metadata": {
                "family_file_id": family_file_id,
                "family_file_number": family_file.family_file_number,
                "case_number": family_file.case_number or family_file.family_file_number,
                "court": family_file.court_name or "Superior Court",
                "parents": {
                    "parent_a": {
                        "id": parent_a.id,
                        "name": f"{parent_a.first_name} {parent_a.last_name}",
                        "role": "Parent A"
                    },
                    "parent_b": {
                        "id": parent_b.id,
                        "name": f"{parent_b.first_name} {parent_b.last_name}",
                        "role": "Parent B"
                    }
                },
                "children": [
                    {
                        "name": f"{c.first_name} {c.last_name}",
                        "age": (datetime.now() - c.date_of_birth).days // 365 if c.date_of_birth else None
                    }
                    for c in family_file.children
                ],
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                    "days": days
                },
                "generated_at": datetime.utcnow().isoformat()
            },
            "executive_summary": executive_summary,
            "sections": {
                "exchange_compliance": exchange_section,
                "financial_compliance": financial_section,
                "communication_compliance": communication_section
            },
            "recommendations": self._build_recommendations(compliance_data, aria_metrics)
        }

    def _build_executive_summary(self, compliance_data: dict, aria_metrics: dict) -> dict:
        """Build executive summary section."""
        overall_score = compliance_data.get("overall_compliance_score", 0)

        # Determine trend (would need historical data - placeholder for now)
        trend = "stable"
        if overall_score < 60:
            risk_level = "high"
        elif overall_score < 75:
            risk_level = "medium"
        else:
            risk_level = "low"

        return {
            "overall_compliance_score": overall_score,
            "trend": trend,
            "risk_level": risk_level,
            "key_findings": self._extract_key_findings(compliance_data, aria_metrics),
            "period_summary": f"Analysis of {compliance_data.get('days', 30)} days of compliance data"
        }

    def _extract_key_findings(self, compliance_data: dict, aria_metrics: dict) -> list:
        """Extract top 5 key findings for executive summary."""
        findings = []

        # Exchange findings
        exchange_data = compliance_data.get("exchange_compliance", {})
        if exchange_data.get("parent_a_on_time_rate", 100) < 80:
            findings.append({
                "type": "exchange_issue",
                "severity": "high",
                "description": f"Parent A on-time rate: {exchange_data.get('parent_a_on_time_rate')}%"
            })

        if exchange_data.get("parent_b_on_time_rate", 100) < 80:
            findings.append({
                "type": "exchange_issue",
                "severity": "high",
                "description": f"Parent B on-time rate: {exchange_data.get('parent_b_on_time_rate')}%"
            })

        # Financial findings
        financial_data = compliance_data.get("financial_compliance", {})
        if financial_data.get("outstanding_amount", 0) > 500:
            findings.append({
                "type": "financial_issue",
                "severity": "high",
                "description": f"Outstanding support: ${financial_data.get('outstanding_amount')}"
            })

        # ARIA findings
        if aria_metrics.get("intervention_count", 0) > 10:
            findings.append({
                "type": "communication_issue",
                "severity": "medium",
                "description": f"{aria_metrics.get('intervention_count')} ARIA interventions (high-conflict pattern)"
            })

        return findings[:5]  # Top 5 findings

    def _build_exchange_section(self, compliance_data: dict) -> dict:
        """Build exchange compliance section."""
        exchange_data = compliance_data.get("exchange_compliance", {})

        return {
            "summary_statistics": {
                "total_scheduled": exchange_data.get("total_scheduled", 0),
                "completed_on_time": exchange_data.get("completed_on_time", 0),
                "completed_late": exchange_data.get("completed_late", 0),
                "missed": exchange_data.get("missed", 0),
                "on_time_percentage": exchange_data.get("on_time_percentage", 0)
            },
            "parent_breakdown": {
                "parent_a": {
                    "on_time_rate": exchange_data.get("parent_a_on_time_rate", 0),
                    "late_count": exchange_data.get("parent_a_late", 0),
                    "missed_count": exchange_data.get("parent_a_missed", 0)
                },
                "parent_b": {
                    "on_time_rate": exchange_data.get("parent_b_on_time_rate", 0),
                    "late_count": exchange_data.get("parent_b_late", 0),
                    "missed_count": exchange_data.get("parent_b_missed", 0)
                }
            },
            "gps_verification_rate": exchange_data.get("gps_verification_rate", 0),
            "average_delay_minutes": exchange_data.get("average_delay_minutes", 0)
        }

    def _build_financial_section(self, compliance_data: dict) -> dict:
        """Build financial compliance section."""
        financial_data = compliance_data.get("financial_compliance", {})

        return {
            "payment_summary": {
                "total_due": financial_data.get("total_due", 0),
                "total_paid": financial_data.get("total_paid", 0),
                "outstanding_amount": financial_data.get("outstanding_amount", 0),
                "payment_rate": financial_data.get("payment_rate", 0)
            },
            "payment_breakdown": {
                "paid_on_time": financial_data.get("paid_on_time", 0),
                "paid_late": financial_data.get("paid_late", 0),
                "outstanding": financial_data.get("outstanding_count", 0)
            },
            "parent_breakdown": {
                "parent_a": {
                    "total_paid": financial_data.get("parent_a_paid", 0),
                    "outstanding": financial_data.get("parent_a_outstanding", 0)
                },
                "parent_b": {
                    "total_paid": financial_data.get("parent_b_paid", 0),
                    "outstanding": financial_data.get("parent_b_outstanding", 0)
                }
            }
        }

    def _build_communication_section(self, compliance_data: dict, aria_metrics: dict) -> dict:
        """Build communication compliance section."""
        comm_data = compliance_data.get("communication_compliance", {})

        return {
            "aria_summary": {
                "total_messages": aria_metrics.get("total_messages", 0),
                "intervention_count": aria_metrics.get("intervention_count", 0),
                "intervention_rate": aria_metrics.get("intervention_rate", 0),
                "successful_rewrites": aria_metrics.get("successful_rewrites", 0),
                "escalations": aria_metrics.get("escalations", 0)
            },
            "intervention_breakdown": aria_metrics.get("intervention_by_type", {}),
            "good_faith_score": comm_data.get("good_faith_score", 0),
            "average_response_time_hours": comm_data.get("avg_response_time", 0)
        }

    def _build_recommendations(self, compliance_data: dict, aria_metrics: dict) -> list:
        """Build attorney recommendations based on data."""
        recommendations = []

        overall_score = compliance_data.get("overall_compliance_score", 0)

        if overall_score < 60:
            recommendations.append({
                "priority": "high",
                "recommendation": "Consider filing for contempt or modification based on pattern of non-compliance"
            })

        if aria_metrics.get("intervention_count", 0) > 15:
            recommendations.append({
                "priority": "medium",
                "recommendation": "Request communication restrictions or parenting coordinator appointment"
            })

        exchange_data = compliance_data.get("exchange_compliance", {})
        if exchange_data.get("missed", 0) >= 3:
            recommendations.append({
                "priority": "high",
                "recommendation": "Pattern of missed exchanges warrants court intervention"
            })

        return recommendations
