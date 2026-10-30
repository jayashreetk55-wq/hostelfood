/**
 * foodRecordModel.js — DB queries for food_records table
 */
const db = require('../config/database');
const { convertToKg, calcCarbonEmission } = require('../utils/emissionCalculator');
const foodItemModel = require('./foodItemModel');

async function getAll(filters = {}) {
  let sql = `SELECT * FROM food_records WHERE 1=1`;
  const params = [];

  if (filters.hostel_id && filters.hostel_id !== 'all') {
    sql += ` AND hostel_id = ?`;
    params.push(filters.hostel_id);
  }
  if (filters.meal_type && filters.meal_type !== 'all') {
    sql += ` AND meal_type = ?`;
    params.push(filters.meal_type);
  }
  if (filters.date) {
    sql += ` AND record_date = ?`;
    params.push(filters.date);
  }
  if (filters.startDate) {
    sql += ` AND record_date >= ?`;
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    sql += ` AND record_date <= ?`;
    params.push(filters.endDate);
  }

  sql += ` ORDER BY record_date DESC, record_time DESC, id DESC`;
  if (filters.limit) {
    sql += ` LIMIT ?`;
    params.push(Number(filters.limit));
  }

  return db.all(sql, params);
}

function getById(id) {
  return db.get(`SELECT * FROM food_records WHERE id = ?`, [id]);
}

async function prepareCalculations(data) {
  // Retrieve item details to get density / weight_per_piece
  let item = null;
  if (data.food_item_id) {
    item = await foodItemModel.getById(data.food_item_id);
  } else if (data.food_name) {
    item = await foodItemModel.getByName(data.food_name);
  }

  const emissionFactor = parseFloat(data.emission_factor) || (item ? item.emission_factor : 1.0);
  const factorSource = data.factor_source || (item ? item.source : 'IPCC / FAO 2023');

  // Wasted food calculation:
  // Discarded quantity is directly wasted. If discarded is 0 and leftover was explicitly marked wasted, use that.
  const discarded = parseFloat(data.quantity_discarded) || 0;
  const leftover = parseFloat(data.quantity_leftover) || 0;
  const prepared = parseFloat(data.quantity_prepared) || 0;
  const served = parseFloat(data.quantity_served) || 0;

  // The primary wasted food measure is quantity_discarded (food thrown away without consumption).
  // If discarded is provided, that represents the physical waste.
  const wastedRaw = discarded > 0 ? discarded : Math.max(0, prepared - served);

  const conversion = convertToKg(wastedRaw, data.unit || 'kg', item || {});
  const totalWasteKg = conversion.success ? conversion.kg : wastedRaw;
  const carbonEmissionKg = calcCarbonEmission(totalWasteKg, emissionFactor);

  return {
    item,
    emissionFactor,
    factorSource,
    totalWasteKg,
    carbonEmissionKg,
    prepared,
    served,
    leftover,
    discarded
  };
}

async function create(data) {
  const calc = await prepareCalculations(data);

  const { lastID } = await db.run(`
    INSERT INTO food_records (
      record_date, record_time, hostel_id, hostel_name, mess_name,
      meal_type, food_item_id, food_name, category,
      quantity_prepared, quantity_served, quantity_leftover, quantity_discarded,
      unit, total_waste_kg, emission_factor, factor_source, carbon_emission_kg,
      reason, remarks, logged_by
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `, [
    data.record_date,
    data.record_time || '12:00',
    data.hostel_id,
    data.hostel_name || 'Hostel',
    data.mess_name || 'Hostel Mess',
    data.meal_type,
    data.food_item_id || null,
    data.food_name,
    data.category || 'Other',
    calc.prepared,
    calc.served,
    calc.leftover,
    calc.discarded,
    data.unit || 'kg',
    calc.totalWasteKg,
    calc.emissionFactor,
    calc.factorSource,
    calc.carbonEmissionKg,
    data.reason || 'Normal mess waste',
    data.remarks || '',
    data.logged_by || 1
  ]);

  return getById(lastID);
}

async function createBatch(items, commonData) {
  const created = [];
  for (const item of items) {
    const fullData = { ...commonData, ...item };
    const record = await create(fullData);
    created.push(record);
  }
  return created;
}

async function update(id, data) {
  const existing = await getById(id);
  if (!existing) return null;

  const merged = { ...existing, ...data };
  const calc = await prepareCalculations(merged);

  await db.run(`
    UPDATE food_records SET
      record_date = ?,
      record_time = ?,
      hostel_id = ?,
      hostel_name = ?,
      mess_name = ?,
      meal_type = ?,
      food_item_id = ?,
      food_name = ?,
      category = ?,
      quantity_prepared = ?,
      quantity_served = ?,
      quantity_leftover = ?,
      quantity_discarded = ?,
      unit = ?,
      total_waste_kg = ?,
      emission_factor = ?,
      factor_source = ?,
      carbon_emission_kg = ?,
      reason = ?,
      remarks = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `, [
    merged.record_date,
    merged.record_time,
    merged.hostel_id,
    merged.hostel_name,
    merged.mess_name,
    merged.meal_type,
    merged.food_item_id || null,
    merged.food_name,
    merged.category,
    calc.prepared,
    calc.served,
    calc.leftover,
    calc.discarded,
    merged.unit,
    calc.totalWasteKg,
    calc.emissionFactor,
    calc.factorSource,
    calc.carbonEmissionKg,
    merged.reason,
    merged.remarks,
    id
  ]);

  return getById(id);
}

function remove(id) {
  return db.run(`DELETE FROM food_records WHERE id = ?`, [id]);
}

module.exports = {
  getAll,
  getById,
  create,
  createBatch,
  update,
  remove
};
