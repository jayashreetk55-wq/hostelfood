/**
 * reportModel.js — Complex aggregation queries with SIT Hostel filtering (async/await)
 */
const db = require('../config/database');

function buildHostelFilter(hostelId, paramArray) {
  if (hostelId && hostelId !== 'all') {
    paramArray.push(hostelId);
    return ` AND hostel_id = ? `;
  }
  return '';
}

function getTodaySummary(today, hostelId = null) {
  const params = [today];
  const hostelClause = buildHostelFilter(hostelId, params);

  return db.get(`
    SELECT
      COALESCE(SUM(quantity_prepared), 0)   AS total_prepared_kg,
      COALESCE(SUM(quantity_served), 0)     AS total_served_kg,
      COALESCE(SUM(quantity_leftover), 0)   AS total_leftover_kg,
      COALESCE(SUM(quantity_discarded), 0)  AS total_discarded_kg,
      COALESCE(SUM(total_waste_kg), 0)      AS total_waste_kg,
      COALESCE(SUM(carbon_emission_kg), 0)  AS total_co2_kg,
      COUNT(DISTINCT record_date || '_' || meal_type || '_' || hostel_id) AS meals_logged,
      COUNT(DISTINCT food_name)             AS food_items_tracked
    FROM food_records
    WHERE record_date = ? ${hostelClause}
  `, params);
}

function getMonthSummary(yearMonth, hostelId = null) {
  const params = [`${yearMonth}%`];
  const hostelClause = buildHostelFilter(hostelId, params);

  return db.get(`
    SELECT
      COALESCE(SUM(total_waste_kg), 0)     AS total_waste_month_kg,
      COALESCE(SUM(carbon_emission_kg), 0) AS total_co2_month_kg
    FROM food_records
    WHERE record_date LIKE ? ${hostelClause}
  `, params);
}

function getWeeklyTotals(startDate, endDate, hostelId = null) {
  const params = [startDate, endDate];
  const hostelClause = buildHostelFilter(hostelId, params);

  return db.all(`
    SELECT
      record_date AS date,
      COALESCE(SUM(quantity_prepared), 0)  AS total_prepared_kg,
      COALESCE(SUM(total_waste_kg), 0)     AS total_waste_kg,
      COALESCE(SUM(carbon_emission_kg), 0) AS total_co2_kg
    FROM food_records
    WHERE record_date BETWEEN ? AND ? ${hostelClause}
    GROUP BY record_date
    ORDER BY record_date ASC
  `, params);
}

function getByMealType(startDate, endDate, hostelId = null) {
  const params = [startDate, endDate];
  const hostelClause = buildHostelFilter(hostelId, params);

  return db.all(`
    SELECT
      meal_type,
      COALESCE(SUM(total_waste_kg), 0)     AS total_waste_kg,
      COALESCE(SUM(carbon_emission_kg), 0) AS total_co2_kg,
      COUNT(id)                            AS entry_count
    FROM food_records
    WHERE record_date BETWEEN ? AND ? ${hostelClause}
    GROUP BY meal_type
    ORDER BY total_waste_kg DESC
  `, params);
}

function getTopWasted(startDate, endDate, limit = 5, hostelId = null) {
  const params = [startDate, endDate];
  const hostelClause = buildHostelFilter(hostelId, params);
  params.push(limit);

  return db.all(`
    SELECT
      food_name AS name,
      category,
      unit,
      COALESCE(SUM(total_waste_kg), 0)     AS total_waste_kg,
      COALESCE(SUM(carbon_emission_kg), 0) AS total_co2_kg,
      COUNT(id)                            AS times_recorded
    FROM food_records
    WHERE record_date BETWEEN ? AND ? ${hostelClause}
    GROUP BY food_name
    ORDER BY total_waste_kg DESC
    LIMIT ?
  `, params);
}

function getEmissionsTrend(startDate, endDate, hostelId = null) {
  const params = [startDate, endDate];
  const hostelClause = buildHostelFilter(hostelId, params);

  return db.all(`
    SELECT
      record_date AS date,
      COALESCE(SUM(total_waste_kg), 0)     AS total_waste_kg,
      COALESCE(SUM(carbon_emission_kg), 0) AS total_co2_kg
    FROM food_records
    WHERE record_date BETWEEN ? AND ? ${hostelClause}
    GROUP BY record_date
    ORDER BY record_date ASC
  `, params);
}

function getHostelComparison(startDate, endDate) {
  return db.all(`
    SELECT
      h.id AS hostel_id,
      h.name AS hostel_name,
      h.block_type,
      h.capacity,
      COALESCE(SUM(fr.total_waste_kg), 0)     AS total_waste_kg,
      COALESCE(SUM(fr.carbon_emission_kg), 0) AS total_co2_kg,
      COUNT(fr.id)                            AS total_records
    FROM hostels h
    LEFT JOIN food_records fr ON fr.hostel_id = h.id AND fr.record_date BETWEEN ? AND ?
    GROUP BY h.id
    ORDER BY total_waste_kg DESC
  `, [startDate, endDate]);
}

