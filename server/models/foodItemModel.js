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

function getByName(name) {
  return db.get(`SELECT * FROM food_items WHERE LOWER(name) = LOWER(?)`, [name.trim()]);
}

async function create({ name, category, unit, emission_factor, source, density_kg_per_l, weight_per_piece_kg }) {
  const density = parseFloat(density_kg_per_l) || 1.0;
  const pieceWeight = parseFloat(weight_per_piece_kg) || 0.05;
  const factorSource = source || 'IPCC / FAO Life-Cycle Assessment';

  const { lastID } = await db.run(
    `INSERT INTO food_items (name, category, unit, emission_factor, source, density_kg_per_l, weight_per_piece_kg)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name.trim(), category, unit, emission_factor, factorSource, density, pieceWeight]
  );
  return getById(lastID);
}

async function update(id, { name, category, unit, emission_factor, source, density_kg_per_l, weight_per_piece_kg }) {
  const density = parseFloat(density_kg_per_l) || 1.0;
  const pieceWeight = parseFloat(weight_per_piece_kg) || 0.05;
  const factorSource = source || 'IPCC / FAO Life-Cycle Assessment';

  await db.run(
    `UPDATE food_items
     SET name = ?, category = ?, unit = ?, emission_factor = ?, source = ?, density_kg_per_l = ?, weight_per_piece_kg = ?
     WHERE id = ?`,
    [name.trim(), category, unit, emission_factor, factorSource, density, pieceWeight, id]
  );
  return getById(id);
}

function remove(id) {
  return db.run(`DELETE FROM food_items WHERE id = ?`, [id]);
}

module.exports = { getAll, getById, getByName, create, update, remove };
