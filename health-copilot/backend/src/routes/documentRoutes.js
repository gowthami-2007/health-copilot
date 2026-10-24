const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// STRICT USER PRIVACY & AUTHENTICATION ENFORCEMENT
// Every document operation requires verified JWT credentials
router.use(protect);

// Helper middleware for prescription upload accepting either 'image' or 'file' field
const { uploadImageOnly } = upload;
const prescriptionUpload = (req, res, next) => {
  const handler = (uploadImageOnly || upload).fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]);
  handler(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      req.file = req.files['image']?.[0] || req.files['file']?.[0];
    }
    next();
  });
};

// AI-powered prescription image extraction (Multimodal Vision - JPEG/PNG/WEBP only)
router.post('/analyze-prescription', prescriptionUpload, (req, res, next) =>
  documentController.analyzePrescription(req, res, next)
);

// Save user-reviewed & confirmed prescription to document vault
router.post('/save-prescription', prescriptionUpload, (req, res, next) =>
  documentController.saveReviewedPrescription(req, res, next)
);

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

// Structured medical data update / verification (verifies ownership)
router.put('/:id/structured-data', (req, res, next) => documentController.updateStructuredData(req, res, next));

// FHIR R4 Bundle mapping (verifies ownership)
router.get('/:id/fhir', (req, res, next) => documentController.getFhirBundle(req, res, next));

// Deletion (verifies ownership before deleting physical file & record)
router.delete('/:id', (req, res, next) => documentController.delete(req, res, next));

module.exports = router;
