const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', (req, res, next) => profileController.getProfile(req, res, next));
router.put('/', (req, res, next) => profileController.updateProfile(req, res, next));
router.delete('/', (req, res, next) => profileController.deleteAccount(req, res, next));

// Mock ABDM / ABHA Endpoints (Phase 7.2)
router.post('/abha/link', (req, res, next) => profileController.linkMockAbha(req, res, next));
router.post('/abha/unlink', (req, res, next) => profileController.unlinkMockAbha(req, res, next));
router.get('/abha/samples', (req, res, next) => profileController.getSampleAbhaRecords(req, res, next));
router.post('/abha/import', (req, res, next) => profileController.importSampleAbhaRecord(req, res, next));

module.exports = router;
