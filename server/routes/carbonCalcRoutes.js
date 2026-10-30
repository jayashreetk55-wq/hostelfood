const { Router } = require('express');
const ctrl = require('../controllers/carbonCalcController');
const { requireAuth } = require('../middleware/authMiddleware');
const router = Router();

router.post('/calculate', requireAuth, ctrl.calculate);
router.post('/save',      requireAuth, ctrl.saveCalculation);
router.get('/history',    requireAuth, ctrl.listHistory);
router.delete('/history/:id', requireAuth, ctrl.deleteHistory);

module.exports = router;
