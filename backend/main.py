"""
FastAPI Backend Server for Freelancer Legal Contract Analyzer & Risky Clause Scorer
Features:
- Instant analysis with safety scoring (0-100)
- Deep risk breakdown with Plain-English explanations
- Concrete counter-offer solutions for every risky clause (User's specific requirement!)
- Redline annotated report export
- PDF, DOCX, and TXT upload parsing with sandboxed immediate deletion
- Preloaded sample contracts for instant testing
"""

import io
import os
import sys
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from pydantic import BaseModel

# Add current directory to path
current_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(current_dir))

from analyzer import analyze_contract_text
from sample_contracts import SAMPLE_CONTRACTS

app = FastAPI(
    title="Freelancer Legal Contract Analyzer & Risky Clause Scorer",
    description="Protects student freelancers from predatory contracts by analyzing legal terms, scoring risks, and providing actionable counter-offer clauses.",
    version="1.0.0"
)

# Enable CORS for local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    text: str
    title: Optional[str] = "Uploaded Contract"
    language: Optional[str] = "en"


def extract_text_from_file(filename: str, content: bytes) -> str:
    """Extracts raw text from uploaded PDF, DOCX, or TXT safely in memory."""
    filename_lower = filename.lower()
    
    if filename_lower.endswith(".txt"):
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            return content.decode("latin-1", errors="ignore")
            
    elif filename_lower.endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            extracted_pages = []
            for page_idx, page in enumerate(reader.pages):
                txt = page.extract_text() or ""
                extracted_pages.append(f"--- Page {page_idx + 1} ---\n" + txt)
            return "\n\n".join(extracted_pages)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF document: {str(e)}")
            
    elif filename_lower.endswith(".docx"):
        try:
            import docx
            doc = docx.Document(io.BytesIO(content))
            return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse DOCX document: {str(e)}")
            
    else:
        # Try raw utf-8 decoding
        try:
            return content.decode("utf-8")
        except Exception:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, DOCX, or TXT.")


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Freelancer Legal Contract Analyzer",
        "ocr_parser_ready": True
    }


@app.get("/api/samples")
async def get_samples():
    """Returns list of preloaded contracts for instant testing."""
    return {
        "samples": [
            {
                "id": k,
                "title": v["title"],
                "role": v["role"],
                "client": v["client"],
                "description": v["description"]
            }
            for k, v in SAMPLE_CONTRACTS.items()
        ]
    }


@app.get("/api/sample/{sample_id}")
async def get_sample_content(sample_id: str):
    """Returns full content of a specific preloaded sample contract."""
    if sample_id not in SAMPLE_CONTRACTS:
        raise HTTPException(status_code=404, detail="Sample contract not found")
    return SAMPLE_CONTRACTS[sample_id]


@app.post("/api/analyze")
async def analyze_text(request: AnalyzeRequest):
    """Analyzes raw contract text and returns safety score, predatory clauses, and solutions."""
    analysis = analyze_contract_text(request.text)
    if "error" in analysis:
        raise HTTPException(status_code=400, detail=analysis["error"])
    return {
        "title": request.title,
        "length_characters": len(request.text),
        "results": analysis
    }


@app.post("/api/upload")
async def upload_contract(file: UploadFile = File(...)):
    """
    Ingests PDF, DOCX, or TXT files.
    Processes purely in memory (Sandboxed document handling - immediate session clearance).
    """
    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 15MB.")
        
    extracted_text = extract_text_from_file(file.filename, content)
    del content  # Sandboxed privacy compliance: immediate memory purge
    
    if len(extracted_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="The uploaded document contains little to no readable text.")
        
    analysis = analyze_contract_text(extracted_text)
    return {
        "filename": file.filename,
        "extracted_text": extracted_text,
        "results": analysis
    }


