const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const app = require('../../backend/src/app');
const config = require('../../backend/src/config/env');
const User = require('../../backend/src/models/User');
const Document = require('../../backend/src/models/Document');
const Timeline = require('../../backend/src/models/Timeline');
const authService = require('../../backend/src/services/authService');

describe('CRITICAL PRIVACY AUDIT: User-Specific File Privacy & Data Isolation', () => {
  let server;
  let baseUrl;
  let userA, userB;
  let tokenA, tokenB;
  let fileA, fileB;

  before(async () => {
    // 1. Database Connection
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    // 2. Start HTTP Server for Express App
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // 3. Register User A and User B
    const emailA = `privacy_user_a_${Date.now()}@example.com`;
    const emailB = `privacy_user_b_${Date.now()}@example.com`;
    const password = 'SecurePassword123!';

    const regA = await authService.register({ name: 'User Alpha', email: emailA, password });
    userA = regA.user;
    tokenA = regA.token;

    const regB = await authService.register({ name: 'User Beta', email: emailB, password });
    userB = regB.user;
    tokenB = regB.token;

    // 4. Ensure upload directory exists
    if (!fs.existsSync(config.uploadDir)) {
      fs.mkdirSync(config.uploadDir, { recursive: true });
    }
  });

  after(async () => {
    // Clean up database records
    if (userA) {
      await Document.deleteMany({ userId: userA._id });
      await Timeline.deleteMany({ userId: userA._id });
      await User.findByIdAndDelete(userA._id);
    }
    if (userB) {
      await Document.deleteMany({ userId: userB._id });
      await Timeline.deleteMany({ userId: userB._id });
      await User.findByIdAndDelete(userB._id);
    }

    // Clean up physical files
    if (userA) {
      const dirA = path.join(config.uploadDir, userA._id.toString());
      if (fs.existsSync(dirA)) fs.rmSync(dirA, { recursive: true, force: true });
    }
    if (userB) {
      const dirB = path.join(config.uploadDir, userB._id.toString());
      if (fs.existsSync(dirB)) fs.rmSync(dirB, { recursive: true, force: true });
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  test('TEST 1: User A uploads file; User B MUST NOT see it in file list', async () => {
    // User A uploads A-report.pdf
    const boundary = '----WebKitFormBoundaryPrivacyTestA';
    const fileContent = '%PDF-1.4 User A Confidential Medical Report - Complete Blood Count';
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="documentType"',
      '',
      'Blood Report',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="A-report.pdf"',
      'Content-Type: application/pdf',
      '',
      fileContent,
      `--${boundary}--`,
    ].join('\r\n');

    const uploadRes = await fetch(`${baseUrl}/api/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    assert.strictEqual(uploadRes.status, 201, 'User A file upload must succeed');
    const uploadData = await uploadRes.json();
    fileA = uploadData.data;
    assert.strictEqual(fileA.fileName, 'A-report.pdf');
    assert.strictEqual(fileA.userId.toString(), userA._id.toString());

    // User B lists documents
    const listResB = await fetch(`${baseUrl}/api/documents`, {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    assert.strictEqual(listResB.status, 200);
    const listDataB = await listResB.json();
    const docsForB = listDataB.data.documents;

    // Check that User B cannot see User A's file
    const containsA = docsForB.some((d) => d._id.toString() === fileA._id.toString() || d.fileName === 'A-report.pdf');
    assert.strictEqual(containsA, false, 'User B must NOT see User A file in their document list');
  });

  test('TEST 2: User B uploads file; User A MUST NOT see it in file list', async () => {
    // User B uploads B-report.pdf
    const boundary = '----WebKitFormBoundaryPrivacyTestB';
    const fileContent = '%PDF-1.4 User B Confidential Cardiology Report - Lipid Panel';
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="documentType"',
      '',
      'Lab Report',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="B-report.pdf"',
      'Content-Type: application/pdf',
      '',
      fileContent,
      `--${boundary}--`,
    ].join('\r\n');

    const uploadRes = await fetch(`${baseUrl}/api/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenB}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    assert.strictEqual(uploadRes.status, 201, 'User B file upload must succeed');
    const uploadData = await uploadRes.json();
    fileB = uploadData.data;
    assert.strictEqual(fileB.fileName, 'B-report.pdf');
    assert.strictEqual(fileB.userId.toString(), userB._id.toString());

    // User A lists documents
    const listResA = await fetch(`${baseUrl}/api/documents`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert.strictEqual(listResA.status, 200);
    const listDataA = await listResA.json();
    const docsForA = listDataA.data.documents;

    // Check that User A cannot see User B's file
    const containsB = docsForA.some((d) => d._id.toString() === fileB._id.toString() || d.fileName === 'B-report.pdf');
    assert.strictEqual(containsB, false, 'User A must NOT see User B file in their document list');
  });

  test('TEST 3: User A attempts GET /api/documents/:userB_fileId; Request MUST BE REJECTED', async () => {
    // User A tries to get User B's document details
    const res = await fetch(`${baseUrl}/api/documents/${fileB._id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });

    assert.ok(
      res.status === 403 || res.status === 404,
      `Expected 403 or 404 for unauthorized access, received ${res.status}`
    );
  });

  test('TEST 4: User A attempts DELETE /api/documents/:userB_fileId; Request REJECTED and User B file intact', async () => {
    // User A tries to delete User B's document
    const res = await fetch(`${baseUrl}/api/documents/${fileB._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });

    assert.ok(
      res.status === 403 || res.status === 404,
      `Expected 403 or 404 for unauthorized deletion attempt, received ${res.status}`
    );

    // Verify User B's document still exists in the database!
    const docBInDb = await Document.findById(fileB._id);
    assert.ok(docBInDb, 'User B document must still exist untouched');
    assert.strictEqual(docBInDb.userId.toString(), userB._id.toString());
  });

  test('TEST 5: User A attempts AI analysis on User B file; Request MUST BE REJECTED', async () => {
    // User A tries to process User B's document
    const processRes = await fetch(`${baseUrl}/api/documents/${fileB._id}/process`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });

    assert.ok(
      processRes.status === 403 || processRes.status === 404,
      `Expected 403 or 404 for unauthorized process call, received ${processRes.status}`
    );

    // User A tries to summarize User B's document via AI route
    const summarizeRes = await fetch(`${baseUrl}/api/ai/summarize/${fileB._id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });

    assert.ok(
      summarizeRes.status === 403 || summarizeRes.status === 404,
      `Expected 403 or 404 for unauthorized AI summarization, received ${summarizeRes.status}`
    );
  });

  test('TEST 6: Direct access to file URL/path without ownership MUST BE BLOCKED', async () => {
    // 6a: Direct access to raw /uploads static route without auth must be blocked
    const rawStaticRes = await fetch(`${baseUrl}/uploads/some-file.pdf`);
    assert.strictEqual(
      rawStaticRes.status,
      401,
      'Direct unauthenticated access to /uploads must return 401 Unauthorized'
    );

    // 6b: User A tries to view/stream User B's file via /api/documents/:id/file
    const streamRes = await fetch(`${baseUrl}/api/documents/${fileB._id}/file`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert.ok(
      streamRes.status === 403 || streamRes.status === 404,
      `Expected 403 or 404 when User A tries to view User B file, received ${streamRes.status}`
    );

    // 6c: User A tries to download User B's file via /api/documents/:id/download
    const downloadRes = await fetch(`${baseUrl}/api/documents/${fileB._id}/download`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert.ok(
      downloadRes.status === 403 || downloadRes.status === 404,
      `Expected 403 or 404 when User A tries to download User B file, received ${downloadRes.status}`
    );
  });

  test('TEST 7: Unauthenticated requests to private file endpoints MUST RETURN 401 Unauthorized', async () => {
    // GET /api/documents
    const getListRes = await fetch(`${baseUrl}/api/documents`);
    assert.strictEqual(getListRes.status, 401, 'Unauthenticated file list must return 401');

    // GET /api/documents/:id
    const getDocRes = await fetch(`${baseUrl}/api/documents/${fileA._id}`);
    assert.strictEqual(getDocRes.status, 401, 'Unauthenticated file details must return 401');

    // GET /api/documents/:id/file
    const getFileRes = await fetch(`${baseUrl}/api/documents/${fileA._id}/file`);
    assert.strictEqual(getFileRes.status, 401, 'Unauthenticated file streaming must return 401');

    // DELETE /api/documents/:id
    const delDocRes = await fetch(`${baseUrl}/api/documents/${fileA._id}`, { method: 'DELETE' });
    assert.strictEqual(delDocRes.status, 401, 'Unauthenticated delete must return 401');
  });
});
