/**
 * settingsController.js — Food item management (admin only)
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
    const { name, category, unit, emission_factor } = req.body;
    if (!name || !category || !unit || emission_factor === undefined) {
      return res.status(400).json({ error: 'name, category, unit, and emission_factor are required.' });
    }
    const item = await foodItemModel.create({ name, category, unit, emission_factor });
    res.status(201).json({ item });
  } catch (err) { next(err); }
}

async function updateFoodItem(req, res, next) {
  try {
    const { name, category, unit, emission_factor } = req.body;
    const existing = await foodItemModel.getById(Number(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Food item not found.' });
    const item = await foodItemModel.update(Number(req.params.id), { name, category, unit, emission_factor });
    res.json({ item });
  } catch (err) { next(err); }
}

async function deleteFoodItem(req, res, next) {
  try {
    const result = await foodItemModel.remove(Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Food item not found.' });
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { listFoodItems, createFoodItem, updateFoodItem, deleteFoodItem };
