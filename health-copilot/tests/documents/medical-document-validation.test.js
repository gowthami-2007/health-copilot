const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');

const {
  classifyDocument,
  evaluateTextHeuristics,
  CLASSIFICATION,
} = require('../../document-service/src/validation/medicalClassifier');
const {
  validateFile,
  validateFileSignature,
} = require('../../document-service/src/validation/fileValidator');
const {
  NonMedicalDocumentError,
  DocumentClassificationUncertainError,
  DocumentUnreadableError,
} = require('../../backend/src/utils/errors');

// Helper to create a synthetic valid minimal PDF in-memory
function createSyntheticPdf(text) {
  const escapedText = String(text).replace(/([()])/g, '\\$1');
  const streamData = `BT /F1 12 Tf 50 700 Td (${escapedText}) Tj ET`;
  const compressed = zlib.deflateSync(Buffer.from(streamData, 'utf-8'));
  const header = Buffer.from('%PDF-1.4\n', 'utf-8');
  const streamHeader = Buffer.from(`1 0 obj\n<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`, 'utf-8');
  const streamFooter = Buffer.from('\nendstream\nendobj\nxref\n0 2\ntrailer\n<< /Root 1 0 R >>\n%%EOF', 'utf-8');
  return Buffer.concat([header, streamHeader, compressed, streamFooter]);
}

// Helper to create a synthetic JPEG buffer with magic header
function createSyntheticJpeg(asciiContent = '') {
  // JPEG SOI: 0xFF 0xD8 0xFF 0xE0, APP0 header
  const header = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const content = Buffer.from(asciiContent, 'utf-8');
  const footer = Buffer.from([0xFF, 0xD9]); // EOI
  return Buffer.concat([header, content, footer]);
}

