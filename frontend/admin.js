/**
 * LexShield AI — Admin Panel JavaScript
 * Handles authentication, dashboard metrics, all flags management,
 * due reminder email generation, trap rules, audit logs, and payment policy.
 */

const API_BASE = '';
let adminToken = '';
let allFlags = [];
let currentEmailType = 'reminder';

// ================================================
// AUTHENTICATION
// ================================================
async function handleLogin(e) {
  e.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errorEl = document.getElementById('loginError');
  const btnText = document.getElementById('loginBtnText');
  const spinner = document.getElementById('loginSpinner');

  errorEl.classList.add('hidden');
  btnText.textContent = 'Signing in...';
  spinner.classList.remove('hidden');

  try {
    const resp = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });

    const data = await resp.json();

    if (data.success) {
      adminToken = data.token;
      sessionStorage.setItem('lexshield_admin_token', adminToken);
      document.getElementById('loginOverlay').classList.add('hidden');
      document.getElementById('adminApp').classList.remove('hidden');
      document.getElementById('topbarUser').textContent = data.username;
      loadDashboard();
    } else {
      errorEl.textContent = data.error || 'Authentication failed.';
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'Server connection error. Is the backend running?';
    errorEl.classList.remove('hidden');
  }

  btnText.textContent = 'Sign In';
  spinner.classList.add('hidden');
}

function handleLogout() {
  adminToken = '';
  sessionStorage.removeItem('lexshield_admin_token');
  document.getElementById('adminApp').classList.add('hidden');
  document.getElementById('loginOverlay').classList.remove('hidden');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };
}

// Check session on load
(function checkSession() {
  const savedToken = sessionStorage.getItem('lexshield_admin_token');
  if (savedToken) {
    adminToken = savedToken;
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('adminApp').classList.remove('hidden');
    loadDashboard();
  }
  // Set default due date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  const dueInput = document.getElementById('reminderDueDate');
  if (dueInput) dueInput.value = tomorrow.toISOString().split('T')[0];
})();

// ================================================
// NAVIGATION
// ================================================
function switchSection(sectionId) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById(`section-${sectionId}`);
  if (section) section.classList.add('active');

  const navBtn = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
  if (navBtn) navBtn.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    flags: 'All Flags',
    reminders: 'Due Reminder Email',
    rules: 'Trap Rules',
    audit: 'Audit Logs',
    policy: 'Payment Policy'
  };
  document.getElementById('topbarTitle').textContent = titles[sectionId] || 'Admin';

  // Load section data
  if (sectionId === 'dashboard') loadDashboard();
  else if (sectionId === 'flags') loadAllFlags();
  else if (sectionId === 'rules') loadRulesTable();
  else if (sectionId === 'audit') loadAuditLogs();
  else if (sectionId === 'policy') loadPolicySettings();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ================================================
