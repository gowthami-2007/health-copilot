const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const { extractTextFromImage } = require('../../document-service/src/ocr/ocrService');
const {
  normalizeOcrResponse,
  normalizeBoundingBox,
  normalizeWords,
  normalizeLines,
} = require('../../document-service/src/ocr/ocrResponseNormalizer');
const {
  getImageMetadata,
  validateCropRectangle,
} = require('../../document-service/src/ocr/imagePreprocessor');
const {
  validateFile,
  validateFileSignature,
} = require('../../document-service/src/validation/fileValidator');
const medicalExtractionService = require('../../backend/src/services/medicalExtractionService');
const { extractTextFromPdf } = require('../../document-service/src/extraction/pdfExtractor');

describe('Production OCR Engine & Bounds Safety: 15 Core Scenarios', () => {
  // Helpers to generate test buffers
  const makeSmallJpeg = (width = 200, height = 150) => {
    // Construct minimal valid JPEG structure with SOF0 marker
    const header = Buffer.from([0xFF, 0xD8, 0xFF, 0xC0, 0x00, 0x11, 0x08]);
    const dims = Buffer.alloc(4);
    dims.writeUInt16BE(height, 0);
    dims.writeUInt16BE(width, 2);
    const body = Buffer.from([0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF, 0xD9]);
    return Buffer.concat([header, dims, body]);
  };

  const makeSmallPng = (width = 100, height = 80) => {
    // 8-byte signature + 25-byte IHDR chunk + IEND
    const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const ihdr = Buffer.alloc(25);
    ihdr.writeUInt32BE(13, 0); // length
    ihdr.write('IHDR', 4, 4, 'ascii');
    ihdr.writeUInt32BE(width, 8);
    ihdr.writeUInt32BE(height, 12);
    ihdr[16] = 8; // bit depth
    ihdr[17] = 2; // color type (RGB)
    const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
    return Buffer.concat([sig, ihdr, iend]);
  };

  // 1. A valid printed prescription
  test('Case 1: A valid printed prescription extracts structured medications and patient metadata', async () => {
    const printedText = `
CLINICAL HEALTH CENTER
Dr. Alan Grant, MD - Internal Medicine
Patient: John Smith
Date: 12/04/2026
Rx:
Amoxicillin 500mg tab
Qty: 21
Sig: 1 capsule three times daily for 7 days
After food
    `.trim();

    const res = await medicalExtractionService.processMedicalContent(printedText, 'Prescription');
    assert.strictEqual(res.classifiedType, 'Prescription');
    assert.strictEqual(res.structuredData.patientName, 'John Smith');
    assert.ok(res.structuredData.prescriptions.length >= 1, 'Should extract Amoxicillin');

    const rx = res.structuredData.prescriptions[0];
    assert.ok(rx.medicationName.includes('Amoxicillin'));
    assert.ok(rx.dosage.includes('500mg'));
    assert.strictEqual(rx.verificationStatus, 'UNVERIFIED', 'Safety check: must be marked unverified');
    assert.strictEqual(res.structuredData.reviewStatus, 'REVIEW_REQUIRED');
  });

  // 2. A handwritten prescription similar to the supplied sample
  test('Case 2: A handwritten prescription similar to the supplied sample extracts all required clinical fields', async () => {
    const handwrittenSampleText = `
Name: Lolita Alvarez
Address: Bagong Ilog, Pasig City
Age: 39 Sex: F Date: 2-5-13
Rx
FeSO4 tab # 30
Sig: A.D.
Ascorbic Acid # 30 500mg tab
Sig: Once a day
Physician's Sig. J dela Cruz
Lic. No. 12345
PTR No. 1234567
S2 No.
    `.trim();

    const res = await medicalExtractionService.processMedicalContent(handwrittenSampleText, 'Prescription');
    const data = res.structuredData;

    assert.strictEqual(data.patientName, 'Lolita Alvarez');
    assert.strictEqual(data.patientAge, 39);
    assert.strictEqual(data.patientSex, 'Female');
    assert.strictEqual(data.patientAddress, 'Bagong Ilog, Pasig City');
    assert.ok(data.documentDate instanceof Date);
    assert.strictEqual(data.doctorName, 'Dr. J dela Cruz');
    assert.ok(data.doctorRegistration.includes('12345'));
    assert.ok(data.doctorRegistration.includes('1234567'));

    assert.strictEqual(data.prescriptions.length, 2, 'Should extract FeSO4 tab and Ascorbic Acid');
    const feso4 = data.prescriptions.find((p) => p.medicationName.includes('FeSO4'));
    assert.ok(feso4, 'Must extract FeSO4');
    assert.strictEqual(feso4.quantity, '# 30');
    assert.strictEqual(feso4.verificationStatus, 'UNVERIFIED');

    const vitC = data.prescriptions.find((p) => p.medicationName.includes('Ascorbic'));
    assert.ok(vitC, 'Must extract Ascorbic Acid');
    assert.strictEqual(vitC.quantity, '# 30');
    assert.ok(vitC.dosage.includes('500mg'));

    assert.strictEqual(data.reviewStatus, 'REVIEW_REQUIRED');
  });

  // 3. A high-resolution photograph
  test('Case 3: A high-resolution photograph metadata and coordinates are bounded safely', () => {
    const highResBuf = makeSmallJpeg(4000, 3000);
    const meta = getImageMetadata(highResBuf);

    assert.strictEqual(meta.isValid, true);
    assert.strictEqual(meta.width, 4000);
    assert.strictEqual(meta.height, 3000);

    const crop = validateCropRectangle({ left: 3500, top: 2500, width: 800, height: 700 }, meta.width, meta.height);
    assert.strictEqual(crop.isValid, true);
    assert.strictEqual(crop.rect.left + crop.rect.width, 4000, 'Must clamp width to image boundary');
    assert.strictEqual(crop.rect.top + crop.rect.height, 3000, 'Must clamp height to image boundary');
  });

  // 4. A low-resolution image
  test('Case 4: A low-resolution image does not crash coordinate normalizer or scaling engine', () => {
    const lowResBuf = makeSmallPng(64, 48);
    const meta = getImageMetadata(lowResBuf);

    assert.strictEqual(meta.isValid, true);
    assert.strictEqual(meta.width, 64);
    assert.strictEqual(meta.height, 48);

    // Normalizing coordinates against small image boundaries
    const box = normalizeBoundingBox({ x0: 10, y0: 15, x1: 90, y1: 80 }, meta.width, meta.height);
    assert.strictEqual(box.x1, 64, 'Must clamp coordinate within low-res max width');
    assert.strictEqual(box.y1, 48, 'Must clamp coordinate within low-res max height');
  });

  // 5. A rotated or skewed image
  test('Case 5: A rotated image with EXIF orientation metadata is parsed without throwing RangeError', () => {
    // Construct JPEG with APP1 EXIF segment (Orientation = 6: 90 deg CW)
    const header = Buffer.from([0xFF, 0xD8]);
    const app1 = Buffer.from([
      0xFF, 0xE1, 0x00, 0x22, // length 34
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
      0x4D, 0x4D, 0x00, 0x2A, // Big Endian TIFF
      0x00, 0x00, 0x00, 0x08, // offset to IFD0
      0x00, 0x01, // 1 entry
      0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, // Tag 0x0112 (Orientation), type SHORT, count 1
      0x00, 0x06, 0x00, 0x00, // value = 6
      0x00, 0x00, 0x00, 0x00,
    ]);
    const sof = Buffer.from([0xFF, 0xC0, 0x00, 0x11, 0x08, 0x02, 0x00, 0x03, 0x00, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF, 0xD9]);
    const exifJpeg = Buffer.concat([header, app1, sof]);

    const meta = getImageMetadata(exifJpeg);
    assert.strictEqual(meta.isValid, true);
    assert.strictEqual(meta.orientation, 6, 'Should extract EXIF orientation 6');
  });

  // 6. A blank image
  test('Case 6: A blank image returns hasText: false and does not throw unhandled exceptions', async () => {
    const rawMockResponse = {
      data: {
        text: '   \n\n   ',
        confidence: 0,
        blocks: [],
        lines: [],
        words: [],
      },
    };

    const normalized = normalizeOcrResponse(rawMockResponse);
    assert.strictEqual(normalized.hasText, false);
    assert.strictEqual(normalized.text, '');
    assert.strictEqual(normalized.wordCount, 0);
  });

  // 7. An image containing no recognizable text
  test('Case 7: An image containing no recognizable text produces a safe, helpful message', async () => {
    const rawNoTextResponse = {
      data: {
        text: '.. / ~',
        confidence: 12,
        blocks: [{ text: '.. / ~' }],
        lines: [],
        words: [],
      },
    };

    const normalized = normalizeOcrResponse(rawNoTextResponse);
    assert.strictEqual(normalized.hasText, false, '3-char non-words should not be flagged as text');

    const medResult = await medicalExtractionService.processMedicalContent(normalized.text, 'Prescription');
    assert.strictEqual(medResult.structuredData.prescriptions.length, 0);
  });

  // 8. A corrupted or unsupported file
  test('Case 8: A corrupted or unsupported file returns controlled validation errors', () => {
    // 0-byte buffer
    const zeroByte = validateFileSignature(Buffer.alloc(0));
    assert.strictEqual(zeroByte.isValid, false);

    // Random non-image binary (.exe MZ header)
    const exeBuf = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00]);
    const exeResult = validateFileSignature(exeBuf);
    assert.strictEqual(exeResult.isValid, false);
    assert.ok(exeResult.error.includes('mismatch'));

    // Truncated buffer does not throw RangeError
    const truncatedBuf = Buffer.from([0xFF, 0xD8]);
    const truncMeta = getImageMetadata(truncatedBuf);
    assert.strictEqual(truncMeta.isValid, false);
    assert.ok(truncMeta.error);
  });

  // 9. A very large image or document
  test('Case 9: A very large file exceeds size limit and is rejected safely', () => {
    const hugeFile = {
      originalname: 'huge_scan.png',
      mimetype: 'image/png',
      size: 30 * 1024 * 1024, // 30MB
    };

    const res = validateFile(hugeFile, 10 * 1024 * 1024);
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error.includes('exceeds the maximum limit'));
  });

  // 10. A multi-page PDF if PDFs are supported
  test('Case 10: Multi-page PDF parsing handles page boundaries safely without RangeError', async () => {
    // Construct minimal valid PDF binary with trailer
    const pdfContent = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n165\n%%EOF'
    );

    const sig = validateFileSignature(pdfContent);
    assert.strictEqual(sig.isValid, true);
    assert.strictEqual(sig.detectedType, 'application/pdf');

    const result = await extractTextFromPdf(pdfContent);
    assert.ok(result);
    assert.strictEqual(typeof result.hasText, 'boolean');
  });

  // 11. An OCR response with empty arrays
  test('Case 11: An OCR response with empty arrays is normalized without out-of-range index errors', () => {
    const emptyArrays = {
      data: {
        text: '',
        confidence: 0,
        blocks: [],
        lines: [],
        words: [],
        pages: [],
      },
    };

    const norm = normalizeOcrResponse(emptyArrays);
    assert.strictEqual(norm.blocks.length, 0);
    assert.strictEqual(norm.lines.length, 0);
    assert.strictEqual(norm.words.length, 0);
    assert.strictEqual(norm.hasText, false);
  });

  // 12. An OCR response with missing nested properties
  test('Case 12: An OCR response with missing nested properties does not throw TypeError or RangeError', () => {
    // Null data, undefined properties, broken block references
    const malformedPayloads = [
      null,
      undefined,
      {},
      { data: null },
      { data: { blocks: [null, undefined, { paragraphs: null }] } },
      { data: { lines: [null, { words: null }] } },
    ];

    for (const payload of malformedPayloads) {
      assert.doesNotThrow(() => {
        const norm = normalizeOcrResponse(payload);
        assert.ok(norm);
        assert.strictEqual(typeof norm.text, 'string');
        assert.strictEqual(typeof norm.hasText, 'boolean');
      });
    }
  });

  // 13. An OCR response with invalid bounding boxes
  test('Case 13: An OCR response with invalid bounding boxes is corrected and clamped', () => {
    // Negative coords, inverted min/max, coords exceeding image bounds
    const box1 = normalizeBoundingBox({ x0: -100, y0: -50, x1: -10, y1: -20 }, 800, 600);
    assert.strictEqual(box1.x0, 0);
    assert.strictEqual(box1.y0, 0);

    // Inverted coordinates: x0 > x1
    const box2 = normalizeBoundingBox({ x0: 500, y0: 300, x1: 200, y1: 100 }, 800, 600);
    assert.strictEqual(box2.x0, 200);
    assert.strictEqual(box2.x1, 500);
    assert.strictEqual(box2.y0, 100);
    assert.strictEqual(box2.y1, 300);

    // Out of bounds: exceeds max width
    const box3 = normalizeBoundingBox({ x0: 750, y0: 10, x1: 1500, y1: 50 }, 800, 600);
    assert.strictEqual(box3.x1, 800);

    // Non-object / undefined
    const boxNull = normalizeBoundingBox(null);
    assert.strictEqual(boxNull.isValid, false);
  });

  // 14. An OCR provider timeout or API error
  test('Case 14: An OCR provider error or missing file returns a controlled failure object without crashing', async () => {
    const res = await extractTextFromImage('/tmp/non_existent_image_12345.png');
    assert.strictEqual(res.hasText, false);
    assert.ok(res.message.includes('not found') || res.message.includes('failed'));
  });

  // 15. A partially readable prescription with missing medication details
  test('Case 15: A partially readable prescription defaults missing fields without hallucinating medical data', async () => {
    const partialText = `
Rx
Amoxicillin
Sig: as directed
    `.trim();

    const res = await medicalExtractionService.processMedicalContent(partialText, 'Prescription');
    assert.ok(res.structuredData.prescriptions.length >= 1);

    const rx = res.structuredData.prescriptions[0];
    assert.ok(rx.medicationName.includes('Amoxicillin'));
    assert.strictEqual(rx.dosage, 'As directed', 'Missing dosage should be default direction without fabrication');
    assert.strictEqual(res.structuredData.patientName, '', 'Missing patient name must remain empty');
    assert.strictEqual(res.structuredData.patientAge, null, 'Missing age must remain null');
    assert.strictEqual(rx.verificationStatus, 'UNVERIFIED', 'Partial prescription must be unverified');
  });
});
