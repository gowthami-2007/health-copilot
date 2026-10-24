const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const agentService = require('../../backend/src/services/agentService');
const AgentAction = require('../../backend/src/models/AgentAction');
const Document = require('../../backend/src/models/Document');
const Medication = require('../../backend/src/models/Medication');
const User = require('../../backend/src/models/User');
const config = require('../../backend/src/config/env');

describe('Round 2: Agentic AI Automation & Audit Trail Tests', () => {
  let testUserId;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }
    await User.deleteMany({ email: /test_agent_.*@example\.com/ });
    await AgentAction.deleteMany({});
    await Document.deleteMany({ fileName: /Demo_Agent_Rx/ });
    await Medication.deleteMany({ name: /AgentMed Atorvastatin/ });

    const user = await User.create({
      name: 'Agent Test Patient',
      email: `test_agent_${Date.now()}@example.com`,
      password: 'HashPassword123!',
      isEmailVerified: true,
    });
    testUserId = user._id.toString();

    // Create a document containing an un-scheduled prescription
    await Document.create({
      userId: testUserId,
      fileName: 'Demo_Agent_Rx.pdf',
      fileUrl: '/uploads/rx.pdf',
      fileType: 'application/pdf',
      fileSize: 10000,
      documentType: 'Prescription',
      status: 'PROCESSED',
      structuredData: {
        documentDate: new Date(),
        healthcareProvider: 'Dr. Jenkins Cardiology',
        prescriptions: [
          {
            medicationName: 'AgentMed Atorvastatin',
            dosage: '20 mg',
            frequency: 'Once daily at bedtime',
            instructions: 'Take 1 tablet every night',
            prescribingDoctor: 'Dr. Jenkins',
          },
        ],
      },
    });
  });

  after(async () => {
    await User.deleteMany({ email: /test_agent_.*@example\.com/ });
    await AgentAction.deleteMany({});
    await Document.deleteMany({ fileName: /Demo_Agent_Rx/ });
    await Medication.deleteMany({ name: /AgentMed Atorvastatin/ });
    await mongoose.disconnect();
  });

  test('Agent scans records and proposes medication reminder with rationale', async () => {
    const proposed = await agentService.scanAndGenerateActions(testUserId);
    assert.ok(proposed.length >= 1);

    const rxAction = proposed.find((a) => a.actionType === 'SCHEDULE_MEDICATION_REMINDER');
    assert.ok(rxAction);
    assert.strictEqual(rxAction.status, 'PROPOSED');
    assert.ok(rxAction.rationale.includes('Extracted from prescription document'));
    assert.deepStrictEqual(rxAction.supportingData.proposedReminderTimes, ['21:00']);
    assert.strictEqual(rxAction.auditTrail.length, 1);
    assert.strictEqual(rxAction.auditTrail[0].action, 'PROPOSAL_GENERATED');
    assert.strictEqual(rxAction.auditTrail[0].actor, 'AI_AGENT');
  });

  test('Idempotency prevents duplicate proposals on subsequent scans', async () => {
    const initialActions = await agentService.getActions(testUserId);
    const initialCount = initialActions.length;

    // Run second scan
    const secondScan = await agentService.scanAndGenerateActions(testUserId);
    assert.strictEqual(secondScan.length, 0);

    const totalActions = await agentService.getActions(testUserId);
    assert.strictEqual(totalActions.length, initialCount);
  });

  test('Approves and executes action, creating verified medication reminder and audit record', async () => {
    const actions = await agentService.getActions(testUserId, 'PROPOSED');
    const targetAction = actions.find((a) => a.actionType === 'SCHEDULE_MEDICATION_REMINDER');
    assert.ok(targetAction);

    // Approve action with custom time
    const executed = await agentService.approveAction(testUserId, targetAction._id.toString(), {
      supportingData: {
        proposedReminderTimes: ['21:30'],
      },
    });

    assert.strictEqual(executed.status, 'EXECUTED');
    assert.ok(executed.executedAt);
    assert.ok(executed.executionResult.medicationId);

    // Verify Medication record was actually created in DB
    const med = await Medication.findById(executed.executionResult.medicationId);
    assert.ok(med);
    assert.strictEqual(med.name, 'AgentMed Atorvastatin');
    assert.strictEqual(med.dosage, '20 mg');
    assert.deepStrictEqual(med.reminderTimes, ['21:30']);
    assert.strictEqual(med.verificationStatus, 'VERIFIED');

    // Verify Audit trail includes user approval and system execution
    assert.strictEqual(executed.auditTrail.length, 3);
    assert.strictEqual(executed.auditTrail[1].action, 'ACTION_APPROVED');
    assert.strictEqual(executed.auditTrail[1].actor, 'USER');
    assert.strictEqual(executed.auditTrail[2].action, 'ACTION_EXECUTED');
    assert.strictEqual(executed.auditTrail[2].actor, 'SYSTEM');
  });

  test('Rejects action when user chooses dismissal', async () => {
    // Create dummy action
    const dummyAction = await AgentAction.create({
      userId: testUserId,
      triggerEvent: 'FOLLOWUP_OVERDUE',
      actionType: 'CREATE_APPOINTMENT',
      title: 'Dummy Rejection Action',
      description: 'Test dismissal',
      rationale: 'Testing rejection workflow',
      status: 'PROPOSED',
    });

    const rejected = await agentService.rejectAction(testUserId, dummyAction._id.toString(), 'Patient already attended');
    assert.strictEqual(rejected.status, 'REJECTED');
    assert.strictEqual(rejected.auditTrail.length, 1);
    assert.strictEqual(rejected.auditTrail[0].action, 'ACTION_REJECTED');
    assert.strictEqual(rejected.auditTrail[0].details.reason, 'Patient already attended');
  });
});
