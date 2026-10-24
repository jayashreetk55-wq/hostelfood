const { Router } = require('express');
const ctrl = require('../controllers/reportController');
const { requireAuth } = require('../middleware/authMiddleware');
const router = Router();

router.get('/daily',       requireAuth, ctrl.getDailyReport);
router.get('/monthly',     requireAuth, ctrl.getMonthlyReport);
router.get('/export/csv',  requireAuth, ctrl.exportCSV);
router.get('/food-items',  requireAuth, ctrl.getFoodItemStats);

module.exports = router;
