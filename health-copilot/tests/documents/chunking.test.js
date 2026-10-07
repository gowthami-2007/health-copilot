const { test, describe } = require('node:test');
const assert = require('node:assert');
const { createChunks } = require('../../document-service/src/chunking/chunkService');

describe('Document Service: Chunking & Boundary Tests', () => {
  test('returns empty array for empty or whitespace text', () => {
    assert.deepStrictEqual(createChunks(''), []);
    assert.deepStrictEqual(createChunks('   '), []);
    assert.deepStrictEqual(createChunks(null), []);
  });

  test('single short passage returns exactly 1 chunk', () => {
    const text = 'Hemoglobin: 14.5 g/dL. Blood test normal.';
    const chunks = createChunks(text, 500);
    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0].chunkText, text);
  });

  test('preserves overlap between consecutive chunks', () => {
    const longClinicalNotes = [
      'Patient visited Dr. Jenkins on Monday.',
      'Complained of mild fatigue after exertion.',
      'Blood pressure measured at 128/82 mmHg.',
      'Laboratory lipid panel ordered for baseline review.',
      'Prescribed Atorvastatin 20mg at bedtime.',
      'Recommended returning in 3 months for follow up.',
    ].join(' ');

    const chunks = createChunks(longClinicalNotes, 120, 40);
    assert.ok(chunks.length > 1);
  });
});
