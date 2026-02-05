
import asyncio
import os
import sys
from datetime import datetime
from sqlalchemy import select, desc
from dotenv import load_dotenv

# Load env before importing app modules
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import get_db_context
from app.models.message import Message

async def main():
    family_file_id = "d491d4f6-da26-4b27-a12f-b8c52e9fbdab"
    
    async with get_db_context() as db:
        print(f"Checking messages for Family File: {family_file_id}")
        
        # Get all messages sorted by created_at desc
        result = await db.execute(
            select(Message)
            .where(Message.family_file_id == family_file_id)
            .order_by(desc(Message.created_at))
            .limit(20)
        )
        messages = result.scalars().all()
        
        print(f"Found {len(messages)} recent messages:")
        print("-" * 50)
        for msg in messages:
            print(f"ID: {msg.id}")
            print(f"Time: {msg.created_at}")
            print(f"Sender: {msg.sender_id}")
            print(f"Content: {msg.content[:50]}..." if msg.content else "[No Content]")
            print("-" * 50)

if __name__ == "__main__":
    asyncio.run(main())
