const { test, describe } = require('node:test');
const assert = require('node:assert');
const summaryService = require('../../ai-service/src/summarization/summaryService');
const { checkHealthSafety } = require('../../ai-service/src/safety/healthSafety');

describe('AI Service: Summarization & Safety Tests', () => {
  test('Safety Engine: catches emergency queries and outputs emergency alert', () => {
    const emergencyQuery = 'I have severe chest pain and cannot breathe, what should I do?';
    const result = checkHealthSafety(emergencyQuery);

    assert.strictEqual(result.isEmergency, true);
    assert.strictEqual(result.isSafe, false);
    assert.ok(result.safetyNotice.includes('EMERGENCY ALERT'));
  });

  test('Safety Engine: handles direct diagnostic questions with medical disclaimer', () => {
    const diagnosticQuery = 'Do I have cancer based on this?';
    const result = checkHealthSafety(diagnosticQuery);

    assert.strictEqual(result.isDiagnosticRequest, true);
    assert.ok(result.safetyNotice.includes('Medical Notice'));
  });

  test('Summary Service: produces structured summary with doctor questions', async () => {
    const sampleMedicalText = `
      Patient: Jane Smith
      Date: 2026-09-15
      Complete Blood Count:
      Hemoglobin: 13.5 g/dL (Reference: 12.0 - 15.5)
      White Blood Cells: 6.8 x10^3/uL
      Platelets: 250 x10^3/uL
      Medication: Metformin 500mg daily
      Notes: Routine health checkup.
    `;

    const summary = await summaryService.generateSummary(sampleMedicalText, 'Blood Report');

    assert.ok(summary.overview);
    assert.ok(Array.isArray(summary.keyInformation));
    assert.ok(summary.keyInformation.length > 0);
    assert.ok(Array.isArray(summary.doctorQuestions));
    assert.ok(summary.doctorQuestions.length > 0);
  });
});