// DASHBOARD
// ================================================
async function loadDashboard() {
  try {
    const resp = await fetch(`${API_BASE}/api/admin/dashboard`, {
      headers: authHeaders()
    });
    const data = await resp.json();

    document.getElementById('kpiTotalScans').textContent = data.total_scans || 0;
    document.getElementById('kpiSafeCount').textContent = (data.grades && data.grades['SAFE']) || 0;
    document.getElementById('kpiCautionCount').textContent = (data.grades && data.grades['CAUTION']) || 0;
    document.getElementById('kpiCriticalCount').textContent = (data.grades && data.grades['CRITICAL TRAP']) || 0;
    document.getElementById('kpiActiveRules').textContent = `${data.active_rules_count || 0}/${data.total_rules_count || 0}`;

    // Format uptime
    const uptimeSec = data.uptime_seconds || 0;
    const hours = Math.floor(uptimeSec / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);
    document.getElementById('kpiUptime').textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    // Donut chart
    updateDonutChart(data.grades || {});

    // Top traps
    renderTopTraps(data.top_traps || []);

    // Category breakdown
    renderCategoryBreakdown(data.category_breakdown || {});

  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function updateDonutChart(grades) {
  const safe = grades['SAFE'] || 0;
  const caution = grades['CAUTION'] || 0;
  const critical = grades['CRITICAL TRAP'] || 0;
  const total = safe + caution + critical;

  const circumference = 2 * Math.PI * 52;
  document.getElementById('donutCenterText').textContent = total;

  if (total === 0) {
    ['donutSafe', 'donutCaution', 'donutCritical'].forEach(id => {
      const el = document.getElementById(id);
      el.style.strokeDasharray = `0 ${circumference}`;
      el.style.strokeDashoffset = '0';
    });
    return;
  }

  const safePct = safe / total;
  const cautionPct = caution / total;
  const critPct = critical / total;

  const safeLen = safePct * circumference;
  const cautionLen = cautionPct * circumference;
  const critLen = critPct * circumference;

  const safeEl = document.getElementById('donutSafe');
  safeEl.style.strokeDasharray = `${safeLen} ${circumference - safeLen}`;
  safeEl.style.strokeDashoffset = '0';

  const cautionEl = document.getElementById('donutCaution');
  cautionEl.style.strokeDasharray = `${cautionLen} ${circumference - cautionLen}`;
  cautionEl.style.strokeDashoffset = `-${safeLen}`;

  const critEl = document.getElementById('donutCritical');
  critEl.style.strokeDasharray = `${critLen} ${circumference - critLen}`;
  critEl.style.strokeDashoffset = `-${safeLen + cautionLen}`;
}

function renderTopTraps(traps) {
  const container = document.getElementById('topTrapsChart');
  if (!traps.length) {
    container.innerHTML = '<div class="bar-empty">No scan data yet. Analyze contracts to see trap statistics.</div>';
    return;
  }
  const maxCount = Math.max(...traps.map(t => t.count));
  container.innerHTML = traps.map(t => `
    <div class="bar-item">
      <div class="bar-label" title="${t.rule_id}">${t.rule_id}</div>
      <div class="bar-track"><div class="bar-fill" style="width: ${(t.count / maxCount) * 100}%"></div></div>
      <div class="bar-count">${t.count}</div>
    </div>
  `).join('');
}

function renderCategoryBreakdown(categories) {
  const container = document.getElementById('categoryBreakdownList');
  const entries = Object.entries(categories);
  if (!entries.length) {
    container.innerHTML = '<div class="bar-empty">No category data available.</div>';
    return;
  }
  container.innerHTML = entries.sort((a, b) => b[1] - a[1]).map(([cat, count]) => `
    <div class="cat-item">
      <span class="cat-name">${escapeHtml(cat)}</span>
      <span class="cat-count">${count}</span>
    </div>
  `).join('');
}

// ================================================
// ALL FLAGS
// ================================================
async function loadAllFlags() {
  try {
    const resp = await fetch(`${API_BASE}/api/admin/rules`, {
      headers: authHeaders()
    });
    allFlags = await resp.json();
    populateCategoryFilter();
    renderFlags();
    updateFlagSummary();
  } catch (err) {
    console.error('Failed to load flags:', err);
  }
}

function populateCategoryFilter() {
  const select = document.getElementById('flagCategoryFilter');
  const categories = [...new Set(allFlags.map(f => f.category))];
  // Keep first option
  select.innerHTML = '<option value="ALL">All Categories</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

function renderFlags(filteredFlags) {
  const flags = filteredFlags || allFlags;
  const container = document.getElementById('flagsGrid');

  if (!flags.length) {
    container.innerHTML = '<div class="bar-empty" style="grid-column: 1/-1; padding: 40px;">No flags match the current filters.</div>';
    return;
  }

  container.innerHTML = flags.map(flag => {
    const sevClass = `sev-${flag.severity.toLowerCase()}`;
    const badgeClass = `badge-${flag.severity.toLowerCase()}`;
    const disabledClass = flag.enabled ? '' : 'disabled';
    return `
      <div class="flag-card ${sevClass} ${disabledClass}" data-id="${flag.id}">
        <div class="flag-card-header">
          <div class="flag-title">${escapeHtml(flag.title)}</div>
          <div class="flag-toggle-wrap">
            <label class="toggle-switch" title="${flag.enabled ? 'Enabled — Click to disable' : 'Disabled — Click to enable'}">
              <input type="checkbox" ${flag.enabled ? 'checked' : ''} onchange="toggleFlag('${flag.id}', this.checked)" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div class="flag-meta">
          <span class="flag-badge ${badgeClass}">${flag.severity}</span>
          <span class="flag-category">${escapeHtml(flag.category)}</span>
        </div>
        <div class="flag-desc">${escapeHtml(flag.plain_translation)}</div>
        <div class="flag-footer">
          <span class="flag-weight">Weight: ${flag.weight}pts</span>
          <span class="flag-patterns">${flag.pattern_count} patterns</span>
          <button class="btn-details" onclick="openFlagDetail('${flag.id}')">View Details</button>
        </div>
      </div>
    `;
  }).join('');
}

function updateFlagSummary() {
  document.getElementById('flagTotalCount').textContent = allFlags.length;
  document.getElementById('flagEnabledCount').textContent = allFlags.filter(f => f.enabled).length;
  document.getElementById('flagDisabledCount').textContent = allFlags.filter(f => !f.enabled).length;
  document.getElementById('flagCritCount').textContent = allFlags.filter(f => f.severity === 'CRITICAL').length;
  document.getElementById('flagHighCount').textContent = allFlags.filter(f => f.severity === 'HIGH').length;
  document.getElementById('flagMedCount').textContent = allFlags.filter(f => f.severity === 'MEDIUM').length;
}

function filterFlags() {
  const search = document.getElementById('flagSearchInput').value.toLowerCase();
  const severity = document.getElementById('flagSeverityFilter').value;
  const category = document.getElementById('flagCategoryFilter').value;

  let filtered = allFlags;

  if (severity !== 'ALL') {
    filtered = filtered.filter(f => f.severity === severity);
  }
  if (category !== 'ALL') {
    filtered = filtered.filter(f => f.category === category);
  }
  if (search) {
    filtered = filtered.filter(f =>
      f.title.toLowerCase().includes(search) ||
      f.id.toLowerCase().includes(search) ||
      f.category.toLowerCase().includes(search) ||
      f.plain_translation.toLowerCase().includes(search)
    );
  }

  renderFlags(filtered);
}

async function toggleFlag(ruleId, enabled) {
  try {
    await fetch(`${API_BASE}/api/admin/rules/${ruleId}/toggle`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ enabled })
    });

    // Update local state
    const flag = allFlags.find(f => f.id === ruleId);
    if (flag) flag.enabled = enabled;
    updateFlagSummary();

    // Update card visual
    const card = document.querySelector(`.flag-card[data-id="${ruleId}"]`);
    if (card) {
      card.classList.toggle('disabled', !enabled);
    }

    showToast(enabled ? `✅ ${ruleId} enabled` : `⏸️ ${ruleId} disabled`);
  } catch (err) {
    showToast('Failed to toggle rule');
  }
}

