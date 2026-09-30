"""
Legal Risk Analyzer & Clause Scorer Engine
Analyzes contract text for predatory terms, calculates safety score,
translates legalese to plain English, and provides balanced counter-offer solutions.
"""

import re
from typing import List, Dict, Any

# Predefined Trap Patterns, Explanations, and Solutions
TRAP_RULES = [
    {
        "id": "ip_transfer_pre_payment",
        "category": "Intellectual Property",
        "title": "IP Transfer Prior to Full Payment",
        "severity": "CRITICAL",
        "weight": 25,
        "patterns": [
            r"regardless\s+of\s+whether\s+payment\s+has\s+been\s+made",
            r"(sole|exclusive)\s+property.*?from\s+the\s+moment\s+of\s+(conception|creation)",
            r"transfer\s+automatically\s+upon\s+(generation|creation)",
            r"belong\s+exclusively\s+to\s+.*?\s+upon\s+creation",
            r"prior\s+to\s+payment\s+receipt",
            r"waives?\s+all\s+moral\s+rights",
            r"assigns?\s+all.*?regardless\s+of\s+payment",
            r"work\s+made\s+for\s+hire.*?without\s+regard\s+to\s+compensation"
        ],
        "plain_translation": "The client becomes the 100% legal owner of your code, designs, and work the second you write it—even if they ghost you and never pay you a single rupee.",
        "why_risky": "If the client defaults, terminates early, or refuses to pay, you have already forfeited all legal claims to your own work. You cannot withhold the work or resell it to recoup your financial loss.",
        "solution_clause": (
            "\"Intellectual Property and Rights Transfer: Conditioned upon Freelancer's receipt of full "
            "and final payment of all invoiced fees, Freelancer hereby transfers and assigns to Client all right, "
            "title, and interest in the customized deliverables specified in the Statement of Work. "
            "Freelancer retains all rights, title, and ownership in all pre-existing tools, libraries, "
            "frameworks, and generic code developed prior to or independently of this Agreement.\""
        ),
        "negotiation_tip": (
            "Tell the client: 'I am excited to grant you 100% full ownership of the deliverables upon final payment settlement. "
            "Transferring copyright prior to invoice clearance creates auditing and accounting issues for my freelancing practice.'"
        )
    },
    {
        "id": "endless_revisions",
        "category": "Scope & Revisions",
        "title": "Uncapped / Endless Revisions Without Compensation",
        "severity": "HIGH",
        "weight": 20,
        "patterns": [
            r"unlimited\s+revisions",
            r"endless\s+(rounds|revisions)",
            r"revisions\s+and\s+modifications\s+at\s+no\s+additional\s+charge",
            r"until\s+(the\s+)?(client|company)\s+(expresses\s+)?(100%\s+)?(subjective\s+)?satisfaction",
            r"no\s+additional\s+billing.*?for\s+(edits|changes|revisions)",
            r"unlimited\s+modifications",
            r"as\s+many\s+revisions\s+as\s+requested"
        ],
        "plain_translation": "You are legally committing to do an infinite number of redesigns, rewrites, and changes for free until the client feels subjectively satisfied.",
        "why_risky": "Scope creep trap. Projects can drag on for 6-12 months for a fixed low fee. Clients can reject deliverables indefinitely without paying milestone bonuses or release fees.",
        "solution_clause": (
            "\"Scope of Revisions: The agreed fixed fee includes up to two (2) rounds of reasonable revisions per milestone, "
            "provided requested revisions remain within the initial specifications. Any additional revisions, changes in project scope, "
            "or major pivots will be billed separately at Freelancer's standard rate of $60/hour (or INR 2,500/hr) upon mutual written approval "
            "prior to commencement of extra work.\""
        ),
        "negotiation_tip": (
            "Tell the client: 'To ensure we deliver on schedule, my standard contract includes 2 comprehensive revision rounds. "
            "This keeps our feedback loops focused and protects project timelines. Additional iterations can always be added at our agreed hourly rate.'"
        )
    },
    {
        "id": "harsh_non_compete",
        "category": "Non-Compete & Exclusivity",
        "title": "Harsh / Perpetual Non-Compete Restriction",
        "severity": "CRITICAL",
        "weight": 20,
        "patterns": [
            r"period\s+of\s+(two|three|four|five|\d+)\s+(\(\d+\)\s+)?years\s+following",
            r"anywhere\s+in\s+the\s+world",
            r"perpetual.*?non-compete",
            r"shall\s+not\s+(directly\s+or\s+indirectly\s+)?(develop|consult|provide).*?sector",
            r"not\s+to\s+work\s+with\s+any\s+(direct\s+)?competitor",
            r"exclusivity.*?prohibits.*?other\s+clients"
        ],
        "plain_translation": "You are forbidden from working for any other client or company in your entire industry, often worldwide, for 1 to 3+ years after this contract ends.",
        "why_risky": "This destroys a student or freelancer's career and livelihood. In many jurisdictions (like India under Section 27 of the Contract Act and California), post-employment non-competes are void, but clients still use them to bully freelancers into turning down gigs.",
        "solution_clause": (
            "\"Non-Exclusivity and Freedom of Trade: Client acknowledges that Freelancer is an independent contractor "
            "and maintains a general consulting practice. Freelancer retains the right to perform services for other clients, "
            "including entities in similar sectors, provided that Freelancer does not disclose or utilize Client's verified "
            "Confidential Proprietary Information. There shall be no post-termination non-competition restriction.\""
        ),
        "negotiation_tip": (
            "Tell the client: 'As an independent freelancer, I work with multiple non-conflicting clients across tech and design. "
            "I strictly safeguard your proprietary trade secrets and confidential data under our NDA, but I cannot agree to industry-wide non-compete covenants.'"
        )
    },
    {
        "id": "predatory_payment_terms",
        "category": "Payment Terms",
        "title": "Delayed Payment / Pay-When-Paid / Indefinite Withholding",
        "severity": "CRITICAL",
        "weight": 25,
        "patterns": [
            r"net-?(60|90|120)",
            r"pay-?when-?paid",
            r"contingent\s+upon\s+(client|company)\s+(securing|receiving)",
            r"waives\s+all\s+right\s+to\s+compensation\s+for\s+hours",
            r"withhold.*?retainer\s+for\s+\d+\s+days",
            r"payment\s+will\s+be\s+released\s+60\s+business\s+days",
            r"upon\s+unconditional\s+acceptance\s+of\s+the\s+entire\s+project"
        ],
        "plain_translation": "The client can delay paying you for 2-4 months after you finish, or refuse to pay you entirely if their own investor or client fails to pay them.",
        "why_risky": "Freelancers are contractors, not venture capitalists or unpaid creditors. You risk working for weeks or months and receiving zero compensation if the client faces cash-flow trouble.",
        "solution_clause": (
            "\"Milestone Invoicing and Payment Terms: Client shall pay Freelancer a non-refundable upfront deposit of 30% "
            "upon signing. The remaining balance shall be payable across defined milestone deliveries. All invoices shall be paid "
            "within Net-14 business days of issuance. Late payments shall accrue interest at the rate of 1.5% per month (or the maximum allowed by law) "
            "until paid in full. Freelancer reserves the right to pause work if an invoice is overdue by more than 10 business days.\""
        ),
        "negotiation_tip": (
            "Tell the client: 'To allocate dedicated working hours and resources to your project, my invoicing standard requires a 30% upfront deposit with Net-14 payment on milestone completion. This ensures smooth, predictable delivery for both of us.'"
        )
    },
    {
        "id": "unilateral_termination",
        "category": "Termination Rights",
        "title": "Unilateral Termination Without Kill Fee",
        "severity": "HIGH",
        "weight": 15,
        "patterns": [
            r"terminate.*?at\s+any\s+time.*?without\s+(cause|notice)",
            r"no\s+obligation\s+to\s+compensate\s+freelancer\s+for\s+any\s+work\s+completed",
            r"freelancer\s+may\s+not\s+terminate.*?under\s+any\s+circumstances",
            r"cancel\s+this\s+contract\s+at\s+any\s+point\s+without\s+financial\s+liability",
            r"immediate.*?verbal\s+or\s+written\s+notice.*?without\s+payment"
        ],
        "plain_translation": "The client can fire you whenever they feel like it without paying you for work you already completed, while you are trapped and not allowed to quit.",
        "why_risky": "You could build 90% of the project, spend 100 hours of effort, and get terminated with $0 compensation. Termination clauses must be mutual and require payment for work done.",
        "solution_clause": (
            "\"Mutual Termination and Kill Fee: Either party may terminate this Agreement upon fourteen (14) calendar days written notice. "
            "In the event of termination by Client without material breach by Freelancer, Client shall promptly compensate Freelancer for all hours worked "
            "and deliverables partially or fully completed up to the effective termination date, plus any non-cancelable third-party expenses incurred.\""
        ),
        "negotiation_tip": (
            "Tell the client: 'Fair business practices require mutual 14-day notice, and guaranteed pro-rata compensation for all completed work in progress if the project is discontinued for internal client reasons.'"
        )
    },
    {
        "id": "unlimited_indemnity",
        "category": "Liability & Indemnification",
        "title": "Unlimited Liability & Broad Indemnification",
        "severity": "CRITICAL",
        "weight": 20,
        "patterns": [
            r"without\s+financial\s+limitation",
            r"freelancer('s)?\s+liability.*?shall\s+be\s+unlimited",
            r"defend,\s+indemnify,\s+and\s+hold\s+harmless.*?without\s+limit",
            r"assumes\s+sole\s+personal\s+legal\s+liability",
            r"liability.*?capped\s+at\s+(three|five|\d+)\s+times.*?fees",
            r"third-party\s+library\s+vulnerabilities.*?without.*?limit"
        ],
        "plain_translation": "If a third party sues the client or if an open-source bug exists, you personally have to pay all their multi-million-dollar court awards and lawyer bills.",
        "why_risky": "As a student or solo freelancer earning a few thousand dollars, an uncapped indemnity clause can cause personal bankruptcy over a minor third-party patent or copyright dispute.",
        "solution_clause": (
            "\"Mutual Limitation of Liability: Except in cases of willful gross misconduct or fraud, neither party shall be liable for indirect, "
            "special, punitive, or consequential damages. In all events, Freelancer's maximum aggregate cumulative liability arising out of or related to "
            "this Agreement shall be strictly capped at the total amount of fees actually received by Freelancer under this Agreement during the preceding "
            "six (6) months.\""
        ),
        "negotiation_tip": (
            "Tell the client: 'It is industry-standard for independent contractors to cap liability at the total contract fee value. Solo developers cannot shoulder enterprise-level uninsurable risk.'"
        )
    },
    {
        "id": "portfolio_gag_clause",
        "category": "Portfolio & Attribution",
        "title": "Total Portfolio Ban / Gag Clause",
        "severity": "MEDIUM",
        "weight": 10,
        "patterns": [
            r"strictly\s+prohibited\s+from\s+displaying.*?in\s+freelancer('s)?\s+personal\s+portfolio",
            r"not\s+disclose\s+that\s+client\s+was\s+a\s+client",
            r"shall\s+not\s+(disclose|upload|feature).*?on\s+(behance|dribbble|github|resume)",
            r"liquidated\s+damages\s+of\s+\$?\d+.*?for\s+(criticism|disparagement|comment)",
            r"portfolio\s+restrictions.*?in\s+perpetuity"
        ],
        "plain_translation": "You cannot show the work you built in your portfolio, GitHub, or resume, and you cannot even mention that you worked for this client.",
        "why_risky": "For students and freelancers, proof of work is critical for landing future jobs and clients. Completely stripping portfolio rights hampers career growth.",
        "solution_clause": (
            "\"Portfolio Rights and Attribution: Client agrees that Freelancer retains the right to display screenshots, non-confidential code snippets, "
            "and project case studies in Freelancer's online portfolio, professional profiles (e.g., GitHub, Behance, LinkedIn), and resume, "
            "solely for self-promotional purposes once the work has been publicly launched by Client.\""
        ),
        "negotiation_tip": (
            "Tell the client: 'I respect your confidentiality and will never share proprietary backend data or credentials. However, being able to showcase visual work or high-level architecture after public launch is how independent creators build their professional credibility.'"
        )
    },
    {
        "id": "harsh_penalty_delay",
        "category": "Penalties & Damages",
        "title": "Extreme Daily Delay Penalties",
        "severity": "MEDIUM",
        "weight": 10,
        "patterns": [
            r"penalty\s+deduction\s+of\s+\d+%\s+per\s+day",
            r"liquidated\s+damages\s+of\s+\$?\d+",
            r"time\s+is\s+of\s+the\s+essence.*?penalty"
        ],
        "plain_translation": "If you miss a deadline by a few days (even due to delayed client feedback), they can deduct 10% per day, slashing your entire pay to zero.",
        "why_risky": "Client delays in feedback or asset delivery frequently cause timeline shifts. If the contractor shoulders all deadline risk, they end up working for free.",
        "solution_clause": (
            "\"Project Timelines and Mutual Dependencies: Estimated milestone dates are contingent upon timely receipt of Client feedback, assets, "
            "and approvals within three (3) business days of request. Any delay resulting from Client response times will automatically extend delivery deadlines "
            "by an equivalent period without financial penalty.\""
        ),
        "negotiation_tip": (
            "Tell the client: 'Deadlines depend heavily on feedback turnaround. Let's make deadlines subject to reasonable client response times so neither party is penalized for external delays.'"
        )
    },
    {
        "id": "unfavorable_jurisdiction",
        "category": "Governing Law",
        "title": "Distant Foreign Jurisdiction & One-Sided Legal Fees",
        "severity": "MEDIUM",
        "weight": 10,
        "patterns": [
            r"litigated\s+exclusively\s+in\s+the.*?courts\s+of\s+(delaware|new\s+york|california|london|singapore)",
            r"cover\s+all\s+of\s+client('s)?\s+attorney\s+fees\s+regardless\s+of\s+outcome",
            r"waives\s+any\s+objection\s+to\s+venue"
        ],
        "plain_translation": "If the client doesn't pay you, you have to fly to a distant court (e.g. Delaware or another country) and pay all their legal fees even if you were in the right.",
        "why_risky": "Filing or defending a claim in an overseas court costs tens of thousands of dollars, making it practically impossible for a student freelancer to enforce payment.",
        "solution_clause": (
            "\"Dispute Resolution and Governing Law: This Agreement shall be governed by the laws of the jurisdiction where Freelancer resides. "
            "In the event of any controversy or claim, the parties agree to first seek informal resolution, followed by binding online mediation or arbitration. "
            "The prevailing party in any formal dispute shall be entitled to recover reasonable legal fees.\""
        ),
        "negotiation_tip": (
            "Tell the client: 'Let's include an online mediation clause. It prevents costly in-person court battles and protects both of us in a remote working relationship.'"
        )
    }
]


