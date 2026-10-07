/**
 * Healthcare AI Safety Policy and Guardrails.
 * Enforces strict boundaries: no diagnostic claims, no prescriptions, emergency warnings.
 */

const EMERGENCY_KEYWORDS = [
  'severe chest pain',
  'difficulty breathing',
  'cannot breathe',
  'stroke',
  'heart attack',
  'suicide',
  'kill myself',
  'unconscious',
  'heavy bleeding',
  'poisoning',
  'overdose',
];

const DIAGNOSTIC_PATTERNS = [
  /do i have cancer/i,
  /am i dying/i,
  /diagnose me/i,
  /what illness do i have/i,
  /confirm my disease/i,
];

const PRESCRIPTION_PATTERNS = [
  /should i stop taking/i,
  /can i change my dose/i,
  /what medicine should i buy/i,
  /prescribe me/i,
];

const checkHealthSafety = (inputQuery) => {
  if (!inputQuery || typeof inputQuery !== 'string') {
    return { isSafe: true, reason: null, safetyNotice: null };
  }

  const queryLower = inputQuery.toLowerCase();

  // 1. Check for immediate emergency conditions
  for (const keyword of EMERGENCY_KEYWORDS) {
    if (queryLower.includes(keyword)) {
      return {
        isEmergency: true,
        isSafe: false,
        safetyNotice:
          '🚨 EMERGENCY ALERT: If you or someone else is experiencing severe symptoms (e.g. chest pain, difficulty breathing, suspected poisoning, or life-threatening distress), please call your local emergency services (e.g. 911 / 112 / 999) or proceed to the nearest emergency room immediately.',
      };
    }
  }

  // 2. Check for direct diagnostic requests
  for (const pattern of DIAGNOSTIC_PATTERNS) {
    if (pattern.test(queryLower)) {
      return {
        isDiagnosticRequest: true,
        isSafe: true,
        safetyNotice:
          '⚠️ Medical Notice: Health Copilot is an informational assistant and cannot provide clinical diagnoses. Any potential health concerns must be evaluated by a licensed healthcare professional.',
      };
    }
  }

  // 3. Check for prescription/dosage tampering requests
  for (const pattern of PRESCRIPTION_PATTERNS) {
    if (pattern.test(queryLower)) {
      return {
        isPrescriptionRequest: true,
        isSafe: true,
        safetyNotice:
          '⚠️ Medication Advisory: Never start, alter, or stop any prescribed medication without direct guidance from your prescribing physician or pharmacist.',
      };
    }
  }

  return { isSafe: true, reason: null, safetyNotice: null };
};

const sanitizeResponse = (response) => {
  if (!response || typeof response !== 'string') return response;

  // Strip trailing disclaimer blocks and boilerplate notices
  let sanitized = response
    .replace(/\n+\s*(?:\*{3,}|-{3,}|_{3,})\s*[\s\S]*$/i, '')
    .replace(/\n+\s*(?:>|\*|_)*\s*(?:medical\s+)?disclaimer\s*:?[\s\S]*$/i, '')
    .replace(/\n+\s*(?:>|\*|_)*\s*(?:please\s+note|note)\s*:?\s*(?:this\s+information|ai-generated\s+information|this\s+is\s+for\s+educational)[\s\S]*$/i, '')
    .trim();

  return sanitized;
};

module.exports = {
  checkHealthSafety,
  sanitizeResponse,
  EMERGENCY_KEYWORDS,
};
