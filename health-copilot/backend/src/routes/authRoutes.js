const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.get('/me', protect, (req, res, next) => authController.getMe(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

module.exports = router;
