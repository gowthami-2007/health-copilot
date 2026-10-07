const { test, describe } = require('node:test');
const assert = require('node:assert');
const { validateFile } = require('../../document-service/src/validation/fileValidator');

describe('Document Service: File Validation Unit Tests', () => {
  test('handles null or missing file payload', () => {
    const res = validateFile(null);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.error, 'No file provided');
  });

  test('validates correct file types and rejects unknown MIME types', () => {
    const validJpg = { mimetype: 'image/jpeg', size: 1024, originalname: 'scan.jpg' };
    const invalidText = { mimetype: 'text/plain', size: 1024, originalname: 'notes.txt' };

    assert.strictEqual(validateFile(validJpg).isValid, true);
    assert.strictEqual(validateFile(invalidText).isValid, false);
  });

  test('enforces custom max file size', () => {
    const file = { mimetype: 'application/pdf', size: 5 * 1024 * 1024, originalname: 'doc.pdf' };
    // Limit to 2MB
    const res = validateFile(file, 2 * 1024 * 1024);
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error.includes('exceeds the maximum limit'));
  });
});
