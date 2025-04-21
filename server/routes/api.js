const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// AI routes
router.post('/ai/generate', aiController.generateResponse);
router.post('/ai/interaction', aiController.saveInteraction);

// TODO: Add other routes for assignment management here

module.exports = router;
