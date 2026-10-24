const { Router } = require('express');
const ctrl = require('../controllers/menuController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const router = Router();

router.get('/',                       requireAuth,                    ctrl.listMenus);
router.get('/:id',                    requireAuth,                    ctrl.getMenu);
router.post('/',                      requireRole('admin','manager'), ctrl.createMenu);
router.delete('/:id',                 requireRole('admin','manager'), ctrl.deleteMenu);
router.post('/:id/items',             requireRole('admin','manager'), ctrl.addMenuItem);
router.delete('/:id/items/:itemId',   requireRole('admin','manager'), ctrl.removeMenuItem);

module.exports = router;
