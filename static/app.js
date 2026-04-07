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
    phone: 'TEL',
    bank_account: 'BANK',
    upi: 'UPI',
    phishing_link: 'URL',
    email: 'EMAIL',
    reference_id: 'REF'
};

const EXT_KEY_LABELS = {
    phoneNumbers: 'TEL',
    bankAccounts: 'BANK',
    upiIds: 'UPI',
    phishingLinks: 'URL',
    emailAddresses: 'EMAIL',
    referenceIds: 'REF'
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

let currentSessionFilter = 'completed';

async function loadSessions(filter = null) {
    setActiveNav('sessions');
    if (filter) currentSessionFilter = filter;
    renderLoading('Loading sessions...');

    const data = await apiFetch('/api/sessions');
    if (!data) return;

    if (!data.sessions || data.sessions.length === 0) {
        $content().innerHTML =
            '<div class="empty-card"><p>No sessions found. Run the test suite to generate data.</p></div>';
        return;
    }

    let displaySessions = data.sessions.map(s => {
        if (s.hasReport) s.sessionStatus = 'completed';
        return s;
    });

    if (currentSessionFilter === 'completed') {
        displaySessions = displaySessions.filter(s => s.sessionStatus === 'completed');
    } else if (currentSessionFilter === 'active') {
        displaySessions = displaySessions.filter(s => s.sessionStatus !== 'completed');
    }

    let html = '<div class="section-header">' +
        '<h2>Captured Sessions</h2>' +
        '<span class="section-count">' + displaySessions.length + ' entries (' + currentSessionFilter + ')</span>' +
        '</div>';

    html += '<p style="color:var(--text-secondary); margin-bottom: 20px; font-size: 0.9rem;">' +
        '[!] Stored history of captured scam interactions and honeypot extractions.' +
        '</p>';

    html += '<div style="margin-bottom:20px; display:flex; gap:10px;">';
    ['all', 'completed', 'active'].forEach(f => {
        const activeCls = (f === currentSessionFilter) ? ' active' : '';
        html += '<button class="export-btn' + activeCls + '" onclick="loadSessions(\'' + f + '\')">' + 
                f.charAt(0).toUpperCase() + f.slice(1) + '</button>';
    });
    html += '</div>';

    if (displaySessions.length === 0) {
        html += '<div class="empty-card"><p>No ' + currentSessionFilter + ' sessions found.</p></div>';
    } else {
        html += '<div class="session-grid">';
        for (const s of displaySessions) {
            html += '<div class="session-card" onclick="loadSessionDetail(\'' + esc(s.sessionId) + '\')">' +
                '<div class="session-top">' +
                    '<span class="session-id">' + esc(s.sessionId.substring(0, 16)) + '...</span>' +
                    '<span class="badge badge-' + esc(s.sessionStatus) + '">' + esc(s.sessionStatus).toUpperCase() + '</span>' +
                '</div>' +
                '<div class="session-metrics">' +
                    '<div class="metric"><span class="metric-label">Turns</span><span class="metric-value">' + s.turnCount + '</span></div>' +
                    '<div class="metric"><span class="metric-label">Score</span><span class="metric-value">' + s.scamScore + '</span></div>' +
                    '<div class="metric"><span class="metric-label">Report</span><span class="metric-value">' + (s.hasReport ? '<span style="color:var(--success)">[READY]</span>' : '—') + '</span></div>' +
                '</div>' +
            '</div>';
        }
        html += '</div>';
    }

    $content().innerHTML = html;
}

// --------------- Session Detail ---------------

async function loadSessionDetail(sessionId) {
    setActiveNav('sessions');
    renderLoading('Loading session detail...');

    const data = await apiFetch('/api/sessions/' + encodeURIComponent(sessionId));
    if (!data) return;

    const s = data.session;
    
    // Status consistency
    if (data.reportAvailable) {
        s.sessionStatus = 'COMPLETED';
    }
    
    let html = '<button class="back-btn" onclick="loadSessions()">← Back to Sessions</button>';

    // Session info card
    html += '<div class="detail-grid">';

    // Info
    html += '<div class="detail-card"><h3>[ SESSION_METADATA ]</h3><div class="info-grid">' +
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
    html += '<div class="detail-card"><h3>[ TRANSCRIPT ] (' + data.messages.length + ' messages)</h3>' +
        '<div class="chat-container">';

    for (const m of data.messages) {
        const cls = m.sender === 'scammer' ? 'msg-scammer' : 'msg-honeypot';
        const label = m.sender === 'scammer' ? 'TARGET' : 'SYSTEM';
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
    html += '<div class="detail-card"><h3>[ EXTRACTED_IOCS ]</h3>';
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
            '<button class="report-btn" onclick="loadReport(\'' + esc(s.sessionId) + '\')">[ VIEW_REPORT ]</button>' +
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
    
    html += '<h3 style="margin: 24px 0 14px;">[ SECURITY_TRIAGE ]</h3>';
    html += '<div class="triage-container">';
    
    // Severity & Actions
    html += '<div class="triage-main">';
    html += '<h4 class="triage-severity">Severity: <span style="color:' + sevColor + ';">' + severity + '</span></h4>';
    html += '<ul class="triage-list">';
    if (triageReasons.length === 0) triageReasons.push("No significant risk factors flagged");
    triageReasons.forEach(rs => { html += '<li>' + esc(rs) + '</li>'; });
    html += '</ul>';
    
    html += '<h5 class="triage-recs-title">Recommended Defensive Actions:</h5>';
    html += '<ul class="triage-list">';
    if (intel.phishingLinks && intel.phishingLinks.length > 0) html += '<li>Block phishing domains at corporate firewall.</li>';
    if ((intel.bankAccounts && intel.bankAccounts.length > 0) || (intel.upiIds && intel.upiIds.length > 0)) html += '<li>Flag financial accounts for fraud monitoring.</li>';
    if (isRepeated) html += '<li>Investigate correlated sessions for broader campaign attribution.</li>';
    html += '<li>Preserve session report and evidence hash for incident response.</li>';
    html += '</ul>';
    html += '</div>';
    
    // IOC Exports
    html += '<div class="triage-exports">';
    html += '<h5 class="triage-exports-title">Threat Intel Export:</h5>';
    html += '<button class="export-btn" onclick="exportData(\'json\')">JSON</button>';
    html += '<button class="export-btn" onclick="exportData(\'csv\')">CSV</button>';
    html += '<button class="export-btn" onclick="exportData(\'txt\')">TXT</button>';
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
        html += '<h3 style="margin: 20px 0 10px;">[ AGENT_LOGS ]</h3>' +
            '<div class="agent-notes">' + esc(notes) + '</div>';
    }
    
    html += '<h3 style="margin: 24px 0 10px;">[ CHAIN_OF_CUSTODY ]</h3>';
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
        '<h2>[ IOC_REGISTRY ]</h2>' +
        '<span class="section-count">' + data.indicators.length + ' unique</span>' +
        '</div>';

    html += '<p style="color:var(--text-secondary); margin-bottom: 20px; font-size: 0.9rem;">' +
        '[!] Unique indicators extracted across stored sessions.' +
        '</p>';

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
        '<h2>[ CORRELATED_INFRASTRUCTURE ]</h2>' +
        '<span class="section-count">' + repeated.length + ' correlated</span>' +
        '</div>';

    html += '<p style="color:var(--text-secondary); margin-bottom: 20px; font-size: 0.9rem;">' +
        '[!] Indicators seen across multiple sessions suggesting reused scam infrastructure.' +
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
        loadLiveConsole();
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
    if (apiKey) loadLiveConsole();
});

