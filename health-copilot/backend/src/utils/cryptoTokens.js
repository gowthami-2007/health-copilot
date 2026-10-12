const crypto = require('crypto');

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
 * Generates a 6-digit numeric OTP code for email verification.
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

module.exports = {
  generateSecureToken,
  generateNumericCode,
  hashToken,
};
