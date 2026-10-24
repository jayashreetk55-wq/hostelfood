/**
 * utils.js — Shared helper functions used across all pages
 */

// ── Date Helpers ──────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function mealLabel(mealType) {
  return { breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', dinner: '🌙 Dinner' }[mealType] || mealType;
}

// ── Number Formatters ─────────────────────────────────────
function formatKg(val, unit = 'kg') {
  if (val === null || val === undefined) return '—';
  return `${parseFloat(val).toFixed(2)} ${unit}`;
}

function formatPct(val) {
  if (val === null || val === undefined) return '—';
  return `${parseFloat(val).toFixed(1)}%`;
}

function formatCO2(val) {
  if (val === null || val === undefined) return '—';
  return `${parseFloat(val).toFixed(3)} kg CO₂`;
}

// ── Toast Notifications ───────────────────────────────────
function toast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.animation = 'toastIn 0.2s reverse forwards';
    setTimeout(() => el.remove(), 200);
  }, duration);
}

// ── Render Helpers ────────────────────────────────────────
function wasteBadge(pct) {
  if (pct >= 30) return `<span class="badge badge-red">${formatPct(pct)}</span>`;
  if (pct >= 15) return `<span class="badge badge-amber">${formatPct(pct)}</span>`;
  return `<span class="badge badge-green">${formatPct(pct)}</span>`;
}

function mealBadge(mealType) {
  const classes = { breakfast: 'badge-amber', lunch: 'badge-blue', dinner: 'badge-blue' };
  return `<span class="badge ${classes[mealType] || 'badge-gray'}">${mealLabel(mealType)}</span>`;
}

function roleBadge(role) {
  const cls = { admin: 'badge-red', manager: 'badge-amber', viewer: 'badge-green' };
  return `<span class="badge ${cls[role] || 'badge-gray'}">${role}</span>`;
}

// ── Auth Guard (Bypassed) ──────────────────────────────────
async function requireLogin() {
  try {
    const data = await api.me();
    return data.user || { id: 1, name: 'Hostel Admin', role: 'admin' };
  } catch {
    return { id: 1, name: 'Hostel Admin', role: 'admin' };
  }
}

// ── Populate User Info in Sidebar ─────────────────────────
function renderUserInfo(user) {
  const nameEls = document.querySelectorAll('[data-user-name]');
  const roleEls = document.querySelectorAll('[data-user-role]');
  const avatarEls = document.querySelectorAll('[data-user-avatar]');
  nameEls.forEach(el => { el.textContent = user.name; });
  roleEls.forEach(el => { el.textContent = user.role; });
  avatarEls.forEach(el => { el.textContent = user.name.charAt(0).toUpperCase(); });
}

// ── CSV Download Helper ───────────────────────────────────
function downloadCSV(url) {
  const link = document.createElement('a');
  link.href = url;
  link.download = 'waste-report.csv';
  link.click();
}

// ── Skeleton Loader ───────────────────────────────────────
function showSkeleton(containerId, rows = 3) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array.from({ length: rows }, () =>
    `<div class="skeleton" style="height:44px;margin-bottom:8px;border-radius:8px;">&nbsp;</div>`
  ).join('');
}

// ── Number Counter Animation ──────────────────────────────
function animateCount(el, target, decimals = 2, duration = 800) {
  const start = performance.now();
  const from = parseFloat(el.textContent.replace(/[^0-9.]/g, '')) || 0;
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = (from + (target - from) * ease).toFixed(decimals);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

window.utils = {
  todayISO, formatDate, formatDateTime, mealLabel,
  formatKg, formatPct, formatCO2,
  toast, wasteBadge, mealBadge, roleBadge,
  requireLogin, renderUserInfo, downloadCSV,
  showSkeleton, animateCount
};
