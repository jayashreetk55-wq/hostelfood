-- ============================================================
-- College Hostel Food Waste Tracker — Database Schema
-- ============================================================

-- Users table: manages authentication and roles
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER  PRIMARY KEY AUTOINCREMENT,
  name         TEXT     NOT NULL,
  email        TEXT     NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role         TEXT     NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin', 'manager', 'viewer')),
  created_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Food items master list with emission factors
CREATE TABLE IF NOT EXISTS food_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL UNIQUE,
  category        TEXT    NOT NULL,
  unit            TEXT    NOT NULL DEFAULT 'kg',
  emission_factor REAL    NOT NULL DEFAULT 1.0,
  created_at      DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Daily menus: one per meal_type per date
CREATE TABLE IF NOT EXISTS menus (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  date        DATE     NOT NULL,
  meal_type   TEXT     NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner')),
  created_by  INTEGER  NOT NULL REFERENCES users(id),
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  UNIQUE(date, meal_type)
);

-- Items in each menu (what was planned to be cooked)
CREATE TABLE IF NOT EXISTS menu_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id          INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  food_item_id     INTEGER NOT NULL REFERENCES food_items(id),
  quantity_planned REAL    NOT NULL CHECK(quantity_planned > 0)
);

-- Actual waste logged after each meal
CREATE TABLE IF NOT EXISTS waste_entries (
  id                INTEGER  PRIMARY KEY AUTOINCREMENT,
  menu_item_id      INTEGER  NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity_wasted   REAL     NOT NULL CHECK(quantity_wasted >= 0),
  waste_percentage  REAL     NOT NULL,
  carbon_emission_kg REAL   NOT NULL,
  logged_by         INTEGER  NOT NULL REFERENCES users(id),
  logged_at         DATETIME NOT NULL DEFAULT (datetime('now')),
  notes             TEXT
);
