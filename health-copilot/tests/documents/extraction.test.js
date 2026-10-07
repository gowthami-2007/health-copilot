const { test, describe } = require('node:test');
const assert = require('node:assert');
const { validateFile } = require('../../document-service/src/validation/fileValidator');
const { cleanText } = require('../../document-service/src/cleaning/textCleaner');
const { createChunks } = require('../../document-service/src/chunking/chunkService');

describe('Document Service: Extraction, Cleaning & Chunking Tests', () => {
  test('File Validator: allows valid PDF and PNG documents', () => {
    const validPdf = { mimetype: 'application/pdf', size: 1024 * 50, originalname: 'report.pdf' };
    const validPng = { mimetype: 'image/png', size: 1024 * 500, originalname: 'scan.png' };

    assert.strictEqual(validateFile(validPdf).isValid, true);
    assert.strictEqual(validateFile(validPng).isValid, true);
  });

  test('File Validator: rejects unsupported MIME types and oversized files', () => {
    const exeFile = { mimetype: 'application/x-msdownload', size: 1024, originalname: 'virus.exe' };
    const hugePdf = { mimetype: 'application/pdf', size: 50 * 1024 * 1024, originalname: 'huge.pdf' };

    assert.strictEqual(validateFile(exeFile).isValid, false);
    assert.strictEqual(validateFile(hugePdf).isValid, false);
  });

  test('Text Cleaner: strips control characters and normalizes whitespace', () => {
    const messy = 'Patient:   John Doe\x00\x08\n\n\n\n\nBlood Test:\tNormal\n  ';
    const cleaned = cleanText(messy);

    assert.ok(!cleaned.includes('\x00'));
    assert.ok(!cleaned.includes('\n\n\n'));
    assert.strictEqual(cleaned.includes('Patient: John Doe'), true);
  });

  test('Chunking: breaks long clinical text into overlapping chunks', () => {
    const longText = 'Medical finding paragraph. '.repeat(60); // approx 1600 characters
    const chunks = createChunks(longText, 600, 100);

    assert.ok(chunks.length > 1, 'Should create multiple chunks');
    assert.ok(chunks[0].chunkText.length <= 700);
  });
});
