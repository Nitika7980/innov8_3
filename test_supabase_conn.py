import urllib.request
import urllib.error
import json
import os

SUPABASE_URL = "https://evpwtuzzwekpapoojqbw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cHd0dXp6d2VrcGFwb29qcWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MDg3OTYsImV4cCI6MjEwNjM4NDc5Nn0.oDwasEm3uOdUapPMrGp8QKHZw0vD5uDjtsSeW2PRYPw"

def check_table(table_name):
    url = f"{SUPABASE_URL}/rest/v1/{table_name}?select=*"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"[SUCCESS] Table '{table_name}' exists. Records count: {len(data)}")
            return True, data
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        print(f"[HTTP {e.code}] Table '{table_name}': {err_msg}")
        return False, err_msg
    except Exception as e:
        print(f"[ERROR] Table '{table_name}': {e}")
        return False, str(e)

print("=== Testing Supabase Connectivity ===")
check_table("users")
check_table("contract_scans")
check_table("app_telemetry")
