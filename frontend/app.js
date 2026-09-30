/**
 * LexShield AI - Frontend Application Logic
 * Implements interactive contract analysis, score visualization,
 * clause breakdown, and actionable counter-offer solution generation.
 */

// Local fallback samples for immediate offline/instant loading
const LOCAL_SAMPLES = {
  predatory_dev: {
    title: "Predatory Software Freelancer Agreement (High Risk)",
    text: `INDEPENDENT CONTRACTOR SERVICES AGREEMENT
1. SCOPE OF SERVICES & REVISIONS
The Freelancer agrees to perform unlimited revisions and modifications at no additional charge until the Client expresses 100% subjective satisfaction. Time is of the essence, and any delay shall incur a penalty deduction of 10% per day from the total fee.

2. COMPENSATION AND PAYMENT TERMS
Client shall compensate Freelancer a total fixed sum of $4,500. Payment will be disbursed on a Net-90 basis following Client's written approval. Freelancer acknowledges that payment is strictly contingent upon Client securing financing and receiving client funds ("Pay-When-Paid"). In the event Client does not receive funding, Freelancer waives all right to compensation for hours worked.

3. INTELLECTUAL PROPERTY OWNERSHIP
Freelancer agrees that all work product, source code, designs, algorithms, and deliverables shall immediately become the sole and exclusive property of the Client from the moment of conception or creation, regardless of whether payment has been made by Client. Freelancer hereby waives all moral rights.

4. NON-COMPETE AND EXCLUSIVITY
During the term of this Agreement and for a period of three (3) years following termination for any reason, Freelancer shall not directly or indirectly develop software or provide programming services to any business in the technology sector anywhere in the world.

5. TERMINATION
Client may terminate this Agreement at any time without cause upon immediate verbal notice, with no obligation to compensate Freelancer for any work completed prior to termination. Freelancer may not terminate under any circumstances.

6. UNLIMITED INDEMNIFICATION AND LIABILITY
Freelancer agrees to defend, indemnify, and hold harmless Client against all claims, damages, liabilities, costs, and legal fees without financial limitation. Freelancer's liability under this Agreement shall be unlimited.

7. CONFIDENTIALITY AND PORTFOLIO RESTRICTIONS
Freelancer is strictly prohibited from displaying any portion of the source code or deliverables in Freelancer's personal portfolio or GitHub, nor may Freelancer disclose that Client was a client.`
  },
  predatory_design: {
    title: "Exploitative Creator & Design Agreement (High Risk)",
    text: `CREATIVE FREELANCER AGREEMENT
1. DELIVERABLES AND APPROVAL
Contractor shall execute endless rounds of revisions until Company management deems the creative assets acceptable. No additional billing or hourly fees will be permitted for edits or changes.

2. PAYMENT MILESTONES
Payment will be released 60 business days after final approval. Company reserves the right to withhold 50% of the contract value as a quality assurance retainer for 180 days.

3. TRANSFER OF RIGHTS AND LIKENESS
All illustrations, raw working files, and likeness rights belong exclusively to Company upon creation, prior to payment receipt.

4. PORTFOLIO AND NON-DISPARAGEMENT
Contractor shall not disclose, upload, or feature any client deliverables on Behance, Dribbble, Instagram, or personal portfolio. Liquidated damages of $10,000 payable immediately for any unfavorable comment.

5. INDEMNITY
Contractor assumes sole personal legal liability for all damages, and Company may cancel this contract at any point without financial liability.`
  },
  moderate_freelance: {
    title: "Standard Agency Agreement (Medium Risk Amber)",
    text: `CONSULTING SERVICES AGREEMENT
1. SERVICES
Work includes up to three (3) revisions per milestone. Additional revisions will be negotiated at standard hourly rates.

2. COMPENSATION
Invoices submitted at month-end will be paid within Net-45 days of receipt. Invoices not approved within 15 days are deemed pending review.

3. INTELLECTUAL PROPERTY
Consultant agrees that all campaign assets created under this agreement transfer automatically upon generation of work product.

4. NON-COMPETITION
Consultant agrees not to work with any direct competitors of Company in the marketing analytics domain within a 50-mile radius for a period of twelve (12) months following contract completion.

5. LIMITATION OF LIABILITY
Consultant's liability for direct errors or omissions shall be capped at three times (3x) the total fees received under this Agreement.`
  },
  safe_fair: {
    title: "Balanced & Creator-Friendly Model Agreement (Low Risk Safe Green)",
    text: `FAIR INDEPENDENT CONTRACTOR AGREEMENT
1. SCOPE AND REVISIONS
The fee includes up to two (2) rounds of reasonable revisions per milestone. Any subsequent or out-of-scope revisions will be billed at Freelancer's standard rate of $75/hour upon mutual written agreement.

2. COMPENSATION AND DEPOSIT
Total Project Fee: $4,000. A non-refundable deposit of 50% ($2,000) is due prior to project commencement. The remaining 50% balance shall be payable Net-15 days from final delivery. Late payments shall accrue interest at 1.5% per month.

3. INTELLECTUAL PROPERTY & TRANSFER OF RIGHTS
Upon receipt of full and final payment of all agreed fees, Freelancer assigns to Client all rights, title, and interest in the customized deliverables. Freelancer retains all rights to pre-existing code and templates.

4. PORTFOLIO USAGE
Freelancer retains the non-exclusive right to display deliverables, screenshots, and case studies in Freelancer's portfolio and promotional materials.

5. TERMINATION
Either party may terminate upon fourteen (14) days written notice. In the event of early termination, Freelancer shall be compensated pro-rata for all hours worked through the termination date.

6. MUTUAL LIMITATION OF LIABILITY
Neither party's aggregate liability shall exceed the total fees paid or payable under this Agreement.`
  }
};

