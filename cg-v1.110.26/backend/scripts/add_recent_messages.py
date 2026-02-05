
import asyncio
import os
import sys
from datetime import datetime, timedelta
import random
import uuid
from dotenv import load_dotenv

# Load env before importing app modules
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import get_db_context
from app.models.family_file import FamilyFile
from app.models.message import Message, MessageFlag
from sqlalchemy import select

async def main():
    family_file_id = "d491d4f6-da26-4b27-a12f-b8c52e9fbdab"
    
    async with get_db_context() as db:
        print(f"Adding recent messages for Family File: {family_file_id}")
        
        # Verify family file exists
        result = await db.execute(select(FamilyFile).where(FamilyFile.id == family_file_id))
        family_file = result.scalar_one_or_none()
        if not family_file:
            print("Family file not found!")
            return

        parent_a_id = family_file.parent_a_id
        parent_b_id = family_file.parent_b_id
        
        # Generate messages from Jan 13, 2026 to Feb 4, 2026
        start_date = datetime(2026, 1, 13)
        end_date = datetime(2026, 2, 4, 16, 0, 0) # Today 4 PM
        
        current_date = start_date
        messages_added = 0
        
        conversations = [
            [
                (parent_a_id, "Have you seen Jayden's math book? He can't find it."),
                (parent_b_id, "I think he left it in the car. I'll check."),
                (parent_b_id, "Yeah, found it. I'll drop it off on my way to work."),
                (parent_a_id, "Thanks. Can you just leave it on the porch?"),
                (parent_b_id, "Sure.")
            ],
            [
                (parent_b_id, "I need to switch weekends next month. My sister is getting married."),
                (parent_a_id, "Which weekend?"),
                (parent_b_id, "Feb 21st. Can we swap for the 14th?"),
                (parent_a_id, "Feb 14th works. Send me a swap request."),
                (parent_b_id, "Will do.")
            ],
            [
                (parent_a_id, "Just a reminder that basketball practice starts at 5 today."),
                (parent_b_id, "I verify wait... I thought it was 5:30?"),
                (parent_a_id, "Coach changed it. Check the email."),
                (parent_b_id, "Ugh, okay. I might be 5 mins late."),
                (parent_a_id, "Please try to be on time. Jayden hates being late.")
            ],
            [
                (parent_b_id, "Did you sign the permission slip?"),
                (parent_a_id, "Yes, it's in his backpack."),
                (parent_b_id, "Okay thanks.")
            ],
            # Toxic one
            [
                (parent_a_id, "You were late again. This is becoming a habit."),
                (parent_b_id, "Traffic was terrible! Stop nagging me."),
                (parent_a_id, "It's not nagging, it's about respect for my time."),
                (parent_b_id, "Whatever. I'm doing my best."),
                (parent_a_id, "Your best isn't good enough properly managing your time.") 
            ]
        ]

        while current_date < end_date:
            # Randomly pick a conversation
            if random.random() < 0.3: # 30% chance of a conversation on any given day
                conversation = random.choice(conversations)
                
                # Base time for the convo
                base_time = current_date + timedelta(hours=random.randint(9, 20), minutes=random.randint(0, 59))
                
                for i, (sender_id, content) in enumerate(conversation):
                    msg_time = base_time + timedelta(minutes=i * random.randint(1, 10))
                    
                    if msg_time > end_date:
                        break
                        
                    import hashlib
                    content_hash = hashlib.sha256(content.encode()).hexdigest()
                    
                    msg = Message(
                        id=str(uuid.uuid4()),
                        family_file_id=family_file_id,
                        sender_id=sender_id,
                        recipient_id=parent_b_id if sender_id == parent_a_id else parent_a_id,
                        content=content,
                        content_hash=content_hash,
                        sent_at=msg_time,
                        message_type="text"
                    )
                    db.add(msg)
                    messages_added += 1
                    
                    # Flag the toxic ones
                    if "nagging" in content or "not good enough" in content:
                        flag = MessageFlag(
                            id=str(uuid.uuid4()),
                            message_id=msg.id,
                            toxicity_score=0.8,
                            severity="high",
                            categories=["hostility", "criticism"],
                            user_action="accepted", # User sent it anyway
                            created_at=msg_time,
                            original_content_hash=content_hash,
                            final_content_hash=content_hash,
                            intervention_level=3,
                            intervention_message="This message contains language that may be perceived as hostile. Consider rephrasing."
                        )
                        db.add(flag)

            current_date += timedelta(days=1)
        
        await db.commit()
        print(f"Successfully added {messages_added} messages from {start_date} to {end_date}.")

if __name__ == "__main__":
    asyncio.run(main())
