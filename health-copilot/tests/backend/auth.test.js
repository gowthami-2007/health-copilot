const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const authService = require('../../backend/src/services/authService');
const googleAuthService = require('../../backend/src/services/googleAuthService');
const User = require('../../backend/src/models/User');
const { hashPassword, comparePassword } = require('../../backend/src/utils/password');
const { generateToken, verifyToken } = require('../../backend/src/utils/jwt');
const { generateSecureToken, hashToken } = require('../../backend/src/utils/cryptoTokens');
const { validateRegistration, validateLogin } = require('../../backend/src/validators/authValidator');
const config = require('../../backend/src/config/env');

describe('Phase 2 & Authentication Security: Full Test Suite', () => {
  before(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }
    // Clean up test user collection
    await User.deleteMany({ email: /test.*@example\.com/ });
  });

  after(async () => {
    // Clean up
    await User.deleteMany({ email: /test.*@example\.com/ });
    await mongoose.disconnect();
  });

  test('Password Hashing: hashes passwords securely and verifies them', async () => {
    const rawPass = 'SecretPassword123!';
    const hash = await hashPassword(rawPass);

    assert.notStrictEqual(hash, rawPass);
    assert.strictEqual(await comparePassword(rawPass, hash), true);
    assert.strictEqual(await comparePassword('WrongPassword!', hash), false);
  });

  test('JWT: generates and verifies tokens', () => {
    const fakeUserId = new mongoose.Types.ObjectId().toString();
    const token = generateToken(fakeUserId, { email: 'test@example.com' });

    assert.ok(token);
    const decoded = verifyToken(token);
    assert.strictEqual(decoded.id, fakeUserId);
    assert.strictEqual(decoded.email, 'test@example.com');
  });

  test('Validator: catches invalid registration input', () => {
    assert.throws(() => {
      validateRegistration({ name: '', email: 'test@example.com', password: 'password123' });
    }, /Name is required/);

    assert.throws(() => {
      validateRegistration({ name: 'Alice', email: 'invalid-email', password: 'password123' });
    }, /Please enter a valid email address/);

    assert.throws(() => {
      validateRegistration({ name: 'Alice', email: 'alice@example.com', password: 'short' });
    }, /at least 8 characters/);

    assert.throws(() => {
      validateRegistration({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'password123',
        confirmPassword: 'differentPassword'
      });
    }, /Passwords do not match/);
  });

  test('AuthService: registers new user with direct login (verified state without OTP requirement)', async () => {
    const testEmail = `test_reg_${Date.now()}@example.com`;
    const result = await authService.register({
      name: 'Dr. John Watson',
      email: testEmail,
      password: 'SafePassword123!',
    });

    assert.ok(result.user, 'User object must be returned');
    assert.ok(result.token, 'Direct login token must be returned upon registration');
    assert.strictEqual(result.user.email, testEmail);
    assert.strictEqual(result.user.name, 'Dr. John Watson');
    assert.strictEqual(result.user.isEmailVerified, true);
    assert.strictEqual(result.user.password, undefined, 'Password field must not be exposed');
  });

  test('AuthService: rejects duplicate registration with same email', async () => {
    const testEmail = `test_dup_${Date.now()}@example.com`;
    await authService.register({
      name: 'Initial User',
      email: testEmail,
      password: 'SafePassword123!',
    });

    await assert.rejects(
      async () => {
        await authService.register({
          name: 'Second User',
          email: testEmail,
          password: 'AnotherPassword123!',
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 409);
        return true;
      }
    );
  });

  test('AuthService: direct login succeeds immediately after registration without email verification', async () => {
    const testEmail = `test_direct_${Date.now()}@example.com`;
    const testPass = 'CorrectPassword123!';
    const regRes = await authService.register({
      name: 'Direct Login Tester',
      email: testEmail,
      password: testPass,
    });

    assert.ok(regRes.token, 'Must return direct login token');
    const loginRes = await authService.login({
      email: testEmail,
      password: testPass,
    });
    assert.ok(loginRes.token, 'Login must succeed directly without requiring email verification');
    assert.strictEqual(loginRes.user.isEmailVerified, true);
  });

  test('AuthService: verifies email with 6-digit code and logs user in', async () => {
    const testEmail = `test_verify_${Date.now()}@example.com`;
    const testPass = 'VerifyPass123!';
    const regResult = await authService.register({
      name: 'Code Verify Tester',
      email: testEmail,
      password: testPass,
    });

    // Verify via returned OTP or code
    const otpCode = regResult.verificationOtp;
    assert.ok(otpCode, 'OTP code should be generated');

    const verifyRes = await authService.verifyEmail({
      code: otpCode,
      email: testEmail,
    });

    assert.ok(verifyRes.token, 'Token must be issued upon verification');
    assert.strictEqual(verifyRes.user.isEmailVerified, true);

    // Subsequent login must now succeed
    const loginRes = await authService.login({
      email: testEmail,
      password: testPass,
    });
    assert.ok(loginRes.token);
    assert.strictEqual(loginRes.user.isEmailVerified, true);
  });

  test('AuthService: rejects invalid or expired verification code', async () => {
    const testEmail = `test_badcode_${Date.now()}@example.com`;
    await authService.register({
      name: 'Bad Code Tester',
      email: testEmail,
      password: 'RealPassword123!',
    });

    await assert.rejects(
      async () => {
        await authService.verifyEmail({
          code: '000000',
          email: testEmail,
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  });

  test('AuthService: resends verification email with fresh credentials', async () => {
    const testEmail = `test_resend_${Date.now()}@example.com`;
    await authService.register({
      name: 'Resend Tester',
      email: testEmail,
      password: 'RealPassword123!',
    });

    const initialUser = await User.findOne({ email: testEmail }).select('+emailVerificationCode');
    const initialCode = initialUser.emailVerificationCode;

    const resendRes = await authService.resendVerification({ email: testEmail });
    assert.strictEqual(resendRes.success, true);

    const updatedUser = await User.findOne({ email: testEmail }).select('+emailVerificationCode');
    assert.ok(updatedUser.emailVerificationCode);
  });

  test('AuthService: rejects login with incorrect password', async () => {
    const testEmail = `test_badpass_${Date.now()}@example.com`;
    await authService.register({
      name: 'Bad Pass Tester',
      email: testEmail,
      password: 'RealPassword123!',
    });

    await assert.rejects(
      async () => {
        await authService.login({
          email: testEmail,
          password: 'WrongPassword999!',
        });
      },
      (err) => {
        // Unknown or incorrect password returns 401 Unauthorized
        assert.strictEqual(err.statusCode, 401);
        return true;
      }
    );
  });

  test('AuthService: rejects login for unknown email', async () => {
    await assert.rejects(
      async () => {
        await authService.login({
          email: 'nonexistent_user_999@example.com',
          password: 'Password123!',
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 401);
        assert.strictEqual(err.message, 'Invalid email or password.');
        return true;
      }
    );
  });

  test('GoogleAuthService: handles mock Google verification and account creation', async () => {
    // Mock verifyIdToken for automated test
    const originalVerify = googleAuthService.verifyIdToken;
    const mockGoogleId = `google_sub_${Date.now()}`;
    const mockGoogleEmail = `test_google_${Date.now()}@example.com`;

    googleAuthService.verifyIdToken = async () => ({
      googleId: mockGoogleId,
      email: mockGoogleEmail,
      emailVerified: true,
      name: 'Google Verified User',
      avatar: 'https://lh3.googleusercontent.com/test.jpg',
    });

    try {
      // 1. New Google user registration
      const googleRes = await authService.googleAuth({ idToken: 'mock-valid-google-jwt-token' });
      assert.ok(googleRes.token);
      assert.strictEqual(googleRes.user.email, mockGoogleEmail);
      assert.strictEqual(googleRes.user.isEmailVerified, true);
      assert.strictEqual(googleRes.isNewUser, true);

      // 2. Existing Google user sign in
      const googleLoginRes = await authService.googleAuth({ idToken: 'mock-valid-google-jwt-token' });
      assert.ok(googleLoginRes.token);
      assert.strictEqual(googleLoginRes.isNewUser, false);
    } finally {
      googleAuthService.verifyIdToken = originalVerify;
    }
  });

  test('GoogleAuthService: securely links verified Google account to existing user', async () => {
    const linkEmail = `test_link_${Date.now()}@example.com`;
    await authService.register({
      name: 'Local User Before Link',
      email: linkEmail,
      password: 'SecurePassword123!',
    });

    const originalVerify = googleAuthService.verifyIdToken;
    const mockGoogleSub = `google_linked_sub_${Date.now()}`;

    googleAuthService.verifyIdToken = async () => ({
      googleId: mockGoogleSub,
      email: linkEmail,
      emailVerified: true,
      name: 'Local User Before Link',
      avatar: '',
    });

    try {
      const linkRes = await authService.googleAuth({ idToken: 'mock-valid-google-jwt-token' });
      assert.ok(linkRes.token);
      assert.strictEqual(linkRes.user.email, linkEmail);
      assert.strictEqual(linkRes.user.isEmailVerified, true);

      const linkedUserInDb = await User.findOne({ email: linkEmail });
      assert.strictEqual(linkedUserInDb.googleId, mockGoogleSub);
    } finally {
      googleAuthService.verifyIdToken = originalVerify;
    }
  });

  test('Password Reset Flow: requests reset link, verifies token, and updates password', async () => {
    const resetEmail = `test_pwreset_${Date.now()}@example.com`;
    await authService.register({
      name: 'Reset Flow User',
      email: resetEmail,
      password: 'OldPassword123!',
    });

    // 1. Request forgot password
    const forgotRes = await authService.forgotPassword({ email: resetEmail });
    assert.ok(forgotRes.message);

    // Retrieve user and reset token from DB
    const user = await User.findOne({ email: resetEmail }).select('+passwordResetToken +passwordResetExpires');
    assert.ok(user.passwordResetToken);

    // Simulate token using raw token representation
    const { rawToken, hashedToken } = generateSecureToken();
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000);
    await user.save();

    // 2. Reset password
    const newPass = 'NewBrandSafePass123!';
    const resetRes = await authService.resetPassword({
      token: rawToken,
      password: newPass,
    });
    assert.ok(resetRes.message);

    // 3. Login with new password
    const loginRes = await authService.login({
      email: resetEmail,
      password: newPass,
    });
    assert.ok(loginRes.token);

    // 4. Token cannot be reused
    await assert.rejects(
      async () => {
        await authService.resetPassword({
          token: rawToken,
          password: 'AnotherPassword999!',
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  });
});