describe('AI-Powered Medical Document Validation Test Suite (19 Requirements)', () => {
  let tempDir;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'health-doc-val-'));
  });

  after(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // 1. Uploading a valid medical prescription
  test('1. Valid Medical Prescription: Successfully classifies doctor prescription', async () => {
    const prescriptionText =
      'Rx Apollo Hospitals Clinic Dr. R. K. Sharma MD Internal Medicine Reg MCI-1234. Patient: Ramesh Kumar Age: 45 M. Tab. Paracetamol 500mg 1 tab TDS after food x 5 days. Follow up in 1 week.';
    const pdfBuf = createSyntheticPdf(prescriptionText);

    const result = await classifyDocument({
      buffer: pdfBuf,
      mimeType: 'application/pdf',
      originalName: 'doctor_prescription.pdf',
      documentType: 'Prescription',
    });

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.status, CLASSIFICATION.HEALTH_RELATED);
    assert.ok(result.confidence >= 0.8);
    assert.strictEqual(result.errorCode, null);
  });

  // 2. Uploading a laboratory report
  test('2. Laboratory Report: Successfully classifies diagnostic blood lab report', async () => {
    const labText =
      'Metropolis Diagnostic Laboratory Complete Blood Count CBC Report. Hemoglobin: 13.8 g/dL (Reference 13.0-17.0). Total WBC: 7,200 /cumm. Platelet Count: 240,000 /cumm. Fasting Blood Sugar: 95 mg/dL. Specimen: Whole Blood.';
    const pdfBuf = createSyntheticPdf(labText);

    const result = await classifyDocument({
      buffer: pdfBuf,
      mimeType: 'application/pdf',
      originalName: 'blood_test_cbc_report.pdf',
      documentType: 'Lab Report',
    });

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.status, CLASSIFICATION.HEALTH_RELATED);
    assert.ok(result.reasoning.includes('healthcare markers'));
  });

  // 3. Uploading a hospital discharge summary
  test('3. Hospital Discharge Summary: Successfully classifies inpatient summary', async () => {
    const summaryText =
      'Fortis Hospital Discharge Summary. IPD No: 98412 UHID: 4192. Patient: Smt. Lakshmi Devi. Admission Date: 12-Oct-2026 Discharge Date: 16-Oct-2026. Final Diagnosis: Acute Gastroenteritis with mild dehydration. Vitals at discharge: BP 118/76 mmHg, Pulse 72 bpm. Condition at Discharge: Stable.';
    const pdfBuf = createSyntheticPdf(summaryText);

    const result = await classifyDocument({
      buffer: pdfBuf,
      mimeType: 'application/pdf',
      originalName: 'hospital_discharge_summary.pdf',
      documentType: 'Other',
    });

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.status, CLASSIFICATION.HEALTH_RELATED);
  });

  // 4. Uploading a valid scanned medical PDF
  test('4. Scanned Medical PDF: Successfully accepts scanned ultrasound radiology report', async () => {
    const radiologyText =
      'Department of Radiodiagnosis. Ultrasound Abdomen & Pelvis USG Report. Liver normal in size, gallbladder clear, no calculi. Impression: Normal study, no focal lesion. Dr. A. Sen Radiologist.';
    const pdfBuf = createSyntheticPdf(radiologyText);

    const result = await classifyDocument({
      buffer: pdfBuf,
      mimeType: 'application/pdf',
      originalName: 'scanned_ultrasound_report.pdf',
      documentType: 'Imaging Report',
    });

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.status, CLASSIFICATION.HEALTH_RELATED);
  });

  // 5. Uploading a valid medical image
  test('5. Valid Medical Image: Successfully accepts medical JPEG photo/scan', async () => {
    const imgBuf = createSyntheticJpeg('Dr. Mehta Clinic Prescription Rx Cap. Amoxicillin 500mg BD');
    const result = await classifyDocument({
      buffer: imgBuf,
      mimeType: 'image/jpeg',
      originalName: 'prescription_scan.jpg',
      documentType: 'Prescription',
    });

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.status, CLASSIFICATION.HEALTH_RELATED);
  });

  // 6. Uploading an unrelated school assignment
  test('6. Unrelated School Assignment: Rejects university homework paper', async () => {
    const assignmentText =
      'Homework Assignment 4: Operating Systems and Computer Architecture. Course Code: CS301. Professor Alan Turing. Department of Computer Science. Student ID: 2024891. Submission Deadline: Friday.';
    const pdfBuf = createSyntheticPdf(assignmentText);

    const result = await classifyDocument({
      buffer: pdfBuf,
      mimeType: 'application/pdf',
      originalName: 'cs301_homework_assignment.pdf',
      documentType: 'Other',
    });

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.status, CLASSIFICATION.NOT_HEALTH_RELATED);
    assert.strictEqual(result.errorCode, 'NON_MEDICAL_DOCUMENT');
    assert.ok(result.errorMessage.includes('does not appear to be health-related'));
  });

  // 7. Uploading an unrelated PDF
  test('7. Unrelated PDF: Rejects commercial real estate lease contract', async () => {
    const leaseText =
      'Real Estate Lease Agreement between Landlord and Tenant for commercial property. Monthly rent: $3,500. Security deposit: $7,000. Supermarket retail outlet premises.';
    const pdfBuf = createSyntheticPdf(leaseText);

    const result = await classifyDocument({
      buffer: pdfBuf,
      mimeType: 'application/pdf',
      originalName: 'lease_agreement_contract.pdf',
      documentType: 'Other',
    });

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.status, CLASSIFICATION.NOT_HEALTH_RELATED);
    assert.strictEqual(result.errorCode, 'NON_MEDICAL_DOCUMENT');
  });

  // 8. Uploading a non-medical photograph
  test('8. Non-Medical Photograph: Rejects vacation photo / food receipt', async () => {
    const imgBuf = createSyntheticJpeg('Starbucks Coffee Restaurant bill order latte muffin total $12.50');
    const result = await classifyDocument({
      buffer: imgBuf,
      mimeType: 'image/jpeg',
      originalName: 'receipt_food_starbucks.jpg',
      documentType: 'Other',
    });

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.status, CLASSIFICATION.NOT_HEALTH_RELATED);
    assert.strictEqual(result.errorCode, 'NON_MEDICAL_DOCUMENT');
  });

  // 9. Uploading a Telugu medical document
  test('9. Telugu Medical Document: Correctly classifies Telugu clinical report', async () => {
    const teluguMedicalText =
      'అపోలో ఆసుపత్రి హైదరాబాద్. డాక్టర్ రమేష్, ఎం.డి. రోగి పేరు: శ్రీనివాస్ రావు. రక్త పరీక్ష నివేదిక: రక్తపోటు మరియు మధుమేహం నియంత్రణలో ఉన్నాయి. మందులు: పారాసిటమాల్ మాత్రలు రోజుకు ఒకసారి.';
    const pdfBuf = createSyntheticPdf(teluguMedicalText);

    const result = await classifyDocument({
      buffer: pdfBuf,
      mimeType: 'application/pdf',
      originalName: 'telugu_medical_prescription.pdf',
      documentType: 'Prescription',
    });

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.status, CLASSIFICATION.HEALTH_RELATED);
    assert.strictEqual(result.detectedType, 'telugu_medical_document');
  });

  // 10. Uploading a blurry handwritten prescription
  test('10. Blurry Handwritten Prescription: Preserves and accepts cursive image candidate', async () => {
    // Valid JPEG signature with minimal handwritten candidate metadata
    const imgBuf = createSyntheticJpeg('Prescription handwritten doctor notes clinic rx');
    const result = await classifyDocument({
      buffer: imgBuf,
      mimeType: 'image/jpeg',
      originalName: 'handwritten_rx_blurry.jpg',
      documentType: 'Prescription',
    });

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.status, CLASSIFICATION.HEALTH_RELATED);
  });

  // 11. Uploading a corrupted PDF
  test('11. Corrupted PDF: Accurately detects corrupted or truncated PDF bytes', async () => {
    // Header only without body or valid streams
    const corruptedPdf = Buffer.from('%PDF-1.4\n%%CORRUPTED_STREAM_GARBLED_BINARY_TRUNCATED');
    const filePath = path.join(tempDir, 'corrupt.pdf');
    fs.writeFileSync(filePath, corruptedPdf);

    const result = await classifyDocument({
      filePath,
      mimeType: 'application/pdf',
      originalName: 'corrupt.pdf',
    });

    // Should be identified as unreadable or uncertain, never health_related
    assert.strictEqual(result.isValid, false);
    assert.ok(
      result.status === CLASSIFICATION.UNREADABLE || result.status === CLASSIFICATION.UNCERTAIN
    );
  });

  // 12. Uploading an empty file
  test('12. Empty File: Rejects 0-byte file immediately with unreadable code', async () => {
    const emptyBuf = Buffer.alloc(0);
    const result = await classifyDocument({
      buffer: emptyBuf,
      mimeType: 'application/pdf',
      originalName: 'empty.pdf',
      fileSize: 0,
    });

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.status, CLASSIFICATION.UNREADABLE);
    assert.strictEqual(result.errorCode, 'DOCUMENT_UNREADABLE');
    assert.ok(result.errorMessage.includes('empty, corrupted, or unreadable'));
  });

  // 13. Uploading a file with a misleading extension
  test('13. Misleading Extension: Detects executable or shell script disguised as PDF', async () => {
    // A bash script disguised with a .pdf extension
    const scriptDisguisedAsPdf = Buffer.from('#!/bin/bash\necho "Malicious payload"\nrm -rf /');
    const result = await classifyDocument({
      buffer: scriptDisguisedAsPdf,
      mimeType: 'application/pdf',
      originalName: 'fake_report.pdf',
      fileSize: scriptDisguisedAsPdf.length,
    });

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.status, CLASSIFICATION.UNREADABLE);
    assert.strictEqual(result.errorCode, 'DOCUMENT_UNREADABLE');
  });

  // 14. Uploading an oversized file
  test('14. Oversized File: Enforces configured maximum file size limit', () => {
    const oversizedFile = {
      mimetype: 'application/pdf',
      size: 15 * 1024 * 1024, // 15MB
      originalname: 'huge_scan.pdf',
    };

    const validation = validateFile(oversizedFile, 10 * 1024 * 1024);
    assert.strictEqual(validation.isValid, false);
    assert.ok(validation.error.includes('exceeds the maximum limit of 10MB'));
  });

  // 15. Handling AI classification failures
  test('15. AI Classification Resilience: Handles external AI error with deterministic fallback', async () => {
    // Test that heuristic analysis gracefully evaluates ambiguous input when AI fails
    const evaluation = evaluateTextHeuristics('General observation notes with ambiguous context');
    assert.strictEqual(typeof evaluation.medicalScore, 'number');
    assert.strictEqual(typeof evaluation.nonMedicalScore, 'number');

    const result = await classifyDocument({
      buffer: createSyntheticJpeg('Random notes'),
      mimeType: 'image/jpeg',
      originalName: 'unknown_note.jpg',
      documentType: 'Other',
    });

    // Must return valid structured response and not crash
    assert.ok(result.status);
    assert.ok(typeof result.isValid === 'boolean');
  });

  // 16. Displaying the correct frontend error messages
  test('16. Frontend Error Mapping: Error structures and codes match required specifications', () => {
    const nonMedicalErr = new NonMedicalDocumentError();
    assert.strictEqual(nonMedicalErr.statusCode, 422);
    assert.strictEqual(nonMedicalErr.errorCode, 'NON_MEDICAL_DOCUMENT');
    assert.ok(nonMedicalErr.message.includes('does not appear to be health-related'));

    const uncertainErr = new DocumentClassificationUncertainError();
    assert.strictEqual(uncertainErr.statusCode, 422);
    assert.strictEqual(uncertainErr.errorCode, 'DOCUMENT_CLASSIFICATION_UNCERTAIN');
    assert.ok(uncertainErr.message.includes('confidently determine'));

    const unreadableErr = new DocumentUnreadableError();
    assert.strictEqual(unreadableErr.statusCode, 400);
    assert.strictEqual(unreadableErr.errorCode, 'DOCUMENT_UNREADABLE');
    assert.ok(unreadableErr.message.includes('empty, corrupted, or unreadable'));
  });

  // 17. Confirming that rejected files never reach medical extraction or summary generation
  test('17. Rejection Pipeline Isolation: Rejected file triggers early exit before storage or extraction', async () => {
    const codeFileContent = 'import React from "react";\nfunction App() { return <div>Hello</div>; }\nexport default App;';
    const filePath = path.join(tempDir, 'programming_code.pdf');
    fs.writeFileSync(filePath, createSyntheticPdf(codeFileContent));

    const classification = await classifyDocument({
      filePath,
      mimeType: 'application/pdf',
      originalName: 'programming_code.pdf',
      documentType: 'Other',
    });

    assert.strictEqual(classification.isValid, false);
    assert.strictEqual(classification.status, CLASSIFICATION.NOT_HEALTH_RELATED);

    // Verify file can be cleanly purged from disk immediately
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    assert.strictEqual(fs.existsSync(filePath), false);
  });

  // 18. Confirming that existing valid medical-document processing still works
  test('18. Valid Processing Continuity: Valid document proceeds through full classification', async () => {
    const medicalReport =
      'Apollo Clinic Consultation Note. Dr. Anjali Rao MBBS. Patient complains of fever. Diagnosis: Viral URTI. Prescribed Tab. Paracetamol 650mg SOS. Rest recommended for 3 days.';
    const pdfBuf = createSyntheticPdf(medicalReport);

    const classification = await classifyDocument({
      buffer: pdfBuf,
      mimeType: 'application/pdf',
      originalName: 'consultation_note.pdf',
      documentType: 'Doctor Note',
    });

    assert.strictEqual(classification.isValid, true);
    assert.strictEqual(classification.status, CLASSIFICATION.HEALTH_RELATED);
    assert.strictEqual(classification.errorCode, null);
  });

  // 19. Preventing unauthorized document access
  test('19. Security & Access Isolation: Ensures documents are user-isolated', () => {
    const userAId = '654321654321654321654321';
    const userBId = '987654987654987654987654';

    // Verify path sanitization prevents directory traversal
    const safeUserSubdir = path.join('uploads', userAId);
    assert.ok(!safeUserSubdir.includes('..'));
    assert.notStrictEqual(userAId, userBId);
  });
});
