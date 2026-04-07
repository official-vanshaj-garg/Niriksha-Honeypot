/* ============================================================
   NIRIKSHA.ai Dashboard — Application Logic
   ============================================================ */

// --------------- State ---------------
let apiKey = '';

// --------------- Helpers ---------------

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function fmtDate(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    } catch { return iso; }
}

const TYPE_LABELS = {
    phone: '📱 Phone Numbers',
    bank_account: '🏦 Bank Accounts',
    upi: '💳 UPI IDs',
    phishing_link: '🔗 Phishing Links',
    email: '📧 Email Addresses',
    reference_id: '🔖 Reference IDs'
};

const EXT_KEY_LABELS = {
    phoneNumbers: '📱 Phone Numbers',
    bankAccounts: '🏦 Bank Accounts',
    upiIds: '💳 UPI IDs',
    phishingLinks: '🔗 Phishing Links',
    emailAddresses: '📧 Email Addresses',
    referenceIds: '🔖 Reference IDs'
};

// --------------- API ---------------

async function apiFetch(path) {
    try {
        const res = await fetch(path, {
            headers: { 'x-api-key': apiKey }
        });
        if (res.status === 403) {
            renderError('Invalid or missing API key. Check your key and try again.');
            return null;
        }
        if (res.status === 404) {
            renderError('Not found.');
            return null;
        }
        if (!res.ok) {
            renderError('Server returned ' + res.status + ' ' + res.statusText);
            return null;
        }
        return await res.json();
    } catch (err) {
        renderError('Network error: ' + err.message);
        return null;
    }
}

// --------------- Rendering ---------------

const $content = () => document.getElementById('content');

function renderError(msg) {
    $content().innerHTML = '<div class="error-card">' + esc(msg) + '</div>';
}

function renderLoading(msg) {
    $content().innerHTML = '<div class="loading-card">' + esc(msg || 'Loading...') + '</div>';
}

function setActiveNav(view) {
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === view);
    });
}

// --------------- Sessions List ---------------

async function loadSessions() {
    setActiveNav('sessions');
    renderLoading('Loading sessions...');

    const data = await apiFetch('/api/sessions');
    if (!data) return;

    if (!data.sessions || data.sessions.length === 0) {
        $content().innerHTML =
            '<div class="empty-card"><p>No sessions found. Run the test suite to generate data.</p></div>';
        return;
    }

    let html = '<div class="section-header">' +
        '<h2>Sessions</h2>' +
        '<span class="section-count">' + data.sessions.length + ' total</span>' +
        '</div><div class="session-grid">';

    for (const s of data.sessions) {
        html += '<div class="session-card" onclick="loadSessionDetail(\'' + esc(s.sessionId) + '\')">' +
            '<div class="session-top">' +
                '<span class="session-id">' + esc(s.sessionId.substring(0, 16)) + '...</span>' +
                '<span class="badge badge-' + esc(s.sessionStatus) + '">' + esc(s.sessionStatus) + '</span>' +
            '</div>' +
            '<div class="session-metrics">' +
                '<div class="metric"><span class="metric-label">Turns</span><span class="metric-value">' + s.turnCount + '</span></div>' +
                '<div class="metric"><span class="metric-label">Score</span><span class="metric-value">' + s.scamScore + '</span></div>' +
                '<div class="metric"><span class="metric-label">Report</span><span class="metric-value">' + (s.hasReport ? '✅' : '—') + '</span></div>' +
            '</div>' +
        '</div>';
    }

    html += '</div>';
    $content().innerHTML = html;
}

// --------------- Session Detail ---------------

