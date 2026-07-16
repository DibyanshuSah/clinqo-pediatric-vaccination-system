const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const vaccinationController = require('../controllers/vaccinationController');
const growthController = require('../controllers/growthController');

const { authenticate, requireDoctor, requireAccess } = require('../middlewares/auth');

// Public Patient routes (No authentication required)
router.get('/public/:uuid', patientController.getPatientByUUID);

// Patient CRUD (Doctor access only for write, general access check for read if parent)
router.get('/', authenticate, requireDoctor, patientController.getPatients);
router.get('/:id', authenticate, requireAccess, patientController.getPatient);
router.post('/', authenticate, requireDoctor, patientController.registerPatient);
router.patch('/:id', authenticate, requireDoctor, patientController.updatePatient);
router.delete('/:id', authenticate, requireDoctor, patientController.deletePatient);

// Nested Vaccinations Routes
router.get('/:id/vaccinations', authenticate, requireAccess, vaccinationController.getVaccinations);
router.get('/:id/vaccination-summary', authenticate, requireAccess, vaccinationController.getVaccinationSummary);
router.post('/:id/vaccinations/bulk-mark-given', authenticate, requireDoctor, vaccinationController.bulkMarkGiven);
router.patch('/:id/vaccinations/:vaccinationId', authenticate, requireDoctor, vaccinationController.updateVaccination);

// Nested Growth Routes
router.get('/:id/growth', authenticate, requireAccess, growthController.getGrowthRecords);
router.post('/:id/growth', authenticate, requireDoctor, growthController.addGrowthRecord);

module.exports = router;
