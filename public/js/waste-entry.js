/**
 * waste-entry.js — Interactive Manual Food Data Entry for SIT Hostels
 */

let allHostels = [];
let allFoodItems = [];
let stagedItems = [];
let currentRecords = [];

// ── Initialize Page ───────────────────────────────────────
async function init() {
  const user = await utils.requireLogin();
  if (user) utils.renderUserInfo(user);

  // Set default date & time to current local time
  const now = new Date();
  document.getElementById('entry-date').value = now.toISOString().split('T')[0];
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('entry-time').value = `${hh}:${mm}`;

  await Promise.all([loadHostels(), loadFoodItems()]);
  await loadRecords();
  setupEventListeners();
}

// ── Load Hostels ──────────────────────────────────────────
async function loadHostels() {
  try {
    const data = await api.getHostels();
    allHostels = data.hostels || [];

    const entrySel = document.getElementById('entry-hostel');
    const filterSel = document.getElementById('filter-hostel');

    entrySel.innerHTML = '<option value="">Select SIT Hostel...</option>';
    filterSel.innerHTML = '<option value="all">All SIT Hostels</option>';

    allHostels.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.id;
      opt.textContent = `${h.name} (${h.block_type.toUpperCase()}, Cap: ${h.capacity})`;
      entrySel.appendChild(opt);

      const fOpt = document.createElement('option');
      fOpt.value = h.id;
      fOpt.textContent = h.name;
      filterSel.appendChild(fOpt);
    });

    // Auto-select first hostel
    if (allHostels.length > 0) {
      entrySel.value = allHostels[0].id;
      document.getElementById('entry-mess').value = allHostels[0].mess_name;
    }
  } catch (err) {
    utils.toast('Failed to load SIT hostels: ' + err.message, 'error');
  }
}

// ── Load Food Items Catalog ───────────────────────────────
async function loadFoodItems() {
  try {
    const data = await api.getFoodItems();
    allFoodItems = data.items || [];

    const itemSel = document.getElementById('entry-food-select');
    itemSel.innerHTML = '<option value="">Choose item from catalog...</option>';

    allFoodItems.forEach(fi => {
      const opt = document.createElement('option');
      opt.value = fi.id;
      opt.textContent = `${fi.name} [${fi.category}] (${fi.unit || 'kg'} · EF: ${fi.emission_factor})`;
      itemSel.appendChild(opt);
    });
  } catch (err) {
    utils.toast('Failed to load food items: ' + err.message, 'error');
  }
}

