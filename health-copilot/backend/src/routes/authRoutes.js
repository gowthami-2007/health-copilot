const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Specialized rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please wait 15 minutes before trying again.',
    error: 'LOGIN_RATE_LIMIT_EXCEEDED',
  },
});

// Specialized rate limiter for registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts from this IP. Please try again later.',
    error: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
  },
});

// Specialized rate limiter for email operations (resend / forgot-password)
const emailActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please wait a few minutes before trying again.',
    error: 'EMAIL_RATE_LIMIT_EXCEEDED',
  },
});

// Registration & Verification
router.post('/register', registerLimiter, (req, res, next) => authController.register(req, res, next));
router.post('/verify-email', (req, res, next) => authController.verifyEmail(req, res, next));
router.get('/verify-email', (req, res, next) => authController.verifyEmail(req, res, next));
router.post('/resend-verification', emailActionLimiter, (req, res, next) =>
  authController.resendVerification(req, res, next)
);

// Standard & Google Authentication
router.post('/login', loginLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/google', (req, res, next) => authController.googleAuth(req, res, next));

// Password Reset Flow
router.post('/forgot-password', emailActionLimiter, (req, res, next) =>
  authController.forgotPassword(req, res, next)
);
router.post('/reset-password', (req, res, next) => authController.resetPassword(req, res, next));

// Authenticated Session
router.get('/me', protect, (req, res, next) => authController.getMe(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

module.exports = router;
