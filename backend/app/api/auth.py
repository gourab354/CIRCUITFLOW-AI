"""
Authentication API for CircuitFlow AI — Signup, Login, Demo Account, User Profile.
Stores hashed credentials locally in SQLite.
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
import secrets
from backend.app.db.database import (
    create_user, authenticate_user, get_user_by_id, get_user_by_email
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

# In-memory simple token mapping for local desktop session
_ACTIVE_SESSIONS: Dict[str, str] = {}  # token -> user_id

@router.post("/signup")
def signup(req: SignupRequest):
    name = req.name.strip()
    email = req.email.strip().lower()
    password = req.password

    if not name or len(name) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters long.")
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    try:
        user = create_user(name=name, email=email, password=password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    token = secrets.token_hex(24)
    _ACTIVE_SESSIONS[token] = user["id"]

    return {
        "status": "ok",
        "message": "Account created successfully.",
        "user": user,
        "token": token
    }

@router.post("/login")
def login(req: LoginRequest):
    email = req.email.strip().lower()
    password = req.password

    user = authenticate_user(email=email, password=password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = secrets.token_hex(24)
    _ACTIVE_SESSIONS[token] = user["id"]

    return {
        "status": "ok",
        "message": "Login successful.",
        "user": user,
        "token": token
    }

@router.post("/demo-login")
def demo_login():
    """Instant single-click demo login for engineers & trial users."""
    demo_email = "engineer@circuitflow.ai"
    user = get_user_by_email(demo_email)
    if not user:
        user = create_user(
            name="Hardware Engineer",
            email=demo_email,
            password="CircuitFlowDemo2026!"
        )

    token = secrets.token_hex(24)
    _ACTIVE_SESSIONS[token] = user["id"]

    return {
        "status": "ok",
        "message": "Logged in as Demo Engineer.",
        "user": user,
        "token": token
    }

@router.get("/me")
def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        return {"authenticated": False, "user": None}

    token = authorization.replace("Bearer ", "").strip()
    user_id = _ACTIVE_SESSIONS.get(token)
    if not user_id:
        return {"authenticated": False, "user": None}

    user = get_user_by_id(user_id)
    if not user:
        return {"authenticated": False, "user": None}

    return {"authenticated": True, "user": user}

@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        _ACTIVE_SESSIONS.pop(token, None)
    return {"status": "ok", "message": "Logged out successfully."}