function getCategoryBreakdown(startDate, endDate, hostelId = null) {
  const params = [startDate, endDate];
  const hostelClause = buildHostelFilter(hostelId, params);

  return db.all(`
    SELECT
      category,
      COALESCE(SUM(total_waste_kg), 0)     AS total_waste_kg,
      COALESCE(SUM(carbon_emission_kg), 0) AS total_co2_kg,
      COUNT(id)                            AS item_count
    FROM food_records
    WHERE record_date BETWEEN ? AND ? ${hostelClause}
    GROUP BY category
    ORDER BY total_co2_kg DESC
  `, params);
}

function getMonthlyTrends(year, hostelId = null) {
  const params = [`${year}-%`];
  const hostelClause = buildHostelFilter(hostelId, params);

  return db.all(`
    SELECT
      strftime('%Y-%m', record_date)       AS month,
      COALESCE(SUM(quantity_prepared), 0)  AS total_prepared_kg,
      COALESCE(SUM(total_waste_kg), 0)     AS total_waste_kg,
      COALESCE(SUM(carbon_emission_kg), 0) AS total_co2_kg
    FROM food_records
    WHERE record_date LIKE ? ${hostelClause}
    GROUP BY month
    ORDER BY month ASC
  `, params);
}

function getMonthlyReport(year, month, hostelId = null) {
  const paddedMonth = String(month).padStart(2, '0');
  const params = [`${year}-${paddedMonth}%`];
  const hostelClause = buildHostelFilter(hostelId, params);

  return db.all(`
    SELECT
      record_date AS date,
      record_time AS time,
      hostel_name,
      mess_name,
      meal_type,
      food_name,
      category,
      quantity_prepared,
      quantity_served,
      quantity_leftover,
      quantity_discarded,
      unit,
      total_waste_kg,
      carbon_emission_kg,
      reason,
      remarks
    FROM food_records
    WHERE record_date LIKE ? ${hostelClause}
    ORDER BY record_date DESC, meal_type, food_name
  `, params);
}

function getDailyDetailedReport(date, hostelId = null) {
  const params = [date];
  const hostelClause = buildHostelFilter(hostelId, params);

  return db.all(`
    SELECT
      id,
      record_date AS date,
      record_time AS time,
      hostel_id,
      hostel_name,
      mess_name,
      meal_type,
      food_name,
      category,
      quantity_prepared,
      quantity_served,
      quantity_leftover,
      quantity_discarded,
      unit,
      total_waste_kg,
      emission_factor,
      factor_source,
      carbon_emission_kg,
      reason,
      remarks
    FROM food_records
    WHERE record_date = ? ${hostelClause}
    ORDER BY record_time DESC, meal_type, food_name
  `, params);
}

function getWeeklyDetailedReport(startDate, endDate, hostelId = null) {
  const params = [startDate, endDate];
  const hostelClause = buildHostelFilter(hostelId, params);

  return db.all(`
    SELECT
      record_date AS date,
      COUNT(id)                               AS record_count,
      COALESCE(SUM(quantity_prepared), 0)    AS total_prepared_kg,
      COALESCE(SUM(quantity_served), 0)      AS total_served_kg,
      COALESCE(SUM(quantity_leftover), 0)    AS total_leftover_kg,
      COALESCE(SUM(quantity_discarded), 0)   AS total_discarded_kg,
      COALESCE(SUM(total_waste_kg), 0)       AS total_waste_kg,
      COALESCE(SUM(carbon_emission_kg), 0)   AS total_co2_kg
    FROM food_records
    WHERE record_date BETWEEN ? AND ? ${hostelClause}
    GROUP BY record_date
    ORDER BY record_date ASC
  `, params);
}

function getSemesterDetailedReport(startDate, endDate, hostelId = null) {
  const params = [startDate, endDate];
  const hostelClause = buildHostelFilter(hostelId, params);

  return db.all(`
    SELECT
      strftime('%Y-%m', record_date)         AS month,
      COUNT(id)                               AS record_count,
      COALESCE(SUM(quantity_prepared), 0)    AS total_prepared_kg,
      COALESCE(SUM(quantity_served), 0)      AS total_served_kg,
      COALESCE(SUM(quantity_leftover), 0)    AS total_leftover_kg,
      COALESCE(SUM(quantity_discarded), 0)   AS total_discarded_kg,
      COALESCE(SUM(total_waste_kg), 0)       AS total_waste_kg,
      COALESCE(SUM(carbon_emission_kg), 0)   AS total_co2_kg
    FROM food_records
    WHERE record_date BETWEEN ? AND ? ${hostelClause}
    GROUP BY strftime('%Y-%m', record_date)
    ORDER BY month ASC
  `, params);
}

