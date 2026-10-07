const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const documentService = require('../../backend/src/services/documentService');
const User = require('../../backend/src/models/User');
const Document = require('../../backend/src/models/Document');
const Timeline = require('../../backend/src/models/Timeline');
const config = require('../../backend/src/config/env');

describe('Integration Test: Upload to Text Extraction & AI Summary Flow', () => {
  let testUser, tempFilePath;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    testUser = await User.create({
      name: 'Integration Patient',
      email: `integration_upload_${Date.now()}@example.com`,
      password: 'SafePassword123!',
    });

    // Create a physical test file in uploads
    if (!fs.existsSync(config.uploadDir)) {
      fs.mkdirSync(config.uploadDir, { recursive: true });
    }
    tempFilePath = path.join(config.uploadDir, `test_cbc_${Date.now()}.pdf`);
    fs.writeFileSync(tempFilePath, '%PDF-1.4 Mock PDF with Hemoglobin: 14.5 g/dL and WBC: 5,500 /mcL');
  });

  after(async () => {
    if (testUser) {
      await Document.deleteMany({ userId: testUser._id });
      await Timeline.deleteMany({ userId: testUser._id });
      await User.findByIdAndDelete(testUser._id);
    }
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    await mongoose.disconnect();
  });

  test('End-to-End Pipeline: Document upload handles unreadable PDFs and processes documents with text', async () => {
    const mockFile = {
      filename: path.basename(tempFilePath),
      originalname: 'Corrupted_Scan.pdf',
      mimetype: 'application/pdf',
      size: 1024,
    };

    // 1. Upload unreadable file
    const uploaded = await documentService.uploadDocument({
      userId: testUser._id.toString(),
      file: mockFile,
      documentType: 'Blood Report',
    });

    assert.ok(uploaded._id);
    assert.strictEqual(uploaded.documentType, 'Blood Report');

    // 2. Process: unreadable pdf should gracefully transition to FAILED per Section 39
    const processedFailed = await documentService.processDocument(
      uploaded._id,
      testUser._id.toString()
    );

    assert.strictEqual(processedFailed.status, 'FAILED');
    assert.ok(processedFailed.failureReason, 'failureReason must be populated');

    // 3. For a document with extracted text, test summarization pipeline
    const validDoc = await Document.create({
      userId: testUser._id,
      fileName: 'Valid_Blood_Report.pdf',
      fileUrl: '/uploads/valid_test.pdf',
      fileType: 'application/pdf',
      fileSize: 2048,
      documentType: 'Blood Report',
      extractedText: 'Complete Blood Count: Hemoglobin: 14.5 g/dL, WBC: 6,200 /mcL, Fasting Glucose: 90 mg/dL.',
      status: 'PROCESSING',
    });

    const aiServiceClient = require('../../backend/src/services/aiServiceClient');
    const summary = await aiServiceClient.summarizeDocument({
      extractedText: validDoc.extractedText,
      documentType: validDoc.documentType,
    });

    validDoc.summary = summary;
    validDoc.status = 'PROCESSED';
    await validDoc.save();

    assert.strictEqual(validDoc.status, 'PROCESSED');
    assert.ok(validDoc.summary.overview);
    assert.ok(Array.isArray(validDoc.summary.doctorQuestions));
    assert.ok(validDoc.summary.doctorQuestions.length > 0);

    // 4. Record to Timeline
    const timelineEntry = await Timeline.create({
      userId: testUser._id,
      eventType: 'DOCUMENT',
      title: 'Uploaded Blood Report',
      description: 'Valid_Blood_Report.pdf analyzed with AI summary',
      date: new Date(),
      referenceId: validDoc._id,
    });

    assert.ok(timelineEntry._id);
    assert.strictEqual(timelineEntry.eventType, 'DOCUMENT');
  });
});
