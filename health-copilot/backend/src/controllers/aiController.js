const aiChatService = require('../services/aiChatService');
const aiServiceClient = require('../services/aiServiceClient');
const Document = require('../models/Document');
const { BadRequestError } = require('../utils/errors');

class AIController {
  /**
   * Health Chat Handler. Accepts both { message, history } and { question, conversationId }.
   */
  async chat(req, res, next) {
    try {
      const { question, message, conversationId, history } = req.body;
      const rawText = (message || question || '').trim();

      if (!rawText) {
        throw new BadRequestError('Please provide a message or question for the health assistant.');
      }

      if (rawText.length > 2500) {
        throw new BadRequestError('Message exceeds maximum allowed length of 2500 characters.');
      }

      const result = await aiChatService.sendMessage({
        userId: req.user?.id || null,
        conversationId,
        question: rawText,
        message: rawText,
        history,
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getConversations(req, res, next) {
    try {
      const conversations = await aiChatService.getUserConversations(req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Conversations retrieved',
        data: { conversations },
      });
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
      return res.status(200).json({
        success: true,
        message: 'Messages retrieved',
        data: { messages },
      });
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
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {},
      });
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

      return res.status(200).json({
        success: true,
        message: 'Document summarized',
        data: { summary },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AIController();
