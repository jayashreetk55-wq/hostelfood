/**
 * dashboardController.js — Aggregated stats and visualizations for SIT Hostel Monitoring System
 */
const reportModel = require('../models/reportModel');
const { getCarbonContext, calcWeeklyReduction } = require('../utils/emissionCalculator');

function nDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

async function getSummary(req, res, next) {
  try {
    const todayStr = today();
    const currentMonth = todayStr.slice(0, 7);
    const hostelId = req.query.hostel_id || null;

    const [todayData, monthData] = await Promise.all([
      reportModel.getTodaySummary(todayStr, hostelId),
      reportModel.getMonthSummary(currentMonth, hostelId)
    ]);

    const context = getCarbonContext(todayData ? todayData.total_co2_kg : 0);

    // Weekly reduction comparison
    const [last7, this7] = await Promise.all([
      reportModel.getWeeklyTotals(nDaysAgo(13), nDaysAgo(7), hostelId),
      reportModel.getWeeklyTotals(nDaysAgo(6), todayStr, hostelId)
    ]);
    const lastWk = last7.reduce((s, r) => s + (r.total_waste_kg || 0), 0);
    const thisWk = this7.reduce((s, r) => s + (r.total_waste_kg || 0), 0);
    const reduction = calcWeeklyReduction(lastWk, thisWk);

    const wastePct = (todayData && todayData.total_prepared_kg > 0)
      ? parseFloat(((todayData.total_waste_kg / todayData.total_prepared_kg) * 100).toFixed(2))
      : 0;

    res.json({
      summary: {
        total_prepared_kg: todayData ? parseFloat(todayData.total_prepared_kg.toFixed(2)) : 0,
        total_served_kg: todayData ? parseFloat(todayData.total_served_kg.toFixed(2)) : 0,
        total_leftover_kg: todayData ? parseFloat(todayData.total_leftover_kg.toFixed(2)) : 0,
        total_discarded_kg: todayData ? parseFloat(todayData.total_discarded_kg.toFixed(2)) : 0,
        total_waste_kg: todayData ? parseFloat(todayData.total_waste_kg.toFixed(2)) : 0,
        total_co2_kg: todayData ? parseFloat(todayData.total_co2_kg.toFixed(4)) : 0,
        meals_logged: todayData ? todayData.meals_logged : 0,
        food_items_tracked: todayData ? todayData.food_items_tracked : 0,
        waste_percentage: wastePct,
        carbon_context: context,
        weekly_reduction_pct: reduction,
        total_waste_month_kg: monthData ? parseFloat(monthData.total_waste_month_kg.toFixed(2)) : 0,
        total_co2_month_kg: monthData ? parseFloat(monthData.total_co2_month_kg.toFixed(4)) : 0
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getWeekly(req, res, next) {
  try {
    const hostelId = req.query.hostel_id || null;
    const data = await reportModel.getWeeklyTotals(nDaysAgo(6), today(), hostelId);
    res.json({ weekly: data });
  } catch (err) {
    next(err);
  }
}

async function getByMeal(req, res, next) {
  try {
    const hostelId = req.query.hostel_id || null;
    const data = await reportModel.getByMealType(nDaysAgo(29), today(), hostelId);
    res.json({ by_meal: data });
  } catch (err) {
    next(err);
  }
}

async function getTopWasted(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 5;
    const hostelId = req.query.hostel_id || null;
    const data = await reportModel.getTopWasted(nDaysAgo(29), today(), limit, hostelId);
    res.json({ top_wasted: data });
  } catch (err) {
    next(err);
  }
}

async function getEmissionsTrend(req, res, next) {
  try {
    const hostelId = req.query.hostel_id || null;
    const data = await reportModel.getEmissionsTrend(nDaysAgo(29), today(), hostelId);
    res.json({ emissions_trend: data });
  } catch (err) {
    next(err);
  }
}

async function getHostelComparison(req, res, next) {
  try {
    const data = await reportModel.getHostelComparison(nDaysAgo(29), today());
    res.json({ hostel_comparison: data });
  } catch (err) {
    next(err);
  }
}

async function getCategoryBreakdown(req, res, next) {
  try {
    const hostelId = req.query.hostel_id || null;
    const data = await reportModel.getCategoryBreakdown(nDaysAgo(29), today(), hostelId);
    res.json({ category_breakdown: data });
  } catch (err) {
    next(err);
  }
}

async function getMonthlyTrends(req, res, next) {
  try {
    const year = req.query.year || new Date().getFullYear();
    const hostelId = req.query.hostel_id || null;
    const data = await reportModel.getMonthlyTrends(year, hostelId);
    res.json({ monthly_trends: data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary,
  getWeekly,
  getByMeal,
  getTopWasted,
  getEmissionsTrend,
  getHostelComparison,
  getCategoryBreakdown,
  getMonthlyTrends
};
