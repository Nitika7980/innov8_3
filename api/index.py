"""
Vercel Serverless Entry Point for LexShield AI
Re-exports the FastAPI `app` from backend/main.py for Vercel's Python runtime.
"""

import sys
import os
from pathlib import Path

# Add the backend directory to path so all imports work
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(BACKEND_DIR))

# Load .env if present (Vercel uses env vars set in dashboard, this is for local fallback)
_env_path = ROOT_DIR / ".env"
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

# Import the FastAPI app — Vercel picks up `app` from this module
from backend.main import app  # noqa: F401, E402