async function loadSessionDetail(sessionId) {
    setActiveNav('sessions');
    renderLoading('Loading session detail...');

    const data = await apiFetch('/api/sessions/' + encodeURIComponent(sessionId));
    if (!data) return;

    const s = data.session;
    let html = '<button class="back-btn" onclick="loadSessions()">← Back to Sessions</button>';

    // Session info card
    html += '<div class="detail-grid">';

    // Info
    html += '<div class="detail-card"><h3>📋 Session Info</h3><div class="info-grid">' +
        infoItem('Session ID', s.sessionId) +
        infoItem('Status', s.sessionStatus) +
        infoItem('Turns', s.turnCount) +
        infoItem('Score', s.scamScore) +
        infoItem('Rubric Q', s.rubricCounts.q) +
        infoItem('Rubric Inv', s.rubricCounts.inv) +
        infoItem('Rubric RF', s.rubricCounts.rf) +
        infoItem('Rubric ELI', s.rubricCounts.eli) +
        infoItem('Hints Asked', s.askedHints.length > 0 ? s.askedHints.join(', ') : '—') +
        infoItem('Created', fmtDate(s.createdAt)) +
        '</div></div>';

    // Messages
    html += '<div class="detail-card"><h3>💬 Conversation (' + data.messages.length + ' messages)</h3>' +
        '<div class="chat-container">';

    for (const m of data.messages) {
        const cls = m.sender === 'scammer' ? 'msg-scammer' : 'msg-honeypot';
        const label = m.sender === 'scammer' ? '🔴 Scammer' : '🛡️ Honeypot';
        html += '<div class="msg ' + cls + '">' +
            '<div class="msg-meta">' +
                '<span class="msg-sender">' + label + '</span>' +
                '<span class="msg-turn">Turn ' + m.turnNumber + '</span>' +
            '</div>' +
            '<div class="msg-text">' + esc(m.text) + '</div>' +
        '</div>';
    }

    html += '</div></div>';

    // Indicators
    html += '<div class="detail-card"><h3>🎯 Extracted Indicators</h3>';
    let hasAny = false;
    for (const [key, label] of Object.entries(EXT_KEY_LABELS)) {
        const vals = data.indicators[key];
        if (vals && vals.length > 0) {
            hasAny = true;
            html += '<div class="indicator-group">' +
                '<div class="indicator-type-label">' + label + '</div>' +
                '<div class="indicator-values">';
            for (const v of vals) {
                html += '<span class="indicator-chip">' + esc(v) + '</span>';
            }
            html += '</div></div>';
        }
    }
    if (!hasAny) html += '<p class="no-data">No indicators extracted for this session.</p>';
    html += '</div>';

    // Report button
    if (data.reportAvailable) {
        html += '<div style="text-align:center; margin-top: 8px;">' +
            '<button class="report-btn" onclick="loadReport(\'' + esc(s.sessionId) + '\')">📄 View Full Report</button>' +
            '</div>';
    }

    html += '</div>';
    $content().innerHTML = html;
}

function infoItem(label, value) {
    return '<div class="info-item">' +
        '<span class="info-label">' + esc(label) + '</span>' +
        '<span class="info-value">' + esc(String(value)) + '</span>' +
        '</div>';
}

// --------------- Analyst & Export Helpers ---------------

window.currentReportIntel = {};
window.currentReportData = {};

