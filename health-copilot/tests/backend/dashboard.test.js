const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const dashboardService = require('../../backend/src/services/dashboardService');
const User = require('../../backend/src/models/User');
const Document = require('../../backend/src/models/Document');
const Medication = require('../../backend/src/models/Medication');
const Appointment = require('../../backend/src/models/Appointment');
const config = require('../../backend/src/config/env');

describe('Phase 3: Dashboard Service & Data Isolation Tests', () => {
  let userA, userB;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    // Create User A
    userA = await User.create({
      name: 'Alice Dashboard',
      email: `alice_${Date.now()}@example.com`,
      password: 'HashPassword123!',
    });

    // Create User B
    userB = await User.create({
      name: 'Bob Dashboard',
      email: `bob_${Date.now()}@example.com`,
      password: 'HashPassword123!',
    });

    // Seed document for User A
    await Document.create({
      userId: userA._id,
      fileName: 'Alice_Blood_Panel.pdf',
      fileUrl: '/uploads/alice.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      documentType: 'Blood Report',
      status: 'PROCESSED',
    });

    // Seed document for User B
    await Document.create({
      userId: userB._id,
      fileName: 'Bob_Secret_Report.pdf',
      fileUrl: '/uploads/bob.pdf',
      fileType: 'application/pdf',
      fileSize: 2048,
      documentType: 'Lab Report',
      status: 'PROCESSED',
    });

    // Seed medication for User A
    await Medication.create({
      userId: userA._id,
      name: 'Atorvastatin',
      dosage: '20 mg',
      frequency: 'Once daily at bedtime',
      status: 'ACTIVE',
    });

    // Seed appointment for User A
    await Appointment.create({
      userId: userA._id,
      doctorName: 'Dr. Gregory House',
      specialty: 'Diagnostics',
      date: new Date(Date.now() + 86400000 * 2), // 2 days in future
      time: '10:00 AM',
      status: 'UPCOMING',
    });
  });

  after(async () => {
    if (userA) {
      await Document.deleteMany({ userId: userA._id });
      await Medication.deleteMany({ userId: userA._id });
      await Appointment.deleteMany({ userId: userA._id });
      await User.findByIdAndDelete(userA._id);
    }
    if (userB) {
      await Document.deleteMany({ userId: userB._id });
      await Medication.deleteMany({ userId: userB._id });
      await Appointment.deleteMany({ userId: userB._id });
      await User.findByIdAndDelete(userB._id);
    }
    await mongoose.disconnect();
  });

  test('DashboardService: returns accurate counts and greeting for User A', async () => {
    const data = await dashboardService.getDashboardData(userA._id.toString());

    assert.ok(data);
    assert.ok(data.greeting);
    assert.strictEqual(data.stats.documents, 1);
    assert.strictEqual(data.stats.medications, 1);
    assert.strictEqual(data.stats.appointments, 1);
    assert.strictEqual(data.recentDocuments.length, 1);
    assert.strictEqual(data.recentDocuments[0].fileName, 'Alice_Blood_Panel.pdf');
    assert.strictEqual(data.medications.length, 1);
    assert.strictEqual(data.medications[0].name, 'Atorvastatin');
    assert.strictEqual(data.upcomingAppointments.length, 1);
    assert.strictEqual(data.upcomingAppointments[0].doctorName, 'Dr. Gregory House');
  });

  test('Data Isolation: User A dashboard NEVER exposes User B documents or records', async () => {
    const dataA = await dashboardService.getDashboardData(userA._id.toString());
    const docNames = dataA.recentDocuments.map((d) => d.fileName);

    assert.ok(!docNames.includes('Bob_Secret_Report.pdf'), 'User B document must not appear in User A dashboard');
  });
});
