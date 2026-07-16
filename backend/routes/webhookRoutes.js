const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// GET request for webhook verification from Meta/WhatsApp
router.get('/', webhookController.verifyWebhook);

// POST request for handling webhook events from Meta/WhatsApp
router.post('/', webhookController.handleWebhook);

module.exports = router;
