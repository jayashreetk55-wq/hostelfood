/**
 * hostelModel.js — DB queries for hostels and messes master tables
 */
const db = require('../config/database');

function getAll() {
  return db.all(`SELECT * FROM hostels ORDER BY id ASC`);
}

function getById(id) {
  return db.get(`SELECT * FROM hostels WHERE id = ?`, [id]);
}

function getMesses() {
  return db.all(`SELECT m.*, h.name as hostel_name FROM messes m JOIN hostels h ON h.id = m.hostel_id ORDER BY m.id ASC`);
}

module.exports = {
  getAll,
  getById,
  getMesses
};
