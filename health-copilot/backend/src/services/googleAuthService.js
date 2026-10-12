const { OAuth2Client } = require('google-auth-library');
const config = require('../config/env');
const { UnauthorizedError, BadRequestError } = require('../utils/errors');

class GoogleAuthService {
  constructor() {
    this.client = null;
  }

  getClient() {
    if (!this.client) {
      this.client = new OAuth2Client(config.googleClientId);
    }
    return this.client;
  }

  /**
   * Cryptographically verifies a Google ID token received from Google Identity Services (GIS).
   * Validates:
   *  - Signature signed by Google's public keys
   *  - Issuer is accounts.google.com or https://accounts.google.com
   *  - Audience matches GOOGLE_CLIENT_ID (if configured)
   *  - Token expiration (exp claim)
   */
  async verifyIdToken(idToken) {
    if (!idToken || typeof idToken !== 'string') {
      throw new BadRequestError('Google ID token is required.');
    }

    try {
      const client = this.getClient();

      // If GOOGLE_CLIENT_ID is configured, verify against it.
      // If not configured yet, verifyIdToken will validate signature, expiry, and issuer.
      const ticket = await client.verifyIdToken({
        idToken: idToken.trim(),
        audience: config.googleClientId || undefined,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedError('Invalid Google token payload.');
      }

      // Verify issuer
      const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
      if (!validIssuers.includes(payload.iss)) {
        throw new UnauthorizedError('Invalid token issuer.');
      }

      // Verify required sub claim
      if (!payload.sub) {
        throw new UnauthorizedError('Google token is missing unique subject identifier (sub).');
      }

      return {
        googleId: payload.sub,
        email: payload.email ? payload.email.toLowerCase().trim() : null,
        emailVerified: Boolean(payload.email_verified),
        name: payload.name || payload.given_name || 'Google User',
        avatar: payload.picture || '',
      };
    } catch (err) {
      if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
        throw err;
      }
      console.warn('[GoogleAuthService] Token verification failed:', err.message);
      throw new UnauthorizedError(`Google authentication failed: ${err.message}`);
    }
  }
}

module.exports = new GoogleAuthService();
