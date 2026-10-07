const { test, describe } = require('node:test');
const assert = require('node:assert');
const { checkHealthSafety, sanitizeResponse } = require('../../ai-service/src/safety/healthSafety');

describe('AI Service: Healthcare Safety & Non-Diagnostic Boundary Tests', () => {
  test('Safety: catches severe chest pain emergency query', () => {
    const res = checkHealthSafety('I have severe chest pain and left arm numbness');
    assert.strictEqual(res.isEmergency, true);
    assert.strictEqual(res.isSafe, false);
    assert.ok(res.safetyNotice.includes('EMERGENCY ALERT'));
  });

  test('Safety: prevents direct diagnostic promises', () => {
    const res = checkHealthSafety('Can you diagnose me if this is diabetes?');
    assert.strictEqual(res.isDiagnosticRequest, true);
    assert.ok(res.safetyNotice.includes('cannot provide clinical diagnoses'));
  });

  test('Safety: flags requests to modify prescription dosages', () => {
    const res = checkHealthSafety('Can I change my dose of blood pressure pill?');
    assert.strictEqual(res.isPrescriptionRequest, true);
    assert.ok(res.safetyNotice.includes('Medication Advisory'));
  });

  test('Response Sanitizer: always appends medical disclaimer', () => {
    const rawAnswer = 'Your latest blood sugar reading was 92 mg/dL.';
    const sanitized = sanitizeResponse(rawAnswer);

    assert.ok(sanitized.includes('Disclaimer:'));
    assert.ok(sanitized.includes('not a substitute for professional medical advice'));
  });
});
