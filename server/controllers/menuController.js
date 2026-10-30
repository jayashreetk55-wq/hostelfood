/**
 * menuController.js — CRUD for menus and menu items with hostel support
 */
const menuModel = require('../models/menuModel');
const hostelModel = require('../models/hostelModel');

async function listMenus(req, res, next) {
  try {
    const { date, meal_type, hostel_id } = req.query;
    const menus = await menuModel.getAll({ date, meal_type, hostel_id });
    res.json({ menus });
  } catch (err) { next(err); }
}

async function getMenu(req, res, next) {
  try {
    const menu = await menuModel.getById(Number(req.params.id));
    if (!menu) return res.status(404).json({ error: 'Menu not found.' });
    res.json({ menu });
  } catch (err) { next(err); }
}

async function createMenu(req, res, next) {
  try {
    const { date, meal_type, hostel_id } = req.body;
    if (!date || !meal_type) {
      return res.status(400).json({ error: 'date and meal_type are required.' });
    }

    let hostelName = 'Lalbahadur Shastri Block';
    const hId = Number(hostel_id) || 1;
    const hostel = await hostelModel.getById(hId);
    if (hostel) hostelName = hostel.name;

    const menu = await menuModel.create({
      date,
      meal_type,
      created_by: req.session ? req.session.userId : 1,
      hostel_id: hId,
      hostel_name: hostelName
    });
    res.status(201).json({ menu });
  } catch (err) { next(err); }
}

async function updateMenu(req, res, next) {
  try {
    const { date, meal_type, hostel_id } = req.body;
    const existing = await menuModel.getById(Number(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Menu not found.' });

    let hostelName = existing.hostel_name;
    const hId = hostel_id ? Number(hostel_id) : existing.hostel_id;
    if (hostel_id) {
      const hostel = await hostelModel.getById(hId);
      if (hostel) hostelName = hostel.name;
    }

    const menu = await menuModel.update(Number(req.params.id), {
      date: date || existing.date,
      meal_type: meal_type || existing.meal_type,
      hostel_id: hId,
      hostel_name: hostelName
    });
    res.json({ menu });
  } catch (err) { next(err); }
}

async function deleteMenu(req, res, next) {
  try {
    const result = await menuModel.remove(Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Menu not found.' });
    res.json({ success: true, message: 'Menu deleted successfully.' });
  } catch (err) { next(err); }
}

async function addMenuItem(req, res, next) {
  try {
    const { food_item_id, quantity_planned } = req.body;
    if (!food_item_id || !quantity_planned) {
      return res.status(400).json({ error: 'food_item_id and quantity_planned are required.' });
    }
    const item = await menuModel.addItem(Number(req.params.id), { food_item_id, quantity_planned: parseFloat(quantity_planned) });
    res.status(201).json({ item });
  } catch (err) { next(err); }
}

async function updateMenuItem(req, res, next) {
  try {
    const { quantity_planned } = req.body;
    if (quantity_planned === undefined || isNaN(parseFloat(quantity_planned))) {
      return res.status(400).json({ error: 'Valid planned quantity is required.' });
    }
    const item = await menuModel.updateItem(Number(req.params.id), Number(req.params.itemId), {
      quantity_planned: parseFloat(quantity_planned)
    });
    res.json({ item });
  } catch (err) { next(err); }
}

async function removeMenuItem(req, res, next) {
  try {
    const result = await menuModel.removeItem(Number(req.params.id), Number(req.params.itemId));
    if (result.changes === 0) return res.status(404).json({ error: 'Menu item not found.' });
    res.json({ success: true, message: 'Menu item removed.' });
  } catch (err) { next(err); }
}

module.exports = {
  listMenus,
  getMenu,
  createMenu,
  updateMenu,
  deleteMenu,
  addMenuItem,
  updateMenuItem,
  removeMenuItem
};