def extract_clauses_from_text(text: str) -> List[Dict[str, Any]]:
    """Splits contract into sections or numbered clauses for analysis."""
    # Split text by sections, numbered paragraphs, or double line breaks
    raw_blocks = re.split(r'\n(?=[0-9]+\.|\b[A-Z\s]{4,}\b|\n)', text)
    clauses = []
    
    for idx, block in enumerate(raw_blocks):
        block = block.strip()
        if len(block) < 20:
            continue
        
        # Check header
        first_line = block.split('\n')[0].strip()
        clauses.append({
            "index": idx + 1,
            "header": first_line[:80],
            "text": block
        })
    return clauses


def analyze_contract_text(contract_text: str) -> Dict[str, Any]:
    """
    Main analysis pipeline:
    1. Detects all predatory clauses using regex rules and semantic patterns.
    2. Calculates composite safety score (0-100) and grade (Green / Amber / Red).
    3. Categorizes risks (IP, Payment, Non-Compete, Termination, Liability, Scope).
    4. Provides Plain English translations, specific dangers, and actionable counter-offer solutions.
    """
    if not contract_text or len(contract_text.strip()) < 50:
        return {
            "error": "Contract text is too short or empty. Please provide at least 50 characters."
        }

    total_possible_penalty = 0
    incurred_penalty = 0
    detected_risks = []
    category_scores = {
        "Intellectual Property": {"penalty": 0, "max": 25, "detected": 0},
        "Scope & Revisions": {"penalty": 0, "max": 20, "detected": 0},
        "Non-Compete & Exclusivity": {"penalty": 0, "max": 20, "detected": 0},
        "Payment Terms": {"penalty": 0, "max": 25, "detected": 0},
        "Termination Rights": {"penalty": 0, "max": 15, "detected": 0},
        "Liability & Indemnification": {"penalty": 0, "max": 20, "detected": 0},
        "Portfolio & Attribution": {"penalty": 0, "max": 10, "detected": 0},
        "Penalties & Damages": {"penalty": 0, "max": 10, "detected": 0},
        "Governing Law": {"penalty": 0, "max": 10, "detected": 0}
    }

    # Evaluate against predefined trap rules
    for rule in TRAP_RULES:
        found_matches = []
        matched_text_snippet = ""
        
        for pat in rule["patterns"]:
            matches = list(re.finditer(pat, contract_text, re.IGNORECASE))
            if matches:
                for m in matches:
                    # Extract surrounding context (up to 150 chars before and after)
                    start = max(0, m.start() - 100)
                    end = min(len(contract_text), m.end() + 100)
                    snippet = contract_text[start:end].replace('\n', ' ').strip()
                    found_matches.append(snippet)
                    if not matched_text_snippet:
                        matched_text_snippet = snippet

        if found_matches:
            weight = rule["weight"]
            incurred_penalty += weight
            category = rule["category"]
            if category in category_scores:
                category_scores[category]["penalty"] += weight
                category_scores[category]["detected"] += 1

            detected_risks.append({
                "rule_id": rule["id"],
                "category": rule["category"],
                "title": rule["title"],
                "severity": rule["severity"],
                "weight": weight,
                "matched_snippet": matched_text_snippet or (found_matches[0] if found_matches else "Clause matched in agreement"),
                "plain_translation": rule["plain_translation"],
                "why_risky": rule["why_risky"],
                "solution_clause": rule["solution_clause"],
                "negotiation_tip": rule["negotiation_tip"]
            })

    # Base score is 100 minus accumulated penalties (capped at 0 min and 100 max)
    raw_score = max(5, 100 - incurred_penalty)
    
    # Assign Safety Grade
    if raw_score >= 80:
        safety_grade = "Green (Safe & Balanced)"
        grade_badge = "SAFE"
        color = "#10b981"  # Emerald
        summary = "This contract appears relatively balanced and creator-friendly. Minor refinements may still help clarify milestones."
    elif raw_score >= 50:
        safety_grade = "Amber (Moderate Risk - Proceed with Caution)"
        grade_badge = "CAUTION"
        color = "#f59e0b"  # Amber
        summary = "This agreement contains several concerning clauses that favor the client. You should request counter-offer revisions before signing."
    else:
        safety_grade = "High Risk Red (Dangerous / Predatory Terms Detected)"
        grade_badge = "CRITICAL TRAP"
        color = "#ef4444"  # Red
        summary = "ALERT: This contract contains multiple predatory clauses that could result in unpaid work, loss of intellectual property, or catastrophic liability. DO NOT sign without sending our counter-offer clauses!"

    # Category breakdown percentages
    category_breakdown = []
    for cat_name, cat_data in category_scores.items():
        if cat_data["penalty"] > 0:
            health = max(0, 100 - int((cat_data["penalty"] / cat_data["max"]) * 100))
        else:
            health = 100
        category_breakdown.append({
            "category": cat_name,
            "health": health,
            "status": "Safe" if health >= 80 else ("Review" if health >= 50 else "High Risk"),
            "issues_count": cat_data["detected"]
        })

    # Sort risks by severity: CRITICAL first, then HIGH, then MEDIUM, then LOW
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    detected_risks.sort(key=lambda r: severity_order.get(r["severity"], 99))

    # Generate complete ready-to-send counter-offer email
    counter_offer_email = generate_counter_offer_email(detected_risks)

    return {
        "score": raw_score,
        "safety_grade": safety_grade,
        "grade_badge": grade_badge,
        "theme_color": color,
        "summary": summary,
        "total_risks_found": len(detected_risks),
        "critical_count": sum(1 for r in detected_risks if r["severity"] == "CRITICAL"),
        "high_count": sum(1 for r in detected_risks if r["severity"] == "HIGH"),
        "medium_count": sum(1 for r in detected_risks if r["severity"] == "MEDIUM"),
        "detected_risks": detected_risks,
        "category_breakdown": category_breakdown,
        "counter_offer_email": counter_offer_email
    }


