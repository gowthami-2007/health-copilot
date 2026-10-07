/**
 * Document Summarization Prompt for transforming medical document text into structured JSON.
 * Section 16 & Section 37.
 */

const createDocumentSummaryPrompt = (extractedText, documentType = 'Medical Document') => {
  return `You are analyzing an extracted ${documentType}.
Extract and summarize the findings into a strictly valid JSON response according to the schema below.

DOCUMENT TEXT:
"""
${extractedText}
"""

SCHEMA REQUIREMENT:
Return ONLY valid JSON matching this schema:
{
  "overview": "A clear, plain-language summary of what this document is, why it was performed, and its main findings.",
  "keyInformation": [
    "Array of notable findings, measurements, or observations explicitly stated in the document (e.g., Hemoglobin: 14.2 g/dL, Normal sinus rhythm)."
  ],
  "datesMentioned": [
    "Any dates found in the document, such as test dates, report dates, or follow-up dates."
  ],
  "medicationsMentioned": [
    "Any medications, dosages, or treatments mentioned."
  ],
  "testsMentioned": [
    "Specific lab tests, imaging, or panels conducted (e.g. Complete Blood Count, Lipid Panel)."
  ],
  "doctorQuestions": [
    "3 to 5 clear, proactive questions the patient can ask their physician during their next visit about these findings."
  ]
}

SAFETY RULES:
- If any section has no information in the document, return an empty array [] or write "Not found in the uploaded document."
- Do NOT invent numbers or facts.
- Do NOT make diagnostic statements like "You have diabetes". Instead write: "The report indicates a fasting blood glucose of 140 mg/dL, which is above reference range. Discuss this with your doctor."`;
};

module.exports = {
  createDocumentSummaryPrompt,
};
