const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const abhaController = require('../controllers/abhaController');
const { protect } = require('../middleware/authMiddleware');

// All ABHA operations require verified authentication
router.use(protect);

// Rate limiter for patient search to prevent identifier enumeration attacks
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 30, // 30 searches per minute per user/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many search requests. Please wait a moment before searching again.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
});

// Current user ABHA profile & identity status
router.get('/me', (req, res, next) => abhaController.getMyProfile(req, res, next));

// Search patient by ABHA identifier (Rate-limited, privacy-preserving)
router.get('/search/:identifier', searchLimiter, (req, res, next) =>
  abhaController.search(req, res, next)
);

// Consent & record-sharing workflow
router.post('/consent/request', (req, res, next) =>
  abhaController.requestConsent(req, res, next)
);
router.get('/consent/requests', (req, res, next) =>
  abhaController.getConsentRequests(req, res, next)
);
router.post('/consent/:consentId/grant', (req, res, next) =>
  abhaController.grantConsent(req, res, next)
);
router.post('/consent/:consentId/reject', (req, res, next) =>
  abhaController.rejectConsent(req, res, next)
);
router.post('/consent/:consentId/revoke', (req, res, next) =>
  abhaController.revokeConsent(req, res, next)
);

// Authorized patient records and file streaming
router.get('/patients/:patientId/documents', (req, res, next) =>
  abhaController.getAuthorizedDocuments(req, res, next)
);
router.get('/patients/:patientId/documents/:documentId/file', (req, res, next) =>
  abhaController.getAuthorizedDocumentFile(req, res, next)
);

// Link/update ABHA identity in demo mode (with official gateway notes)
router.post('/link-official', (req, res, next) =>
  abhaController.linkOfficial(req, res, next)
);

module.exports = router;
