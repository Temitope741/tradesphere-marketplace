// routes/webhook.routes.js
const express = require('express');
const router = express.Router();
const { handleNombaWebhook } = require('../controllers/webhook.controller');

router.post('/nomba', handleNombaWebhook);

module.exports = router;