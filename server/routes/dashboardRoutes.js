const { Router } = require('express');
const ctrl = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');
const router = Router();

router.get('/summary',         requireAuth, ctrl.getSummary);
router.get('/weekly',          requireAuth, ctrl.getWeekly);
router.get('/by-meal',         requireAuth, ctrl.getByMeal);
router.get('/top-wasted',      requireAuth, ctrl.getTopWasted);
router.get('/emissions-trend', requireAuth, ctrl.getEmissionsTrend);

module.exports = router;
