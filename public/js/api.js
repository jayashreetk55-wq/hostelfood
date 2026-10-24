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

  // Menus
  getMenus:       (q = '')           => request('GET',    `/menus${q}`),
  getMenu:        (id)               => request('GET',    `/menus/${id}`),
  createMenu:     (body)             => request('POST',   '/menus', body),
  deleteMenu:     (id)               => request('DELETE', `/menus/${id}`),
  addMenuItem:    (menuId, body)     => request('POST',   `/menus/${menuId}/items`, body),
  removeMenuItem: (menuId, itemId)   => request('DELETE', `/menus/${menuId}/items/${itemId}`),

  // Waste
  getWaste:       (q = '')           => request('GET',    `/waste${q}`),
  createWaste:    (body)             => request('POST',   '/waste', body),
  updateWaste:    (id, body)         => request('PUT',    `/waste/${id}`, body),
  deleteWaste:    (id)               => request('DELETE', `/waste/${id}`),

  // Dashboard
  getSummary:        () => request('GET', '/dashboard/summary'),
  getWeekly:         () => request('GET', '/dashboard/weekly'),
  getByMeal:         () => request('GET', '/dashboard/by-meal'),
  getTopWasted:      (limit = 5) => request('GET', `/dashboard/top-wasted?limit=${limit}`),
  getEmissionsTrend: () => request('GET', '/dashboard/emissions-trend'),

  // Reports
  getDailyReport:   (date)          => request('GET', `/reports/daily?date=${date}`),
  getMonthlyReport: (year, month)   => request('GET', `/reports/monthly?year=${year}&month=${month}`),
  getFoodItemStats: (s = '', e = '') => request('GET', `/reports/food-items?startDate=${s}&endDate=${e}`),

  // Settings
  getFoodItems:   ()     => request('GET',    '/settings/food-items'),
  createFoodItem: (body) => request('POST',   '/settings/food-items', body),
  updateFoodItem: (id, body) => request('PUT','/settings/food-items/' + id, body),
  deleteFoodItem: (id)   => request('DELETE', '/settings/food-items/' + id),
};

window.api = api;
