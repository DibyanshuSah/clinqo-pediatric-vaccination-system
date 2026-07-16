const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, requireDoctor } = require('../middlewares/auth');

router.get('/stats', authenticate, requireDoctor, dashboardController.getDashboardStats);
router.get('/upcoming-vaccines', authenticate, requireDoctor, dashboardController.getUpcomingVaccines);

module.exports = router;
