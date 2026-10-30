/**
 * reports.js — Comprehensive Reports & Analytics for SIT Hostel Food Waste & Carbon Emissions
 * Siddaganga Institute of Technology (SIT), Tumakuru, Karnataka
 */

let currentUser   = null;
let currentReport = 'daily';
let hostelsList   = [];

// ── Populate Totals Summary Cards ─────────────────────────
function renderTotals(totals = {}) {
  const prepEl  = document.getElementById('total-prepared');
  const servEl  = document.getElementById('total-served');
  const wasteEl = document.getElementById('total-waste');
  const co2El   = document.getElementById('total-co2');

  if (prepEl)  prepEl.textContent  = utils.formatKg(totals.total_prepared_kg || 0);
  if (servEl)  servEl.textContent  = utils.formatKg(totals.total_served_kg || 0);
  if (wasteEl) wasteEl.textContent = utils.formatKg(totals.total_waste_kg || 0);
  if (co2El)   co2El.textContent   = utils.formatCO2(totals.total_co2_kg || 0);
}

// ── Render Empty State Helper ─────────────────────────────
function renderEmptyTable(colSpan = 8, message = 'No food records found for the selected filter period.') {
  const tbody = document.getElementById('report-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;padding:36px;color:var(--txt-secondary)">${message}</td></tr>`;
  }
}

// ── 1. Daily Report ───────────────────────────────────────
async function loadDailyReport() {
  const date     = document.getElementById('daily-date')?.value || utils.todayISO();
  const hostelId = document.getElementById('daily-hostel')?.value || 'all';

  const thead = document.getElementById('report-thead');
  if (thead) {
    thead.innerHTML = `
      <tr>
        <th>Date</th>
        <th>Time</th>
        <th>Hostel Block</th>
        <th>Mess</th>
        <th>Meal</th>
        <th>Food Item</th>
        <th>Category</th>
        <th>Prepared</th>
        <th>Served</th>
        <th>Leftover</th>
        <th>Discarded</th>
        <th>Total Waste</th>
        <th>CO₂e</th>
        <th>Reason</th>
      </tr>`;
  }

  try {
    const data = await api.getDailyReport(date, hostelId);
    const tbody = document.getElementById('report-tbody');
    if (!data.entries || !data.entries.length) {
      renderEmptyTable(14, `No food entries recorded on ${utils.formatDate(date)}.`);
    } else {
      tbody.innerHTML = data.entries.map(r => `
        <tr>
          <td>${utils.formatDate(r.date)}</td>
          <td class="muted">${r.time || '—'}</td>
          <td><strong>${r.hostel_name || 'SIT Hostel'}</strong></td>
          <td class="muted">${r.mess_name || '—'}</td>
          <td>${utils.mealBadge(r.meal_type)}</td>
          <td><strong>${r.food_name}</strong></td>
          <td><span class="badge badge-gray">${r.category}</span></td>
          <td>${r.quantity_prepared} ${r.unit}</td>
          <td>${r.quantity_served} ${r.unit}</td>
          <td>${r.quantity_leftover} ${r.unit}</td>
          <td>${r.quantity_discarded} ${r.unit}</td>
          <td><strong>${utils.formatKg(r.total_waste_kg)}</strong></td>
          <td><span style="color:var(--clr-accent-light)">${utils.formatCO2(r.carbon_emission_kg)}</span></td>
          <td class="muted">${r.reason || '—'}</td>
        </tr>
      `).join('');
    }
    renderTotals(data.totals);
  } catch (err) {
    utils.toast('Failed to load daily report: ' + err.message, 'error');
  }
}

