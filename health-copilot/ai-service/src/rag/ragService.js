const chunkRetriever = require('./chunkRetriever');
const llmClient = require('../llm/llmClient');
const { SYSTEM_HEALTH_PROMPT } = require('../prompts/systemPrompt');
const { createRagPrompt } = require('../prompts/ragPrompt');
const { checkHealthSafety, sanitizeResponse } = require('../safety/healthSafety');

class RagService {
  /**
   * Main conversational RAG execution method.
   */
  async answerQuestion({ question, userDocuments = [], conversationHistory = [] }) {
    if (!question || typeof question !== 'string') {
      return {
        answer: 'Please provide a valid question regarding your health records.',
        sources: [],
      };
    }

    // 1. Safety Guardrail Check
    const safety = checkHealthSafety(question);
    if (!safety.isSafe && safety.isEmergency) {
      return {
        answer: safety.safetyNotice,
        sources: [],
        isEmergency: true,
      };
    }

    // 2. Retrieve top-k relevant document chunks
    const retrievedChunks = chunkRetriever.retrieveChunks(question, userDocuments, 4);

    // 3. Format prompt
    const ragPrompt = createRagPrompt(question, retrievedChunks);

    // Add safety notice if diagnostic or prescription inquiry
    let preamble = '';
    if (safety.safetyNotice) {
      preamble = `${safety.safetyNotice}\n\n`;
    }

    // 4. Send to LLM
    try {
      const messages = [
        { role: 'system', content: SYSTEM_HEALTH_PROMPT },
        ...conversationHistory.slice(-4).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user', content: ragPrompt },
      ];

      const llmAnswer = await llmClient.chatCompletion({
        messages,
        temperature: 0.3,
      });

      if (llmAnswer) {
        return {
          answer: sanitizeResponse(preamble + llmAnswer),
          sources: retrievedChunks.map((c) => ({
            documentId: c.documentId,
            fileName: c.fileName,
            excerpt: c.chunkText.substring(0, 180) + '...',
          })),
        };
      }
    } catch (err) {
      console.warn('LLM completion failed, using contextual fallback generator:', err.message);
    }

    // 5. Deterministic Contextual Fallback Response
    let fallbackText = '';
    if (retrievedChunks.length > 0) {
      const topChunk = retrievedChunks[0];
      fallbackText = `Based on your uploaded **${topChunk.fileName}**, here is the relevant record excerpt:\n\n> "${topChunk.chunkText.substring(0, 320)}..."\n\nPlease consult with your physician for clinical interpretation of these results.`;
    } else {
      fallbackText = `I searched your uploaded medical documents, but could not find information addressing "${question}".\n\nPlease ensure your latest lab reports, prescriptions, or clinic notes have been uploaded to your account.`;
    }

    return {
      answer: sanitizeResponse(preamble + fallbackText),
      sources: retrievedChunks.map((c) => ({
        documentId: c.documentId,
        fileName: c.fileName,
        excerpt: c.chunkText.substring(0, 180) + '...',
      })),
    };
  }
}

module.exports = new RagService();
