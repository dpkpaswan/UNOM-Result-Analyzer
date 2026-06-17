"""UNOM Result Analyzer — FastAPI Backend with Supabase."""

import csv
import io
import time
import asyncio
import json
from typing import Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, Query, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from supabase_client import get_service_client, get_anon_client, get_user_client
from auth import get_current_user, require_admin
from scraper import scrape_student

app = FastAPI(title="Unom Result Analyzer API")

# CORS — list all frontend origins
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://unom-result-analyzer-1.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory progress state
progress_state: Dict[str, Any] = {"done": 0, "total": 0, "current_name": "", "status": "idle"}


# ============================================================
# AUTH ENDPOINTS
# ============================================================

class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/auth/login")
async def login(body: LoginRequest):
    """Sign in with username + password. Maps username → username@unom.local."""
    email = f"{body.username}@unom.local"
    try:
        # Use anon client for user sign-in (not service key)
        anon = get_anon_client()
        result = anon.auth.sign_in_with_password({"email": email, "password": body.password})
        session = result.session
        user = result.user

        # Fetch profile using service client (bypasses RLS)
        svc = get_service_client()
        profile_resp = svc.table("profiles").select("*").eq("id", str(user.id)).single().execute()
        profile = profile_resp.data

        return {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "expires_in": session.expires_in,
            "user": {
                "id": str(user.id),
                "username": profile["username"],
                "role": profile["role"],
                "department": profile["department"],
            },
        }
    except Exception as e:
        print(f"[AUTH] Login failed for {body.username}: {e}")
        raise HTTPException(status_code=401, detail="Invalid username or password")



@app.post("/auth/refresh")
async def refresh_token(body: dict = Body(...)):
    """Refresh an expired access token using a refresh token."""
    refresh = body.get("refresh_token")
    if not refresh:
        raise HTTPException(status_code=400, detail="refresh_token required")

    try:
        client = get_service_client()
        result = client.auth.refresh_session(refresh)
        session = result.session
        return {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "expires_in": session.expires_in,
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@app.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    """Sign out the current user."""
    try:
        admin = get_service_client()
        admin.auth.admin.sign_out(user["access_token"])
    except Exception:
        pass  # Best-effort sign out
    return {"status": "logged_out"}


@app.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return current user's profile."""
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "department": user["department"],
    }


# ============================================================
# SCRAPE ENDPOINTS
# ============================================================

@app.post("/scrape")
async def scrape_results(
    file: UploadFile = File(...),
    exam_label: str = Form(...),
    user: dict = Depends(get_current_user),
):
    """Upload CSV and scrape results, saving to Supabase."""
    global progress_state

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    students_csv = []
    for row in reader:
        normalized = {k.strip().lower(): v.strip() for k, v in row.items()}
        regno = normalized.get("regno", "")
        dob = normalized.get("dob", "")
        name = normalized.get("name", "")
        if regno and dob:
            students_csv.append({"regno": regno, "dob": dob, "name": name})

    total = len(students_csv)
    progress_state = {"done": 0, "total": total, "current_name": "", "status": "running"}

    results = []
    for i, student in enumerate(students_csv):
        progress_state["current_name"] = student["name"] or student["regno"]
        progress_state["done"] = i

        result = scrape_student(student["regno"], student["dob"])
        if not result["name"] and student["name"]:
            result["name"] = student["name"]

        if result["overall"] == "ERROR":
            print(f"[BATCH] ERROR for {student['regno']} ({student['name']})")

        results.append(result)

        progress_state["done"] = i + 1

        # 2-second delay between students to avoid ASP session issues
        if i < total - 1:
            time.sleep(2)

    # Save to Supabase using service client (we set department from user profile)
    svc = get_service_client()

    # Create batch
    batch_data = {
        "label": exam_label,
        "department": user["department"],
        "created_by": user["id"],
        "total_students": len(results),
    }
    batch_resp = svc.table("batches").insert(batch_data).execute()
    batch_id = batch_resp.data[0]["id"]

    # Insert students and subjects
    for r in results:
        student_data = {
            "batch_id": batch_id,
            "regno": r["regno"],
            "name": r.get("name", ""),
            "dob": r.get("dob", ""),
            "overall": r["overall"],
        }
        student_resp = svc.table("students").insert(student_data).execute()
        student_id = student_resp.data[0]["id"]

        for sub in r.get("subjects", []):
            subject_data = {
                "student_id": student_id,
                "subject_code": sub["code"],
                "ue": str(sub["ue"]),
                "ia": str(sub["ia"]),
                "total": str(sub["total"]),
                "result": sub["result"],
                "remark": sub.get("remark", ""),
            }
            svc.table("subjects").insert(subject_data).execute()

    progress_state["status"] = "complete"

    return {"batch_id": batch_id, "results": results}


