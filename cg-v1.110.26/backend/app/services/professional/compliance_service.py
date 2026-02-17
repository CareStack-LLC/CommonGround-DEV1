"""
Professional Compliance Service.

Business logic for professionals to view compliance metrics
on cases they're assigned to. Aggregates exchange, financial,
and communication compliance data.
"""

from datetime import datetime, timedelta
from typing import Optional
from decimal import Decimal

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.professional import CaseAssignment, AssignmentStatus
from app.models.family_file import FamilyFile
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.payment import Payment, ExpenseRequest
from app.models.clearfund import Obligation, ObligationFunding
from app.models.message import Message, MessageFlag
from app.models.case import CaseParticipant
from app.models.user import User
from app.services.exchange_compliance import ExchangeComplianceService


class ProfessionalComplianceService:
    """
    Service for viewing compliance metrics on assigned cases.

    Provides:
    - Exchange compliance (GPS verification, on-time rates)
    - Financial compliance (ClearFund payments, obligations)
    - Communication compliance (ARIA interventions, good faith)
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_compliance_dashboard(
        self,
        family_file_id: str,
        professional_id: str,
        days: int = 30,
    ) -> dict:
        """
        Get unified compliance dashboard for a case.

        Aggregates all compliance domains into a single view.
        """
        await self._verify_access(professional_id, family_file_id, "compliance")

        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        case_id = family_file.legacy_case_id
        start_date = datetime.utcnow() - timedelta(days=days)
        end_date = datetime.utcnow()

        # Get metrics from each domain
        exchange_metrics = {}
        if case_id:
            exchange_metrics = await ExchangeComplianceService.get_exchange_metrics(
                self.db, case_id, start_date, end_date
            )

        financial_metrics = await self._get_financial_metrics(
            family_file_id, case_id, start_date, end_date
        )

        communication_metrics = await self._get_communication_metrics(
            family_file_id, start_date, end_date
        )

        # Calculate overall compliance score
        overall_score = self._calculate_overall_score(
            exchange_metrics, financial_metrics, communication_metrics
        )

        return {
            "family_file_id": family_file_id,
            "period_days": days,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "overall_compliance_score": overall_score,
            "overall_status": self._score_to_status(overall_score),
            "exchange_compliance": exchange_metrics,
            "financial_compliance": financial_metrics,
            "communication_compliance": communication_metrics,
            "generated_at": datetime.utcnow().isoformat(),
        }

    async def get_exchange_compliance(
        self,
        family_file_id: str,
        professional_id: str,
        days: int = 30,
    ) -> dict:
        """
        Get detailed exchange compliance metrics.

        Uses the existing ExchangeComplianceService with access control.
        """
        await self._verify_access(professional_id, family_file_id, "compliance")

        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            return {"error": "Family file not found", "exchanges": []}

        case_id = getattr(family_file, "legacy_case_id", None)
        start_date = datetime.utcnow() - timedelta(days=days)
        end_date = datetime.utcnow()

        # Get summary and details
        summary = await ExchangeComplianceService.get_compliance_summary(
            self.db,
            case_id=case_id,
            start_date=start_date,
            end_date=end_date,
            family_file_id=family_file_id
        )

        details = await ExchangeComplianceService.get_exchange_details_for_export(
            self.db,
            case_id=case_id,
            start_date=start_date,
            end_date=end_date,
            family_file_id=family_file_id
        )

        return {
            "summary": summary,
            "exchanges": details,
            "period_days": days,
        }

    async def get_financial_compliance(
        self,
        family_file_id: str,
        professional_id: str,
        days: int = 30,
    ) -> dict:
        """
        Get financial compliance metrics (ClearFund payments, obligations).
        """
        await self._verify_access(professional_id, family_file_id, "compliance")

        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        case_id = family_file.legacy_case_id
        start_date = datetime.utcnow() - timedelta(days=days)
        end_date = datetime.utcnow()

        metrics = await self._get_financial_metrics(
            family_file_id, case_id, start_date, end_date
        )

        # Get payment history
        payments = await self._get_payment_history(
            case_id, start_date, end_date
        ) if case_id else []

        # Get pending expenses
        pending_expenses = await self._get_pending_expenses(
            case_id
        ) if case_id else []

        # Get obligation metrics
        obligation_metrics = await self._get_obligation_metrics(family_file_id, case_id)

        return {
            "metrics": metrics,
            "payment_history": payments,
            "pending_expenses": pending_expenses,
            "period_days": days,
            **obligation_metrics
        }

    async def get_communication_compliance(
        self,
        family_file_id: str,
        professional_id: str,
        days: int = 30,
    ) -> dict:
        """
        Get communication compliance metrics (ARIA interventions, good faith).
        """
        # This requires both compliance and messages scopes
        await self._verify_access(professional_id, family_file_id, "compliance")

        start_date = datetime.utcnow() - timedelta(days=days)
        end_date = datetime.utcnow()

        metrics = await self._get_communication_metrics(
            family_file_id, start_date, end_date
        )

        # Get per-parent breakdown
        parent_breakdown = await self._get_per_parent_communication(
            family_file_id, start_date, end_date
        )

        return {
            "metrics": metrics,
            "parent_breakdown": parent_breakdown,
            "period_days": days,
        }

    # -------------------------------------------------------------------------
    # Private Helpers
    # -------------------------------------------------------------------------

    async def _verify_access(
        self,
        professional_id: str,
        family_file_id: str,
        required_scope: str,
    ) -> CaseAssignment:
        """Verify professional has access to compliance data."""
        result = await self.db.execute(
            select(CaseAssignment).where(
                and_(
                    CaseAssignment.professional_id == professional_id,
                    CaseAssignment.family_file_id == family_file_id,
                    CaseAssignment.status == AssignmentStatus.ACTIVE.value,
                )
            )
        )
        assignment = result.scalar_one_or_none()

        if not assignment:
            raise ValueError("Professional does not have access to this case")

        if required_scope not in (assignment.access_scopes or []):
            raise ValueError(f"Professional does not have {required_scope} access")

        return assignment

    async def _get_family_file(self, family_file_id: str) -> Optional[FamilyFile]:
        result = await self.db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        return result.scalar_one_or_none()

    async def _get_financial_metrics(
        self,
        family_file_id: str,
        case_id: Optional[str],
        start_date: datetime,
        end_date: datetime,
    ) -> dict:
        """Calculate financial compliance metrics."""
        if not case_id:
            return self._empty_financial_metrics()

        # Get completed payments
        completed_result = await self.db.execute(
            select(func.count(Payment.id), func.sum(Payment.amount))
            .where(
                and_(
                    Payment.case_id == case_id,
                    Payment.status == "completed",
                    Payment.completed_at >= start_date,
                    Payment.completed_at <= end_date,
                )
            )
        )
        completed_row = completed_result.one()
        completed_count = completed_row[0] or 0
        completed_amount = float(completed_row[1] or 0)

        # Get pending payments
        pending_result = await self.db.execute(
            select(func.count(Payment.id), func.sum(Payment.amount))
            .where(
                and_(
                    Payment.case_id == case_id,
                    Payment.status == "pending",
                )
            )
        )
        pending_row = pending_result.one()
        pending_count = pending_row[0] or 0
        pending_amount = float(pending_row[1] or 0)

        # Get expense requests
        approved_expenses = await self.db.execute(
            select(func.count(ExpenseRequest.id), func.sum(ExpenseRequest.total_amount))
            .where(
                and_(
                    ExpenseRequest.case_id == case_id,
                    ExpenseRequest.status == "approved",
                    ExpenseRequest.updated_at >= start_date,
                    ExpenseRequest.updated_at <= end_date,
                )
            )
        )
        approved_row = approved_expenses.one()

        rejected_expenses = await self.db.execute(
            select(func.count(ExpenseRequest.id))
            .where(
                and_(
                    ExpenseRequest.case_id == case_id,
                    ExpenseRequest.status == "rejected",
                    ExpenseRequest.updated_at >= start_date,
                    ExpenseRequest.updated_at <= end_date,
                )
            )
        )

        total_expense_requests = await self.db.execute(
            select(func.count(ExpenseRequest.id))
            .where(
                and_(
                    ExpenseRequest.case_id == case_id,
                    ExpenseRequest.created_at >= start_date,
                    ExpenseRequest.created_at <= end_date,
                )
            )
        )

        approved_count = approved_row[0] or 0
        approved_amount = float(approved_row[1] or 0)
        rejected_count = rejected_expenses.scalar() or 0
        total_requests = total_expense_requests.scalar() or 0

        # Calculate approval rate
        approval_rate = (approved_count / total_requests * 100) if total_requests > 0 else 0

        return {
            "payments_completed": completed_count,
            "payments_completed_amount": round(completed_amount, 2),
            "payments_pending": pending_count,
            "payments_pending_amount": round(pending_amount, 2),
            "expenses_approved": approved_count,
            "expenses_approved_amount": round(approved_amount, 2),
            "expenses_rejected": rejected_count,
            "expense_approval_rate": round(approval_rate, 1),
            "total_expense_requests": total_requests,
        }

    def _empty_financial_metrics(self) -> dict:
        return {
            "payments_completed": 0,
            "payments_completed_amount": 0.0,
            "payments_pending": 0,
            "payments_pending_amount": 0.0,
            "expenses_approved": 0,
            "expenses_approved_amount": 0.0,
            "expenses_rejected": 0,
            "expense_approval_rate": 0,
            "total_expense_requests": 0,
        }

    async def _get_communication_metrics(
        self,
        family_file_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> dict:
        """Calculate communication compliance metrics."""
        # Total messages
        total_result = await self.db.execute(
            select(func.count(Message.id))
            .where(
                and_(
                    Message.family_file_id == family_file_id,
                    Message.created_at >= start_date,
                    Message.created_at <= end_date,
                )
            )
        )
        total_messages = total_result.scalar() or 0

        # Flagged messages
        flagged_result = await self.db.execute(
            select(func.count(Message.id))
            .where(
                and_(
                    Message.family_file_id == family_file_id,
                    Message.was_flagged == True,
                    Message.created_at >= start_date,
                    Message.created_at <= end_date,
                )
            )
        )
        flagged_messages = flagged_result.scalar() or 0

        # Get flag actions - count accepted suggestions
        accepted_result = await self.db.execute(
            select(func.count(MessageFlag.id))
            .join(Message, MessageFlag.message_id == Message.id)
            .where(
                and_(
                    Message.family_file_id == family_file_id,
                    MessageFlag.user_action == "accepted",
                    MessageFlag.created_at >= start_date,
                    MessageFlag.created_at <= end_date,
                )
            )
        )
        accepted_suggestions = accepted_result.scalar() or 0

        # Get total flags
        total_flags_result = await self.db.execute(
            select(func.count(MessageFlag.id))
            .join(Message, MessageFlag.message_id == Message.id)
            .where(
                and_(
                    Message.family_file_id == family_file_id,
                    MessageFlag.created_at >= start_date,
                    MessageFlag.created_at <= end_date,
                )
            )
        )
        total_flags = total_flags_result.scalar() or 0

        # Calculate top flagged category
        flags_result = await self.db.execute(
            select(MessageFlag.categories)
            .join(Message, MessageFlag.message_id == Message.id)
            .where(
                and_(
                    Message.family_file_id == family_file_id,
                    MessageFlag.created_at >= start_date,
                    MessageFlag.created_at <= end_date,
                )
            )
        )
        all_categories_lists = flags_result.scalars().all()
        
        from collections import Counter
        category_counts = Counter()
        for cat_list in all_categories_lists:
            if cat_list:
                # Handle both list and string cases (legacy data might be string)
                if isinstance(cat_list, list):
                    category_counts.update(cat_list)
                elif isinstance(cat_list, str):
                    category_counts.update([cat_list])

        top_flagged_category = category_counts.most_common(1)[0][0] if category_counts else None

        # Calculate rates
        flag_rate = (flagged_messages / total_messages * 100) if total_messages > 0 else 0
        good_faith_rate = (accepted_suggestions / total_flags * 100) if total_flags > 0 else 100

        return {
            "total_messages": total_messages,
            "flagged_messages": flagged_messages,
            "flag_rate": round(flag_rate, 1),
            "aria_interventions": total_flags,
            "suggestions_accepted": accepted_suggestions,
            "good_faith_rate": round(good_faith_rate, 1),
            "top_flagged_category": top_flagged_category,
        }

    async def _get_per_parent_communication(
        self,
        family_file_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> list:
        """Get communication metrics broken down by parent."""
        # Get distinct senders
        senders_result = await self.db.execute(
            select(Message.sender_id, func.count(Message.id))
            .where(
                and_(
                    Message.family_file_id == family_file_id,
                    Message.created_at >= start_date,
                    Message.created_at <= end_date,
                )
            )
            .group_by(Message.sender_id)
        )
        senders = senders_result.fetchall()

        breakdown = []
        for sender_id, msg_count in senders:
            # Get user info
            user_result = await self.db.execute(
                select(User).where(User.id == sender_id)
            )
            user = user_result.scalar_one_or_none()

            # Count flagged for this sender
            flagged_result = await self.db.execute(
                select(func.count(Message.id))
                .where(
                    and_(
                        Message.family_file_id == family_file_id,
                        Message.sender_id == sender_id,
                        Message.was_flagged == True,
                        Message.created_at >= start_date,
                        Message.created_at <= end_date,
                    )
                )
            )
            flagged = flagged_result.scalar() or 0

            breakdown.append({
                "user_id": sender_id,
                "name": f"{user.first_name} {user.last_name}" if user else "Unknown",
                "messages_sent": msg_count,
                "messages_flagged": flagged,
                "flag_rate": round((flagged / msg_count * 100), 1) if msg_count > 0 else 0,
            })

        return breakdown

    async def _get_payment_history(
        self,
        case_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> list:
        """Get recent payment history."""
        result = await self.db.execute(
            select(Payment)
            .where(
                and_(
                    Payment.case_id == case_id,
                    Payment.created_at >= start_date,
                    Payment.created_at <= end_date,
                )
            )
            .order_by(Payment.created_at.desc())
            .limit(20)
        )
        payments = result.scalars().all()

        return [
            {
                "id": p.id,
                "date": p.created_at.isoformat(),
                "amount": float(p.amount),
                "type": p.payment_type,
                "status": p.status,
                "payer_id": p.payer_id,
            }
            for p in payments
        ]

    async def _get_pending_expenses(self, case_id: str) -> list:
        """Get pending expense requests."""
        result = await self.db.execute(
            select(ExpenseRequest)
            .where(
                and_(
                    ExpenseRequest.case_id == case_id,
                    ExpenseRequest.status == "pending",
                )
            )
            .order_by(ExpenseRequest.created_at.desc())
            .limit(10)
        )
        expenses = result.scalars().all()

        return [
            {
                "id": e.id,
                "date_requested": e.created_at.isoformat(),
                "category": e.category,
                "amount": float(e.total_amount),
                "description": e.description[:100] if e.description else None,
                "days_pending": (datetime.utcnow() - e.created_at).days,
            }
            for e in expenses
        ]

    def _calculate_overall_score(
        self,
        exchange: dict,
        financial: dict,
        communication: dict,
    ) -> float:
        """Calculate overall compliance score (0-100)."""
        scores = []
        weights = []

        # Exchange score (40% weight)
        if exchange.get("total_exchanges", 0) > 0:
            exchange_score = (
                exchange.get("geofence_compliance_rate", 0) * 0.5 +
                exchange.get("on_time_rate", 0) * 0.5
            )
            scores.append(exchange_score)
            weights.append(0.4)

        # Financial score (30% weight) - based on no pending payments
        total_payments = (
            financial.get("payments_completed", 0) +
            financial.get("payments_pending", 0)
        )
        if total_payments > 0:
            payment_completion_rate = (
                financial["payments_completed"] / total_payments * 100
            )
            financial_score = payment_completion_rate
            scores.append(financial_score)
            weights.append(0.3)

        # Communication score (30% weight) - inverse of flag rate + good faith
        if communication.get("total_messages", 0) > 0:
            comm_score = (
                (100 - communication.get("flag_rate", 0)) * 0.5 +
                communication.get("good_faith_rate", 100) * 0.5
            )
            scores.append(comm_score)
            weights.append(0.3)

        if not scores:
            return 0.0

        # Normalize weights
        total_weight = sum(weights)
        normalized_weights = [w / total_weight for w in weights]

        # Calculate weighted average
        overall = sum(s * w for s, w in zip(scores, normalized_weights))
        return round(overall, 1)

    def _score_to_status(self, score: float) -> str:
        """Convert numeric score to status label."""
        if score >= 90:
            return "excellent"
        elif score >= 75:
            return "good"
        elif score >= 50:
            return "needs_improvement"
        elif score > 0:
            return "concerning"
        else:
            return "no_data"

    async def _get_obligation_metrics(
        self,
        family_file_id: str,
        case_id: Optional[str] = None
    ) -> dict:
        """Calculate ClearFund obligation metrics."""
        # Query obligations (exclude cancelled)
        filters = [Obligation.status.notin_(["cancelled"])]
        if case_id:
            filters.append(
                or_(
                    Obligation.family_file_id == family_file_id,
                    Obligation.case_id == case_id
                )
            )
        else:
            filters.append(Obligation.family_file_id == family_file_id)
            
        query = select(Obligation).where(and_(*filters))
        result = await self.db.execute(query)
        obligations = result.scalars().all()

        total_amount = sum(o.total_amount for o in obligations)
        amount_funded = sum(o.amount_funded for o in obligations)
        amount_verified = sum(o.amount_verified for o in obligations)
        total_obligations = len(obligations)
        pending_count = sum(1 for o in obligations if o.status in ["open", "partially_funded", "pending_verification"])

        # Query funding by parent to calculate compliance
        ff_result = await self.db.execute(select(FamilyFile).where(FamilyFile.id == family_file_id))
        family_file = ff_result.scalar_one_or_none()
        parent_a_id = str(family_file.parent_a_id) if family_file and family_file.parent_a_id else None
        parent_b_id = str(family_file.parent_b_id) if family_file and family_file.parent_b_id else None

        parent_a_contribution = 0
        parent_b_contribution = 0
        parent_a_required = 0
        parent_b_required = 0

        if obligations and (parent_a_id or parent_b_id):
            # Get all funding records for these obligations
            funding_query = select(ObligationFunding).where(
                ObligationFunding.obligation_id.in_([o.id for o in obligations])
            )
            funding_result = await self.db.execute(funding_query)
            fundings = funding_result.scalars().all()

            for f in fundings:
                pid = str(f.parent_id)
                if pid == parent_a_id:
                    parent_a_contribution += f.amount_funded
                    parent_a_required += f.amount_required
                elif pid == parent_b_id:
                    parent_b_contribution += f.amount_funded
                    parent_b_required += f.amount_required

        parent_a_compliance = (parent_a_contribution / parent_a_required) if parent_a_required > 0 else 0
        parent_b_compliance = (parent_b_contribution / parent_b_required) if parent_b_required > 0 else 0

        # Calculate top category
        category_counts = {}
        for o in obligations:
            category_counts[o.purpose_category] = category_counts.get(o.purpose_category, 0) + 1
        
        top_category = "None"
        if category_counts:
            top_category = max(category_counts, key=category_counts.get)

        # Calculate child support specific stats
        child_support_obligations = [o for o in obligations if o.purpose_category == "child_support"]
        child_support_total = sum(o.total_amount for o in child_support_obligations)
        child_support_funded = sum(o.amount_funded for o in child_support_obligations)
        child_support_paid_pct = (float(child_support_funded) / float(child_support_total) * 100) if child_support_total > 0 else 0

        return {
            "total_obligations": total_obligations,
            "total_amount": float(total_amount or 0),
            "amount_funded": float(amount_funded or 0),
            "amount_verified": float(amount_verified or 0),
            "pending_count": pending_count,
            "parent_a_contribution": float(parent_a_contribution),
            "parent_b_contribution": float(parent_b_contribution),
            "parent_a_compliance": float(parent_a_compliance),
            "parent_b_compliance": float(parent_b_compliance),
            "top_category": top_category,
            "child_support_paid_pct": round(child_support_paid_pct, 1)
        }
