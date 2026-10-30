/**
 * calculator.js — Interactive Carbon Footprint Calculator Logic
 */

let allHostels = [];
let allFoodItems = [];
let lastCalculationResult = null;

async function init() {
  const user = await utils.requireLogin();
  if (user) utils.renderUserInfo(user);

  document.getElementById('calc-date').value = new Date().toISOString().split('T')[0];

  await Promise.all([loadHostels(), loadFoodItems()]);
  await loadHistory();
  setupEventListeners();
}

async function loadHostels() {
  try {
    const data = await api.getHostels();
    allHostels = data.hostels || [];

    const sel = document.getElementById('calc-hostel');
    const filterSel = document.getElementById('hist-filter-hostel');

    sel.innerHTML = '<option value="">Select SIT Hostel...</option>';
    filterSel.innerHTML = '<option value="all">All Hostels</option>';

    allHostels.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.id;
      opt.textContent = `${h.name} (${h.block_type.toUpperCase()})`;
      sel.appendChild(opt);

      const fOpt = document.createElement('option');
      fOpt.value = h.id;
      fOpt.textContent = h.name;
      filterSel.appendChild(fOpt);
    });

    if (allHostels.length > 0) sel.value = allHostels[0].id;
  } catch (err) {
    utils.toast('Failed to load hostels: ' + err.message, 'error');
  }
}

async function loadFoodItems() {
  try {
    const data = await api.getFoodItems();
    allFoodItems = data.items || [];

    const sel = document.getElementById('calc-food');
    sel.innerHTML = '<option value="">Choose Food Item...</option>';

    allFoodItems.forEach(fi => {
      const opt = document.createElement('option');
      opt.value = fi.id;
      opt.textContent = `${fi.name} (${fi.category} · ${fi.unit})`;
      sel.appendChild(opt);
    });
  } catch (err) {
    utils.toast('Failed to load food items: ' + err.message, 'error');
  }
}

function setupEventListeners() {
  // Food selection -> update badge and unit
  document.getElementById('calc-food').addEventListener('change', (e) => {
    const item = allFoodItems.find(x => String(x.id) === String(e.target.value));
    const tag = document.getElementById('factor-details-tag');
    const tagText = document.getElementById('tag-factor-text');

    if (item) {
      if (item.unit) document.getElementById('calc-unit').value = item.unit;
      tag.style.display = 'inline-flex';
      let extra = '';
      if (item.density_kg_per_l && item.density_kg_per_l !== 1) extra += ` · Density: ${item.density_kg_per_l} kg/L`;
      if (item.weight_per_piece_kg) extra += ` · Wt/pc: ${item.weight_per_piece_kg} kg`;
      tagText.textContent = `Verified EF: ${item.emission_factor} kg CO₂e/kg (${item.source || 'IPCC / FAO'})${extra}`;
    } else {
      tag.style.display = 'none';
    }
  });

  // Calculate submit
  document.getElementById('calc-form').addEventListener('submit', handleCalculate);

  // Save to history button
  document.getElementById('btn-save-calc').addEventListener('click', handleSaveCalculation);

  // History filters
  document.getElementById('hist-filter-hostel').addEventListener('change', loadHistory);
  document.getElementById('hist-filter-meal').addEventListener('change', loadHistory);
  document.getElementById('hist-filter-date').addEventListener('input', loadHistory);
  document.getElementById('btn-reset-hist-filter').addEventListener('click', () => {
    document.getElementById('hist-filter-hostel').value = 'all';
    document.getElementById('hist-filter-meal').value = 'all';
    document.getElementById('hist-filter-date').value = '';
    loadHistory();
  });
}

