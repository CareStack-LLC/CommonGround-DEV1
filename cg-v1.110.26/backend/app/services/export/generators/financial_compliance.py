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
from app.models.agreement import Agreement, AgreementSection
import re
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

        # Get active agreement and terms
        agreement_terms = await self._get_agreement_terms(db, context)
        
        # Analyze compliance
        child_support_compliance = self._analyze_child_support_compliance(payments, agreement_terms, context)
        expense_compliance = self._analyze_expense_compliance(expenses, agreement_terms)

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
            "child_support_compliance": child_support_compliance,
            "expense_compliance": expense_compliance,
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

    async def _get_agreement_terms(self, db, context: GeneratorContext) -> dict:
        """Fetch active agreement and extract key financial terms."""
        # Find active agreement
        # Priority: Active > Draft > None
        stmt = select(Agreement).where(
            Agreement.case_id == context.case_id,
        ).order_by(Agreement.updated_at.desc())
        
        result = await db.execute(stmt)
        agreements = result.scalars().all()
        
        agreement = None
        for a in agreements:
            if a.status == "active":
                agreement = a
                break
        
        if not agreement and agreements:
            agreement = agreements[0] # Fallback
            
        if not agreement:
            return {}

        # Load sections if needed
        sections_res = await db.execute(select(AgreementSection).where(AgreementSection.agreement_id == agreement.id))
        sections = sections_res.scalars().all()

        return self._extract_agreement_terms(agreement, sections)

    def _extract_agreement_terms(self, agreement: Agreement, sections: list) -> dict:
        """Extract financial terms from agreement sections."""
        terms = {
            "child_support_amount": 0.0,
            "child_support_period": "month",
            "cost_split_petitioner": 50,
            "cost_split_respondent": 50,
            "has_agreement": True,
            "agreement_title": agreement.title
        }

        for section in sections:
            content = section.content or ""
            
            # Extract Child Support
            if section.section_type == "financial":
                # Look for "$X/month"
                match_cs = re.search(r'\$([0-9,.]+)\s*(?:/|per\s*)month', content, re.IGNORECASE)
                if match_cs:
                    amount_str = match_cs.group(1).replace(',', '')
                    try:
                        terms["child_support_amount"] = float(amount_str)
                    except ValueError:
                        pass
                
                # Look for Cost Split
                # "50/50", "60/40"
                match_split = re.search(r'(\d+)\s*/\s*(\d+)\s*split', content, re.IGNORECASE)
                if match_split:
                    try:
                        p_share = int(match_split.group(1))
                        # Assume first number is usually mentioned first matching typical custody (Petitioner/Respondent)
                        # This is a heuristic. Ideally agreement stores structured data.
                        terms["cost_split_petitioner"] = p_share
                        terms["cost_split_respondent"] = 100 - p_share
                    except ValueError:
                        pass
                elif "shared equally" in content.lower() or "equal split" in content.lower():
                     terms["cost_split_petitioner"] = 50
                     terms["cost_split_respondent"] = 50

        return terms

    def _analyze_child_support_compliance(
        self, 
        payments: list[Payment], 
        terms: dict,
        context: GeneratorContext
    ) -> dict:
        """Analyze child support payments against agreement."""
        if not terms.get("has_agreement") or terms.get("child_support_amount", 0) == 0:
            return {"status": "not_applicable"}

        required_monthly = terms["child_support_amount"]
        
        # Calculate months in report period
        start = context.date_start
        end = context.date_end
        # Approximate months
        days = (end - start).days
        months = max(1, round(days / 30.44)) 
        
        expected_total = required_monthly * months

        # Sum actual payments
        child_support_payments = [
            p for p in payments 
            if p.payment_type == "child_support" and p.status == "completed"
        ]
        actual_total = sum(float(p.amount) for p in child_support_payments)
        
        # Calculate discrepancy
        shortfall = max(0, expected_total - actual_total)
        compliance_score = min(100, (actual_total / expected_total * 100)) if expected_total > 0 else 100

        return {
            "status": "active",
            "required_monthly": required_monthly,
            "expected_total": expected_total,
            "actual_total": actual_total,
            "shortfall": shortfall,
            "compliance_score": round(compliance_score, 1),
            "months_covered": months
        }

    def _analyze_expense_compliance(self, expenses: list[ExpenseRequest], terms: dict) -> dict:
        """Verify if expense requests match agreed split."""
        if not terms.get("has_agreement"):
            return {"status": "not_applicable"}
            
        agreed_split = terms.get("cost_split_petitioner", 50) # Assuming request logic uses petitioner/requester share
        
        compliant_requests = []
        deviating_requests = []
        
        for expense in expenses:
            # Check if split matches (allow 1% variance)
            # This logic assumes "split_percentage" in ExpenseRequest refers to the standard split user
            # We might need to know WHO requested to know which side of split to check.
            # For now, simplistic check: is it close to agreed or (100-agreed)?
            
            actual = expense.split_percentage
            
            is_match = (
                abs(actual - agreed_split) <= 1 or 
                abs(actual - (100 - agreed_split)) <= 1
            )
            
            item = {
                "id": expense.id,
                "title": expense.title,
                "amount": float(expense.total_amount),
                "requested_split": actual,
                "agreed_split": agreed_split
            }
            
            if is_match:
                compliant_requests.append(item)
            else:
                deviating_requests.append(item)
                
        total = len(expenses)
        score = (len(compliant_requests) / total * 100) if total > 0 else 100
        
        return {
            "status": "active",
            "agreed_split": f"{agreed_split}/{100-agreed_split}",
            "compliance_score": round(score, 1),
            "deviating_items": deviating_requests,
            "compliant_count": len(compliant_requests),
            "total_count": total
        }
