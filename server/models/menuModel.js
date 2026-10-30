/**
 * menuModel.js — DB queries for menus and menu_items tables with SIT Hostel support
 */
const db = require('../config/database');

async function getAll({ date, meal_type, hostel_id } = {}) {
  let sql = `
    SELECT m.*, u.name AS created_by_name,
           (SELECT COUNT(*) FROM menu_items mi WHERE mi.menu_id = m.id) AS item_count
    FROM menus m
    LEFT JOIN users u ON u.id = m.created_by
    WHERE 1=1
  `;
  const params = [];
  if (date) {
    sql += ` AND m.date = ?`;
    params.push(date);
  }
  if (meal_type) {
    sql += ` AND m.meal_type = ?`;
    params.push(meal_type);
  }
  if (hostel_id && hostel_id !== 'all') {
    sql += ` AND m.hostel_id = ?`;
    params.push(hostel_id);
  }
  sql += ` ORDER BY m.date DESC, m.meal_type`;
  return db.all(sql, params);
}

async function getById(id) {
  const menu = await db.get(`
    SELECT m.*, u.name AS created_by_name
    FROM menus m
    LEFT JOIN users u ON u.id = m.created_by
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

async function create({ date, meal_type, created_by, hostel_id = 1, hostel_name = 'Lalbahadur Shastri Block' }) {
  const { lastID } = await db.run(
    `INSERT INTO menus (date, meal_type, created_by, hostel_id, hostel_name) VALUES (?, ?, ?, ?, ?)`,
    [date, meal_type, created_by, hostel_id, hostel_name]
  );
  return getById(lastID);
}

async function update(id, { date, meal_type, hostel_id, hostel_name }) {
  await db.run(
    `UPDATE menus SET date = ?, meal_type = ?, hostel_id = ?, hostel_name = ? WHERE id = ?`,
    [date, meal_type, hostel_id, hostel_name, id]
  );
  return getById(id);
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

async function updateItem(menuId, itemId, { quantity_planned }) {
  await db.run(
    `UPDATE menu_items SET quantity_planned = ? WHERE id = ? AND menu_id = ?`,
    [quantity_planned, itemId, menuId]
  );
  return db.get(`
    SELECT mi.id, mi.quantity_planned,
           fi.id AS food_item_id, fi.name, fi.category, fi.unit, fi.emission_factor
    FROM menu_items mi JOIN food_items fi ON fi.id = mi.food_item_id
    WHERE mi.id = ?
  `, [itemId]);
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

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  addItem,
  updateItem,
  removeItem,
  getItemById
};
