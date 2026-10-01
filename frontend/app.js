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
  setupLanguage();
  setupDropzone();
  initLatePaymentTool();
  
  // Auto-load first sample contract for instant interactive preview
  loadSample("predatory_dev");
});

function setupLanguage() {
  const lang = typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "en";
  const select = document.getElementById("languageSelect");
  if (select) {
    select.value = lang;
  }
  if (typeof applyTranslations === "function") {
    applyTranslations();
  }
}

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

// Render Circular Animated Gauge
function updateProgressCircle(score, color) {
  const circle = document.getElementById("scoreProgressCircle");
  if (!circle) return;

  const isDark = document.documentElement && document.documentElement.getAttribute("data-theme") !== "light";
  const emptyTrack = isDark ? "#374151" : "#e2e8f0";
  
  const scoreNum = Number(score) || 0;
  const safeColor = color || "#2563eb";
  const angle = Math.max(0, Math.min(360, (scoreNum / 100) * 360));
  circle.style.background = `conic-gradient(${safeColor} 0deg, ${safeColor} ${angle}deg, ${emptyTrack} ${angle}deg 360deg)`;
}

// Render Results Dashboard
function renderResults(analysis) {
  if (!analysis) return;
  const resultsSection = document.getElementById("resultsSection");
  if (resultsSection) resultsSection.classList.remove("hidden");

  // Safety Score & Progress Circle
  const score = analysis.score || 0;
  const color = analysis.theme_color || "#2563eb";
  
  if (typeof updateProgressCircle === "function") {
    updateProgressCircle(score, color);
  }

  // Verdict Banner
  const scoreValEl = document.getElementById("scoreValue");
  if (scoreValEl) scoreValEl.textContent = score;

  const docTitleEl = document.getElementById("contractDocTitle");
  if (docTitleEl) docTitleEl.textContent = currentContractTitle || "Document Analysis";
  
  const badgeEl = document.getElementById("verdictBadge");
  if (badgeEl) {
    badgeEl.textContent = analysis.grade_badge || "ANALYZED";
    badgeEl.style.backgroundColor = `${color}20`;
    badgeEl.style.borderColor = color;
    badgeEl.style.color = color;
  }

  const titleEl = document.getElementById("verdictTitle");
  if (titleEl) {
    if (score >= 80) {
      titleEl.textContent = typeof t === "function" ? t("preset_fair_title", "Safe & Creator-Friendly Agreement") : "Safe & Creator-Friendly Agreement";
      titleEl.style.color = "#10b981";
    } else if (score >= 50) {
      titleEl.textContent = typeof t === "function" ? t("preset_agency_desc", "Moderate Risk — Proposed Amendments Needed") : "Moderate Risk — Proposed Amendments Needed";
      titleEl.style.color = "#f59e0b";
    } else {
      titleEl.textContent = typeof t === "function" ? t("preset_dev_title", "High Risk Trap — Do NOT Sign As-Is!") : "High Risk Trap — Do NOT Sign As-Is!";
      titleEl.style.color = "#ef4444";
    }
  }

  const summaryEl = document.getElementById("verdictSummary");
  if (summaryEl) summaryEl.textContent = analysis.summary || "";

  // Stat Counters
  const critEl = document.getElementById("statCriticalCount");
  if (critEl) critEl.textContent = analysis.critical_count || 0;
  
  const highEl = document.getElementById("statHighCount");
  if (highEl) highEl.textContent = analysis.high_count || 0;
  
  const medEl = document.getElementById("statMediumCount");
  if (medEl) medEl.textContent = analysis.medium_count || 0;
  
  const solEl = document.getElementById("statSolutionCount");
  if (solEl) solEl.textContent = analysis.total_risks_found || 0;

  // Filter count chips
  const fAll = document.getElementById("countFilterAll");
  if (fAll) fAll.textContent = analysis.total_risks_found || 0;
  
  const fCrit = document.getElementById("countFilterCrit");
  if (fCrit) fCrit.textContent = analysis.critical_count || 0;
  
  const fHigh = document.getElementById("countFilterHigh");
  if (fHigh) fHigh.textContent = analysis.high_count || 0;
  
  const fMed = document.getElementById("countFilterMed");
  if (fMed) fMed.textContent = analysis.medium_count || 0;

  // Category Health Bars
  if (typeof renderCategoryBars === "function") {
    renderCategoryBars(analysis.category_breakdown || []);
  }

  // Risky Causes & Counter-Offer Solutions
  if (typeof renderClauseCards === "function") {
    renderClauseCards(analysis.detected_risks || []);
  }

  // Counter-Offer Email
  if (typeof renderCounterOfferEmail === "function") {
    renderCounterOfferEmail(analysis.counter_offer_email);
  }
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
        <span>${escapeHtml(cat.category)}</span>
        <span style="color: ${color}; font-weight: 700;">${Number(cat.health) || 0}% Safe</span>
      </div>
      <div class="category-bar-bg">
        <div class="category-bar-fill" style="width: ${Number(cat.health) || 0}%; background-color: ${color};"></div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Render Clause Cards with Solutions (Supports Multi-language localization)
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

  const lang = typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "en";

  filtered.forEach((origRisk, idx) => {
    const risk = typeof getLocalizedRisk === "function" ? getLocalizedRisk(origRisk, lang) : origRisk;

    let severityClass = "clause-card-critical";
    let badgeHtml = `<span class="badge-crit">${t("badge_crit", "🚨 CRITICAL TRAP")}</span>`;
    
    if (risk.severity === "HIGH") {
      severityClass = "clause-card-high";
      badgeHtml = `<span class="badge-high">${t("badge_high", "⚠️ HIGH RISK")}</span>`;
    } else if (risk.severity === "MEDIUM") {
      severityClass = "clause-card-medium";
      badgeHtml = `<span class="badge-med">${t("badge_med", "ℹ️ CAUTION")}</span>`;
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
            <span>${t("label_original", "❌ Predatory Clause in Contract (Strikethrough / Redline)")}</span>
            <small>${t("label_original_sub", "Dangerous Legalese")}</small>
          </div>
          <div class="snippet-original-text">"${escapeHtml(risk.matched_snippet)}"</div>
        </div>

        <!-- 2. Plain Language Translation & Legal Danger -->
        <div class="explanation-row">
          <div class="expl-card">
            <div class="expl-header" style="color: var(--primary);">
              <span>💡</span> ${t("label_plain", "Plain-Language Translation")}
            </div>
            <div class="expl-content">
              ${escapeHtml(risk.plain_translation)}
            </div>
          </div>

          <div class="expl-card">
            <div class="expl-header" style="color: var(--danger);">
              <span>⚠️</span> ${t("label_why", "Why This Is a Trap For You")}
            </div>
            <div class="expl-content">
              ${escapeHtml(risk.why_risky)}
            </div>
          </div>
        </div>

        <!-- 3. ACTIONABLE SOLUTION & COUNTER-OFFER CLAUSE -->
        <div class="subpanel-solution">
          <div class="subpanel-label label-success">
            <span>${t("label_solution", "✨ Recommended Solution / Counter-Offer Clause")}</span>
            <small>${t("label_solution_sub", "Fair & Creator-Safe Substitute")}</small>
          </div>
          
          <div class="solution-code-box" id="solutionText-${idx}">
            ${escapeHtml(risk.solution_clause)}
          </div>

          <div class="solution-footer">
            <div class="negotiation-tip">
              ${t("label_script", "💬 Negotiation Script:")} "${escapeHtml(risk.negotiation_tip)}"
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${(risk.category === "Payment Terms" || risk.rule_id === "missing_late_payment_penalty" || risk.rule_id === "predatory_payment_terms") ? `
                <button class="btn-copy-solution" style="background: var(--warning-bg); border-color: var(--warning); color: var(--warning);" onclick="openLateFeeCalculatorFromRisk('${escapeHtml(risk.matched_snippet)}')">
                  ⏰ Calculate Overdue Fee
                </button>
              ` : ''}
              <button class="btn-copy-solution" onclick="copySolution(${idx})">
                ${t("btn_copy_solution", "📋 Copy Solution Clause")}
              </button>
            </div>
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
      showToast(t("toast_copied_solution", "Copied Counter-Offer Clause to clipboard!"));
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

// Render Counter-Offer Email in Selected Language
function renderCounterOfferEmail(emailData) {
  const lang = typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "en";
  const localizedEmail = (typeof getLocalizedEmail === "function" && currentAnalysis)
    ? getLocalizedEmail(currentAnalysis.detected_risks || [], lang)
    : (emailData || {});

  document.getElementById("emailSubject").textContent = localizedEmail.subject || "Proposed Revisions to Agreement";
  document.getElementById("emailBodyText").textContent = localizedEmail.body || "";
  document.getElementById("modalEmailContent").value = localizedEmail.body || "";
}

function copyEmailToClipboard() {
  const bodyText = document.getElementById("emailBodyText").innerText;
  navigator.clipboard.writeText(bodyText).then(() => {
    showToast(t("toast_copied_email", "Counter-Offer Email copied to clipboard!"));
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
    showToast(t("toast_copied_email", "Email text copied to clipboard!"));
    closeEmailModal();
  });
}

// Export Redline Report with Selected Language
async function exportRedlineReport() {
  if (!currentContractText) {
    alert("Please analyze a contract before exporting.");
    return;
  }

  const lang = typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "en";

  try {
    const res = await fetch("/api/redline-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: currentContractText,
        title: currentContractTitle,
        language: lang
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

/* ==========================================================================
   Late Payment & Overdue Penalty Tool Logic
   ========================================================================== */

function initLatePaymentTool() {
  const dueDateInput = document.getElementById("lateDueDate");
  if (dueDateInput && !dueDateInput.value) {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    dueDateInput.value = d.toISOString().split("T")[0];
  }
  handleDueDateChange();
}

function toggleLateTool() {
  const body = document.getElementById("lateToolBody");
  const icon = document.getElementById("lateToggleIcon");
  if (!body) return;
  if (body.style.display === "none") {
    body.style.display = "block";
    if (icon) icon.textContent = "▲";
  } else {
    body.style.display = "none";
    if (icon) icon.textContent = "▼";
  }
}

function scrollToLateTool() {
  const sec = document.getElementById("latePaymentToolSection");
  if (sec) {
    const body = document.getElementById("lateToolBody");
    const icon = document.getElementById("lateToggleIcon");
    if (body) {
      body.style.display = "block";
      if (icon) icon.textContent = "▲";
    }
    sec.scrollIntoView({ behavior: "smooth", block: "center" });
    sec.classList.add("highlight-flash");
    setTimeout(() => sec.classList.remove("highlight-flash"), 1500);
  }
}

function handleDueDateChange() {
  const dueDateInput = document.getElementById("lateDueDate");
  const daysInput = document.getElementById("lateDays");
  const reminderBadge = document.getElementById("reminder2DayBadge");
  if (!dueDateInput || !daysInput || !dueDateInput.value) return;
  
  const due = new Date(dueDateInput.value + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Reminder date is exactly 2 days before due date
  const reminderDate = new Date(due);
  reminderDate.setDate(reminderDate.getDate() - 2);
  const reminderStr = reminderDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  if (reminderBadge) {
    reminderBadge.innerHTML = `⏰ Send Reminder On: <strong>${reminderStr}</strong> (2 Days Before)`;
  }

  // Calculate days overdue
  const diffTime = now - due;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  daysInput.value = Math.max(0, diffDays);
  runLateFeeCalculation();
}

function runLateFeeCalculation() {
  const currency = document.getElementById("lateCurrency")?.value || "$";
  const amount = Math.max(0, parseFloat(document.getElementById("lateAmount")?.value || 0));
  const rateMonthly = Math.max(0, parseFloat(document.getElementById("lateRate")?.value || 1.5));
  const daysOverdue = Math.max(0, parseInt(document.getElementById("lateDays")?.value || 0));
  const flatFee = Math.max(0, parseFloat(document.getElementById("lateFlatFee")?.value || 0));
  const dueDateVal = document.getElementById("lateDueDate")?.value;

  let dueDateFormatted = "[Due Date]";
  let reminderDateFormatted = "[2 Days Prior Date]";
  if (dueDateVal) {
    const d = new Date(dueDateVal + "T00:00:00");
    dueDateFormatted = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const r = new Date(d);
    r.setDate(r.getDate() - 2);
    reminderDateFormatted = r.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  // Daily interest calculation: (monthly / 30) / 100
  const dailyRate = (rateMonthly / 100) / 30;
  const interest = amount * dailyRate * daysOverdue;
  const extraPayment = interest + flatFee;
  const totalDue = amount + extraPayment;

  // Format currency
  const fmt = (num) => currency + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const kpiOrig = document.getElementById("kpiOriginal");
  const kpiExtra = document.getElementById("kpiExtra");
  const kpiTot = document.getElementById("kpiTotal");
  const statusPill = document.getElementById("lateStatusPill");

  if (kpiOrig) kpiOrig.textContent = fmt(amount);
  if (kpiExtra) kpiExtra.textContent = "+" + fmt(extraPayment);
  if (kpiTot) kpiTot.textContent = fmt(totalDue);

  if (statusPill) {
    if (daysOverdue > 0) {
      statusPill.innerHTML = `⚠️ <strong>${daysOverdue} Days Overdue:</strong> Client missed payment date. Total extra fee owed is <strong>+${fmt(extraPayment)}</strong>. You have the right to suspend all active work until paid.`;
      statusPill.style.background = "var(--warning-bg)";
      statusPill.style.borderColor = "var(--warning-border)";
      statusPill.style.color = "var(--warning)";
    } else {
      statusPill.innerHTML = `⏰ <strong>Upcoming Due Date (${dueDateFormatted}):</strong> Send the <strong>2-Day Advance Courtesy Reminder</strong> on <strong>${reminderDateFormatted}</strong> so client doesn't miss the date!`;
      statusPill.style.background = "var(--primary-light)";
      statusPill.style.borderColor = "rgba(59, 130, 246, 0.35)";
      statusPill.style.color = "var(--primary)";
    }
  }

  // Update Contract Clause Preview
  const clausePreview = document.getElementById("lateClausePreviewText");
  if (clausePreview) {
    clausePreview.textContent = 
`"Late Payment Penalty and Pre-Due Courtesy Notice: Payment of all invoices shall be strictly due within [Net-14 / Net-30] calendar days of issuance. Freelancer shall issue a courtesy invoice reminder two (2) calendar days prior to the payment due date. If Client fails to make payment on or before the agreed due date, Client shall incur and pay an additional late payment penalty interest of ${rateMonthly}% per month (or the maximum allowable rate by statutory law), calculated daily on the outstanding balance from the due date until paid in full. Freelancer reserves the right to immediately pause all active services and withhold deliverable licenses until all overdue amounts and extra late payment penalties are settled in full."`;
  }

  // Update 2-Day Pre-Due Reminder Email Preview
  const reminderPreview = document.getElementById("lateReminderPreviewText");
  if (reminderPreview) {
    reminderPreview.textContent = 
`Subject: Friendly Reminder: Invoice for ${fmt(amount)} is due in 2 days (${dueDateFormatted})

Dear [Client Name / Hiring Manager],

Hope you are having a great week!

This is a quick courtesy reminder that Invoice #[Invoice Number] in the amount of ${fmt(amount)} for [Project Name / Milestone Deliverables] is scheduled for payment in two (2) days on ${dueDateFormatted}.

To keep project development and milestone delivery moving forward seamlessly without interruption or late fee accrual (${rateMonthly}%/month after due date), please process payment via your preferred method:
- Payment Link / Portal: [Insert Payment Link]
- Direct Bank Wire / UPI: [Insert Bank/UPI Details]

If payment has already been scheduled or initiated, please feel free to disregard this note and reply with the transaction receipt.

Thank you very much for your partnership and prompt collaboration!

Warm regards,
[Your Name]
Freelance Contractor | [Your Contact Details]`;
  }

  // Update Overdue Notice Email Preview
  const emailPreview = document.getElementById("lateEmailPreviewText");
  if (emailPreview) {
    emailPreview.textContent = 
`Subject: URGENT: Overdue Invoice Notice — Late Payment Fee Applied (${fmt(extraPayment)})

Dear [Client Name / Hiring Manager],

This is a formal payment notice regarding your outstanding invoice in the amount of ${fmt(amount)}, which was due on ${dueDateFormatted} and is currently ${daysOverdue} days past due.

In accordance with standard independent contractor terms and our agreed payment policy, overdue balances accrue an additional late payment interest fee of ${rateMonthly}% per month (${fmt(interest)}${flatFee > 0 ? ` plus a ${fmt(flatFee)} administrative surcharge` : ''}).

The revised total balance now outstanding is ${fmt(totalDue)}:
- Original Invoiced Amount: ${fmt(amount)}
- Accrued Extra Late Fee (${daysOverdue} days @ ${rateMonthly}%/mo): +${fmt(extraPayment)}
--------------------------------------------------
TOTAL AMOUNT DUE IMMEDIATELY: ${fmt(totalDue)}

To ensure project delivery schedules are not interrupted, please remit the total payment of ${fmt(totalDue)} immediately via [Payment Link / Bank Details].

Kindly reply with the transaction confirmation once payment has been submitted.

Thank you for your prompt cooperation.

Sincerely,
[Your Name]
Freelance Contractor | [Your Contact Details]`;
  }
}

function switchLatePreviewTab(tab) {
  const clauseBtn = document.getElementById("tabLateClauseBtn");
  const reminderBtn = document.getElementById("tabLateReminderBtn");
  const emailBtn = document.getElementById("tabLateEmailBtn");
  const clauseBox = document.getElementById("lateClausePreviewContainer");
  const reminderBox = document.getElementById("lateReminderPreviewContainer");
  const emailBox = document.getElementById("lateEmailPreviewContainer");

  [clauseBtn, reminderBtn, emailBtn].forEach(b => b?.classList.remove("active"));
  [clauseBox, reminderBox, emailBox].forEach(b => b?.classList.add("hidden"));

  if (tab === "clause") {
    clauseBtn?.classList.add("active");
    clauseBox?.classList.remove("hidden");
  } else if (tab === "reminder") {
    reminderBtn?.classList.add("active");
    reminderBox?.classList.remove("hidden");
  } else {
    emailBtn?.classList.add("active");
    emailBox?.classList.remove("hidden");
  }
}

function copyLatePenaltyClause() {
  const preview = document.getElementById("lateClausePreviewText");
  if (preview) {
    navigator.clipboard.writeText(preview.textContent.trim()).then(() => {
      showToast(t("toast_copied_late_clause", "Late Payment Contract Clause copied to clipboard!"));
    });
  }
}

function copyLate2DayReminderEmail() {
  const preview = document.getElementById("lateReminderPreviewText");
  if (preview) {
    navigator.clipboard.writeText(preview.textContent.trim()).then(() => {
      showToast(t("toast_copied_reminder", "2-Day Pre-Due Reminder Email copied to clipboard!"));
    });
  }
}

function copyLateNoticeEmail() {
  const preview = document.getElementById("lateEmailPreviewText");
  if (preview) {
    navigator.clipboard.writeText(preview.textContent.trim()).then(() => {
      showToast(t("toast_copied_late_notice", "Overdue Payment Notice Email copied to clipboard!"));
    });
  }
}

function openLateFeeCalculatorFromRisk(snippet) {
  scrollToLateTool();
  let match = (snippet || "").match(/\$([\d,]+)/);
  if (!match && currentContractText) {
    match = currentContractText.match(/\$([\d,]+)/);
  }
  if (match) {
    const rawVal = parseFloat(match[1].replace(/,/g, ""));
    const amountInput = document.getElementById("lateAmount");
    if (amountInput && !isNaN(rawVal)) {
      amountInput.value = rawVal;
      runLateFeeCalculation();
    }
  }
}

// User Auth Navigation bar sync
function initUserAuthNav() {
  const token = sessionStorage.getItem('lexshield_user_token');
  const userDataStr = sessionStorage.getItem('lexshield_user_data');
  
  // Header bar elements
  const signInBtn = document.getElementById('signInNavBtn');
  const userProfileNav = document.getElementById('userProfileNav');
  const userNavName = document.getElementById('userNavName');
  const userNavInitials = document.getElementById('userNavInitials');

  // Three dots menu elements
  const menuSignInBtn = document.getElementById('menuSignInBtn');
  const menuUserProfile = document.getElementById('menuUserProfile');
  const menuUserName = document.getElementById('menuUserName');
  const menuUserEmail = document.getElementById('menuUserEmail');
  const menuUserInitials = document.getElementById('menuUserInitials');

  if (token && userDataStr) {
    try {
      const user = JSON.parse(userDataStr);
      
      // Update main nav bar
      if (signInBtn) signInBtn.style.display = 'none';
      if (userProfileNav) userProfileNav.style.display = 'flex';
      if (userNavName) userNavName.textContent = user.full_name || user.email || 'User';
      if (userNavInitials) {
        const nameParts = (user.full_name || 'U').split(' ');
        const initials = nameParts.length > 1 
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : nameParts[0].substring(0, 2).toUpperCase();
        userNavInitials.textContent = initials;
      }

      // Update 3-dots menu
      if (menuSignInBtn) menuSignInBtn.style.display = 'none';
      if (menuUserProfile) menuUserProfile.style.display = 'flex';
      if (menuUserName) menuUserName.textContent = user.full_name || 'User';
      if (menuUserEmail) menuUserEmail.textContent = user.email || '';
      if (menuUserInitials) {
        const nameParts = (user.full_name || 'U').split(' ');
        const initials = nameParts.length > 1 
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : nameParts[0].substring(0, 2).toUpperCase();
        menuUserInitials.textContent = initials;
      }
    } catch (e) {
      if (signInBtn) signInBtn.style.display = 'inline-flex';
      if (userProfileNav) userProfileNav.style.display = 'none';
      if (menuSignInBtn) menuSignInBtn.style.display = 'flex';
      if (menuUserProfile) menuUserProfile.style.display = 'none';
    }
  } else {
    if (signInBtn) signInBtn.style.display = 'inline-flex';
    if (userProfileNav) userProfileNav.style.display = 'none';
    if (menuSignInBtn) menuSignInBtn.style.display = 'flex';
    if (menuUserProfile) menuUserProfile.style.display = 'none';
  }
}

function logoutUserNav() {
  sessionStorage.removeItem('lexshield_user_token');
  sessionStorage.removeItem('lexshield_user_data');
  initUserAuthNav();
  const menu = document.getElementById('threeDotsMenu');
  if (menu) menu.style.display = 'none';
  if (typeof showToast === 'function') {
    showToast('Signed out successfully.');
  }
}

// Toggle Three Dots Menu
function toggleHeaderMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('threeDotsMenu');
  const btn = document.getElementById('threeDotsBtn');
  if (!menu) return;

  const isVisible = menu.style.display !== 'none';
  if (isVisible) {
    menu.style.display = 'none';
    if (btn) btn.classList.remove('active');
  } else {
    menu.style.display = 'block';
    if (btn) btn.classList.add('active');
    
    // Sync language menu dropdown with current language
    const currentLang = localStorage.getItem('lexshield_lang') || 'en';
    const langMenuSelect = document.getElementById('languageSelect') || document.getElementById('languageSelectMenu');
    if (langMenuSelect) langMenuSelect.value = currentLang;
  }
}

// Close Three Dots Menu when clicking outside
document.addEventListener('click', (e) => {
  const menu = document.getElementById('threeDotsMenu');
  const btn = document.getElementById('threeDotsBtn');
  if (menu && menu.style.display !== 'none' && !menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
    menu.style.display = 'none';
    if (btn) btn.classList.remove('active');
  }
});

// Profile Modal & Settings Handlers
function openProfileModal(defaultTab = 'info') {
  const modal = document.getElementById('userProfileModal');
  if (!modal) return;

  const userDataStr = sessionStorage.getItem('lexshield_user_data');
  if (!userDataStr) {
    window.location.href = '/login.html';
    return;
  }

  try {
    const user = JSON.parse(userDataStr);
    
    // Fill fields
    const profFullName = document.getElementById('profFullName');
    const profEmail = document.getElementById('profEmail');
    const profRole = document.getElementById('profRole');
    const profOrg = document.getElementById('profOrg');
    const profScansCount = document.getElementById('profScansCount');
    const modalEmailSub = document.getElementById('profileModalEmailSub');
    const modalInitials = document.getElementById('profileModalInitials');

    if (profFullName) profFullName.value = user.full_name || '';
    if (profEmail) profEmail.value = user.email || '';
    if (profOrg) profOrg.value = user.organization || '';
    if (profRole && user.role) profRole.value = user.role;
    if (profScansCount) profScansCount.innerHTML = `Total Contract Scans: <strong>${user.scans_count || 0}</strong>`;
    if (modalEmailSub) modalEmailSub.textContent = user.email || '';
    
    if (modalInitials) {
      const nameParts = (user.full_name || 'U').split(' ');
      const initials = nameParts.length > 1 
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : nameParts[0].substring(0, 2).toUpperCase();
      modalInitials.textContent = initials;
    }

    // Fill preferences if present
    const prefs = user.preferences || {};
    const prefCurrency = document.getElementById('prefCurrency');
    const prefLateRate = document.getElementById('prefLateRate');
    const prefAutoSave = document.getElementById('prefAutoSave');
    const prefEmailReminders = document.getElementById('prefEmailReminders');

    if (prefCurrency && prefs.default_currency) prefCurrency.value = prefs.default_currency;
    if (prefLateRate && prefs.default_late_rate) prefLateRate.value = String(prefs.default_late_rate);
    if (prefAutoSave) prefAutoSave.checked = prefs.auto_save_scans !== false;
    if (prefEmailReminders) prefEmailReminders.checked = prefs.email_reminders !== false;

  } catch (e) {
    console.error("Error opening profile:", e);
  }

  switchProfileTab(defaultTab);
  modal.classList.remove('hidden');
}

function closeProfileModal() {
  const modal = document.getElementById('userProfileModal');
  if (modal) modal.classList.add('hidden');
  const notice = document.getElementById('profileModalNotice');
  if (notice) notice.classList.add('hidden');
}

function switchProfileTab(tab) {
  const btnInfo = document.getElementById('tabProfileInfoBtn');
  const btnPrefs = document.getElementById('tabProfilePrefsBtn');
  const btnSec = document.getElementById('tabProfileSecBtn');

  const contentInfo = document.getElementById('profileTabInfo');
  const contentPrefs = document.getElementById('profileTabPrefs');
  const contentSec = document.getElementById('profileTabSecurity');

  [btnInfo, btnPrefs, btnSec].forEach(btn => btn && btn.classList.remove('active'));
  [contentInfo, contentPrefs, contentSec].forEach(c => c && c.classList.add('hidden'));

  if (tab === 'prefs') {
    if (btnPrefs) btnPrefs.classList.add('active');
    if (contentPrefs) contentPrefs.classList.remove('hidden');
  } else if (tab === 'security') {
    if (btnSec) btnSec.classList.add('active');
    if (contentSec) contentSec.classList.remove('hidden');
  } else {
    if (btnInfo) btnInfo.classList.add('active');
    if (contentInfo) contentInfo.classList.remove('hidden');
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const token = sessionStorage.getItem('lexshield_user_token');
  const fullName = document.getElementById('profFullName').value.trim();
  const role = document.getElementById('profRole').value;
  const org = document.getElementById('profOrg').value.trim();
  const btn = document.getElementById('btnSaveProfileInfo');

  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        full_name: fullName,
        role: role,
        organization: org
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      sessionStorage.setItem('lexshield_user_data', JSON.stringify(data.user));
      initUserAuthNav();
      showToast('Profile updated successfully!');
      showModalNotice('Profile updated successfully!', 'success');
    } else {
      showModalNotice(data.detail || data.error || 'Failed to update profile.', 'error');
    }
  } catch (err) {
    showModalNotice('Network error updating profile.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handlePreferencesUpdate(e) {
  e.preventDefault();
  const token = sessionStorage.getItem('lexshield_user_token');
  const currency = document.getElementById('prefCurrency').value;
  const lateRate = parseFloat(document.getElementById('prefLateRate').value);
  const autoSave = document.getElementById('prefAutoSave').checked;
  const reminders = document.getElementById('prefEmailReminders').checked;
  const btn = document.getElementById('btnSavePreferences');

  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        preferences: {
          default_currency: currency,
          default_late_rate: lateRate,
          auto_save_scans: autoSave,
          email_reminders: reminders
        }
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      sessionStorage.setItem('lexshield_user_data', JSON.stringify(data.user));
      
      // Update late fee calculator defaults on home page
      const lateCurrSelect = document.getElementById('lateCurrency');
      const lateRateSelect = document.getElementById('lateRate');
      if (lateCurrSelect) lateCurrSelect.value = currency;
      if (lateRateSelect) lateRateSelect.value = String(lateRate);

      showToast('Preferences saved!');
      showModalNotice('Preferences saved successfully!', 'success');
    } else {
      showModalNotice(data.detail || data.error || 'Failed to save preferences.', 'error');
    }
  } catch (err) {
    showModalNotice('Network error saving preferences.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  const token = sessionStorage.getItem('lexshield_user_token');
  const oldPass = document.getElementById('passOld').value;
  const newPass = document.getElementById('passNew').value;
  const confirmPass = document.getElementById('passConfirm').value;
  const btn = document.getElementById('btnChangePassword');

  if (newPass !== confirmPass) {
    showModalNotice('New passwords do not match.', 'error');
    return;
  }

  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        old_password: oldPass,
        new_password: newPass
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      document.getElementById('passOld').value = '';
      document.getElementById('passNew').value = '';
      document.getElementById('passConfirm').value = '';
      showToast('Password changed successfully!');
      showModalNotice('Password changed successfully!', 'success');
    } else {
      showModalNotice(data.detail || data.error || 'Failed to change password.', 'error');
    }
  } catch (err) {
    showModalNotice('Network error changing password.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function showModalNotice(msg, type = 'success') {
  const notice = document.getElementById('profileModalNotice');
  if (!notice) return;
  notice.textContent = msg;
  notice.className = `notice-chip notice-${type}`;
  notice.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  initUserAuthNav();
});

