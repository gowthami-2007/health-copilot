const fs = require('fs');
const path = require('path');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Document = require('../models/Document');
const llmService = require('./llm.service');
const documentService = require('./documentService');
const { processDocumentFile } = require('../../../document-service/src/processing/documentProcessor');
const { NotFoundError, BadRequestError } = require('../utils/errors');

class AIChatService {
  /**
   * Retrieves or initializes a conversation for a specific patient.
   */
  async getOrCreateConversation(userId, conversationId = null, title = null) {
    if (conversationId) {
      const conv = await Conversation.findOne({ _id: conversationId, userId });
      if (!conv) {
        throw new NotFoundError('Conversation not found');
      }
      return conv;
    }

    const defaultTitle = title && title.trim() ? title.trim() : 'New Consultation';
    return await Conversation.create({
      userId,
      title: defaultTitle.length > 50 ? `${defaultTitle.substring(0, 47)}...` : defaultTitle,
      isCustomTitle: false,
    });
  }

  /**
   * Lists all chat conversations belonging to the user.
   */
  async getUserConversations(userId) {
    const list = await Conversation.find({ userId }).sort({ updatedAt: -1 });

    // Clean legacy long titles if they contain raw user questions
    return list.map((c) => {
      let title = c.title;
      // If title is long or looks like an unformatted legacy raw query, sanitize presentation
      if (title && !c.isCustomTitle && title.length > 35) {
        title = llmService.heuristicFallbackTitle(title);
      }
      return {
        _id: c._id,
        userId: c.userId,
        title: title || 'Health Consultation',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });
  }

  /**
   * Retrieves chronological messages for a conversation, strictly verifying user ownership.
   */
  async getConversationMessages(conversationId, userId) {
    const conv = await Conversation.findOne({ _id: conversationId, userId });
    if (!conv) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    return await Message.find({ conversationId }).sort({ createdAt: 1 });
  }

  /**
   * Sends a user query to the real LLM pipeline with multi-turn history & user document context.
   */
  async sendMessage({ userId, conversationId, question, message, history = [], attachments = [] }) {
    const rawQuery = (message || question || '').trim();

    if (!rawQuery && (!Array.isArray(attachments) || attachments.length === 0)) {
      throw new BadRequestError('Message or attachment is required');
    }

    if (rawQuery.length > 2500) {
      throw new BadRequestError('Message exceeds maximum allowed length of 2500 characters');
    }

    // 1. Get or create conversation record
    let conversation = null;
    if (userId) {
      conversation = await this.getOrCreateConversation(userId, conversationId, 'New Consultation');
    }

    // 2. Build multi-turn conversation context
    let formattedHistory = [];
    if (Array.isArray(history) && history.length > 0) {
      formattedHistory = history
        .slice(-8)
        .filter((h) => h && h.content && (h.role === 'user' || h.role === 'assistant'))
        .map((h) => ({ role: h.role, content: String(h.content).trim() }));
    } else if (conversation) {
      const dbHistory = await Message.find({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .limit(8);
      formattedHistory = dbHistory.reverse().map((m) => ({
        role: m.role,
        content: m.content,
      }));
    }

    // 3. Process direct attachments (uploaded documents or captured images)
    let processedAttachments = [];
    let attachmentImages = [];
    let attachmentDocumentContext = [];

    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (!att) continue;
        let docRecord = null;
        if (att.documentId && userId) {
          docRecord = await Document.findOne({ _id: att.documentId, userId });
        }

        const fileName = att.fileName || docRecord?.fileName || 'Attachment';
        const fileType = att.fileType || docRecord?.fileType || 'application/octet-stream';
        const fileSize = att.fileSize || docRecord?.fileSize || 0;
        const fileUrl = att.fileUrl || docRecord?.fileUrl || '';
        const attachmentType = att.attachmentType || (fileType.startsWith('image/') ? 'image' : 'document');

        processedAttachments.push({
          documentId: docRecord?._id || att.documentId || null,
          fileName,
          fileType,
          fileSize,
          fileUrl,
          attachmentType,
          uploadedAt: new Date(),
        });

        // If it's an image, read base64 for LLM vision if available
        if (attachmentType === 'image' && docRecord) {
          try {
            const filePath = documentService.resolvePhysicalPath(docRecord);
            if (filePath && fs.existsSync(filePath)) {
              const fileBuf = fs.readFileSync(filePath);
              attachmentImages.push({
                mimeType: fileType,
                base64: fileBuf.toString('base64'),
              });
            }
          } catch (imgReadErr) {
            console.warn('Could not read image for vision input:', imgReadErr.message);
          }
        }

        // If it's a document (or image with extracted text), add its extracted text to context
        if (docRecord) {
          let extractedText = docRecord.extractedText || '';
          if (!extractedText) {
            try {
              const filePath = documentService.resolvePhysicalPath(docRecord);
              if (filePath && fs.existsSync(filePath)) {
                const extraction = await processDocumentFile(filePath, docRecord.fileType, docRecord.fileSize);
                if (extraction.success && extraction.extractedText) {
                  extractedText = extraction.extractedText;
                  docRecord.extractedText = extractedText;
                  docRecord.status = 'PROCESSED';
                  await docRecord.save();
                }
              }
            } catch (procErr) {
              console.warn('Error extracting text for chat attachment:', procErr.message);
            }
          }

          if (extractedText) {
            attachmentDocumentContext.push({
              fileName,
              documentType: docRecord.documentType || 'Uploaded Document',
              text: extractedText.substring(0, 3000),
            });
          }
        }
      }
    }

    // 4. Fetch user's background processed medical documents if user is logged in
    let documentContext = [...attachmentDocumentContext];
    if (userId) {
      const userDocs = await Document.find({
        userId,
        status: 'PROCESSED',
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('fileName documentType extractedText createdAt');

      for (const doc of userDocs) {
        // avoid duplicating attachment if already in context
        if (!documentContext.some((d) => d.fileName === doc.fileName)) {
          documentContext.push({
            documentId: doc._id,
            fileName: doc.fileName,
            documentType: doc.documentType,
            text: (doc.extractedText || '').substring(0, 1500),
          });
        }
      }
    }

    const effectiveQuery = rawQuery || (processedAttachments.length > 0 ? `Please analyze the attached ${processedAttachments.map(a => a.fileName).join(', ')}.` : 'Hello');

    // 5. Record user message in DB if user is authenticated
    let userMsg = null;
    if (conversation) {
      userMsg = await Message.create({
        conversationId: conversation._id,
        role: 'user',
        content: effectiveQuery,
        attachments: processedAttachments,
      });
    }

    // 6. Invoke Real LLM Service
    let generatedAnswer = '';
    try {
      generatedAnswer = await llmService.generateResponse({
        message: effectiveQuery,
        history: formattedHistory,
        documentContext,
        images: attachmentImages,
      });
    } catch (llmError) {
      console.error('LLM generation error in AIChatService:', llmError.message);
      // Clean up orphaned user message so it doesn't leave an unanswered prompt in DB
      if (userMsg && userMsg._id) {
        await Message.findByIdAndDelete(userMsg._id).catch(() => {});
      }
      // Clean, user-facing error message without exposing secrets
      if (llmError.message.includes('AI_CONFIG_MISSING')) {
        throw new Error('The AI service is not configured. Please set AI_API_KEY in the backend environment.');
      }
      throw new Error('The AI service is temporarily unavailable. Please try again.');
    }

    // 7. Record assistant message in DB
    let assistantMsg = null;
    if (conversation) {
      assistantMsg = await Message.create({
        conversationId: conversation._id,
        role: 'assistant',
        content: generatedAnswer,
        sources: documentContext.map((d) => ({ documentId: d.documentId || null, fileName: d.fileName })),
      });

      // 8. Dynamic Title Generation:
      // If the conversation still has a default or un-customized title, generate a meaningful 3-7 word title
      if (!conversation.isCustomTitle) {
        try {
          const generatedTitle = await llmService.generateConversationTitle(effectiveQuery, generatedAnswer);
          if (generatedTitle && generatedTitle.trim()) {
            conversation.title = generatedTitle.trim();
            conversation.isCustomTitle = true;
          }
        } catch (titleErr) {
          console.warn('Non-blocking title generation error:', titleErr.message);
          // Retain intelligent heuristic title without breaking
          if (!conversation.title || conversation.title === 'New Consultation' || conversation.title === 'Health Consultation') {
            conversation.title = llmService.heuristicFallbackTitle(effectiveQuery);
            conversation.isCustomTitle = true;
          }
        }
      }

      conversation.updatedAt = new Date();
      await conversation.save();
    }

    return {
      conversationId: conversation?._id || null,
      conversationTitle: conversation?.title || 'Health Consultation',
      message: generatedAnswer,
      userMessage: userMsg || { role: 'user', content: effectiveQuery, attachments: processedAttachments },
      assistantMessage: assistantMsg || { role: 'assistant', content: generatedAnswer },
      sources: documentContext.map((d) => ({ documentId: d.documentId || null, fileName: d.fileName })),
    };
  }

  /**
   * Renames a conversation title.
   */
  async renameConversation(conversationId, userId, newTitle) {
    const conv = await Conversation.findOne({ _id: conversationId, userId });
    if (!conv) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    conv.title = (newTitle || '').trim() || 'Health Consultation';
    conv.isCustomTitle = true;
    conv.updatedAt = new Date();
    await conv.save();

    return conv;
  }

  /**
   * Deletes a conversation and all its messages.
   */
  async deleteConversation(conversationId, userId) {
    const conv = await Conversation.findOne({ _id: conversationId, userId });
    if (!conv) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    await Message.deleteMany({ conversationId: conv._id });
    await Conversation.findByIdAndDelete(conv._id);

    return { message: 'Conversation deleted successfully' };
  }
}

module.exports = new AIChatService();
