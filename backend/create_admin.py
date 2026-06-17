"""One-time script to create the first admin user in Supabase."""

from supabase_client import get_service_client

USERNAME = "admin"
PASSWORD = "admin123"
DEPARTMENT = "Computer Science"

email = f"{USERNAME}@unom.local"
svc = get_service_client()

try:
    # Create auth user
    user_resp = svc.auth.admin.create_user({
        "email": email,
        "password": PASSWORD,
        "email_confirm": True,
    })
    user_id = str(user_resp.user.id)

    # Create profile
    svc.table("profiles").insert({
        "id": user_id,
        "username": USERNAME,
        "role": "admin",
        "department": DEPARTMENT,
    }).execute()

    print(f"Admin user created successfully!")
    print(f"  Username: {USERNAME}")
    print(f"  Password: {PASSWORD}")
    print(f"  Department: {DEPARTMENT}")

except Exception as e:
    error_msg = str(e)
    if "already" in error_msg.lower() or "duplicate" in error_msg.lower():
        print(f"User '{USERNAME}' already exists — try logging in.")
    else:
        print(f"Error: {error_msg}")
