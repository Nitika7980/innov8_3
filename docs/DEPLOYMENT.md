# DEPLOYMENT.md — Deployment & Execution Guide
**Project:** Freelancer Legal Contract Analyzer & Risky Clause Scorer  

---

## 💻 Local Deployment

### Step 1: Clone / Navigate to Directory
```bash
cd C:\Users\nitik\.gemini\antigravity\scratch\contract-analyzer
```

### Step 2: Set Up Virtual Environment (Recommended)
```bash
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate
```

### Step 3: Install Required Dependencies
```bash
python -m pip install -r requirements.txt
```

### Step 4: Run Application
```bash
python run.py
```
*The web page will open automatically in your browser at `http://127.0.0.1:8000`.*

---

## 🐳 Docker Container Deployment

For containerized cloud deployment (AWS ECS, Google Cloud Run, Azure Container Apps, or DigitalOcean):

### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Build & Run Docker Container
```bash
docker build -t lexshield-analyzer .
docker run -p 8000:8000 lexshield-analyzer
```

---

## ☁️ Cloud PaaS Deployment (Render / Railway / Fly.io)
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Endpoint:** `/api/health`
- **Memory Requirement:** 512MB RAM minimum (1GB recommended for handling simultaneous 10-page PDF uploads).
