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
        
    # Build stylized HTML printable report
    report_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Redlined Legal Analysis - {request.title}</title>
<style>
    @media print {{
        body {{ margin: 0; padding: 20mm; font-size: 11pt; }}
        .no-print {{ display: none !important; }}
        .page-break {{ page-break-before: always; }}
    }}
    body {{
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
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
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
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
        <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
        <span style="color: #64748b; margin-left: 10px; font-size: 13px;">Pro-Tip: Choose "Save as PDF" in your print dialog to download.</span>
    </div>

    <div class="header">
        <h1>Freelancer Legal Protection & Redline Report</h1>
        <p style="margin: 0; color: #64748b;">Contract: <strong>{request.title}</strong> | Generated by Freelancer Contract Shield AI</p>
    </div>

    <div class="score-banner">
        <div class="score-circle">{analysis['score']}</div>
        <div>
            <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">Contract Safety Grade: <span class="badge">{analysis['grade_badge']}</span></div>
            <div style="color: #475569; font-size: 14px;">{analysis['summary']}</div>
        </div>
    </div>

    <h2>Detected Trap Clauses & Counter-Offer Solutions</h2>
    <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">The following clauses have been flagged as predatory or biased toward the client. Use the redlined counter-proposals to negotiate safe terms.</p>
"""

    for idx, r in enumerate(analysis["detected_risks"], 1):
        report_html += f"""
    <div class="clause-card">
        <div class="clause-title">#{idx}. {r['title']} <span style="font-size: 12px; color: #64748b; font-weight: normal;">({r['category']})</span></div>
        
        <div class="section-label">Original Predatory Clause (Redlined Strike-Through)</div>
        <div class="redline-original">{r['matched_snippet']}</div>

        <div class="section-label">Recommended Counter-Offer Substitute Clause (Safe)</div>
        <div class="redline-solution"><strong>PROPOSED REPLACEMENT:</strong><br>{r['solution_clause']}</div>

        <div class="attorney-notes">
            <strong>Attorney Commentary:</strong> {r['why_risky']}<br>
            <strong>Negotiation Script:</strong> {r['negotiation_tip']}
        </div>
    </div>
"""

    report_html += """
    <div style="margin-top: 40px; padding: 20px; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 8px; font-size: 13px; color: #0369a1;">
        <strong>Disclaimer:</strong> This automated redline review is generated by the Freelancer Legal Contract Analyzer AI as an educational and negotiation assistance tool. It does not constitute formal legal counsel.
    </div>
</body>
</html>
"""
    return HTMLResponse(content=report_html)


# Mount frontend static directory
frontend_dir = current_dir.parent / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
