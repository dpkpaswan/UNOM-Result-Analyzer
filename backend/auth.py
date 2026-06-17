"""Authentication dependency for FastAPI — validates Supabase JWT tokens."""

from fastapi import Depends, HTTPException, Header
from typing import Optional
from supabase_client import get_service_client


async def get_current_user(authorization: str = Header(...)):
    """Extract and validate Bearer token, return user profile."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ", 1)[1]

    try:
        admin = get_service_client()
        user_response = admin.auth.get_user(token)
        user = user_response.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Fetch profile from profiles table (service key bypasses RLS)
    try:
        profile_resp = admin.table("profiles").select("*").eq("id", str(user.id)).single().execute()
        profile = profile_resp.data
    except Exception:
        raise HTTPException(status_code=403, detail="User profile not found. Contact admin.")

    if not profile:
        raise HTTPException(status_code=403, detail="User profile not found")

    return {
        "id": str(user.id),
        "email": user.email,
        "username": profile["username"],
        "role": profile["role"],
        "department": profile["department"],
        "access_token": token,
    }


async def require_admin(user: dict = Depends(get_current_user)):
    """Ensure the current user has admin role."""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
