const { Router } = require('express');
const ctrl = require('../controllers/hostelController');
const { requireAuth } = require('../middleware/authMiddleware');
const router = Router();

router.get('/',       requireAuth, ctrl.listHostels);
router.get('/messes', requireAuth, ctrl.listMesses);
router.get('/:id',    requireAuth, ctrl.getHostel);

module.exports = router;
