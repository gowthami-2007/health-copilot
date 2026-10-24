const crypto = require('crypto');

const OTP_PEPPER = process.env.OTP_SECRET || 'health_copilot_secure_otp_pepper_2026';

/**
 * Generates a cryptographically secure random token (64-char hex string)
 * and its SHA-256 hash representation for safe database storage.
 */
const generateSecureToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawToken);
  return { rawToken, hashedToken };
};

/**
 * Generates a cryptographically secure 6-digit numeric OTP code.
 */
const generateNumericCode = () => {
  const code = crypto.randomInt(100000, 999999).toString();
  return code;
};

/**
 * Computes a SHA-256 hash of a raw token.
 */
const hashToken = (token) => {
  if (!token || typeof token !== 'string') return '';
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
};

/**
 * Computes a cryptographically secure HMAC-SHA256 hash of a 6-digit OTP code
 * to prevent precomputation and rainbow table attacks.
 */
const hashOtp = (code) => {
  if (!code || typeof code !== 'string') return '';
  return crypto.createHmac('sha256', OTP_PEPPER).update(code.trim()).digest('hex');
};

/**
 * Constant-time OTP comparison to prevent timing side-channel attacks.
 */
const verifyOtp = (inputCode, storedHash) => {
  if (!inputCode || !storedHash || typeof inputCode !== 'string' || typeof storedHash !== 'string') {
    return false;
  }
  const computedHash = hashOtp(inputCode);
  const a = Buffer.from(computedHash);
  const b = Buffer.from(storedHash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

module.exports = {
  generateSecureToken,
  generateNumericCode,
  generateVerificationOtp: generateNumericCode,
  hashToken,
  hashOtp,
  verifyOtp,
};
