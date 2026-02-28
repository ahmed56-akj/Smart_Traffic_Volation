// ===================== DATA STORE =====================
let violations = JSON.parse(localStorage.getItem('tg_violations') || '[]');
let auditLog = JSON.parse(localStorage.getItem('tg_audit') || '[]');
let currentPayViolation = null;

const VIOLATION_LABELS = {
  speeding_minor: 'Speeding (Minor)', speeding_major: 'Speeding (Major)',
  red_light: 'Running Red Light', no_seatbelt: 'No Seatbelt',
  mobile_use: 'Mobile Phone Use', wrong_way: 'Wrong Way Driving',
  illegal_parking: 'Illegal Parking', no_license: 'No License',
  drunk_driving: 'Drunk Driving (DUI)', reckless: 'Reckless Driving',
  overloading: 'Vehicle Overloading', no_helmet: 'No Helmet'
};

function save() {
  localStorage.setItem('tg_violations', JSON.stringify(violations));
  localStorage.setItem('tg_audit', JSON.stringify(auditLog));
}

function addAudit(action, detail, color='#6b7280') {
  auditLog.unshift({
    time: new Date().toLocaleString(),
    action, detail, color
  });
  if (auditLog.length > 200) auditLog.pop();
  save();
}

function generateId() {
  return 'TG-' + Date.now().toString(36).toUpperCase();
}

// ===================== NAV =====================
function showPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  if (el) el.classList.add('active');
  const titles = {
    dashboard: 'Dashboard', record: 'Record Violation',
    violations: 'All Violations', payment: 'Pay Fine',
    reports: 'Reports & Analytics', audit: 'Audit Log'
  };
  document.getElementById('page-title').textContent = titles[name] || name;

  if (name === 'dashboard') renderDashboard();
  if (name === 'violations') renderViolations();
  if (name === 'reports') renderReports();
  if (name === 'audit') renderAudit();
}

// ===================== CLOCK =====================
function updateClock() {
  const now = new Date().toLocaleTimeString();
  document.getElementById('main-clock').textContent = now;
  document.getElementById('sidebar-clock').textContent = now;
}
setInterval(updateClock, 1000); updateClock();

