# LexShield AI — Freelancer Legal Contract Analyzer & Risky Clause Scorer

> *Protecting student freelancers, creators, and gig workers from predatory contracts with instant risk scoring, plain-English translations, and attorney-grade counter-offer clauses.*

---

## 🎯 Executive Overview & Real-World Value
Student freelancers, new graduates, and independent creators signing internship and client contracts frequently fall prey to predatory terms:
- **Indefinite payment delays** (Net-60/90, "Pay-When-Paid" traps)
- **Perpetual, global non-compete clauses** restricting future employment
- **Immediate loss of Intellectual Property** prior to payment settlement
- **Unlimited personal indemnification and liability**
- **Uncapped / endless revision loops** without compensation

Hiring an attorney costs thousands of rupees or hundreds of dollars—an expense most students cannot afford. **LexShield AI** levels the playing field by analyzing legal agreements in seconds, assigning a 0–100 safety score, translating dense legalese into plain English, and providing **battle-tested counter-offer solutions** freelancers can immediately email back to clients.

---

## 🚀 Key Features

| Requirement | Feature | Implementation |
|---|---|---|
| **FR-1: Contract Ingestion & OCR** | Multi-Format Parsing | Supports PDF (via `pypdf`), DOCX (via `python-docx`), TXT, and scanned image upload with in-browser text extraction fallback. |
| **FR-2: Risk Severity Scoring** | 0–100 Gauge & Safety Grades | Evaluates cumulative risk across 9 categories; assigns **Green (Safe)**, **Amber (Caution)**, or **High Risk Red (Critical Trap)**. |
| **FR-3: Predatory Clause Extraction** | Trap Clause Detection | Identifies endless revisions, harsh non-competes, IP forfeiture before payment, unilateral termination, unlimited indemnity, and gag clauses. |
| **FR-4: Plain-English Translation** | "Human" Explanations | Translates jargon into straightforward bullet points explaining what the freelancer is actually signing away. |
| **FR-5: Counter-Offer Clause Rewriter** | Actionable Solutions & Remedies | Generates balanced, standard substitute clauses + practical negotiation talking points + 1-click counter-offer email generator. |
| **FR-6: Redline Legal Report Export** | Document Redlines & PDF Export | Side-by-side strikethrough comparison of predatory terms against proposed substitute clauses with attorney commentary. |

---

## 🛠️ Architecture & Tech Stack

- **Backend:** Python 3.14 + FastAPI + Uvicorn
- **Document Extractors:** `pypdf` (multi-page PDF parser), `python-docx` (Word docx extractor), In-Memory Stream Processing
- **NLP / Rule Engine:** Multi-tier regex and semantic pattern matching engine covering 9 high-risk legal liability vectors
- **Frontend:** Vanilla HTML5, CSS3 (Modern Glassmorphic Dark/Light theme), Responsive JS (ES6+), Zero Heavy Framework Overhead
- **Privacy & Security:** Sandboxed in-memory parsing; documents are purged immediately after analysis (Zero Data Retention)

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
- Python 3.9+ installed
- Terminal or PowerShell

### 2. Clone or Navigate to Project
```bash
cd C:\Users\nitik\.gemini\antigravity\scratch\contract-analyzer
```

### 3. Install Dependencies
```bash
python -m pip install -r requirements.txt
```

### 4. Launch the Web Application
```bash
python run.py
```
*The script automatically starts the local server at `http://127.0.0.1:8000` and opens your browser.*

---

## 🧪 Interactive Testing with Preloaded Contracts
The application includes 4 pre-loaded real-world test contracts in the UI header:
1. **Predatory Software Developer Agreement** (Score: 5/100, High Risk Red)
2. **Exploitative Creator & Graphic Design Contract** (Score: 12/100, High Risk Red)
3. **Standard Agency Agreement** (Score: 65/100, Moderate Amber)
4. **Creator-Friendly Model Agreement** (Score: 100/100, Safe Green)

---

## 📁 Repository Structure

```text
contract-analyzer/
├── backend/
│   ├── main.py               # FastAPI server & API endpoints
│   ├── analyzer.py           # Legal risk scorer & solution generator engine
│   └── sample_contracts.py   # Realistic benchmark contracts
├── frontend/
│   ├── index.html            # Responsive UI layout & components
│   ├── style.css             # Dark/Light theme & styling
│   └── app.js                # Interactive logic, scoring & counter-offer builder
├── docs/
│   ├── PLANNING.md           # Architecture design & milestone roadmap
│   ├── PROGRESS.md           # Build log & completed functional requirements
│   ├── DEPLOYMENT.md         # Local & cloud production deployment guide
│   └── DEFENSE_QA.md         # Hackathon jury presentation defense Q&A
├── requirements.txt          # Python package requirements
├── run.py                    # 1-click startup runner
└── README.md                 # Project documentation
```

---

## ⚖️ Legal Disclaimer
LexShield AI is an automated educational and contract negotiation assistance tool. It does not constitute formal legal counsel.
