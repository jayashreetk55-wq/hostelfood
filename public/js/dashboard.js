/**
 * dashboard.js — Fetch stats and render all Chart.js visualizations
 */

// Chart.js default global config
Chart.defaults.color = '#8b949e';
Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
Chart.defaults.font.size = 12;

const CHART_COLORS = {
  green:  'rgba(34, 197, 94, 0.8)',
  greenB: 'rgba(34, 197, 94, 1)',
  amber:  'rgba(245, 158, 11, 0.8)',
  amberB: 'rgba(245, 158, 11, 1)',
  red:    'rgba(239, 68, 68, 0.8)',
  blue:   'rgba(59, 130, 246, 0.8)',
  blueB:  'rgba(59, 130, 246, 1)',
  purple: 'rgba(168, 85, 247, 0.8)',
  grid:   'rgba(255, 255, 255, 0.06)',
};

let charts = {};

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

// ── Render Summary Cards ──────────────────────────────────
function renderSummary(data) {
  const { total_waste_kg, total_co2_kg, meals_logged, weekly_reduction_pct, carbon_context } = data;

  const waste   = document.getElementById('stat-waste');
  const co2     = document.getElementById('stat-co2');
  const meals   = document.getElementById('stat-meals');
  const reduc   = document.getElementById('stat-reduction');

  if (waste)  utils.animateCount(waste,  total_waste_kg,  2);
  if (co2)    utils.animateCount(co2,    total_co2_kg,    3);
  if (meals)  utils.animateCount(meals,  meals_logged,    0);
  if (reduc)  utils.animateCount(reduc,  Math.abs(weekly_reduction_pct), 1);

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

// ── Weekly Bar Chart ──────────────────────────────────────
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
          borderRadius: 6,
        },
        {
          label: 'CO₂ (kg)',
          data: data.map(d => parseFloat(d.total_co2_kg.toFixed(3))),
          backgroundColor: CHART_COLORS.amber,
          borderColor: CHART_COLORS.amberB,
          borderWidth: 1,
          borderRadius: 6,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { grid: { color: CHART_COLORS.grid } },
        y: { grid: { color: CHART_COLORS.grid }, beginAtZero: true }
      }
    }
  });
}

// ── By-Meal Doughnut Chart ────────────────────────────────
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
        backgroundColor: [CHART_COLORS.amber, CHART_COLORS.green, CHART_COLORS.blue],
        borderColor: '#1c2330',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } }
      }
    }
  });
}

// ── Emissions Trend Line Chart ────────────────────────────
function renderEmissionsChart(data) {
  destroyChart('emissions');
  const ctx = document.getElementById('chart-emissions');
  if (!ctx) return;

  charts.emissions = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => utils.formatDate(d.date)),
      datasets: [{
        label: 'CO₂ Emissions (kg)',
        data: data.map(d => parseFloat(d.total_co2_kg.toFixed(3))),
        borderColor: CHART_COLORS.amberB,
        backgroundColor: 'rgba(245,158,11,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: CHART_COLORS.amberB,
        pointRadius: 4,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: CHART_COLORS.grid } },
        y: { grid: { color: CHART_COLORS.grid }, beginAtZero: true }
      }
    }
  });
}

// ── Top Wasted Items ──────────────────────────────────────
function renderTopWasted(data) {
  const container = document.getElementById('top-wasted-list');
  if (!container) return;

  if (!data.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🎉</div><p>No waste logged yet!</p></div>';
    return;
  }

  const max = Math.max(...data.map(d => d.total_waste_kg));
  container.innerHTML = data.map((item, i) => `
    <div class="top-wasted-item">
      <div class="rank">${i + 1}</div>
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-kg">${utils.formatKg(item.total_waste_kg)} · ${utils.formatCO2(item.total_co2_kg)}</div>
      </div>
      <div class="item-bar">
        <div class="progress-bar">
          <div class="progress-fill ${item.total_waste_kg / max > 0.5 ? 'danger' : 'warning'}"
               style="width: ${((item.total_waste_kg / max) * 100).toFixed(0)}%"></div>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Main Init ─────────────────────────────────────────────
async function initDashboard() {
  const user = await utils.requireLogin();
  if (!user) return;
  utils.renderUserInfo(user);

  document.getElementById('topbar-date').textContent =
    new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  try {
    const [summary, weekly, byMeal, topWasted, emissions] = await Promise.all([
      api.getSummary(),
      api.getWeekly(),
      api.getByMeal(),
      api.getTopWasted(5),
      api.getEmissionsTrend()
    ]);

    renderSummary(summary.summary);
    renderWeeklyChart(weekly.weekly);
    renderMealChart(byMeal.by_meal);
    renderEmissionsChart(emissions.emissions_trend);
    renderTopWasted(topWasted.top_wasted);
  } catch (err) {
    utils.toast('Failed to load dashboard: ' + err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', initDashboard);
