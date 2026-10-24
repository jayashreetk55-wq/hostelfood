/**
 * dashboardController.js — Aggregated stats for chart rendering
 */
const reportModel = require('../models/reportModel');
const { getCarbonContext, calcWeeklyReduction } = require('../utils/emissionCalculator');

function nDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
function today() { return new Date().toISOString().split('T')[0]; }

async function getSummary(req, res, next) {
  try {
    const todayStr = today();
    const data = await reportModel.getTodaySummary(todayStr);
    const context = getCarbonContext(data.total_co2_kg);

    // Weekly reduction
    const [last7, this7] = await Promise.all([
      reportModel.getWeeklyTotals(nDaysAgo(13), nDaysAgo(7)),
      reportModel.getWeeklyTotals(nDaysAgo(6), todayStr)
    ]);
    const lastWk = last7.reduce((s, r) => s + r.total_waste_kg, 0);
    const thisWk = this7.reduce((s, r) => s + r.total_waste_kg, 0);
    const reduction = calcWeeklyReduction(lastWk, thisWk);

    res.json({ summary: { ...data, carbon_context: context, weekly_reduction_pct: reduction } });
  } catch (err) { next(err); }
}

async function getWeekly(req, res, next) {
  try {
    const data = await reportModel.getWeeklyTotals(nDaysAgo(6), today());
    res.json({ weekly: data });
  } catch (err) { next(err); }
}

async function getByMeal(req, res, next) {
  try {
    const data = await reportModel.getByMealType(nDaysAgo(29), today());
    res.json({ by_meal: data });
  } catch (err) { next(err); }
}

async function getTopWasted(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 5;
    const data = await reportModel.getTopWasted(nDaysAgo(29), today(), limit);
    res.json({ top_wasted: data });
  } catch (err) { next(err); }
}

async function getEmissionsTrend(req, res, next) {
  try {
    const data = await reportModel.getEmissionsTrend(nDaysAgo(29), today());
    res.json({ emissions_trend: data });
  } catch (err) { next(err); }
}

module.exports = { getSummary, getWeekly, getByMeal, getTopWasted, getEmissionsTrend };
