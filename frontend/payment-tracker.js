/**
 * LexShield AI — Payment Evidence & Deadline Tracker Logic
 * Real-time deadline calculation, overdue interest accrual, proof upload, and Supabase integration.
 */

let payments = [];
let currentFilter = 'all';
let currentEvidenceDataUrl = '';

// Sample fallback items for instant demonstration
const DEFAULT_PAYMENTS = [
  {
    id: "pay_sample_1",
    client_name: "Apex Global Media",
    project_title: "Fullstack SaaS Dashboard v1",
    invoice_number: "INV-2026-081",
    amount: 3200,
    currency: "$",
    due_date: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0], // 14 days overdue
    status: "pending",
    payment_method: "Wire Transfer",
    evidence_type: "work_delivery",
    evidence_data: "PR #42 merged, signed release form delivered via DocuSign",
    evidence_notes: "Code deployed to client staging. Client acknowledged receipt on Oct 15.",
    payment_received_date: "",
    monthly_penalty_rate: 1.5
  },
  {
    id: "pay_sample_2",
    client_name: "FinTech Ventures LLC",
    project_title: "Security & OWASP Compliance Audit",
    invoice_number: "INV-2026-094",
    amount: 1850,
    currency: "$",
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], // Due in 3 days
    status: "pending",
    payment_method: "Stripe",
    evidence_type: "",
    evidence_data: "",
    evidence_notes: "Milestone 2 deliverable package sent via email.",
    payment_received_date: "",
    monthly_penalty_rate: 2.0
  },
  {
    id: "pay_sample_3",
    client_name: "Krypton Labs",
    project_title: "Smart Contract Frontend & Web3 UI",
    invoice_number: "INV-2026-077",
    amount: 4500,
    currency: "$",
    due_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    status: "paid",
    payment_method: "USDC / Ethereum",
    evidence_type: "txn_hash",
    evidence_data: "0x3f9a72b14c19ef7b5a31a980c65de4e3752e8976b9f302b1c",
    evidence_notes: "Settled on chain via ERC-20 payment.",
    payment_received_date: new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0],
    monthly_penalty_rate: 1.5
  }
];

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  checkUserSession();
  loadPayments();
  init3DCanvas();
});

function getAuthHeader() {
  const token = localStorage.getItem("lexshield_token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

function checkUserSession() {
  const userStr = localStorage.getItem("lexshield_user");
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      const userNav = document.getElementById("userProfileNav");
      const signNav = document.getElementById("signInNavBtn");
      const nameEl = document.getElementById("userNavName");
      const initEl = document.getElementById("userNavInitials");

      if (userNav && signNav) {
        userNav.style.display = "flex";
        signNav.style.display = "none";
        if (nameEl) nameEl.textContent = u.full_name || u.email;
        if (initEl) initEl.textContent = (u.full_name || u.email).charAt(0).toUpperCase();
      }
    } catch (e) {}
  }
}

async function loadPayments() {
  try {
    const res = await fetch("/api/payments", {
      headers: { ...getAuthHeader() }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.payments && data.payments.length > 0) {
        payments = data.payments;
      } else {
        payments = [...DEFAULT_PAYMENTS];
      }
    } else {
      payments = [...DEFAULT_PAYMENTS];
    }
  } catch (err) {
    payments = [...DEFAULT_PAYMENTS];
  }
  renderPaymentsTable();
  updateKPIs();
}

