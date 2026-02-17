
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.config import settings
from supabase import create_client

def upload_placeholder():
    supabase = create_client(
        settings.SUPABASE_URL, 
        settings.SUPABASE_SERVICE_KEY
    )
    
    source_path = "frontend/public/images/Aria.png"
    dest_path = "demo/image.jpg"
    bucket = "message_attachments"
    
    print(f"Uploading {source_path} to {bucket}/{dest_path}...")
    
    try:
        with open(source_path, "rb") as f:
            res = supabase.storage.from_(bucket).upload(
                dest_path,
                f,
                {"content-type": "image/png", "upsert": "true"}
            )
            print(f"Upload result: {res}")
            
        # Verify it exists now
        signed_url = supabase.storage.from_(bucket).create_signed_url(dest_path, 3600)
        print(f"Verification Signed URL: {signed_url}")
        
    except Exception as e:
        print(f"Error uploading: {e}")

if __name__ == "__main__":
    upload_placeholder()