@app.get("/scrape/progress")
async def scrape_progress():
    """SSE endpoint for progress updates."""
    async def event_generator():
        last_done = -1
        while True:
            if progress_state["done"] != last_done or progress_state["status"] in ("complete", "idle"):
                last_done = progress_state["done"]
                data = json.dumps(progress_state)
                yield f"data: {data}\n\n"
                if progress_state["status"] == "complete":
                    break
            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


# ============================================================
# BATCH / RESULT ENDPOINTS
# ============================================================

def load_batch_results(svc, batch_id: str):
    """Load full results for a batch from Supabase."""
    students = svc.table("students").select("*").eq("batch_id", batch_id).order("id").execute()

    results = []
    for s in students.data:
        subs = svc.table("subjects").select("*").eq("student_id", s["id"]).order("id").execute()
        results.append({
            "regno": s["regno"],
            "name": s["name"],
            "dob": s["dob"],
            "overall": s["overall"],
            "subjects": [
                {
                    "code": sub["subject_code"],
                    "ue": int(sub["ue"]) if sub["ue"] else 0,
                    "ia": int(sub["ia"]) if sub["ia"] else 0,
                    "total": int(sub["total"]) if sub["total"] else 0,
                    "result": sub["result"],
                }
                for sub in subs.data
            ],
        })
    return results


@app.get("/batches")
async def list_batches(user: dict = Depends(get_current_user)):
    """List batches visible to the current user (RLS filters by department)."""
    client = get_user_client(user["access_token"])
    resp = client.table("batches").select("*").order("created_at", desc=True).execute()
    return resp.data


@app.get("/batches/{batch_id}")
async def get_batch(batch_id: str, user: dict = Depends(get_current_user)):
    """Get full results for a specific batch."""
    client = get_user_client(user["access_token"])

    batch_resp = client.table("batches").select("*").eq("id", batch_id).single().execute()
    if not batch_resp.data:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Use service client for loading results (RLS already verified via batch access)
    svc = get_service_client()
    results = load_batch_results(svc, batch_id)

    return {"batch": batch_resp.data, "results": results}


@app.delete("/batches/{batch_id}")
async def delete_batch(batch_id: str, user: dict = Depends(get_current_user)):
    """Delete a batch and all its data (cascade)."""
    svc = get_service_client()

    # Verify user can access this batch via department
    client = get_user_client(user["access_token"])
    batch_resp = client.table("batches").select("id").eq("id", batch_id).execute()
    if not batch_resp.data:
        raise HTTPException(status_code=404, detail="Batch not found or access denied")

    # Delete students' subjects first, then students, then batch
    students = svc.table("students").select("id").eq("batch_id", batch_id).execute()
    for s in students.data:
        svc.table("subjects").delete().eq("student_id", s["id"]).execute()
    svc.table("students").delete().eq("batch_id", batch_id).execute()
    svc.table("batches").delete().eq("id", batch_id).execute()

    return {"status": "deleted"}


