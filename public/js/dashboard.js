/**
 * dashboard.js — Fetch stats and render 6 summary cards and 7 Chart.js visualizations
 * Supports SIT Hostel filtering and real-time updates.
 */

// Chart.js default global styling
Chart.defaults.color = '#8b949e';
Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
Chart.defaults.font.size = 12;

const CHART_COLORS = {
  green:  'rgba(34, 197, 94, 0.85)',
  greenB: 'rgba(34, 197, 94, 1)',
  amber:  'rgba(245, 158, 11, 0.85)',
  amberB: 'rgba(245, 158, 11, 1)',
  red:    'rgba(239, 68, 68, 0.85)',
  blue:   'rgba(59, 130, 246, 0.85)',
  blueB:  'rgba(59, 130, 246, 1)',
  purple: 'rgba(168, 85, 247, 0.85)',
  teal:   'rgba(20, 184, 166, 0.85)',
  rose:   'rgba(244, 63, 94, 0.85)',
  grid:   'rgba(255, 255, 255, 0.06)'
};

let charts = {};
let selectedHostel = 'all';

function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
}

// ── Render Summary Cards & Mess Flow Strip ───────────────
function renderSummary(summary) {
  const {
    total_waste_kg = 0,
    total_co2_kg = 0,
    meals_logged = 0,
    weekly_reduction_pct = 0,
    total_prepared_kg = 0,
    total_served_kg = 0,
    total_leftover_kg = 0,
    total_discarded_kg = 0,
    total_waste_month_kg = 0,
    total_co2_month_kg = 0,
    carbon_context
  } = summary;

  const elWaste    = document.getElementById('stat-waste');
  const elCo2      = document.getElementById('stat-co2');
  const elMeals    = document.getElementById('stat-meals');
  const elReduc    = document.getElementById('stat-reduction');
  const elPrep     = document.getElementById('stat-prepared');
  const elServ     = document.getElementById('stat-served');
  const elLeft     = document.getElementById('stat-leftover');
  const elDisc     = document.getElementById('stat-discarded');
  const elMonth    = document.getElementById('stat-monthly-waste');
  const elMonthCo2 = document.getElementById('stat-monthly-co2');

  if (elWaste)    utils.animateCount(elWaste, total_waste_kg, 2);
  if (elCo2)      utils.animateCount(elCo2, total_co2_kg, 3);
  if (elMeals)    utils.animateCount(elMeals, meals_logged, 0);
  if (elReduc)    utils.animateCount(elReduc, Math.abs(weekly_reduction_pct), 1);
  if (elPrep)     utils.animateCount(elPrep, total_prepared_kg, 2);
  if (elServ)     utils.animateCount(elServ, total_served_kg, 2);
  if (elLeft)     utils.animateCount(elLeft, total_leftover_kg, 2);
  if (elDisc)     utils.animateCount(elDisc, total_discarded_kg, 2);
  if (elMonth)    utils.animateCount(elMonth, total_waste_month_kg, 2);
  if (elMonthCo2) utils.animateCount(elMonthCo2, total_co2_month_kg, 2);

  const reductionChange = document.getElementById('stat-reduction-change');
  if (reductionChange) {
    const isPositive = weekly_reduction_pct >= 0;
    reductionChange.textContent = isPositive
      ? `↓ ${Math.abs(weekly_reduction_pct).toFixed(1)}% less than last week`
      : `↑ ${Math.abs(weekly_reduction_pct).toFixed(1)}% more than last week`;
    reductionChange.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
  }

  const banner = document.getElementById('carbon-banner');
  if (banner && carbon_context) {
    banner.className = `co2-banner ${carbon_context.level}`;
    banner.innerHTML = `<span>${carbon_context.icon}</span><span>${carbon_context.message}</span>`;
  }
}

// ── Chart 1: Weekly Food Waste & CO2 Bar Chart ────────────
function renderWeeklyChart(data) {
  destroyChart('weekly');
  const ctx = document.getElementById('chart-weekly');
  if (!ctx) return;

  const labels = data.map(d => utils.formatDate(d.date));
  charts.weekly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Waste (kg)',
          data: data.map(d => parseFloat(d.total_waste_kg.toFixed(2))),
          backgroundColor: CHART_COLORS.green,
          borderColor: CHART_COLORS.greenB,
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: 'CO₂e (kg)',
          data: data.map(d => parseFloat(d.total_co2_kg.toFixed(3))),
          backgroundColor: CHART_COLORS.amber,
          borderColor: CHART_COLORS.amberB,
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { grid: { color: CHART_COLORS.grid } },
        y: { grid: { color: CHART_COLORS.grid }, beginAtZero: true }
      }
    }
  });
}