function openFlagDetail(ruleId) {
  const flag = allFlags.find(f => f.id === ruleId);
  if (!flag) return;

  document.getElementById('flagDetailTitle').textContent = `🚩 ${flag.title}`;

  document.getElementById('flagDetailBody').innerHTML = `
    <div class="flag-meta" style="margin-bottom: 16px;">
      <span class="flag-badge badge-${flag.severity.toLowerCase()}">${flag.severity}</span>
      <span class="flag-category">${escapeHtml(flag.category)}</span>
      <span class="flag-weight">Weight: ${flag.weight}pts</span>
      <span style="font-size: 12px; color: ${flag.enabled ? 'var(--success)' : 'var(--text-dim)'};">
        ${flag.enabled ? '● Enabled' : '○ Disabled'}
      </span>
    </div>

    <div class="detail-section">
      <div class="detail-label">Rule ID</div>
      <div class="detail-text" style="font-family: var(--font-mono); color: var(--primary);">${flag.id}</div>
    </div>

    <div class="detail-section">
      <div class="detail-label">Plain Language Translation</div>
      <div class="detail-text">${escapeHtml(flag.plain_translation)}</div>
    </div>

    <div class="detail-section">
      <div class="detail-label">Why It's Risky</div>
      <div class="detail-text">${escapeHtml(flag.why_risky)}</div>
    </div>

    <div class="detail-section">
      <div class="detail-label">Recommended Solution Clause</div>
      <div class="detail-solution">${escapeHtml(flag.solution_clause)}</div>
    </div>

    <div class="detail-section">
      <div class="detail-label">Negotiation Tip</div>
      <div class="detail-text">${escapeHtml(flag.negotiation_tip || 'N/A')}</div>
    </div>

    <div class="detail-section">
      <div class="detail-label">Detection Patterns (${flag.patterns.length} regex patterns)</div>
      <div class="detail-patterns">${flag.patterns.map(p => escapeHtml(p)).join('\n')}</div>
    </div>
  `;

  document.getElementById('flagDetailModal').classList.remove('hidden');
}

