const { Router } = require('express');
const ctrl = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');
const router = Router();

router.get('/summary',            requireAuth, ctrl.getSummary);
router.get('/weekly',             requireAuth, ctrl.getWeekly);
router.get('/by-meal',            requireAuth, ctrl.getByMeal);
router.get('/top-wasted',         requireAuth, ctrl.getTopWasted);
router.get('/emissions-trend',    requireAuth, ctrl.getEmissionsTrend);
router.get('/hostel-comparison',  requireAuth, ctrl.getHostelComparison);
router.get('/category-breakdown', requireAuth, ctrl.getCategoryBreakdown);
router.get('/monthly-trends',     requireAuth, ctrl.getMonthlyTrends);

module.exports = router;