async function sha512(str) {
    const buf = await crypto.subtle.digest("SHA-512", new TextEncoder("utf-8").encode(str));
    return Array.prototype.map.call(new Uint8Array(buf), x => (('00' + x.toString(16)).slice(-2))).join('');
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

window.exportData = function(format) {
    const r = window.currentReportData;
    const intel = window.currentReportIntel;
    const sId = r.sessionId || r.session_id || 'report';
    
    if (format === 'json') {
        const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `niriksha_${sId}.json`);
    } else if (format === 'csv') {
        let csv = "Type,Value\n";
        for (const [key, vals] of Object.entries(intel)) {
            if (Array.isArray(vals)) {
                for (const v of vals) {
                    csv += `"${key}","${v.replace(/"/g, '""')}"\n`;
                }
            }
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        downloadBlob(blob, `ioc_${sId}.csv`);
    } else if (format === 'txt') {
        let txt = "# NIRIKSHA.ai IOC Blocklist\n# Generated automatically\n\n";
        if (intel.phishingLinks && intel.phishingLinks.length > 0) {
            txt += "### Domains / URLs ###\n";
            intel.phishingLinks.forEach(v => txt += v + "\n");
            txt += "\n";
        }
        if (intel.bankAccounts && intel.bankAccounts.length > 0) {
            txt += "### Bank Accounts ###\n";
            intel.bankAccounts.forEach(v => txt += v + "\n");
            txt += "\n";
        }
        if (intel.upiIds && intel.upiIds.length > 0) {
            txt += "### UPI IDs ###\n";
            intel.upiIds.forEach(v => txt += v + "\n");
            txt += "\n";
        }
        const blob = new Blob([txt], { type: 'text/plain' });
        downloadBlob(blob, `blocklist_${sId}.txt`);
    }
}

// --------------- Report ---------------

async function loadReport(sessionId) {
    setActiveNav('sessions');
    renderLoading('Loading report...');

    const data = await apiFetch('/api/reports/' + encodeURIComponent(sessionId));
    if (!data) return;

    const r = data.report;
    const intel = r.extractedIntelligence || r.extracted_intelligence || {};
    window.currentReportData = r;
    window.currentReportIntel = intel;

    // Fetch Global Indicators for triage correlation
    let allInd = [];
    try {
        const allIndRes = await apiFetch('/api/indicators');
        allInd = allIndRes ? (allIndRes.indicators || []) : [];
    } catch(e) {}

    let html = '<button class="back-btn" onclick="loadSessionDetail(\'' + esc(sessionId) + '\')">← Back to Session</button>';

    // Header
    const scamType = r.scamType || r.scam_type || 'unknown';
    const confidence = r.confidenceLevel || r.confidence_level || r.confidence || 0;
    const confPct = (typeof confidence === 'number' && confidence <= 1) ? (confidence * 100).toFixed(0) : confidence;

    html += '<div class="detail-card">';
    html += '<div class="report-header">' +
        '<span class="report-type-badge">' + esc(scamType.replace(/_/g, ' ')) + '</span>' +
        '<span class="report-confidence">Confidence: ' + confPct + '%</span>' +
        '<span style="color:var(--text-muted); font-size:0.8rem;">Created: ' + fmtDate(data.reportCreatedAt) + '</span>' +
        '</div>';

    // Metrics
    const totalMsgs = r.totalMessagesExchanged || r.total_messages_exchanged || 0;
    const duration = r.engagementDurationSeconds || r.engagement_duration_seconds || 0;
    const durationMin = Math.floor(duration / 60);
    const durationSec = duration % 60;

    html += '<div class="report-metrics">' +
        '<div class="report-metric-card"><div class="metric-label">Messages</div><div class="metric-value">' + totalMsgs + '</div></div>' +
        '<div class="report-metric-card"><div class="metric-label">Duration</div><div class="metric-value">' + durationMin + 'm ' + durationSec + 's</div></div>' +
        '<div class="report-metric-card"><div class="metric-label">Scam Type</div><div class="metric-value" style="font-size:0.95rem;text-transform:capitalize;">' + esc(scamType.replace(/_/g, ' ')) + '</div></div>' +
        '<div class="report-metric-card"><div class="metric-label">Confidence</div><div class="metric-value">' + confPct + '%</div></div>' +
        '</div>';

    // --- SECURITY TRIAGE BLOCK ---
    let severityScore = 0;
    let triageReasons = [];
    let isRepeated = false;
    
    let allSessionVals = new Set();
    for(const vals of Object.values(intel)) {
        if (Array.isArray(vals)) vals.forEach(v => allSessionVals.add(v));
    }
    
    // check if repeated
    for (const ind of allInd) {
        if (ind.hitCount > 1 && allSessionVals.has(ind.value)) {
            isRepeated = true;
            break;
        }
    }
    
    if (intel.phishingLinks && intel.phishingLinks.length > 0) {
        severityScore += 2;
        triageReasons.push("Contains malicious / phishing URLs");
    }
    if ((intel.bankAccounts && intel.bankAccounts.length > 0) || (intel.upiIds && intel.upiIds.length > 0)) {
        severityScore += 2;
        triageReasons.push("Targeting financial accounts (Bank/UPI)");
    }
    if (allSessionVals.size > 2) {
        severityScore += 1;
        triageReasons.push("Multiple distinct indicators extracted");
    }
    if (isRepeated) {
        severityScore += 3;
        triageReasons.push("Correlated threat: IOCs seen in prior sessions");
    }
    
    let severity = "Low";
    let sevColor = "var(--text-muted)";
    if (severityScore >= 5) { severity = "Critical"; sevColor = "var(--danger)"; }
    else if (severityScore >= 3) { severity = "High"; sevColor = "var(--danger)"; }
    else if (severityScore >= 1) { severity = "Medium"; sevColor = "#f59e0b"; }
    
    html += '<h3 style="margin: 24px 0 14px;">🛡️ Security Analyst Triage</h3>';
    html += '<div style="display:flex; flex-wrap:wrap; gap:20px; background:var(--bg-input); border: 1px solid var(--border); border-radius: 8px; padding: 18px; margin-bottom: 24px;">';
    
    // Severity & Actions
    html += '<div style="flex: 1; min-width: 250px;">';
    html += '<h4 style="margin-top:0; font-size: 1.1rem;">Severity: <span style="color:' + sevColor + ';">' + severity + '</span></h4>';
    html += '<ul style="margin: 8px 0; padding-left: 20px; color: var(--text-secondary); font-size: 0.9rem;">';
    if (triageReasons.length === 0) triageReasons.push("No significant risk factors flagged");
    triageReasons.forEach(rs => { html += '<li>' + esc(rs) + '</li>'; });
    html += '</ul>';
    
    html += '<h5 style="margin: 14px 0 6px; font-size: 0.95rem;">Recommended Defensive Actions:</h5>';
    html += '<ul style="margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 0.9rem;">';
    if (intel.phishingLinks && intel.phishingLinks.length > 0) html += '<li>Block phishing domains at corporate firewall.</li>';
    if ((intel.bankAccounts && intel.bankAccounts.length > 0) || (intel.upiIds && intel.upiIds.length > 0)) html += '<li>Flag financial accounts for fraud monitoring.</li>';
    if (isRepeated) html += '<li>Investigate correlated sessions for broader campaign attribution.</li>';
    html += '<li>Preserve session report and evidence hash for incident response.</li>';
    html += '</ul>';
    html += '</div>';
    
    // IOC Exports
    html += '<div style="display:flex; flex-direction:column; gap: 8px; min-width: 180px;">';
    html += '<h5 style="margin-top:0; font-size: 0.95rem;">Threat Intel Export:</h5>';
    html += '<button class="export-btn" onclick="exportData(\'json\')">📥 Report JSON</button>';
    html += '<button class="export-btn" onclick="exportData(\'csv\')">📊 IOC CSV</button>';
    html += '<button class="export-btn" onclick="exportData(\'txt\')">🛑 Blocklist TXT</button>';
    html += '</div>';
    html += '</div>';

    // Extracted Intelligence
    const intelKeys = Object.entries(intel).filter(([_, v]) => Array.isArray(v) && v.length > 0);

    if (intelKeys.length > 0) {
        html += '<h3 style="margin-bottom:14px;">🎯 Extracted Intelligence</h3>';
        html += '<div class="report-intel-grid">';
        for (const [key, values] of intelKeys) {
            const label = EXT_KEY_LABELS[key] || key;
            html += '<div class="report-intel-card"><h4>' + label + '</h4><ul>';
            for (const v of values) {
                html += '<li>' + esc(v) + '</li>';
            }
            html += '</ul></div>';
        }
        html += '</div>';
    }

    // Agent Notes
    const notes = r.agentNotes || r.agent_notes || '';
    if (notes) {
        html += '<h3 style="margin: 20px 0 10px;">📝 Agent Notes</h3>' +
            '<div class="agent-notes">' + esc(notes) + '</div>';
    }
    
    html += '<h3 style="margin: 24px 0 10px;">🔐 Evidence Integrity</h3>';
    html += '<div style="background: var(--bg-nav); padding: 14px; border: 1px solid var(--border); border-radius: 6px; font-family:var(--font-mono); font-size: 0.8rem; color: var(--text-muted); word-break: break-all;">';
    html += '<strong style="color:var(--text); font-family:var(--font); font-size:0.85rem">SHA-512 Fingerprint:</strong><br/>';
    try {
        const hashHex = await sha512(JSON.stringify(r));
        html += '<span style="color:var(--success);">' + hashHex + '</span>';
    } catch(e) {
        html += 'Error generating hash';
    }
    html += '</div>';

    html += '</div>';
    $content().innerHTML = html;
}

// --------------- Indicators ---------------

async function loadIndicators() {
    setActiveNav('indicators');
    renderLoading('Loading indicators...');

    const data = await apiFetch('/api/indicators');
    if (!data) return;

    if (!data.indicators || data.indicators.length === 0) {
        $content().innerHTML =
            '<div class="empty-card"><p>No indicators found. Run the test suite to generate data.</p></div>';
        return;
    }

    let html = '<div class="section-header">' +
        '<h2>Global Threat Indicators</h2>' +
        '<span class="section-count">' + data.indicators.length + ' unique</span>' +
        '</div>';

    html += '<table class="indicators-table"><thead><tr>' +
        '<th>Type</th><th>Value</th><th>Hit Count</th><th>First Seen</th><th>Last Seen</th>' +
        '</tr></thead><tbody>';

    for (const ind of data.indicators) {
        const label = TYPE_LABELS[ind.type] || ind.type;
        html += '<tr>' +
            '<td><span class="type-badge">' + esc(ind.type) + '</span></td>' +
            '<td class="mono">' + esc(ind.value) + '</td>' +
            '<td><span class="hit-badge">' + ind.hitCount + '</span></td>' +
            '<td>' + fmtDate(ind.firstSeenAt) + '</td>' +
            '<td>' + fmtDate(ind.lastSeenAt) + '</td>' +
            '</tr>';
    }

    html += '</tbody></table>';
    $content().innerHTML = html;
}

// --------------- Repeated Threats ---------------

async function loadRepeatedThreats() {
    setActiveNav('repeated');
    renderLoading('Loading repeated threats...');

    const data = await apiFetch('/api/indicators');
    if (!data) return;

    const repeated = (data.indicators || []).filter(ind => ind.hitCount > 1);

    if (repeated.length === 0) {
        $content().innerHTML =
            '<div class="empty-card"><p>No repeated threats found yet. Indicators need to be seen across multiple sessions.</p></div>';
        return;
    }

    let html = '<div class="section-header">' +
        '<h2>Repeated Threats</h2>' +
        '<span class="section-count">' + repeated.length + ' correlated</span>' +
        '</div>';

    html += '<p style="color:var(--text-secondary); margin-bottom: 20px; font-size: 0.9rem;">' +
        '⚠️ Indicators seen across multiple sessions may represent reused scam infrastructure.' +
        '</p>';

    html += '<table class="indicators-table"><thead><tr>' +
        '<th>Type</th><th>Value</th><th>Hit Count</th><th>First Seen</th><th>Last Seen</th>' +
        '</tr></thead><tbody>';

    for (const ind of repeated) {
        const label = TYPE_LABELS[ind.type] || ind.type;
        html += '<tr>' +
            '<td><span class="type-badge">' + esc(ind.type) + '</span></td>' +
            '<td class="mono">' + esc(ind.value) + '</td>' +
            '<td><span class="hit-badge" style="background:var(--danger-dim);color:var(--danger);">' + ind.hitCount + '</span></td>' +
            '<td>' + fmtDate(ind.firstSeenAt) + '</td>' +
            '<td>' + fmtDate(ind.lastSeenAt) + '</td>' +
            '</tr>';
    }

    html += '</tbody></table>';
    $content().innerHTML = html;
}

// --------------- Initialization ---------------

document.addEventListener('DOMContentLoaded', function () {
    const keyInput = document.getElementById('api-key-input');
    const connectBtn = document.getElementById('connect-btn');

    // Restore saved key
    apiKey = sessionStorage.getItem('niriksha_api_key') || '';
    keyInput.value = apiKey;

    // Connect button
    connectBtn.addEventListener('click', function () {
        apiKey = keyInput.value.trim();
        if (!apiKey) {
            renderError('Please enter an API key.');
            return;
        }
        sessionStorage.setItem('niriksha_api_key', apiKey);
        loadSessions();
    });

    // Enter key in input
    keyInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') connectBtn.click();
    });

    // Nav buttons
    document.getElementById('nav-sessions').addEventListener('click', function () {
        if (apiKey) loadSessions();
    });
    document.getElementById('nav-indicators').addEventListener('click', function () {
        if (apiKey) loadIndicators();
    });
    document.getElementById('nav-repeated').addEventListener('click', function () {
        if (apiKey) loadRepeatedThreats();
    });
    document.getElementById('nav-console').addEventListener('click', function () {
        if (apiKey) loadLiveConsole();
    });

    // Auto-load if key already saved
    if (apiKey) loadSessions();
});

