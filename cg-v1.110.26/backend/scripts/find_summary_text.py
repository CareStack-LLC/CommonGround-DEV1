
import asyncio
import sys
from pathlib import Path
from sqlalchemy import text

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal

SEARCH_TEXT = "establishes that"

async def main():
    async with AsyncSessionLocal() as db:
        print(f"Searching for text: '{SEARCH_TEXT}'...")
        
        # 1. Search in Tables
        candidates = [
            ("agreement_conversations", "summary"),
            ("agreement_conversations", "extracted_data"), 
            ("agreement_conversations", "messages"),
            ("agreements", "rules"), 
            ("agreement_versions", "data"), 
            ("agreement_sections", "content"),
            ("agreement_sections", "structured_data"),
        ]

        for table, col in candidates:
            try:
                query = f"SELECT id FROM {table} WHERE {col}::text LIKE :pattern"
                result = await db.execute(text(query), {"pattern": f"%{SEARCH_TEXT}%"})
                rows = result.fetchall()
                if rows:
                    print(f"✅ FOUND in {table}.{col}!")
                    for row in rows:
                        print(f"   - Record ID: {row.id}")
            except Exception as e:
                # print(f"   ⚠️ Error searching {table}.{col}: {e}")
                pass
        
        # 2. Inspect Target Conv Messages explicitly
        target_conv_id = "cdfda3a9-0d2e-415d-9d5e-076c413a07d6" 
        print(f"\nInspecting Conversation {target_conv_id}:")
        from app.models.agreement import AgreementConversation
        conv = await db.get(AgreementConversation, target_conv_id)
        if conv:
            print(f"Summary: {conv.summary}")
            print(f"Messages Type: {type(conv.messages)}")
            print(f"Messages Len: {len(conv.messages) if conv.messages else 0}")
            if conv.messages:
                last_msg = conv.messages[-1]
                print(f"Last Msg Content: {last_msg.get('content')}")
        else:
            print("Conv not found")

if __name__ == "__main__":
    asyncio.run(main())
