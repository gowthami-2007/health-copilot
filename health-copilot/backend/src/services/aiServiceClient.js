const path = require('path');

// Require the ai-service modules directly for ultra-low latency & reliability,
// or fallback to HTTP client if configured
let ragService, summaryService;
try {
  ragService = require('../../../ai-service/src/rag/ragService');
  summaryService = require('../../../ai-service/src/summarization/summaryService');
} catch (e) {
  console.warn('Could not load ai-service directly, will use fallback mock');
}

class AIServiceClient {
  async summarizeDocument({ extractedText, documentType }) {
    if (summaryService) {
      return await summaryService.generateSummary(extractedText, documentType);
    }
    return {
      overview: `Summary of ${documentType}`,
      keyInformation: ['Medical report details recorded.'],
      datesMentioned: [],
      medicationsMentioned: [],
      testsMentioned: [documentType],
      doctorQuestions: ['Discuss these laboratory measurements with your primary physician.'],
    };
  }

  async queryChat({ question, userDocuments = [], conversationHistory = [] }) {
    if (ragService) {
      return await ragService.answerQuestion({
        question,
        userDocuments,
        conversationHistory,
      });
    }
    return {
      answer: `Received question: "${question}". Please discuss all health concerns with your physician.`,
      sources: [],
    };
  }
}

module.exports = new AIServiceClient();