// ── Chart 2: Meal Distribution Doughnut Chart ─────────────
function renderMealChart(data) {
  destroyChart('meal');
  const ctx = document.getElementById('chart-meal');
  if (!ctx) return;

  charts.meal = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => utils.mealLabel(d.meal_type)),
      datasets: [{
        data: data.map(d => parseFloat(d.total_waste_kg.toFixed(2))),
        backgroundColor: [CHART_COLORS.amber, CHART_COLORS.green, CHART_COLORS.blue, CHART_COLORS.purple],
        borderColor: '#1c2330',
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true } }
      }
    }
  });
}

// ── Chart 3: Monthly Trends (Waste & Carbon) ──────────────
function renderMonthlyTrendsChart(data) {
  destroyChart('monthly');
  const ctx = document.getElementById('chart-monthly-trends');
  if (!ctx) return;

  const labels = data.map(d => d.month);
  charts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Prepared (kg)',
          data: data.map(d => parseFloat(d.total_prepared_kg.toFixed(1))),
          backgroundColor: CHART_COLORS.blue,
          borderRadius: 6,
          order: 2
        },
        {
          type: 'bar',
          label: 'Wasted (kg)',
          data: data.map(d => parseFloat(d.total_waste_kg.toFixed(1))),
          backgroundColor: CHART_COLORS.red,
          borderRadius: 6,
          order: 3
        },
        {
          type: 'line',
          label: 'CO₂e Emissions (kg)',
          data: data.map(d => parseFloat(d.total_co2_kg.toFixed(2))),
          borderColor: CHART_COLORS.amberB,
          backgroundColor: CHART_COLORS.amber,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { grid: { color: CHART_COLORS.grid } },
        y: { grid: { color: CHART_COLORS.grid }, beginAtZero: true }
      }
    }
  });
}

// ── Chart 4: SIT Hostel-Wise Waste & Carbon Comparison ─────
function renderHostelComparisonChart(data) {
  destroyChart('hostel');
  const ctx = document.getElementById('chart-hostel-comparison');
  if (!ctx) return;

  const labels = data.map(d => d.hostel_name.replace(' Block', '').replace(' Hostel', ''));
  charts.hostel = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Food Waste (kg)',
          data: data.map(d => parseFloat(d.total_waste_kg.toFixed(1))),
          backgroundColor: CHART_COLORS.blue,
          borderRadius: 6
        },
        {
          label: 'Carbon Emissions (kg CO₂e)',
          data: data.map(d => parseFloat(d.total_co2_kg.toFixed(2))),
          backgroundColor: CHART_COLORS.amber,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { grid: { color: CHART_COLORS.grid } },
        y: { grid: { color: CHART_COLORS.grid }, beginAtZero: true }
      }
    }
  });
}

// ── Chart 5: Category Breakdown Bar Chart ─────────────────
function renderCategoryChart(data) {
  destroyChart('category');
  const ctx = document.getElementById('chart-category');
  if (!ctx) return;

  charts.category = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.category),
      datasets: [{
        label: 'CO₂e Emissions (kg)',
        data: data.map(d => parseFloat(d.total_co2_kg.toFixed(2))),
        backgroundColor: [
          CHART_COLORS.amber,
          CHART_COLORS.green,
          CHART_COLORS.red,
          CHART_COLORS.blue,
          CHART_COLORS.purple,
          CHART_COLORS.teal
        ],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: CHART_COLORS.grid } },
        y: { grid: { color: CHART_COLORS.grid }, beginAtZero: true }
      }
    }
  });
}

