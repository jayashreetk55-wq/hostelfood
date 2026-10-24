const { Router } = require('express');
const ctrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const router = Router();

router.post('/login',  ctrl.login);
router.post('/logout', requireAuth, ctrl.logout);
router.get('/me',      requireAuth, ctrl.me);

module.exports = router;
