const aiChatService = require('../services/aiChatService');
const aiServiceClient = require('../services/aiServiceClient');
const Document = require('../models/Document');
const { successResponse } = require('../utils/apiResponse');
const { BadRequestError } = require('../utils/errors');

class AIController {
  async chat(req, res, next) {
    try {
      const { question, conversationId } = req.body;
      if (!question || !question.trim()) {
        throw new BadRequestError('Please provide a health question');
      }

      const result = await aiChatService.sendMessage({
        userId: req.user.id,
        conversationId,
        question,
      });

      return successResponse(res, 'AI response generated successfully', result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getConversations(req, res, next) {
    try {
      const conversations = await aiChatService.getUserConversations(req.user.id);
      return successResponse(res, 'Conversations retrieved', { conversations }, 200);
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req, res, next) {
    try {
      const messages = await aiChatService.getConversationMessages(
        req.params.conversationId,
        req.user.id
      );
      return successResponse(res, 'Messages retrieved', { messages }, 200);
    } catch (error) {
      next(error);
    }
  }

  async deleteConversation(req, res, next) {
    try {
      const result = await aiChatService.deleteConversation(
        req.params.conversationId,
        req.user.id
      );
      return successResponse(res, result.message, {}, 200);
    } catch (error) {
      next(error);
    }
  }

  async summarizeDocument(req, res, next) {
    try {
      const { documentId } = req.params;
      const doc = await Document.findOne({ _id: documentId, userId: req.user.id });
      if (!doc) {
        throw new BadRequestError('Document not found or access denied');
      }

      const summary = await aiServiceClient.summarizeDocument({
        extractedText: doc.extractedText,
        documentType: doc.documentType,
      });

      doc.summary = summary;
      await doc.save();

      return successResponse(res, 'Document summarized', { summary }, 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AIController();
