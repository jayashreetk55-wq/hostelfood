/**
 * hostelController.js — Endpoints for SIT Hostels & Messes
 */
const hostelModel = require('../models/hostelModel');

async function listHostels(req, res, next) {
  try {
    const hostels = await hostelModel.getAll();
    res.json({ hostels });
  } catch (err) {
    next(err);
  }
}

async function getHostel(req, res, next) {
  try {
    const hostel = await hostelModel.getById(req.params.id);
    if (!hostel) return res.status(404).json({ error: 'Hostel not found.' });
    res.json({ hostel });
  } catch (err) {
    next(err);
  }
}

async function listMesses(req, res, next) {
  try {
    const messes = await hostelModel.getMesses();
    res.json({ messes });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listHostels,
  getHostel,
  listMesses
};
