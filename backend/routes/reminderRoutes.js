const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { authenticate, requireDoctor, requireAccess } = require('../middlewares/auth');

router.get('/', authenticate, requireAccess, reminderController.getReminders);
router.get('/due', authenticate, requireDoctor, reminderController.getDueReminders);
router.post('/:id/send', authenticate, requireDoctor, reminderController.sendReminder);
router.post('/', authenticate, requireDoctor, reminderController.createManualReminder);

module.exports = router;
