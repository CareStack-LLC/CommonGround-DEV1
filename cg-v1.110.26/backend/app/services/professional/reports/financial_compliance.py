"""
Financial Compliance Report Template.

Focused report on child support payment tracking:
- Payment history (on-time, late, missed)
- Arrears calculation
- ClearFund transaction log
- Per-parent payment breakdown
"""

from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.professional.compliance_service import ProfessionalComplianceService
from app.models.family_file import FamilyFile
from app.models.user import User


class FinancialComplianceReport:
    """Generate financial/support compliance report."""

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
        """Generate financial compliance report payload."""
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

        financial_data = compliance_data.get("financial_compliance", {})

        # Calculate arrears and interest (if applicable)
        outstanding_amount = financial_data.get("outstanding_amount", 0)
        total_due = financial_data.get("total_due", 0)
        total_paid = financial_data.get("total_paid", 0)

        return {
            "report_type": "financial_compliance",
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
                "total_due": float(total_due),
                "total_paid": float(total_paid),
                "outstanding_amount": float(outstanding_amount),
                "payment_rate": financial_data.get("payment_rate", 0),
                "compliance_status": self._determine_status(outstanding_amount, total_due)
            },
            "payment_history": {
                "paid_on_time": financial_data.get("paid_on_time", 0),
                "paid_late": financial_data.get("paid_late", 0),
                "outstanding_count": financial_data.get("outstanding_count", 0),
                "on_time_percentage": financial_data.get("on_time_payment_percentage", 0)
            },
            "parent_breakdown": {
                "parent_a": {
                    "name": f"{parent_a.first_name} {parent_a.last_name}",
                    "total_paid": float(financial_data.get("parent_a_paid", 0)),
                    "outstanding": float(financial_data.get("parent_a_outstanding", 0)),
                    "payment_rate": financial_data.get("parent_a_payment_rate", 0)
                },
                "parent_b": {
                    "name": f"{parent_b.first_name} {parent_b.last_name}",
                    "total_paid": float(financial_data.get("parent_b_paid", 0)),
                    "outstanding": float(financial_data.get("parent_b_outstanding", 0)),
                    "payment_rate": financial_data.get("parent_b_payment_rate", 0)
                }
            },
            "arrears_calculation": {
                "total_arrears": float(outstanding_amount),
                "interest_accrued": 0,  # Placeholder - would need interest calculation logic
                "total_owed_with_interest": float(outstanding_amount),
                "days_overdue": self._calculate_days_overdue(financial_data)
            },
            "recommendations": self._build_recommendations(financial_data, outstanding_amount)
        }

    def _determine_status(self, outstanding: float, total_due: float) -> str:
        """Determine financial compliance status."""
        if outstanding == 0:
            return "Fully Compliant - No Arrears"
        elif total_due > 0 and outstanding / total_due < 0.1:
            return "Mostly Compliant - Minor Arrears"
        elif total_due > 0 and outstanding / total_due < 0.3:
            return "Partially Compliant - Moderate Arrears"
        else:
            return "Non-Compliant - Significant Arrears"

    def _calculate_days_overdue(self, financial_data: dict) -> int:
        """Calculate average days overdue."""
        # This would need actual payment date data - placeholder
        return financial_data.get("avg_days_late", 0)

    def _build_recommendations(self, financial_data: dict, outstanding_amount: float) -> list:
        """Build recommendations based on financial data."""
        recommendations = []

        if outstanding_amount > 1000:
            recommendations.append({
                "priority": "high",
                "recommendation": f"Significant arrears (${outstanding_amount:.2f}) - pursue contempt or wage garnishment"
            })
        elif outstanding_amount > 500:
            recommendations.append({
                "priority": "medium",
                "recommendation": f"Moderate arrears (${outstanding_amount:.2f}) - send demand letter or mediate payment plan"
            })

        payment_rate = financial_data.get("payment_rate", 100)
        if payment_rate < 70:
            recommendations.append({
                "priority": "medium",
                "recommendation": "Consistent non-payment pattern - consider support modification hearing"
            })

        if outstanding_amount > 0 and financial_data.get("outstanding_count", 0) > 2:
            recommendations.append({
                "priority": "low",
                "recommendation": "Set up automatic payment plan to prevent future arrears"
            })

        return recommendations
