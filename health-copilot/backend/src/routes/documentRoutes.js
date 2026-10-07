const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);

router.post('/', upload.single('file'), (req, res, next) => documentController.upload(req, res, next));
router.get('/', (req, res, next) => documentController.getAll(req, res, next));
router.get('/:id', (req, res, next) => documentController.getById(req, res, next));
router.post('/:id/process', (req, res, next) => documentController.process(req, res, next));
router.delete('/:id', (req, res, next) => documentController.delete(req, res, next));

module.exports = router;
