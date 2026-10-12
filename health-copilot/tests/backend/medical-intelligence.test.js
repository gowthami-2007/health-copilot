const test = require('node:test');
const assert = require('node:assert/strict');
const medicalExtractionService = require('../../backend/src/services/medicalExtractionService');
const fhirService = require('../../backend/src/services/fhirService');

test('Medical Intelligence: Extracts common lab tests and flags out-of-range values', async () => {
  const sampleReportText = `
    APOLLO DIAGNOSTICS LABORATORY
    Patient Name: Jane Doe
    Date: 2026-03-20
    COMPLETE BLOOD COUNT & METABOLIC PANEL
    Hemoglobin: 10.5 g/dL (13.0 - 17.0 g/dL) - LOW
    Fasting Blood Sugar: 126 mg/dL (70 - 100 mg/dL) - HIGH
    Total Cholesterol: 185 mg/dL (< 200 mg/dL)
    Serum Creatinine: 0.8 mg/dL (0.6 - 1.2 mg/dL)
    Rx: Tab Metformin 500mg 1-0-1 after food for 30 days
  `;

  const result = await medicalExtractionService.processMedicalContent(sampleReportText, 'Lab Report');

  assert.equal(result.classifiedType, 'Lab Report');
  assert.ok(result.structuredData.labResults.length >= 3, 'Extracted at least 3 lab parameters');

  const hb = result.structuredData.labResults.find((l) => l.testName === 'Hemoglobin');
  assert.ok(hb, 'Extracted Hemoglobin');
  assert.equal(hb.abnormalFlag, 'LOW', 'Correctly flagged Hemoglobin as LOW');

  const fbs = result.structuredData.labResults.find((l) => l.testName === 'Fasting Blood Glucose');
  assert.ok(fbs, 'Extracted Fasting Blood Glucose');
  assert.equal(fbs.abnormalFlag, 'HIGH', 'Correctly flagged Fasting Blood Sugar as HIGH');

  // Verify bilingual summaries
  assert.ok(result.summary.overview.includes('medical record') || result.summary.overview.includes('Lab Report'));
  assert.ok(result.summary.abnormalResults.length > 0, 'English summary includes abnormal results');

  // Verify Telugu summary preserves numbers and medicine names
  assert.ok(result.teluguSummary.overview.length > 0, 'Telugu summary generated');
  assert.ok(
    result.teluguSummary.abnormalResults.some((r) => r.includes('Hemoglobin') || r.includes('10.5') || r.includes('Fasting')),
    'Telugu summary preserves clinical parameter names and values'
  );
});

test('FHIR R4 Mapping: Generates standard HL7 FHIR Bundle', () => {
  const mockUser = {
    _id: '60d5ec49f1b2c8b1f8e4e1a1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    gender: 'female',
    dateOfBirth: new Date('1990-05-15'),
    mockAbha: {
      isLinked: true,
      abhaAddress: 'jane@abdm',
      abhaNumber: '91-1234-5678-9012',
    },
  };

  const mockDoc = {
    _id: '60d5ec49f1b2c8b1f8e4e1a2',
    fileName: 'blood_report.pdf',
    fileUrl: '/api/documents/60d5ec49f1b2c8b1f8e4e1a2/file',
    fileType: 'application/pdf',
    fileSize: 45000,
    documentType: 'Lab Report',
    createdAt: new Date(),
    structuredData: {
      documentDate: new Date('2026-03-20'),
      reviewStatus: 'VERIFIED',
      healthcareProvider: 'Apollo Diagnostics',
      labResults: [
        {
          testName: 'Hemoglobin',
          result: '10.5 g/dL',
          numericValue: 10.5,
          unit: 'g/dL',
          referenceRange: '13.0 - 17.0 g/dL',
          abnormalFlag: 'LOW',
          interpretation: 'Below reference interval',
        },
      ],
      prescriptions: [
        {
          medicationName: 'Metformin',
          dosage: '500mg',
          frequency: '1-0-1',
          instructions: 'after food',
        },
      ],
    },
    summary: {
      overview: 'Blood examination report',
    },
  };

  const bundle = fhirService.mapToFhirBundle(mockUser, mockDoc);

  assert.equal(bundle.resourceType, 'Bundle');
  assert.equal(bundle.type, 'document');
  assert.ok(bundle.entry.length >= 4, 'Bundle contains Patient, DocumentReference, DiagnosticReport, Observation, and MedicationRequest');

  const patientEntry = bundle.entry.find((e) => e.resource.resourceType === 'Patient');
  assert.ok(patientEntry);
  assert.equal(patientEntry.resource.name[0].text, 'Jane Doe');

  const obsEntry = bundle.entry.find((e) => e.resource.resourceType === 'Observation');
  assert.ok(obsEntry);
  assert.equal(obsEntry.resource.code.text, 'Hemoglobin');
  assert.equal(obsEntry.resource.valueQuantity.value, 10.5);

  const medEntry = bundle.entry.find((e) => e.resource.resourceType === 'MedicationRequest');
  assert.ok(medEntry);
  assert.equal(medEntry.resource.medicationCodeableConcept.text, 'Metformin');
});

test('Mock ABHA Gateway: Generates valid synthetic records', () => {
  const samples = fhirService.getSampleAbhaRecords();
  assert.ok(Array.isArray(samples));
  assert.ok(samples.length >= 2);
  assert.ok(samples[0].provenance.startsWith('HIP-'));
  assert.ok(samples[0].simulatedLabResults.length > 0);
});
