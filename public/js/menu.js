/**
 * menu.js — View, create, and manage daily menus
 */

let currentUser = null;
let foodItems   = [];
let allMenus    = [];

// ── Render Menus Table ────────────────────────────────────
function renderMenus(menus) {
  const tbody = document.getElementById('menus-tbody');
  const empty = document.getElementById('menus-empty');
  if (!tbody) return;

  if (!menus.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = menus.map(m => `
    <tr>
      <td>${utils.formatDate(m.date)}</td>
      <td>${utils.mealBadge(m.meal_type)}</td>
      <td class="muted">${m.created_by_name}</td>
      <td class="muted">${utils.formatDateTime(m.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="viewMenu(${m.id})">👁 View</button>
        ${canEdit() ? `<button class="btn btn-sm btn-danger" onclick="deleteMenu(${m.id})" style="margin-left:6px">🗑</button>` : ''}
      </td>
    </tr>
  `).join('');
}

// ── Load Menus ────────────────────────────────────────────
async function loadMenus() {
  const dateFilter  = document.getElementById('filter-date').value;
  const mealFilter  = document.getElementById('filter-meal').value;
  let q = '?';
  if (dateFilter) q += `date=${dateFilter}&`;
  if (mealFilter) q += `meal_type=${mealFilter}&`;

  try {
    const data = await api.getMenus(q);
    allMenus = data.menus;
    renderMenus(allMenus);
  } catch (err) {
    utils.toast('Failed to load menus: ' + err.message, 'error');
  }
}

// ── Create Menu ───────────────────────────────────────────
async function createMenu(e) {
  e.preventDefault();
  const date      = document.getElementById('new-menu-date').value;
  const meal_type = document.getElementById('new-menu-meal').value;

  try {
    const data = await api.createMenu({ date, meal_type });
    utils.toast('Menu created! Now add food items.', 'success');
    closeModal('create-menu-modal');
    await loadMenus();
    viewMenu(data.menu.id); // immediately open to add items
  } catch (err) {
    utils.toast(err.message, 'error');
  }
}

// ── View Menu Detail Modal ────────────────────────────────
async function viewMenu(id) {
  try {
    const data = await api.getMenu(id);
    const m = data.menu;

    document.getElementById('detail-title').textContent =
      `${utils.mealLabel(m.meal_type)} — ${utils.formatDate(m.date)}`;

    const itemsEl = document.getElementById('detail-items');
    if (!m.items.length) {
      itemsEl.innerHTML = '<p style="color:var(--txt-secondary);padding:12px 0">No items added yet.</p>';
    } else {
      itemsEl.innerHTML = `
        <table class="data-table" style="margin-top:8px">
          <thead><tr><th>Item</th><th>Category</th><th>Qty Planned</th>${canEdit() ? '<th></th>' : ''}</tr></thead>
          <tbody>
            ${m.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td><span class="badge badge-gray">${item.category}</span></td>
                <td>${utils.formatKg(item.quantity_planned, item.unit)}</td>
                ${canEdit() ? `<td><button class="btn btn-sm btn-danger btn-icon" onclick="removeItem(${m.id}, ${item.id})">🗑</button></td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    }

    // Populate add-item form
    document.getElementById('add-item-menu-id').value = m.id;
    document.getElementById('add-item-section').style.display = canEdit() ? 'block' : 'none';

    openModal('detail-modal');
  } catch (err) {
    utils.toast('Could not load menu details.', 'error');
  }
}

// ── Add Item to Menu ──────────────────────────────────────
async function addItem(e) {
  e.preventDefault();
  const menuId         = document.getElementById('add-item-menu-id').value;
  const food_item_id   = document.getElementById('add-item-food').value;
  const quantity_planned = parseFloat(document.getElementById('add-item-qty').value);

  try {
    await api.addMenuItem(menuId, { food_item_id, quantity_planned });
    utils.toast('Item added!', 'success');
    viewMenu(menuId); // refresh modal
  } catch (err) {
    utils.toast(err.message, 'error');
  }
}

// ── Remove Item from Menu ─────────────────────────────────
async function removeItem(menuId, itemId) {
  if (!confirm('Remove this item from the menu?')) return;
  try {
    await api.removeMenuItem(menuId, itemId);
    utils.toast('Item removed.', 'info');
    viewMenu(menuId);
  } catch (err) {
    utils.toast(err.message, 'error');
  }
}

// ── Delete Menu ───────────────────────────────────────────
async function deleteMenu(id) {
  if (!confirm('Delete this entire menu and all its items?')) return;
  try {
    await api.deleteMenu(id);
    utils.toast('Menu deleted.', 'info');
    loadMenus();
  } catch (err) {
    utils.toast(err.message, 'error');
  }
}

// ── Modal Helpers ─────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function canEdit()      { return currentUser && ['admin', 'manager'].includes(currentUser.role); }

// ── Populate food items dropdown ──────────────────────────
function populateFoodDropdown() {
  const sel = document.getElementById('add-item-food');
  if (!sel) return;
  sel.innerHTML = foodItems.map(f =>
    `<option value="${f.id}">${f.name} (${f.unit}) — ${f.category}</option>`
  ).join('');
}

// ── Init ──────────────────────────────────────────────────
async function initMenu() {
  currentUser = await utils.requireLogin();
  if (!currentUser) return;
  utils.renderUserInfo(currentUser);

  // Load food items for dropdowns
  try {
    const fd = await api.getFoodItems();
    foodItems = fd.items;
    populateFoodDropdown();
  } catch {}

  // Set default date filter to today
  document.getElementById('filter-date').value = utils.todayISO();
  document.getElementById('new-menu-date').value = utils.todayISO();

  // Hide create button for viewers
  const createBtn = document.getElementById('create-menu-btn');
  if (createBtn && !canEdit()) createBtn.style.display = 'none';

  await loadMenus();

  // Event listeners
  document.getElementById('filter-date').addEventListener('change', loadMenus);
  document.getElementById('filter-meal').addEventListener('change', loadMenus);
  document.getElementById('create-menu-form').addEventListener('submit', createMenu);
  document.getElementById('add-item-form').addEventListener('submit', addItem);
}

document.addEventListener('DOMContentLoaded', initMenu);

// Expose for onclick handlers
window.viewMenu   = viewMenu;
window.deleteMenu = deleteMenu;
window.removeItem = removeItem;
window.openModal  = openModal;
window.closeModal = closeModal;
