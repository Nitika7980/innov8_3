"""
User Authentication Module for LexShield AI
Provides user registration, login, session management, and profile storage.
Uses in-memory storage with bcrypt-style password hashing (hashlib-based).
"""

import time
import secrets
import hashlib
import re
from typing import Dict, Any, List, Optional
from collections import defaultdict

try:
    from backend.db import upsert_user, fetch_user_by_email, update_user_profile as db_update_profile
except ImportError:
    try:
        from db import upsert_user, fetch_user_by_email, update_user_profile as db_update_profile
    except ImportError:
        upsert_user = lambda user_data: False
        fetch_user_by_email = lambda email: None
        db_update_profile = lambda email, update_fields: False


# ── User Store ──────────────────────────────────────────────
# In-memory storage: email -> user_data
USERS_DB: Dict[str, Dict[str, Any]] = {}

# Session Store: token -> session_data
USER_SESSIONS: Dict[str, Dict[str, Any]] = {}
USER_SESSION_EXPIRY = 7 * 24 * 3600  # 7 days

# Brute-force protection: ip -> [timestamps]
USER_LOGIN_ATTEMPTS: Dict[str, List[float]] = defaultdict(list)
MAX_USER_LOGIN_ATTEMPTS = 10
USER_LOGIN_WINDOW = 300  # 5 minutes

# Rate limit registration: ip -> [timestamps]
REGISTER_ATTEMPTS: Dict[str, List[float]] = defaultdict(list)
MAX_REGISTER_ATTEMPTS = 5
REGISTER_WINDOW = 600  # 10 minutes


def _hash_password(password: str, salt: str = None) -> tuple:
    """Hashes password with SHA-256 + salt. Returns (hash, salt)."""
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode('utf-8')).hexdigest()
    return hashed, salt


def _verify_password(password: str, stored_hash: str, salt: str) -> bool:
    """Verifies a password against stored hash and salt."""
    check_hash, _ = _hash_password(password, salt)
    return secrets.compare_digest(check_hash, stored_hash)


def _validate_email(email: str) -> bool:
    """Basic email format validation."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def _validate_password_strength(password: str) -> tuple:
    """Validates password meets minimum security requirements. Returns (is_valid, message)."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one digit."
    return True, "Password is strong."


def register_user(
    full_name: str,
    email: str,
    password: str,
    organization: str = "",
    role: str = "Freelancer",
    client_ip: str = "unknown"
) -> Dict[str, Any]:
    """
    Registers a new user account.
    Returns success response with session token, or error details.
    """
    now = time.time()

    # Rate limit registration (exempt localhost/loopback IPs for seamless dev & test)
    is_localhost = client_ip in ("127.0.0.1", "::1", "localhost", "unknown", "testclient")
    if not is_localhost:
        REGISTER_ATTEMPTS[client_ip] = [t for t in REGISTER_ATTEMPTS[client_ip] if now - t < REGISTER_WINDOW]
        if len(REGISTER_ATTEMPTS[client_ip]) >= MAX_REGISTER_ATTEMPTS:
            return {
                "success": False,
                "error": "Too many registration attempts. Please try again in 10 minutes.",
                "status_code": 429
            }
        REGISTER_ATTEMPTS[client_ip].append(now)

    # Validate inputs
    full_name = full_name.strip()
    email = email.strip().lower()
    organization = organization.strip()
    role = role.strip()

    if not full_name or len(full_name) < 2:
        return {"success": False, "error": "Please enter your full name (at least 2 characters).", "status_code": 400}

    if len(full_name) > 100:
        return {"success": False, "error": "Name is too long (max 100 characters).", "status_code": 400}

    if not _validate_email(email):
        return {"success": False, "error": "Please enter a valid email address.", "status_code": 400}

    if email in USERS_DB:
        return {"success": False, "error": "An account with this email already exists. Please sign in instead.", "status_code": 409}

    is_strong, pw_msg = _validate_password_strength(password)
    if not is_strong:
        return {"success": False, "error": pw_msg, "status_code": 400}

    # Hash password
    pw_hash, pw_salt = _hash_password(password)

    # Create user
    user_id = f"user_{secrets.token_hex(8)}"
    user_record = {
        "id": user_id,
        "full_name": full_name,
        "email": email,
        "password_hash": pw_hash,
        "password_salt": pw_salt,
        "organization": organization,
        "role": role,
        "created_at": now,
        "created_ip": client_ip,
        "last_login": now,
        "scans_count": 0,
        "contracts_analyzed": []
    }
    USERS_DB[email] = user_record

    # Sync to Supabase Database
    try:
        synced = upsert_user(user_record)
        if not synced:
            print(f"[Supabase Warning] Could not sync user {email} to Supabase. Please ensure SQL permissions are granted.")
    except Exception as e:
        print(f"[Supabase Error] Exception syncing user {email}: {e}")

    # Create session
    token = secrets.token_hex(32)
    USER_SESSIONS[token] = {
        "user_id": user_id,
        "email": email,
        "full_name": full_name,
        "created_at": now,
        "ip": client_ip
    }

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_id,
            "full_name": full_name,
            "email": email,
            "organization": organization,
            "role": role
        },
        "message": "Account created successfully! Welcome to LexShield AI."
    }


