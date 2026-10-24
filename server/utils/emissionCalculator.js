/**
 * emissionCalculator.js
 * Pure functions for food waste and carbon emission calculations.
 * No DB dependency — takes numbers, returns numbers.
 */

/**
 * Calculate the percentage of food wasted relative to what was planned.
 * @param {number} quantityWasted  - Amount wasted (kg / litres / pieces)
 * @param {number} quantityPlanned - Amount planned/cooked
 * @returns {number} Waste percentage (0–100, capped at 100)
 */
function calcWastePercentage(quantityWasted, quantityPlanned) {
  if (!quantityPlanned || quantityPlanned <= 0) return 0;
  const pct = (quantityWasted / quantityPlanned) * 100;
  return Math.min(parseFloat(pct.toFixed(2)), 100);
}

/**
 * Calculate carbon emission from wasted food.
 * @param {number} quantityWasted   - Amount wasted (in kg)
 * @param {number} emissionFactor   - kg CO₂e per kg of this food (from food_items table)
 * @returns {number} Carbon emission in kg CO₂ equivalent
 */
function calcCarbonEmission(quantityWasted, emissionFactor) {
  if (!quantityWasted || !emissionFactor) return 0;
  return parseFloat((quantityWasted * emissionFactor).toFixed(4));
}

/**
 * Generate a human-readable context message for a given CO₂ amount.
 * @param {number} co2Kg - Total carbon emission in kg
 * @returns {{ level: string, message: string, icon: string }}
 */
function getCarbonContext(co2Kg) {
  if (co2Kg >= 100) {
    return {
      level: 'high',
      icon: '🔴',
      message: `High — equivalent to driving a car ~${Math.round(co2Kg * 4)} km`
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
 * @param {number} lastWeekWaste  - Total waste last week (kg)
 * @param {number} thisWeekWaste  - Total waste this week (kg)
 * @returns {number} Positive = reduction, negative = increase
 */
function calcWeeklyReduction(lastWeekWaste, thisWeekWaste) {
  if (!lastWeekWaste || lastWeekWaste === 0) return 0;
  const change = ((lastWeekWaste - thisWeekWaste) / lastWeekWaste) * 100;
  return parseFloat(change.toFixed(1));
}

module.exports = {
  calcWastePercentage,
  calcCarbonEmission,
  getCarbonContext,
  calcWeeklyReduction
};