// ── 2. Weekly Report ──────────────────────────────────────
async function loadWeeklyReport() {
  const start    = document.getElementById('weekly-start')?.value || '';
  const end      = document.getElementById('weekly-end')?.value || '';
  const hostelId = document.getElementById('weekly-hostel')?.value || 'all';

  const thead = document.getElementById('report-thead');
  if (thead) {
    thead.innerHTML = `
      <tr>
        <th>Date</th>
        <th>Meals / Items Logged</th>
        <th>Prepared (kg)</th>
        <th>Served (kg)</th>
        <th>Leftover (kg)</th>
        <th>Discarded (kg)</th>
        <th>Total Waste (kg)</th>
        <th>CO₂e (kg)</th>
      </tr>`;
  }

  try {
    const data = await api.getWeeklyReport(start, end, hostelId);
    const tbody = document.getElementById('report-tbody');
    if (!data.rows || !data.rows.length) {
      renderEmptyTable(8, 'No weekly records found for this date range.');
    } else {
      tbody.innerHTML = data.rows.map(r => `
        <tr>
          <td><strong>${utils.formatDate(r.date)}</strong></td>
          <td><span class="badge badge-info">${r.record_count} items</span></td>
          <td>${utils.formatKg(r.total_prepared_kg)}</td>
          <td>${utils.formatKg(r.total_served_kg)}</td>
          <td>${utils.formatKg(r.total_leftover_kg)}</td>
          <td>${utils.formatKg(r.total_discarded_kg)}</td>
          <td><strong>${utils.formatKg(r.total_waste_kg)}</strong></td>
          <td><span style="color:var(--clr-accent-light)">${utils.formatCO2(r.total_co2_kg)}</span></td>
        </tr>
      `).join('');
    }
    renderTotals(data.totals);
  } catch (err) {
    utils.toast('Failed to load weekly report: ' + err.message, 'error');
  }
}

// ── 3. Monthly Report ─────────────────────────────────────
async function loadMonthlyReport() {
  const year     = document.getElementById('monthly-year')?.value || new Date().getFullYear();
  const month    = document.getElementById('monthly-month')?.value || (new Date().getMonth() + 1);
  const hostelId = document.getElementById('monthly-hostel')?.value || 'all';

  const thead = document.getElementById('report-thead');
  if (thead) {
    thead.innerHTML = `
      <tr>
        <th>Date</th>
        <th>Hostel Block</th>
        <th>Meal</th>
        <th>Food Item</th>
        <th>Category</th>
        <th>Prepared</th>
        <th>Served</th>
        <th>Leftover</th>
        <th>Discarded</th>
        <th>Total Waste</th>
        <th>CO₂e Emitted</th>
      </tr>`;
  }

  try {
    const data = await api.getMonthlyReport(year, month, hostelId);
    const tbody = document.getElementById('report-tbody');
    if (!data.rows || !data.rows.length) {
      renderEmptyTable(11, `No records found for ${month}/${year}.`);
    } else {
      tbody.innerHTML = data.rows.map(r => `
        <tr>
          <td>${utils.formatDate(r.date)}</td>
          <td><strong>${r.hostel_name || 'SIT Hostel'}</strong></td>
          <td>${utils.mealBadge(r.meal_type)}</td>
          <td><strong>${r.food_name}</strong></td>
          <td><span class="badge badge-gray">${r.category}</span></td>
          <td>${r.quantity_prepared} ${r.unit}</td>
          <td>${r.quantity_served} ${r.unit}</td>
          <td>${r.quantity_leftover} ${r.unit}</td>
          <td>${r.quantity_discarded} ${r.unit}</td>
          <td><strong>${utils.formatKg(r.total_waste_kg)}</strong></td>
          <td><span style="color:var(--clr-accent-light)">${utils.formatCO2(r.carbon_emission_kg)}</span></td>
        </tr>
      `).join('');
    }
    renderTotals(data.totals);
  } catch (err) {
    utils.toast('Failed to load monthly report: ' + err.message, 'error');
  }
}

// ── 4. Semester Report ────────────────────────────────────
async function loadSemesterReport() {
  const ay       = document.getElementById('semester-ay')?.value || '2025-2026';
  const term     = document.getElementById('semester-term')?.value || 'odd';
  const hostelId = document.getElementById('semester-hostel')?.value || 'all';

  const thead = document.getElementById('report-thead');
  if (thead) {
    thead.innerHTML = `
      <tr>
        <th>Academic Month</th>
        <th>Records Count</th>
        <th>Prepared Food (kg)</th>
        <th>Served Food (kg)</th>
        <th>Leftover Food (kg)</th>
        <th>Discarded Food (kg)</th>
        <th>Total Waste (kg)</th>
        <th>CO₂e Emissions (kg)</th>
      </tr>`;
  }

  try {
    const data = await api.getSemesterReport(ay, term, hostelId);
    const tbody = document.getElementById('report-tbody');
    if (!data.rows || !data.rows.length) {
      renderEmptyTable(8, `No records found for ${ay} (${term.toUpperCase()} Semester).`);
    } else {
      tbody.innerHTML = data.rows.map(r => `
        <tr>
          <td><strong>📅 ${r.month}</strong></td>
          <td><span class="badge badge-info">${r.record_count} records</span></td>
          <td>${utils.formatKg(r.total_prepared_kg)}</td>
          <td>${utils.formatKg(r.total_served_kg)}</td>
          <td>${utils.formatKg(r.total_leftover_kg)}</td>
          <td>${utils.formatKg(r.total_discarded_kg)}</td>
          <td><strong>${utils.formatKg(r.total_waste_kg)}</strong></td>
          <td><span style="color:var(--clr-accent-light)">${utils.formatCO2(r.total_co2_kg)}</span></td>
        </tr>
      `).join('');
    }
    renderTotals(data.totals);
  } catch (err) {
    utils.toast('Failed to load semester report: ' + err.message, 'error');
  }
}

