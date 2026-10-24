/**
 * waste-entry.js — Log food waste with live CO₂ preview
 */

let currentUser = null;
let menuItems   = [];   // items from the selected menu
let allWaste    = [];

// Emission factors for live preview (mirrored from food_items DB)
// The real calculation happens server-side; this is just for UX preview.

// ── Load waste entries table ──────────────────────────────
async function loadWasteEntries() {
  const startDate = document.getElementById('filter-start').value;
  const endDate   = document.getElementById('filter-end').value;
  let q = '?';
  if (startDate) q += `startDate=${startDate}&`;
  if (endDate)   q += `endDate=${endDate}&`;

  try {
    const data = await api.getWaste(q);
    allWaste = data.entries;
    renderWasteTable(allWaste);
  } catch (err) {
    utils.toast('Failed to load waste entries: ' + err.message, 'error');
  }
}

function renderWasteTable(entries) {
  const tbody = document.getElementById('waste-tbody');
  const empty = document.getElementById('waste-empty');
  if (!tbody) return;

  if (!entries.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = entries.map(e => `
    <tr>
      <td>${utils.formatDate(e.date)}</td>
      <td>${utils.mealBadge(e.meal_type)}</td>
      <td><strong>${e.food_name}</strong></td>
      <td>${utils.formatKg(e.quantity_wasted, e.unit)}</td>
      <td>${utils.wasteBadge(e.waste_percentage)}</td>
      <td><span style="color:var(--clr-accent-light)">${utils.formatCO2(e.carbon_emission_kg)}</span></td>
      <td class="muted">${e.logged_by_name}</td>
      <td>
        ${canEdit() ? `
          <button class="btn btn-sm btn-secondary" onclick="openEditModal(${e.id}, ${e.quantity_wasted}, '${e.notes || ''}')">✏️</button>
          <button class="btn btn-sm btn-danger btn-icon" onclick="deleteWasteEntry(${e.id})" style="margin-left:4px">🗑</button>
        ` : '—'}
      </td>
    </tr>
  `).join('');
}

// ── Load today's menus into form ──────────────────────────
async function loadMenusForDate(date) {
  const mealSel = document.getElementById('entry-meal');
  const itemSel = document.getElementById('entry-item');
  mealSel.innerHTML = '<option value="">Select meal...</option>';
  itemSel.innerHTML = '<option value="">Select food item...</option>';
  menuItems = [];

  try {
    const data = await api.getMenus(`?date=${date}`);
    const menus = data.menus;
    if (!menus.length) {
      utils.toast('No menus found for this date. Please add a menu first.', 'warning');
      return;
    }
    menus.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = utils.mealLabel(m.meal_type);
      mealSel.appendChild(opt);
    });
  } catch {}
}

// ── Load menu items when meal selected ────────────────────
async function loadMenuItems(menuId) {
  const itemSel = document.getElementById('entry-item');
  itemSel.innerHTML = '<option value="">Loading...</option>';
  menuItems = [];

  try {
    const data = await api.getMenu(menuId);
    menuItems = data.menu.items;

    itemSel.innerHTML = menuItems.length
      ? menuItems.map(mi => `<option value="${mi.id}" data-ef="${mi.emission_factor}" data-qty="${mi.quantity_planned}" data-unit="${mi.unit}">${mi.name} (planned: ${utils.formatKg(mi.quantity_planned, mi.unit)})</option>`).join('')
      : '<option value="">No items in this menu</option>';

    updatePreview();
  } catch {}
}

// ── Live CO₂ preview ──────────────────────────────────────
function updatePreview() {
  const itemSel  = document.getElementById('entry-item');
  const qtyInput = document.getElementById('entry-qty');
  const selectedOpt = itemSel.options[itemSel.selectedIndex];

  const preview = document.getElementById('preview-section');
  if (!selectedOpt || !selectedOpt.dataset.ef) { if (preview) preview.style.display = 'none'; return; }

  const ef      = parseFloat(selectedOpt.dataset.ef);
  const planned = parseFloat(selectedOpt.dataset.qty);
  const unit    = selectedOpt.dataset.unit;
  const wasted  = parseFloat(qtyInput.value) || 0;

  const wastePct = Math.min((wasted / planned) * 100, 100).toFixed(1);
  const co2      = (wasted * ef).toFixed(3);

  if (preview) {
    preview.style.display = 'block';
    document.getElementById('preview-waste-pct').textContent = `${wastePct}%`;
    document.getElementById('preview-co2').textContent        = `${co2} kg CO₂`;
    document.getElementById('preview-planned').textContent    = `${planned} ${unit}`;

    const level = wastePct >= 30 ? 'high' : wastePct >= 15 ? 'medium' : 'low';
    const icons = { low: '🟢', medium: '🟠', high: '🔴' };
    document.getElementById('preview-level').textContent = `${icons[level]} ${level.toUpperCase()} waste level`;
    document.getElementById('preview-level').className = `co2-banner ${level}`;
    document.getElementById('preview-level').style.display = 'flex';
  }
}

