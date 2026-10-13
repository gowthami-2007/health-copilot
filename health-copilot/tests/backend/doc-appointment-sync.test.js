const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const documentService = require('../../backend/src/services/documentService');
const appointmentService = require('../../backend/src/services/appointmentService');
const User = require('../../backend/src/models/User');
const Document = require('../../backend/src/models/Document');
const Appointment = require('../../backend/src/models/Appointment');
const Timeline = require('../../backend/src/models/Timeline');
const config = require('../../backend/src/config/env');

describe('Auto-Extraction & Synchronization of Appointments & Doctor Consultations from Documents', () => {
  let user, testFilePath, userDir;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    user = await User.create({
      name: 'Sync Tester Patient',
      email: `sync_tester_${Date.now()}@example.com`,
      password: 'SafePassword123!',
    });

    userDir = path.resolve(config.uploadDir, user._id.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const { generateClinicalReportPdf } = require('../../backend/src/utils/pdfGenerator');
    const pdfBuffer = generateClinicalReportPdf({
      hospitalName: 'Apollo Specialty Hospitals - Department of Endocrinology, Dr. Arvind Swamy Clinic',
      patientName: 'Sync Tester Patient',
      reportTitle: 'Doctor Consultation Slip with Dr. Arvind Swamy',
      reportDate: '14/10/2026',
      provenance: 'OPD Consultation Slip. Time: 11:30 AM',
      labResults: [],
      prescriptions: [
        {
          medicationName: 'Tab Metformin 500mg',
          dosage: '500mg',
          frequency: '1-0-1',
          instructions: 'After meals. Next Appointment: 28/10/2026 at 10:00 AM',
        },
      ],
    });

    const fileName = `test_consultation_${Date.now()}.pdf`;
    testFilePath = path.join(userDir, fileName);
    fs.writeFileSync(testFilePath, pdfBuffer);
  });

  after(async () => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (user) {
      await Appointment.deleteMany({ userId: user._id });
      await Document.deleteMany({ userId: user._id });
      await Timeline.deleteMany({ userId: user._id });
      await User.findByIdAndDelete(user._id);
    }
    await mongoose.disconnect();
  });

  test('processDocument: extracts consultation and appointment, creates records in database', async () => {
    const rawFileName = path.basename(testFilePath);
    const newDoc = await Document.create({
      userId: user._id,
      fileName: rawFileName,
      fileUrl: `/api/documents/test/file`,
      storagePath: path.join(user._id.toString(), rawFileName),
      fileType: 'application/pdf',
      fileSize: fs.statSync(testFilePath).size,
      documentType: 'Doctor Note',
      status: 'UPLOADED',
    });

    await documentService.processDocument(newDoc._id, user._id);

    const processedDoc = await Document.findById(newDoc._id);
    assert.strictEqual(processedDoc.status, 'PROCESSED');

    // Verify Appointments collection for this user
    const apts = await Appointment.find({ userId: user._id });
    assert.ok(apts.length >= 2, `Expected at least 2 records (1 appointment, 1 consultation), found ${apts.length}`);

    const consultation = apts.find((a) => a.type === 'CONSULTATION');
    assert.ok(consultation, 'Should create a CONSULTATION record');
    assert.strictEqual(consultation.doctorName, 'Dr. Arvind Swamy');
    assert.strictEqual(consultation.specialty, 'Endocrinology');
    assert.strictEqual(consultation.autoExtracted, true);
    assert.strictEqual(consultation.sourceDocumentId.toString(), newDoc._id.toString());

    const appointment = apts.find((a) => a.type === 'APPOINTMENT');
    assert.ok(appointment, 'Should create an APPOINTMENT record');
    assert.strictEqual(appointment.doctorName, 'Dr. Arvind Swamy');
    assert.strictEqual(appointment.autoExtracted, true);
    assert.strictEqual(appointment.sourceDocumentId.toString(), newDoc._id.toString());

    // Verify Timeline entries
    const timelineEntries = await Timeline.find({ userId: user._id, eventType: 'APPOINTMENT' });
    assert.ok(timelineEntries.length >= 2, 'Should create timeline events for both records');

    // Verify appointmentService filtering works
    const consultOnly = await appointmentService.getAppointments(user._id.toString(), 'ALL', 'CONSULTATION');
    assert.strictEqual(consultOnly.length, 1);
    assert.strictEqual(consultOnly[0].type, 'CONSULTATION');
    assert.strictEqual(consultOnly[0].sourceDocumentId.fileName, rawFileName);

    const aptOnly = await appointmentService.getAppointments(user._id.toString(), 'ALL', 'APPOINTMENT');
    assert.strictEqual(aptOnly.length, 1);
    assert.strictEqual(aptOnly[0].type, 'APPOINTMENT');
  });
});
