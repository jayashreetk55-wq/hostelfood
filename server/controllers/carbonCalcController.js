/**
 * carbonCalcController.js — Real-Time Carbon Footprint Calculator
 */
const carbonCalcModel = require('../models/carbonCalcModel');
const foodItemModel = require('../models/foodItemModel');
const hostelModel = require('../models/hostelModel');
const { calculateCO2eWithDetails } = require('../utils/emissionCalculator');

async function calculate(req, res, next) {
  try {
    const { quantity, unit, food_item_id, food_name, emission_factor, factor_source } = req.body;

    if (quantity === undefined || quantity === null || quantity === '') {
      return res.status(400).json({ error: 'Please enter a wasted quantity.' });
    }

    let item = null;
    if (food_item_id) {
      item = await foodItemModel.getById(food_item_id);
    } else if (food_name) {
      item = await foodItemModel.getByName(food_name);
    }

    const ef = emission_factor !== undefined && emission_factor !== ''
      ? parseFloat(emission_factor)
      : (item ? item.emission_factor : null);

    const source = factor_source || (item ? item.source : 'IPCC / FAO Life-Cycle Assessment');

    const result = calculateCO2eWithDetails({
      quantity,
      unit: unit || (item ? item.unit : 'kg'),
      emissionFactor: ef,
      factorSource: source,
      itemDetails: item || { name: food_name }
    });

    res.json({
      calculation: result,
      food_item: item
    });
  } catch (err) {
    next(err);
  }
}

async function saveCalculation(req, res, next) {
  try {
    const {
      hostel_id,
      calculation_date,
      meal_type,
      food_item_id,
      food_name,
      category,
      wasted_quantity,
      unit,
      emission_factor,
      factor_source
    } = req.body;

    if (!hostel_id) return res.status(400).json({ error: 'Please select a hostel.' });
    if (!calculation_date) return res.status(400).json({ error: 'Please select a date.' });
    if (!meal_type) return res.status(400).json({ error: 'Please select a meal.' });
    if (!wasted_quantity || parseFloat(wasted_quantity) < 0) {
      return res.status(400).json({ error: 'Please enter a valid positive wasted quantity.' });
    }

    let item = null;
    if (food_item_id) item = await foodItemModel.getById(food_item_id);
    else if (food_name) item = await foodItemModel.getByName(food_name);

    const name = food_name || (item ? item.name : 'Unknown Item');
    const cat = category || (item ? item.category : 'Other');
    const u = unit || (item ? item.unit : 'kg');
    const ef = parseFloat(emission_factor) || (item ? item.emission_factor : 1.0);
    const src = factor_source || (item ? item.source : 'IPCC / FAO');

    const result = calculateCO2eWithDetails({
      quantity: wasted_quantity,
      unit: u,
      emissionFactor: ef,
      factorSource: src,
      itemDetails: item || { name }
    });

    if (!result.available) {
      return res.status(400).json({ error: `Calculation unavailable: ${result.reason}` });
    }

    const hostel = await hostelModel.getById(hostel_id);
    const hostelName = hostel ? hostel.name : 'SIT Hostel';

    const saved = await carbonCalcModel.create({
      hostel_id,
      hostel_name: hostelName,
      calculation_date,
      meal_type,
      food_item_id: food_item_id || null,
      food_name: name,
      category: cat,
      wasted_quantity: parseFloat(wasted_quantity),
      unit: u,
      converted_kg: result.converted_kg,
      conversion_notes: result.conversion_steps,
      emission_factor: result.emission_factor,
      factor_source: result.factor_source,
      carbon_emission_kg: result.carbon_emission_kg
    });

    res.status(201).json({
      message: 'Carbon footprint calculation saved to history.',
      record: saved,
      details: result
    });
  } catch (err) {
    next(err);
  }
}

async function listHistory(req, res, next) {
  try {
    const filters = {
      hostel_id: req.query.hostel_id,
      date: req.query.date,
      meal_type: req.query.meal_type,
      limit: req.query.limit || 50
    };
    const history = await carbonCalcModel.getAll(filters);
    res.json({ history });
  } catch (err) {
    next(err);
  }
}

async function deleteHistory(req, res, next) {
  try {
    const record = await carbonCalcModel.getById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Calculation record not found.' });

    await carbonCalcModel.remove(req.params.id);
    res.json({ message: 'Calculation removed from history.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  calculate,
  saveCalculation,
  listHistory,
  deleteHistory
};
