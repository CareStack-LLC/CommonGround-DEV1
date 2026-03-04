
import asyncio
import sys
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.orm import selectinload

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.message import Message, MessageFlag
from app.models.family_file import FamilyFile

FAMILY_FILE_ID = "d491d4f6-da26-4b27-a12f-b8c52e9fbdab"

async def main():
    async with AsyncSessionLocal() as db:
        # 1. Identify Tasha
        ff = await db.get(FamilyFile, FAMILY_FILE_ID)
        p1 = await db.get(User, ff.parent_a_id)
        p2 = await db.get(User, ff.parent_b_id)
        
        tasha = p1 if p1.first_name.lower() == "tasha" else p2
        print(f"Target Parent: {tasha.first_name} {tasha.last_name} ({tasha.id})")

        # 2. Find ALL flagged messages
        stmt = (
            select(MessageFlag)
            .join(Message)
            .where(Message.sender_id == tasha.id)
            .order_by(MessageFlag.created_at.desc())
            .options(selectinload(MessageFlag.message))
        )
        result = await db.execute(stmt)
        flags = result.scalars().all()

        print(f"\nFound {len(flags)} flagged messages for {tasha.first_name}:\n")
        print(f"{'Date':<20} | {'Score':<6} | {'Category':<15} | {'Content'}")
        print("-" * 100)
        
        for flag in flags:
            msg = flag.message
            cat_str = ", ".join(flag.categories) if flag.categories else "None"
            content = msg.content[:50] + "..." if len(msg.content) > 50 else msg.content
            
            print(f"{flag.created_at.strftime('%Y-%m-%d %H:%M'):<20} | {flag.toxicity_score:.2f}   | {cat_str:<15} | {content}")

if __name__ == "__main__":
    asyncio.run(main())