// ── Setup Event Listeners ─────────────────────────────────
function setupEventListeners() {
  // Hostel change -> auto-update mess name
  document.getElementById('entry-hostel').addEventListener('change', (e) => {
    const h = allHostels.find(x => String(x.id) === String(e.target.value));
    if (h) document.getElementById('entry-mess').value = h.mess_name;
  });

  // Toggle custom item fields
  const customToggle = document.getElementById('btn-toggle-custom');
  const customBox = document.getElementById('custom-food-fields');
  const selectBox = document.getElementById('group-food-select');

  customToggle.addEventListener('click', () => {
    const isCustom = customBox.style.display !== 'none';
    if (isCustom) {
      customBox.style.display = 'none';
      selectBox.style.display = 'block';
      customToggle.textContent = '+ Add Custom Item';
    } else {
      customBox.style.display = 'block';
      selectBox.style.display = 'none';
      customToggle.textContent = '← Choose from Catalog';
      document.getElementById('entry-food-select').value = '';
    }
    updateLiveCalc();
  });

  // Food item selected -> sync unit
  document.getElementById('entry-food-select').addEventListener('change', (e) => {
    const item = allFoodItems.find(x => String(x.id) === String(e.target.value));
    if (item && item.unit) {
      document.getElementById('entry-unit').value = item.unit;
    }
    updateLiveCalc();
  });

  // Quantity inputs -> live calculation preview
  ['qty-prepared', 'qty-served', 'qty-leftover', 'qty-discarded', 'entry-unit'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateLiveCalc);
  });

  // Add item to queue button
  document.getElementById('btn-add-item-queue').addEventListener('click', addItemToQueue);

  // Clear form button
  document.getElementById('btn-clear-form').addEventListener('click', clearForm);

  // View records buttons
  const scrollHandler = () => {
    document.getElementById('records-section').scrollIntoView({ behavior: 'smooth' });
  };
  document.getElementById('btn-view-records').addEventListener('click', scrollHandler);
  document.getElementById('btn-view-records-top').addEventListener('click', scrollHandler);

  // Table filter changes
  document.getElementById('filter-hostel').addEventListener('change', loadRecords);
  document.getElementById('filter-meal').addEventListener('change', loadRecords);
  document.getElementById('filter-date').addEventListener('input', loadRecords);
  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    document.getElementById('filter-hostel').value = 'all';
    document.getElementById('filter-meal').value = 'all';
    document.getElementById('filter-date').value = '';
    loadRecords();
  });

  // Submit main form (Save Record)
  document.getElementById('food-entry-form').addEventListener('submit', handleFormSubmit);

  // Edit form submit
  document.getElementById('edit-record-form').addEventListener('submit', handleEditSubmit);

  // Modal delete button
  document.getElementById('btn-modal-delete').addEventListener('click', async () => {
    const id = document.getElementById('edit-record-id').value;
    if (id && confirm('Are you sure you want to delete this food record?')) {
      await deleteFoodRecord(id);
      closeEditModal();
    }
  });
}

// ── Live Calculation Preview ──────────────────────────────
function getActiveFoodItemDetails() {
  const isCustom = document.getElementById('custom-food-fields').style.display !== 'none';
  if (isCustom) {
    const name = document.getElementById('custom-name').value.trim() || 'Custom Item';
    const cat = document.getElementById('custom-category').value;
    const ef = parseFloat(document.getElementById('custom-ef').value) || 1.0;
    return { name, category: cat, emission_factor: ef, source: 'Manual entry', density_kg_per_l: 1.0, weight_per_piece_kg: 0.05 };
  } else {
    const selId = document.getElementById('entry-food-select').value;
    return allFoodItems.find(x => String(x.id) === String(selId)) || {
      name: 'Item',
      category: 'Other',
      emission_factor: 1.0,
      source: 'IPCC / FAO',
      density_kg_per_l: 1.0,
      weight_per_piece_kg: 0.05
    };
  }
}

function updateLiveCalc() {
  const item = getActiveFoodItemDetails();
  const unit = document.getElementById('entry-unit').value || 'kg';
  const disc = parseFloat(document.getElementById('qty-discarded').value) || 0;
  const prep = parseFloat(document.getElementById('qty-prepared').value) || 0;
  const serv = parseFloat(document.getElementById('qty-served').value) || 0;

  const rawWasted = disc > 0 ? disc : Math.max(0, prep - serv);

  // Quick client-side estimation based on unit
  let kg = rawWasted;
  if (unit === 'g') kg = rawWasted / 1000;
  else if (unit === 'litres') kg = rawWasted * (item.density_kg_per_l || 1.0);
  else if (unit === 'ml') kg = (rawWasted / 1000) * (item.density_kg_per_l || 1.0);
  else if (unit === 'pieces') kg = rawWasted * (item.weight_per_piece_kg || 0.05);

  const co2 = kg * (item.emission_factor || 1.0);

  document.getElementById('live-waste-kg').textContent = `${kg.toFixed(2)} kg`;
  document.getElementById('live-ef-source').textContent = `${item.emission_factor} kg CO₂e/kg (${item.source || 'IPCC/FAO'})`;
  document.getElementById('live-co2').textContent = `${co2.toFixed(3)} kg CO₂e`;
}