async function handleCalculate(e) {
  e.preventDefault();

  const foodId = document.getElementById('calc-food').value;
  const qty = parseFloat(document.getElementById('calc-qty').value);
  const unit = document.getElementById('calc-unit').value;

  if (!foodId) {
    utils.toast('Please select a food item.', 'warning');
    return;
  }
  if (isNaN(qty) || qty <= 0) {
    utils.toast('Please enter a valid positive quantity.', 'warning');
    return;
  }

  const resultBox = document.getElementById('calc-result-box');
  const unavailBox = document.getElementById('calc-unavailable-box');
  const btn = document.getElementById('btn-run-calc');

  btn.disabled = true;
  btn.textContent = 'Computing...';

  try {
    const res = await api.calculateCarbon({
      food_item_id: Number(foodId),
      quantity: qty,
      unit: unit
    });

    const calc = res.calculation;
    if (!calc.available) {
      resultBox.style.display = 'none';
      unavailBox.style.display = 'flex';
      document.getElementById('unavailable-reason').textContent = `Calculation unavailable: ${calc.reason}`;
      lastCalculationResult = null;
    } else {
      unavailBox.style.display = 'none';
      resultBox.style.display = 'block';

      document.getElementById('res-co2').textContent = `${calc.carbon_emission_kg.toFixed(3)} kg CO₂e`;
      document.getElementById('res-formula').textContent = calc.formula;
      document.getElementById('res-steps').textContent = `Conversion: ${calc.conversion_steps}`;

      document.getElementById('eq-car').textContent = `${calc.equivalents.car_km} km`;
      document.getElementById('eq-phones').textContent = `${calc.equivalents.smartphones} phones`;
      document.getElementById('eq-tree').textContent = `${calc.equivalents.tree_absorption_days} days`;

      lastCalculationResult = {
        food_item_id: Number(foodId),
        wasted_quantity: qty,
        unit: unit,
        calc: calc
      };

      utils.toast('Carbon footprint calculated!', 'success');
    }
  } catch (err) {
    utils.toast('Calculation error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '⚡ Calculate Carbon Footprint';
  }
}

async function handleSaveCalculation() {
  if (!lastCalculationResult) {
    utils.toast('No active calculation to save.', 'warning');
    return;
  }

  const hostelId = document.getElementById('calc-hostel').value;
  const date = document.getElementById('calc-date').value;
  const meal = document.getElementById('calc-meal').value;

  if (!hostelId || !date || !meal) {
    utils.toast('Please ensure hostel, date, and meal are selected.', 'warning');
    return;
  }

  const item = allFoodItems.find(x => String(x.id) === String(lastCalculationResult.food_item_id));
  const saveBtn = document.getElementById('btn-save-calc');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    await api.saveCarbonCalculation({
      hostel_id: Number(hostelId),
      calculation_date: date,
      meal_type: meal,
      food_item_id: lastCalculationResult.food_item_id,
      food_name: item ? item.name : 'Food Item',
      category: item ? item.category : 'Other',
      wasted_quantity: lastCalculationResult.wasted_quantity,
      unit: lastCalculationResult.unit,
      emission_factor: item ? item.emission_factor : 1.0,
      factor_source: item ? item.source : 'IPCC / FAO'
    });

    utils.toast('Calculation saved to history!', 'success');
    await loadHistory();
  } catch (err) {
    utils.toast('Failed to save calculation: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '📌 Save Calculation to History';
  }
}

async function loadHistory() {
  const hostel = document.getElementById('hist-filter-hostel').value;
  const meal = document.getElementById('hist-filter-meal').value;
  const date = document.getElementById('hist-filter-date').value;

  let q = '?';
  if (hostel && hostel !== 'all') q += `hostel_id=${hostel}&`;
  if (meal && meal !== 'all')     q += `meal_type=${meal}&`;
  if (date)                       q += `date=${date}&`;

  try {
    const data = await api.getCarbonHistory(q);
    const history = data.history || [];
    renderHistoryTable(history);
  } catch (err) {
    utils.toast('Failed to load history: ' + err.message, 'error');
  }
}

function renderHistoryTable(items) {
  const tbody = document.getElementById('hist-tbody');
  const empty = document.getElementById('hist-empty');
  const totalEl = document.getElementById('history-total-co2');

  const totalCO2 = items.reduce((sum, x) => sum + (x.carbon_emission_kg || 0), 0);
  totalEl.textContent = `Total: ${totalCO2.toFixed(3)} kg CO₂e`;

  if (!items.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = items.map(item => `
    <tr>
      <td>
        <strong>${utils.formatDate(item.calculation_date)}</strong><br>
        <span style="font-size:11px;color:var(--txt-secondary)">${utils.mealLabel(item.meal_type)}</span>
      </td>
      <td><strong>${item.hostel_name}</strong></td>
      <td>
        ${item.food_name}
        <span class="badge badge-gray" style="font-size:10px">${item.category}</span>
      </td>
      <td>${item.wasted_quantity} ${item.unit}</td>
      <td>
        <strong style="color:var(--clr-accent-light)">${item.carbon_emission_kg.toFixed(3)} kg</strong>
      </td>
      <td style="font-size:11px;color:var(--txt-secondary)">
        ${item.emission_factor} kg CO₂/kg<br>
        <span style="font-size:10px">${item.factor_source || 'IPCC / FAO'}</span>
      </td>
      <td>
        <button class="btn btn-sm btn-danger btn-icon" onclick="deleteHistoryItem(${item.id})" title="Delete">🗑</button>
      </td>
    </tr>
  `).join('');
}

window.deleteHistoryItem = async function(id) {
  if (!confirm('Delete this calculation from history?')) return;
  try {
    await api.deleteCarbonHistory(id);
    utils.toast('Calculation record removed.', 'info');
    await loadHistory();
  } catch (err) {
    utils.toast('Failed to delete history: ' + err.message, 'error');
  }
};

document.addEventListener('DOMContentLoaded', init);
