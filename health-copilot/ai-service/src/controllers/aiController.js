const ragService = require('../rag/ragService');
const summaryService = require('../summarization/summaryService');

class AIController {
  async chat(req, res) {
    try {
      const { question, userDocuments = [], conversationHistory = [] } = req.body;
      const result = await ragService.answerQuestion({
        question,
        userDocuments,
        conversationHistory,
      });

      return res.status(200).json({
        success: true,
        message: 'AI response generated successfully',
        data: result,
      });
    } catch (error) {
      console.error('AI chat error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'AI chat service encountered an error',
        error: 'AI_CHAT_ERROR',
      });
    }
  }

  async summarize(req, res) {
    try {
      const { extractedText, documentType } = req.body;
      const summary = await summaryService.generateSummary(extractedText, documentType);

      return res.status(200).json({
        success: true,
        message: 'Document summarized successfully',
        data: summary,
      });
    } catch (error) {
      console.error('AI summarization error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Summarization failed',
        error: 'SUMMARIZATION_ERROR',
      });
    }
  }
}

module.exports = new AIController();
