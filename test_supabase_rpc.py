import urllib.request
import urllib.error
import json

SUPABASE_URL = "https://evpwtuzzwekpapoojqbw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cHd0dXp6d2VrcGFwb29qcWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MDg3OTYsImV4cCI6MjEwNjM4NDc5Nn0.oDwasEm3uOdUapPMrGp8QKHZw0vD5uDjtsSeW2PRYPw"

def run_query():
    url = f"{SUPABASE_URL}/rest/v1/"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            print("Supabase connected! Response status:", resp.status)
            return True
    except Exception as e:
        print("Supabase check error:", e)
        return False

run_query()
