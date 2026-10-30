/**
 * settingsController.js — Food item management (admin and manager)
 */
const foodItemModel = require('../models/foodItemModel');

async function listFoodItems(req, res, next) {
  try {
    const items = await foodItemModel.getAll();
    res.json({ items });
  } catch (err) { next(err); }
}

async function createFoodItem(req, res, next) {
  try {
    const { name, category, unit, emission_factor, source, density_kg_per_l, weight_per_piece_kg } = req.body;
    if (!name || !category || !unit || emission_factor === undefined) {
      return res.status(400).json({ error: 'name, category, unit, and emission_factor are required.' });
    }
    const item = await foodItemModel.create({
      name,
      category,
      unit,
      emission_factor: parseFloat(emission_factor),
      source,
      density_kg_per_l,
      weight_per_piece_kg
    });
    res.status(201).json({ item });
  } catch (err) { next(err); }
}

async function updateFoodItem(req, res, next) {
  try {
    const { name, category, unit, emission_factor, source, density_kg_per_l, weight_per_piece_kg } = req.body;
    const existing = await foodItemModel.getById(Number(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Food item not found.' });
    const item = await foodItemModel.update(Number(req.params.id), {
      name: name || existing.name,
      category: category || existing.category,
      unit: unit || existing.unit,
      emission_factor: emission_factor !== undefined ? parseFloat(emission_factor) : existing.emission_factor,
      source: source || existing.source,
      density_kg_per_l: density_kg_per_l !== undefined ? parseFloat(density_kg_per_l) : existing.density_kg_per_l,
      weight_per_piece_kg: weight_per_piece_kg !== undefined ? parseFloat(weight_per_piece_kg) : existing.weight_per_piece_kg
    });
    res.json({ item });
  } catch (err) { next(err); }
}

async function deleteFoodItem(req, res, next) {
  try {
    const result = await foodItemModel.remove(Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Food item not found.' });
    res.json({ success: true, message: 'Food item deleted successfully.' });
  } catch (err) { next(err); }
}

module.exports = { listFoodItems, createFoodItem, updateFoodItem, deleteFoodItem };
