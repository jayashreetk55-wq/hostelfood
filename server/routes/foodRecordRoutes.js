const { Router } = require('express');
const ctrl = require('../controllers/foodRecordController');
const { requireAuth } = require('../middleware/authMiddleware');
const router = Router();

router.get('/',        requireAuth, ctrl.listRecords);
router.get('/:id',     requireAuth, ctrl.getRecord);
router.post('/',       requireAuth, ctrl.createRecord);
router.post('/batch',  requireAuth, ctrl.createBatchRecords);
router.put('/:id',     requireAuth, ctrl.updateRecord);
router.delete('/:id',  requireAuth, ctrl.deleteRecord);

module.exports = router;