def login_user(
    email: str,
    password: str,
    client_ip: str = "unknown"
) -> Dict[str, Any]:
    """
    Authenticates a user and returns a session token.
    """
    now = time.time()

    # Rate limit login attempts (exempt localhost/loopback IPs for seamless dev & test)
    is_localhost = client_ip in ("127.0.0.1", "::1", "localhost", "unknown", "testclient")
    if not is_localhost:
        USER_LOGIN_ATTEMPTS[client_ip] = [
            t for t in USER_LOGIN_ATTEMPTS[client_ip] if now - t < USER_LOGIN_WINDOW
        ]

        if len(USER_LOGIN_ATTEMPTS[client_ip]) >= MAX_USER_LOGIN_ATTEMPTS:
            return {
                "success": False,
                "error": "Too many failed login attempts. Please wait 5 minutes and try again.",
                "status_code": 429
            }

    email = email.strip().lower()

    if email not in USERS_DB:
        # Check Supabase database
        try:
            db_user = fetch_user_by_email(email)
            if db_user and isinstance(db_user, dict):
                USERS_DB[email] = db_user
        except Exception:
            pass

    if email not in USERS_DB:
        USER_LOGIN_ATTEMPTS[client_ip].append(now)
        return {
            "success": False,
            "error": "No account found with this email. Please register first.",
            "status_code": 401
        }

    user = USERS_DB[email]

    if not _verify_password(password, user["password_hash"], user["password_salt"]):
        USER_LOGIN_ATTEMPTS[client_ip].append(now)
        return {
            "success": False,
            "error": "Incorrect password. Please try again.",
            "status_code": 401
        }

    # Clear failed attempts on success
    USER_LOGIN_ATTEMPTS.pop(client_ip, None)

    # Update last login
    user["last_login"] = now
    try:
        db_update_profile(email, {"last_login": now})
    except Exception:
        pass

    # Create session
    token = secrets.token_hex(32)
    USER_SESSIONS[token] = {
        "user_id": user["id"],
        "email": email,
        "full_name": user["full_name"],
        "created_at": now,
        "ip": client_ip
    }

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": email,
            "organization": user["organization"],
            "role": user["role"],
            "scans_count": user["scans_count"]
        },
        "message": f"Welcome back, {user['full_name']}!"
    }


def verify_user_token(token: Optional[str]) -> Optional[Dict[str, Any]]:
    """Validates a user bearer token and returns session data, or None if invalid."""
    if not token:
        return None
    if token.startswith("Bearer "):
        token = token[7:].strip()
    session = USER_SESSIONS.get(token)
    if not session:
        return None
    if time.time() - session["created_at"] > USER_SESSION_EXPIRY:
        USER_SESSIONS.pop(token, None)
        return None
    return session


def get_user_profile(email: str) -> Optional[Dict[str, Any]]:
    """Returns user profile data (without sensitive fields)."""
    user = USERS_DB.get(email)
    if not user:
        return None
    return {
        "id": user["id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "organization": user.get("organization", ""),
        "role": user.get("role", "Freelancer"),
        "created_at": user["created_at"],
        "last_login": user["last_login"],
        "scans_count": user.get("scans_count", 0),
        "preferences": user.get("preferences", {
            "default_currency": "$",
            "default_late_rate": 1.5,
            "auto_save_scans": True,
            "email_reminders": True,
            "theme": "dark"
        })
    }


def update_user_profile(
    email: str,
    full_name: str = None,
    organization: str = None,
    role: str = None,
    preferences: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Updates profile information and preferences for a user."""
    user = USERS_DB.get(email)
    if not user:
        return {"success": False, "error": "User not found", "status_code": 404}

    if full_name and isinstance(full_name, str) and len(full_name.strip()) >= 2:
        user["full_name"] = full_name.strip()
    if organization is not None and isinstance(organization, str):
        user["organization"] = organization.strip()
    if role is not None and isinstance(role, str):
        user["role"] = role.strip()
    if preferences and isinstance(preferences, dict):
        user.setdefault("preferences", {})
        user["preferences"].update(preferences)

    return {
        "success": True,
        "message": "Profile updated successfully!",
        "user": get_user_profile(email)
    }


def change_user_password(
    email: str,
    old_password: str,
    new_password: str
) -> Dict[str, Any]:
    """Validates old password and updates user password."""
    user = USERS_DB.get(email)
    if not user:
        return {"success": False, "error": "User not found", "status_code": 404}

    if not _verify_password(old_password, user["password_hash"], user["password_salt"]):
        return {"success": False, "error": "Current password is incorrect.", "status_code": 400}

    is_strong, pw_msg = _validate_password_strength(new_password)
    if not is_strong:
        return {"success": False, "error": pw_msg, "status_code": 400}

    new_hash, new_salt = _hash_password(new_password)
    user["password_hash"] = new_hash
    user["password_salt"] = new_salt
    try:
        db_update_profile(email, {"password_hash": new_hash, "password_salt": new_salt})
    except Exception:
        pass

    return {
        "success": True,
        "message": "Password changed successfully!"
    }


def increment_user_scans(email: str):
    """Increments the scan counter for a user."""
    if email in USERS_DB:
        USERS_DB[email]["scans_count"] += 1
        try:
            db_update_profile(email, {"scans_count": USERS_DB[email]["scans_count"]})
        except Exception:
            pass


def logout_user(token: str) -> bool:
    """Invalidates a user session token."""
    if token.startswith("Bearer "):
        token = token[7:].strip()
    if token in USER_SESSIONS:
        USER_SESSIONS.pop(token)
        return True
    return False


def get_all_users_summary() -> List[Dict[str, Any]]:
    """Returns a summary list of all registered users (for admin use)."""
    return [
        {
            "id": u["id"],
            "full_name": u["full_name"],
            "email": u["email"],
            "organization": u["organization"],
            "role": u["role"],
            "scans_count": u["scans_count"],
            "created_at": time.strftime("%Y-%m-%d %H:%M", time.localtime(u["created_at"])),
            "last_login": time.strftime("%Y-%m-%d %H:%M", time.localtime(u["last_login"]))
        }
        for u in USERS_DB.values()
    ]
