const aiChatService = require('../services/aiChatService');
const aiServiceClient = require('../services/aiServiceClient');
const documentService = require('../services/documentService');
const Document = require('../models/Document');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');

class AIController {
  /**
   * Secure upload endpoint for chat attachments (images, camera shots, PDF reports).
   * Stores files safely with user isolation and creates a Document record.
   */
  async uploadAttachment(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError('No file was uploaded');
      }

      const isImage = req.file.mimetype.startsWith('image/');
      const documentType = isImage ? 'Other' : 'Other';

      const doc = await documentService.uploadDocument({
        userId: req.user.id,
        file: req.file,
        documentType,
      });

      return res.status(201).json({
        success: true,
        message: 'Attachment uploaded successfully',
        data: {
          attachment: {
            documentId: doc._id,
            fileName: doc.fileName,
            fileType: doc.fileType,
            fileSize: doc.fileSize,
            fileUrl: doc.fileUrl,
            attachmentType: isImage ? 'image' : 'document',
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Health Chat Handler. Accepts message, conversationId, history, and optional attachments.
   */
  async chat(req, res, next) {
    try {
      const { question, message, conversationId, history, attachments } = req.body;
      const rawText = (message || question || '').trim();

      if (!rawText && (!Array.isArray(attachments) || attachments.length === 0)) {
        throw new BadRequestError('Please provide a message or attach a document/photo for the health assistant.');
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
        attachments: Array.isArray(attachments) ? attachments : [],
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
        const otherDoc = await Document.findById(documentId).select('_id userId');
        if (otherDoc && otherDoc.userId.toString() !== req.user.id.toString()) {
          throw new ForbiddenError('You do not have permission to access or summarize this document.');
        }
        throw new NotFoundError('Document not found');
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