// ── Add Item to Staging Queue ─────────────────────────────
function addItemToQueue() {
  const isCustom = document.getElementById('custom-food-fields').style.display !== 'none';
  const item = getActiveFoodItemDetails();

  if (isCustom && !document.getElementById('custom-name').value.trim()) {
    utils.toast('Please enter the custom food item name.', 'warning');
    return;
  }
  if (!isCustom && !document.getElementById('entry-food-select').value) {
    utils.toast('Please select a food item from the catalog.', 'warning');
    return;
  }

  const prep = parseFloat(document.getElementById('qty-prepared').value);
  const serv = parseFloat(document.getElementById('qty-served').value);
  const left = parseFloat(document.getElementById('qty-leftover').value);
  const disc = parseFloat(document.getElementById('qty-discarded').value);

  if (isNaN(prep) || isNaN(serv) || isNaN(left) || isNaN(disc)) {
    utils.toast('Please fill in all 4 quantity fields (Prepared, Served, Leftover, Discarded).', 'warning');
    return;
  }

  const unit = document.getElementById('entry-unit').value;
  const rawWasted = disc > 0 ? disc : Math.max(0, prep - serv);

  let kg = rawWasted;
  if (unit === 'g') kg = rawWasted / 1000;
  else if (unit === 'litres') kg = rawWasted * (item.density_kg_per_l || 1.0);
  else if (unit === 'ml') kg = (rawWasted / 1000) * (item.density_kg_per_l || 1.0);
  else if (unit === 'pieces') kg = rawWasted * (item.weight_per_piece_kg || 0.05);

  const co2 = kg * (item.emission_factor || 1.0);

  const stagedItem = {
    food_item_id: isCustom ? null : item.id,
    food_name: item.name,
    category: item.category,
    quantity_prepared: prep,
    quantity_served: serv,
    quantity_leftover: left,
    quantity_discarded: disc,
    unit: unit,
    emission_factor: item.emission_factor,
    factor_source: item.source,
    reason: document.getElementById('entry-reason').value,
    remarks: document.getElementById('entry-remarks').value,
    calc_kg: kg,
    calc_co2: co2
  };

  stagedItems.push(stagedItem);
  renderStagedTable();
  utils.toast(`Added ${item.name} to meal queue.`, 'info');

  // Reset item inputs for the next entry
  document.getElementById('qty-prepared').value = '';
  document.getElementById('qty-served').value = '';
  document.getElementById('qty-leftover').value = '';
  document.getElementById('qty-discarded').value = '';
  document.getElementById('entry-remarks').value = '';
}

