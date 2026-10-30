/**
 * settings.js — Food item management with emission factors & conversions
 */

let currentUser = null;
let editingId = null;
let allItems = [];

async function loadFoodItems() {
  try {
    const data = await api.getFoodItems();
    allItems = data.items || [];
    renderFoodItems(allItems);
  } catch (err) {
    utils.toast('Failed to load food items: ' + err.message, 'error');
  }
}

function renderFoodItems(items) {
  const tbody = document.getElementById('food-items-tbody');
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--txt-secondary);padding:32px">No food items found.</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(item => `
    <tr>
      <td><strong>${item.name}</strong></td>
      <td><span class="badge badge-gray">${item.category}</span></td>
      <td><strong>${item.unit}</strong></td>
      <td>
        <span style="color:var(--clr-accent-light);font-weight:700">${item.emission_factor}</span>
        <span style="font-size:10px;color:var(--txt-secondary)">kg CO₂e/kg</span>
      </td>
      <td style="font-size:11px;color:var(--txt-secondary);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${item.source || ''}">
        ${item.source || 'IPCC / FAO'}
      </td>
      <td style="font-size:11px">
        ${item.unit === 'litres' || item.unit === 'ml' ? `Density: ${item.density_kg_per_l || 1.0} kg/L` : ''}
        ${item.unit === 'pieces' ? `Weight: ${item.weight_per_piece_kg || 0.05} kg/pc` : ''}
        ${item.unit !== 'litres' && item.unit !== 'ml' && item.unit !== 'pieces' ? '—' : ''}
      </td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="openEditItem(${item.id})">✏️ Edit</button>
        <button class="btn btn-sm btn-danger btn-icon" onclick="deleteItem(${item.id})" style="margin-left:6px" title="Delete">🗑</button>
      </td>
    </tr>
  `).join('');
}

async function submitFoodItem(e) {
  e.preventDefault();
  const name = document.getElementById('item-name').value.trim();
  const category = document.getElementById('item-category').value.trim();
  const unit = document.getElementById('item-unit').value.trim();
  const ef = parseFloat(document.getElementById('item-ef').value);
  const source = document.getElementById('item-source').value.trim();
  const density = parseFloat(document.getElementById('item-density').value) || 1.0;
  const pieceWeight = parseFloat(document.getElementById('item-piece-weight').value) || 0.05;

  if (!name || !category || !unit || isNaN(ef) || ef < 0) {
    utils.toast('Please enter valid item name, category, unit, and non-negative emission factor.', 'warning');
    return;
  }

  const body = {
    name,
    category,
    unit,
    emission_factor: ef,
    source,
    density_kg_per_l: density,
    weight_per_piece_kg: pieceWeight
  };

  try {
    if (editingId) {
      await api.updateFoodItem(editingId, body);
      utils.toast('Food item updated successfully!', 'success');
    } else {
      await api.createFoodItem(body);
      utils.toast('New food item created!', 'success');
    }
    closeItemModal();
    await loadFoodItems();
  } catch (err) {
    utils.toast('Error: ' + err.message, 'error');
  }
}

function openAddItem() {
  editingId = null;
  document.getElementById('item-form').reset();
  document.getElementById('item-id').value = '';
  document.getElementById('item-source').value = 'IPCC / FAO Life-Cycle Assessment';
  document.getElementById('item-density').value = '1.0';
  document.getElementById('item-piece-weight').value = '0.05';
  document.getElementById('item-modal-title').textContent = 'Add Food Item';
  document.getElementById('item-modal').classList.add('active');
}

function openEditItem(id) {
  const item = allItems.find(x => x.id === id);
  if (!item) return;

  editingId = id;
  document.getElementById('item-id').value = item.id;
  document.getElementById('item-name').value = item.name;
  document.getElementById('item-category').value = item.category;
  document.getElementById('item-unit').value = item.unit;
  document.getElementById('item-ef').value = item.emission_factor;
  document.getElementById('item-source').value = item.source || 'IPCC / FAO Life-Cycle Assessment';
  document.getElementById('item-density').value = item.density_kg_per_l || 1.0;
  document.getElementById('item-piece-weight').value = item.weight_per_piece_kg || 0.05;

  document.getElementById('item-modal-title').textContent = `Edit Food Item: ${item.name}`;
  document.getElementById('item-modal').classList.add('active');
}

function closeItemModal() {
  document.getElementById('item-modal').classList.remove('active');
  editingId = null;
}

async function deleteItem(id) {
  if (!confirm('Are you sure you want to delete this food item?')) return;
  try {
    await api.deleteFoodItem(id);
    utils.toast('Food item deleted.', 'info');
    await loadFoodItems();
  } catch (err) {
    utils.toast('Failed to delete item: ' + err.message, 'error');
  }
}

async function initSettings() {
  currentUser = await utils.requireLogin();
  if (currentUser) utils.renderUserInfo(currentUser);

  await loadFoodItems();

  document.getElementById('add-item-btn')?.addEventListener('click', openAddItem);
  document.getElementById('item-form')?.addEventListener('submit', submitFoodItem);
  document.getElementById('close-item-modal')?.addEventListener('click', closeItemModal);

  document.getElementById('catalog-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderFoodItems(allItems);
      return;
    }
    const filtered = allItems.filter(x =>
      x.name.toLowerCase().includes(q) ||
      x.category.toLowerCase().includes(q) ||
      (x.source && x.source.toLowerCase().includes(q))
    );
    renderFoodItems(filtered);
  });
}

document.addEventListener('DOMContentLoaded', initSettings);
window.openEditItem = openEditItem;
window.deleteItem   = deleteItem;
window.closeItemModal = closeItemModal;
