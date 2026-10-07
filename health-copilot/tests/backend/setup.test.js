const { test, describe } = require('node:test');
const assert = require('node:assert');
const app = require('../../backend/src/app');
const config = require('../../backend/src/config/env');

describe('Phase 1: Project Setup & Environment Verification', () => {
  test('Config should have valid defaults', () => {
    assert.ok(config.port, 'Port must be defined');
    assert.ok(config.jwtSecret, 'JWT secret must be defined');
    assert.ok(config.mongodbUri, 'MongoDB URI must be defined');
    assert.strictEqual(config.maxFileSize, 10485760, 'Default max file size should be 10MB');
  });

  test('Express app should be initialized with required middleware', () => {
    assert.ok(app, 'Express app should exist');
    assert.strictEqual(typeof app.handle, 'function', 'app should have handle method');
  });
});
