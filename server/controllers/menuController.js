/**
 * menuController.js — CRUD for menus and menu items (async/await)
 */
const menuModel = require('../models/menuModel');

async function listMenus(req, res, next) {
  try {
    const { date, meal_type } = req.query;
    const menus = await menuModel.getAll({ date, meal_type });
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
    const { date, meal_type } = req.body;
    if (!date || !meal_type) {
      return res.status(400).json({ error: 'date and meal_type are required.' });
    }
    const menu = await menuModel.create({ date, meal_type, created_by: req.session.userId });
    res.status(201).json({ menu });
  } catch (err) { next(err); }
}

async function deleteMenu(req, res, next) {
  try {
    const result = await menuModel.remove(Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Menu not found.' });
    res.json({ success: true });
  } catch (err) { next(err); }
}

async function addMenuItem(req, res, next) {
  try {
    const { food_item_id, quantity_planned } = req.body;
    if (!food_item_id || !quantity_planned) {
      return res.status(400).json({ error: 'food_item_id and quantity_planned are required.' });
    }
    const item = await menuModel.addItem(Number(req.params.id), { food_item_id, quantity_planned });
    res.status(201).json({ item });
  } catch (err) { next(err); }
}

async function removeMenuItem(req, res, next) {
  try {
    const result = await menuModel.removeItem(Number(req.params.id), Number(req.params.itemId));
    if (result.changes === 0) return res.status(404).json({ error: 'Menu item not found.' });
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { listMenus, getMenu, createMenu, deleteMenu, addMenuItem, removeMenuItem };
