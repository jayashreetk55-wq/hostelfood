/**
 * reportModel.js — Complex aggregation queries (async/await)
 */
const db = require('../config/database');

function getTodaySummary(today) {
  return db.get(`
    SELECT
      COALESCE(SUM(we.quantity_wasted), 0)    AS total_waste_kg,
      COALESCE(SUM(we.carbon_emission_kg), 0) AS total_co2_kg,
      COUNT(DISTINCT mi.menu_id)              AS meals_logged
    FROM waste_entries we
    JOIN menu_items mi ON mi.id = we.menu_item_id
    JOIN menus       m ON  m.id = mi.menu_id
    WHERE m.date = ?
  `, [today]);
}

function getWeeklyTotals(startDate, endDate) {
  return db.all(`
    SELECT
      m.date,
      COALESCE(SUM(we.quantity_wasted), 0)    AS total_waste_kg,
      COALESCE(SUM(we.carbon_emission_kg), 0) AS total_co2_kg
    FROM menus m
    LEFT JOIN menu_items   mi ON mi.menu_id = m.id
    LEFT JOIN waste_entries we ON we.menu_item_id = mi.id
    WHERE m.date BETWEEN ? AND ?
    GROUP BY m.date
    ORDER BY m.date ASC
  `, [startDate, endDate]);
}

function getByMealType(startDate, endDate) {
  return db.all(`
    SELECT
      m.meal_type,
      COALESCE(SUM(we.quantity_wasted), 0)    AS total_waste_kg,
      COALESCE(SUM(we.carbon_emission_kg), 0) AS total_co2_kg,
      COUNT(we.id)                             AS entry_count
    FROM waste_entries we
    JOIN menu_items mi ON mi.id = we.menu_item_id
    JOIN menus       m ON  m.id = mi.menu_id
    WHERE m.date BETWEEN ? AND ?
    GROUP BY m.meal_type
    ORDER BY total_waste_kg DESC
  `, [startDate, endDate]);
}

function getTopWasted(startDate, endDate, limit = 5) {
  return db.all(`
    SELECT
      fi.name, fi.category, fi.unit,
      COALESCE(SUM(we.quantity_wasted), 0)    AS total_waste_kg,
      COALESCE(SUM(we.carbon_emission_kg), 0) AS total_co2_kg,
      COALESCE(AVG(we.waste_percentage), 0)   AS avg_waste_pct
    FROM waste_entries we
    JOIN menu_items mi ON mi.id = we.menu_item_id
    JOIN food_items fi ON fi.id = mi.food_item_id
    JOIN menus       m ON  m.id = mi.menu_id
    WHERE m.date BETWEEN ? AND ?
    GROUP BY fi.id
    ORDER BY total_waste_kg DESC
    LIMIT ?
  `, [startDate, endDate, limit]);
}

function getEmissionsTrend(startDate, endDate) {
  return db.all(`
    SELECT
      m.date,
      COALESCE(SUM(we.carbon_emission_kg), 0) AS total_co2_kg
    FROM menus m
    LEFT JOIN menu_items   mi ON mi.menu_id = m.id
    LEFT JOIN waste_entries we ON we.menu_item_id = mi.id
    WHERE m.date BETWEEN ? AND ?
    GROUP BY m.date
    ORDER BY m.date ASC
  `, [startDate, endDate]);
}

function getMonthlyReport(year, month) {
  const paddedMonth = String(month).padStart(2, '0');
  return db.all(`
    SELECT
      m.date, m.meal_type,
      fi.name AS food_name, fi.category, fi.unit,
      mi.quantity_planned,
      we.quantity_wasted, we.waste_percentage, we.carbon_emission_kg, we.notes
    FROM waste_entries we
    JOIN menu_items mi ON mi.id = we.menu_item_id
    JOIN food_items fi ON fi.id = mi.food_item_id
    JOIN menus       m ON  m.id = mi.menu_id
    WHERE m.date LIKE ?
    ORDER BY m.date, m.meal_type, fi.name
  `, [`${year}-${paddedMonth}%`]);
}

function getFoodItemStats(startDate, endDate) {
  return db.all(`
    SELECT
      fi.id, fi.name, fi.category, fi.unit, fi.emission_factor,
      COALESCE(SUM(we.quantity_wasted), 0)    AS total_waste_kg,
      COALESCE(SUM(we.carbon_emission_kg), 0) AS total_co2_kg,
      COALESCE(AVG(we.waste_percentage), 0)   AS avg_waste_pct,
      COUNT(we.id)                             AS times_wasted
    FROM food_items fi
    LEFT JOIN menu_items   mi ON mi.food_item_id = fi.id
    LEFT JOIN menus         m ON  m.id = mi.menu_id AND m.date BETWEEN ? AND ?
    LEFT JOIN waste_entries we ON we.menu_item_id = mi.id
    GROUP BY fi.id
    ORDER BY total_waste_kg DESC
  `, [startDate, endDate]);
}

module.exports = {
  getTodaySummary,
  getWeeklyTotals,
  getByMealType,
  getTopWasted,
  getEmissionsTrend,
  getMonthlyReport,
  getFoodItemStats
};
