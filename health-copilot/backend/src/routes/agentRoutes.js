const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/actions', (req, res, next) => agentController.getActions(req, res, next));
router.post('/scan', (req, res, next) => agentController.scanActions(req, res, next));
router.post('/actions/:id/approve', (req, res, next) => agentController.approveAction(req, res, next));
router.post('/actions/:id/reject', (req, res, next) => agentController.rejectAction(req, res, next));

module.exports = router;