function closeFlagDetailModal() {
  document.getElementById('flagDetailModal').classList.add('hidden');
}
function closeFlagDetailOnBackdrop(e) {
  if (e.target === e.currentTarget) closeFlagDetailModal();
}

// ================================================
// DUE REMINDER EMAIL
// ================================================
function setEmailType(type) {
  currentEmailType = type;
  document.getElementById('typeBtnReminder').classList.toggle('active', type === 'reminder');
  document.getElementById('typeBtnOverdue').classList.toggle('active', type === 'overdue');
}

function generateReminderEmail() {
  const clientName = document.getElementById('reminderClientName').value.trim() || '[Client Name]';
  const projectName = document.getElementById('reminderProjectName').value.trim() || '[Project Name]';
  const invoiceNo = document.getElementById('reminderInvoiceNo').value.trim() || '[Invoice Number]';
  const currency = document.getElementById('reminderCurrency').value;
  const amount = parseFloat(document.getElementById('reminderAmount').value) || 0;
  const dueDate = document.getElementById('reminderDueDate').value || '[Due Date]';
  const daysOverdue = parseInt(document.getElementById('reminderDaysOverdue').value) || 0;
  const lateRate = parseFloat(document.getElementById('reminderLateRate').value) || 1.5;
  const yourName = document.getElementById('reminderYourName').value.trim() || '[Your Name]';
  const paymentMethod = document.getElementById('reminderPaymentMethod').value.trim() || '[Payment Method / Link]';

  // Format date nicely
  let dueDateFormatted = dueDate;
  if (dueDate && dueDate !== '[Due Date]') {
    const d = new Date(dueDate);
    dueDateFormatted = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Calculate late fee
  const dailyRate = (lateRate / 100) / 30;
  const interestFee = amount * dailyRate * daysOverdue;
  const extraPayment = Math.round((interestFee) * 100) / 100;
  const totalDue = Math.round((amount + extraPayment) * 100) / 100;

  let subject = '';
  let body = '';

  if (currentEmailType === 'reminder') {
    // Pre-Due Courtesy Reminder (2 days before)
    subject = `Friendly Reminder: Invoice ${invoiceNo} for ${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} — Due on ${dueDateFormatted}`;

    body = `Dear ${clientName},

Hope you are having a productive week!

This is a quick courtesy reminder that Invoice ${invoiceNo} in the amount of ${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} for ${projectName} is scheduled for payment on ${dueDateFormatted}.

To keep project development and milestone delivery moving forward seamlessly without interruption or late fee accrual (${lateRate}%/month after due date), please process payment via your preferred method:

  • Payment Link / Method: ${paymentMethod}

If payment has already been scheduled or initiated, please feel free to disregard this note and reply with the transaction receipt.

Thank you very much for your partnership and prompt collaboration!

Warm regards,
${yourName}
Freelance Contractor`;

  } else {
    // Overdue Late Fee Notice
    subject = `URGENT: Overdue Invoice Notice — Late Payment Fee Applied (${currency}${extraPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })})`;

    body = `Dear ${clientName},

This is a formal reminder regarding your outstanding invoice (${invoiceNo}) in the amount of ${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}, which was due on ${dueDateFormatted} and is currently ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue.

As stated in our freelance contract terms, overdue invoices accrue a late payment penalty at the rate of ${lateRate}% per month (${currency}${interestFee.toLocaleString('en-US', { minimumFractionDigits: 2 })} accrued so far).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Original Invoice Amount:  ${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  Late Payment Fee:         +${currency}${extraPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  ─────────────────────────────
  TOTAL NOW DUE:            ${currency}${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please remit payment immediately via:
  • ${paymentMethod}

Continued delay may result in suspension of ongoing work and withholding of project deliverables as outlined in our agreement.

Kindly reply with payment confirmation once processed.

Thank you for your prompt cooperation.

Best regards,
${yourName}
Freelance Contractor`;
  }

  // Update preview
  document.getElementById('previewSubject').textContent = subject;
  document.getElementById('previewTo').textContent = `${clientName.replace(/\[|\]/g, '')}`;
  document.getElementById('previewEmailBody').textContent = body;

  // Update late fee summary
  document.getElementById('lfOriginal').textContent = `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById('lfExtra').textContent = `+${currency}${extraPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById('lfTotal').textContent = `${currency}${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  // Show/hide late fee box based on type
  const lateFeeBox = document.getElementById('lateFeeBox');
  if (currentEmailType === 'overdue' && daysOverdue > 0) {
    lateFeeBox.style.display = 'block';
  } else {
    lateFeeBox.style.display = currentEmailType === 'reminder' ? 'none' : 'block';
  }

  showToast('📧 Email generated successfully!');
}

function copyReminderEmail() {
  const subject = document.getElementById('previewSubject').textContent;
  const body = document.getElementById('previewEmailBody').textContent;
  const full = `Subject: ${subject}\n\n${body}`;
  navigator.clipboard.writeText(full).then(() => showToast('📋 Email copied to clipboard!'));
}

function openReminderInMailApp() {
  const subject = encodeURIComponent(document.getElementById('previewSubject').textContent);
  const body = encodeURIComponent(document.getElementById('previewEmailBody').textContent);
  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
}

// ================================================
// TRAP RULES TABLE
// ================================================
async function loadRulesTable() {
  try {
    const resp = await fetch(`${API_BASE}/api/admin/rules`, {
      headers: authHeaders()
    });
    const rules = await resp.json();

    const tbody = document.getElementById('rulesTableBody');
    if (!rules.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No rules configured.</td></tr>';
      return;
    }

    tbody.innerHTML = rules.map(r => `
      <tr>
        <td>
          <label class="toggle-switch">
            <input type="checkbox" ${r.enabled ? 'checked' : ''} onchange="toggleFlag('${r.id}', this.checked)" />
            <span class="toggle-slider"></span>
          </label>
        </td>
        <td class="rule-id">${escapeHtml(r.id)}</td>
        <td style="font-weight: 600; color: var(--text-main);">${escapeHtml(r.title)}</td>
        <td>${escapeHtml(r.category)}</td>
        <td><span class="sev-pill sev-${r.severity}">${r.severity}</span></td>
        <td style="font-weight: 700;">${r.weight}</td>
        <td>${r.pattern_count}</td>
        <td>
          <button class="btn-danger-sm" onclick="deleteRule('${r.id}')" title="Delete Rule">🗑️</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load rules table:', err);
  }
}

function openAddRuleModal() {
  document.getElementById('addRuleModal').classList.remove('hidden');
}
function closeAddRuleModal() {
  document.getElementById('addRuleModal').classList.add('hidden');
}
function closeAddRuleModalOnBackdrop(e) {
  if (e.target === e.currentTarget) closeAddRuleModal();
}

async function submitNewRule() {
  const rule = {
    id: document.getElementById('newRuleId').value.trim(),
    title: document.getElementById('newRuleTitle').value.trim(),
    category: document.getElementById('newRuleCategory').value.trim(),
    severity: document.getElementById('newRuleSeverity').value,
    weight: parseInt(document.getElementById('newRuleWeight').value) || 15,
    patterns: document.getElementById('newRulePatterns').value,
    plain_translation: document.getElementById('newRulePlain').value.trim(),
    why_risky: document.getElementById('newRuleWhy').value.trim(),
    solution_clause: document.getElementById('newRuleSolution').value.trim(),
    negotiation_tip: document.getElementById('newRuleTip').value.trim()
  };

  if (!rule.title || !rule.patterns) {
    showToast('Please fill in at least Title and Patterns.');
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/api/admin/rules`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(rule)
    });

    if (resp.ok) {
      showToast('✅ Rule added successfully!');
      closeAddRuleModal();
      loadRulesTable();
      loadAllFlags();
    } else {
      const err = await resp.json();
      showToast(`❌ ${err.detail || 'Failed to add rule'}`);
    }
  } catch (err) {
    showToast('Failed to add rule: server error');
  }
}

async function deleteRule(ruleId) {
  if (!confirm(`Delete rule "${ruleId}"? This cannot be undone.`)) return;

  try {
    const resp = await fetch(`${API_BASE}/api/admin/rules/${ruleId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });

    if (resp.ok) {
      showToast(`🗑️ Rule "${ruleId}" deleted`);
      loadRulesTable();
      loadAllFlags();
    } else {
      showToast('Failed to delete rule');
    }
  } catch (err) {
    showToast('Failed to delete rule: server error');
  }
}

