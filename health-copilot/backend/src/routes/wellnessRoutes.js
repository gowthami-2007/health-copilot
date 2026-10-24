const express = require('express');
const router = express.Router();
const wellnessController = require('../controllers/wellnessController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', (req, res, next) => wellnessController.getRecommendations(req, res, next));
router.patch('/:id/status', (req, res, next) => wellnessController.updateStatus(req, res, next));

module.exports = router;