function calculateOverdueDays(dueDateStr) {
  const due = new Date(dueDateStr);
  const now = new Date();
  // reset hours
  due.setHours(0,0,0,0);
  now.setHours(0,0,0,0);
  const diffTime = now - due;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function calculatePenalty(amount, daysOverdue, monthlyRate = 1.5) {
  if (daysOverdue <= 0) return 0;
  const dailyRate = (monthlyRate / 100) / 30;
  return amount * dailyRate * daysOverdue;
}

function updateKPIs() {
  let outstanding = 0;
  let overdue = 0;
  let penalties = 0;
  let settled = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  let verifiedCount = 0;

  payments.forEach(p => {
    const amt = parseFloat(p.amount) || 0;
    const days = calculateOverdueDays(p.due_date);

    if (p.status === "paid") {
      settled += amt;
      if (p.evidence_type) verifiedCount++;
    } else {
      outstanding += amt;
      pendingCount++;
      if (days > 0) {
        overdue += amt;
        overdueCount++;
        penalties += calculatePenalty(amt, days, p.monthly_penalty_rate || 1.5);
      }
    }
  });

  const cur = payments.length > 0 ? (payments[0].currency || "$") : "$";

  document.getElementById("kpiTotalOutstanding").textContent = `${cur}${outstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById("kpiTotalOverdue").textContent = `${cur}${overdue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById("kpiLatePenalties").textContent = `+${cur}${penalties.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById("kpiTotalSettled").textContent = `${cur}${settled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  document.getElementById("kpiPendingCount").textContent = `${pendingCount} pending invoices`;
  document.getElementById("kpiOverdueCount").textContent = `${overdueCount} delayed past due date`;
  document.getElementById("kpiVerifiedCount").textContent = `${verifiedCount} verified with proof`;

  // Update Toolbar counts
  document.getElementById("countAll").textContent = payments.length;
  document.getElementById("countOverdue").textContent = payments.filter(p => p.status !== 'paid' && calculateOverdueDays(p.due_date) > 0).length;
  document.getElementById("countSoon").textContent = payments.filter(p => p.status !== 'paid' && calculateOverdueDays(p.due_date) <= 0 && calculateOverdueDays(p.due_date) >= -7).length;
  document.getElementById("countPending").textContent = payments.filter(p => p.status === 'pending').length;
  document.getElementById("countPaid").textContent = payments.filter(p => p.status === 'paid').length;
}

function renderPaymentsTable() {
  const tbody = document.getElementById("paymentsTableBody");
  const emptyState = document.getElementById("emptyState");
  tbody.innerHTML = "";

  const q = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();

  const filtered = payments.filter(p => {
    // text query match
    const matchQuery = !q ||
      p.client_name.toLowerCase().includes(q) ||
      p.project_title.toLowerCase().includes(q) ||
      (p.invoice_number && p.invoice_number.toLowerCase().includes(q));

    if (!matchQuery) return false;

    const days = calculateOverdueDays(p.due_date);
    if (currentFilter === "all") return true;
    if (currentFilter === "overdue") return p.status !== "paid" && days > 0;
    if (currentFilter === "due-soon") return p.status !== "paid" && days <= 0 && days >= -7;
    if (currentFilter === "pending") return p.status === "pending";
    if (currentFilter === "paid") return p.status === "paid";
    return true;
  });

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  filtered.forEach(p => {
    const days = calculateOverdueDays(p.due_date);
    const amt = parseFloat(p.amount) || 0;
    const cur = p.currency || "$";
    const penalty = calculatePenalty(amt, days, p.monthly_penalty_rate || 1.5);

    let statusBadge = "";
    if (p.status === "paid") {
      statusBadge = `<span class="badge-status badge-status-paid">✅ Paid</span>`;
    } else if (days > 0) {
      statusBadge = `<span class="badge-status badge-status-overdue">⚠️ ${days}d Overdue</span>`;
    } else if (days >= -7) {
      statusBadge = `<span class="badge-status badge-status-due-soon">⏰ In ${Math.abs(days)}d</span>`;
    } else {
      statusBadge = `<span class="badge-status badge-status-pending">⏳ Pending</span>`;
    }

    let evidenceBadge = `<span class="evidence-badge-none">No proof attached</span>`;
    if (p.evidence_type || p.evidence_data) {
      const typeLabel = {
        txn_hash: "🔗 Txn ID",
        receipt_file: "📄 Receipt File",
        email_confirmation: "✉️ Email Conf.",
        work_delivery: "📦 Delivery Sign-off"
      }[p.evidence_type] || "📁 Proof Attached";
      evidenceBadge = `<button class="evidence-badge" onclick="viewEvidenceModal('${p.id}')"><span>${typeLabel}</span></button>`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${statusBadge}</td>
      <td>
        <div class="client-name-cell">${escapeHtml(p.client_name)}</div>
        <div class="project-name-cell">${escapeHtml(p.project_title)}</div>
      </td>
      <td><span class="invoice-badge-cell">${p.invoice_number ? escapeHtml(p.invoice_number) : '—'}</span></td>
      <td><span class="amount-main">${cur}${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
      <td>
        <strong>${p.due_date}</strong>
        ${p.payment_received_date ? `<br><small style="color: var(--success);">Paid: ${p.payment_received_date}</small>` : ''}
      </td>
      <td>
        ${days > 0 && p.status !== 'paid' ? `
          <div class="penalty-cell-tag">+${cur}${penalty.toFixed(2)}</div>
          <small style="color: var(--text-muted); font-size: 11px;">@ ${p.monthly_penalty_rate || 1.5}%/mo</small>
        ` : (p.status === 'paid' ? '<small style="color: var(--success);">Settled in Full</small>' : '<small style="color: var(--text-muted);">Grace period</small>')}
      </td>
      <td>${evidenceBadge}</td>
      <td>
        <div class="table-actions-cell">
          <button class="btn-action-icon" title="View Proof &amp; Overdue Notice" onclick="viewEvidenceModal('${p.id}')">📜</button>
          <button class="btn-action-icon" title="Edit Entry" onclick="editPaymentItem('${p.id}')">✏️</button>
          <button class="btn-action-icon danger" title="Delete Entry" onclick="deletePaymentItem('${p.id}')">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll(".toolbar-filters .filter-pill").forEach(el => el.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderPaymentsTable();
}

function filterPayments() {
  renderPaymentsTable();
}

// ── Modals & Actions ──────────────────────────────────────────

function openNewPaymentModal() {
  document.getElementById("modalHeaderTitle").textContent = "Add Payment Deadline & Evidence";
  document.getElementById("paymentForm").reset();
  document.getElementById("formPaymentId").value = "";
  document.getElementById("formDueDate").value = new Date().toISOString().split("T")[0];
  document.getElementById("formCurrency").value = "$";
  document.getElementById("formStatus").value = "pending";
  document.getElementById("fileUploadPreview").classList.add("hidden");
  currentEvidenceDataUrl = "";
  document.getElementById("paymentModal").classList.remove("hidden");
}

function closePaymentModal() {
  document.getElementById("paymentModal").classList.add("hidden");
}

function editPaymentItem(id) {
  const p = payments.find(x => x.id === id);
  if (!p) return;

  document.getElementById("modalHeaderTitle").textContent = "Edit Payment Deadline & Evidence";
  document.getElementById("formPaymentId").value = p.id;
  document.getElementById("formClient").value = p.client_name || "";
  document.getElementById("formProject").value = p.project_title || "";
  document.getElementById("formInvoice").value = p.invoice_number || "";
  document.getElementById("formAmount").value = p.amount || "";
  document.getElementById("formCurrency").value = p.currency || "$";
  document.getElementById("formDueDate").value = p.due_date || "";
  document.getElementById("formStatus").value = p.status || "pending";
  document.getElementById("formPenaltyRate").value = p.monthly_penalty_rate || 1.5;
  document.getElementById("formEvidenceType").value = p.evidence_type || "";
  document.getElementById("formEvidenceData").value = p.evidence_data || "";
  document.getElementById("formPaidDate").value = p.payment_received_date || "";
  document.getElementById("formEvidenceNotes").value = p.evidence_notes || "";

  currentEvidenceDataUrl = p.evidence_data && p.evidence_data.startsWith("data:") ? p.evidence_data : "";
  const prevEl = document.getElementById("fileUploadPreview");
  if (currentEvidenceDataUrl) {
    prevEl.innerHTML = `✅ Attached file uploaded`;
    prevEl.classList.remove("hidden");
  } else {
    prevEl.classList.add("hidden");
  }

  document.getElementById("paymentModal").classList.remove("hidden");
}

async function handleSavePayment(e) {
  e.preventDefault();
  const id = document.getElementById("formPaymentId").value;
  const client_name = document.getElementById("formClient").value.trim();
  const project_title = document.getElementById("formProject").value.trim();
  const invoice_number = document.getElementById("formInvoice").value.trim();
  const amount = parseFloat(document.getElementById("formAmount").value) || 0;
  const currency = document.getElementById("formCurrency").value;
  const due_date = document.getElementById("formDueDate").value;
  const status = document.getElementById("formStatus").value;
  const monthly_penalty_rate = parseFloat(document.getElementById("formPenaltyRate").value) || 1.5;
  const evidence_type = document.getElementById("formEvidenceType").value;
  const formEvData = document.getElementById("formEvidenceData").value.trim();
  const evidence_data = currentEvidenceDataUrl || formEvData;
  const payment_received_date = document.getElementById("formPaidDate").value;
  const evidence_notes = document.getElementById("formEvidenceNotes").value.trim();

  const payload = {
    id: id || undefined,
    client_name,
    project_title,
    invoice_number,
    amount,
    currency,
    due_date,
    status,
    monthly_penalty_rate,
    evidence_type,
    evidence_data,
    payment_received_date,
    evidence_notes
  };

  const btn = document.getElementById("btnSavePayment");
  btn.disabled = true;

  try {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader()
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const saved = data.payment;
      const idx = payments.findIndex(x => x.id === saved.id);
      if (idx >= 0) {
        payments[idx] = saved;
      } else {
        payments.unshift(saved);
      }
      showToast("✅ Payment tracker & evidence saved successfully!");
    } else {
      // Local fallback
      if (!payload.id) payload.id = "pay_" + Math.random().toString(36).substring(2, 9);
      const idx = payments.findIndex(x => x.id === payload.id);
      if (idx >= 0) payments[idx] = payload;
      else payments.unshift(payload);
      showToast("Saved to local offline session.");
    }
  } catch (err) {
    if (!payload.id) payload.id = "pay_" + Math.random().toString(36).substring(2, 9);
    payments.unshift(payload);
    showToast("Saved locally (offline mode).");
  } finally {
    btn.disabled = false;
    closePaymentModal();
    renderPaymentsTable();
    updateKPIs();
  }
}

async function deletePaymentItem(id) {
  if (!confirm("Are you sure you want to remove this payment deadline tracking entry?")) return;
  payments = payments.filter(x => x.id !== id);
  try {
    await fetch(`/api/payments/${id}`, {
      method: "DELETE",
      headers: { ...getAuthHeader() }
    });
  } catch (e) {}
  showToast("🗑️ Payment record removed.");
  renderPaymentsTable();
  updateKPIs();
}

function handleEvidenceFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert("File too large. Maximum allowed size is 5MB.");
    e.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    currentEvidenceDataUrl = ev.target.result;
    const preview = document.getElementById("fileUploadPreview");
    preview.innerHTML = `📎 Attached: <strong>${escapeHtml(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
    preview.classList.remove("hidden");
    if (!document.getElementById("formEvidenceType").value) {
      document.getElementById("formEvidenceType").value = "receipt_file";
    }
  };
  reader.readAsDataURL(file);
}

// ── Evidence View & Demand Notice Generator ───────────────────

function viewEvidenceModal(id) {
  const p = payments.find(x => x.id === id);
  if (!p) return;

  const days = calculateOverdueDays(p.due_date);
  const amt = parseFloat(p.amount) || 0;
  const cur = p.currency || "$";
  const penalty = calculatePenalty(amt, days, p.monthly_penalty_rate || 1.5);
  const total = amt + penalty;

  document.getElementById("evidenceViewTitle").textContent = `${p.client_name} — ${p.project_title}`;
  document.getElementById("evidenceViewSubtitle").textContent = `Invoice #${p.invoice_number || 'N/A'} • Due: ${p.due_date} (${days > 0 ? days + ' days overdue' : 'On schedule'})`;

  let fileDisplay = '';
  if (p.evidence_data && p.evidence_data.startsWith("data:image/")) {
    fileDisplay = `<div style="margin-top: 10px;"><strong>Proof Screenshot:</strong><br><img src="${p.evidence_data}" class="evidence-preview-img" alt="Proof Receipt" /></div>`;
  } else if (p.evidence_data && p.evidence_data.startsWith("http")) {
    fileDisplay = `<div style="margin-top: 10px;"><strong>Proof Link:</strong> <a href="${p.evidence_data}" target="_blank" style="color: var(--primary);">${escapeHtml(p.evidence_data)}</a></div>`;
  }

  const overdueNoticeBody = `Dear ${p.client_name} Team,\n\n` +
    `I hope this email finds you well.\n\n` +
    `This is a formal reminder regarding outstanding Invoice #${p.invoice_number || '[Invoice #]'} ` +
    `for ${cur}${amt.toFixed(2)} relating to "${p.project_title}", which was due on ${p.due_date} ` +
    `and is now ${days} days overdue.\n\n` +
    `Per the late payment penalty clause agreed upon, invoices delayed past the due date accrue late interest ` +
    `at the rate of ${p.monthly_penalty_rate || 1.5}% per month (+${cur}${penalty.toFixed(2)} accrued to date).\n\n` +
    `REVISED TOTAL BALANCE DUE: ${cur}${total.toFixed(2)}\n\n` +
    `Please process payment immediately via our agreed payment method (${p.payment_method || 'Bank Wire/Portal'}). ` +
    `Kindly reply with the payment confirmation reference or receipt slip upon dispatch.\n\n` +
    `Thank you for your cooperation.\n\n` +
    `Best regards,\n[Your Name]\nFreelancer / Independent Contractor`;

  const bodyEl = document.getElementById("evidenceViewBody");
  bodyEl.innerHTML = `
    <div class="evidence-detail-grid">
      <div class="evidence-info-block">
        <h4>📋 Project &amp; Payment Specifications</h4>
        <div style="font-size: 14px; line-height: 1.8;">
          <div><strong>Client:</strong> ${escapeHtml(p.client_name)}</div>
          <div><strong>Project:</strong> ${escapeHtml(p.project_title)}</div>
          <div><strong>Base Fee:</strong> ${cur}${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div><strong>Due Date:</strong> ${p.due_date}</div>
          <div><strong>Status:</strong> ${p.status.toUpperCase()}</div>
          ${p.payment_received_date ? `<div><strong>Settlement Date:</strong> ${p.payment_received_date}</div>` : ''}
        </div>
      </div>

      <div class="evidence-info-block">
        <h4>🛡️ Recorded Evidence &amp; Proof Log</h4>
        <div style="font-size: 13.5px;">
          <div><strong>Category:</strong> ${p.evidence_type || 'None attached'}</div>
          ${p.evidence_data ? `<div style="margin-top: 6px;"><strong>Reference / Txn:</strong><pre class="evidence-data-pre">${escapeHtml(p.evidence_data.substring(0, 300))}</pre></div>` : ''}
          ${fileDisplay}
          ${p.evidence_notes ? `<div style="margin-top: 8px;"><strong>Delivery Notes:</strong> ${escapeHtml(p.evidence_notes)}</div>` : ''}
        </div>
      </div>
    </div>

    ${days > 0 && p.status !== 'paid' ? `
      <div class="notice-generator-card">
        <div class="notice-generator-header">
          <div>
            <strong style="color: var(--danger); font-size: 15px;">🚨 Formal Legal Notice: Accrued Overdue Penalty (${cur}${penalty.toFixed(2)})</strong>
            <div style="font-size: 12.5px; color: var(--text-muted);">Ready-to-send email incorporating statutory interest &amp; work suspension rights</div>
          </div>
          <button class="btn-primary btn-sm" onclick="copyOverdueNoticeText()">📋 Copy Email</button>
        </div>
        <pre class="notice-email-pre" id="overdueNoticeText">${escapeHtml(overdueNoticeBody)}</pre>
      </div>
    ` : `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; text-align: center; color: var(--text-muted); font-size: 13px;">
        ✨ This invoice is in good standing or has already been settled. No overdue penalty notice required.
      </div>
    `}
  `;

  document.getElementById("evidenceViewModal").classList.remove("hidden");
}

function closeEvidenceViewModal() {
  document.getElementById("evidenceViewModal").classList.add("hidden");
}

function copyOverdueNoticeText() {
  const el = document.getElementById("overdueNoticeText");
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(() => {
    showToast("📋 Overdue Notice Email copied to clipboard!");
  });
}

function exportPaymentsCSV() {
  if (payments.length === 0) {
    alert("No payments to export.");
    return;
  }
  let csv = "ID,Client,Project,InvoiceNumber,Amount,Currency,DueDate,Status,PenaltyRate,AccruedPenalty,EvidenceType,EvidenceData,PaymentReceivedDate\n";
  payments.forEach(p => {
    const days = calculateOverdueDays(p.due_date);
    const amt = parseFloat(p.amount) || 0;
    const pen = calculatePenalty(amt, days, p.monthly_penalty_rate || 1.5);
    csv += `"${p.id}","${(p.client_name||'').replace(/"/g, '""')}","${(p.project_title||'').replace(/"/g, '""')}","${p.invoice_number||''}","${p.amount}","${p.currency||'$'}","${p.due_date}","${p.status}","${p.monthly_penalty_rate||1.5}","${pen.toFixed(2)}","${p.evidence_type||''}","${(p.evidence_data||'').substring(0, 100).replace(/"/g, '""')}","${p.payment_received_date||''}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `LexShield_Payment_Evidence_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("📥 Exported Payment Proof Ledger CSV!");
}

function handleModalOverlayClick(e) {
  if (e.target.classList.contains("tracker-modal-overlay")) {
    closePaymentModal();
    closeEvidenceViewModal();
  }
}

function showToast(msg) {
  const t = document.getElementById("trackerToast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initTheme() {
  const saved = localStorage.getItem("lexshield_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("lexshield_theme", next);
}

function toggleEvidenceFields() {
  const status = document.getElementById("formStatus").value;
  const paidDateInput = document.getElementById("formPaidDate");
  if (status === "paid" && !paidDateInput.value) {
    paidDateInput.value = new Date().toISOString().split("T")[0];
  }
}

function init3DCanvas() {
  const canvas = document.getElementById("bg3dCanvas");
  if (!canvas) return;
  const gl = canvas.getContext("webgl");
  if (!gl) return;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener("resize", resize);
  resize();

  gl.clearColor(0.04, 0.05, 0.09, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}
