const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const aiChatService = require('../../backend/src/services/aiChatService');
const User = require('../../backend/src/models/User');
const Document = require('../../backend/src/models/Document');
const Conversation = require('../../backend/src/models/Conversation');
const Message = require('../../backend/src/models/Message');
const config = require('../../backend/src/config/env');

describe('Integration Test: AI Health Assistant RAG & Conversation Flow', () => {
  let userA, userB, docA, docB;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    userA = await User.create({
      name: 'Patient A',
      email: `patient_a_${Date.now()}@example.com`,
      password: 'SafePassword123!',
    });

    userB = await User.create({
      name: 'Patient B',
      email: `patient_b_${Date.now()}@example.com`,
      password: 'SafePassword123!',
    });

    // Patient A has CBC report with Hemoglobin 14.2
    docA = await Document.create({
      userId: userA._id,
      fileName: 'PatientA_Blood_Report.pdf',
      fileUrl: '/uploads/a.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      documentType: 'Blood Report',
      status: 'PROCESSED',
      chunks: [
        { chunkText: 'Patient A Hemoglobin level is 14.2 g/dL and Fasting Glucose is 92 mg/dL.' },
      ],
    });

    // Patient B has a secret report with Hemoglobin 9.1
    docB = await Document.create({
      userId: userB._id,
      fileName: 'PatientB_Secret_Report.pdf',
      fileUrl: '/uploads/b.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      documentType: 'Blood Report',
      status: 'PROCESSED',
      chunks: [
        { chunkText: 'Patient B Hemoglobin is critically low at 9.1 g/dL.' },
      ],
    });
  });

  after(async () => {
    if (userA) {
      await Document.deleteMany({ userId: userA._id });
      await Conversation.deleteMany({ userId: userA._id });
      await User.findByIdAndDelete(userA._id);
    }
    if (userB) {
      await Document.deleteMany({ userId: userB._id });
      await Conversation.deleteMany({ userId: userB._id });
      await User.findByIdAndDelete(userB._id);
    }
    await mongoose.disconnect();
  });

  test('RAG Query Flow: Answers user question and strictly includes citations from user documents', async () => {
    const chatResult = await aiChatService.sendMessage({
      userId: userA._id.toString(),
      question: 'What is my Hemoglobin level in the blood report?',
    });

    assert.ok(chatResult.conversationId);
    assert.ok(chatResult.assistantMessage);
    assert.strictEqual(chatResult.assistantMessage.role, 'assistant');
    assert.strictEqual(chatResult.assistantMessage.content.includes('Disclaimer:'), false);

    // Check retrieved sources
    assert.ok(chatResult.sources.length > 0);
    assert.strictEqual(chatResult.sources[0].fileName, 'PatientA_Blood_Report.pdf');

    // SECURITY CHECK: User A query must NEVER retrieve Patient B document!
    const sourceFileNames = chatResult.sources.map((s) => s.fileName);
    assert.strictEqual(sourceFileNames.includes('PatientB_Secret_Report.pdf'), false);
  });
});
