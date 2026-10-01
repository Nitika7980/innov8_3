"""
Admin Module for LexShield AI
Provides administrative endpoints, telemetry tracking, real-time audit logging,
trap rule configurator, payment policy settings, and preset management.
"""

import time
import secrets
import re
from typing import Dict, Any, List, Optional
from collections import defaultdict
import os

from analyzer import TRAP_RULES
from sample_contracts import SAMPLE_CONTRACTS

# Admin Credentials (Configurable via Environment Variables)
ADMIN_USER = os.getenv("LEXSHIELD_ADMIN_USER", "admin")
ADMIN_PASS = os.getenv("LEXSHIELD_ADMIN_PASS", "lexshield-admin-2026")

# Session Store: token -> {"user": str, "created_at": float}
SESSIONS: Dict[str, Dict[str, Any]] = {}
SESSION_EXPIRY_SECONDS = 24 * 3600  # 24 Hours

# Brute-force protection for admin login: ip -> [timestamps]
LOGIN_ATTEMPTS: Dict[str, List[float]] = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 5
LOGIN_ATTEMPT_WINDOW = 300  # 5 minutes

# In-memory Circular Audit Log Buffer (stores last 500 entries)
AUDIT_LOGS: List[Dict[str, Any]] = []
MAX_AUDIT_LOG_SIZE = 500

# Telemetry and Analytics Store
SCAN_METRICS: Dict[str, Any] = {
    "total_scans": 0,
    "grades": {
        "SAFE": 0,
        "CAUTION": 0,
        "CRITICAL TRAP": 0
    },
    "categories": defaultdict(int),
    "traps": defaultdict(int),
    "scores": [],
    "start_time": time.time(),
    "owasp_blocks": 0
}

# Configurable Payment & Reminder Policy Defaults
POLICY_SETTINGS: Dict[str, Any] = {
    "monthly_rate_pct": 1.5,
    "reminder_days": 2,
    "grace_period_days": 0,
    "flat_surcharge": 0.0,
    "currency": "$",
    "require_courtesy_notice": True
}


def authenticate_admin(username: str, password: str, client_ip: str = "unknown") -> Dict[str, Any]:
    """Authenticates admin user with brute force rate limiting."""
    now = time.time()
    # Clean old attempts
    LOGIN_ATTEMPTS[client_ip] = [t for t in LOGIN_ATTEMPTS[client_ip] if now - t < LOGIN_ATTEMPT_WINDOW]
    
    if len(LOGIN_ATTEMPTS[client_ip]) >= MAX_LOGIN_ATTEMPTS:
        return {
            "success": False,
            "error": "Too many failed login attempts. Account locked for 5 minutes.",
            "status_code": 429
        }
        
    if username == ADMIN_USER and password == ADMIN_PASS:
        # Clear failed attempts on success
        LOGIN_ATTEMPTS.pop(client_ip, None)
        token = secrets.token_hex(32)
        SESSIONS[token] = {
            "user": username,
            "created_at": now,
            "ip": client_ip
        }
        record_audit_event(
            client_ip=client_ip,
            method="POST",
            endpoint="/api/admin/login",
            status_code=200,
            duration_sec=0.01,
            event_type="admin_auth",
            details="Admin successfully logged in"
        )
        return {
            "success": True,
            "token": token,
            "username": username,
            "expires_in": SESSION_EXPIRY_SECONDS
        }
    else:
        LOGIN_ATTEMPTS[client_ip].append(now)
        record_audit_event(
            client_ip=client_ip,
            method="POST",
            endpoint="/api/admin/login",
            status_code=401,
            duration_sec=0.01,
            event_type="admin_auth_failed",
            details=f"Invalid credentials for user '{username}'"
        )
        return {
            "success": False,
            "error": "Invalid administrative username or password.",
            "status_code": 401
        }


def verify_admin_token(token: Optional[str]) -> bool:
    """Validates an admin bearer token."""
    if not token:
        return False
    # Strip 'Bearer ' if present
    if token.startswith("Bearer "):
        token = token[7:].strip()
    session = SESSIONS.get(token)
    if not session:
        return False
    if time.time() - session["created_at"] > SESSION_EXPIRY_SECONDS:
        SESSIONS.pop(token, None)
        return False
    return True


