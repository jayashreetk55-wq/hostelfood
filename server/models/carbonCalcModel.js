/**
 * carbonCalcModel.js — DB queries for carbon_calculations table
 */
const db = require('../config/database');

async function getAll(filters = {}) {
  let sql = `SELECT * FROM carbon_calculations WHERE 1=1`;
  const params = [];

  if (filters.hostel_id && filters.hostel_id !== 'all') {
    sql += ` AND hostel_id = ?`;
    params.push(filters.hostel_id);
  }
  if (filters.date) {
    sql += ` AND calculation_date = ?`;
    params.push(filters.date);
  }
  if (filters.meal_type && filters.meal_type !== 'all') {
    sql += ` AND meal_type = ?`;
    params.push(filters.meal_type);
  }

  sql += ` ORDER BY calculation_date DESC, id DESC`;
  if (filters.limit) {
    sql += ` LIMIT ?`;
    params.push(Number(filters.limit));
  }

  return db.all(sql, params);
}

function getById(id) {
  return db.get(`SELECT * FROM carbon_calculations WHERE id = ?`, [id]);
}

async function create(data) {
  const { lastID } = await db.run(`
    INSERT INTO carbon_calculations (
      hostel_id, hostel_name, calculation_date, meal_type,
      food_item_id, food_name, category, wasted_quantity,
      unit, converted_kg, conversion_notes, emission_factor,
      factor_source, carbon_emission_kg
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?
    )
  `, [
    data.hostel_id,
    data.hostel_name,
    data.calculation_date,
    data.meal_type,
    data.food_item_id || null,
    data.food_name,
    data.category || 'Other',
    data.wasted_quantity,
    data.unit,
    data.converted_kg,
    data.conversion_notes || '',
    data.emission_factor,
    data.factor_source || 'IPCC / FAO',
    data.carbon_emission_kg
  ]);

  return getById(lastID);
}

function remove(id) {
  return db.run(`DELETE FROM carbon_calculations WHERE id = ?`, [id]);
}

module.exports = {
  getAll,
  getById,
  create,
  remove
};
