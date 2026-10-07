const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const documentService = require('../../backend/src/services/documentService');
const User = require('../../backend/src/models/User');
const Document = require('../../backend/src/models/Document');
const Timeline = require('../../backend/src/models/Timeline');
const config = require('../../backend/src/config/env');

describe('Phase 4 & 5 & 6: Document Management, Security & Isolation Tests', () => {
  let userAlice, userBob, aliceDoc;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    userAlice = await User.create({
      name: 'Alice DocumentTester',
      email: `alice_docs_${Date.now()}@example.com`,
      password: 'SafePassword123!',
    });

    userBob = await User.create({
      name: 'Bob DocumentTester',
      email: `bob_docs_${Date.now()}@example.com`,
      password: 'SafePassword123!',
    });

    aliceDoc = await Document.create({
      userId: userAlice._id,
      fileName: 'Alice_Confidential_Lab.pdf',
      fileUrl: '/uploads/alice_test.pdf',
      fileType: 'application/pdf',
      fileSize: 4096,
      documentType: 'Lab Report',
      extractedText: 'Lipid Panel: Total Cholesterol 185 mg/dL, HDL 55 mg/dL.',
      status: 'PROCESSED',
      summary: {
        overview: 'Normal lipid panel evaluation.',
        keyInformation: ['Total Cholesterol: 185 mg/dL'],
        doctorQuestions: ['Discuss dietary goals.'],
      },
    });
  });

  after(async () => {
    if (userAlice) {
      await Document.deleteMany({ userId: userAlice._id });
      await Timeline.deleteMany({ userId: userAlice._id });
      await User.findByIdAndDelete(userAlice._id);
    }
    if (userBob) {
      await Document.deleteMany({ userId: userBob._id });
      await User.findByIdAndDelete(userBob._id);
    }
    await mongoose.disconnect();
  });

  test('DocumentService: User Alice can retrieve her own document', async () => {
    const doc = await documentService.getDocumentById(aliceDoc._id, userAlice._id.toString());
    assert.strictEqual(doc.fileName, 'Alice_Confidential_Lab.pdf');
    assert.strictEqual(doc.userId.toString(), userAlice._id.toString());
  });

  test('SECURITY AUDIT: User Bob is FORBIDDEN from accessing User Alice document', async () => {
    await assert.rejects(
      async () => {
        await documentService.getDocumentById(aliceDoc._id, userBob._id.toString());
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403, 'Must return 403 Forbidden for unauthorized user');
        assert.strictEqual(err.errorCode, 'FORBIDDEN');
        return true;
      }
    );
  });

  test('DocumentService: Filter documents by type and search query', async () => {
    const list = await documentService.getUserDocuments(userAlice._id.toString(), {
      type: 'Lab Report',
      search: 'Cholesterol',
    });

    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].fileName, 'Alice_Confidential_Lab.pdf');
  });

  test('DocumentService: Deletes document cleanly', async () => {
    const tempDoc = await Document.create({
      userId: userAlice._id,
      fileName: 'Temporary_Doc.pdf',
      fileUrl: '/uploads/temp.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      status: 'UPLOADED',
    });

    const delRes = await documentService.deleteDocument(tempDoc._id, userAlice._id.toString());
    assert.ok(delRes.message);

    const check = await Document.findById(tempDoc._id);
    assert.strictEqual(check, null);
  });
});