@app.get("/compare")
async def compare_batches(
    batch1: str = Query(...),
    batch2: str = Query(...),
    user: dict = Depends(get_current_user),
):
    """Compare two batches — per-subject pass rates."""
    svc = get_service_client()

    # Verify access
    client = get_user_client(user["access_token"])
    b1 = client.table("batches").select("*").eq("id", batch1).single().execute()
    b2 = client.table("batches").select("*").eq("id", batch2).single().execute()

    if not b1.data or not b2.data:
        raise HTTPException(status_code=404, detail="One or both batches not found")

    def get_subject_stats(bid):
        students = svc.table("students").select("id").eq("batch_id", bid).execute()
        subject_map = {}
        for s in students.data:
            subs = svc.table("subjects").select("subject_code, result").eq("student_id", s["id"]).execute()
            for sub in subs.data:
                code = sub["subject_code"]
                if code not in subject_map:
                    subject_map[code] = {"total": 0, "passed": 0}
                subject_map[code]["total"] += 1
                if sub["result"] == "PASS":
                    subject_map[code]["passed"] += 1

        for code in subject_map:
            t = subject_map[code]["total"]
            p = subject_map[code]["passed"]
            subject_map[code]["pass_percent"] = round((p / t) * 100, 1) if t > 0 else 0

        return subject_map

    def get_overall_stats(bid):
        students = svc.table("students").select("overall").eq("batch_id", bid).execute()
        total = len(students.data)
        passed = sum(1 for s in students.data if s["overall"] == "PASS")
        return {
            "total": total,
            "passed": passed,
            "pass_percent": round((passed / total) * 100, 1) if total > 0 else 0,
        }

    return {
        "batch1": {
            "id": b1.data["id"], "label": b1.data["label"],
            "created_at": b1.data["created_at"],
            "subjects": get_subject_stats(batch1),
            "overall": get_overall_stats(batch1),
        },
        "batch2": {
            "id": b2.data["id"], "label": b2.data["label"],
            "created_at": b2.data["created_at"],
            "subjects": get_subject_stats(batch2),
            "overall": get_overall_stats(batch2),
        },
    }


@app.get("/results")
async def get_results(user: dict = Depends(get_current_user)):
    """Return results from the most recent batch."""
    client = get_user_client(user["access_token"])
    batch = client.table("batches").select("id").order("created_at", desc=True).limit(1).execute()

    if not batch.data:
        return []

    svc = get_service_client()
    return load_batch_results(svc, batch.data[0]["id"])


# ============================================================
# ADMIN ENDPOINTS
# ============================================================

class CreateUserRequest(BaseModel):
    username: str
    password: str
    department: str
    role: str = "teacher"


@app.post("/admin/users")
async def create_user(body: CreateUserRequest, admin: dict = Depends(require_admin)):
    """Create a new teacher account."""
    email = f"{body.username}@unom.local"
    svc = get_service_client()

    try:
        # Create auth user
        user_resp = svc.auth.admin.create_user({
            "email": email,
            "password": body.password,
            "email_confirm": True,
        })
        user_id = str(user_resp.user.id)

        # Create profile
        svc.table("profiles").insert({
            "id": user_id,
            "username": body.username,
            "role": body.role,
            "department": body.department,
        }).execute()

        return {"id": user_id, "username": body.username, "department": body.department, "role": body.role}

    except Exception as e:
        error_msg = str(e)
        if "already" in error_msg.lower() or "duplicate" in error_msg.lower():
            raise HTTPException(status_code=409, detail="Username already exists")
        raise HTTPException(status_code=500, detail=f"Failed to create user: {error_msg}")


@app.get("/admin/users")
async def list_users(admin: dict = Depends(require_admin)):
    """List all user profiles."""
    svc = get_service_client()
    resp = svc.table("profiles").select("*").order("username").execute()
    return resp.data


@app.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    """Delete a user (auth + profile). Admin cannot delete themselves."""
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    svc = get_service_client()

    try:
        svc.table("profiles").delete().eq("id", user_id).execute()
        svc.auth.admin.delete_user(user_id)
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")


class ResetPasswordRequest(BaseModel):
    password: str


@app.put("/admin/users/{user_id}/password")
async def reset_password(user_id: str, body: ResetPasswordRequest, admin: dict = Depends(require_admin)):
    """Reset a user's password."""
    svc = get_service_client()

    try:
        svc.auth.admin.update_user_by_id(user_id, {"password": body.password})
        return {"status": "password_updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset password: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