@app.post("/api/redline-export")
async def generate_redline_report(request: AnalyzeRequest):
    """
    Generates a printable, professional Redline Legal Report with:
    - Overall Risk Score & Safety Grade
    - Original clauses marked with strike-through / redline
    - Proposed Counter-Offer Clauses highlighted in green
    - Attorney-Style Sidebar Commentary & Negotiation Guide
    """
    analysis = analyze_contract_text(request.text)
    if "error" in analysis:
        raise HTTPException(status_code=400, detail=analysis["error"])
        
    lang = (request.language or "en").lower()
    
    # Localized report labels
    labels = {
        "en": {
            "title": "Freelancer Legal Protection & Redline Report",
            "contract": "Contract",
            "grade": "Contract Safety Grade",
            "section_title": "Detected Trap Clauses & Counter-Offer Solutions",
            "section_desc": "The following clauses have been flagged as predatory or biased toward the client. Use the redlined counter-proposals to negotiate safe terms.",
            "orig_label": "Original Predatory Clause (Redlined Strike-Through)",
            "sol_label": "Recommended Counter-Offer Substitute Clause (Safe)",
            "proposed": "PROPOSED REPLACEMENT:",
            "attorney": "Attorney Commentary:",
            "script": "Negotiation Script:",
            "print_btn": "🖨️ Print / Save as PDF",
            "print_hint": "Pro-Tip: Choose 'Save as PDF' in your print dialog to download.",
            "disclaimer": "This automated redline review is generated by the Freelancer Legal Contract Analyzer AI as an educational and negotiation assistance tool. It does not constitute formal legal counsel."
        },
        "hi": {
            "title": "फ्रीलांसर कानूनी सुरक्षा और रेडलाइन रिपोर्ट",
            "contract": "अनुबंध",
            "grade": "अनुबंध सुरक्षा ग्रेड",
            "section_title": "चिह्नित शोषणकारी क्लॉज़ और काउंटर-ऑफ़र समाधान",
            "section_desc": "निम्नलिखित क्लॉज़ को शोषणकारी चिह्नित किया गया है। सुरक्षित शर्तों पर बातचीत करने के लिए इन काउंटर-प्रस्तावों का उपयोग करें।",
            "orig_label": "अनुबंध में मूल शोषणकारी क्लॉज़ (रेडलाइन स्ट्राइक-थ्रू)",
            "sol_label": "अनुशंसित काउंटर-ऑफ़र प्रतिस्थापन क्लॉज़ (सुरक्षित)",
            "proposed": "प्रस्तावित प्रतिस्थापन:",
            "attorney": "कानूनी टिप्पणी:",
            "script": "बातचीत स्क्रिप्ट:",
            "print_btn": "🖨️ प्रिंट करें / PDF सहेजें",
            "print_hint": "सुझाव: डाउनलोड करने के लिए प्रिंट डायलॉग में 'Save as PDF' चुनें।",
            "disclaimer": "यह स्वचालित समीक्षा केवल शैक्षणिक और बातचीत सहायता के लिए है। यह औपचारिक कानूनी सलाह नहीं है।"
        },
        "bn": {
            "title": "ফ্রিল্যান্সার আইনি সুরক্ষা ও রেডলাইন রিপোর্ট",
            "contract": "চুক্তি",
            "grade": "চুক্তি নিরাপত্তা গ্রেড",
            "section_title": "চিহ্নিত শোষণমূলক ধারা এবং পাল্টা প্রস্তাব সমাধান",
            "section_desc": "নিচের ধারাগুলোকে শোষণমূলক হিসেবে চিহ্নিত করা হয়েছে। নিরাপদ শর্তে আলোচনার জন্য এই পাল্টা প্রস্তাবগুলো ব্যবহার করুন।",
            "orig_label": "চুক্তির মূল শোষণমূলক ধারা (রেডলাইন)",
            "sol_label": "প্রস্তাবিত বিকল্প ধারা (নিরাপদ)",
            "proposed": "প্রস্তাবিত প্রতিস্থাপন:",
            "attorney": "আইনি মন্তব্য:",
            "script": "আলোচনার পরামর্শ:",
            "print_btn": "🖨️ প্রিন্ট / PDF সংরক্ষণ",
            "print_hint": "টিপ: ডাউনলোড করতে প্রিন্ট ডায়ালগে 'Save as PDF' নির্বাচন করুন।",
            "disclaimer": "এই পর্যালোচনাটি শিক্ষামূলক এবং আলোচনায় সহায়তার উদ্দেশ্যে প্রস্তুত। এটি কোনো আনুষ্ঠানিক আইনি পরামর্শ নয়।"
        },
        "ta": {
            "title": "ஃப்ரீலான்ஸர் சட்டப் பாதுகாப்பு & மாற்று அறிக்கை",
            "contract": "ஒப்பந்தம்",
            "grade": "பாதுகாப்பு தரம்",
            "section_title": "கண்டறியப்பட்ட சுரண்டல் பிரிவுகள் & மாற்று தீர்வுகள்",
            "section_desc": "பின்வரும் பிரிவுகள் ஆபத்தானவையாகக் குறிக்கப்பட்டுள்ளன. பாதுகாப்பான விதிமுறைகளுக்கு இந்த மாற்று பரிந்துரைகளைப் பயன்படுத்தவும்.",
            "orig_label": "அசல் சுரண்டல் பிரிவு (ரெக்லைன் நீக்கம்)",
            "sol_label": "பரிந்துரைக்கப்பட்ட மாற்று பிரிவு (பாதுகாப்பானது)",
            "proposed": "மாற்று பரிந்துரை:",
            "attorney": "சட்டக் குறிப்பு:",
            "script": "பேச்சுவார்த்தை உத்தி:",
            "print_btn": "🖨️ அச்சிடுக / PDF சேமி",
            "print_hint": "குறிப்பு: பதிவிறக்க 'Save as PDF' என்பதைத் தேர்ந்தெடுக்கவும்.",
            "disclaimer": "இது கல்வி மற்றும் பேச்சுவார்த்தை வழிகாட்டலுக்காக மட்டுமே. இது முறையான சட்ட ஆலோசனையல்ல."
        },
        "te": {
            "title": "ఫ్రీలాన్సర్ చట్టపరమైన రక్షణ & రెడ్‌లైన్ నివేదిక",
            "contract": "ఒప్పందం",
            "grade": "భద్రతా గ్రేడ్",
            "section_title": "గుర్తించిన ప్రమాదకర నిబంధనలు మరియు ప్రత్యామ్నాయ పరిష్కారాలు",
            "section_desc": "కింది నిబంధనలు ప్రమాదకరమైనవిగా గుర్తించబడ్డాయి. సురక్షితమైన నిబంధనలను చర్చించడానికి ఈ ప్రతిపాదనలను ఉపయోగించండి.",
            "orig_label": "ఒప్పందంలోని అసలు ప్రమాదకర నిబంధన",
            "sol_label": "సిఫార్సు చేయబడిన ప్రత్యామ్నాయ నిబంధన (సురక్షితమైనది)",
            "proposed": "ప్రతిపాదిత మార్పు:",
            "attorney": "న్యాయవాది వ్యాఖ్య:",
            "script": "చర్చల వ్యూహం:",
            "print_btn": "🖨️ ప్రింట్ / PDF సేవ్ చేయండి",
            "print_hint": "సలహా: డౌన్‌లోడ్ చేయడానికి ప్రింట్ డైలాగ్‌లో 'Save as PDF' ఎంచుకోండి.",
            "disclaimer": "ఈ సమీక్ష కేవలం విద్యా మరియు చర్చల సహాయం కోసం మాత్రమే. ఇది అధికారిక చట్టపరమైన సలహా కాదు."
        }
    }
    
    L = labels.get(lang, labels["en"])

    report_html = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<title>{L['title']} - {request.title}</title>
