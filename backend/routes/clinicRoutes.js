const express = require('express');
const router = express.Router();
const clinicController = require('../controllers/clinicController');
const { authenticate, requireDoctor } = require('../middlewares/auth');

router.get('/', authenticate, clinicController.getClinics);
router.get('/:id', authenticate, clinicController.getClinic);
router.post('/', authenticate, requireDoctor, clinicController.createClinic);
router.patch('/:id', authenticate, requireDoctor, clinicController.updateClinic);
router.delete('/:id', authenticate, requireDoctor, clinicController.deleteClinic);

module.exports = router;
