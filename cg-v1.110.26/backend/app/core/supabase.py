"""
Supabase client configuration.
"""

from supabase import create_client, Client
from app.core.config import settings


def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance.

    Returns:
        Client: Configured Supabase client
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY
    )


def get_supabase_admin_client() -> Client:
    """
    Create and return a Supabase admin client with service role key.

    Use this for admin operations that bypass RLS policies.

    Returns:
        Client: Configured Supabase admin client
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY
    )


# Global client instance (use sparingly, prefer get_supabase_client() for dependency injection)
supabase: Client = get_supabase_client()
supabase_admin: Client = get_supabase_admin_client()
