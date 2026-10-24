/**
 * settings.js — Food item management (admin only)
 */

let currentUser = null;
let editingId = null;

async function loadFoodItems() {
  try {
    const data = await api.getFoodItems();
    renderFoodItems(data.items);
  } catch (err) {
    utils.toast('Failed to load food items: ' + err.message, 'error');
  }
}

function renderFoodItems(items) {
  const tbody = document.getElementById('food-items-tbody');
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--txt-secondary);padding:32px">No food items found.</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(item => `
    <tr>
      <td><strong>${item.name}</strong></td>
      <td><span class="badge badge-gray">${item.category}</span></td>
      <td>${item.unit}</td>
      <td><span style="color:var(--clr-accent-light);font-weight:600">${item.emission_factor}</span></td>
      <td class="muted">${utils.formatDateTime(item.created_at)}</td>
      <td>
        ${isAdmin() ? `
          <button class="btn btn-sm btn-secondary" onclick="openEditItem(${item.id},'${item.name}','${item.category}','${item.unit}',${item.emission_factor})">✏️ Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteItem(${item.id})" style="margin-left:6px">🗑</button>
        ` : '—'}
      </td>
    </tr>
  `).join('');
}

async function submitFoodItem(e) {
  e.preventDefault();
  const body = {
    name:            document.getElementById('item-name').value.trim(),
    category:        document.getElementById('item-category').value.trim(),
    unit:            document.getElementById('item-unit').value.trim(),
    emission_factor: parseFloat(document.getElementById('item-ef').value)
  };

  try {
    if (editingId) {
      await api.updateFoodItem(editingId, body);
      utils.toast('Food item updated!', 'success');
    } else {
      await api.createFoodItem(body);
      utils.toast('Food item created!', 'success');
    }
    closeItemModal();
    await loadFoodItems();
  } catch (err) {
    utils.toast(err.message, 'error');
  }
}

function openAddItem() {
  editingId = null;
  document.getElementById('item-form').reset();
  document.getElementById('item-modal-title').textContent = 'Add Food Item';
  document.getElementById('item-modal').classList.add('active');
}

function openEditItem(id, name, category, unit, ef) {
  editingId = id;
  document.getElementById('item-name').value     = name;
  document.getElementById('item-category').value = category;
  document.getElementById('item-unit').value     = unit;
  document.getElementById('item-ef').value       = ef;
  document.getElementById('item-modal-title').textContent = 'Edit Food Item';
  document.getElementById('item-modal').classList.add('active');
}

function closeItemModal() {
  document.getElementById('item-modal').classList.remove('active');
  editingId = null;
}

async function deleteItem(id) {
  if (!confirm('Delete this food item? This will affect existing waste records.')) return;
  try {
    await api.deleteFoodItem(id);
    utils.toast('Food item deleted.', 'info');
    await loadFoodItems();
  } catch (err) {
    utils.toast(err.message, 'error');
  }
}

function isAdmin() { return currentUser && currentUser.role === 'admin'; }

async function initSettings() {
  currentUser = await utils.requireLogin();
  if (!currentUser) return;
  utils.renderUserInfo(currentUser);

  const addBtn = document.getElementById('add-item-btn');
  if (addBtn) addBtn.style.display = isAdmin() ? 'inline-flex' : 'none';

  if (!isAdmin()) {
    const notice = document.getElementById('admin-notice');
    if (notice) notice.style.display = 'block';
  }

  await loadFoodItems();

  document.getElementById('add-item-btn')?.addEventListener('click', openAddItem);
  document.getElementById('item-form')?.addEventListener('submit', submitFoodItem);
  document.getElementById('close-item-modal')?.addEventListener('click', closeItemModal);
}

document.addEventListener('DOMContentLoaded', initSettings);
window.openEditItem = openEditItem;
window.deleteItem   = deleteItem;
window.closeItemModal = closeItemModal;
