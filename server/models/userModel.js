/**
 * userModel.js — DB queries for the users table (async/await)
 */
const db = require('../config/database');

function findByEmail(email) {
  return db.get(`SELECT * FROM users WHERE email = ?`, [email]);
}

function findById(id) {
  return db.get(
    `SELECT id, name, email, role, created_at FROM users WHERE id = ?`, [id]
  );
}

function getAll() {
  return db.all(
    `SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC`
  );
}

module.exports = { findByEmail, findById, getAll };