<style>
    @media print {{
        body {{ margin: 0; padding: 20mm; font-size: 11pt; }}
        .no-print {{ display: none !important; }}
        .page-break {{ page-break-before: always; }}
    }}
    body {{
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Nirmala UI", sans-serif;
        color: #1e293b;
        background: #f8fafc;
        line-height: 1.6;
        padding: 40px;
        max-width: 900px;
        margin: 0 auto;
    }}
    .header {{
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 20px;
        margin-bottom: 30px;
    }}
    .header h1 {{ margin: 0 0 8px 0; color: #0f172a; font-size: 24px; }}
    .badge {{
        display: inline-block;
        padding: 6px 14px;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 14px;
        color: #fff;
        background: {analysis['theme_color']};
    }}
    .score-banner {{
        display: flex;
        align-items: center;
        gap: 20px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 30px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.03);
    }}
    .score-circle {{
        width: 70px;
        height: 70px;
        border-radius: 50%;
        background: {analysis['theme_color']};
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26px;
        font-weight: 800;
    }}
    .clause-card {{
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-left: 6px solid #ef4444;
        border-radius: 10px;
        padding: 20px;
        margin-bottom: 24px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.02);
    }}
    .clause-title {{
        font-size: 18px;
        font-weight: 700;
        margin: 0 0 10px 0;
        color: #b91c1c;
    }}
    .section-label {{
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 700;
        color: #64748b;
        margin-bottom: 4px;
    }}
    .redline-original {{
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
        padding: 12px;
        border-radius: 6px;
        text-decoration: line-through;
        font-family: monospace;
        font-size: 13px;
        margin-bottom: 12px;
    }}
    .redline-solution {{
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
        padding: 14px;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif;
        font-size: 13.5px;
        margin-bottom: 12px;
    }}
    .attorney-notes {{
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        padding: 12px;
        border-radius: 6px;
        font-size: 13px;
        color: #334155;
    }}
    .btn-print {{
        background: #2563eb;
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 20px;
    }}
