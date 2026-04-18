"""
Seed child support payments and expense requests for compliance demonstration.
"""
import asyncio
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from app.models.case import Case
from app.models.payment import Payment, ExpenseRequest

CASE_ID = "374e607c-edc1-4ae9-8e04-0ed682f1d1a7"

# From debug: Petitioner (Marcus) = eb9a2b70-76ed-4cb5-b8fb-23e1776423ee
#             Respondent (Tasha) = cb157af9-69e8-4c81-943a-83deea6746cc
# Agreement says: Child support $800/month paid by Parent B (Tasha) to Parent A (Marcus)

PETITIONER_ID = "eb9a2b70-76ed-4cb5-b8fb-23e1776423ee"  # Marcus - receives child support
RESPONDENT_ID = "cb157af9-69e8-4c81-943a-83deea6746cc"  # Tasha - pays child support

async def main():
    async with AsyncSessionLocal() as db:
        print("Seeding Child Support Payments...")
        
        # Seed 9 months of child support (May 2025 - Jan 2026)
        # Mix: 7 on-time, 1 late, 1 partial
        months = [
            ("2025-05-01", 800, "completed", 0),   # On-time
            ("2025-06-01", 800, "completed", 0),   # On-time
            ("2025-07-01", 800, "completed", 0),   # On-time
            ("2025-08-01", 800, "completed", 10),  # 10 days late
            ("2025-09-01", 800, "completed", 0),   # On-time
            ("2025-10-01", 600, "completed", 0),   # Partial payment (only $600)
            ("2025-11-01", 800, "completed", 0),   # On-time
            ("2025-12-01", 800, "completed", 0),   # On-time
            ("2026-01-01", 800, "completed", 0),   # On-time
        ]
        
        for due_date_str, amount, status, days_late in months:
            due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
            completed_at = due_date + timedelta(days=days_late) if status == "completed" else None
            
            payment = Payment(
                case_id=CASE_ID,
                payment_type="child_support",
                payer_id=RESPONDENT_ID,  # Tasha pays
                payee_id=PETITIONER_ID,  # Marcus receives
                amount=Decimal(str(amount)),
                purpose=f"Child Support - {due_date.strftime('%B %Y')}",
                category="child_support",
                status=status,
                scheduled_date=due_date,
                completed_at=completed_at,
            )
            db.add(payment)
        
        print("Seeding Expense Requests (50/50 split)...")
        
        # Expense requests with varying compliance
        expenses = [
            ("Medical - Annual Checkup", "medical", 200, 100, "approved", True),  # 50/50 paid
            ("School Supplies", "education", 150, 75, "approved", True),  # 50/50 paid
            ("Soccer Equipment", "sports", 300, 150, "approved", True),  # 50/50 paid
            ("Winter Jacket", "clothing", 120, 60, "approved", False),  # NOT paid by one parent
            ("Tutoring", "education", 400, 200, "pending", False),  # Pending
        ]
        
        for title, category, total, share, status, is_paid in expenses:
            req = ExpenseRequest(
                case_id=CASE_ID,
                requested_by=PETITIONER_ID,
                requested_from=RESPONDENT_ID,
                total_amount=Decimal(str(total)),
                requesting_amount=Decimal(str(share)),
                split_percentage=50,
                category=category,
                title=title,
                description=f"Expense for {title}",
                child_ids=["child-1"],
                status=status,
                total_paid=Decimal(str(share)) if is_paid else Decimal("0"),
                is_fully_paid=is_paid,
            )
            db.add(req)
        
        await db.commit()
        print("✅ Seeding Complete.")

if __name__ == "__main__":
    asyncio.run(main())
