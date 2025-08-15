from fastapi import Request, HTTPException
import requests
from app.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

def get_current_user_id(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.split(" ")[1]

    res = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_SERVICE_KEY}
    )

    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return res.json()["id"]
