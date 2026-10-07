const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', (req, res, next) => appointmentController.create(req, res, next));
router.get('/', (req, res, next) => appointmentController.getAll(req, res, next));
router.get('/:id', (req, res, next) => appointmentController.getById(req, res, next));
router.put('/:id', (req, res, next) => appointmentController.update(req, res, next));
router.delete('/:id', (req, res, next) => appointmentController.delete(req, res, next));

module.exports = router;