// ── 5. Hostel-Wise Report ─────────────────────────────────
async function loadHostelWiseReport() {
  const start = document.getElementById('hostelwise-start')?.value || '';
  const end   = document.getElementById('hostelwise-end')?.value || '';

  const thead = document.getElementById('report-thead');
  if (thead) {
    thead.innerHTML = `
      <tr>
        <th>SIT Hostel Block</th>
        <th>Category</th>
        <th>Capacity</th>
        <th>Records</th>
        <th>Prepared (kg)</th>
        <th>Served (kg)</th>
        <th>Leftover (kg)</th>
        <th>Total Waste (kg)</th>
        <th>CO₂e (kg)</th>
        <th>Waste / Student (kg)</th>
      </tr>`;
  }

  try {
    const data = await api.getHostelWiseReport(start, end);
    const tbody = document.getElementById('report-tbody');
    if (!data.rows || !data.rows.length) {
      renderEmptyTable(10, 'No hostel data available.');
    } else {
      tbody.innerHTML = data.rows.map(r => `
        <tr>
          <td><strong>${r.hostel_name}</strong></td>
          <td><span class="badge ${r.category === 'girls' ? 'badge-amber' : 'badge-info'}">${(r.category || 'boys').toUpperCase()}</span></td>
          <td>${r.capacity} students</td>
          <td>${r.record_count}</td>
          <td>${utils.formatKg(r.total_prepared_kg)}</td>
          <td>${utils.formatKg(r.total_served_kg)}</td>
          <td>${utils.formatKg(r.total_leftover_kg)}</td>
          <td><strong>${utils.formatKg(r.total_waste_kg)}</strong></td>
          <td><span style="color:var(--clr-accent-light)">${utils.formatCO2(r.total_co2_kg)}</span></td>
          <td><span class="badge badge-gray">${r.waste_per_student_kg || 0} kg/student</span></td>
        </tr>
      `).join('');
    }
    renderTotals(data.totals);
  } catch (err) {
    utils.toast('Failed to load hostel-wise report: ' + err.message, 'error');
  }
}

// ── 6. Meal-Wise Report ───────────────────────────────────
async function loadMealWiseReport() {
  const start    = document.getElementById('mealwise-start')?.value || '';
  const end      = document.getElementById('mealwise-end')?.value || '';
  const hostelId = document.getElementById('mealwise-hostel')?.value || 'all';

  const thead = document.getElementById('report-thead');
  if (thead) {
    thead.innerHTML = `
      <tr>
        <th>Meal Session</th>
        <th>Items Logged</th>
        <th>Prepared (kg)</th>
        <th>Served (kg)</th>
        <th>Leftover (kg)</th>
        <th>Discarded (kg)</th>
        <th>Total Waste (kg)</th>
        <th>CO₂e Emissions (kg)</th>
      </tr>`;
  }

  try {
    const data = await api.getMealWiseReport(start, end, hostelId);
    const tbody = document.getElementById('report-tbody');
    if (!data.rows || !data.rows.length) {
      renderEmptyTable(8, 'No meal data available for this range.');
    } else {
      tbody.innerHTML = data.rows.map(r => `
        <tr>
          <td>${utils.mealBadge(r.meal_type)}</td>
          <td><span class="badge badge-info">${r.record_count} items</span></td>
          <td>${utils.formatKg(r.total_prepared_kg)}</td>
          <td>${utils.formatKg(r.total_served_kg)}</td>
          <td>${utils.formatKg(r.total_leftover_kg)}</td>
          <td>${utils.formatKg(r.total_discarded_kg)}</td>
          <td><strong>${utils.formatKg(r.total_waste_kg)}</strong></td>
          <td><span style="color:var(--clr-accent-light)">${utils.formatCO2(r.total_co2_kg)}</span></td>
        </tr>
      `).join('');
    }
    renderTotals(data.totals);
  } catch (err) {
    utils.toast('Failed to load meal-wise report: ' + err.message, 'error');
  }
}

