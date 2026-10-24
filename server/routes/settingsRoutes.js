const { Router } = require('express');
const ctrl = require('../controllers/settingsController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const router = Router();

router.get('/',       requireAuth,         ctrl.listFoodItems);
router.post('/',      requireRole('admin'), ctrl.createFoodItem);
router.put('/:id',    requireRole('admin'), ctrl.updateFoodItem);
router.delete('/:id', requireRole('admin'), ctrl.deleteFoodItem);

module.exports = router;
