/**
 * reportController.js — Filtered reports + CSV export
 */
const reportModel = require('../models/reportModel');
const wasteModel  = require('../models/wasteModel');
const { objectsToCSV } = require('../utils/csvExporter');

async function getDailyReport(req, res, next) {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const entries = await wasteModel.getAll({ startDate: date, endDate: date });
    const totalWaste = entries.reduce((s, e) => s + e.quantity_wasted, 0);
    const totalCo2   = entries.reduce((s, e) => s + e.carbon_emission_kg, 0);
    res.json({ date, entries, totals: { total_waste_kg: totalWaste, total_co2_kg: totalCo2 } });
  } catch (err) { next(err); }
}

async function getMonthlyReport(req, res, next) {
  try {
    const year  = Number(req.query.year)  || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const rows  = await reportModel.getMonthlyReport(year, month);
    const totalWaste = rows.reduce((s, r) => s + (r.quantity_wasted || 0), 0);
    const totalCo2   = rows.reduce((s, r) => s + (r.carbon_emission_kg || 0), 0);
    res.json({ year, month, rows, totals: { total_waste_kg: totalWaste, total_co2_kg: totalCo2 } });
  } catch (err) { next(err); }
}

async function exportCSV(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const entries = await wasteModel.getAll({ startDate, endDate });
    const headers = [
      'date', 'meal_type', 'food_name', 'category', 'unit',
      'quantity_wasted', 'waste_percentage', 'carbon_emission_kg', 'logged_by_name', 'notes'
    ];
    const csv = objectsToCSV(entries, headers);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="waste-report.csv"');
    res.send(csv);
  } catch (err) { next(err); }
}

async function getFoodItemStats(req, res, next) {
  try {
    const { startDate = '2020-01-01', endDate = new Date().toISOString().split('T')[0] } = req.query;
    const stats = await reportModel.getFoodItemStats(startDate, endDate);
    res.json({ stats });
  } catch (err) { next(err); }
}

module.exports = { getDailyReport, getMonthlyReport, exportCSV, getFoodItemStats };
