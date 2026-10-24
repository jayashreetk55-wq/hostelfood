/**
 * wasteModel.js — DB queries for waste_entries table (async/await)
 */
const db = require('../config/database');

async function getAll({ startDate, endDate, meal_type } = {}) {
  let sql = `
    SELECT
      we.id, we.menu_item_id, we.quantity_wasted, we.waste_percentage,
      we.carbon_emission_kg, we.notes, we.logged_at,
      fi.name AS food_name, fi.category, fi.unit, fi.emission_factor,
      m.date, m.meal_type,
      u.name AS logged_by_name
    FROM waste_entries we
    JOIN menu_items  mi ON mi.id = we.menu_item_id
    JOIN food_items  fi ON fi.id = mi.food_item_id
    JOIN menus        m ON  m.id = mi.menu_id
    JOIN users        u ON  u.id = we.logged_by
    WHERE 1=1
  `;
  const params = [];
  if (startDate) { sql += ` AND m.date >= ?`; params.push(startDate); }
  if (endDate)   { sql += ` AND m.date <= ?`; params.push(endDate); }
  if (meal_type) { sql += ` AND m.meal_type = ?`; params.push(meal_type); }
  sql += ` ORDER BY m.date DESC, m.meal_type, fi.name`;
  return db.all(sql, params);
}

function getById(id) {
  return db.get(`
    SELECT
      we.*, fi.name AS food_name, fi.unit, fi.emission_factor,
      m.date, m.meal_type, u.name AS logged_by_name
    FROM waste_entries we
    JOIN menu_items mi ON mi.id = we.menu_item_id
    JOIN food_items fi ON fi.id = mi.food_item_id
    JOIN menus       m ON  m.id = mi.menu_id
    JOIN users       u ON  u.id = we.logged_by
    WHERE we.id = ?
  `, [id]);
}

async function create({ menu_item_id, quantity_wasted, waste_percentage, carbon_emission_kg, logged_by, notes }) {
  const { lastID } = await db.run(`
    INSERT INTO waste_entries
      (menu_item_id, quantity_wasted, waste_percentage, carbon_emission_kg, logged_by, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [menu_item_id, quantity_wasted, waste_percentage, carbon_emission_kg, logged_by, notes || null]);
  return getById(lastID);
}

async function update(id, { quantity_wasted, waste_percentage, carbon_emission_kg, notes }) {
  await db.run(`
    UPDATE waste_entries
    SET quantity_wasted = ?, waste_percentage = ?, carbon_emission_kg = ?, notes = ?
    WHERE id = ?
  `, [quantity_wasted, waste_percentage, carbon_emission_kg, notes || null, id]);
  return getById(id);
}

function remove(id) {
  return db.run(`DELETE FROM waste_entries WHERE id = ?`, [id]);
}

function getByMenuItemId(menuItemId) {
  return db.get(`SELECT * FROM waste_entries WHERE menu_item_id = ?`, [menuItemId]);
}

module.exports = { getAll, getById, create, update, remove, getByMenuItemId };
