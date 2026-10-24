const { Router } = require('express');
const ctrl = require('../controllers/wasteController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const router = Router();

router.get('/',       requireAuth,                    ctrl.listWaste);
router.get('/:id',    requireAuth,                    ctrl.getWaste);
router.post('/',      requireRole('admin','manager'), ctrl.createWaste);
router.put('/:id',    requireRole('admin','manager'), ctrl.updateWaste);
router.delete('/:id', requireRole('admin','manager'), ctrl.deleteWaste);

module.exports = router;
