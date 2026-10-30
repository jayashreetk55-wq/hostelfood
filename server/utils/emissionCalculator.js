/**
 * emissionCalculator.js
 * Comprehensive calculations for food waste, multi-unit conversions,
 * carbon emissions (kg CO2e), and environmental impact equivalents.
 */

/**
 * Calculate the percentage of food wasted relative to what was planned/prepared.
 */
function calcWastePercentage(quantityWasted, quantityPlanned) {
  if (!quantityPlanned || quantityPlanned <= 0) return 0;
  const pct = (quantityWasted / quantityPlanned) * 100;
  return Math.min(parseFloat(pct.toFixed(2)), 100);
}

/**
 * Calculate carbon emission from wasted food in kg.
 */
function calcCarbonEmission(quantityWasted, emissionFactor) {
  if (!quantityWasted || !emissionFactor) return 0;
  return parseFloat((quantityWasted * emissionFactor).toFixed(4));
}

/**
 * Generate human-readable context for a given CO2 amount.
 */
function getCarbonContext(co2Kg) {
  if (co2Kg >= 100) {
    return {
      level: 'high',
      icon: '🔴',
      message: `High — equivalent to driving a car ~${Math.round(co2Kg * 4.1)} km`
    };
  } else if (co2Kg >= 50) {
    return {
      level: 'medium',
      icon: '🟠',
      message: `Medium — equivalent to charging ~${Math.round(co2Kg * 50)} smartphones`
    };
  } else {
    return {
      level: 'low',
      icon: '🟢',
      message: `Low — great job keeping waste minimal today!`
    };
  }
}

/**
 * Calculate weekly waste reduction percentage.
 */
function calcWeeklyReduction(lastWeekWaste, thisWeekWaste) {
  if (!lastWeekWaste || lastWeekWaste === 0) return 0;
  const change = ((lastWeekWaste - thisWeekWaste) / lastWeekWaste) * 100;
  return parseFloat(change.toFixed(1));
}

/**
 * Convert any supported unit to kilograms based on food-specific density and piece weight.
 * @param {number} quantity - Raw quantity
 * @param {string} unit - 'kg', 'g', 'litres', 'ml', 'pieces'
 * @param {object} itemDetails - { density_kg_per_l, weight_per_piece_kg, name }
 * @returns {{ success: boolean, kg: number, steps: string, error?: string }}
 */
function convertToKg(quantity, unit, itemDetails = {}) {
  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty < 0) {
    return { success: false, kg: 0, steps: 'Invalid quantity', error: 'Quantity must be a positive number.' };
  }

  const normalizedUnit = (unit || 'kg').toLowerCase().trim();
  const density = parseFloat(itemDetails.density_kg_per_l) || 1.0;
  const weightPerPiece = parseFloat(itemDetails.weight_per_piece_kg) || 0.05;
  const name = itemDetails.name || 'Food item';

  switch (normalizedUnit) {
    case 'kg':
    case 'kilogram':
    case 'kilograms':
      return {
        success: true,
        kg: parseFloat(qty.toFixed(4)),
        steps: `${qty} kg (standard mass unit, 1:1)`
      };

    case 'g':
    case 'gram':
    case 'grams':
      return {
        success: true,
        kg: parseFloat((qty / 1000).toFixed(4)),
        steps: `${qty} g ÷ 1000 = ${(qty / 1000).toFixed(4)} kg`
      };

    case 'litres':
    case 'l':
    case 'liter':
    case 'liters': {
      if (!density || density <= 0) {
        return {
          success: false,
          kg: 0,
          steps: 'Calculation unavailable',
          error: `Documented liquid density for ${name} is missing or invalid.`
        };
      }
      const converted = qty * density;
      return {
        success: true,
        kg: parseFloat(converted.toFixed(4)),
        steps: `${qty} L × ${density} kg/L (documented density) = ${converted.toFixed(4)} kg`
      };
    }

    case 'ml':
    case 'millilitre':
    case 'millilitres': {
      if (!density || density <= 0) {
        return {
          success: false,
          kg: 0,
          steps: 'Calculation unavailable',
          error: `Documented liquid density for ${name} is missing or invalid.`
        };
      }
      const converted = (qty / 1000) * density;
      return {
        success: true,
        kg: parseFloat(converted.toFixed(4)),
        steps: `(${qty} mL ÷ 1000) × ${density} kg/L = ${converted.toFixed(4)} kg`
      };
    }

    case 'pieces':
    case 'piece':
    case 'pcs': {
      if (!weightPerPiece || weightPerPiece <= 0) {
        return {
          success: false,
          kg: 0,
          steps: 'Calculation unavailable',
          error: `Documented weight-per-piece conversion for ${name} is missing or invalid.`
        };
      }
      const converted = qty * weightPerPiece;
      return {
        success: true,
        kg: parseFloat(converted.toFixed(4)),
        steps: `${qty} pcs × ${weightPerPiece} kg/piece (standard portion weight) = ${converted.toFixed(4)} kg`
      };
    }

    default:
      return {
        success: false,
        kg: 0,
        steps: 'Calculation unavailable',
        error: `Unsupported unit '${unit}'. Supported units: kg, g, litres, ml, pieces.`
      };
  }
}

/**
 * Full carbon calculation with detailed conversion and equivalent context.
 */
function calculateCO2eWithDetails({ quantity, unit, emissionFactor, factorSource, itemDetails = {} }) {
  const conversion = convertToKg(quantity, unit, itemDetails);
  if (!conversion.success) {
    return {
      available: false,
      reason: conversion.error,
      steps: conversion.steps,
      converted_kg: 0,
      carbon_emission_kg: 0
    };
  }

  const factor = parseFloat(emissionFactor);
  if (isNaN(factor) || factor <= 0) {
    return {
      available: false,
      reason: `Emission factor unavailable or invalid (${emissionFactor}).`,
      steps: 'Calculation unavailable',
      converted_kg: conversion.kg,
      carbon_emission_kg: 0
    };
  }

  const co2e = parseFloat((conversion.kg * factor).toFixed(4));
  const carKm = Math.round(co2e * 4.1);
  const smartphones = Math.round(co2e * 50);
  const treeAbsorptionDays = parseFloat((co2e / 0.06).toFixed(1)); // Average mature tree absorbs ~22kg/year ≈ 0.06kg/day

  return {
    available: true,
    converted_kg: conversion.kg,
    emission_factor: factor,
    factor_source: factorSource || 'IPCC / FAO Life-Cycle Assessment',
    carbon_emission_kg: co2e,
    formula: `CO₂e = ${conversion.kg} kg × ${factor} kg CO₂e/kg = ${co2e} kg CO₂e`,
    conversion_steps: conversion.steps,
    equivalents: {
      car_km: carKm,
      smartphones: smartphones,
      tree_absorption_days: treeAbsorptionDays
    }
  };
}

module.exports = {
  calcWastePercentage,
  calcCarbonEmission,
  getCarbonContext,
  calcWeeklyReduction,
  convertToKg,
  calculateCO2eWithDetails
};