def generate_counter_offer_email(risks: List[Dict[str, Any]]) -> Dict[str, str]:
    """Builds a polite, professional counter-offer email that students can send to clients."""
    if not risks:
        return {
            "subject": "Regarding Freelance Agreement - Ready to Proceed",
            "body": "Dear [Client Name],\n\nThank you for sending over the agreement. I have reviewed the terms and everything looks well-aligned. I am pleased to sign and look forward to kicking off our collaboration!\n\nBest regards,\n[Your Name]"
        }

    body_lines = [
        "Dear [Client Name / Hiring Manager],",
        "",
        "Thank you very much for sending over the Independent Contractor Agreement. I am thrilled about the opportunity to partner with you on this project and bring high value to your team.",
        "",
        "I have reviewed the agreement and have proposed a few standard industry-balanced adjustments so that the terms align with standard independent freelancing practices. Below are the key clauses I would like to update:",
        ""
    ]

    for idx, risk in enumerate(risks, 1):
        body_lines.append(f"{idx}. {risk['title']} ({risk['category']})")
        body_lines.append(f"   Proposed Substitute Language:")
        body_lines.append(f"   {risk['solution_clause']}")
        body_lines.append("")

    body_lines.append("These updates allow me to commit my full creative and technical focus to your project while ensuring mutual protection and clarity.")
    body_lines.append("")
    body_lines.append("Please let me know if these adjustments work for you, and I will be delighted to sign the updated document and get started immediately.")
    body_lines.append("")
    body_lines.append("Warm regards,")
    body_lines.append("[Your Name]")
    body_lines.append("Freelance Contractor | Portfolio: [Your Website / GitHub]")

    return {
        "subject": "Proposed Revisions: Independent Contractor Agreement - [Your Name / Project Name]",
        "body": "\n".join(body_lines)
    }
