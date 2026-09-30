"""
One-click Launcher for Freelancer Legal Contract Analyzer & Risky Clause Scorer
Starts the FastAPI server on port 8000 and opens the browser.
"""

import os
import sys
import webbrowser
import time
from pathlib import Path

# Add backend to sys.path
BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import uvicorn

def main():
    port = 8000
    host = "127.0.0.1"
    url = f"http://{host}:{port}"
    
    print("=" * 70)
    print(" ⚖️  LEXSHIELD AI — Freelancer Legal Contract Analyzer & Clause Scorer")
    print("=" * 70)
    print(f" Starting server at: {url}")
    print(" Level 2 Intermediate Solution: Contract OCR, Risk Scoring & Solutions")
    print(" Press Ctrl+C to stop the server.")
    print("=" * 70)

    # Launch browser after a brief delay
    import threading
    def open_browser():
        time.sleep(1.2)
        print(f" Opening web page: {url}")
        webbrowser.open(url)

    threading.Thread(target=open_browser, daemon=True).start()

    # Start FastAPI with Uvicorn
    uvicorn.run("backend.main:app", host=host, port=port, reload=False, log_level="info")

if __name__ == "__main__":
    main()
