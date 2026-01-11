"""
Financial Compliance section generator.

Section 4: ClearFund summary, outstanding balances, expense tracking.
"""

from datetime import datetime
from decimal import Decimal
from sqlalchemy import select, func, and_

from app.models.payment import Payment, ExpenseRequest, PaymentLedger
from app.models.case import CaseParticipant
from app.models.user import User
from app.services.export.generators.base import (
    BaseSectionGenerator,
    GeneratorContext,
    SectionContent,
)


class FinancialComplianceGenerator(BaseSectionGenerator):
    """Generates the Financial Compliance section."""

    section_type = "financial_compliance"
    section_title = "Financial Compliance"
    section_order = 4

    async def generate(self, context: GeneratorContext) -> SectionContent:
        """Generate financial compliance analysis."""
        db = context.db
        start = datetime.combine(context.date_start, datetime.min.time())
        end = datetime.combine(context.date_end, datetime.max.time())

        # Get payments
        payments_result = await db.execute(
            select(Payment)
            .where(
                and_(
                    Payment.case_id == context.case_id,
                    Payment.created_at >= start,
                    Payment.created_at <= end
                )
            )
            .order_by(Payment.created_at.desc())
        )
        payments = list(payments_result.scalars().all())

        # Get expense requests
        expenses_result = await db.execute(
            select(ExpenseRequest)
            .where(
                and_(
                    ExpenseRequest.case_id == context.case_id,
                    ExpenseRequest.created_at >= start,
                    ExpenseRequest.created_at <= end
                )
            )
            .order_by(ExpenseRequest.created_at.desc())
        )
        expenses = list(expenses_result.scalars().all())

        # Get current balances from ledger
        balances = await self._calculate_balances(db, context)

        # Build payment summary
        payment_summary = self._summarize_payments(payments)
        expense_summary = self._summarize_expenses(expenses)

        content_data = {
            "payment_summary": payment_summary,
            "expense_summary": expense_summary,
            "current_balances": balances,
            "payment_log": await self._build_payment_log(payments, context),
            "pending_expenses": await self._build_pending_expenses(
                [e for e in expenses if e.status == "pending"],
                context
            ),
            "report_period": {
                "start": self._format_date(context.date_start),
                "end": self._format_date(context.date_end),
            },
        }

        return SectionContent(
            section_type=self.section_type,
            section_title=self.section_title,
            section_order=self.section_order,
            content_data=content_data,
            evidence_count=len(payments) + len(expenses),
            data_sources=["payments", "expense_requests", "payment_ledger"],
        )

    async def _calculate_balances(self, db, context: GeneratorContext) -> dict:
        """Calculate current account balances."""
        # Get latest ledger entries for each user
        participants_result = await db.execute(
            select(CaseParticipant)
            .where(CaseParticipant.case_id == context.case_id)
            .where(CaseParticipant.is_active == True)
        )
        participants = list(participants_result.scalars().all())

        balances = {}
        for participant in participants:
            # Get most recent ledger entry where user is the obligor
            latest_result = await db.execute(
                select(PaymentLedger)
                .where(
                    and_(
                        PaymentLedger.case_id == context.case_id,
                        PaymentLedger.obligor_id == participant.user_id
                    )
                )
                .order_by(PaymentLedger.created_at.desc())
                .limit(1)
            )
            latest = latest_result.scalar_one_or_none()

            balances[participant.user_id] = {
                "parent_type": participant.parent_type,
                "balance": float(latest.running_balance) if latest else 0.0,
            }

        return balances

    def _summarize_payments(self, payments: list[Payment]) -> dict:
        """Summarize payment activity."""
        completed = [p for p in payments if p.status == "completed"]
        pending = [p for p in payments if p.status == "pending"]

        total_completed = sum(float(p.amount) for p in completed)
        total_pending = sum(float(p.amount) for p in pending)

        # Group by payment type
        by_type = {}
        for payment in completed:
            ptype = payment.payment_type
            if ptype not in by_type:
                by_type[ptype] = {"count": 0, "total": 0.0}
            by_type[ptype]["count"] += 1
            by_type[ptype]["total"] += float(payment.amount)

        return {
            "total_transactions": len(payments),
            "completed_count": len(completed),
            "completed_amount": round(total_completed, 2),
            "pending_count": len(pending),
            "pending_amount": round(total_pending, 2),
            "by_type": by_type,
        }

    def _summarize_expenses(self, expenses: list[ExpenseRequest]) -> dict:
        """Summarize expense request activity."""
        approved = [e for e in expenses if e.status == "approved"]
        rejected = [e for e in expenses if e.status == "rejected"]
        pending = [e for e in expenses if e.status == "pending"]

        total_approved = sum(float(e.total_amount) for e in approved)
        total_rejected = sum(float(e.total_amount) for e in rejected)
        total_pending = sum(float(e.total_amount) for e in pending)

        # Group by category
        by_category = {}
        for expense in approved:
            cat = expense.category
            if cat not in by_category:
                by_category[cat] = {"count": 0, "total": 0.0}
            by_category[cat]["count"] += 1
            by_category[cat]["total"] += float(expense.total_amount)

        return {
            "total_requests": len(expenses),
            "approved_count": len(approved),
            "approved_amount": round(total_approved, 2),
            "rejected_count": len(rejected),
            "rejected_amount": round(total_rejected, 2),
            "pending_count": len(pending),
            "pending_amount": round(total_pending, 2),
            "by_category": by_category,
        }

    async def _build_payment_log(
        self,
        payments: list[Payment],
        context: GeneratorContext
    ) -> list[dict]:
        """Build payment transaction log."""
        log = []
        for payment in payments[:30]:  # Limit to 30 most recent
            log.append({
                "date": self._format_date(payment.created_at.date()),
                "type": payment.payment_type,
                "amount": float(payment.amount),
                "status": payment.status,
                "has_receipt": payment.receipt_url is not None,
            })
        return log

    async def _build_pending_expenses(
        self,
        expenses: list[ExpenseRequest],
        context: GeneratorContext
    ) -> list[dict]:
        """Build pending expense requests list."""
        pending = []
        for expense in expenses[:10]:  # Limit to 10
            pending.append({
                "date_requested": self._format_date(expense.created_at.date()),
                "category": expense.category,
                "description": await self._redact(
                    expense.description or "",
                    context
                ),
                "amount": float(expense.total_amount),
                "days_pending": (
                    datetime.utcnow() - expense.created_at
                ).days,
            })
        return pending