// ── 7. Food Item Stats Report ─────────────────────────────
async function loadFoodStats() {
  const start = document.getElementById('foodstats-start')?.value || '2020-01-01';
  const end   = document.getElementById('foodstats-end')?.value   || utils.todayISO();

  const thead = document.getElementById('report-thead');
  if (thead) {
    thead.innerHTML = `
      <tr>
        <th>Food Item</th>
        <th>Category</th>
        <th>Standard Unit</th>
        <th>Emission Factor (kg CO₂e/kg)</th>
        <th>Times Recorded</th>
        <th>Total Waste (kg)</th>
        <th>Total CO₂e (kg)</th>
      </tr>`;
  }

  try {
    const data = await api.getFoodItemStats(start, end);
    const tbody = document.getElementById('report-tbody');
    if (!data.stats || !data.stats.length) {
      renderEmptyTable(7, 'No food item statistics available.');
    } else {
      tbody.innerHTML = data.stats.map(s => `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td><span class="badge badge-gray">${s.category}</span></td>
          <td>${s.unit}</td>
          <td><code>${s.emission_factor || 1.0}</code></td>
          <td><span class="badge badge-info">${s.times_recorded}</span></td>
          <td><strong>${utils.formatKg(s.total_waste_kg)}</strong></td>
          <td><span style="color:var(--clr-accent-light)">${utils.formatCO2(s.total_co2_kg)}</span></td>
        </tr>
      `).join('');
    }
    const totWaste = data.stats.reduce((s, r) => s + (r.total_waste_kg || 0), 0);
    const totCo2   = data.stats.reduce((s, r) => s + (r.total_co2_kg || 0), 0);
    renderTotals({ total_waste_kg: totWaste, total_co2_kg: totCo2 });
  } catch (err) {
    utils.toast('Failed to load food item statistics: ' + err.message, 'error');
  }
}

// ── Tab Switching ─────────────────────────────────────────
function switchTab(tab) {
  currentReport = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('[data-tab-panel]').forEach(p => {
    p.style.display = p.dataset.tabPanel === tab ? 'flex' : 'none';
  });

  if (tab === 'daily')       loadDailyReport();
  if (tab === 'weekly')      loadWeeklyReport();
  if (tab === 'monthly')     loadMonthlyReport();
  if (tab === 'semester')    loadSemesterReport();
  if (tab === 'hostel-wise') loadHostelWiseReport();
  if (tab === 'meal-wise')   loadMealWiseReport();
  if (tab === 'food-stats')  loadFoodStats();
}

// ── Export CSV ────────────────────────────────────────────
function exportCSV() {
  const { start, end, hostel } = getActiveExportParams();
  let url = '/api/reports/export/csv?';
  const params = new URLSearchParams();
  if (start)  params.append('startDate', start);
  if (end)    params.append('endDate', end);
  if (hostel && hostel !== 'all') params.append('hostel_id', hostel);

  window.location.href = url + params.toString();
}

// ── Export Excel ──────────────────────────────────────────
function exportExcel() {
  const { start, end, hostel } = getActiveExportParams();
  let url = '/api/reports/export/excel?';
  const params = new URLSearchParams();
  if (start)  params.append('startDate', start);
  if (end)    params.append('endDate', end);
  if (hostel && hostel !== 'all') params.append('hostel_id', hostel);

  window.location.href = url + params.toString();
}

// ── Export PDF (Print Dialog) ─────────────────────────────
function exportPDF() {
  const metaEl = document.getElementById('print-meta');
  if (metaEl) {
    metaEl.textContent = `Report Type: ${currentReport.toUpperCase()} • Generated on: ${new Date().toLocaleString()} by ${currentUser ? currentUser.name : 'Hostel Admin'}`;
  }
  window.print();
}

