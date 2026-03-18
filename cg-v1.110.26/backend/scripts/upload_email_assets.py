"""Upload email assets to Supabase email-assets bucket."""
import os
import sys

# Add parent dir so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from supabase import create_client

BUCKET = "email-assets"
ASSETS_DIR = os.path.join(os.path.dirname(__file__), "email-assets")


def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars")
        sys.exit(1)

    supabase = create_client(url, key)

    # Ensure bucket exists
    try:
        supabase.storage.get_bucket(BUCKET)
        print(f"Bucket '{BUCKET}' exists")
    except Exception:
        print(f"Creating bucket '{BUCKET}'...")
        supabase.storage.create_bucket(BUCKET, options={"public": True})
        print(f"Created bucket '{BUCKET}'")

    # Upload each file
    for filename in sorted(os.listdir(ASSETS_DIR)):
        filepath = os.path.join(ASSETS_DIR, filename)
        if not os.path.isfile(filepath):
            continue

        ext = filename.rsplit('.', 1)[-1].lower()
        content_type = {
            'svg': 'image/svg+xml',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
        }.get(ext, 'application/octet-stream')

        with open(filepath, 'rb') as f:
            data = f.read()

        try:
            # Remove existing file first (upsert)
            try:
                supabase.storage.from_(BUCKET).remove([filename])
            except Exception:
                pass

            supabase.storage.from_(BUCKET).upload(
                filename,
                data,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            public_url = f"{url}/storage/v1/object/public/{BUCKET}/{filename}"
            print(f"  Uploaded: {filename} -> {public_url}")
        except Exception as e:
            print(f"  Failed: {filename} -> {e}")

    print("\nAll assets uploaded. Base URL:")
    print(f"  {url}/storage/v1/object/public/{BUCKET}/")


if __name__ == "__main__":
    main()
