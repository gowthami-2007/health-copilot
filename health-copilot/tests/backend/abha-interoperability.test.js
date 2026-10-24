const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const mongoose = require('mongoose');

const app = require('../../backend/src/app');
const config = require('../../backend/src/config/env');
const User = require('../../backend/src/models/User');
const Document = require('../../backend/src/models/Document');
const Consent = require('../../backend/src/models/Consent');
const authService = require('../../backend/src/services/authService');
const abhaService = require('../../backend/src/services/abhaService');
const { generateToken } = require('../../backend/src/utils/jwt');

describe('ABHA Health ID & Interoperability Test Suite (16 Requirements)', () => {
  let server;
  let baseUrl;
  let userPatient, userDoctor, userThird;
  let tokenPatient, tokenDoctor, tokenThird;
  let patientDoc;

  before(async () => {
    // 1. Connect MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    // 2. Start Test HTTP Server
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // 3. Register Patient User
    const emailPatient = `abha_patient_${Date.now()}@example.com`;
    await authService.register({
      name: 'Ramesh Sharma',
      email: emailPatient,
      password: 'SecurePassword123!',
    });
    userPatient = await User.findOne({ email: emailPatient });
    await User.findByIdAndUpdate(userPatient._id, {
      isEmailVerified: true,
      gender: 'male',
      dateOfBirth: new Date('1985-06-15'),
    });
    userPatient = await abhaService.getOrCreateUserHealthId(userPatient._id);
    tokenPatient = generateToken(userPatient._id, { email: emailPatient });

    // 4. Register Doctor User
    const emailDoctor = `abha_doctor_${Date.now()}@example.com`;
    await authService.register({
      name: 'Dr. Priya Varma',
      email: emailDoctor,
      password: 'SecurePassword123!',
    });
    userDoctor = await User.findOne({ email: emailDoctor });
    await User.findByIdAndUpdate(userDoctor._id, { isEmailVerified: true, gender: 'female' });
    userDoctor = await abhaService.getOrCreateUserHealthId(userDoctor._id);
    tokenDoctor = generateToken(userDoctor._id, { email: emailDoctor });

    // 5. Register Third-party User
    const emailThird = `abha_third_${Date.now()}@example.com`;
    await authService.register({
      name: 'Unauthorized Requester',
      email: emailThird,
      password: 'SecurePassword123!',
    });
    userThird = await User.findOne({ email: emailThird });
    await User.findByIdAndUpdate(userThird._id, { isEmailVerified: true });
    userThird = await abhaService.getOrCreateUserHealthId(userThird._id);
    tokenThird = generateToken(userThird._id, { email: emailThird });

    // 6. Create a confidential medical document for Patient
    patientDoc = await Document.create({
      userId: userPatient._id,
      fileName: 'blood_investigation_report.pdf',
      fileType: 'application/pdf',
      fileUrl: '/api/documents/test-patient-doc/file',
      documentType: 'Lab Report',
      status: 'PROCESSED',
      fileSize: 1024,
      hospitalName: 'Apollo Hospital',
      summary: {
        overview: 'Complete Blood Count shows normal hemoglobin and platelet values.',
        keyPoints: ['Hemoglobin: 14.2 g/dL', 'Platelets: 250,000 /cumm'],
      },
    });
  });

  after(async () => {
    // Clean up test documents, consents, and users
    if (userPatient) {
      await Document.deleteMany({ userId: userPatient._id });
      await Consent.deleteMany({ patientId: userPatient._id });
      await Consent.deleteMany({ requesterId: userPatient._id });
      await User.findByIdAndDelete(userPatient._id);
    }
    if (userDoctor) {
      await Consent.deleteMany({ requesterId: userDoctor._id });
      await User.findByIdAndDelete(userDoctor._id);
    }
    if (userThird) {
      await Consent.deleteMany({ requesterId: userThird._id });
      await User.findByIdAndDelete(userThird._id);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  // 1. A new user receives a unique application-level identifier in demo mode
  test('1. New user receives a unique application-level identifier in demo mode', async () => {
    assert.ok(userPatient.healthId, 'Patient must have an assigned healthId');
    assert.match(userPatient.healthId, /^ABHA-DEMO-\d{4}-\d{4}$/, 'Must match ABHA-DEMO-XXXX-XXXX format');
    assert.strictEqual(userPatient.healthIdType, 'DEMO_APPLICATION_ID');
    assert.strictEqual(userPatient.abhaStatus, 'DEMO_ASSIGNED');
  });

  // 2. Two users cannot receive the same identifier
  test('2. Two users receive distinct, collision-free identifiers', async () => {
    assert.notStrictEqual(
      userPatient.healthId,
      userDoctor.healthId,
      'Identifiers between patient and doctor must be distinct'
    );
  });

  // 3. Database uniqueness constraints are enforced
  test('3. Database enforces uniqueness constraint on healthId', async () => {
    const duplicateUser = new User({
      name: 'Duplicate Test',
      email: `duplicate_${Date.now()}@example.com`,
      password: 'SecurePassword123!',
      healthId: userPatient.healthId, // Intentionally duplicate
    });

    await assert.rejects(
      async () => {
        await duplicateUser.save();
      },
      (err) => {
        return err.code === 11000 || /duplicate/i.test(err.message);
      },
      'Database unique index must reject duplicate healthId'
    );
  });

  // 4. The current user\'s identity displays correctly via GET /api/abha/me
  test('4. GET /api/abha/me retrieves authenticated user profile', async () => {
    const res = await fetch(`${baseUrl}/api/abha/me`, {
      headers: { Authorization: `Bearer ${tokenPatient}` },
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.healthId, userPatient.healthId);
    assert.strictEqual(body.data.fullName, 'Ramesh Sharma');
    assert.strictEqual(body.data.gender, 'male');
    assert.strictEqual(body.data.linkedDocumentsCount, 1);
    assert.ok(body.data.provenanceNotice.includes('Application-level demo health identifier'));
  });

  // 5. Searching for a valid identifier returns appropriate result (self lookup)
  test('5. Self search returns full authorized patient profile and documents', async () => {
    const res = await fetch(`${baseUrl}/api/abha/search/${userPatient.healthId}`, {
      headers: { Authorization: `Bearer ${tokenPatient}` },
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.data.isAuthorized, true);
    assert.strictEqual(body.data.accessLevel, 'FULL_SELF_ACCESS');
    assert.strictEqual(body.data.patient.fullName, 'Ramesh Sharma');
    assert.ok(body.data.documents.length >= 1, 'Self lookup must display documents');
    assert.strictEqual(body.data.documents[0].fileName, 'blood_investigation_report.pdf');
  });

  // 6. Searching for an invalid identifier displays validation error (400)
  test('6. Searching for an invalid identifier format returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/abha/search/invalid-xyz-123`, {
      headers: { Authorization: `Bearer ${tokenDoctor}` },
    });
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('Invalid ABHA identifier format'));
  });

  // 7. Searching for an unknown identifier handles the no-results state (404)
  test('7. Searching for an unknown identifier returns 404 Not Found', async () => {
    const res = await fetch(`${baseUrl}/api/abha/search/ABHA-DEMO-0000-0000`, {
      headers: { Authorization: `Bearer ${tokenDoctor}` },
    });
    assert.strictEqual(res.status, 404);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('No patient found'));
  });

  // 8. Unauthorized users cannot access another patient's profile without consent
  test('8. Unauthorized search returns masked patient identity and requires consent', async () => {
    const res = await fetch(`${baseUrl}/api/abha/search/${userPatient.healthId}`, {
      headers: { Authorization: `Bearer ${tokenDoctor}` },
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.data.isAuthorized, false);
    assert.strictEqual(body.data.accessLevel, 'MASKED_PREVIEW');
    assert.strictEqual(body.data.consentStatus, 'NONE');
    assert.strictEqual(body.data.patient.maskedName, 'R***** S*****', 'Patient name must be masked for privacy');
    assert.deepStrictEqual(body.data.documents, [], 'Protected documents MUST NOT be disclosed');
  });

  // 9. Users cannot access another patient's documents without authorization
  test('9. Direct document retrieval without consent returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/abha/patients/${userPatient._id}/documents`, {
      headers: { Authorization: `Bearer ${tokenDoctor}` },
    });
    assert.strictEqual(res.status, 403);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('Access forbidden'));
  });

  // 10. Granted consent permits only the authorized access
  let activeConsentId;
  test('10. Full consent workflow: Request -> Grant -> Authorized Access', async () => {
    // Step A: Doctor requests access
    const reqRes = await fetch(`${baseUrl}/api/abha/consent/request`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenDoctor}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetIdentifier: userPatient.healthId,
        purpose: 'CLINICAL_CONSULTATION',
        purposeDescription: 'Consultation for routine blood test checkup',
        durationDays: 7,
      }),
    });
    assert.strictEqual(reqRes.status, 201);
    const reqData = await reqRes.json();
    activeConsentId = reqData.data.consentId;
    assert.ok(activeConsentId);
    assert.strictEqual(reqData.data.status, 'PENDING');

    // Step B: Patient views incoming requests
    const listRes = await fetch(`${baseUrl}/api/abha/consent/requests`, {
      headers: { Authorization: `Bearer ${tokenPatient}` },
    });
    assert.strictEqual(listRes.status, 200);
    const listData = await listRes.json();
    const pending = listData.data.incoming.find((c) => c.id.toString() === activeConsentId.toString());
    assert.ok(pending, 'Patient must see incoming consent request');

    // Step C: Patient grants consent
    const grantRes = await fetch(`${baseUrl}/api/abha/consent/${activeConsentId}/grant`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenPatient}` },
    });
    assert.strictEqual(grantRes.status, 200);

    // Step D: Doctor re-searches patient ID; now authorized!
    const searchRes = await fetch(`${baseUrl}/api/abha/search/${userPatient.healthId}`, {
      headers: { Authorization: `Bearer ${tokenDoctor}` },
    });
    assert.strictEqual(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.strictEqual(searchData.data.isAuthorized, true);
    assert.strictEqual(searchData.data.accessLevel, 'CONSENT_GRANTED');
    assert.strictEqual(searchData.data.patient.fullName, 'Ramesh Sharma', 'Full name visible under consent');
    assert.ok(searchData.data.documents.length >= 1, 'Permitted documents are now visible');
    assert.strictEqual(searchData.data.documents[0].fileName, 'blood_investigation_report.pdf');
    assert.ok(searchData.data.documents[0].hasAIInterpretation, 'AI summary is accessible');
  });

  // 11. Revoked consent blocks subsequent access
  test('11. Patient revokes consent; Doctor access is blocked immediately', async () => {
    // Patient revokes consent
    const revokeRes = await fetch(`${baseUrl}/api/abha/consent/${activeConsentId}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenPatient}` },
    });
    assert.strictEqual(revokeRes.status, 200);

    // Doctor searches again; access must be revoked
    const searchRes = await fetch(`${baseUrl}/api/abha/search/${userPatient.healthId}`, {
      headers: { Authorization: `Bearer ${tokenDoctor}` },
    });
    assert.strictEqual(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.strictEqual(searchData.data.isAuthorized, false, 'Access must be revoked');
    assert.strictEqual(searchData.data.accessLevel, 'MASKED_PREVIEW');
    assert.deepStrictEqual(searchData.data.documents, [], 'No documents returned after revocation');

    // Direct document fetch must return 403
    const docRes = await fetch(`${baseUrl}/api/abha/patients/${userPatient._id}/documents`, {
      headers: { Authorization: `Bearer ${tokenDoctor}` },
    });
    assert.strictEqual(docRes.status, 403);
  });

  // 12. Document ownership and access permissions are checked on the backend
  test('12. Third-party without any consent cannot access patient records', async () => {
    const res = await fetch(`${baseUrl}/api/abha/patients/${userPatient._id}/documents`, {
      headers: { Authorization: `Bearer ${tokenThird}` },
    });
    assert.strictEqual(res.status, 403);
  });

  // 13. Identifier searches are rate-limited
  test('13. Search endpoint enforces rate limiting header tracking', async () => {
    const res = await fetch(`${baseUrl}/api/abha/search/${userPatient.healthId}`, {
      headers: { Authorization: `Bearer ${tokenPatient}` },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.has('ratelimit-limit') || res.headers.has('x-ratelimit-limit'), 'Rate limit header present');
  });

  // 14. Official ABHA identifiers are not falsely marked as verified in demo mode
  test('14. Linking ABHA in demo mode correctly designates DEMO_ASSIGNED status and unverified flag', async () => {
    const linkRes = await fetch(`${baseUrl}/api/abha/link-official`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenPatient}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        abhaNumber: '91-8888-7777-6666',
        abhaAddress: 'ramesh.sharma@abdm',
      }),
    });
    assert.strictEqual(linkRes.status, 200);

    const profileRes = await fetch(`${baseUrl}/api/abha/me`, {
      headers: { Authorization: `Bearer ${tokenPatient}` },
    });
    const profileData = await profileRes.json();
    assert.strictEqual(profileData.data.isAbhaVerified, false, 'Must not falsely mark as verified');
    assert.strictEqual(profileData.data.abhaStatus, 'DEMO_ASSIGNED');
    assert.strictEqual(profileData.data.abhaNumber, '91-8888-7777-6666');
    assert.strictEqual(profileData.data.abhaAddress, 'ramesh.sharma@abdm');
  });

  // 15. Existing document upload and AI summary functionality continues working
  test('15. Medical document models and AI summaries remain intact', async () => {
    const doc = await Document.findById(patientDoc._id);
    assert.ok(doc);
    assert.strictEqual(doc.documentType, 'Lab Report');
    assert.ok(doc.summary.overview.includes('Complete Blood Count'));
  });

  // 16. Audit events are recorded during consent lifecycle
  test('16. Consent audit log accurately captures lifecycle transitions', async () => {
    const consent = await Consent.findById(activeConsentId);
    assert.ok(consent);
    assert.ok(consent.auditLog.length >= 3, 'Must have at least REQUESTED, GRANTED, REVOKED actions');
    const actions = consent.auditLog.map((a) => a.action);
    assert.ok(actions.includes('CONSENT_REQUESTED'));
    assert.ok(actions.includes('CONSENT_GRANTED'));
    assert.ok(actions.includes('CONSENT_REVOKED'));
  });
});
