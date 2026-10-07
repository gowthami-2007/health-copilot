/**
 * Retrieval-Augmented Generation (RAG) Prompt for conversational health assistant.
 * Section 18 & Section 37.
 */

const createRagPrompt = (userQuestion, contextChunks = [], userHealthContext = {}) => {
  let contextBlock = '';

  if (contextChunks && contextChunks.length > 0) {
    contextBlock = contextChunks
      .map((c, i) => `[Source ${i + 1} - ${c.fileName || 'Health Document'}]:\n${c.chunkText}`)
      .join('\n\n---\n\n');
  } else {
    contextBlock = 'No specific document passages matched this query.';
  }

  return `You are answering questions about the patient's personal health records using the retrieved context provided below.

RETRIEVED PATIENT RECORDS:
"""
${contextBlock}
"""

PATIENT QUESTION:
"${userQuestion}"

INSTRUCTIONS:
1. Answer the question using ONLY the provided health context where applicable.
2. If the user asks about something not found in their records (e.g., "What is my cholesterol?" when no lipid panel exists), clearly state: "I searched your uploaded records, but I could not find information regarding that. Please ensure the relevant report has been uploaded."
3. Cite the document names when stating facts (e.g., "According to your Blood Report from Oct 2026...").
4. Never diagnose medical conditions or advise changing prescription dosages.
5. Provide actionable questions for their physician if appropriate.`;
};

module.exports = {
  createRagPrompt,
};
