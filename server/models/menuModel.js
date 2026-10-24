/**
 * menuModel.js — DB queries for menus and menu_items tables (async/await)
 */
const db = require('../config/database');

// ── Menus ─────────────────────────────────────────────────

async function getAll({ date, meal_type } = {}) {
  let sql = `
    SELECT m.*, u.name AS created_by_name
    FROM menus m
    JOIN users u ON u.id = m.created_by
    WHERE 1=1
  `;
  const params = [];
  if (date)      { sql += ` AND m.date = ?`;      params.push(date); }
  if (meal_type) { sql += ` AND m.meal_type = ?`; params.push(meal_type); }
  sql += ` ORDER BY m.date DESC, m.meal_type`;
  return db.all(sql, params);
}

async function getById(id) {
  const menu = await db.get(`
    SELECT m.*, u.name AS created_by_name
    FROM menus m
    JOIN users u ON u.id = m.created_by
    WHERE m.id = ?
  `, [id]);
  if (!menu) return null;

  menu.items = await db.all(`
    SELECT mi.id, mi.quantity_planned,
           fi.id AS food_item_id, fi.name, fi.category, fi.unit, fi.emission_factor
    FROM menu_items mi
    JOIN food_items fi ON fi.id = mi.food_item_id
    WHERE mi.menu_id = ?
    ORDER BY fi.category, fi.name
  `, [id]);

  return menu;
}

async function create({ date, meal_type, created_by }) {
  const { lastID } = await db.run(
    `INSERT INTO menus (date, meal_type, created_by) VALUES (?, ?, ?)`,
    [date, meal_type, created_by]
  );
  return getById(lastID);
}

function remove(id) {
  return db.run(`DELETE FROM menus WHERE id = ?`, [id]);
}

// ── Menu Items ────────────────────────────────────────────

async function addItem(menuId, { food_item_id, quantity_planned }) {
  const { lastID } = await db.run(
    `INSERT INTO menu_items (menu_id, food_item_id, quantity_planned) VALUES (?, ?, ?)`,
    [menuId, food_item_id, quantity_planned]
  );
  return db.get(`
    SELECT mi.id, mi.quantity_planned,
           fi.id AS food_item_id, fi.name, fi.category, fi.unit, fi.emission_factor
    FROM menu_items mi JOIN food_items fi ON fi.id = mi.food_item_id
    WHERE mi.id = ?
  `, [lastID]);
}

function removeItem(menuId, itemId) {
  return db.run(
    `DELETE FROM menu_items WHERE id = ? AND menu_id = ?`, [itemId, menuId]
  );
}

function getItemById(itemId) {
  return db.get(`
    SELECT mi.*, fi.emission_factor, fi.name AS food_name, fi.unit
    FROM menu_items mi JOIN food_items fi ON fi.id = mi.food_item_id
    WHERE mi.id = ?
  `, [itemId]);
}

module.exports = { getAll, getById, create, remove, addItem, removeItem, getItemById };