def record_audit_event(
    client_ip: str,
    method: str,
    endpoint: str,
    status_code: int,
    duration_sec: float,
    event_type: str = "http",
    details: str = ""
):
    """Appends an event to the circular audit log buffer."""
    event = {
        "id": len(AUDIT_LOGS) + 1,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
        "time_epoch": time.time(),
        "client_ip": client_ip,
        "method": method,
        "endpoint": endpoint,
        "status_code": status_code,
        "duration_ms": round(duration_sec * 1000, 2),
        "event_type": event_type,
        "details": details
    }
    AUDIT_LOGS.insert(0, event)
    if len(AUDIT_LOGS) > MAX_AUDIT_LOG_SIZE:
        AUDIT_LOGS.pop()


def record_scan_metrics(score: int, grade: str, detected_risks: List[Dict[str, Any]]):
    """Tracks contract audit telemetry for the admin dashboard."""
    SCAN_METRICS["total_scans"] += 1
    
    # Track Grade
    if "SAFE" in grade:
        SCAN_METRICS["grades"]["SAFE"] += 1
    elif "CAUTION" in grade:
        SCAN_METRICS["grades"]["CAUTION"] += 1
    else:
        SCAN_METRICS["grades"]["CRITICAL TRAP"] += 1
        
    # Track Score history
    SCAN_METRICS["scores"].append(score)
    if len(SCAN_METRICS["scores"]) > 1000:
        SCAN_METRICS["scores"] = SCAN_METRICS["scores"][-500:]
        
    # Track Categories and Traps
    for r in detected_risks:
        cat = r.get("category", "General")
        SCAN_METRICS["categories"][cat] += 1
        rule_id = r.get("rule_id", "unknown")
        SCAN_METRICS["traps"][rule_id] += 1


def get_dashboard_metrics() -> Dict[str, Any]:
    """Generates aggregate telemetry for the admin dashboard."""
    scores = SCAN_METRICS["scores"]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    uptime_sec = int(time.time() - SCAN_METRICS["start_time"])
    
    # Sort top traps
    sorted_traps = sorted(SCAN_METRICS["traps"].items(), key=lambda x: x[1], reverse=True)[:5]
    top_traps = [{"rule_id": k, "count": v} for k, v in sorted_traps]
    
    # Sort category breakdown
    category_breakdown = dict(SCAN_METRICS["categories"])
    
    return {
        "total_scans": SCAN_METRICS["total_scans"],
        "average_score": avg_score,
        "grades": SCAN_METRICS["grades"],
        "category_breakdown": category_breakdown,
        "top_traps": top_traps,
        "active_rules_count": len([r for r in TRAP_RULES if r.get("enabled", True)]),
        "total_rules_count": len(TRAP_RULES),
        "uptime_seconds": uptime_sec,
        "owasp_blocks": SCAN_METRICS["owasp_blocks"],
        "policy_settings": POLICY_SETTINGS
    }


