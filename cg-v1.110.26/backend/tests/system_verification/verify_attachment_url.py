
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db_context
from app.models.message import Message
from app.services.professional.communications_service import CommunicationsService

async def verify_attachment_url():
    async with get_db_context() as db:
        # Find a message with attachments
        query = (
            select(Message)
            .options(selectinload(Message.attachments))
            .join(Message.attachments)
            .where(Message.attachments.any(file_name='image.jpg'))
            .limit(1)
        )
        result = await db.execute(query)
        message = result.scalar_one_or_none()
        
        if not message:
            print("No messages with attachments found.")
            return

        print(f"Checking message {message.id}")
        
        service = CommunicationsService(db)
        
        if message.attachments:
            for att in message.attachments:
                print(f"Attachment: {att.file_name} (ID: {att.id})")
                print(f"Storage Path: {att.storage_path}")
                
                # Test signed URL generation
                signed_url = service._get_signed_url(att.storage_path)
                print(f"Generated Signed URL: {signed_url}")
                
                # Verify URL format
                if "token=" in signed_url:
                    print("URL appears to contain a token.")
                else:
                    print("URL does NOT contain a token (might be public or failed).")
        else:
            print("Message marked as has_attachments but no attachment records found.")
            if message.attachment_urls:
                 print(f"Legacy attachment_urls: {message.attachment_urls}")

if __name__ == "__main__":
    asyncio.run(verify_attachment_url())
