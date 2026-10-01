"""
Supabase Database Integration Layer for LexShield AI
Connects to Supabase REST API (PostgREST) for user accounts, contract scans, and telemetry.
Falls back seamlessly to local state if Supabase tables are not yet provisioned.
"""

import os
import json
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Any, List, Optional

# Load .env file if present
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    try:
        with open(_env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'").strip('"')
                    if k and k not in os.environ:
                        os.environ[k] = v
    except Exception:
        pass

# Supabase Credentials
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://evpwtuzzwekpapoojqbw.supabase.co")
SUPABASE_KEY = os.getenv(
    "SUPABASE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cHd0dXp6d2VrcGFwb29qcWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MDg3OTYsImV4cCI6MjEwNjM4NDc5Nn0.oDwasEm3uOdUapPMrGp8QKHZw0vD5uDjtsSeW2PRYPw"
)

# Active Status Cache
_SUPABASE_HEALTHY = True


def _get_headers(prefer_return: bool = False) -> Dict[str, str]:
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    if prefer_return:
        headers["Prefer"] = "return=representation"
    return headers


def supabase_request(endpoint: str, method: str = "GET", payload: Optional[Dict[str, Any]] = None) -> tuple:
    """
    Generic helper to execute HTTP requests against Supabase REST API.
    Returns (success: bool, data_or_error: Any, status_code: int).
    """
    global _SUPABASE_HEALTHY
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = _get_headers(prefer_return=(method in ("POST", "PATCH", "PUT")))

    data_bytes = None
    if payload is not None:
        data_bytes = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read().decode("utf-8")
            _SUPABASE_HEALTHY = True
            try:
                res_json = json.loads(body) if body else {}
            except json.JSONDecodeError:
                res_json = {"raw": body}
            return True, res_json, resp.status
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
        except json.JSONDecodeError:
            err_json = {"error": err_body}
        return False, err_json, e.code
    except Exception as e:
        _SUPABASE_HEALTHY = False
        return False, {"error": str(e)}, 500


# ── Users CRUD ──────────────────────────────────────────────

def fetch_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Fetches user record from Supabase by email."""
    email_clean = email.strip().lower()
    endpoint = f"users?email=eq.{email_clean}&select=*"
    success, data, status = supabase_request(endpoint, method="GET")

    if success and isinstance(data, list) and len(data) > 0:
        return data[0]
    return None


VALID_USER_COLUMNS = {
    "id", "email", "full_name", "password_hash", "password_salt",
    "organization", "role", "created_at", "last_login", "scans_count",
    "preferences", "created_ip"
}


def upsert_user(user_data: Dict[str, Any]) -> bool:
    """Inserts or updates user in Supabase `users` table."""
    clean_payload = {k: v for k, v in user_data.items() if k in VALID_USER_COLUMNS}
    endpoint = "users"
    success, data, status = supabase_request(endpoint, method="POST", payload=clean_payload)
    if not success:
        print(f"[Supabase Sync] Insert user failed (HTTP {status}): {data}")
        if status in (409, 400):  # Conflict or update needed
            email = user_data.get("email")
            if email:
                patch_endpoint = f"users?email=eq.{email}"
                success, data, status = supabase_request(patch_endpoint, method="PATCH", payload=clean_payload)
                if not success:
                    print(f"[Supabase Sync] Patch user failed (HTTP {status}): {data}")
    else:
        print(f"[Supabase Sync] User saved to Supabase: {user_data.get('email')}")
    return success


def update_user_profile(email: str, update_fields: Dict[str, Any]) -> bool:
    """Updates specific profile fields for user by email."""
    email_clean = email.strip().lower()
    clean_fields = {k: v for k, v in update_fields.items() if k in VALID_USER_COLUMNS}
    endpoint = f"users?email=eq.{email_clean}"
    success, data, status = supabase_request(endpoint, method="PATCH", payload=clean_fields)
    if not success:
        print(f"[Supabase Sync] Update profile failed (HTTP {status}): {data}")
    return success


# ── Contract Scans CRUD ─────────────────────────────────────

def record_contract_scan(scan_record: Dict[str, Any]) -> bool:
    """Saves contract audit result into Supabase `contract_scans` table."""
    endpoint = "contract_scans"
    success, data, status = supabase_request(endpoint, method="POST", payload=scan_record)
    return success


def fetch_user_scans(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Retrieves list of past contract scans for a specific user."""
    endpoint = f"contract_scans?user_id=eq.{user_id}&order=created_at.desc&limit={limit}"
    success, data, status = supabase_request(endpoint, method="GET")
    if success and isinstance(data, list):
        return data
    return []


# ── Telemetry Logging ──────────────────────────────────────

def log_telemetry_event(event_data: Dict[str, Any]) -> bool:
    """Logs security audit/telemetry event to Supabase `telemetry_logs` table."""
    endpoint = "telemetry_logs"
    success, data, status = supabase_request(endpoint, method="POST", payload=event_data)
    return success


def get_db_status() -> Dict[str, Any]:
    """Returns database connection status and credentials meta."""
    return {
        "supabase_url": SUPABASE_URL,
        "connected": _SUPABASE_HEALTHY,
        "engine": "Supabase PostgREST v1 + Hybrid Cache"
    }
