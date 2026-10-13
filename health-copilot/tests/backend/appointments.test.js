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

  test('AppointmentService: schedules a Doctor Consultation and filters by type', async () => {
    const consultation = await appointmentService.createAppointment(userApt._id.toString(), {
      doctorName: 'Dr. Ramesh Kumar',
      specialty: 'Cardiology',
      date: new Date(Date.now() + 86400000 * 5),
      time: '11:30 AM',
      location: 'Apollo Heart Center',
      reason: 'Hypertension evaluation',
      notes: 'Bring ECG report',
      type: 'CONSULTATION',
      status: 'UPCOMING',
    });

    assert.ok(consultation._id);
    assert.strictEqual(consultation.type, 'CONSULTATION');
    assert.strictEqual(consultation.doctorName, 'Dr. Ramesh Kumar');

    // Test filter by type=CONSULTATION
    const consultOnly = await appointmentService.getAppointments(userApt._id.toString(), 'ALL', 'CONSULTATION');
    assert.ok(consultOnly.some((c) => c._id.toString() === consultation._id.toString()));
    assert.ok(consultOnly.every((c) => c.type === 'CONSULTATION'));

    // Test filter by type=APPOINTMENT
    const aptsOnly = await appointmentService.getAppointments(userApt._id.toString(), 'ALL', 'APPOINTMENT');
    assert.ok(aptsOnly.every((a) => a.type === 'APPOINTMENT'));
  });

  test('MedicalExtractionService: extracts both appointment and doctor consultation from clinical document text', async () => {
    const medicalExtractionService = require('../../backend/src/services/medicalExtractionService');

    const sampleDocText = `
APOLLO SPECIALTY HOSPITALS
Cardiology Consultation Slip
Doctor: Dr. Ramesh Kumar, MD (Cardiologist)
Date of Consultation: 12/10/2026
Time: 10:30 AM
Patient: John Doe
Diagnosis: Mild Essential Hypertension
Prescription:
Tab Amlodipine 5mg 1-0-0 after food
Next Appointment: 26/10/2026 at 11:00 AM
Follow-up instructions: Check BP daily for 2 weeks
    `;

    const extracted = medicalExtractionService.extractWithRules(sampleDocText);

    assert.ok(extracted.appointments.length >= 1, 'Should extract at least one appointment');
    assert.ok(extracted.consultations.length >= 1, 'Should extract at least one consultation');

    const apt = extracted.appointments[0];
    assert.strictEqual(apt.doctorName, 'Dr. Ramesh Kumar');
    assert.strictEqual(apt.specialty, 'Cardiology');
    assert.strictEqual(apt.type, 'APPOINTMENT');
    assert.strictEqual(apt.date.getFullYear(), 2026);
    assert.strictEqual(apt.date.getMonth(), 9); // October is month 9 (0-indexed)
    assert.strictEqual(apt.date.getDate(), 26);

    const con = extracted.consultations[0];
    assert.strictEqual(con.doctorName, 'Dr. Ramesh Kumar');
    assert.strictEqual(con.specialty, 'Cardiology');
    assert.strictEqual(con.type, 'CONSULTATION');
    assert.strictEqual(con.date.getFullYear(), 2026);
    assert.strictEqual(con.date.getDate(), 12);
  });
});
