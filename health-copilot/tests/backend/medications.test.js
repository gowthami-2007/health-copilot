const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const medicationService = require('../../backend/src/services/medicationService');
const User = require('../../backend/src/models/User');
const Medication = require('../../backend/src/models/Medication');
const Timeline = require('../../backend/src/models/Timeline');
const config = require('../../backend/src/config/env');

describe('Phase 8: Medication Management CRUD & Isolation Tests', () => {
  let userMeds;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    userMeds = await User.create({
      name: 'Med Tester',
      email: `med_tester_${Date.now()}@example.com`,
      password: 'SafePassword123!',
    });
  });

  after(async () => {
    if (userMeds) {
      await Medication.deleteMany({ userId: userMeds._id });
      await Timeline.deleteMany({ userId: userMeds._id });
      await User.findByIdAndDelete(userMeds._id);
    }
    await mongoose.disconnect();
  });

  test('MedicationService: creates a medication record and generates timeline event', async () => {
    const med = await medicationService.createMedication(userMeds._id.toString(), {
      name: 'Amoxicillin',
      dosage: '500 mg',
      frequency: 'Three times daily with meals',
      instructions: 'Finish entire 10-day course',
      prescribedBy: 'Dr. House',
      status: 'ACTIVE',
    });

    assert.ok(med._id);
    assert.strictEqual(med.name, 'Amoxicillin');
    assert.strictEqual(med.dosage, '500 mg');

    // Check timeline event was automatically generated
    const timelineEvents = await Timeline.find({ referenceId: med._id });
    assert.strictEqual(timelineEvents.length, 1);
    assert.ok(timelineEvents[0].title.includes('Amoxicillin'));
  });

  test('MedicationService: retrieves medications filtered by status', async () => {
    const activeMeds = await medicationService.getMedications(userMeds._id.toString(), 'ACTIVE');
    assert.strictEqual(activeMeds.length, 1);
  });

  test('MedicationService: updates medication dosage and status', async () => {
    const meds = await medicationService.getMedications(userMeds._id.toString());
    const target = meds[0];

    const updated = await medicationService.updateMedication(
      target._id,
      userMeds._id.toString(),
      { dosage: '250 mg', status: 'PAUSED' }
    );

    assert.strictEqual(updated.dosage, '250 mg');
    assert.strictEqual(updated.status, 'PAUSED');
  });

  test('MedicationService: deletes medication cleanly', async () => {
    const meds = await medicationService.getMedications(userMeds._id.toString());
    const target = meds[0];

    const delRes = await medicationService.deleteMedication(target._id, userMeds._id.toString());
    assert.ok(delRes.message);

    const check = await Medication.findById(target._id);
    assert.strictEqual(check, null);
  });
});