// --------------- Live Console ---------------

let lcSessionId = '';
let lcConversation = [];
let lcTurnCount = 0;
const LC_MAX_TURNS = 5;

function loadLiveConsole() {
    setActiveNav('console');
    if (!lcSessionId) lcSessionId = 'live-' + Math.random().toString(36).substr(2, 9);
    
    renderLiveConsole();
}

function renderLiveConsole() {
    let turnsLeft = LC_MAX_TURNS - lcTurnCount;
    let warningHtml = '';
    if (turnsLeft <= 0) {
        warningHtml = '<span class="token-warning">Token cap reached (' + LC_MAX_TURNS + '/' + LC_MAX_TURNS + '). Please reset to start a new session.</span>';
    } else {
        warningHtml = '<span style="font-size:0.8rem; color:var(--text-muted);">Token-conscious mode: ' + turnsLeft + ' turns remaining.</span>';
    }

    let html = '<div class="section-header">' +
        '<h2>💻 Live Console</h2>' +
        '<span class="section-count">Live Demo</span>' +
        '</div>';

    html += '<div class="console-grid">';
    
    // Controls panel
    html += '<div class="console-card">';
    html += '<div class="console-header"><h3>Active Simulation</h3>' + warningHtml + '</div>';
    html += '<div class="console-form">';
    
    html += '<div class="input-group">' +
        '<label>Session ID</label>' +
        '<input type="text" id="lc-session-id" class="console-input" value="' + esc(lcSessionId) + '" onchange="lcSessionId = this.value">' +
        '</div>';
        
    html += '<div class="input-group">' +
        '<label>Scammer Message</label>' +
        '<textarea id="lc-msg" class="console-input" rows="3" placeholder="Type scammer message here..." ' + (turnsLeft <= 0 ? 'disabled' : '') + '></textarea>' +
        '</div>';

    html += '<div class="example-spills">' +
        '<span style="font-size: 0.8rem; color: var(--text-muted); align-self: center;">Load Example:</span>' +
        '<button class="example-btn" onclick="lcPrefill(\'Your HDFC bank account will be blocked today. Please complete KYC here: http://hdfc-kyc-update.net\')">Bank KYC</button>' +
        '<button class="example-btn" onclick="lcPrefill(\'Claim your free iPhone now! Click this link: http://win-iphone15-free.com\')">Phishing</button>' +
        '<button class="example-btn" onclick="lcPrefill(\'I sent Rs 5000 to your number by mistake. Please refund it to my UPI ID.\')">UPI Refund</button>' +
        '<button class="example-btn" onclick="lcPrefill(\'Earn 500% returns in 3 days with our crypto plan. Join now!\')">Investment</button>' +
        '</div>';

    html += '<div class="console-actions">' +
        '<button id="lc-send-btn" class="btn-primary" onclick="lcSendMessage()" ' + (turnsLeft <= 0 ? 'disabled' : '') + '>📤 Send Message</button>' +
        '<button class="btn-secondary" onclick="lcResetSession()">🔄 Reset Session</button>' +
        '</div>';

    html += '</div></div>'; // end console-form, console-card
    
    // Conversation display
    html += '<div class="console-card" style="margin-top: 20px;">';
    html += '<h3>Live Interaction</h3>';
    html += '<div class="live-chat-display" id="lc-chat-display">';
    
    if (lcConversation.length === 0) {
        html += '<div class="live-chat-empty">No messages yet. Send a message to start the simulation.</div>';
    } else {
        lcConversation.forEach((m, idx) => {
            const cls = m.sender === 'scammer' ? 'msg-scammer' : 'msg-honeypot';
            const label = m.sender === 'scammer' ? '🔴 Scammer Input' : '🛡️ Honeypot Reply';
            html += '<div class="msg ' + cls + '">' +
                '<div class="msg-meta">' +
                    '<span class="msg-sender">' + label + '</span>' +
                '</div>' +
                '<div class="msg-text">' + esc(m.text) + '</div>' +
            '</div>';
        });
    }
    
    html += '</div>'; // end live-chat-display
    
    // Final report panel placeholder
    html += '<div id="lc-report-panel"></div>';
    
    html += '</div>'; // end console-card
    html += '</div>'; // end console-grid

    $content().innerHTML = html;
    
    // Auto-scroll to bottom
    const chatDisp = document.getElementById('lc-chat-display');
    if (chatDisp) chatDisp.scrollTop = chatDisp.scrollHeight;
}

