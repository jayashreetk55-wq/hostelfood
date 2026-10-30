const { Router } = require('express');
const ctrl = require('../controllers/reportController');
const { requireAuth } = require('../middleware/authMiddleware');
const router = Router();

router.get('/daily',        requireAuth, ctrl.getDailyReport);
router.get('/weekly',       requireAuth, ctrl.getWeeklyReport);
router.get('/monthly',      requireAuth, ctrl.getMonthlyReport);
router.get('/semester',     requireAuth, ctrl.getSemesterReport);
router.get('/hostel-wise',  requireAuth, ctrl.getHostelWiseReport);
router.get('/meal-wise',    requireAuth, ctrl.getMealWiseReport);
router.get('/food-items',   requireAuth, ctrl.getFoodItemStats);
router.get('/export/csv',   requireAuth, ctrl.exportCSV);
router.get('/export/excel', requireAuth, ctrl.exportExcel);

module.exports = router;
