/**
 * foodRecordController.js — Controller for manual food records
 */
const foodRecordModel = require('../models/foodRecordModel');
const hostelModel = require('../models/hostelModel');

async function listRecords(req, res, next) {
  try {
    const filters = {
      hostel_id: req.query.hostel_id,
      meal_type: req.query.meal_type,
      date: req.query.date,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit || 100
    };
    const records = await foodRecordModel.getAll(filters);
    res.json({ records });
  } catch (err) {
    next(err);
  }
}

async function getRecord(req, res, next) {
  try {
    const record = await foodRecordModel.getById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Food record not found.' });
    res.json({ record });
  } catch (err) {
    next(err);
  }
}

function validateRecordFields(body) {
  if (!body.record_date) return 'Date is required.';
  if (!body.hostel_id) return 'Hostel selection is required.';
  if (!body.meal_type) return 'Meal type is required.';
  if (!body.food_name || !body.food_name.trim()) return 'Food item name is required.';

  const validMeals = ['breakfast', 'lunch', 'evening_snacks', 'dinner'];
  if (!validMeals.includes(body.meal_type.toLowerCase())) {
    return 'Invalid meal type. Allowed: Breakfast, Lunch, Evening Snacks, Dinner.';
  }

  const validUnits = ['kg', 'g', 'litres', 'ml', 'pieces'];
  const unit = (body.unit || 'kg').toLowerCase();
  if (!validUnits.includes(unit)) {
    return 'Invalid unit. Allowed: kg, g, litres, ml, pieces.';
  }

  const numFields = ['quantity_prepared', 'quantity_served', 'quantity_leftover', 'quantity_discarded'];
  for (const f of numFields) {
    if (body[f] !== undefined && body[f] !== null && body[f] !== '') {
      const val = parseFloat(body[f]);
      if (isNaN(val) || val < 0) {
        return `${f.replace('quantity_', '')} quantity cannot be negative.`;
      }
    }
  }

  return null;
}

async function createRecord(req, res, next) {
  try {
    const error = validateRecordFields(req.body);
    if (error) return res.status(400).json({ error });

    // Populate hostel name if missing
    let hostelName = req.body.hostel_name;
    let messName = req.body.mess_name;
    if (!hostelName || !messName) {
      const hostel = await hostelModel.getById(req.body.hostel_id);
      if (hostel) {
        hostelName = hostel.name;
        messName = hostel.mess_name;
      }
    }

    const record = await foodRecordModel.create({
      ...req.body,
      hostel_name: hostelName,
      mess_name: messName,
      logged_by: req.session ? req.session.userId : 1
    });

    res.status(201).json({
      message: 'Food record saved successfully.',
      record
    });
  } catch (err) {
    next(err);
  }
}

async function createBatchRecords(req, res, next) {
  try {
    const { common, items } = req.body;
    if (!common || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Please provide meal details and at least one food item.' });
    }

    // Populate hostel name
    let hostelName = common.hostel_name;
    let messName = common.mess_name;
    if (!hostelName || !messName) {
      const hostel = await hostelModel.getById(common.hostel_id);
      if (hostel) {
        hostelName = hostel.name;
        messName = hostel.mess_name;
      }
    }

    const createdRecords = [];
    for (const it of items) {
      const merged = { ...common, ...it, hostel_name: hostelName, mess_name: messName };
      const err = validateRecordFields(merged);
      if (err) return res.status(400).json({ error: `Item '${it.food_name || 'unnamed'}': ${err}` });

      const record = await foodRecordModel.create({
        ...merged,
        logged_by: req.session ? req.session.userId : 1
      });
      createdRecords.push(record);
    }

    res.status(201).json({
      message: `Successfully saved ${createdRecords.length} food record(s).`,
      records: createdRecords
    });
  } catch (err) {
    next(err);
  }
}

async function updateRecord(req, res, next) {
  try {
    const existing = await foodRecordModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Food record not found.' });

    const merged = { ...existing, ...req.body };
    const error = validateRecordFields(merged);
    if (error) return res.status(400).json({ error });

    const updated = await foodRecordModel.update(req.params.id, req.body);
    res.json({
      message: 'Food record updated successfully.',
      record: updated
    });
  } catch (err) {
    next(err);
  }
}

async function deleteRecord(req, res, next) {
  try {
    const existing = await foodRecordModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Food record not found.' });

    await foodRecordModel.remove(req.params.id);
    res.json({ message: 'Food record deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listRecords,
  getRecord,
  createRecord,
  createBatchRecords,
  updateRecord,
  deleteRecord
};
