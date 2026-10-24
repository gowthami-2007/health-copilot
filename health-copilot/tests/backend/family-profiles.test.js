const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const patientProfileService = require('../../backend/src/services/patientProfileService');
const PatientProfile = require('../../backend/src/models/PatientProfile');
const User = require('../../backend/src/models/User');
const config = require('../../backend/src/config/env');

describe('Round 2: Family Health Management & Multi-Profile Tests', () => {
  let userAliceId;
  let userBobId;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }
    await User.deleteMany({ email: /test_family_.*@example\.com/ });
    await PatientProfile.deleteMany({});

    const alice = await User.create({
      name: 'Alice Family Lead',
      email: `test_family_alice_${Date.now()}@example.com`,
      password: 'HashPassword123!',
      isEmailVerified: true,
    });
    userAliceId = alice._id.toString();

    const bob = await User.create({
      name: 'Bob Isolated User',
      email: `test_family_bob_${Date.now()}@example.com`,
      password: 'HashPassword123!',
      isEmailVerified: true,
    });
    userBobId = bob._id.toString();
  });

  after(async () => {
    await User.deleteMany({ email: /test_family_.*@example\.com/ });
    await PatientProfile.deleteMany({});
    await mongoose.disconnect();
  });

  test('Auto-provisions primary Self profile for user on first access', async () => {
    const profiles = await patientProfileService.getProfiles(userAliceId);
    assert.strictEqual(profiles.length, 1);
    assert.strictEqual(profiles[0].relationship, 'Self');
    assert.strictEqual(profiles[0].isPrimary, true);
    assert.strictEqual(profiles[0].name, 'Alice Family Lead');
  });

  test('Allows creating family member profiles under account', async () => {
    const motherProfile = await patientProfileService.createProfile(userAliceId, {
      name: 'Martha Lead',
      relationship: 'Mother',
      gender: 'female',
      dateOfBirth: '1958-03-12',
      chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
    });

    assert.ok(motherProfile._id);
    assert.strictEqual(motherProfile.name, 'Martha Lead');
    assert.strictEqual(motherProfile.relationship, 'Mother');
    assert.strictEqual(motherProfile.isPrimary, false);

    const allProfiles = await patientProfileService.getProfiles(userAliceId);
    assert.strictEqual(allProfiles.length, 2);
  });

  test('SECURITY AUDIT: User Bob cannot view or modify User Alice family profile', async () => {
    const aliceProfiles = await patientProfileService.getProfiles(userAliceId);
    const aliceMother = aliceProfiles.find((p) => p.relationship === 'Mother');
    assert.ok(aliceMother);

    await assert.rejects(
      async () => {
        await patientProfileService.getProfileById(userBobId, aliceMother._id.toString());
      },
      (err) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await patientProfileService.updateProfile(userBobId, aliceMother._id.toString(), {
          name: 'Hacked Name',
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });

  test('Allows updating and switching primary profile', async () => {
    const aliceProfiles = await patientProfileService.getProfiles(userAliceId);
    const motherProfile = aliceProfiles.find((p) => p.relationship === 'Mother');

    const updated = await patientProfileService.updateProfile(userAliceId, motherProfile._id.toString(), {
      bloodGroup: 'B+',
    });
    assert.strictEqual(updated.bloodGroup, 'B+');

    const primarySwitched = await patientProfileService.setPrimary(userAliceId, motherProfile._id.toString());
    assert.strictEqual(primarySwitched.isPrimary, true);

    const refreshedSelf = await patientProfileService.getProfileById(userAliceId, aliceProfiles[0]._id.toString());
    assert.strictEqual(refreshedSelf.isPrimary, false);
  });
});