// Helper to determine active date range & hostel for exports
function getActiveExportParams() {
  let start = '', end = '', hostel = 'all';

  if (currentReport === 'daily') {
    start = document.getElementById('daily-date')?.value || utils.todayISO();
    end   = start;
    hostel = document.getElementById('daily-hostel')?.value || 'all';
  } else if (currentReport === 'weekly') {
    start = document.getElementById('weekly-start')?.value || '';
    end   = document.getElementById('weekly-end')?.value || '';
    hostel = document.getElementById('weekly-hostel')?.value || 'all';
  } else if (currentReport === 'monthly') {
    const yr = document.getElementById('monthly-year')?.value || new Date().getFullYear();
    const mo = String(document.getElementById('monthly-month')?.value || (new Date().getMonth() + 1)).padStart(2, '0');
    start = `${yr}-${mo}-01`;
    end   = `${yr}-${mo}-31`;
    hostel = document.getElementById('monthly-hostel')?.value || 'all';
  } else if (currentReport === 'hostel-wise') {
    start = document.getElementById('hostelwise-start')?.value || '';
    end   = document.getElementById('hostelwise-end')?.value || '';
  } else if (currentReport === 'meal-wise') {
    start = document.getElementById('mealwise-start')?.value || '';
    end   = document.getElementById('mealwise-end')?.value || '';
    hostel = document.getElementById('mealwise-hostel')?.value || 'all';
  } else if (currentReport === 'food-stats') {
    start = document.getElementById('foodstats-start')?.value || '';
    end   = document.getElementById('foodstats-end')?.value || '';
  }

  return { start, end, hostel };
}

// ── Populate Hostels into Selectors ───────────────────────
function populateHostels() {
  const selects = document.querySelectorAll('.hostel-select');
  selects.forEach(sel => {
    sel.innerHTML = '<option value="all">All SIT Hostels</option>' +
      hostelsList.map(h => `<option value="${h.id}">${h.name} (${h.category.toUpperCase()})</option>`).join('');
  });
}

// ── Init ──────────────────────────────────────────────────
async function initReports() {
  currentUser = await utils.requireLogin();
  if (!currentUser) return;
  utils.renderUserInfo(currentUser);

  // Set default dates
  const today = utils.todayISO();
  const d7 = new Date();
  d7.setDate(d7.getDate() - 7);
  const sevenDaysAgo = d7.toISOString().split('T')[0];
  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);
  const thirtyDaysAgo = d30.toISOString().split('T')[0];

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('daily-date', today);
  setVal('weekly-start', sevenDaysAgo);
  setVal('weekly-end', today);
  setVal('monthly-year', new Date().getFullYear());
  setVal('monthly-month', new Date().getMonth() + 1);
  setVal('hostelwise-start', thirtyDaysAgo);
  setVal('hostelwise-end', today);
  setVal('mealwise-start', thirtyDaysAgo);
  setVal('mealwise-end', today);
  setVal('foodstats-start', thirtyDaysAgo);
  setVal('foodstats-end', today);

  // Load Hostels from DB
  try {
    const data = await api.getHostels();
    hostelsList = data.hostels || [];
    populateHostels();
  } catch (err) {
    console.error('Failed to load hostels:', err);
  }

  // Setup tab listeners
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.addEventListener('click', () => switchTab(b.dataset.tab))
  );

  // Setup export buttons
  document.getElementById('export-csv-btn')?.addEventListener('click', exportCSV);
  document.getElementById('export-excel-btn')?.addEventListener('click', exportExcel);
  document.getElementById('export-pdf-btn')?.addEventListener('click', exportPDF);

  // Start with Daily
  switchTab('daily');
}

document.addEventListener('DOMContentLoaded', initReports);

// Expose globals for inline onclicks
window.loadDailyReport      = loadDailyReport;
window.loadWeeklyReport     = loadWeeklyReport;
window.loadMonthlyReport    = loadMonthlyReport;
window.loadSemesterReport   = loadSemesterReport;
window.loadHostelWiseReport = loadHostelWiseReport;
window.loadMealWiseReport   = loadMealWiseReport;
window.loadFoodStats        = loadFoodStats;
window.switchTab            = switchTab;
window.exportCSV            = exportCSV;
window.exportExcel          = exportExcel;
window.exportPDF            = exportPDF;
