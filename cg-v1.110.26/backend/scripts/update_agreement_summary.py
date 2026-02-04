
import asyncio
import sys
from pathlib import Path
from sqlalchemy import update

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from app.models.agreement import AgreementConversation

CONV_ID = "cdfda3a9-0d2e-415d-9d5e-076c413a07d6"
SUMMARY_TEXT = "This custody agreement establishes that Parent A will have the children 80% of the time, while Parent B will have them 20% of the time, with regular visits every other weekend. Both parents will share decision-making responsibilities and alternate holidays annually to ensure balanced family time."

async def main():
    async with AsyncSessionLocal() as db:
        print(f"Updating Conversation {CONV_ID} with summary...")
        stmt = (
            update(AgreementConversation)
            .where(AgreementConversation.id == CONV_ID)
            .values(summary=SUMMARY_TEXT)
        )
        await db.execute(stmt)
        await db.commit()
        print("✅ Update Complete.")

if __name__ == "__main__":
    asyncio.run(main())
