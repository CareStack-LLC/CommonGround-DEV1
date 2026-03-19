
import os
import asyncio
from supabase import create_client, Client
from enum import Enum

class StorageBucket:
    AVATARS = "avatars"
    CHILDREN = "children"
    CUBBIE = "cubbie"
    RECEIPTS = "receipts"
    DOCUMENTS = "documents"
    KIDCOMS = "kidcoms"
    MESSAGE_ATTACHMENTS = "message_attachments"
    CALL_RECORDINGS = "call_recordings"
    PROFESSIONAL_MEDIA = "professional-media"
    REPORTS = "reports"
    ARIA_FRAME_EVIDENCE = "aria-frame-evidence"
    EMAIL_ASSETS = "email-assets"

async def initialize_storage():
    """Ensure all required Supabase Storage buckets exist and are correctly configured."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    
    if not url or not key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment.")
        return

    print(f"Connecting to Supabase at {url}...")
    supabase: Client = create_client(url, key)

    buckets = [
        (StorageBucket.AVATARS, True),            # Public
        (StorageBucket.CHILDREN, False),          # Private
        (StorageBucket.CUBBIE, False),            # Private
        (StorageBucket.RECEIPTS, False),          # Private
        (StorageBucket.DOCUMENTS, False),         # Private
        (StorageBucket.KIDCOMS, True),            # Public
        (StorageBucket.MESSAGE_ATTACHMENTS, False),# Private
        (StorageBucket.CALL_RECORDINGS, False),   # Private
        (StorageBucket.PROFESSIONAL_MEDIA, True),  # Public
        (StorageBucket.REPORTS, False),              # Private
        (StorageBucket.ARIA_FRAME_EVIDENCE, False),  # Private
        (StorageBucket.EMAIL_ASSETS, True),             # Public — email logos/icons
        (StorageBucket.KIDSPACE_MEDIA, True),             # Public — KidSpace movies, books, author photos
    ]

    print("\n📦 Initializing Storage Buckets...")
    
    for bucket_name, is_public in buckets:
        try:
            # Check if bucket exists
            try:
                supabase.storage.get_bucket(bucket_name)
                print(f"   ✅ Bucket '{bucket_name}' already exists.")
            except Exception:
                # Create bucket if it doesn't exist
                print(f"   🛠️  Creating bucket '{bucket_name}' (public={is_public})...")
                supabase.storage.create_bucket(bucket_name, options={
                    "public": is_public,
                    "file_size_limit": 157286400, # 150MB
                })
                print(f"   ✅ Bucket '{bucket_name}' created successfully.")
        except Exception as e:
            print(f"   ❌ Failed to initialize bucket '{bucket_name}': {e}")

    print("\n✨ Storage initialization complete.")

if __name__ == "__main__":
    asyncio.run(initialize_storage())
