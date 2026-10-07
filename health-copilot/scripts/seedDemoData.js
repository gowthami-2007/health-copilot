const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const config = require('../backend/src/config/env');
const User = require('../backend/src/models/User');
const Document = require('../backend/src/models/Document');
const Medication = require('../backend/src/models/Medication');
const Appointment = require('../backend/src/models/Appointment');
const Conversation = require('../backend/src/models/Conversation');
const Message = require('../backend/src/models/Message');
const Timeline = require('../backend/src/models/Timeline');
const { hashPassword } = require('../backend/src/utils/password');

const DEMO_EMAIL = 'demo@healthcopilot.com';
const DEMO_PASSWORD = 'DemoPassword123!';

async function seedDemoData() {
  console.log('🌱 Starting Demo Data Seeding for Health Copilot...');

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
    console.log('Purging previous demo user data...');
    await Document.deleteMany({ userId: existingUser._id });
    await Medication.deleteMany({ userId: existingUser._id });
    await Appointment.deleteMany({ userId: existingUser._id });
    await Conversation.deleteMany({ userId: existingUser._id });
    await Timeline.deleteMany({ userId: existingUser._id });
    await User.findByIdAndDelete(existingUser._id);
  }

  // 2. Create Demo User
  const hashedPassword = await hashPassword(DEMO_PASSWORD);
  const demoUser = await User.create({
    name: 'Alex Johnson',
    email: DEMO_EMAIL,
    password: hashedPassword,
    dateOfBirth: new Date('1988-06-14'),
    gender: 'other',
  });
  console.log(`✅ Demo User Created: ${demoUser.email} (Password: ${DEMO_PASSWORD})`);

  // 3. Create Sample Documents & Physical dummy files
  const samplePdfPath1 = path.join(config.uploadDir, 'demo_complete_blood_count.pdf');
  const samplePdfPath2 = path.join(config.uploadDir, 'demo_lipid_panel.pdf');
  const samplePdfPath3 = path.join(config.uploadDir, 'demo_cardiology_prescription.pdf');

  fs.writeFileSync(samplePdfPath1, '%PDF-1.4 Fictional Medical Report CBC Content');
  fs.writeFileSync(samplePdfPath2, '%PDF-1.4 Fictional Medical Report Lipid Content');
  fs.writeFileSync(samplePdfPath3, '%PDF-1.4 Fictional Medical Report Cardiology Content');

  const doc1 = await Document.create({
    userId: demoUser._id,
    fileName: 'Complete_Blood_Count_Panel.pdf',
    fileUrl: '/uploads/demo_complete_blood_count.pdf',
    fileType: 'application/pdf',
    fileSize: 45200,
    documentType: 'Blood Report',
    extractedText: `
PATIENT: Alex Johnson
AGE: 38 | GENDER: Other
DATE OF COLLECTION: 15 Sep 2026
FACILITY: Metro Health Diagnostic Laboratories

COMPLETE BLOOD COUNT (CBC):
- Hemoglobin: 14.2 g/dL (Reference Range: 13.5 - 17.5 g/dL) [NORMAL]
- White Blood Cell (WBC): 6,400 /mcL (Reference Range: 4,500 - 11,000 /mcL) [NORMAL]
- Red Blood Cell (RBC): 4.8 million/mcL (Reference Range: 4.3 - 5.9 million/mcL) [NORMAL]
- Platelets: 245,000 /mcL (Reference Range: 150,000 - 450,000 /mcL) [NORMAL]
- Hematocrit: 42.1 % (Reference Range: 38.8 - 50.0 %) [NORMAL]
- Fasting Blood Glucose: 92 mg/dL (Reference Range: 70 - 99 mg/dL) [NORMAL]

SUMMARY COMMENTS:
All primary haematological cell counts and fasting glucose are within normal physiological reference ranges.
    `.trim(),
    summary: {
      overview: 'Routine complete blood count (CBC) demonstrating normal haematological values. Hemoglobin, white blood cell count, red blood cell count, and platelets are all within healthy reference limits.',
      keyInformation: [
        'Hemoglobin: 14.2 g/dL (Normal)',
        'White Blood Cell Count: 6,400 /mcL (Normal)',
        'Platelet Count: 245,000 /mcL (Normal)',
        'Fasting Blood Glucose: 92 mg/dL (Normal)',
      ],
      datesMentioned: ['15 Sep 2026'],
      medicationsMentioned: [],
      testsMentioned: ['Complete Blood Count (CBC)', 'Fasting Glucose'],
      doctorQuestions: [
        'Are any additional dietary adjustments recommended based on my baseline energy levels?',
        'When should my next routine screening CBC be scheduled?',
      ],
    },
    chunks: [
      {
        chunkText: 'Hemoglobin: 14.2 g/dL, WBC: 6,400 /mcL, RBC: 4.8 million/mcL, Platelets: 245,000 /mcL. Fasting Blood Glucose: 92 mg/dL. All haematological cell counts within normal reference limits.',
      },
    ],
    status: 'PROCESSED',
    createdAt: new Date('2026-09-15T10:00:00Z'),
  });

  const doc2 = await Document.create({
    userId: demoUser._id,
    fileName: 'Comprehensive_Lipid_Profile.pdf',
    fileUrl: '/uploads/demo_lipid_panel.pdf',
    fileType: 'application/pdf',
    fileSize: 38400,
    documentType: 'Lab Report',
    extractedText: `
PATIENT: Alex Johnson
DATE: 20 Aug 2026
FACILITY: Regional Clinical Pathology

LIPID PANEL MEASUREMENTS:
- Total Cholesterol: 212 mg/dL (Desirable: < 200 mg/dL) [SLIGHTLY ELEVATED]
- HDL Cholesterol ("Good"): 52 mg/dL (Optimal: > 40 mg/dL) [NORMAL]
- LDL Cholesterol ("Bad"): 134 mg/dL (Optimal: < 100 mg/dL) [BORDERLINE HIGH]
- Triglycerides: 148 mg/dL (Normal: < 150 mg/dL) [BORDERLINE NORMAL]

PHYSICIAN RECOMMENDATION:
Recommend maintaining Mediterranean-style cardiovascular nutrition, regular aerobic activity, and monitoring with primary provider.
    `.trim(),
    summary: {
      overview: 'Comprehensive lipid profile showing slightly elevated total cholesterol (212 mg/dL) and borderline elevated LDL cholesterol (134 mg/dL). HDL and triglycerides remain in acceptable range.',
      keyInformation: [
        'Total Cholesterol: 212 mg/dL (Desirable < 200)',
        'HDL Cholesterol: 52 mg/dL (Good)',
        'LDL Cholesterol: 134 mg/dL (Borderline High)',
        'Triglycerides: 148 mg/dL (Normal)',
      ],
      datesMentioned: ['20 Aug 2026'],
      medicationsMentioned: [],
      testsMentioned: ['Lipid Panel', 'Total Cholesterol', 'HDL', 'LDL'],
      doctorQuestions: [
        'Should we consider lifestyle interventions or medication for managing LDL cholesterol?',
        'Would a follow-up lipid retest in 3 to 6 months be beneficial?',
      ],
    },
    chunks: [
      {
        chunkText: 'Lipid Profile: Total Cholesterol 212 mg/dL (Desirable < 200), HDL 52 mg/dL, LDL 134 mg/dL (Borderline High), Triglycerides 148 mg/dL. Mediterranean nutrition and aerobic activity recommended.',
      },
    ],
    status: 'PROCESSED',
    createdAt: new Date('2026-08-20T09:30:00Z'),
  });

  const doc3 = await Document.create({
    userId: demoUser._id,
    fileName: 'Cardiology_Consultation_Prescription.pdf',
    fileUrl: '/uploads/demo_cardiology_prescription.pdf',
    fileType: 'application/pdf',
    fileSize: 42100,
    documentType: 'Prescription',
    extractedText: `
PROVIDER: Dr. Sarah Jenkins, MD - Cardiology
PATIENT: Alex Johnson
DATE: 02 Jul 2026

CLINICAL IMPRESSION:
Mild essential hypertension with familial cardiovascular predisposition.
Blood Pressure in Clinic: 128/82 mmHg.

ACTIVE PRESCRIPTIONS:
1. Lisinopril 10 mg oral tablet - Take 1 tablet once daily in the morning with water.
2. Atorvastatin 20 mg oral tablet - Take 1 tablet once daily at bedtime.
3. Vitamin D3 2000 IU supplement - Take 1 softgel daily with breakfast.

FOLLOW-UP:
Follow up in 3 months for blood pressure review and electrolyte panel.
    `.trim(),
    summary: {
      overview: 'Cardiology consultation note outlining preventative cardiovascular regimen for mild hypertension and lipid management.',
      keyInformation: [
        'Blood Pressure Reading: 128/82 mmHg',
        'Clinical Impression: Mild essential hypertension',
      ],
      datesMentioned: ['02 Jul 2026'],
      medicationsMentioned: ['Lisinopril 10 mg', 'Atorvastatin 20 mg', 'Vitamin D3 2000 IU'],
      testsMentioned: ['Blood pressure check', 'Electrolyte panel'],
      doctorQuestions: [
        'Is home blood pressure monitoring recommended daily or weekly?',
        'Are there any specific side effects to monitor with Lisinopril or Atorvastatin?',
      ],
    },
    chunks: [
      {
        chunkText: 'Prescriptions by Dr. Sarah Jenkins: Lisinopril 10 mg once daily in morning, Atorvastatin 20 mg once daily at bedtime, Vitamin D3 2000 IU daily with breakfast. BP: 128/82 mmHg.',
      },
    ],
    status: 'PROCESSED',
    createdAt: new Date('2026-07-02T14:15:00Z'),
  });
  console.log('✅ 3 Fictional Medical Documents Seeded');

  // 4. Seed Medications
  const med1 = await Medication.create({
    userId: demoUser._id,
    name: 'Atorvastatin',
    dosage: '20 mg',
    frequency: 'Once daily at bedtime',
    instructions: 'Take 1 tablet every night before sleep',
    prescribedBy: 'Dr. Sarah Jenkins',
    notes: 'For lipid balance management',
    status: 'ACTIVE',
    startDate: new Date('2026-07-02'),
  });

  const med2 = await Medication.create({
    userId: demoUser._id,
    name: 'Lisinopril',
    dosage: '10 mg',
    frequency: 'Once daily in morning',
    instructions: 'Take with a full glass of water upon waking',
    prescribedBy: 'Dr. Sarah Jenkins',
    notes: 'For blood pressure control',
    status: 'ACTIVE',
    startDate: new Date('2026-07-02'),
  });

  const med3 = await Medication.create({
    userId: demoUser._id,
    name: 'Vitamin D3',
    dosage: '2000 IU',
    frequency: 'Once daily with meals',
    instructions: 'Take with morning meal',
    prescribedBy: 'Dr. David Miller',
    notes: 'Bone and immune support supplement',
    status: 'ACTIVE',
    startDate: new Date('2026-06-15'),
  });
  console.log('✅ 3 Fictional Medications Seeded');

  // 5. Seed Appointments
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 5);

  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 25);

  const apt1 = await Appointment.create({
    userId: demoUser._id,
    doctorName: 'Dr. Sarah Jenkins',
    specialty: 'Cardiology',
    date: nextWeek,
    time: '10:30 AM',
    location: 'Heart & Vascular Pavilion, Suite 300',
    reason: 'Quarterly blood pressure & lipid consultation review',
    notes: 'Bring home blood pressure readings log',
    status: 'UPCOMING',
  });

  const apt2 = await Appointment.create({
    userId: demoUser._id,
    doctorName: 'Dr. David Miller',
    specialty: 'General Practitioner',
    date: nextMonth,
    time: '02:00 PM',
    location: 'Downtown Family Medicine, Room 12',
    reason: 'Annual wellness exam & preventative screening',
    notes: 'Routine yearly checkup',
    status: 'UPCOMING',
  });
  console.log('✅ 2 Upcoming Appointments Seeded');

  // 6. Seed Timeline Events
  await Timeline.create([
    {
      userId: demoUser._id,
      eventType: 'DOCUMENT',
      title: 'Complete Blood Count (CBC) Recorded',
      description: 'Hemoglobin 14.2 g/dL and normal white blood cell count documented.',
      date: new Date('2026-09-15T10:00:00Z'),
      referenceId: doc1._id,
    },
    {
      userId: demoUser._id,
      eventType: 'DOCUMENT',
      title: 'Lipid Profile Analysis Uploaded',
      description: 'Total cholesterol 212 mg/dL recorded. Lifestyle recommendations provided.',
      date: new Date('2026-08-20T09:30:00Z'),
      referenceId: doc2._id,
    },
    {
      userId: demoUser._id,
      eventType: 'APPOINTMENT',
      title: 'Cardiology Consultation with Dr. Sarah Jenkins',
      description: 'Reviewed cardiovascular vitals (128/82 mmHg). Prescribed Lisinopril and Atorvastatin.',
      date: new Date('2026-07-02T14:15:00Z'),
      referenceId: doc3._id,
    },
    {
      userId: demoUser._id,
      eventType: 'MEDICATION',
      title: 'Started Lisinopril 10 mg & Atorvastatin 20 mg',
      description: 'Initiated daily cardiovascular maintenance regimen.',
      date: new Date('2026-07-02T16:00:00Z'),
      referenceId: med1._id,
    },
    {
      userId: demoUser._id,
      eventType: 'APPOINTMENT',
      title: 'General Wellness Visit with Dr. David Miller',
      description: 'Baseline annual evaluation completed. Added Vitamin D3 supplement.',
      date: new Date('2026-06-15T11:00:00Z'),
    },
  ]);
  console.log('✅ 5 Chronological Timeline Events Seeded');

  // 7. Seed Initial AI Consultation Conversation
  const conv = await Conversation.create({
    userId: demoUser._id,
    title: 'Blood Test & Cholesterol Review',
  });

  await Message.create([
    {
      conversationId: conv._id,
      role: 'user',
      content: 'What was my latest blood test and cholesterol level?',
    },
    {
      conversationId: conv._id,
      role: 'assistant',
      content: 'Based on your uploaded records:\n\n1. **Latest Blood Test:** Your most recent report is the **Complete Blood Count (CBC)** from **15 Sep 2026**, which showed a normal Hemoglobin of 14.2 g/dL, WBC of 6,400 /mcL, and Fasting Glucose of 92 mg/dL.\n2. **Cholesterol Level:** In your **Comprehensive Lipid Profile** from **20 Aug 2026**, your Total Cholesterol was measured at **212 mg/dL** (desirable is < 200 mg/dL) with LDL at 134 mg/dL and HDL at 52 mg/dL.\n\n*Disclaimer: AI-generated information is for informational and organizational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified physician.*',
      sources: [
        { documentId: doc1._id, fileName: 'Complete_Blood_Count_Panel.pdf', excerpt: 'Hemoglobin: 14.2 g/dL, WBC: 6,400 /mcL, Fasting Glucose: 92 mg/dL.' },
        { documentId: doc2._id, fileName: 'Comprehensive_Lipid_Profile.pdf', excerpt: 'Total Cholesterol: 212 mg/dL, LDL: 134 mg/dL, HDL: 52 mg/dL.' },
      ],
    },
  ]);
  console.log('✅ Demo AI Conversation Seeded');

  console.log('\n🎉 DEMO SEED COMPLETE!');
  console.log('----------------------------------------------------');
  console.log(`Email:    ${DEMO_EMAIL}`);
  console.log(`Password: ${DEMO_PASSWORD}`);
  console.log('----------------------------------------------------');
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
