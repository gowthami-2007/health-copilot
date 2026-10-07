const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/chat', (req, res) => aiController.chat(req, res));
router.post('/summarize', (req, res) => aiController.summarize(req, res));

module.exports = router;
