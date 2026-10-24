/**
 * reports.js — Filters, table rendering, and CSV export
 */

let currentUser = null;
let currentReport = 'daily';

// ── Daily Report ──────────────────────────────────────────
async function loadDailyReport() {
  const date = document.getElementById('report-date').value || utils.todayISO();
  try {
    const data = await api.getDailyReport(date);
    renderReportTable(data.entries);
    renderTotals(data.totals);
  } catch (err) {
    utils.toast('Failed to load report: ' + err.message, 'error');
  }
}

// ── Monthly Report ────────────────────────────────────────
async function loadMonthlyReport() {
  const year  = document.getElementById('report-year').value  || new Date().getFullYear();
  const month = document.getElementById('report-month').value || (new Date().getMonth() + 1);
  try {
    const data = await api.getMonthlyReport(year, month);
    renderReportTable(data.rows);
    renderTotals(data.totals);
  } catch (err) {
    utils.toast('Failed to load report: ' + err.message, 'error');
  }
}

// ── Food Item Stats ───────────────────────────────────────
async function loadFoodStats() {
  try {
    const data = await api.getFoodItemStats();
    const tbody = document.getElementById('report-tbody');
    if (!data.stats.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--txt-secondary)">No data available.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.stats.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td><span class="badge badge-gray">${s.category}</span></td>
        <td>${s.unit}</td>
        <td>${utils.formatKg(s.total_waste_kg)}</td>
        <td>${utils.formatCO2(s.total_co2_kg)}</td>
        <td>${utils.wasteBadge(s.avg_waste_pct)}</td>
        <td>${s.times_wasted}</td>
      </tr>
    `).join('');
    renderTotals({ total_waste_kg: data.stats.reduce((s,r)=>s+r.total_waste_kg,0), total_co2_kg: data.stats.reduce((s,r)=>s+r.total_co2_kg,0) });
  } catch (err) {
    utils.toast('Failed to load food stats: ' + err.message, 'error');
  }
}

// ── Render Table (daily/monthly shared) ──────────────────
function renderReportTable(rows) {
  const tbody = document.getElementById('report-tbody');
  if (!tbody) return;

  if (!rows || !rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--txt-secondary)">No data for the selected period.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${utils.formatDate(r.date)}</td>
      <td>${utils.mealBadge(r.meal_type)}</td>
      <td><strong>${r.food_name}</strong></td>
      <td><span class="badge badge-gray">${r.category}</span></td>
      <td>${utils.formatKg(r.quantity_planned, r.unit)}</td>
      <td>${utils.formatKg(r.quantity_wasted, r.unit)}</td>
      <td>${utils.wasteBadge(r.waste_percentage)}</td>
      <td><span style="color:var(--clr-accent-light)">${utils.formatCO2(r.carbon_emission_kg)}</span></td>
    </tr>
  `).join('');
}

function renderTotals(totals) {
  const waste = document.getElementById('total-waste');
  const co2   = document.getElementById('total-co2');
  if (waste) waste.textContent = utils.formatKg(totals.total_waste_kg);
  if (co2)   co2.textContent   = utils.formatCO2(totals.total_co2_kg);
}

// ── Tab Switching ─────────────────────────────────────────
function switchTab(tab) {
  currentReport = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('[data-tab-panel]').forEach(p => {
    p.style.display = p.dataset.tabPanel === tab ? 'flex' : 'none';
  });

  // Update table headers
  const thead = document.getElementById('report-thead');
  if (thead) {
    if (tab === 'food-stats') {
      thead.innerHTML = '<tr><th>Food Item</th><th>Category</th><th>Unit</th><th>Total Wasted</th><th>Total CO₂</th><th>Avg Waste %</th><th>Times Wasted</th></tr>';
      loadFoodStats();
    } else {
      thead.innerHTML = '<tr><th>Date</th><th>Meal</th><th>Food Item</th><th>Category</th><th>Qty Planned</th><th>Qty Wasted</th><th>Waste %</th><th>CO₂ Emitted</th></tr>';
      if (tab === 'daily')   loadDailyReport();
      if (tab === 'monthly') loadMonthlyReport();
    }
  }
}

// ── CSV Export ────────────────────────────────────────────
function exportCSV() {
  const start = document.getElementById('filter-start')?.value || '';
  const end   = document.getElementById('filter-end')?.value   || '';
  let url = '/api/reports/export/csv';
  if (start || end) url += `?startDate=${start}&endDate=${end}`;
  utils.downloadCSV(url);
}

// ── Init ──────────────────────────────────────────────────
async function initReports() {
  currentUser = await utils.requireLogin();
  if (!currentUser) return;
  utils.renderUserInfo(currentUser);

  document.getElementById('report-date').value = utils.todayISO();
  document.getElementById('report-year').value  = new Date().getFullYear();
  document.getElementById('report-month').value = new Date().getMonth() + 1;

  switchTab('daily');

  document.querySelectorAll('.tab-btn').forEach(b =>
    b.addEventListener('click', () => switchTab(b.dataset.tab))
  );
  document.getElementById('report-date').addEventListener('change', loadDailyReport);
  document.getElementById('report-year').addEventListener('change', loadMonthlyReport);
  document.getElementById('report-month').addEventListener('change', loadMonthlyReport);
  document.getElementById('export-csv-btn').addEventListener('click', exportCSV);
}

document.addEventListener('DOMContentLoaded', initReports);
