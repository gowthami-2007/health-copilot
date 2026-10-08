const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// STRICT USER PRIVACY & AUTHENTICATION ENFORCEMENT
// Every document operation requires verified JWT credentials
router.use(protect);

// Upload: saves file associated with req.user.id
router.post('/', upload.single('file'), (req, res, next) => documentController.upload(req, res, next));

// List: returns only documents belonging to req.user.id
router.get('/', (req, res, next) => documentController.getAll(req, res, next));

// Get metadata: verifies ownership (_id AND userId)
router.get('/:id', (req, res, next) => documentController.getById(req, res, next));

// Secure file streaming for browser preview/iframe/img (verifies ownership)
router.get('/:id/file', (req, res, next) => documentController.getFile(req, res, next));
router.get('/:id/view', (req, res, next) => documentController.getFile(req, res, next));

// Secure file download (verifies ownership)
router.get('/:id/download', (req, res, next) => documentController.downloadFile(req, res, next));

// AI processing & chunking (verifies ownership)
router.post('/:id/process', (req, res, next) => documentController.process(req, res, next));

// Deletion (verifies ownership before deleting physical file & record)
router.delete('/:id', (req, res, next) => documentController.delete(req, res, next));

module.exports = router;
