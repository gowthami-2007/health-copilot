const express = require('express');
const router = express.Router();
const medicationController = require('../controllers/medicationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', (req, res, next) => medicationController.create(req, res, next));
router.get('/', (req, res, next) => medicationController.getAll(req, res, next));
router.get('/:id', (req, res, next) => medicationController.getById(req, res, next));
router.put('/:id', (req, res, next) => medicationController.update(req, res, next));
router.delete('/:id', (req, res, next) => medicationController.delete(req, res, next));

module.exports = router;
