/**
 * foodItemModel.js — DB queries for the food_items table (async/await)
 */
const db = require('../config/database');

function getAll() {
  return db.all(`SELECT * FROM food_items ORDER BY category, name`);
}

function getById(id) {
  return db.get(`SELECT * FROM food_items WHERE id = ?`, [id]);
}

async function create({ name, category, unit, emission_factor }) {
  const { lastID } = await db.run(
    `INSERT INTO food_items (name, category, unit, emission_factor) VALUES (?, ?, ?, ?)`,
    [name, category, unit, emission_factor]
  );
  return getById(lastID);
}

async function update(id, { name, category, unit, emission_factor }) {
  await db.run(
    `UPDATE food_items SET name = ?, category = ?, unit = ?, emission_factor = ? WHERE id = ?`,
    [name, category, unit, emission_factor, id]
  );
  return getById(id);
}

function remove(id) {
  return db.run(`DELETE FROM food_items WHERE id = ?`, [id]);
}

module.exports = { getAll, getById, create, update, remove };
