/**
 * database.js
 * Opens the SQLite database using the 'sqlite3' package (async, callback-based).
 * We wrap it in Promises for cleaner usage throughout models.
 */
const sqlite3 = require('sqlite3').verbose();
const path    = require('path');
const fs      = require('fs');

const DB_DIR  = path.join(__dirname, '../db');
const DB_PATH = path.join(DB_DIR, 'database.sqlite');

// Ensure db/ folder exists
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) { console.error('❌ Cannot open database:', err.message); process.exit(1); }
});

// Enable foreign keys and WAL mode
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode = WAL');
});

// ── Promisified helpers ───────────────────────────────────

/** Run an INSERT/UPDATE/DELETE and return { lastID, changes } */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/** Fetch a single row */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

/** Fetch all matching rows */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/** Execute multiple statements (for schema migration) */
function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = { db, run, get, all, exec };
