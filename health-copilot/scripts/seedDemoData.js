const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const config = require('../backend/src/config/env');
const User = require('../backend/src/models/User');
const PatientProfile = require('../backend/src/models/PatientProfile');
const Document = require('../backend/src/models/Document');
const Medication = require('../backend/src/models/Medication');
const Appointment = require('../backend/src/models/Appointment');
const Conversation = require('../backend/src/models/Conversation');
const Message = require('../backend/src/models/Message');
const Timeline = require('../backend/src/models/Timeline');
const WellnessRecommendation = require('../backend/src/models/WellnessRecommendation');
const AgentAction = require('../backend/src/models/AgentAction');
const { hashPassword } = require('../backend/src/utils/password');

const DEMO_EMAIL = 'demo@healthcopilot.com';
const DEMO_PASSWORD = 'DemoPassword123!';

async function seedDemoData() {
  console.log('🌱 Starting Demo Data Seeding for Health Copilot Round 2...');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.mongodbUri);
  }

  // Ensure upload directory exists
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }

  // 1. Clean up previous demo user if exists
  const existingUser = await User.findOne({ email: DEMO_EMAIL });
  if (existingUser) {
    console.log('Purging previous demo user data & family records...');
    await PatientProfile.deleteMany({ userId: existingUser._id });
    await Document.deleteMany({ userId: existingUser._id });
    await Medication.deleteMany({ userId: existingUser._id });
    await Appointment.deleteMany({ userId: existingUser._id });
    await Conversation.deleteMany({ userId: existingUser._id });
    await Timeline.deleteMany({ userId: existingUser._id });
    await WellnessRecommendation.deleteMany({ userId: existingUser._id });
    await AgentAction.deleteMany({ userId: existingUser._id });
    await User.findByIdAndDelete(existingUser._id);
  }

  // 2. Create Demo Account
  const hashedPassword = await hashPassword(DEMO_PASSWORD);
  const demoUser = await User.create({
    name: 'Alex Johnson',
    email: DEMO_EMAIL,
    password: hashedPassword,
    dateOfBirth: new Date('1988-06-14'),
    gender: 'other',
    isEmailVerified: true,
  });
  console.log(`✅ Demo User Created: ${demoUser.email} (Password: ${DEMO_PASSWORD})`);

  // 3. Create Multi-Profile Family Records
  // Profile A: Primary User (Alex Johnson - Self)
  const alexProfile = await PatientProfile.create({
    userId: demoUser._id,
    name: 'Alex Johnson',
    relationship: 'Self',
    dateOfBirth: new Date('1988-06-14'),
    gender: 'other',
    bloodGroup: 'O+',
    allergies: ['Penicillin'],
    chronicConditions: ['Mild Essential Hypertension', 'Pre-diabetes'],
    isPrimary: true,
  });

  // Profile B: Family Member (Martha Johnson - Mother)
  const marthaProfile = await PatientProfile.create({
    userId: demoUser._id,
    name: 'Martha Johnson',
    relationship: 'Mother',
    dateOfBirth: new Date('1958-03-22'),
    gender: 'female',
    bloodGroup: 'B+',
    allergies: ['Sulfa drugs'],
    chronicConditions: ['Type 2 Diabetes', 'Osteoarthritis'],
    isPrimary: false,
    notes: 'Elderly care with scheduled morning medication assistance.',
  });
  console.log('✅ 2 Family Profiles Seeded: Alex Johnson (Self) & Martha Johnson (Mother)');

  // 4. Create Physical dummy files for documents
  const samplePdfPath1 = path.join(config.uploadDir, 'demo_blood_report_feb2026.pdf');
  const samplePdfPath2 = path.join(config.uploadDir, 'demo_lipid_may2026.pdf');
  const samplePdfPath3 = path.join(config.uploadDir, 'demo_comprehensive_sep2026.pdf');
  const samplePdfPath4 = path.join(config.uploadDir, 'demo_cardiology_prescription.pdf');

  fs.writeFileSync(samplePdfPath1, '%PDF-1.4 Fictional Medical Report Feb 2026');
  fs.writeFileSync(samplePdfPath2, '%PDF-1.4 Fictional Medical Report May 2026');
  fs.writeFileSync(samplePdfPath3, '%PDF-1.4 Fictional Medical Report Sep 2026');
  fs.writeFileSync(samplePdfPath4, '%PDF-1.4 Fictional Cardiology Prescription');

  // Report 1: 10 Feb 2026 - Baseline HbA1c 6.8%, Fasting Glucose 102, Total Cholesterol 228 mg/dL
  const doc1 = await Document.create({
    userId: demoUser._id,
    patientProfileId: alexProfile._id,
    fileName: 'Baseline_Metabolic_Panel_Feb2026.pdf',
    fileUrl: '/uploads/demo_blood_report_feb2026.pdf',
    fileType: 'application/pdf',
    fileSize: 41200,
    documentType: 'Blood Report',
    extractedText: `
PATIENT: Alex Johnson
DATE: 10 Feb 2026
FACILITY: Metro Health Diagnostic Laboratories

LABORATORY RESULTS:
- HbA1c (Glycated Hemoglobin): 6.8 % (Reference Range: 4.0 - 5.6 %) [ELEVATED]
- Fasting Blood Sugar: 102 mg/dL (Reference Range: 70 - 99 mg/dL) [BORDERLINE]
- Total Cholesterol: 228 mg/dL (Reference Range: 125 - 200 mg/dL) [HIGH]
- Hemoglobin: 14.0 g/dL (Reference Range: 13.5 - 17.5 g/dL) [NORMAL]
    `.trim(),
    summary: {
      overview: 'Baseline metabolic testing showing early dysglycemia (HbA1c 6.8%) and elevated total cholesterol (228 mg/dL).',
      keyInformation: [
        'HbA1c: 6.8% (Elevated, ref 4.0-5.6%)',
        'Fasting Blood Sugar: 102 mg/dL',
        'Total Cholesterol: 228 mg/dL (High)',
      ],
      datesMentioned: ['10 Feb 2026'],
      testsMentioned: ['HbA1c', 'Fasting Blood Sugar', 'Total Cholesterol'],
    },
    chunks: [
      { chunkText: 'HbA1c: 6.8 % (Ref 4.0-5.6%), Fasting Blood Sugar: 102 mg/dL, Total Cholesterol: 228 mg/dL. Baseline metabolic review.' },
    ],
    status: 'PROCESSED',
    createdAt: new Date('2026-02-10T09:00:00Z'),
  });

  // Report 2: 18 May 2026 - Second measurement: HbA1c 7.1%, Fasting Glucose 110, Total Cholesterol 212 mg/dL
  const doc2 = await Document.create({
    userId: demoUser._id,
    patientProfileId: alexProfile._id,
    fileName: 'Followup_Metabolic_Report_May2026.pdf',
    fileUrl: '/uploads/demo_lipid_may2026.pdf',
    fileType: 'application/pdf',
    fileSize: 39500,
    documentType: 'Lab Report',
    extractedText: `
PATIENT: Alex Johnson
DATE: 18 May 2026
FACILITY: Regional Clinical Pathology

LABORATORY RESULTS:
- HbA1c (Glycated Hemoglobin): 7.1 % (Reference Range: 4.0 - 5.6 %) [ELEVATED]
- Fasting Blood Sugar: 110 mg/dL (Reference Range: 70 - 99 mg/dL) [ELEVATED]
- Total Cholesterol: 212 mg/dL (Reference Range: 125 - 200 mg/dL) [SLIGHTLY ELEVATED]
- LDL Cholesterol: 134 mg/dL (Reference Range: 50 - 100 mg/dL) [BORDERLINE HIGH]
- HDL Cholesterol: 52 mg/dL (Reference Range: 40 - 60 mg/dL) [NORMAL]
    `.trim(),
    summary: {
      overview: 'Intermediate follow-up showing upward trend in HbA1c to 7.1% and fasting blood sugar to 110 mg/dL. Total cholesterol reduced slightly to 212 mg/dL.',
      keyInformation: [
        'HbA1c: 7.1% (Increased from 6.8%)',
        'Fasting Glucose: 110 mg/dL',
        'Total Cholesterol: 212 mg/dL (Improving from 228)',
      ],
      datesMentioned: ['18 May 2026'],
      testsMentioned: ['HbA1c', 'Total Cholesterol', 'LDL Cholesterol', 'HDL Cholesterol'],
    },
    chunks: [
      { chunkText: 'HbA1c: 7.1 % (Ref 4.0-5.6%), Fasting Glucose: 110 mg/dL, Total Cholesterol: 212 mg/dL, LDL: 134 mg/dL, HDL: 52 mg/dL.' },
    ],
    status: 'PROCESSED',
    createdAt: new Date('2026-05-18T10:30:00Z'),
  });

  // Report 3: 15 Sep 2026 - Latest report: HbA1c 7.4%, Fasting Glucose 118, Total Cholesterol 195 mg/dL, Hemoglobin 14.2 g/dL
  const doc3 = await Document.create({
    userId: demoUser._id,
    patientProfileId: alexProfile._id,
    fileName: 'Comprehensive_Panel_Sep2026.pdf',
    fileUrl: '/uploads/demo_comprehensive_sep2026.pdf',
    fileType: 'application/pdf',
    fileSize: 45200,
    documentType: 'Blood Report',
    extractedText: `
PATIENT: Alex Johnson
DATE: 15 Sep 2026
FACILITY: Metro Health Diagnostic Laboratories

LABORATORY OBSERVATIONS:
- HbA1c (Glycated Hemoglobin): 7.4 % (Reference Range: 4.0 - 5.6 %) [ABOVE RANGE]
- Fasting Blood Sugar: 118 mg/dL (Reference Range: 70 - 99 mg/dL) [ABOVE RANGE]
- Total Cholesterol: 195 mg/dL (Reference Range: 125 - 200 mg/dL) [NORMAL / GOAL ACHIEVED]
- Hemoglobin: 14.2 g/dL (Reference Range: 13.5 - 17.5 g/dL) [NORMAL]
- Platelets: 245,000 /mcL (Reference Range: 150,000 - 450,000 /mcL) [NORMAL]
- Serum Creatinine: 0.9 mg/dL (Reference Range: 0.6 - 1.2 mg/dL) [NORMAL]
    `.trim(),
    summary: {
      overview: 'Latest diagnostic evaluation demonstrates upward glycemic trajectory (HbA1c 7.4%) requiring clinician review. Total cholesterol has normalized to 195 mg/dL on current regimen.',
      keyInformation: [
        'Latest HbA1c: 7.4% (Reference Range: 4.0 - 5.6%) [Above Range]',
        'Total Cholesterol: 195 mg/dL [Normal Range Reached]',
        'Hemoglobin: 14.2 g/dL [Normal]',
        'Serum Creatinine: 0.9 mg/dL [Normal]',
      ],
      datesMentioned: ['15 Sep 2026'],
      testsMentioned: ['HbA1c', 'Total Cholesterol', 'Hemoglobin', 'Serum Creatinine'],
    },
    chunks: [
      { chunkText: 'Latest HbA1c: 7.4 % (Ref 4.0-5.6%), Fasting Blood Sugar: 118 mg/dL, Total Cholesterol: 195 mg/dL (Normal), Hemoglobin: 14.2 g/dL.' },
    ],
    status: 'PROCESSED',
    createdAt: new Date('2026-09-15T11:00:00Z'),
  });

  // Report 4: Cardiology Prescription
  const doc4 = await Document.create({
    userId: demoUser._id,
    patientProfileId: alexProfile._id,
    fileName: 'Cardiology_Consultation_Prescription.pdf',
    fileUrl: '/uploads/demo_cardiology_prescription.pdf',
    fileType: 'application/pdf',
    fileSize: 42100,
    documentType: 'Prescription',
    extractedText: `
PROVIDER: Dr. Sarah Jenkins, MD - Cardiology
PATIENT: Alex Johnson
DATE: 02 Jul 2026

PRESCRIPTIONS:
1. Lisinopril 10 mg oral tablet - Take 1 tablet once daily in the morning at 08:00 AM with water.
2. Atorvastatin 20 mg oral tablet - Take 1 tablet once daily at bedtime (20:00 PM).
3. Vitamin D3 2000 IU supplement - Take 1 softgel daily with breakfast.

FOLLOW-UP RECOMMENDATION:
Cardiology clinical review recommended in 8-10 weeks to evaluate blood pressure response.
    `.trim(),
    summary: {
      overview: 'Prescriptions for mild essential hypertension and lipid management.',
      keyInformation: [
        'Lisinopril 10 mg: Daily in morning',
        'Atorvastatin 20 mg: Daily at bedtime',
      ],
      datesMentioned: ['02 Jul 2026'],
      medicationsMentioned: ['Lisinopril 10 mg', 'Atorvastatin 20 mg'],
    },
    chunks: [
      { chunkText: 'Dr. Sarah Jenkins: Lisinopril 10 mg at 08:00 AM, Atorvastatin 20 mg at 20:00 PM.' },
    ],
    status: 'PROCESSED',
    createdAt: new Date('2026-07-02T14:00:00Z'),
  });
  console.log('✅ 4 Longitudinal Medical Documents Seeded (HbA1c: 6.8% -> 7.1% -> 7.4%, Chol: 228 -> 212 -> 195)');

  // 5. Seed Medications with Durable Schedules & Next Occurrence
  const todayMorning = new Date();
  todayMorning.setHours(8, 0, 0, 0);

  const todayEvening = new Date();
  todayEvening.setHours(20, 0, 0, 0);

  const med1 = await Medication.create({
    userId: demoUser._id,
    patientProfileId: alexProfile._id,
    name: 'Lisinopril',
    dosage: '10 mg',
    frequency: 'Once daily in morning',
    instructions: 'Take 1 tablet every morning at 08:00 AM with water',
    prescribedBy: 'Dr. Sarah Jenkins',
    reminderTimes: ['08:00'],
    isReminderActive: true,
    nextOccurrence: todayMorning,
    status: 'ACTIVE',
    startDate: new Date('2026-07-02'),
    confirmationHistory: [
      { scheduledTime: todayMorning, action: 'TAKEN', timestamp: new Date() },
    ],
  });

  const med2 = await Medication.create({
    userId: demoUser._id,
    patientProfileId: alexProfile._id,
    name: 'Atorvastatin',
    dosage: '20 mg',
    frequency: 'Once daily at bedtime',
    instructions: 'Take 1 tablet every night at 20:00 PM before sleep',
    prescribedBy: 'Dr. Sarah Jenkins',
    reminderTimes: ['20:00'],
    isReminderActive: true,
    nextOccurrence: todayEvening,
    status: 'ACTIVE',
    startDate: new Date('2026-07-02'),
  });

  // Martha Johnson's isolated medication
  await Medication.create({
    userId: demoUser._id,
    patientProfileId: marthaProfile._id,
    name: 'Metformin',
    dosage: '500 mg',
    frequency: 'Twice daily with meals',
    instructions: 'Take with morning and evening meals',
    prescribedBy: 'Dr. David Miller',
    reminderTimes: ['09:00', '19:00'],
    isReminderActive: true,
    status: 'ACTIVE',
    startDate: new Date('2025-11-10'),
  });
  console.log('✅ Medications with Active Schedules Seeded (Alex: Lisinopril, Atorvastatin | Martha: Metformin)');

  // 6. Seed Appointments with Overdue Follow-up Detection
  // Overdue Follow-up for Alex: Originally scheduled for Sep 1, 2026
  await Appointment.create({
    userId: demoUser._id,
    patientProfileId: alexProfile._id,
    doctorName: 'Dr. Sarah Jenkins',
    specialty: 'Cardiology',
    hospital: 'Metro Heart Care Institute',
    date: new Date('2026-09-01T10:00:00Z'),
    time: '10:00 AM',
    reason: 'Follow-up on Lisinopril 10mg blood pressure response & electrolyte panel',
    status: 'UPCOMING',
    isOverdueFollowup: true,
    reminderSent: true,
  });

  // Future scheduled appointment
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 15);
  await Appointment.create({
    userId: demoUser._id,
    patientProfileId: alexProfile._id,
    doctorName: 'Dr. David Miller',
    specialty: 'Internal Medicine',
    hospital: 'City Wellness Center',
    date: nextMonth,
    time: '02:30 PM',
    reason: 'Routine annual checkup and comprehensive metabolic panel review',
    status: 'UPCOMING',
    isOverdueFollowup: false,
  });
  console.log('✅ Appointments Seeded (Including 1 Overdue Follow-up with Dr. Sarah Jenkins)');

  // 7. Seed Personalized Wellness Recommendations (6 Categories)
  await WellnessRecommendation.create([
    {
      userId: demoUser._id,
      patientProfileId: alexProfile._id,
      category: 'NUTRITION',
      title: 'Maintain Consistent Fiber-Rich Complex Carbohydrates',
      practicalAction: 'Pair carbohydrates with lean protein and soluble fiber to temper post-meal blood glucose spikes.',
      reason: 'Your HbA1c has shown an upward trend across your last 3 reports (6.8% -> 7.1% -> 7.4%).',
      supportingRecords: [{ recordType: 'Document', recordId: doc3._id, description: doc3.fileName }],
      limitations: 'General lifestyle education. Do not make severe dietary changes without clinical guidance.',
      urgency: 'HIGH',
      status: 'ACTIVE',
    },
    {
      userId: demoUser._id,
      patientProfileId: alexProfile._id,
      category: 'PHYSICAL_ACTIVITY',
      title: 'Maintain 150 Minutes of Moderate Aerobic Movement Weekly',
      practicalAction: 'Aim for a 30-minute brisk walk 5 days a week, especially after major meals.',
      reason: 'Physical activity improves insulin sensitivity and contributed to your Total Cholesterol reduction from 228 to 195 mg/dL.',
      supportingRecords: [{ recordType: 'Document', recordId: doc2._id, description: doc2.fileName }],
      limitations: 'Consult your cardiologist if you experience chest tightness, dizziness, or shortness of breath.',
      urgency: 'MEDIUM',
      status: 'ACTIVE',
    },
    {
      userId: demoUser._id,
      patientProfileId: alexProfile._id,
      category: 'FOLLOWUP_PREP',
      title: 'Schedule Your Overdue Cardiology Follow-up',
      practicalAction: 'Contact Dr. Sarah Jenkins to evaluate blood pressure control and schedule your repeat electrolyte panel.',
      reason: 'Your cardiology consultation note of July 2026 recommended a follow-up visit which was due in early September.',
      supportingRecords: [{ recordType: 'Document', recordId: doc4._id, description: doc4.fileName }],
      urgency: 'HIGH',
      status: 'ACTIVE',
    },
    {
      userId: demoUser._id,
      patientProfileId: alexProfile._id,
      category: 'MEDICATION_ADHERENCE',
      title: 'Consistent Morning Administration of Lisinopril',
      practicalAction: 'Take your Lisinopril 10mg daily at 08:00 AM with water to maintain steady 24-hour blood pressure control.',
      reason: 'Active prescription for mild essential hypertension.',
      supportingRecords: [{ recordType: 'Document', recordId: doc4._id, description: doc4.fileName }],
      urgency: 'MEDIUM',
      status: 'ACTIVE',
    },
  ]);
  console.log('✅ Personalized Wellness Guidance Seeded across Categories');

  // 8. Seed Proactive Agent Action (Ready for Demonstration)
  await AgentAction.create({
    userId: demoUser._id,
    patientProfileId: alexProfile._id,
    triggerEvent: 'PRESCRIPTION_PROCESSED',
    actionType: 'SCHEDULE_MEDICATION_REMINDER',
    title: 'Schedule Proactive Reminder for Lisinopril 10 mg',
    description: 'Daily oral dose recommended at 08:00 AM with water.',
    proposal: {
      title: 'Schedule Proactive Reminder for Lisinopril 10 mg',
      description: 'Prescription extracted from Cardiology Note: Daily oral dose recommended at 08:00 AM with water.',
      medicationName: 'Lisinopril',
      dosage: '10 mg',
      reminderTimes: ['08:00'],
      channel: 'IN_APP',
    },
    rationale: 'Detected newly extracted prescription in Cardiology Note dated 02 Jul 2026 without an automated reminder schedule.',
    supportingData: {
      documentId: doc4._id,
      documentName: doc4.fileName,
      prescriptionDate: doc4.createdAt,
    },
    status: 'PROPOSED',
    idempotencyKey: `presc_reminder_${alexProfile._id}_Lisinopril`,
    auditTrail: [
      {
        action: 'DETECTED',
        actor: 'AGENT_SYSTEM',
        details: 'Extracted prescription from Cardiology_Consultation_Prescription.pdf.',
        timestamp: new Date(),
      },
      {
        action: 'PROPOSED',
        actor: 'AGENT_SYSTEM',
        details: 'Proposed daily 08:00 AM in-app notification schedule. Awaiting human-in-the-loop approval.',
        timestamp: new Date(),
      },
    ],
  });
  console.log('✅ Proactive Agent Proposal Seeded (PROPOSED)');

  // 9. Seed Chronological Timeline
  await Timeline.create([
    {
      userId: demoUser._id,
      patientProfileId: alexProfile._id,
      eventType: 'DOCUMENT',
      title: 'Comprehensive Panel Uploaded',
      description: 'HbA1c 7.4% recorded. Total cholesterol normalized to 195 mg/dL.',
      date: new Date('2026-09-15T11:00:00Z'),
      referenceId: doc3._id,
    },
    {
      userId: demoUser._id,
      patientProfileId: alexProfile._id,
      eventType: 'DOCUMENT',
      title: 'Follow-up Metabolic Report Uploaded',
      description: 'HbA1c 7.1% and fasting glucose 110 mg/dL recorded.',
      date: new Date('2026-05-18T10:30:00Z'),
      referenceId: doc2._id,
    },
    {
      userId: demoUser._id,
      patientProfileId: alexProfile._id,
      eventType: 'DOCUMENT',
      title: 'Baseline Metabolic Panel Uploaded',
      description: 'Baseline HbA1c 6.8% and total cholesterol 228 mg/dL recorded.',
      date: new Date('2026-02-10T09:00:00Z'),
      referenceId: doc1._id,
    },
    {
      userId: demoUser._id,
      patientProfileId: alexProfile._id,
      eventType: 'MEDICATION',
      title: 'Initiated Lisinopril 10 mg & Atorvastatin 20 mg Regimen',
      description: 'Started cardiovascular preventive regimen prescribed by Dr. Sarah Jenkins.',
      date: new Date('2026-07-02T16:00:00Z'),
      referenceId: med1._id,
    },
  ]);
  console.log('✅ Chronological Timeline Events Seeded');

  console.log('\n🎉 ROUND 2 DEMO SEED COMPLETE!');
  console.log('====================================================');
  console.log(`Demo Account:  ${DEMO_EMAIL}`);
  console.log(`Password:      ${DEMO_PASSWORD}`);
  console.log(`Primary Patient: Alex Johnson (Self)`);
  console.log(`Family Member:   Martha Johnson (Mother)`);
  console.log('====================================================\n');
}

if (require.main === module) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = { seedDemoData };
