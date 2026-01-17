"""
Supabase Storage Service - Cloud file storage for CommonGround.

This service handles:
- File uploads to Supabase Storage buckets
- Signed URL generation for private files
- File deletion
- Support for avatars, child photos, receipts, documents, and cubbie items

Bucket structure:
- avatars: Public user profile photos
- children: Private child profile photos
- cubbie: Private high-value item photos
- receipts: Private expense receipts
- documents: Private court documents and agreements
"""

import hashlib
from typing import Optional, Tuple
from supabase import Client

from app.core.supabase import get_supabase_admin_client
from app.core.config import settings


class StorageBucket:
    """Bucket names as constants."""
    AVATARS = "avatars"
    CHILDREN = "children"
    CUBBIE = "cubbie"
    RECEIPTS = "receipts"
    DOCUMENTS = "documents"
    KIDCOMS = "kidcoms"  # Public bucket for Watch Together videos and books


class SupabaseStorageService:
    """
    Service for managing file uploads to Supabase Storage.

    Uses the admin client (service role) to bypass RLS policies.
    Access control is enforced at the application layer.
    """

    def __init__(self, client: Optional[Client] = None):
        """
        Initialize storage service.

        Args:
            client: Optional Supabase client. If not provided, uses admin client.
        """
        self._client = client

    @property
    def client(self) -> Client:
        """Lazy-load the Supabase client."""
        if self._client is None:
            self._client = get_supabase_admin_client()
        return self._client

    def _get_storage_url(self, bucket: str, path: str) -> str:
        """
        Get the public URL for a file in a bucket.

        Args:
            bucket: Bucket name
            path: File path within the bucket

        Returns:
            Full public URL
        """
        return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"

    async def upload_file(
        self,
        bucket: str,
        path: str,
        file_content: bytes,
        content_type: str,
        upsert: bool = True
    ) -> str:
        """
        Upload a file to Supabase Storage.

        Args:
            bucket: Target bucket name (use StorageBucket constants)
            path: Full path within bucket (e.g., "family_id/child_id/photo.jpg")
            file_content: Raw file bytes
            content_type: MIME type (e.g., "image/jpeg")
            upsert: Whether to overwrite existing files (default True)

        Returns:
            Public URL of the uploaded file

        Raises:
            Exception: If upload fails
        """
        response = self.client.storage.from_(bucket).upload(
            path=path,
            file=file_content,
            file_options={
                "content-type": content_type,
                "upsert": str(upsert).lower()
            }
        )

        # Return the public URL for public buckets (avatars, kidcoms)
        # For private buckets, return a signed URL that lasts 1 year
        if bucket in (StorageBucket.AVATARS, StorageBucket.KIDCOMS):
            return self._get_storage_url(bucket, path)
        else:
            # For private buckets, return a long-lived signed URL (1 year)
            # This is stored in the database and used directly in the frontend
            signed = self.client.storage.from_(bucket).create_signed_url(
                path=path,
                expires_in=31536000  # 1 year in seconds
            )
            return signed.get("signedURL", f"{bucket}/{path}")

    async def upload_file_with_hash(
        self,
        bucket: str,
        path: str,
        file_content: bytes,
        content_type: str,
        upsert: bool = True
    ) -> Tuple[str, str]:
        """
        Upload a file and return both URL and SHA-256 hash.

        Used for court documents that need integrity verification.

        Args:
            bucket: Target bucket name
            path: Full path within bucket
            file_content: Raw file bytes
            content_type: MIME type
            upsert: Whether to overwrite existing files

        Returns:
            Tuple of (file_url, sha256_hash)
        """
        # Calculate hash before upload
        file_hash = hashlib.sha256(file_content).hexdigest()

        # Upload file
        url = await self.upload_file(bucket, path, file_content, content_type, upsert)

        return url, file_hash

    async def delete_file(self, bucket: str, path: str) -> bool:
        """
        Delete a file from Supabase Storage.

        Args:
            bucket: Bucket name
            path: File path within the bucket

        Returns:
            True if deleted successfully
        """
        try:
            self.client.storage.from_(bucket).remove([path])
            return True
        except Exception:
            return False

    async def delete_files(self, bucket: str, paths: list[str]) -> bool:
        """
        Delete multiple files from Supabase Storage.

        Args:
            bucket: Bucket name
            paths: List of file paths within the bucket

        Returns:
            True if all deleted successfully
        """
        try:
            self.client.storage.from_(bucket).remove(paths)
            return True
        except Exception:
            return False

    async def get_signed_url(
        self,
        bucket: str,
        path: str,
        expires_in: int = 3600
    ) -> str:
        """
        Get a time-limited signed URL for a private file.

        Args:
            bucket: Bucket name
            path: File path within the bucket
            expires_in: URL expiration time in seconds (default 1 hour)

        Returns:
            Signed URL that expires after the specified time
        """
        response = self.client.storage.from_(bucket).create_signed_url(
            path=path,
            expires_in=expires_in
        )
        return response.get("signedURL", "")

    async def get_signed_urls(
        self,
        bucket: str,
        paths: list[str],
        expires_in: int = 3600
    ) -> list[dict]:
        """
        Get signed URLs for multiple files.

        Args:
            bucket: Bucket name
            paths: List of file paths
            expires_in: URL expiration time in seconds

        Returns:
            List of dicts with 'path' and 'signedURL' keys
        """
        response = self.client.storage.from_(bucket).create_signed_urls(
            paths=paths,
            expires_in=expires_in
        )
        return response

    async def list_files(
        self,
        bucket: str,
        folder: str = "",
        limit: int = 100,
        offset: int = 0
    ) -> list[dict]:
        """
        List files in a bucket folder.

        Args:
            bucket: Bucket name
            folder: Folder path (empty for root)
            limit: Max files to return
            offset: Pagination offset

        Returns:
            List of file metadata dicts
        """
        response = self.client.storage.from_(bucket).list(
            path=folder,
            options={
                "limit": limit,
                "offset": offset
            }
        )
        return response

    async def move_file(
        self,
        bucket: str,
        from_path: str,
        to_path: str
    ) -> bool:
        """
        Move a file within a bucket.

        Args:
            bucket: Bucket name
            from_path: Current file path
            to_path: New file path

        Returns:
            True if moved successfully
        """
        try:
            self.client.storage.from_(bucket).move(from_path, to_path)
            return True
        except Exception:
            return False

    async def copy_file(
        self,
        bucket: str,
        from_path: str,
        to_path: str
    ) -> bool:
        """
        Copy a file within a bucket.

        Args:
            bucket: Bucket name
            from_path: Source file path
            to_path: Destination file path

        Returns:
            True if copied successfully
        """
        try:
            self.client.storage.from_(bucket).copy(from_path, to_path)
            return True
        except Exception:
            return False


# Helper functions for common upload patterns

def build_avatar_path(user_id: str, filename: str) -> str:
    """Build storage path for user avatar."""
    return f"{user_id}/{filename}"


def build_child_photo_path(family_file_id: str, child_id: str, filename: str) -> str:
    """Build storage path for child profile photo."""
    return f"{family_file_id}/{child_id}/{filename}"


def build_cubbie_path(family_file_id: str, item_id: str, filename: str) -> str:
    """Build storage path for cubbie item photo."""
    return f"{family_file_id}/{item_id}/{filename}"


def build_receipt_path(family_file_id: str, obligation_id: str, filename: str) -> str:
    """Build storage path for expense receipt."""
    return f"{family_file_id}/{obligation_id}/{filename}"


def build_document_path(family_file_id: str, doc_type: str, filename: str) -> str:
    """
    Build storage path for court documents.

    Args:
        family_file_id: Family file ID
        doc_type: Document type (e.g., "agreements", "evidence", "court_orders")
        filename: File name
    """
    return f"{family_file_id}/{doc_type}/{filename}"


# Global instance for convenience
storage_service = SupabaseStorageService()