// --------------- Live Console ---------------

let lcSessionId = '';
let lcConversation = [];
let lcTurnCount = 0;
const LC_MAX_TURNS = 10;
const LC_SOFT_LIMIT = 7;

function loadLiveConsole() {
    setActiveNav('console');
    if (!lcSessionId) lcSessionId = 'live-' + Math.random().toString(36).substr(2, 9);
    
    renderLiveConsole();
}

function renderLiveConsole() {
    let turnsLeft = LC_MAX_TURNS - lcTurnCount;
    let warningHtml = '';
    if (turnsLeft <= 0) {
        warningHtml = '<span class="token-warning" style="color:var(--danger)">[ LOCKOUT ] Turn cap reached. Session terminated.</span>';
    } else if (lcTurnCount >= LC_SOFT_LIMIT) {
        warningHtml = '<span class="token-warning">[ WARNING ] Approaching cap: ' + turnsLeft + ' turns remaining.</span>';
    } else {
        warningHtml = '<span style="font-size:0.8rem; color:var(--text-muted); font-family:var(--font-mono);">[ SYSTEM_READY ] ' + turnsLeft + ' turns remaining.</span>';
    }

    let html = '<div class="section-header">' +
        '<h2>[ DECEPTION_CONSOLE ]</h2>' +
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
        '<button class="example-btn" onclick="lcPrefillCategory(\'kyc\')">Bank KYC</button>' +
        '<button class="example-btn" onclick="lcPrefillCategory(\'phishing\')">Phishing Link</button>' +
        '<button class="example-btn" onclick="lcPrefillCategory(\'upi\')">UPI / Refund</button>' +
        '<button class="example-btn" onclick="lcPrefillCategory(\'investment\')">Investment</button>' +
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

const LC_PRESETS = {
    kyc: [
        'Your HDFC bank account will be blocked today. Please complete KYC here: http://hdfc-kyc-update.net',
        'Dear Customer, your SBI account PAN linkage is pending. Please update via link: http://sbi-pan-update.com',
        'Attention: ICICI Bank KYC suspended. Click here to verify your identity: http://verify-icici-kyc.in',
        'Account locked due to unusual activity. Provide Aadhar details immediately to restore access.',
        'Urgent: Complete your e-KYC for Axis Bank. Failure will result in Rs 500 penalty. Link: http://axis-ekyc-portal.com'
    ],
    phishing: [
        'Claim your free iPhone now! Click this link: http://win-iphone15-free.com',
        'Congratulations! You have been selected for a free gift card. Claim here: http://amazon-rewards-claim.net',
        'You have an undelivered package from India Post. Pay Rs 5 clearance fee: http://indiapost-tracking-fee.com',
        'Your Netflix subscription has expired. Update payment details: http://netflix-billing-update.com',
        'Amazon Prime membership cancelled. Reactive account and claim reward here: http://amz-prime-renewal.com'
    ],
    upi: [
        'I sent Rs 5000 to your number by mistake. Please refund it to my UPI ID.',
        'Congrats, you won Rs 10,000 on PhonePe! Enter UPI PIN to receive cashback.',
        'Please scan this QR code to receive your Olx item payment directly to your bank account.',
        'Dear user, your Google Pay reward of Rs 1,500 is pending. Proceed with UPI to claim.',
        'Merchant refund initiated. To receive Rs 2000, please approve the collect request on your UPI app.'
    ],
    investment: [
        'Earn 500% returns in 3 days with our crypto plan. Join now!',
        'Work from home part-time and earn Rs 5000 daily by simply liking YouTube videos. Contact me for details.',
        'Premium trading tips! Join our Telegram group to turn Rs 10k into Rs 1 Lakh in one week.',
        'Guaranteed doubled money in 30 days! Invest in our international hedge fund. Minimum deposit Rs 1000.',
        'Want to earn money online? Share your WhatsApp number and I will guide you to make Rs 2000 per hour.'
    ]
};

window.lcPrefillCategory = function(cat) {
    const texts = LC_PRESETS[cat];
    if (!texts) return;
    const picked = texts[Math.floor(Math.random() * texts.length)];
    lcPrefill(picked);
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
            
            // Re-use export data globally
            window.currentReportData = report;
            window.currentReportIntel = report.extractedIntelligence || report.extracted_intelligence || {};
            
            const panel = document.getElementById('lc-report-panel');
            if (panel) {
                panel.innerHTML = '<div class="final-report-panel">' +
                    '<div class="final-report-info">' +
                        '<span class="final-report-title">✅ Final Report Generated</span>' +
                        '<span class="final-report-desc">Detected <strong>' + esc(scamType.replace(/_/g, ' ')) + '</strong> (' + conf + '% confidence).</span>' +
                    '</div>' +
                    '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">' +
                    '<button class="export-btn" onclick="exportData(\'json\')">📥 JSON</button>' +
                    '<button class="export-btn" onclick="exportData(\'csv\')">📥 IOC CSV</button>' +
                    '<button class="export-btn" onclick="exportData(\'txt\')">📥 Blocklist TXT</button>' +
                    '<button class="report-btn" onclick="loadReport(\'' + esc(lcSessionId) + '\')">📄 View Full Report</button>' +
                    '</div>' +
                '</div>';
            }
        }
    } catch (err) {
        const errDiv = document.getElementById('lc-loading');
        if (errDiv) errDiv.innerHTML = '<span style="color:var(--danger)">Network Error: ' + esc(err.message) + '</span>';
        if (btn && lcTurnCount < LC_MAX_TURNS) btn.disabled = false;
    }
};

