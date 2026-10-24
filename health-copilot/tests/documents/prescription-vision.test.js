const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const {
  validatePrescriptionImage,
  validateFileSignature,
  validateFile,
  ALLOWED_IMAGE_MIME_TYPES,
} = require('../../document-service/src/validation/fileValidator');
const prescriptionVisionService = require('../../backend/src/services/prescriptionVisionService');

describe('Prescription Vision & Multimodal Extraction Test Suite', () => {
  // Test 1: Successful image validation for supported formats (JPG, PNG, WEBP)
  test('1. Validates supported prescription image formats (JPG, PNG, WEBP)', () => {
    const validPng = { mimetype: 'image/png', size: 1024 * 50, originalname: 'rx_handwritten.png' };
    const validJpg = { mimetype: 'image/jpeg', size: 1024 * 100, originalname: 'rx_clinic.jpg' };
    const validWebp = { mimetype: 'image/webp', size: 1024 * 75, originalname: 'rx_doctor.webp' };

    assert.strictEqual(validatePrescriptionImage(validPng).isValid, true);
    assert.strictEqual(validatePrescriptionImage(validJpg).isValid, true);
    assert.strictEqual(validatePrescriptionImage(validWebp).isValid, true);
  });

  // Test 2: Rejects unsupported file types (PDF, TXT, EXE, etc.)
  test('2. Rejects unsupported files and PDFs for direct vision extraction', () => {
    const pdfFile = { mimetype: 'application/pdf', size: 2048, originalname: 'prescription.pdf' };
    const txtFile = { mimetype: 'text/plain', size: 512, originalname: 'notes.txt' };
    const exeFile = { mimetype: 'application/x-msdownload', size: 1024, originalname: 'script.exe' };

    const pdfRes = validatePrescriptionImage(pdfFile);
    assert.strictEqual(pdfRes.isValid, false);
    assert.ok(pdfRes.error.includes('PDF files are not supported'));

    const txtRes = validatePrescriptionImage(txtFile);
    assert.strictEqual(txtRes.isValid, false);

    const exeRes = validatePrescriptionImage(exeFile);
    assert.strictEqual(exeRes.isValid, false);
  });

  // Test 3: Rejects oversized images (> 10MB)
  test('3. Rejects oversized prescription images (> 10MB)', () => {
    const oversizedFile = {
      mimetype: 'image/png',
      size: 11 * 1024 * 1024, // 11MB
      originalname: 'huge_scan.png',
    };
    const res = validatePrescriptionImage(oversizedFile, 10 * 1024 * 1024);
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error.includes('exceeds the maximum limit'));
  });

  // Test 4: File signature (magic bytes) validation prevents disguised files
  test('4. Validates binary magic signatures for PNG, JPEG, and WEBP', () => {
    // Valid PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const pngResult = validateFileSignature(validPngBuffer);
    assert.strictEqual(pngResult.isValid, true);
    assert.strictEqual(pngResult.detectedType, 'image/png');

    // Valid JPEG signature: FF D8 FF
    const validJpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const jpgResult = validateFileSignature(validJpgBuffer);
    assert.strictEqual(jpgResult.isValid, true);
    assert.strictEqual(jpgResult.detectedType, 'image/jpeg');

    // Valid WEBP signature: RIFF ... WEBP
    const validWebpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    const webpResult = validateFileSignature(validWebpBuffer);
    assert.strictEqual(webpResult.isValid, true);
    assert.strictEqual(webpResult.detectedType, 'image/webp');

    // Disguised executable named .png
    const fakeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ executable header
    const fakeResult = validateFileSignature(fakeBuffer);
    assert.strictEqual(fakeResult.isValid, false);
  });

  // Test 5: Successful AI analysis with mocked model response
  test('5. Normalizes valid multimodal AI response conforming to clinical schema', () => {
    const rawAiOutput = {
      documentType: 'prescription',
      hospital: { name: 'Apollo Care', address: 'Banjara Hills' },
      doctor: { name: 'Dr. Anita Rao', department: 'Pediatrics', regNumber: 'TS-9921' },
      patient: { name: 'Aarav Sharma', age: '7 Yrs', sex: 'Male' },
      prescriptionDate: '2026-10-24',
      medicines: [
        {
          nameAsWritten: 'Syp Augmentin Duo',
          normalizedName: 'Amoxicillin and Clavulanate Oral Suspension',
          strength: '228.5 mg/5ml',
          dosageInstructions: '5 ml twice daily after food',
          frequency: 'BD',
          route: 'Oral',
          duration: '5 days',
          confidence: 'high',
          requiresReview: false,
          uncertaintyNotes: [],
        },
      ],
      diagnosis: ['Acute Otitis Media'],
      investigations: [],
      followUpInstructions: ['Review after 5 days'],
    };

    const normalized = prescriptionVisionService.normalizePrescriptionData(rawAiOutput);
    assert.strictEqual(normalized.documentType, 'prescription');
    assert.strictEqual(normalized.doctor.name, 'Dr. Anita Rao');
    assert.strictEqual(normalized.patient.name, 'Aarav Sharma');
    assert.strictEqual(normalized.medicines.length, 1);
    assert.strictEqual(normalized.medicines[0].normalizedName, 'Amoxicillin and Clavulanate Oral Suspension');
    assert.strictEqual(normalized.overallReviewRequired, true);
    assert.ok(normalized.disclaimer.includes('AI-assisted extraction'));
  });

  // Test 6: Safe handling of malformed or wrapped AI JSON response
  test('6. Safely parses AI responses wrapped in markdown codeblocks and handles malformed JSON', () => {
    const markdownWrapped = '```json\n{"documentType":"prescription","doctor":{"name":"Dr. Patel"}}\n```';
    const parsed = prescriptionVisionService.safeParseAiJson(markdownWrapped);
    assert.ok(parsed);
    assert.strictEqual(parsed.doctor.name, 'Dr. Patel');

    // Corrupted JSON with surrounding conversational text
    const noisyText = 'Here is the extracted prescription: {"documentType":"prescription","medicines":[]} Thank you.';
    const noisyParsed = prescriptionVisionService.safeParseAiJson(noisyText);
    assert.ok(noisyParsed);
    assert.strictEqual(noisyParsed.documentType, 'prescription');

    // Completely unparseable garbage
    const garbage = 'Sorry, the image was too blurry to read.';
    const garbageParsed = prescriptionVisionService.safeParseAiJson(garbage);
    assert.strictEqual(garbageParsed, null);
  });

  // Test 7: Uncertain handwriting marks `requiresReview: true` and `confidence: "low"`
  test('7. Accurately marks uncertain medicine handwriting as requiresReview: true with notes', () => {
    const unclearExtraction = {
      medicines: [
        {
          nameAsWritten: 'Tab Azith... 500 (?)',
          normalizedName: null, // Unknown/unconfirmed
          strength: '500 mg',
          dosageInstructions: null,
          frequency: null,
          confidence: 'low',
          requiresReview: true,
          uncertaintyNotes: ['Middle letters obscured by ink blot. Could be Azithromycin or Aztreonam.'],
        },
      ],
    };

    const normalized = prescriptionVisionService.normalizePrescriptionData(unclearExtraction);
    const med = normalized.medicines[0];
    assert.strictEqual(med.confidence, 'low');
    assert.strictEqual(med.requiresReview, true);
    assert.strictEqual(med.normalizedName, null);
    assert.ok(med.uncertaintyNotes.length > 0);
  });

  // Test 8: Missing dosage, frequency, and duration are preserved as null without hallucination
  test('8. Preserves missing dosage and duration fields as null without hallucinating defaults', () => {
    const incompleteExtraction = {
      medicines: [
        {
          nameAsWritten: 'Tab Metformin',
          normalizedName: 'Metformin Hydrochloride',
          strength: null, // Doctor did not specify whether 500mg or 850mg
          dosageInstructions: null,
          frequency: null,
          duration: null,
          confidence: 'medium',
          requiresReview: true,
        },
      ],
    };

    const normalized = prescriptionVisionService.normalizePrescriptionData(incompleteExtraction);
    const med = normalized.medicines[0];
    assert.strictEqual(med.strength, null);
    assert.strictEqual(med.dosageInstructions, null);
    assert.strictEqual(med.frequency, null);
    assert.strictEqual(med.duration, null);
    assert.strictEqual(med.requiresReview, true);
  });

  // Test 9: Safe fallback when external vision API is unreachable
  test('9. Engages clinical fallback extraction with review flags when external vision call fails', async () => {
    const sampleBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = await prescriptionVisionService.analyzePrescriptionImage({
      buffer: sampleBuffer,
      mimeType: 'image/png',
    });

    assert.ok(result);
    assert.strictEqual(result.documentType, 'prescription');
    assert.ok(Array.isArray(result.medicines));
    assert.strictEqual(result.overallReviewRequired, true);
    assert.ok(result.disclaimer.includes('AI-assisted extraction'));
  });

  // Test 10: Preserves standard document upload validation
  test('10. Preserves existing document upload validation for PDFs and images', () => {
    const pdf = { mimetype: 'application/pdf', size: 1024, originalname: 'blood_test.pdf' };
    const png = { mimetype: 'image/png', size: 1024, originalname: 'scan.png' };
    const webp = { mimetype: 'image/webp', size: 1024, originalname: 'scan.webp' };

    assert.strictEqual(validateFile(pdf).isValid, true);
    assert.strictEqual(validateFile(png).isValid, true);
    assert.strictEqual(validateFile(webp).isValid, true);
  });
});
