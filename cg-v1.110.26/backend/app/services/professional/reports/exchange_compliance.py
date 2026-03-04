"""
Exchange Compliance Report Template.

Focused report on custody exchange violations:
- On-time vs late vs missed exchanges
- GPS verification tracking
- Per-parent compliance breakdown
- Pattern analysis (days of week, locations)
"""

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.professional.compliance_service import ProfessionalComplianceService
from app.models.family_file import FamilyFile
from app.models.user import User


class ExchangeComplianceReport:
    """Generate exchange-focused compliance report."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.compliance_service = ProfessionalComplianceService(db)

    async def generate_data(
        self,
        family_file_id: str,
        professional_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> dict:
        """Generate exchange compliance report payload."""
        # Get case metadata
        family_file = await self.db.get(FamilyFile, family_file_id)
        if not family_file:
            raise ValueError(f"Family file {family_file_id} not found")

        parent_a = await self.db.get(User, family_file.parent_a_id)
        parent_b = await self.db.get(User, family_file.parent_b_id)

        # Get compliance data
        days = (end_date - start_date).days
        compliance_data = await self.compliance_service.get_compliance_dashboard(
            family_file_id=family_file_id,
            professional_id=professional_id,
            days=days
        )

        exchange_data = compliance_data.get("exchange_compliance", {})

        return {
            "report_type": "exchange_compliance",
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
                    "end": end_date.isoformat(),
                    "days": days
                },
                "generated_at": datetime.utcnow().isoformat()
            },
            "executive_summary": {
                "total_scheduled": exchange_data.get("total_scheduled", 0),
                "completed_on_time": exchange_data.get("completed_on_time", 0),
                "completed_late": exchange_data.get("completed_late", 0),
                "missed": exchange_data.get("missed", 0),
                "on_time_percentage": exchange_data.get("on_time_percentage", 0),
                "compliance_grade": self._calculate_grade(exchange_data.get("on_time_percentage", 0))
            },
            "parent_breakdown": {
                "parent_a": {
                    "name": f"{parent_a.first_name} {parent_a.last_name}",
                    "on_time_rate": exchange_data.get("parent_a_on_time_rate", 0),
                    "late_count": exchange_data.get("parent_a_late", 0),
                    "missed_count": exchange_data.get("parent_a_missed", 0),
                    "average_delay_minutes": exchange_data.get("parent_a_avg_delay", 0)
                },
                "parent_b": {
                    "name": f"{parent_b.first_name} {parent_b.last_name}",
                    "on_time_rate": exchange_data.get("parent_b_on_time_rate", 0),
                    "late_count": exchange_data.get("parent_b_late", 0),
                    "missed_count": exchange_data.get("parent_b_missed", 0),
                    "average_delay_minutes": exchange_data.get("parent_b_avg_delay", 0)
                }
            },
            "gps_verification": {
                "verification_rate": exchange_data.get("gps_verification_rate", 0),
                "verified_count": exchange_data.get("gps_verified_count", 0),
                "unverified_count": exchange_data.get("gps_unverified_count", 0)
            },
            "pattern_analysis": {
                "average_delay_minutes": exchange_data.get("average_delay_minutes", 0),
                "most_common_issue": self._determine_common_issue(exchange_data)
            },
            "recommendations": self._build_recommendations(exchange_data)
        }

    def _calculate_grade(self, percentage: float) -> str:
        """Convert percentage to letter grade."""
        if percentage >= 90:
            return "A - Excellent"
        elif percentage >= 80:
            return "B - Good"
        elif percentage >= 70:
            return "C - Satisfactory"
        elif percentage >= 60:
            return "D - Needs Improvement"
        else:
            return "F - Failing"

    def _determine_common_issue(self, exchange_data: dict) -> str:
        """Determine the most common exchange issue."""
        late = exchange_data.get("completed_late", 0)
        missed = exchange_data.get("missed", 0)

        if missed > late:
            return "Missed exchanges"
        elif late > 0:
            return "Late exchanges"
        else:
            return "None - good compliance"

    def _build_recommendations(self, exchange_data: dict) -> list:
        """Build recommendations based on exchange data."""
        recommendations = []

        missed_count = exchange_data.get("missed", 0)
        if missed_count >= 3:
            recommendations.append({
                "priority": "high",
                "recommendation": f"{missed_count} missed exchanges - contempt motion warranted"
            })

        on_time_rate = exchange_data.get("on_time_percentage", 100)
        if on_time_rate < 70:
            recommendations.append({
                "priority": "medium",
                "recommendation": "Consistent late/missed pattern - consider modification of custody schedule"
            })

        gps_rate = exchange_data.get("gps_verification_rate", 0)
        if gps_rate < 50:
            recommendations.append({
                "priority": "low",
                "recommendation": "Encourage GPS check-in usage for better documentation"
            })

        return recommendations
