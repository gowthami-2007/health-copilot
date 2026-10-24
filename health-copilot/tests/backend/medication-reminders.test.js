const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const medicationService = require('../../backend/src/services/medicationService');
const schedulerService = require('../../backend/src/services/schedulerService');
const Medication = require('../../backend/src/models/Medication');
const User = require('../../backend/src/models/User');
const config = require('../../backend/src/config/env');

describe('Round 2: Medication Reminders & Scheduling Tests', () => {
  let testUserId;
  let unauthorizedUserId;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }
    await User.deleteMany({ email: /test_med_remind_.*@example\.com/ });
    await Medication.deleteMany({ name: /TestRemindMed/ });

    const user = await User.create({
      name: 'Reminder Test User',
      email: `test_med_remind_${Date.now()}@example.com`,
      password: 'HashPassword123!',
      isEmailVerified: true,
    });
    testUserId = user._id.toString();

    const stranger = await User.create({
      name: 'Unauthorized Stranger',
      email: `test_med_remind_stranger_${Date.now()}@example.com`,
      password: 'HashPassword123!',
      isEmailVerified: true,
    });
    unauthorizedUserId = stranger._id.toString();
  });

  after(async () => {
    await User.deleteMany({ email: /test_med_remind_.*@example\.com/ });
    await Medication.deleteMany({ name: /TestRemindMed/ });
    await mongoose.disconnect();
  });

  test('Derives default reminder times from prescription frequency keywords', () => {
    const twiceDaily = medicationService.deriveDefaultReminderTimes('Twice daily with meals');
    assert.deepStrictEqual(twiceDaily, ['08:00', '20:00']);

    const thriceDaily = medicationService.deriveDefaultReminderTimes('Three times daily (TID)');
    assert.deepStrictEqual(thriceDaily, ['08:00', '14:00', '20:00']);

    const bedtime = medicationService.deriveDefaultReminderTimes('Once daily at bedtime');
    assert.deepStrictEqual(bedtime, ['21:00']);
  });

  test('Calculates valid future nextOccurrence date for scheduled reminder', () => {
    const nextOcc = schedulerService.calculateNextOccurrence(['08:00', '20:00']);
    assert.ok(nextOcc instanceof Date);
    assert.ok(!isNaN(nextOcc.getTime()));
  });

  test('Creates medication and persists reminder times and nextOccurrence', async () => {
    const med = await medicationService.createMedication(testUserId, {
      name: 'TestRemindMed Metformin',
      dosage: '500 mg',
      frequency: 'Twice daily',
      instructions: 'Take with morning and evening meals',
      reminderTimes: ['08:30', '20:30'],
    });

    assert.ok(med._id);
    assert.deepStrictEqual(med.reminderTimes, ['08:30', '20:30']);
    assert.ok(med.nextOccurrence);
    assert.strictEqual(med.isReminderActive, true);
    assert.strictEqual(med.confirmationHistory.length, 0);
  });

  test('Records TAKEN dose action, updates confirmationHistory and clears snooze', async () => {
    const med = await Medication.findOne({ userId: testUserId, name: 'TestRemindMed Metformin' });
    assert.ok(med);

    const updated = await medicationService.recordDoseAction(med._id.toString(), testUserId, {
      action: 'TAKEN',
      scheduledTime: '08:30',
      notes: 'Taken with breakfast',
    });

    assert.strictEqual(updated.confirmationHistory.length, 1);
    assert.strictEqual(updated.confirmationHistory[0].action, 'TAKEN');
    assert.strictEqual(updated.confirmationHistory[0].scheduledTime, '08:30');
    assert.strictEqual(updated.snoozeUntil, null);
  });

  test('Records SNOOZED dose action and sets snoozeUntil forward', async () => {
    const med = await Medication.findOne({ userId: testUserId, name: 'TestRemindMed Metformin' });
    assert.ok(med);

    const updated = await medicationService.recordDoseAction(med._id.toString(), testUserId, {
      action: 'SNOOZED',
      scheduledTime: '20:30',
      snoozeMinutes: 20,
    });

    assert.strictEqual(updated.confirmationHistory.length, 2);
    assert.strictEqual(updated.confirmationHistory[0].action, 'SNOOZED');
    assert.ok(updated.snoozeUntil instanceof Date);
    assert.ok(updated.snoozeUntil.getTime() > Date.now());
  });

  test('SECURITY AUDIT: Unauthorized user cannot record dose action for another user medication', async () => {
    const med = await Medication.findOne({ userId: testUserId, name: 'TestRemindMed Metformin' });
    assert.ok(med);

    await assert.rejects(
      async () => {
        await medicationService.recordDoseAction(med._id.toString(), unauthorizedUserId, {
          action: 'TAKEN',
        });
      },
      /Medication not found or access denied/
    );
  });
});
