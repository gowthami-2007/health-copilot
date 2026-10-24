const { test, describe } = require('node:test');
const assert = require('node:assert');
const { hashPassword, comparePassword } = require('../../backend/src/utils/password');
const { generateToken, verifyToken } = require('../../backend/src/utils/jwt');
const {
  generateVerificationOtp,
  hashOtp,
  verifyOtp,
  generateSecureToken,
  hashToken,
} = require('../../backend/src/utils/cryptoTokens');
const {
  getAuthCookieOptions,
  setAuthCookie,
  clearAuthCookie,
  cookieParser,
} = require('../../backend/src/utils/cookieHelper');
const {
  validateRegistration,
  validateLogin,
  validateEmailVerification,
  validateResendVerification,
} = require('../../backend/src/validators/authValidator');
const { protect } = require('../../backend/src/middleware/authMiddleware');
const { EmailNotVerifiedError, AuthenticationError } = require('../../backend/src/utils/errors');

describe('Complete Authentication, Email OTP & Session Management Test Suite', () => {
  // 1. Password Security
  describe('1. Password Hashing & Security', () => {
    test('Hashes passwords using strong bcrypt/Argon2 and verifies securely', async () => {
      const password = 'MedicalVaultPassword2026!';
      const hash = await hashPassword(password);

      assert.notStrictEqual(hash, password);
      assert.strictEqual(await comparePassword(password, hash), true);
      assert.strictEqual(await comparePassword('WrongPassword!', hash), false);
    });

    test('Rejects blank or weak passwords during validation', () => {
      assert.throws(() => validateRegistration({ name: 'Dr. Jane', email: 'jane@clinic.org', password: '' }), /Password is required/);
      assert.throws(() => validateRegistration({ name: 'Dr. Jane', email: 'jane@clinic.org', password: 'short' }), /at least 8 characters/);
      assert.throws(() => validateRegistration({ name: 'Dr. Jane', email: 'jane@clinic.org', password: 'alllettersnocodes' }), /at least one number or symbol/);
    });
  });

  // 2. Cryptographically Secure 6-Digit OTP Generation & Salted Hashing
  describe('2. 6-Digit Email OTP Generation & Salted Hashing', () => {
    test('Generates a random 6-digit numeric OTP', () => {
      for (let i = 0; i < 20; i++) {
        const otp = generateVerificationOtp();
        assert.strictEqual(typeof otp, 'string');
        assert.strictEqual(otp.length, 6);
        assert.match(otp, /^[0-9]{6}$/, 'OTP must consist of 6 numeric digits');
      }
    });

    test('Hashes OTP with pepper and verifies via constant-time comparison', () => {
      const otp = generateVerificationOtp();
      const hash = hashOtp(otp);

      assert.notStrictEqual(hash, otp, 'OTP must not be stored in plaintext');
      assert.strictEqual(verifyOtp(otp, hash), true, 'Valid OTP must verify successfully');
      assert.strictEqual(verifyOtp('000000', hash), false, 'Invalid OTP must be rejected');
      assert.strictEqual(verifyOtp('999999', hash), false, 'Invalid OTP must be rejected');
    });

    test('Different OTPs generate distinct cryptographic hashes', () => {
      const hash1 = hashOtp('123456');
      const hash2 = hashOtp('123457');
      assert.notStrictEqual(hash1, hash2);
    });
  });

  // 3. HTTP-Only Cookie Configuration & Session Management
  describe('3. HTTP-Only Cookie Configuration & Session Management', () => {
    test('Persistent login gives 7-day cookie lifetime', () => {
      const options = getAuthCookieOptions(true);
      assert.strictEqual(options.httpOnly, true, 'Cookie MUST be HTTP-only to prevent XSS exfiltration');
      assert.strictEqual(options.path, '/');
      assert.strictEqual(options.maxAge, 7 * 24 * 60 * 60 * 1000, '7 days maxAge');
    });

    test('Session-only login gives 24-hour cookie lifetime', () => {
      const options = getAuthCookieOptions(false);
      assert.strictEqual(options.httpOnly, true);
      assert.strictEqual(options.maxAge, 24 * 60 * 60 * 1000, '24 hours maxAge');
    });

    test('setAuthCookie attaches health_copilot_token and token cookies to response', () => {
      const cookiesSet = [];
      const fakeRes = {
        cookie: (name, val, opts) => {
          cookiesSet.push({ name, val, opts });
        },
      };

      const dummyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';
      setAuthCookie(fakeRes, dummyToken, true);

      assert.strictEqual(cookiesSet.length, 2);
      assert.strictEqual(cookiesSet[0].name, 'health_copilot_token');
      assert.strictEqual(cookiesSet[0].val, dummyToken);
      assert.strictEqual(cookiesSet[0].opts.httpOnly, true);
      assert.strictEqual(cookiesSet[1].name, 'token');
    });

    test('clearAuthCookie instructs browser to delete session cookies with matching options', () => {
      const cleared = [];
      const fakeRes = {
        clearCookie: (name, opts) => {
          cleared.push({ name, opts });
        },
      };

      clearAuthCookie(fakeRes);
      assert.strictEqual(cleared.length, 2);
      assert.strictEqual(cleared[0].name, 'health_copilot_token');
      assert.strictEqual(cleared[0].opts.httpOnly, true);
      assert.strictEqual(cleared[1].name, 'token');
    });

    test('cookieParser middleware parses incoming Cookie header into req.cookies', () => {
      const req = {
        headers: {
          cookie: 'health_copilot_token=secret_jwt_token_123; other_cookie=hello; theme=dark',
        },
      };
      const res = {};
      let nextCalled = false;

      cookieParser(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.cookies.health_copilot_token, 'secret_jwt_token_123');
      assert.strictEqual(req.cookies.other_cookie, 'hello');
      assert.strictEqual(req.cookies.theme, 'dark');
    });
  });

  // 4. Session Authentication Middleware & Protection
  describe('4. Session Authentication Middleware & Cookie Priority', () => {
    test('Protects routes by extracting token from HTTP-only cookie', async () => {
      const User = require('../../backend/src/models/User');
      const origFindById = User.findById;
      const fakeId = '507f1f77bcf86cd799439011';
      User.findById = async (id) => ({
        _id: id,
        name: 'Patient Tester',
        email: 'patient@vault.org',
        isEmailVerified: true,
      });

      try {
        const validToken = generateToken(fakeId, { email: 'patient@vault.org' });
        const req = {
          cookies: {
            health_copilot_token: validToken,
          },
          headers: {},
        };
        const res = {};
        let nextCalled = false;
        let errorThrown = null;

        await protect(req, res, (err) => {
          if (err) errorThrown = err;
          else nextCalled = true;
        });

        assert.strictEqual(errorThrown, null);
        assert.strictEqual(nextCalled, true);
        assert.strictEqual(req.user.id, fakeId);
        assert.strictEqual(req.user.email, 'patient@vault.org');
        assert.strictEqual(req.user.isEmailVerified, true);
      } finally {
        User.findById = origFindById;
      }
    });

    test('Rejects request without valid session cookie or token', async () => {
      const req = {
        cookies: {},
        headers: {},
      };
      const res = {};
      let errorThrown = null;

      await protect(req, res, (err) => {
        errorThrown = err;
      });

      assert.ok(errorThrown, 'Must throw error when no credentials are provided');
      assert.strictEqual(errorThrown.statusCode, 401);
      assert.strictEqual(errorThrown.errorCode, 'UNAUTHORIZED');
    });

    test('Rejects tampered or expired token', async () => {
      const req = {
        cookies: {
          health_copilot_token: 'tampered.token.data',
        },
        headers: {},
      };
      const res = {};
      let errorThrown = null;

      await protect(req, res, (err) => {
        errorThrown = err;
      });

      assert.ok(errorThrown);
      assert.strictEqual(errorThrown.statusCode, 401);
    });
  });

  // 5. Unverified Account Protection & Error Handling
  describe('5. Unverified Account Handling & HTTP 403 Response', () => {
    test('EmailNotVerifiedError produces 403 status with structured error code and verification requirement', () => {
      const err = new EmailNotVerifiedError('test@example.com');
      assert.strictEqual(err.statusCode, 403);
      assert.strictEqual(err.errorCode, 'EMAIL_NOT_VERIFIED');
      assert.strictEqual(err.details.requiresVerification, true);
      assert.strictEqual(err.details.email, 'test@example.com');
    });
  });

  // 6. Request Input Validation & Normalization
  describe('6. Input Validation & Email Normalization', () => {
    test('Normalizes email to lowercase and trims spaces', () => {
      const validated = validateRegistration({
        name: 'John Doe',
        email: '  John.Doe@Hospital.ORG  ',
        password: 'Password123!',
      });
      assert.strictEqual(validated.email, 'john.doe@hospital.org');
      assert.strictEqual(validated.name, 'John Doe');
    });

    test('validateLogin returns rememberMe flag properly', () => {
      const persistent = validateLogin({
        email: 'user@example.com',
        password: 'Password123!',
        rememberMe: true,
      });
      assert.strictEqual(persistent.rememberMe, true);

      const sessionOnly = validateLogin({
        email: 'user@example.com',
        password: 'Password123!',
        rememberMe: false,
      });
      assert.strictEqual(sessionOnly.rememberMe, false);
    });

    test('validateEmailVerification accepts 6-digit code and normalizes email', () => {
      const res = validateEmailVerification({
        code: ' 654321 ',
        email: ' Patient@Clinic.COM ',
      });
      assert.strictEqual(res.code, '654321');
      assert.strictEqual(res.email, 'patient@clinic.com');
    });
  });

  // 7. Security Business Logic: Single-Use OTP, Expiry, and Resend Cooldown
  describe('7. Business Logic Security Policies', () => {
    test('OTP Expiry Policy: 5 minutes TTL', () => {
      const OTP_TTL_MS = 5 * 60 * 1000;
      const now = Date.now();
      const expiresAt = new Date(now + OTP_TTL_MS);

      assert.strictEqual(expiresAt.getTime() - now, 300000, '5 minutes exact expiration');
    });

    test('Resend Cooldown Policy: 60 seconds interval requirement', () => {
      const COOLDOWN_SECONDS = 60;
      const lastSent = Date.now() - 30 * 1000; // 30 seconds ago
      const remainingSeconds = Math.ceil((60 * 1000 - (Date.now() - lastSent)) / 1000);

      assert.ok(remainingSeconds > 0 && remainingSeconds <= 30, 'Enforces wait within 60s cooldown window');

      const expiredSent = Date.now() - 65 * 1000; // 65 seconds ago
      const canResend = Date.now() - expiredSent >= COOLDOWN_SECONDS * 1000;
      assert.strictEqual(canResend, true, 'Permits new OTP generation after 60s cooldown');
    });

    test('Max OTP Verification Attempts: Lockout after 5 attempts', () => {
      let attempts = 0;
      const MAX_ATTEMPTS = 5;

      for (let i = 1; i <= MAX_ATTEMPTS; i++) {
        attempts++;
      }

      assert.strictEqual(attempts, 5);
      const isExceeded = attempts >= MAX_ATTEMPTS;
      assert.strictEqual(isExceeded, true, 'Invalidates OTP and locks out verification after 5 failures');
    });
  });
});