// ── Submit waste entry ────────────────────────────────────
async function submitWaste(e) {
  e.preventDefault();
  const menu_item_id    = parseInt(document.getElementById('entry-item').value);
  const quantity_wasted = parseFloat(document.getElementById('entry-qty').value);
  const notes           = document.getElementById('entry-notes').value.trim();

  if (!menu_item_id || isNaN(quantity_wasted)) {
    utils.toast('Please select a food item and enter quantity.', 'warning');
    return;
  }

  const btn = document.getElementById('waste-submit');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    await api.createWaste({ menu_item_id, quantity_wasted, notes });
    utils.toast('Waste entry logged successfully! ✅', 'success');
    document.getElementById('waste-entry-form').reset();
    document.getElementById('preview-section').style.display = 'none';
    await loadWasteEntries();
  } catch (err) {
    utils.toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 Log Waste';
  }
}

// ── Edit/Delete ───────────────────────────────────────────
function openEditModal(id, qty, notes) {
  document.getElementById('edit-waste-id').value = id;
  document.getElementById('edit-qty').value      = qty;
  document.getElementById('edit-notes').value    = notes;
  document.getElementById('edit-modal').classList.add('active');
}

async function submitEdit(e) {
  e.preventDefault();
  const id    = document.getElementById('edit-waste-id').value;
  const qty   = parseFloat(document.getElementById('edit-qty').value);
  const notes = document.getElementById('edit-notes').value;
  try {
    await api.updateWaste(id, { quantity_wasted: qty, notes });
    utils.toast('Entry updated!', 'success');
    document.getElementById('edit-modal').classList.remove('active');
    await loadWasteEntries();
  } catch (err) {
    utils.toast(err.message, 'error');
  }
}

async function deleteWasteEntry(id) {
  if (!confirm('Delete this waste entry?')) return;
  try {
    await api.deleteWaste(id);
    utils.toast('Entry deleted.', 'info');
    await loadWasteEntries();
  } catch (err) {
    utils.toast(err.message, 'error');
  }
}

function canEdit() { return currentUser && ['admin', 'manager'].includes(currentUser.role); }

// ── Init ──────────────────────────────────────────────────
async function initWasteEntry() {
  currentUser = await utils.requireLogin();
  if (!currentUser) return;
  utils.renderUserInfo(currentUser);

  // Set default date to today
  const today = utils.todayISO();
  document.getElementById('entry-date').value  = today;
  document.getElementById('filter-start').value = today;
  document.getElementById('filter-end').value   = today;

  // Restrict form for viewers
  const formSection = document.getElementById('entry-form-section');
  if (formSection && !canEdit()) formSection.style.display = 'none';

  await loadMenusForDate(today);
  await loadWasteEntries();

  // Wire events
  document.getElementById('entry-date').addEventListener('change', (e) => loadMenusForDate(e.target.value));
  document.getElementById('entry-meal').addEventListener('change', (e) => { if (e.target.value) loadMenuItems(e.target.value); });
  document.getElementById('entry-item').addEventListener('change', updatePreview);
  document.getElementById('entry-qty').addEventListener('input', updatePreview);
  document.getElementById('waste-entry-form').addEventListener('submit', submitWaste);
  document.getElementById('edit-waste-form').addEventListener('submit', submitEdit);
  document.getElementById('filter-start').addEventListener('change', loadWasteEntries);
  document.getElementById('filter-end').addEventListener('change', loadWasteEntries);
}

document.addEventListener('DOMContentLoaded', initWasteEntry);

window.openEditModal    = openEditModal;
window.deleteWasteEntry = deleteWasteEntry;