window.lcPrefill = function(text) {
    const ta = document.getElementById('lc-msg');
    if (ta && !ta.disabled) {
        ta.value = text;
        ta.focus();
    }
};

window.lcResetSession = function() {
    const newId = 'live-' + Math.random().toString(36).substr(2, 9);
    lcSessionId = newId;
    lcConversation = [];
    lcTurnCount = 0;
    renderLiveConsole();
};

window.lcSendMessage = async function() {
    const ta = document.getElementById('lc-msg');
    if (!ta) return;
    const msgText = ta.value.trim();
    if (!msgText) return;
    
    const sessInput = document.getElementById('lc-session-id');
    if (sessInput) lcSessionId = sessInput.value.trim() || 'live-' + Math.random().toString(36).substr(2, 9);
    
    if (lcTurnCount >= LC_MAX_TURNS) return;
    
    // UI Update (Optimistic)
    lcConversation.push({ sender: 'scammer', text: msgText });
    lcTurnCount++;
    ta.value = '';
    renderLiveConsole(); 
    
    // Add loading indicator
    const chatDisp = document.getElementById('lc-chat-display');
    chatDisp.innerHTML += '<div id="lc-loading" class="msg msg-honeypot" style="opacity: 0.7;"><i>Typing reply...</i></div>';
    chatDisp.scrollTop = chatDisp.scrollHeight;
    
    const btn = document.getElementById('lc-send-btn');
    if (btn) btn.disabled = true;
    
    // Send to API
    try {
        const payload = {
            session_id: lcSessionId,
            message: { sender: 'scammer', text: msgText },
            conversation_history: lcConversation.slice(0, -1) // without the message just added
        };
        
        const res = await fetch('/api/detect', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-api-key': apiKey 
            },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const errDiv = document.getElementById('lc-loading');
            if (errDiv) errDiv.innerHTML = '<span style="color:var(--danger)">Error: Server returned ' + res.status + '</span>';
            if (btn && lcTurnCount < LC_MAX_TURNS) btn.disabled = false;
            return;
        }
        
        const data = await res.json();
        
        // Remove loading state
        const errDiv = document.getElementById('lc-loading');
        if (errDiv) errDiv.remove();
        
        // Append honeypot reply
        lcConversation.push({ sender: 'honeypot', text: data.reply });
        
        renderLiveConsole();
        
        // Final Output Check
        if (data.finalOutput || data.finalCallback) {
            const report = data.finalOutput || data.finalCallback;
            const scamType = report.scamType || report.scam_type || 'Unknown';
            let conf = report.confidenceLevel || report.confidence_level || 0;
            if (conf <= 1) conf = Math.round(conf * 100);
            
            const panel = document.getElementById('lc-report-panel');
            if (panel) {
                panel.innerHTML = '<div class="final-report-panel">' +
                    '<div class="final-report-info">' +
                        '<span class="final-report-title">✅ Final Report Generated</span>' +
                        '<span class="final-report-desc">Detected <strong>' + esc(scamType.replace(/_/g, ' ')) + '</strong> (' + conf + '% confidence).</span>' +
                    '</div>' +
                    '<button class="report-btn" onclick="loadReport(\'' + esc(lcSessionId) + '\')">📄 View Full Report</button>' +
                '</div>';
            }
        }
    } catch (err) {
        const errDiv = document.getElementById('lc-loading');
        if (errDiv) errDiv.innerHTML = '<span style="color:var(--danger)">Network Error: ' + esc(err.message) + '</span>';
        if (btn && lcTurnCount < LC_MAX_TURNS) btn.disabled = false;
    }
};