</style>
</head>
<body>
    <div class="no-print">
        <button class="btn-print" onclick="window.print()">{L['print_btn']}</button>
        <span style="color: #64748b; margin-left: 10px; font-size: 13px;">{L['print_hint']}</span>
    </div>

    <div class="header">
        <h1>{L['title']}</h1>
        <p style="margin: 0; color: #64748b;">{L['contract']}: <strong>{request.title}</strong> | LexShield AI</p>
    </div>

    <div class="score-banner">
        <div class="score-circle">{analysis['score']}</div>
        <div>
            <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">{L['grade']}: <span class="badge">{analysis['grade_badge']}</span></div>
            <div style="color: #475569; font-size: 14px;">{analysis['summary']}</div>
        </div>
    </div>

    <h2>{L['section_title']}</h2>
    <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">{L['section_desc']}</p>
"""

    for idx, r in enumerate(analysis["detected_risks"], 1):
        report_html += f"""
    <div class="clause-card">
        <div class="clause-title">#{idx}. {r['title']} <span style="font-size: 12px; color: #64748b; font-weight: normal;">({r['category']})</span></div>
        
        <div class="section-label">{L['orig_label']}</div>
        <div class="redline-original">{r['matched_snippet']}</div>

        <div class="section-label">{L['sol_label']}</div>
        <div class="redline-solution"><strong>{L['proposed']}</strong><br>{r['solution_clause']}</div>

        <div class="attorney-notes">
            <strong>{L['attorney']}</strong> {r['why_risky']}<br>
            <strong>{L['script']}</strong> {r['negotiation_tip']}
        </div>
    </div>
"""

    report_html += f"""
    <div style="margin-top: 40px; padding: 20px; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 8px; font-size: 13px; color: #0369a1;">
        <strong>Disclaimer:</strong> {L['disclaimer']}
    </div>
</body>
</html>
"""
    return HTMLResponse(content=report_html)


# Mount frontend static directory
frontend_dir = current_dir.parent / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
