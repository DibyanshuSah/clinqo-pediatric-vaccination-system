const express = require('express');
const router = express.Router();
const vaccineMasterController = require('../controllers/vaccineMasterController');
const { authenticate, requireDoctor } = require('../middlewares/auth');

// Get all master vaccines (Doctors and parents can view)
router.get('/', authenticate, vaccineMasterController.getVaccines);

// Manage master vaccines (Doctors only)
router.post('/', authenticate, requireDoctor, vaccineMasterController.createVaccine);
router.patch('/:id', authenticate, requireDoctor, vaccineMasterController.updateVaccine);
router.delete('/:id', authenticate, requireDoctor, vaccineMasterController.deleteVaccine);

module.exports = router;
