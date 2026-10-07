const chunkRetriever = require('./chunkRetriever');
const llmClient = require('../llm/llmClient');
const { SYSTEM_HEALTH_PROMPT } = require('../prompts/systemPrompt');
const { createRagPrompt } = require('../prompts/ragPrompt');
const { sanitizeResponse } = require('../safety/healthSafety');

class RagService {
  /**
   * Main conversational RAG execution method using real dynamic LLM completions.
   */
  async answerQuestion({ question, userDocuments = [], conversationHistory = [] }) {
    if (!question || typeof question !== 'string' || !question.trim()) {
      throw new Error('Please provide a valid question regarding your health records.');
    }

    // 1. Retrieve top-k relevant document chunks if user has records
    const retrievedChunks = chunkRetriever.retrieveChunks(question, userDocuments, 4);

    // 2. Format prompt with document context
    const ragPrompt = createRagPrompt(question, retrievedChunks);

    // 3. Prepare messages for LLM
    const messages = [
      { role: 'system', content: SYSTEM_HEALTH_PROMPT },
      ...conversationHistory.slice(-8).map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: ragPrompt },
    ];

    // 4. Request dynamic response from LLM API
    const llmAnswer = await llmClient.chatCompletion({
      messages,
      temperature: 0.35,
    });

    if (!llmAnswer) {
      throw new Error('The AI service is temporarily unavailable. Please try again.');
    }

    return {
      answer: sanitizeResponse(llmAnswer),
      sources: retrievedChunks.map((c) => ({
        documentId: c.documentId,
        fileName: c.fileName,
        excerpt: c.chunkText.substring(0, 180) + '...',
      })),
    };
  }
}

module.exports = new RagService();