def get_audit_logs(
    limit: int = 100,
    status_filter: Optional[str] = None,
    event_filter: Optional[str] = None,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieves filtered audit logs."""
    logs = list(AUDIT_LOGS)
    
    if status_filter and status_filter != "all":
        if status_filter == "error":
            logs = [l for l in logs if l["status_code"] >= 400]
        elif status_filter == "success":
            logs = [l for l in logs if l["status_code"] < 400]
            
    if event_filter and event_filter != "all":
        logs = [l for l in logs if l["event_type"] == event_filter]
        
    if search:
        search_lower = search.lower()
        logs = [
            l for l in logs
            if search_lower in l["endpoint"].lower()
            or search_lower in l["client_ip"].lower()
            or search_lower in l.get("details", "").lower()
        ]
        
    return logs[:limit]


def clear_audit_logs():
    """Clears the in-memory audit logs."""
    AUDIT_LOGS.clear()


# ---- Trap Rules Management ----

def get_all_rules() -> List[Dict[str, Any]]:
    """Returns list of all detection rules with enabled status and pattern count."""
    rules_out = []
    for r in TRAP_RULES:
        rules_out.append({
            "id": r["id"],
            "category": r["category"],
            "title": r["title"],
            "severity": r["severity"],
            "weight": r["weight"],
            "patterns": r["patterns"],
            "pattern_count": len(r["patterns"]),
            "enabled": r.get("enabled", True),
            "plain_translation": r["plain_translation"],
            "why_risky": r["why_risky"],
            "solution_clause": r["solution_clause"],
            "negotiation_tip": r.get("negotiation_tip", "")
        })
    return rules_out


def toggle_rule(rule_id: str, enabled: bool) -> bool:
    """Enables or disables a specific trap rule."""
    for r in TRAP_RULES:
        if r["id"] == rule_id:
            r["enabled"] = bool(enabled)
            return True
    return False


def add_rule(rule_data: Dict[str, Any]) -> Dict[str, Any]:
    """Adds a new custom detection rule to the live analyzer engine."""
    rule_id = rule_data.get("id", "").strip().lower().replace(" ", "_")
    if not rule_id:
        rule_id = f"custom_rule_{int(time.time())}"
        
    # Check if rule_id already exists
    if any(r["id"] == rule_id for r in TRAP_RULES):
        raise ValueError(f"Rule ID '{rule_id}' already exists.")
        
    patterns = rule_data.get("patterns", [])
    if isinstance(patterns, str):
        patterns = [p.strip() for p in patterns.split("\n") if p.strip()]
        
    new_rule = {
        "id": rule_id,
        "category": rule_data.get("category", "Custom Category"),
        "title": rule_data.get("title", "Custom Trap Rule"),
        "severity": rule_data.get("severity", "HIGH"),
        "weight": int(rule_data.get("weight", 15)),
        "patterns": patterns,
        "enabled": True,
        "plain_translation": rule_data.get("plain_translation", "Custom rule triggered."),
        "why_risky": rule_data.get("why_risky", "Presents legal or financial exposure for freelancers."),
        "solution_clause": rule_data.get("solution_clause", "\"Safe alternative clause proposed here.\""),
        "negotiation_tip": rule_data.get("negotiation_tip", "Negotiate balanced terms.")
    }
    TRAP_RULES.append(new_rule)
    return new_rule


def delete_rule(rule_id: str) -> bool:
    """Removes a custom detection rule."""
    global TRAP_RULES
    initial_len = len(TRAP_RULES)
    TRAP_RULES[:] = [r for r in TRAP_RULES if r["id"] != rule_id]
    return len(TRAP_RULES) < initial_len


def test_rule_patterns(patterns: List[str], sample_text: str) -> Dict[str, Any]:
    """Tests a list of regex patterns against sample clause text."""
    matches = []
    errors = []
    
    for pat in patterns:
        try:
            compiled = re.compile(pat, re.IGNORECASE)
            for m in compiled.finditer(sample_text):
                start = max(0, m.start() - 60)
                end = min(len(sample_text), m.end() + 60)
                snippet = sample_text[start:end].replace("\n", " ").strip()
                matches.append({
                    "pattern": pat,
                    "matched_text": m.group(0),
                    "context": snippet
                })
        except Exception as e:
            errors.append({"pattern": pat, "error": str(e)})
            
    return {
        "matched": len(matches) > 0,
        "match_count": len(matches),
        "matches": matches,
        "errors": errors
    }


# ---- Payment & Reminder Policy Settings ----

def get_policy_settings() -> Dict[str, Any]:
    return dict(POLICY_SETTINGS)


def update_policy_settings(settings: Dict[str, Any]) -> Dict[str, Any]:
    if "monthly_rate_pct" in settings:
        POLICY_SETTINGS["monthly_rate_pct"] = max(0.0, float(settings["monthly_rate_pct"]))
    if "reminder_days" in settings:
        POLICY_SETTINGS["reminder_days"] = max(1, int(settings["reminder_days"]))
    if "grace_period_days" in settings:
        POLICY_SETTINGS["grace_period_days"] = max(0, int(settings["grace_period_days"]))
    if "flat_surcharge" in settings:
        POLICY_SETTINGS["flat_surcharge"] = max(0.0, float(settings["flat_surcharge"]))
    if "currency" in settings:
        POLICY_SETTINGS["currency"] = str(settings["currency"])[:5]
    if "require_courtesy_notice" in settings:
        POLICY_SETTINGS["require_courtesy_notice"] = bool(settings["require_courtesy_notice"])
    return dict(POLICY_SETTINGS)


# ---- Presets Management ----

def get_all_presets() -> List[Dict[str, Any]]:
    return [
        {
            "id": k,
            "title": v.get("title", ""),
            "role": v.get("role", ""),
            "client": v.get("client", ""),
            "description": v.get("description", ""),
            "text_length": len(v.get("text", ""))
        }
        for k, v in SAMPLE_CONTRACTS.items()
    ]


def save_preset(preset_id: str, preset_data: Dict[str, Any]) -> Dict[str, Any]:
    SAMPLE_CONTRACTS[preset_id] = {
        "title": preset_data.get("title", "Sample Contract"),
        "role": preset_data.get("role", "Freelancer"),
        "client": preset_data.get("client", "Client Corp"),
        "description": preset_data.get("description", ""),
        "text": preset_data.get("text", "")
    }
    return SAMPLE_CONTRACTS[preset_id]


def delete_preset(preset_id: str) -> bool:
    if preset_id in SAMPLE_CONTRACTS:
        del SAMPLE_CONTRACTS[preset_id]
        return True
    return False