function getHostelWiseDetailedReport(startDate, endDate) {
  return db.all(`
    SELECT
      h.id AS hostel_id,
      h.name AS hostel_name,
      h.block_type,
      h.block_type AS category,
      h.capacity,
      COALESCE(SUM(fr.quantity_prepared), 0)    AS total_prepared_kg,
      COALESCE(SUM(fr.quantity_served), 0)      AS total_served_kg,
      COALESCE(SUM(fr.quantity_leftover), 0)    AS total_leftover_kg,
      COALESCE(SUM(fr.quantity_discarded), 0)   AS total_discarded_kg,
      COALESCE(SUM(fr.total_waste_kg), 0)       AS total_waste_kg,
      COALESCE(SUM(fr.carbon_emission_kg), 0)   AS total_co2_kg,
      COUNT(fr.id)                              AS record_count,
      ROUND(COALESCE(SUM(fr.total_waste_kg), 0) / NULLIF(h.capacity, 0), 2) AS waste_per_student_kg
    FROM hostels h
    LEFT JOIN food_records fr ON fr.hostel_id = h.id AND fr.record_date BETWEEN ? AND ?
    GROUP BY h.id
    ORDER BY total_waste_kg DESC
  `, [startDate, endDate]);
}

function getMealWiseDetailedReport(startDate, endDate, hostelId = null) {
  const params = [startDate, endDate];
  const hostelClause = buildHostelFilter(hostelId, params);

  return db.all(`
    SELECT
      meal_type,
      COUNT(id)                               AS record_count,
      COALESCE(SUM(quantity_prepared), 0)    AS total_prepared_kg,
      COALESCE(SUM(quantity_served), 0)      AS total_served_kg,
      COALESCE(SUM(quantity_leftover), 0)    AS total_leftover_kg,
      COALESCE(SUM(quantity_discarded), 0)   AS total_discarded_kg,
      COALESCE(SUM(total_waste_kg), 0)       AS total_waste_kg,
      COALESCE(SUM(carbon_emission_kg), 0)   AS total_co2_kg
    FROM food_records
    WHERE record_date BETWEEN ? AND ? ${hostelClause}
    GROUP BY meal_type
    ORDER BY total_waste_kg DESC
  `, params);
}

function getDetailedRecordsForExport({ startDate, endDate, hostelId, mealType } = {}) {
  let sql = `
    SELECT
      record_date AS date,
      record_time AS time,
      hostel_name,
      mess_name,
      meal_type,
      food_name,
      category,
      quantity_prepared,
      quantity_served,
      quantity_leftover,
      quantity_discarded,
      unit,
      total_waste_kg,
      carbon_emission_kg,
      emission_factor,
      factor_source,
      reason,
      remarks
    FROM food_records
    WHERE 1=1
  `;
  const params = [];
  if (startDate) {
    sql += ` AND record_date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    sql += ` AND record_date <= ?`;
    params.push(endDate);
  }
  if (hostelId && hostelId !== 'all') {
    sql += ` AND hostel_id = ?`;
    params.push(hostelId);
  }
  if (mealType && mealType !== 'all') {
    sql += ` AND meal_type = ?`;
    params.push(mealType);
  }
  sql += ` ORDER BY record_date DESC, record_time DESC`;
  return db.all(sql, params);
}

function getFoodItemStats(startDate, endDate) {
  return db.all(`
    SELECT
      food_name AS name,
      category,
      unit,
      COALESCE(SUM(total_waste_kg), 0)     AS total_waste_kg,
      COALESCE(SUM(carbon_emission_kg), 0) AS total_co2_kg,
      AVG(emission_factor)                 AS emission_factor,
      COUNT(id)                            AS times_recorded
    FROM food_records
    WHERE record_date BETWEEN ? AND ?
    GROUP BY food_name
    ORDER BY total_waste_kg DESC
  `, [startDate, endDate]);
}

module.exports = {
  getTodaySummary,
  getMonthSummary,
  getWeeklyTotals,
  getByMealType,
  getTopWasted,
  getEmissionsTrend,
  getHostelComparison,
  getCategoryBreakdown,
  getMonthlyTrends,
  getMonthlyReport,
  getFoodItemStats,
  getDailyDetailedReport,
  getWeeklyDetailedReport,
  getSemesterDetailedReport,
  getHostelWiseDetailedReport,
  getMealWiseDetailedReport,
  getDetailedRecordsForExport
};