// ===================== DASHBOARD =====================
function renderDashboard() {
  const total = violations.length;
  const unpaid = violations.filter(v => v.status === 'unpaid').length;
  const revenue = violations.filter(v => v.status === 'paid').reduce((a,v) => a + v.total, 0);
  const due = violations.filter(v => v.status === 'unpaid').reduce((a,v) => a + v.total, 0);

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-unpaid').textContent = unpaid;
  document.getElementById('stat-revenue').textContent = '₨' + revenue.toLocaleString();
  document.getElementById('stat-due').textContent = '₨' + due.toLocaleString();
  document.getElementById('total-badge').textContent = total;

  const recent = violations.slice(-5).reverse();
  const tbody = document.getElementById('recent-table');
  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon"><i class="fa fa-inbox"></i></div>No violations recorded yet</div></td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(v => `
    <tr>
      <td class="mono" style="color:var(--accent)">${v.id}</td>
      <td class="mono">${v.plate}</td>
      <td>${VIOLATION_LABELS[v.type] || v.type}</td>
      <td class="mono">₨${v.total.toLocaleString()}</td>
      <td>${statusChip(v.status)}</td>
      <td style="color:var(--muted);font-size:12px">${new Date(v.timestamp).toLocaleDateString()}</td>
    </tr>`).join('');
}

// ===================== FINE CALC =====================
function updateFinePreview() {
  const sel = document.getElementById('violation-type');
  const opt = sel.options[sel.selectedIndex];
  const base = parseInt(opt.getAttribute('data-fine') || 0);
  if (!base) { document.getElementById('fine-preview').style.display = 'none'; return; }
  const fee = Math.round(base * 0.05);
  const total = base + fee;
  document.getElementById('preview-base').textContent = '₨' + base.toLocaleString();
  document.getElementById('preview-fee').textContent = '₨' + fee.toLocaleString();
  document.getElementById('preview-total').textContent = '₨' + total.toLocaleString();
  document.getElementById('fine-preview').style.display = 'block';
}

// ===================== RECORD VIOLATION =====================
function recordViolation() {
  const plate = document.getElementById('plate').value.trim();
  const vtype = document.getElementById('vehicle-type').value;
  const vioType = document.getElementById('violation-type').value;
  const location = document.getElementById('location').value.trim();

  if (!plate || !vtype || !vioType || !location) {
    showAlert('record-alert', '❌ Please fill in all required fields.', 'error');
    return;
  }

  const sel = document.getElementById('violation-type');
  const base = parseInt(sel.options[sel.selectedIndex].getAttribute('data-fine'));
  const fee = Math.round(base * 0.05);
  const total = base + fee;

  const v = {
    id: generateId(),
    plate,
    vehicleType: vtype,
    owner: document.getElementById('owner-name').value.trim() || 'Unknown',
    contact: document.getElementById('owner-contact').value.trim(),
    type: vioType,
    severity: document.getElementById('severity').value,
    location,
    officer: document.getElementById('officer-id').value.trim(),
    notes: document.getElementById('notes').value.trim(),
    base, fee, total,
    status: 'unpaid',
    timestamp: new Date().toISOString(),
    payments: []
  };

  violations.push(v);
  addAudit('VIOLATION RECORDED', `${v.id} · ${v.plate} · ${VIOLATION_LABELS[v.type]} · ₨${total.toLocaleString()}`, '#f5c518');
  save();

  showAlert('record-alert', `<i class="fa fa-check-circle"></i> Violation ${v.id} recorded successfully! Fine: ₨${total.toLocaleString()}`, 'success');
  clearForm();
  document.getElementById('total-badge').textContent = violations.length;
  renderDashboard();
}

function clearForm() {
  ['plate','owner-name','owner-contact','location','officer-id','notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('vehicle-type').value = '';
  document.getElementById('violation-type').value = '';
  document.getElementById('severity').value = 'minor';
  document.getElementById('fine-preview').style.display = 'none';
}

// ===================== ALL VIOLATIONS =====================
function renderViolations() {
  const search = (document.getElementById('search-input').value || '').toLowerCase();
  const filterStatus = document.getElementById('filter-status').value;
  const filterType = document.getElementById('filter-type').value;

  // Populate type filter
  const typeFilter = document.getElementById('filter-type');
  if (typeFilter.options.length <= 1) {
    const types = [...new Set(violations.map(v => v.type))];
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = VIOLATION_LABELS[t] || t;
      typeFilter.appendChild(opt);
    });
  }

  let filtered = violations.filter(v => {
    const matchSearch = !search || v.plate.toLowerCase().includes(search) ||
      v.id.toLowerCase().includes(search) ||
      (VIOLATION_LABELS[v.type] || '').toLowerCase().includes(search) ||
      v.location.toLowerCase().includes(search) ||
      v.owner.toLowerCase().includes(search);
    const matchStatus = !filterStatus || v.status === filterStatus;
    const matchType = !filterType || v.type === filterType;
    return matchSearch && matchStatus && matchType;
  }).reverse();

  document.getElementById('violations-count').textContent = `Showing ${filtered.length} of ${violations.length} records`;

  const tbody = document.getElementById('violations-table');
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><div class="empty-icon"><i class="fa fa-search"></i></div>No matching violations found</div></td></tr>'; 
    return;
  }
  tbody.innerHTML = filtered.map(v => `
    <tr>
      <td class="mono" style="color:var(--accent);font-size:12px">${v.id}</td>
      <td class="mono" style="font-weight:700">${v.plate}</td>
      <td style="color:var(--muted)">${v.owner}</td>
      <td>${VIOLATION_LABELS[v.type] || v.type}</td>
      <td style="color:var(--muted);font-size:12px">${v.location}</td>
      <td class="mono">₨${v.total.toLocaleString()}</td>
      <td>${statusChip(v.status)}</td>
      <td style="color:var(--muted);font-size:12px">${new Date(v.timestamp).toLocaleDateString()}</td>
      <td>
        <div style="display:flex;gap:6px">
          ${v.status === 'unpaid' ? `<button class="btn btn-success btn-sm" onclick="openPayModal('${v.id}')">Pay</button>` : ''}
          ${v.status === 'unpaid' ? `<button class="btn btn-ghost btn-sm" onclick="disputeViolation('${v.id}')">Dispute</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteViolation('${v.id}')"><i class="fa fa-times"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function statusChip(s) {
  const map = { unpaid: 'chip-red', paid: 'chip-green', disputed: 'chip-yellow' };
  return `<span class="chip ${map[s] || 'chip-blue'}">${s.toUpperCase()}</span>`;
}

function disputeViolation(id) {
  const v = violations.find(x => x.id === id);
  if (!v || v.status !== 'unpaid') return;
  v.status = 'disputed';
  addAudit('DISPUTED', `${v.id} · ${v.plate} marked as disputed`, '#f97316');
  save(); renderViolations(); renderDashboard();
}

function deleteViolation(id) {
  const v = violations.find(x => x.id === id);
  if (!confirm(`Delete violation ${id}? This cannot be undone.`)) return;
  violations = violations.filter(x => x.id !== id);
  addAudit('DELETED', `${id} removed from system`, '#ef4444');
  save(); renderViolations(); renderDashboard();
}

function exportCSV() {
  const headers = ['ID','Plate','Owner','Type','Location','Base Fine','Fee','Total','Status','Date'];
  const rows = violations.map(v => [
    v.id, v.plate, v.owner, VIOLATION_LABELS[v.type] || v.type,
    v.location, v.base, v.fee, v.total, v.status,
    new Date(v.timestamp).toLocaleDateString()
  ]);
  const csv = [headers, ...rows].map(r => r.map(x => `"${x}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'violations_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  addAudit('EXPORT', 'Violations exported as CSV', '#00e5ff');
}

// ===================== PAYMENT =====================
function lookupViolation() {
  const q = document.getElementById('pay-search').value.trim().toUpperCase();
  const v = violations.find(x => x.id === q || x.plate === q);
  document.getElementById('pay-receipt').style.display = 'none';
  if (!v) {
    document.getElementById('pay-result').style.display = 'none';
    alert('No violation found with that ID or plate number.');
    return;
  }
  currentPayViolation = v;
  renderPayDetails(v);
  document.getElementById('pay-result').style.display = 'block';
}

function renderPayDetails(v) {
  document.getElementById('pay-details').innerHTML = `
    <div class="pay-info-row"><span>Violation ID</span><span class="mono" style="color:var(--accent)">${v.id}</span></div>
    <div class="pay-info-row"><span>License Plate</span><span class="mono">${v.plate}</span></div>
    <div class="pay-info-row"><span>Owner</span><span>${v.owner}</span></div>
    <div class="pay-info-row"><span>Violation</span><span>${VIOLATION_LABELS[v.type] || v.type}</span></div>
    <div class="pay-info-row"><span>Location</span><span>${v.location}</span></div>
    <div class="pay-info-row"><span>Base Fine</span><span class="mono">₨${v.base.toLocaleString()}</span></div>
    <div class="pay-info-row"><span>Processing Fee</span><span class="mono">₨${v.fee.toLocaleString()}</span></div>
    <div class="pay-info-row" style="font-weight:700;font-size:15px"><span>Total Due</span><span class="mono" style="color:var(--accent)">₨${v.total.toLocaleString()}</span></div>
    <div class="pay-info-row"><span>Status</span>${statusChip(v.status)}</div>
  `;
  document.getElementById('pay-already-paid').style.display = v.status === 'paid' ? 'flex' : 'none';
  document.getElementById('pay-form').style.display = v.status === 'paid' ? 'none' : 'block';
}

function processPayment() {
  if (!currentPayViolation || currentPayViolation.status === 'paid') return;
  const method = document.getElementById('pay-method').value;
  const name = document.getElementById('pay-name').value.trim() || currentPayViolation.owner;
  const ref = document.getElementById('pay-ref').value.trim();
  const receiptNo = 'RCT-' + Date.now().toString(36).toUpperCase();

  currentPayViolation.status = 'paid';
  currentPayViolation.payments.push({
    time: new Date().toISOString(), method, name, ref, receipt: receiptNo
  });
  addAudit('PAYMENT RECEIVED', `${currentPayViolation.id} · ₨${currentPayViolation.total.toLocaleString()} via ${method} · Receipt: ${receiptNo}`, '#22c55e');
  save();

  document.getElementById('pay-result').style.display = 'none';
  document.getElementById('pay-receipt').style.display = 'block';
  document.getElementById('receipt-content').innerHTML = `
    <div class="pay-info-row"><span>Receipt No</span><span class="mono" style="color:var(--green)">${receiptNo}</span></div>
    <div class="pay-info-row"><span>Violation ID</span><span class="mono">${currentPayViolation.id}</span></div>
    <div class="pay-info-row"><span>License Plate</span><span class="mono">${currentPayViolation.plate}</span></div>
    <div class="pay-info-row"><span>Amount Paid</span><span class="mono" style="color:var(--green);font-weight:700">₨${currentPayViolation.total.toLocaleString()}</span></div>
    <div class="pay-info-row"><span>Payment Method</span><span>${method}</span></div>
    <div class="pay-info-row"><span>Paid By</span><span>${name}</span></div>
    <div class="pay-info-row"><span>Date & Time</span><span class="mono" style="font-size:12px">${new Date().toLocaleString()}</span></div>
    ${ref ? `<div class="pay-info-row"><span>Reference</span><span class="mono">${ref}</span></div>` : ''}
  `;
  renderDashboard();
}

function printReceipt() { window.print(); }

// ===================== MODAL PAYMENT =====================
function openPayModal(id) {
  const v = violations.find(x => x.id === id);
  if (!v) return;
  currentPayViolation = v;
  document.getElementById('modal-content').innerHTML = `
    <div class="pay-info">
      <div class="pay-info-row"><span>ID</span><span class="mono" style="color:var(--accent)">${v.id}</span></div>
      <div class="pay-info-row"><span>Plate</span><span class="mono">${v.plate}</span></div>
      <div class="pay-info-row"><span>Violation</span><span>${VIOLATION_LABELS[v.type]}</span></div>
      <div class="pay-info-row" style="font-weight:700"><span>Amount Due</span><span style="color:var(--accent)">₨${v.total.toLocaleString()}</span></div>
    </div>
    <div class="form-group" style="margin-bottom:12px">
      <label>Payment Method</label>
      <select id="modal-method"><option>Credit Card</option><option>Debit Card</option><option>Bank Transfer</option><option>Cash</option><option>Mobile Wallet</option></select>
    </div>
    <div class="form-group" style="margin-bottom:16px">
      <label>Payer Name</label>
      <input type="text" id="modal-name" placeholder="Full name" value="${v.owner}">
    </div>
    <button class="btn btn-success" style="width:100%" onclick="modalProcessPayment()"><i class="fa fa-check"></i> Confirm Payment of ₨${v.total.toLocaleString()}</button>
  `;
  document.getElementById('modal-overlay').classList.add('open');
}

function modalProcessPayment() {
  if (!currentPayViolation) return;
  const method = document.getElementById('modal-method').value;
  const name = document.getElementById('modal-name').value.trim() || currentPayViolation.owner;
  const receiptNo = 'RCT-' + Date.now().toString(36).toUpperCase();
  currentPayViolation.status = 'paid';
  currentPayViolation.payments.push({ time: new Date().toISOString(), method, name, receipt: receiptNo });
  addAudit('PAYMENT RECEIVED', `${currentPayViolation.id} · ₨${currentPayViolation.total.toLocaleString()} via ${method}`, '#22c55e');
  save();
  closeModal();
  renderViolations();
  renderDashboard();
  alert(`<i class="fa fa-check-circle"></i> Payment successful! Receipt: ${receiptNo}`);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ===================== REPORTS =====================
function renderReports() {
  const total = violations.length;
  const paid = violations.filter(v => v.status === 'paid').length;
  const revenue = violations.filter(v => v.status === 'paid').reduce((a,v) => a + v.total, 0);
  const avgFine = total ? Math.round(violations.reduce((a,v) => a + v.total, 0) / total) : 0;

  document.getElementById('r-collection-rate').textContent = total ? Math.round(paid/total*100) + '%' : '0%';
  document.getElementById('r-avg-fine').textContent = '₨' + avgFine.toLocaleString();
  document.getElementById('r-revenue').textContent = '₨' + revenue.toLocaleString();

  // most common
  const counts = {};
  violations.forEach(v => counts[v.type] = (counts[v.type] || 0) + 1);
  const topType = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
  document.getElementById('r-most-common').textContent = topType ? VIOLATION_LABELS[topType[0]] || topType[0] : '—';

  // by type chart
  const maxCount = Math.max(...Object.values(counts), 1);
  document.getElementById('report-by-type').innerHTML = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([type,cnt]) => `
    <div class="bar-row">
      <div class="bar-label">${(VIOLATION_LABELS[type]||type).slice(0,16)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${cnt/maxCount*100}%;background:var(--accent)"></div></div>
      <div class="bar-count">${cnt}</div>
    </div>`).join('') || '<div style="color:var(--muted);font-size:13px">No data yet</div>';

  // by status
  const statusCounts = { paid: paid, unpaid: violations.filter(v=>v.status==='unpaid').length, disputed: violations.filter(v=>v.status==='disputed').length };
  const maxS = Math.max(...Object.values(statusCounts), 1);
  const colors = { paid: 'var(--green)', unpaid: 'var(--red)', disputed: 'var(--accent)' };
  document.getElementById('report-by-status').innerHTML = Object.entries(statusCounts).map(([s,cnt]) => `
    <div class="bar-row">
      <div class="bar-label">${s.charAt(0).toUpperCase()+s.slice(1)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${cnt/maxS*100}%;background:${colors[s]}"></div></div>
      <div class="bar-count">${cnt}</div>
    </div>`).join('');
}

// ===================== AUDIT =====================
function renderAudit() {
  document.getElementById('audit-count').textContent = auditLog.length + ' events recorded';
  const container = document.getElementById('audit-list');
  if (!auditLog.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fa fa-search"></i></div>No audit events yet</div>';
    return;
  }
  container.innerHTML = auditLog.map(e => `
    <div class="audit-item">
      <div class="audit-time">${e.time}</div>
      <div class="audit-dot" style="background:${e.color}"></div>
      <div>
        <div style="font-weight:700;font-size:12px;font-family:'JetBrains Mono',monospace;color:${e.color}">${e.action}</div>
        <div style="font-size:13px;color:var(--muted)">${e.detail}</div>
      </div>
    </div>`).join('');
}

function clearAudit() {
  if (!confirm('Clear all audit logs?')) return;
  auditLog = [];
  save();
  renderAudit();
}

// ===================== ALERTS =====================
function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  el.className = 'alert alert-' + type + ' show';
  el.textContent = msg;
  setTimeout(() => el.classList.remove('show'), 5000);
}

// ===================== INIT =====================
setTimeout(() => {
  const alertEl = document.getElementById('dash-alert');
  if (alertEl) alertEl.classList.remove('show');
}, 3000);
document.getElementById('dash-alert').classList.add('show');
renderDashboard();