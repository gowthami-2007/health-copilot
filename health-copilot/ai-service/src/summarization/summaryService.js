const llmClient = require('../llm/llmClient');
const { SYSTEM_HEALTH_PROMPT } = require('../prompts/systemPrompt');
const { createDocumentSummaryPrompt } = require('../prompts/summaryPrompt');
const { sanitizeResponse } = require('../safety/healthSafety');

class SummaryService {
  /**
   * Generates a structured healthcare summary from raw extracted document text.
   */
  async generateSummary(extractedText, documentType = 'Medical Document') {
    if (!extractedText || extractedText.trim().length === 0) {
      return {
        overview: 'No readable text was available in this document to summarize.',
        keyInformation: [],
        datesMentioned: [],
        medicationsMentioned: [],
        testsMentioned: [],
        doctorQuestions: ['Discuss this uploaded document directly with your doctor for clinical interpretation.'],
      };
    }

    const prompt = createDocumentSummaryPrompt(extractedText, documentType);

    // 1. Attempt generation via external LLM
    try {
      const llmResult = await llmClient.chatCompletion({
        messages: [
          { role: 'system', content: SYSTEM_HEALTH_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      });

      if (llmResult) {
        // Strip code fences if present (```json ... ```)
        const cleanedJson = llmResult.replace(/^```json/m, '').replace(/```$/m, '').trim();
        const parsed = JSON.parse(cleanedJson);
        return {
          overview: parsed.overview || 'Overview of medical findings in report.',
          keyInformation: Array.isArray(parsed.keyInformation) ? parsed.keyInformation : [],
          datesMentioned: Array.isArray(parsed.datesMentioned) ? parsed.datesMentioned : [],
          medicationsMentioned: Array.isArray(parsed.medicationsMentioned) ? parsed.medicationsMentioned : [],
          testsMentioned: Array.isArray(parsed.testsMentioned) ? parsed.testsMentioned : [],
          doctorQuestions: Array.isArray(parsed.doctorQuestions) ? parsed.doctorQuestions : [],
        };
      }
    } catch (err) {
      console.warn('External LLM parsing failed, using medical heuristic extraction engine:', err.message);
    }

    // 2. Deterministic Local Medical Heuristic Extractor Fallback
    return this.fallbackHeuristicSummary(extractedText, documentType);
  }

  /**
   * Safe, deterministic parser for local development and offline environments.
   */
  fallbackHeuristicSummary(text, documentType) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // Heuristics for measurements / key info
    const keyInfo = [];
    const tests = [];
    const medications = [];
    const dates = [];

    // Date regex
    const dateRegex = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]+ \d{1,2},? \d{4})\b/g;
    let match;
    while ((match = dateRegex.exec(text)) !== null) {
      if (!dates.includes(match[0]) && dates.length < 5) {
        dates.push(match[0]);
      }
    }

    // Measurement & lab lines
    const measurementRegex = /(hemoglobin|rbc|wbc|platelet|glucose|cholesterol|hdl|ldl|triglycerides|creatinine|urea|blood pressure|alt|ast|tsh|vitamin)\s*[:=-]?\s*([0-9.]+\s*[\w/%^]+)/i;
    const medRegex = /(mg|mcg|ml|tablets?|capsules?|daily|bid|tid|od|prn)\b/i;

    for (const line of lines) {
      if (measurementRegex.test(line) && keyInfo.length < 6) {
        keyInfo.push(line);
      }
      if (/(test|panel|scan|x-ray|mri|ct|ultrasound|cbc|ecg)/i.test(line) && tests.length < 4) {
        tests.push(line.replace(/[:=].*$/, '').trim());
      }
      if (medRegex.test(line) && !keyInfo.includes(line) && medications.length < 4) {
        medications.push(line);
      }
    }

    // If no specific lines caught, pick top informative lines
    if (keyInfo.length === 0 && lines.length > 0) {
      keyInfo.push(...lines.slice(0, 3));
    }

    return {
      overview: `This document contains clinical record data for a ${documentType}. It details relevant laboratory measurements, clinical observations, and patient instructions.`,
      keyInformation: keyInfo.length > 0 ? keyInfo : ['Values documented in the full report.'],
      datesMentioned: dates.length > 0 ? dates : ['See full document for exact collection timestamps.'],
      medicationsMentioned: medications.length > 0 ? medications : ['No direct medication changes recorded in this section.'],
      testsMentioned: tests.length > 0 ? tests : [documentType],
      doctorQuestions: [
        'How do these results compare with my previous baseline tests?',
        'Are any follow-up blood tests or physical evaluations recommended?',
        'Do any of these findings warrant changes to my diet, lifestyle, or treatment plan?',
      ],
    };
  }
}

module.exports = new SummaryService();
