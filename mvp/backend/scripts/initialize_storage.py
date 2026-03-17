
import asyncio
import os
import sys

# Removed sys.path and app imports to bypass Pydantic validation
from supabase import create_client, Client

class StorageBucket:
    # Confirmed Buckets
    AVATARS = "avatars"
    CHILDREN = "children"
    CUBBIE = "cubbie"
    RECEIPTS = "receipts"
    DOCUMENTS = "documents"
    KIDCOMS = "kidcoms"
    MESSAGE_ATTACHMENTS = "message_attachments"
    CALL_RECORDINGS = "call_recordings"
    PROFESSIONAL_MEDIA = "professional-media"
    PROFESSIONAL_VIDEOS = "professional-videos"
    PROFESSIONAL_LOGOS = "professional-logos"
    PROFESSIONAL_HEADSHOTS = "professional-headshots"
    
    # Planned / Likely Required Buckets
    CASE_EXPORTS = "case-exports"
    AGREEMENT_PREVIEWS = "agreement-previews"
    CIRCLE_PHOTOS = "circle-photos"
    ARIA_CONTEXT_LOGS = "aria-context-logs"
    TEMP_UPLOADS = "temp-uploads"

async def initialize_storage():
    """Ensure all required Supabase Storage buckets exist and are correctly configured."""
    
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    
    if not url or not key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment.")
        return

    print(f"Connecting to Supabase at {url}...")
    from supabase import create_client
    supabase_admin: Client = create_client(url, key)

    # Bucket configuration: (name, is_public)
    buckets = [
        # Confirmed
        (StorageBucket.AVATARS, True),            # Public
        (StorageBucket.CHILDREN, False),          # Private
        (StorageBucket.CUBBIE, False),            # Private
        (StorageBucket.RECEIPTS, False),          # Private
        (StorageBucket.DOCUMENTS, False),         # Private
        (StorageBucket.KIDCOMS, True),            # Public
        (StorageBucket.MESSAGE_ATTACHMENTS, False),# Private
        (StorageBucket.CALL_RECORDINGS, False),   # Private
        (StorageBucket.PROFESSIONAL_MEDIA, True),  # Public
        (StorageBucket.PROFESSIONAL_VIDEOS, True), # Public
        (StorageBucket.PROFESSIONAL_LOGOS, True),  # Public
        (StorageBucket.PROFESSIONAL_HEADSHOTS, True), # Public
        
        # Planned
        (StorageBucket.CASE_EXPORTS, False),      # Private
        (StorageBucket.AGREEMENT_PREVIEWS, False), # Private
        (StorageBucket.CIRCLE_PHOTOS, False),      # Private
        (StorageBucket.ARIA_CONTEXT_LOGS, False),  # Private
        (StorageBucket.TEMP_UPLOADS, False),       # Private
    ]

    print("\n📦 Initializing Storage Buckets for MVP...")
    
    for bucket_name, is_public in buckets:
        try:
            # Check if bucket exists
            try:
                # get_bucket() will raise an exception if not found
                supabase_admin.storage.get_bucket(bucket_name)
                print(f"   ✅ Bucket '{bucket_name}' already exists.")
            except Exception:
                # Create bucket if it doesn't exist
                print(f"   🛠️  Creating bucket '{bucket_name}' (public={is_public})...")
                supabase_admin.storage.create_bucket(bucket_name, options={
                    "public": is_public,
                })
                print(f"   ✅ Bucket '{bucket_name}' created successfully.")
        except Exception as e:
            print(f"   ❌ Failed to initialize bucket '{bucket_name}': {e}")

    print("\n✨ Storage initialization complete.")

if __name__ == "__main__":
    asyncio.run(initialize_storage())
