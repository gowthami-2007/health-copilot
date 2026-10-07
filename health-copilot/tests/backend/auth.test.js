const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const authService = require('../../backend/src/services/authService');
const User = require('../../backend/src/models/User');
const { hashPassword, comparePassword } = require('../../backend/src/utils/password');
const { generateToken, verifyToken } = require('../../backend/src/utils/jwt');
const { validateRegistration, validateLogin } = require('../../backend/src/validators/authValidator');
const config = require('../../backend/src/config/env');

describe('Phase 2: Authentication & Authorization Unit & Integration Tests', () => {
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
    }, /valid email address/);

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

  test('AuthService: successfully registers a new user', async () => {
    const testEmail = `test_reg_${Date.now()}@example.com`;
    const result = await authService.register({
      name: 'Dr. John Watson',
      email: testEmail,
      password: 'SafePassword123!',
    });

    assert.ok(result.token, 'Token must be returned');
    assert.ok(result.user, 'User object must be returned');
    assert.strictEqual(result.user.email, testEmail);
    assert.strictEqual(result.user.name, 'Dr. John Watson');
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

  test('AuthService: logs in registered user with correct password', async () => {
    const testEmail = `test_login_${Date.now()}@example.com`;
    const testPass = 'CorrectPassword123!';
    await authService.register({
      name: 'Login Tester',
      email: testEmail,
      password: testPass,
    });

    const loginRes = await authService.login({
      email: testEmail,
      password: testPass,
    });

    assert.ok(loginRes.token);
    assert.strictEqual(loginRes.user.email, testEmail);
    assert.strictEqual(loginRes.user.password, undefined, 'Password must not be returned');
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
        assert.strictEqual(err.statusCode, 401);
        return true;
      }
    );
  });
});
