/**
 * wasteController.js — CRUD for waste entries with auto emission calculation
 */
const wasteModel  = require('../models/wasteModel');
const menuModel   = require('../models/menuModel');
const { calcWastePercentage, calcCarbonEmission } = require('../utils/emissionCalculator');

async function listWaste(req, res, next) {
  try {
    const { startDate, endDate, meal_type } = req.query;
    const entries = await wasteModel.getAll({ startDate, endDate, meal_type });
    res.json({ entries });
  } catch (err) { next(err); }
}

async function getWaste(req, res, next) {
  try {
    const entry = await wasteModel.getById(Number(req.params.id));
    if (!entry) return res.status(404).json({ error: 'Waste entry not found.' });
    res.json({ entry });
  } catch (err) { next(err); }
}

async function createWaste(req, res, next) {
  try {
    const { menu_item_id, quantity_wasted, notes } = req.body;
    if (menu_item_id === undefined || quantity_wasted === undefined) {
      return res.status(400).json({ error: 'menu_item_id and quantity_wasted are required.' });
    }
    const menuItem = await menuModel.getItemById(Number(menu_item_id));
    if (!menuItem) return res.status(404).json({ error: 'Menu item not found.' });

    const existing = await wasteModel.getByMenuItemId(Number(menu_item_id));
    if (existing) {
      return res.status(409).json({ error: 'Waste already logged for this menu item. Use PUT to update.' });
    }

    const waste_percentage   = calcWastePercentage(quantity_wasted, menuItem.quantity_planned);
    const carbon_emission_kg = calcCarbonEmission(quantity_wasted, menuItem.emission_factor);

    const entry = await wasteModel.create({
      menu_item_id, quantity_wasted, waste_percentage, carbon_emission_kg,
      logged_by: req.session.userId, notes
    });
    res.status(201).json({ entry });
  } catch (err) { next(err); }
}

async function updateWaste(req, res, next) {
  try {
    const { quantity_wasted, notes } = req.body;
    const existing = await wasteModel.getById(Number(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Waste entry not found.' });

    const menuItem = await menuModel.getItemById(existing.menu_item_id);
    const waste_percentage   = calcWastePercentage(quantity_wasted, menuItem.quantity_planned);
    const carbon_emission_kg = calcCarbonEmission(quantity_wasted, menuItem.emission_factor);

    const entry = await wasteModel.update(Number(req.params.id), {
      quantity_wasted, waste_percentage, carbon_emission_kg, notes
    });
    res.json({ entry });
  } catch (err) { next(err); }
}

async function deleteWaste(req, res, next) {
  try {
    const result = await wasteModel.remove(Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Waste entry not found.' });
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { listWaste, getWaste, createWaste, updateWaste, deleteWaste };
