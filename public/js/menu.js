/**
 * menu.js — View, create, and manage daily menus for SIT Hostels
 * Siddaganga Institute of Technology (SIT), Tumakuru
 */

let currentUser = null;
let foodItems   = [];
let hostelsList = [];
let allMenus    = [];

// ── Render Menus Table ────────────────────────────────────
function renderMenus(menus) {
  const tbody = document.getElementById('menus-tbody');
  const empty = document.getElementById('menus-empty');
  if (!tbody) return;

  if (!menus || !menus.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = menus.map(m => `
    <tr>
      <td>${utils.formatDate(m.date)}</td>
      <td><strong>${m.hostel_name || 'SIT Hostel Block'}</strong></td>
      <td>${utils.mealBadge(m.meal_type)}</td>
      <td><span class="badge badge-info">${m.item_count || 0} items</span></td>
      <td class="muted">${m.created_by_name || 'Admin'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm btn-secondary" onclick="viewMenu(${m.id})">👁 View / Manage</button>
        ${canEdit() ? `<button class="btn btn-sm btn-danger" onclick="deleteMenu(${m.id})" style="margin-left:6px" title="Delete menu">🗑</button>` : ''}
      </td>
    </tr>
  `).join('');
}

// ── Load Menus ────────────────────────────────────────────
async function loadMenus() {
  const dateFilter   = document.getElementById('filter-date')?.value || '';
  const mealFilter   = document.getElementById('filter-meal')?.value || '';
  const hostelFilter = document.getElementById('filter-hostel')?.value || '';

  const params = new URLSearchParams();
  if (dateFilter) params.append('date', dateFilter);
  if (mealFilter) params.append('meal_type', mealFilter);
  if (hostelFilter && hostelFilter !== 'all') params.append('hostel_id', hostelFilter);

  const q = params.toString() ? `?${params.toString()}` : '';

  try {
    const data = await api.getMenus(q);
    allMenus = data.menus || [];
    renderMenus(allMenus);
  } catch (err) {
    utils.toast('Failed to load menus: ' + err.message, 'error');
  }
}

// ── Create Menu ───────────────────────────────────────────
async function createMenu(e) {
  e.preventDefault();
  const hostel_id = document.getElementById('new-menu-hostel').value;
  const date      = document.getElementById('new-menu-date').value;
  const meal_type = document.getElementById('new-menu-meal').value;

  if (!hostel_id) {
    utils.toast('Please select an SIT Hostel Block.', 'warning');
    return;
  }

  try {
    const data = await api.createMenu({ date, meal_type, hostel_id: Number(hostel_id) });
    utils.toast('Menu created successfully! Now add planned food items.', 'success');
    closeModal('create-menu-modal');
    await loadMenus();
    if (data.menu && data.menu.id) {
      viewMenu(data.menu.id); // immediately open to add items
    }
  } catch (err) {
    utils.toast(err.message, 'error');
  }
}

// ── View Menu Detail Modal ────────────────────────────────
async function viewMenu(id) {
  try {
    const data = await api.getMenu(id);
    const m = data.menu;

    const hostelDisplay = m.hostel_name ? `${m.hostel_name} — ` : '';
    document.getElementById('detail-title').textContent =
      `${hostelDisplay}${utils.mealLabel(m.meal_type)} (${utils.formatDate(m.date)})`;

    const itemsEl = document.getElementById('detail-items');
    if (!m.items || !m.items.length) {
      itemsEl.innerHTML = '<p style="color:var(--txt-secondary);padding:16px 0;text-align:center">No food items added yet. Use the form below to plan items for this meal.</p>';
    } else {
      itemsEl.innerHTML = `
        <table class="data-table" style="margin-top:8px">
          <thead>
            <tr>
              <th>Food Item</th>
              <th>Category</th>
              <th>Planned Quantity</th>
              ${canEdit() ? '<th style="text-align:right">Action</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${m.items.map(item => `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td><span class="badge badge-gray">${item.category}</span></td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px">
                    <input type="number" id="qty-input-${item.id}" value="${item.quantity_planned}" min="0.01" step="0.1"
                      style="width:85px;padding:4px 8px;border-radius:4px;border:1px solid var(--border-color);background:var(--bg-card);color:var(--txt-primary);font-size:13px" />
                    <span style="font-size:12px;color:var(--txt-secondary)">${item.unit}</span>
                    ${canEdit() ? `<button class="btn btn-sm btn-secondary" onclick="updateItemQty(${m.id}, ${item.id})" title="Save quantity">💾</button>` : ''}
                  </div>
                </td>
                ${canEdit() ? `
                  <td style="text-align:right">
                    <button class="btn btn-sm btn-danger btn-icon" onclick="removeItem(${m.id}, ${item.id})" title="Remove item">🗑</button>
                  </td>` : ''}
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
    utils.toast('Could not load menu details: ' + err.message, 'error');
  }
}

// ── Update Item Planned Quantity ──────────────────────────
async function updateItemQty(menuId, itemId) {
  const inputEl = document.getElementById(`qty-input-${itemId}`);
  if (!inputEl) return;
  const quantity_planned = parseFloat(inputEl.value);

  if (isNaN(quantity_planned) || quantity_planned <= 0) {
    utils.toast('Please enter a valid planned quantity greater than 0.', 'warning');
    return;
  }

  try {
    await api.updateMenuItem(menuId, itemId, { quantity_planned });
    utils.toast('Planned quantity updated!', 'success');
    await loadMenus();
  } catch (err) {
    utils.toast('Failed to update quantity: ' + err.message, 'error');
  }
}

// ── Add Item to Menu ──────────────────────────────────────
async function addItem(e) {
  e.preventDefault();
  const menuId           = document.getElementById('add-item-menu-id').value;
  const food_item_id     = document.getElementById('add-item-food').value;
  const quantity_planned = parseFloat(document.getElementById('add-item-qty').value);

  if (!food_item_id) {
    utils.toast('Please select a food item.', 'warning');
    return;
  }
  if (isNaN(quantity_planned) || quantity_planned <= 0) {
    utils.toast('Please enter a positive planned quantity.', 'warning');
    return;
  }

  try {
    await api.addMenuItem(menuId, { food_item_id: Number(food_item_id), quantity_planned });
    utils.toast('Food item added to menu!', 'success');
    document.getElementById('add-item-qty').value = '';
    viewMenu(menuId); // refresh modal
    loadMenus();      // refresh table counts
  } catch (err) {
    utils.toast(err.message, 'error');
  }
}

// ── Remove Item from Menu ─────────────────────────────────
async function removeItem(menuId, itemId) {
  if (!confirm('Remove this food item from the menu?')) return;
  try {
    await api.removeMenuItem(menuId, itemId);
    utils.toast('Item removed from menu.', 'info');
    viewMenu(menuId);
    loadMenus();
  } catch (err) {
    utils.toast(err.message, 'error');
  }
}

// ── Delete Menu ───────────────────────────────────────────
async function deleteMenu(id) {
  if (!confirm('Delete this entire menu and all its planned items?')) return;
  try {
    await api.deleteMenu(id);
    utils.toast('Menu deleted successfully.', 'info');
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
  sel.innerHTML = '<option value="">Select item...</option>' + foodItems.map(f =>
    `<option value="${f.id}">${f.name} (${f.unit}) — ${f.category}</option>`
  ).join('');
}

// ── Populate Hostels Dropdown ──────────────────────────────
function populateHostelDropdowns() {
  const filterHostel = document.getElementById('filter-hostel');
  const newMenuHostel = document.getElementById('new-menu-hostel');

  if (filterHostel) {
    filterHostel.innerHTML = '<option value="all">All SIT Hostels</option>' +
      hostelsList.map(h => `<option value="${h.id}">${h.name} (${h.category.toUpperCase()})</option>`).join('');
  }

  if (newMenuHostel) {
    newMenuHostel.innerHTML = '<option value="">Select SIT Hostel Block...</option>' +
      hostelsList.map(h => `<option value="${h.id}">${h.name} (${h.category.toUpperCase()} - Cap: ${h.capacity})</option>`).join('');
  }
}

// ── Init ──────────────────────────────────────────────────
async function initMenu() {
  currentUser = await utils.requireLogin();
  if (!currentUser) return;
  utils.renderUserInfo(currentUser);

  // Load SIT Hostels
  try {
    const hd = await api.getHostels();
    hostelsList = hd.hostels || [];
    populateHostelDropdowns();
  } catch (err) {
    console.error('Failed to load hostels:', err);
  }

  // Load food items for dropdowns
  try {
    const fd = await api.getFoodItems();
    foodItems = fd.items || [];
    populateFoodDropdown();
  } catch (err) {
    console.error('Failed to load food items:', err);
  }

  // Set default date filter
  const filterDateInput = document.getElementById('filter-date');
  const newDateInput = document.getElementById('new-menu-date');
  if (filterDateInput) filterDateInput.value = ''; // default to all recent
  if (newDateInput) newDateInput.value = utils.todayISO();

  // Hide create button for viewers
  const createBtn = document.getElementById('create-menu-btn');
  if (createBtn && !canEdit()) createBtn.style.display = 'none';

  await loadMenus();

  // Event listeners
  document.getElementById('filter-hostel')?.addEventListener('change', loadMenus);
  document.getElementById('filter-date')?.addEventListener('change', loadMenus);
  document.getElementById('filter-meal')?.addEventListener('change', loadMenus);
  document.getElementById('create-menu-form')?.addEventListener('submit', createMenu);
  document.getElementById('add-item-form')?.addEventListener('submit', addItem);
}

document.addEventListener('DOMContentLoaded', initMenu);

// Expose for onclick handlers
window.viewMenu      = viewMenu;
window.deleteMenu    = deleteMenu;
window.removeItem    = removeItem;
window.updateItemQty = updateItemQty;
window.openModal     = openModal;
window.closeModal    = closeModal;
window.loadMenus     = loadMenus;
