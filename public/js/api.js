/**
 * api.js — Centralised fetch() wrapper
 * All API calls go through here so auth headers and error handling are consistent.
 */

const BASE = '/api';

async function request(method, path, body = null) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    throw new Error(data.error || 'Unauthorized');
  }

  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const api = {
  // Auth
  login:   (body) => request('POST', '/auth/login', body),
  logout:  ()     => request('POST', '/auth/logout'),
  me:      ()     => request('GET',  '/auth/me'),

  // Hostels & Messes
  getHostels: () => request('GET', '/hostels'),
  getMesses:  () => request('GET', '/hostels/messes'),

  // Manual Food Records (Unified Entry System)
  getFoodRecords:      (q = '')           => request('GET',    `/food-records${q}`),
  getFoodRecord:       (id)               => request('GET',    `/food-records/${id}`),
  createFoodRecord:    (body)             => request('POST',   '/food-records', body),
  createBatchRecords:  (body)             => request('POST',   '/food-records/batch', body),
  updateFoodRecord:    (id, body)         => request('PUT',    `/food-records/${id}`, body),
  deleteFoodRecord:    (id)               => request('DELETE', `/food-records/${id}`),

  // Carbon Footprint Calculator
  calculateCarbon:       (body)   => request('POST',   '/carbon-calculator/calculate', body),
  saveCarbonCalculation: (body)   => request('POST',   '/carbon-calculator/save', body),
  getCarbonHistory:      (q = '') => request('GET',    `/carbon-calculator/history${q}`),
  deleteCarbonHistory:   (id)     => request('DELETE', `/carbon-calculator/history/${id}`),

  // Menus (Legacy / Structured)
  getMenus:       (q = '')           => request('GET',    `/menus${q}`),
  getMenu:        (id)               => request('GET',    `/menus/${id}`),
  createMenu:     (body)             => request('POST',   '/menus', body),
  updateMenu:     (id, body)         => request('PUT',    `/menus/${id}`, body),
  deleteMenu:     (id)               => request('DELETE', `/menus/${id}`),
  addMenuItem:    (menuId, body)     => request('POST',   `/menus/${menuId}/items`, body),
  updateMenuItem: (menuId, itemId, b)=> request('PUT',    `/menus/${menuId}/items/${itemId}`, b),
  removeMenuItem: (menuId, itemId)   => request('DELETE', `/menus/${menuId}/items/${itemId}`),

  // Waste (Legacy)
  getWaste:       (q = '')           => request('GET',    `/waste${q}`),
  createWaste:    (body)             => request('POST',   '/waste', body),
  updateWaste:    (id, body)         => request('PUT',    `/waste/${id}`, body),
  deleteWaste:    (id)               => request('DELETE', `/waste/${id}`),

  // Dashboard (Supports hostel_id filter)
  getSummary:          (hostelId = '') => request('GET', `/dashboard/summary${hostelId ? '?hostel_id=' + hostelId : ''}`),
  getWeekly:           (hostelId = '') => request('GET', `/dashboard/weekly${hostelId ? '?hostel_id=' + hostelId : ''}`),
  getByMeal:           (hostelId = '') => request('GET', `/dashboard/by-meal${hostelId ? '?hostel_id=' + hostelId : ''}`),
  getTopWasted:        (limit = 5, hostelId = '') => request('GET', `/dashboard/top-wasted?limit=${limit}${hostelId ? '&hostel_id=' + hostelId : ''}`),
  getEmissionsTrend:   (hostelId = '') => request('GET', `/dashboard/emissions-trend${hostelId ? '?hostel_id=' + hostelId : ''}`),
  getHostelComparison: () => request('GET', '/dashboard/hostel-comparison'),
  getCategoryBreakdown:(hostelId = '') => request('GET', `/dashboard/category-breakdown${hostelId ? '?hostel_id=' + hostelId : ''}`),
  getMonthlyTrends:    (year = '', hostelId = '') => request('GET', `/dashboard/monthly-trends?year=${year}${hostelId ? '&hostel_id=' + hostelId : ''}`),

  // Reports
  getDailyReport:      (date, hostelId = '')                     => request('GET', `/reports/daily?date=${date}${hostelId ? '&hostel_id=' + hostelId : ''}`),
  getWeeklyReport:     (startDate = '', endDate = '', hostelId = '') => request('GET', `/reports/weekly?startDate=${startDate}&endDate=${endDate}${hostelId ? '&hostel_id=' + hostelId : ''}`),
  getMonthlyReport:    (year, month, hostelId = '')              => request('GET', `/reports/monthly?year=${year}&month=${month}${hostelId ? '&hostel_id=' + hostelId : ''}`),
  getSemesterReport:   (academicYear = '', semester = '', hostelId = '') => request('GET', `/reports/semester?academic_year=${academicYear}&semester=${semester}${hostelId ? '&hostel_id=' + hostelId : ''}`),
  getHostelWiseReport: (startDate = '', endDate = '')            => request('GET', `/reports/hostel-wise?startDate=${startDate}&endDate=${endDate}`),
  getMealWiseReport:   (startDate = '', endDate = '', hostelId = '') => request('GET', `/reports/meal-wise?startDate=${startDate}&endDate=${endDate}${hostelId ? '&hostel_id=' + hostelId : ''}`),
  getFoodItemStats:    (s = '', e = '')                          => request('GET', `/reports/food-items?startDate=${s}&endDate=${e}`),

  // Settings: Food Items Management
  getFoodItems:   ()         => request('GET',    '/settings/food-items'),
  createFoodItem: (body)     => request('POST',   '/settings/food-items', body),
  updateFoodItem: (id, body) => request('PUT',    '/settings/food-items/' + id, body),
  deleteFoodItem: (id)       => request('DELETE', '/settings/food-items/' + id),
};

window.api = api;