function renderStagedTable() {
  const container = document.getElementById('staged-container');
  const tbody = document.getElementById('staged-tbody');
  document.getElementById('staged-count').textContent = stagedItems.length;

  if (stagedItems.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';

  tbody.innerHTML = stagedItems.map((item, index) => `
    <tr>
      <td><strong>${item.food_name}</strong></td>
      <td>${item.quantity_prepared} ${item.unit}</td>
      <td>${item.quantity_served}</td>
      <td>${item.quantity_discarded}</td>
      <td style="color:var(--clr-accent-light)">${item.calc_co2.toFixed(2)} kg</td>
      <td><button type="button" class="btn btn-ghost btn-sm" onclick="removeStagedItem(${index})">✕</button></td>
    </tr>
  `).join('');
}

window.removeStagedItem = function(index) {
  stagedItems.splice(index, 1);
  renderStagedTable();
};

// ── Submit Main Form ──────────────────────────────────────
async function handleFormSubmit(e) {
  e.preventDefault();

  const date = document.getElementById('entry-date').value;
  const time = document.getElementById('entry-time').value;
  const hostelId = document.getElementById('entry-hostel').value;
  const messName = document.getElementById('entry-mess').value.trim();
  const mealType = document.getElementById('entry-meal-type').value;

  if (!date || !hostelId || !messName || !mealType) {
    utils.toast('Please select date, time, hostel, and meal.', 'warning');
    return;
  }

  const hostel = allHostels.find(x => String(x.id) === String(hostelId));
  const hostelName = hostel ? hostel.name : 'SIT Hostel';

  const common = {
    record_date: date,
    record_time: time,
    hostel_id: Number(hostelId),
    hostel_name: hostelName,
    mess_name: messName,
    meal_type: mealType
  };

  const submitBtn = document.getElementById('btn-save-record');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    if (stagedItems.length > 0) {
      // Save all staged items as a batch
      await api.createBatchRecords({ common, items: stagedItems });
      utils.toast(`Saved ${stagedItems.length} food items for ${mealType}!`, 'success');
      stagedItems = [];
      renderStagedTable();
    } else {
      // Single record directly from form inputs
      const isCustom = document.getElementById('custom-food-fields').style.display !== 'none';
      const item = getActiveFoodItemDetails();

      if (isCustom && !document.getElementById('custom-name').value.trim()) {
        utils.toast('Please enter custom food name.', 'warning');
        return;
      }
      if (!isCustom && !document.getElementById('entry-food-select').value) {
        utils.toast('Please select a food item or add one to the queue.', 'warning');
        return;
      }

      const prep = parseFloat(document.getElementById('qty-prepared').value);
      const serv = parseFloat(document.getElementById('qty-served').value);
      const left = parseFloat(document.getElementById('qty-leftover').value);
      const disc = parseFloat(document.getElementById('qty-discarded').value);

      if (isNaN(prep) || isNaN(serv) || isNaN(left) || isNaN(disc)) {
        utils.toast('Please enter valid quantities.', 'warning');
        return;
      }

      const payload = {
        ...common,
        food_item_id: isCustom ? null : item.id,
        food_name: item.name,
        category: item.category,
        quantity_prepared: prep,
        quantity_served: serv,
        quantity_leftover: left,
        quantity_discarded: disc,
        unit: document.getElementById('entry-unit').value,
        emission_factor: item.emission_factor,
        factor_source: item.source,
        reason: document.getElementById('entry-reason').value,
        remarks: document.getElementById('entry-remarks').value
      };

      await api.createFoodRecord(payload);
      utils.toast(`Food record for ${item.name} saved successfully!`, 'success');
    }

    clearForm();
    await loadRecords();
  } catch (err) {
    utils.toast('Error saving food record: ' + err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '💾 Save Record';
  }
}

// ── Clear Form ────────────────────────────────────────────
function clearForm() {
  document.getElementById('qty-prepared').value = '';
  document.getElementById('qty-served').value = '';
  document.getElementById('qty-leftover').value = '';
  document.getElementById('qty-discarded').value = '';
  document.getElementById('entry-remarks').value = '';
  document.getElementById('custom-name').value = '';
  document.getElementById('custom-food-fields').style.display = 'none';
  document.getElementById('group-food-select').style.display = 'block';
  document.getElementById('btn-toggle-custom').textContent = '+ Add Custom Item';
  stagedItems = [];
  renderStagedTable();
  updateLiveCalc();
}

// ── Load Records Table with Filters ───────────────────────
async function loadRecords() {
  const hostel = document.getElementById('filter-hostel').value;
  const meal = document.getElementById('filter-meal').value;
  const date = document.getElementById('filter-date').value;

  let q = '?';
  if (hostel && hostel !== 'all') q += `hostel_id=${hostel}&`;
  if (meal && meal !== 'all')     q += `meal_type=${meal}&`;
  if (date)                       q += `date=${date}&`;

  try {
    const data = await api.getFoodRecords(q);
    currentRecords = data.records || [];
    renderRecordsTable(currentRecords);
  } catch (err) {
    utils.toast('Failed to load food records: ' + err.message, 'error');
  }
}

function renderRecordsTable(records) {
  const tbody = document.getElementById('records-tbody');
  const empty = document.getElementById('records-empty');

  if (!records.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = records.map(r => `
    <tr>
      <td>
        <strong>${utils.formatDate(r.record_date)}</strong><br>
        <span style="font-size:11px;color:var(--txt-secondary)">${r.record_time || '12:00'}</span>
      </td>
      <td>
        <span style="font-weight:600">${r.hostel_name}</span><br>
        <span style="font-size:11px;color:var(--txt-secondary)">${r.mess_name}</span>
      </td>
      <td>${utils.mealBadge(r.meal_type)}</td>
      <td>
        <strong>${r.food_name}</strong>
        <span class="badge badge-gray" style="font-size:10px;margin-left:4px">${r.category}</span>
      </td>
      <td>
        ${r.quantity_prepared} / ${r.quantity_served} ${r.unit}
      </td>
      <td>
        <strong style="color:var(--clr-danger)">${r.quantity_discarded} ${r.unit}</strong><br>
        <span style="font-size:10px;color:var(--txt-secondary)">(${r.total_waste_kg.toFixed(2)} kg)</span>
      </td>
      <td>
        <strong style="color:var(--clr-accent-light)">${r.carbon_emission_kg.toFixed(3)} kg</strong>
      </td>
      <td style="font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.reason || ''}">
        ${r.reason || 'Normal waste'}
      </td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="openEditModal(${r.id})" title="Edit Record">✏️</button>
        <button class="btn btn-sm btn-danger btn-icon" onclick="deleteFoodRecord(${r.id})" title="Delete Record" style="margin-left:4px">🗑</button>
      </td>
    </tr>
  `).join('');
}

// ── Edit Record Modal ─────────────────────────────────────
window.openEditModal = function(id) {
  const r = currentRecords.find(x => String(x.id) === String(id));
  if (!r) return;

  document.getElementById('edit-record-id').value = r.id;
  document.getElementById('edit-food-name').value = `${r.food_name} (${r.hostel_name})`;
  document.getElementById('edit-unit').value = r.unit;
  document.getElementById('edit-qty-prepared').value = r.quantity_prepared;
  document.getElementById('edit-qty-served').value = r.quantity_served;
  document.getElementById('edit-qty-leftover').value = r.quantity_leftover;
  document.getElementById('edit-qty-discarded').value = r.quantity_discarded;
  document.getElementById('edit-reason').value = r.reason || '';
  document.getElementById('edit-remarks').value = r.remarks || '';

  document.getElementById('edit-modal').classList.add('active');
};

window.closeEditModal = function() {
  document.getElementById('edit-modal').classList.remove('active');
};

async function handleEditSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('edit-record-id').value;

  const prep = parseFloat(document.getElementById('edit-qty-prepared').value);
  const serv = parseFloat(document.getElementById('edit-qty-served').value);
  const left = parseFloat(document.getElementById('edit-qty-leftover').value);
  const disc = parseFloat(document.getElementById('edit-qty-discarded').value);

  if (isNaN(prep) || isNaN(serv) || isNaN(left) || isNaN(disc)) {
    utils.toast('Please enter valid quantities.', 'warning');
    return;
  }

  const payload = {
    quantity_prepared: prep,
    quantity_served: serv,
    quantity_leftover: left,
    quantity_discarded: disc,
    reason: document.getElementById('edit-reason').value,
    remarks: document.getElementById('edit-remarks').value
  };

  try {
    await api.updateFoodRecord(id, payload);
    utils.toast('Food record updated successfully.', 'success');
    closeEditModal();
    await loadRecords();
  } catch (err) {
    utils.toast('Failed to update record: ' + err.message, 'error');
  }
}

window.deleteFoodRecord = async function(id) {
  if (!confirm('Are you sure you want to delete this food record?')) return;
  try {
    await api.deleteFoodRecord(id);
    utils.toast('Food record deleted.', 'success');
    await loadRecords();
  } catch (err) {
    utils.toast('Failed to delete food record: ' + err.message, 'error');
  }
};

document.addEventListener('DOMContentLoaded', init);
