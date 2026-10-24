const express = require('express');
const router = express.Router();
const patientProfileController = require('../controllers/patientProfileController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', patientProfileController.getProfiles);
router.post('/', patientProfileController.createProfile);
router.get('/:id', patientProfileController.getProfile);
router.put('/:id', patientProfileController.updateProfile);
router.post('/:id/set-primary', patientProfileController.setPrimary);
router.delete('/:id', patientProfileController.deleteProfile);

module.exports = router;
