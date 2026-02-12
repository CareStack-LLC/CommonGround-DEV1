
import asyncio
import json
from app.core.database import get_db_context
from app.services.agreement import AgreementService
from app.models.user import User
from sqlalchemy import select

async def verify_summary(agreement_id: str, user_id: str):
    async with get_db_context() as db:
        agreement_service = AgreementService(db)
        
        # Get user
        user = await db.get(User, user_id)
        if not user:
            print(f"User {user_id} not found")
            return

        print(f"Generating summary for Agreement {agreement_id} as User {user.email}...")
        
        try:
            summary_data = await agreement_service.generate_quick_summary(agreement_id, user)
            
            print("\n" + "="*50)
            print("SUMMARY (MARKDOWN)")
            print("="*50)
            print(summary_data["summary"])
            
            print("\n" + "="*50)
            print("QUICK FACTS (KEY POINTS)")
            print("="*50)
            for i, point in enumerate(summary_data["key_points"], 1):
                print(f"{i}. {point}")
                
            print("\n" + "="*50)
            print("SHARED EXPENSES TABLE")
            print("="*50)
            print(json.dumps(summary_data["shared_expenses_table"], indent=2))
            
            print("\n" + "="*50)
            print("COMPLETION")
            print("="*50)
            print(f"{summary_data['completion_percentage']}% - Status: {summary_data['status']}")
            
        except Exception as e:
            print(f"Error generating summary: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    # Thomas Wilform
    USER_ID = "11eb74b0-2a27-4441-ab1c-437fbac4b6ab"
    # Simplified SharedCare Agreement
    AGREEMENT_ID = "630e58f6-3a63-4786-b1b3-e1fe2efda908"
    
    asyncio.run(verify_summary(AGREEMENT_ID, USER_ID))
