const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const appointmentService = require('../../backend/src/services/appointmentService');
const User = require('../../backend/src/models/User');
const Appointment = require('../../backend/src/models/Appointment');
const Timeline = require('../../backend/src/models/Timeline');
const config = require('../../backend/src/config/env');

describe('Phase 9: Appointment Management CRUD & Isolation Tests', () => {
  let userApt, intruder;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    userApt = await User.create({
      name: 'Appointment Owner',
      email: `apt_tester_${Date.now()}@example.com`,
      password: 'SafePassword123!',
    });

    intruder = await User.create({
      name: 'Intruder User',
      email: `intruder_${Date.now()}@example.com`,
      password: 'SafePassword123!',
    });
  });

  after(async () => {
    if (userApt) {
      await Appointment.deleteMany({ userId: userApt._id });
      await Timeline.deleteMany({ userId: userApt._id });
      await User.findByIdAndDelete(userApt._id);
    }
    if (intruder) {
      await User.findByIdAndDelete(intruder._id);
    }
    await mongoose.disconnect();
  });

  test('AppointmentService: schedules an appointment and generates timeline entry', async () => {
    const apt = await appointmentService.createAppointment(userApt._id.toString(), {
      doctorName: 'Dr. Gregory House',
      specialty: 'Diagnostics',
      date: new Date(Date.now() + 86400000 * 3),
      time: '02:00 PM',
      location: 'Princeton Hospital, Room 101',
      reason: 'Differential diagnosis consultation',
      status: 'UPCOMING',
    });

    assert.ok(apt._id);
    assert.strictEqual(apt.doctorName, 'Dr. Gregory House');
    assert.strictEqual(apt.status, 'UPCOMING');

    const timeline = await Timeline.find({ referenceId: apt._id });
    assert.strictEqual(timeline.length, 1);
  });

  test('SECURITY AUDIT: Intruder user cannot update Appointment of another patient', async () => {
    const apts = await appointmentService.getAppointments(userApt._id.toString());
    const target = apts[0];

    await assert.rejects(
      async () => {
        await appointmentService.updateAppointment(
          target._id,
          intruder._id.toString(),
          { status: 'CANCELLED' }
        );
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
  });

  test('AppointmentService: marks appointment as completed and records consultation notes', async () => {
    const apts = await appointmentService.getAppointments(userApt._id.toString());
    const target = apts[0];

    const updated = await appointmentService.updateAppointment(
      target._id,
      userApt._id.toString(),
      { status: 'COMPLETED', notes: 'Patient condition stable. Prescribed follow-up.' }
    );

    assert.strictEqual(updated.status, 'COMPLETED');
  });
});