// ================================================
// AUDIT LOGS
// ================================================
async function loadAuditLogs() {
  try {
    const status = document.getElementById('auditStatusFilter').value;
    const event = document.getElementById('auditEventFilter').value;

    const params = new URLSearchParams({ limit: '200' });
    if (status !== 'all') params.set('status_filter', status);
    if (event !== 'all') params.set('event_filter', event);

    const resp = await fetch(`${API_BASE}/api/admin/audit-logs?${params}`, {
      headers: authHeaders()
    });
    const logs = await resp.json();

    const tbody = document.getElementById('auditTableBody');
    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-row">No audit logs match the current filters.</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(log => {
      const statusClass = log.status_code < 300 ? 'status-2xx' :
                          log.status_code < 400 ? 'status-3xx' :
                          log.status_code < 500 ? 'status-4xx' : 'status-5xx';
      const methodClass = `method-${log.method}`;
      return `
        <tr>
          <td style="color: var(--text-dim);">${log.id}</td>
          <td style="font-family: var(--font-mono); font-size: 11px; white-space: nowrap;">${log.timestamp}</td>
          <td style="font-family: var(--font-mono); font-size: 11px;">${log.client_ip}</td>
          <td><span class="method-badge ${methodClass}">${log.method}</span></td>
          <td style="font-family: var(--font-mono); font-size: 11px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(log.endpoint)}</td>
          <td><span class="status-pill ${statusClass}">${log.status_code}</span></td>
          <td style="font-family: var(--font-mono); font-size: 11px;">${log.duration_ms}ms</td>
          <td style="font-size: 12px;">${escapeHtml(log.event_type)}</td>
          <td style="font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(log.details)}">${escapeHtml(log.details || '—')}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load audit logs:', err);
  }
}

async function clearAuditLogs() {
  if (!confirm('Clear all audit logs? This cannot be undone.')) return;
  try {
    await fetch(`${API_BASE}/api/admin/audit-logs`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    showToast('🗑️ Audit logs cleared');
    loadAuditLogs();
  } catch (err) {
    showToast('Failed to clear logs');
  }
}

// ================================================
// PAYMENT POLICY
// ================================================
async function loadPolicySettings() {
  try {
    const resp = await fetch(`${API_BASE}/api/admin/policy`, {
      headers: authHeaders()
    });
    const policy = await resp.json();

    document.getElementById('policyRate').value = policy.monthly_rate_pct || 1.5;
    document.getElementById('policyReminderDays').value = policy.reminder_days || 2;
    document.getElementById('policyGrace').value = policy.grace_period_days || 0;
    document.getElementById('policyFlat').value = policy.flat_surcharge || 0;
    document.getElementById('policyCurrency').value = policy.currency || '$';
    document.getElementById('policyCourtesy').value = policy.require_courtesy_notice ? 'true' : 'false';
  } catch (err) {
    console.error('Failed to load policy:', err);
  }
}

async function savePolicySettings() {
  const settings = {
    monthly_rate_pct: parseFloat(document.getElementById('policyRate').value),
    reminder_days: parseInt(document.getElementById('policyReminderDays').value),
    grace_period_days: parseInt(document.getElementById('policyGrace').value),
    flat_surcharge: parseFloat(document.getElementById('policyFlat').value),
    currency: document.getElementById('policyCurrency').value,
    require_courtesy_notice: document.getElementById('policyCourtesy').value === 'true'
  };

  const statusEl = document.getElementById('policySaveStatus');

  try {
    const resp = await fetch(`${API_BASE}/api/admin/policy`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(settings)
    });

    if (resp.ok) {
      statusEl.textContent = '✅ Policy settings saved successfully!';
      statusEl.className = 'save-status success';
      statusEl.classList.remove('hidden');
      showToast('💾 Policy saved');
    } else {
      statusEl.textContent = '❌ Failed to save policy settings.';
      statusEl.className = 'save-status error';
      statusEl.classList.remove('hidden');
    }
  } catch (err) {
    statusEl.textContent = '❌ Server connection error.';
    statusEl.className = 'save-status error';
    statusEl.classList.remove('hidden');
  }

  setTimeout(() => statusEl.classList.add('hidden'), 4000);
}

// ================================================
// UTILITIES
// ================================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message) {
  const toast = document.getElementById('adminToast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}