// ── Chart 6: Carbon Emission Trend Line Chart ─────────────
function renderEmissionsChart(data) {
  destroyChart('emissions');
  const ctx = document.getElementById('chart-emissions');
  if (!ctx) return;

  const labels = data.map(d => utils.formatDate(d.date));
  charts.emissions = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'CO₂e Emissions (kg)',
        data: data.map(d => parseFloat(d.total_co2_kg.toFixed(3))),
        borderColor: CHART_COLORS.amberB,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: CHART_COLORS.amberB,
        pointRadius: 4,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: CHART_COLORS.grid } },
        y: { grid: { color: CHART_COLORS.grid }, beginAtZero: true }
      }
    }
  });
}

// ── Chart 7: Top Wasted Food Items Ranked List ────────────
function renderTopWasted(data) {
  const container = document.getElementById('top-wasted-list');
  if (!container) return;

  if (!data || !data.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🎉</div><p>No food waste logged yet!</p></div>';
    return;
  }

  const max = Math.max(...data.map(d => d.total_waste_kg), 1);
  container.innerHTML = data.map((item, i) => `
    <div class="top-wasted-item" style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div class="rank" style="font-weight:800;font-size:14px;color:var(--txt-secondary);width:20px">${i + 1}</div>
      <div class="item-info" style="flex:1">
        <div class="item-name" style="font-weight:700;font-size:13px">${item.name}</div>
        <div class="item-kg" style="font-size:11px;color:var(--txt-secondary)">
          ${utils.formatKg(item.total_waste_kg, item.unit || 'kg')} · ${utils.formatCO2(item.total_co2_kg)}
        </div>
      </div>
      <div class="item-bar" style="width:100px">
        <div class="progress-bar" style="height:6px;background:var(--bg-card-2);border-radius:4px;overflow:hidden">
          <div class="progress-fill ${item.total_waste_kg / max > 0.5 ? 'danger' : 'warning'}"
               style="height:100%;width:${((item.total_waste_kg / max) * 100).toFixed(0)}%;background:${item.total_waste_kg / max > 0.5 ? 'var(--clr-danger)' : 'var(--clr-accent-light)'}"></div>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Main Dashboard Loader ─────────────────────────────────
async function loadDashboardData() {
  const hostelId = selectedHostel === 'all' ? '' : selectedHostel;

  try {
    const [summary, weekly, byMeal, topWasted, emissions, hostelComp, categories, monthly] = await Promise.all([
      api.getSummary(hostelId),
      api.getWeekly(hostelId),
      api.getByMeal(hostelId),
      api.getTopWasted(5, hostelId),
      api.getEmissionsTrend(hostelId),
      api.getHostelComparison(),
      api.getCategoryBreakdown(hostelId),
      api.getMonthlyTrends(new Date().getFullYear(), hostelId)
    ]);

    renderSummary(summary.summary || {});
    renderWeeklyChart(weekly.weekly || []);
    renderMealChart(byMeal.by_meal || []);
    renderTopWasted(topWasted.top_wasted || []);
    renderEmissionsChart(emissions.emissions_trend || []);
    renderHostelComparisonChart(hostelComp.hostel_comparison || []);
    renderCategoryChart(categories.category_breakdown || []);
    renderMonthlyTrendsChart(monthly.monthly_trends || []);
  } catch (err) {
    utils.toast('Failed to load dashboard data: ' + err.message, 'error');
  }
}

// ── Initialize Dashboard Page ─────────────────────────────
async function initDashboard() {
  const user = await utils.requireLogin();
  if (user) utils.renderUserInfo(user);

  document.getElementById('topbar-date').textContent =
    new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Load SIT Hostels into topbar filter dropdown
  try {
    const data = await api.getHostels();
    const filterEl = document.getElementById('dashboard-hostel-filter');
    filterEl.innerHTML = '<option value="all">🏢 All SIT Hostels</option>';

    (data.hostels || []).forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.id;
      opt.textContent = `${h.name} (${h.block_type.toUpperCase()})`;
      filterEl.appendChild(opt);
    });

    filterEl.addEventListener('change', (e) => {
      selectedHostel = e.target.value;
      loadDashboardData();
    });
  } catch {}

  document.getElementById('btn-refresh-dashboard')?.addEventListener('click', () => {
    loadDashboardData();
    utils.toast('Dashboard data refreshed!', 'info');
  });

  await loadDashboardData();
}

document.addEventListener('DOMContentLoaded', initDashboard);
