
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.config import settings
from supabase import create_client

def list_bucket_files():
    supabase = create_client(
        settings.SUPABASE_URL, 
        settings.SUPABASE_SERVICE_KEY
    )
    
    print(f"Listing files in bucket 'message_attachments'...")
    try:
        # List files in root
        res = supabase.storage.from_("message_attachments").list()
        print(f"Root files: {res}")
        
        # List files in family file folder
        folder = "efc1b35e-7153-4622-ac16-784a5aef13ea/messages"
        print(f"Listing folder {folder}:")
        res_folder = supabase.storage.from_("message_attachments").list(folder)
        print(f"Folder files: {res_folder}")
        
    except Exception as e:
        print(f"Error listing bucket: {e}")

if __name__ == "__main__":
    list_bucket_files()