let currentAnalysis = null;
let currentContractText = "";
let currentContractTitle = "Contract Analysis";
let selectedFilter = "ALL";
let selectedFile = null;

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  setupTheme();
  setupDropzone();
  
  // Auto-load first sample contract for instant interactive preview
  loadSample("predatory_dev");
});

// Setup Dark/Light Theme
function setupTheme() {
  const savedTheme = localStorage.getItem("lexshield_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);

  const toggleBtn = document.getElementById("toggleThemeBtn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const curr = document.documentElement.getAttribute("data-theme") || "dark";
      const next = curr === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("lexshield_theme", next);
      updateThemeIcon(next);
      if (currentAnalysis) {
        updateProgressCircle(currentAnalysis.score, currentAnalysis.theme_color);
      }
    });
  }
}

function updateThemeIcon(theme) {
  const toggleBtn = document.getElementById("toggleThemeBtn");
  if (toggleBtn) {
    toggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}

// Setup Drag & Drop Handlers
function setupDropzone() {
  const dropzone = document.getElementById("dropzone");
  if (!dropzone) return;

  ["dragenter", "dragover"].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("dragover");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });
}

function triggerFileInput() {
  const input = document.getElementById("fileInput");
  if (input) input.click();
}

function handleFileSelected(event) {
  const files = event.target.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

function handleFile(file) {
  selectedFile = file;
  const statusDiv = document.getElementById("fileUploadStatus");
  statusDiv.classList.remove("hidden");
  statusDiv.innerHTML = `Selected File: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
  currentContractTitle = file.name;

  // If text file, read locally to display
  if (file.name.endsWith(".txt")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      currentContractText = e.target.result;
      document.getElementById("contractTextInput").value = currentContractText;
    };
    reader.readAsText(file);
  }
}

function switchInputTab(tab) {
  const uploadBtn = document.getElementById("tabUploadBtn");
  const textBtn = document.getElementById("tabTextBtn");
  const dropzoneContainer = document.getElementById("dropzoneContainer");
  const rawTextContainer = document.getElementById("rawTextContainer");

  if (tab === "upload") {
    uploadBtn.classList.add("active");
    textBtn.classList.remove("active");
    dropzoneContainer.style.display = "block";
    rawTextContainer.style.display = "none";
  } else {
    uploadBtn.classList.remove("active");
    textBtn.classList.add("active");
    dropzoneContainer.style.display = "none";
    rawTextContainer.style.display = "block";
  }
}

function clearInput() {
  document.getElementById("contractTextInput").value = "";
  selectedFile = null;
  currentContractText = "";
  const statusDiv = document.getElementById("fileUploadStatus");
  statusDiv.classList.add("hidden");
  statusDiv.innerHTML = "";
  document.getElementById("resultsSection").classList.add("hidden");
  showToast("Cleared inputs");
}

// Load preloaded sample contract
async function loadSample(sampleId) {
  try {
    const response = await fetch(`/api/sample/${sampleId}`);
    if (response.ok) {
      const data = await response.json();
      currentContractText = data.text;
      currentContractTitle = data.title;
    } else {
      throw new Error("Fallback to local");
    }
  } catch (err) {
    const fallback = LOCAL_SAMPLES[sampleId];
    if (fallback) {
      currentContractText = fallback.text;
      currentContractTitle = fallback.title;
    }
  }

  // Update text input
  document.getElementById("contractTextInput").value = currentContractText;
  switchInputTab("text");
  showToast(`Loaded: ${currentContractTitle}`);
  
  // Automatically trigger analysis for seamless demo
  performAnalysis();
}

// Main Analysis Trigger
async function performAnalysis() {
  const loadingIndicator = document.getElementById("loadingIndicator");
  const resultsSection = document.getElementById("resultsSection");
  const analyzeBtn = document.getElementById("analyzeBtn");

  // Get current text or file
  const textVal = document.getElementById("contractTextInput").value.trim();
  if (!textVal && !selectedFile) {
    alert("Please upload a contract file or paste contract text to analyze.");
    return;
  }

  // Show loading
  loadingIndicator.classList.remove("hidden");
  resultsSection.classList.add("hidden");
  analyzeBtn.disabled = true;

  try {
    let resultData = null;

    if (selectedFile && (!textVal || textVal.length < 50)) {
      // Upload file directly to backend API
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Upload failed");
      }
      const data = await res.json();
      currentContractText = data.extracted_text;
      document.getElementById("contractTextInput").value = currentContractText;
      resultData = data.results;
    } else {
      // Analyze text via backend API
      currentContractText = textVal;
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: currentContractText,
          title: currentContractTitle
        })
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Analysis failed");
      }
      const data = await res.json();
      resultData = data.results;
    }

    currentAnalysis = resultData;
    renderResults(resultData);
    
    // Smooth scroll down to results
    setTimeout(() => {
      document.getElementById("resultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

  } catch (error) {
    console.error("Analysis Error:", error);
    alert(`Analysis notice: ${error.message}`);
  } finally {
    loadingIndicator.classList.add("hidden");
    analyzeBtn.disabled = false;
  }
}

// Render Results Dashboard
function renderResults(analysis) {
  const resultsSection = document.getElementById("resultsSection");
  resultsSection.classList.remove("hidden");

  // Safety Score & Progress Circle
  const score = analysis.score;
  const color = analysis.theme_color;
  updateProgressCircle(score, color);

  // Verdict Banner
  document.getElementById("scoreValue").textContent = score;
  document.getElementById("contractDocTitle").textContent = currentContractTitle;
  
  const badgeEl = document.getElementById("verdictBadge");
  badgeEl.textContent = analysis.grade_badge;
  badgeEl.style.backgroundColor = `${color}20`;
  badgeEl.style.borderColor = color;
  badgeEl.style.color = color;

  const titleEl = document.getElementById("verdictTitle");
  if (score >= 80) {
    titleEl.textContent = "Safe & Creator-Friendly Agreement";
    titleEl.style.color = "#10b981";
  } else if (score >= 50) {
    titleEl.textContent = "Moderate Risk — Proposed Amendments Needed";
    titleEl.style.color = "#f59e0b";
  } else {
    titleEl.textContent = "High Risk Trap — Do NOT Sign As-Is!";
    titleEl.style.color = "#ef4444";
  }

  document.getElementById("verdictSummary").textContent = analysis.summary;

  // Stat Counters
  document.getElementById("statCriticalCount").textContent = analysis.critical_count || 0;
  document.getElementById("statHighCount").textContent = analysis.high_count || 0;
  document.getElementById("statMediumCount").textContent = analysis.medium_count || 0;
  document.getElementById("statSolutionCount").textContent = analysis.total_risks_found || 0;

  // Filter count chips
  document.getElementById("countFilterAll").textContent = analysis.total_risks_found || 0;
  document.getElementById("countFilterCrit").textContent = analysis.critical_count || 0;
  document.getElementById("countFilterHigh").textContent = analysis.high_count || 0;
  document.getElementById("countFilterMed").textContent = analysis.medium_count || 0;

  // Category Health Bars
  renderCategoryBars(analysis.category_breakdown || []);

  // Risky Causes & Counter-Offer Solutions (Core user requirement!)
  renderClauseCards(analysis.detected_risks || []);

  // Counter-Offer Email
  renderCounterOfferEmail(analysis.counter_offer_email);
}

// Render Circular Animated Gauge
function updateProgressCircle(score, color) {
  const circle = document.getElementById("scoreProgressCircle");
  if (!circle) return;

  const isDark = document.documentElement.getAttribute("data-theme") !== "light";
  const emptyTrack = isDark ? "#374151" : "#e2e8f0";
  
  const angle = (score / 100) * 360;
  circle.style.background = `conic-gradient(${color} 0deg, ${color} ${angle}deg, ${emptyTrack} ${angle}deg 360deg)`;
}

// Render Category Health Bars
function renderCategoryBars(categories) {
  const container = document.getElementById("categoryBarsGrid");
  container.innerHTML = "";

  categories.forEach(cat => {
    let color = "#10b981";
    if (cat.health < 50) color = "#ef4444";
    else if (cat.health < 80) color = "#f59e0b";

    const card = document.createElement("div");
    card.className = "category-card";
    card.innerHTML = `
      <div class="category-header">
        <span>${cat.category}</span>
        <span style="color: ${color}; font-weight: 700;">${cat.health}% Safe</span>
      </div>
      <div class="category-bar-bg">
        <div class="category-bar-fill" style="width: ${cat.health}%; background-color: ${color};"></div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Render Clause Cards with Solutions
function renderClauseCards(risks) {
  const container = document.getElementById("clausesContainer");
  container.innerHTML = "";

  if (!risks || risks.length === 0) {
    container.innerHTML = `
      <div class="card" style="padding: 32px; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 12px;">🛡️</div>
        <h3>No Predatory Trap Clauses Detected!</h3>
        <p style="color: var(--text-muted); max-width: 500px; margin: 8px auto 0 auto;">
          This agreement does not trigger any of our high-severity predatory flags. The payment terms, IP retention, and liability provisions appear balanced.
        </p>
      </div>
    `;
    return;
  }

  const filtered = selectedFilter === "ALL" 
    ? risks 
    : risks.filter(r => r.severity === selectedFilter);

  filtered.forEach((risk, idx) => {
    let severityClass = "clause-card-critical";
    let badgeHtml = `<span class="badge-crit">🚨 CRITICAL TRAP</span>`;
    
    if (risk.severity === "HIGH") {
      severityClass = "clause-card-high";
      badgeHtml = `<span class="badge-high">⚠️ HIGH RISK</span>`;
    } else if (risk.severity === "MEDIUM") {
      severityClass = "clause-card-medium";
      badgeHtml = `<span class="badge-med">ℹ️ CAUTION</span>`;
    }

    const card = document.createElement("div");
    card.className = `clause-card ${severityClass}`;
    card.innerHTML = `
      <div class="clause-card-header">
        <div class="clause-title-group">
          ${badgeHtml}
          <span class="badge-category">${risk.category}</span>
          <h3>#${idx + 1}. ${risk.title}</h3>
        </div>
      </div>

      <div class="clause-body">
        <!-- 1. Original Clause with Redline Strikethrough -->
        <div class="subpanel-original">
          <div class="subpanel-label label-danger">
            <span>❌ Predatory Clause in Contract (Strikethrough / Redline)</span>
            <small>Dangerous Legalese</small>
          </div>
          <div class="snippet-original-text">"${escapeHtml(risk.matched_snippet)}"</div>
        </div>

        <!-- 2. Plain English Translation & Legal Danger -->
        <div class="explanation-row">
          <div class="expl-card">
            <div class="expl-header" style="color: var(--primary);">
              <span>💡</span> Plain-English "Human" Translation
            </div>
            <div class="expl-content">
              ${escapeHtml(risk.plain_translation)}
            </div>
          </div>

          <div class="expl-card">
            <div class="expl-header" style="color: var(--danger);">
              <span>⚠️</span> Why This Is a Trap For You
            </div>
            <div class="expl-content">
              ${escapeHtml(risk.why_risky)}
            </div>
          </div>
        </div>

        <!-- 3. ACTIONABLE SOLUTION & COUNTER-OFFER CLAUSE (Direct User Requirement) -->
        <div class="subpanel-solution">
          <div class="subpanel-label label-success">
            <span>✨ Recommended Solution / Counter-Offer Clause</span>
            <small>Fair &amp; Creator-Safe Substitute</small>
          </div>
          
          <div class="solution-code-box" id="solutionText-${idx}">
            ${escapeHtml(risk.solution_clause)}
          </div>

          <div class="solution-footer">
            <div class="negotiation-tip">
              💬 <strong>Negotiation Script:</strong> "${escapeHtml(risk.negotiation_tip)}"
            </div>
            <button class="btn-copy-solution" onclick="copySolution(${idx})">
              📋 Copy Solution Clause
            </button>
          </div>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// Copy solution clause
function copySolution(idx) {
  const el = document.getElementById(`solutionText-${idx}`);
  if (el) {
    const textToCopy = el.innerText.trim();
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast("Copied Counter-Offer Clause to clipboard!");
    });
  }
}

// Filter risks
function filterRisks(severity) {
  selectedFilter = severity;
  
  document.querySelectorAll(".filter-chip").forEach(btn => btn.classList.remove("active"));
  
  if (severity === "ALL") {
    document.querySelectorAll(".filter-chip")[0].classList.add("active");
  } else if (severity === "CRITICAL") {
    document.querySelector(".filter-crit").classList.add("active");
  } else if (severity === "HIGH") {
    document.querySelector(".filter-high").classList.add("active");
  } else if (severity === "MEDIUM") {
    document.querySelector(".filter-med").classList.add("active");
  }

  if (currentAnalysis) {
    renderClauseCards(currentAnalysis.detected_risks || []);
  }
}

// Render Counter-Offer Email
function renderCounterOfferEmail(emailData) {
  if (!emailData) return;
  document.getElementById("emailSubject").textContent = emailData.subject || "Proposed Revisions to Agreement";
  document.getElementById("emailBodyText").textContent = emailData.body || "";
  document.getElementById("modalEmailContent").value = emailData.body || "";
}

function copyEmailToClipboard() {
  const bodyText = document.getElementById("emailBodyText").innerText;
  navigator.clipboard.writeText(bodyText).then(() => {
    showToast("Counter-Offer Email copied to clipboard!");
  });
}

function openMailto() {
  const subject = encodeURIComponent(document.getElementById("emailSubject").innerText);
  const body = encodeURIComponent(document.getElementById("emailBodyText").innerText);
  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
}

// Modal logic
function openCounterOfferModal() {
  document.getElementById("emailModal").classList.remove("hidden");
}

function closeEmailModal() {
  document.getElementById("emailModal").classList.add("hidden");
}

function closeModalOnBackdrop(e) {
  if (e.target.id === "emailModal") {
    closeEmailModal();
  }
}

function copyModalEmail() {
  const text = document.getElementById("modalEmailContent").value;
  navigator.clipboard.writeText(text).then(() => {
    showToast("Email text copied to clipboard!");
    closeEmailModal();
  });
}

// Export Redline Report
async function exportRedlineReport() {
  if (!currentContractText) {
    alert("Please analyze a contract before exporting.");
    return;
  }

  try {
    const res = await fetch("/api/redline-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: currentContractText,
        title: currentContractTitle
      })
    });
    
    if (res.ok) {
      const htmlContent = await res.text();
      const reportWindow = window.open("", "_blank");
      reportWindow.document.write(htmlContent);
      reportWindow.document.close();
    } else {
      throw new Error("Failed to export redline report");
    }
  } catch (err) {
    console.error(err);
    alert("Unable to generate export report: " + err.message);
  }
}

function scrollToSolutions() {
  const anchor = document.getElementById("solutionsHeaderAnchor");
  if (anchor) {
    anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Toast notification helper
function showToast(message) {
  const toast = document.getElementById("toastNotification");
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2800);
}

// Utility: HTML Escaper
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
