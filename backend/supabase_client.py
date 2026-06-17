"""Supabase client factory — user-scoped and service-scoped clients."""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Cache clients to avoid re-creating on every request
_service_client = None
_anon_client = None


def get_service_client() -> Client:
    """Get a Supabase client with service_role key (bypasses RLS)."""
    global _service_client
    if _service_client is None:
        _service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _service_client


def get_anon_client() -> Client:
    """Get a Supabase client with anon key (for auth operations like sign-in)."""
    global _anon_client
    if _anon_client is None:
        _anon_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return _anon_client


def get_user_client(access_token: str) -> Client:
    """Get a Supabase client scoped to a user's JWT for RLS enforcement."""
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    # Set the user's JWT so PostgREST applies RLS as this user
    client.postgrest.auth(access_token)
    return client
