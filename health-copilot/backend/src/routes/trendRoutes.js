const express = require('express');
const router = express.Router();
const trendController = require('../controllers/trendController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', (req, res, next) => trendController.getTrends(req, res, next));
router.get('/insights', (req, res, next) => trendController.getInsights(req, res, next));

module.exports = router;
