const express = require('express');
const router = express.Router();
const timelineController = require('../controllers/timelineController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', (req, res, next) => timelineController.getTimeline(req, res, next));

module.exports = router;
