const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Document = require('../models/Document');
const llmService = require('./llm.service');
const { NotFoundError, BadRequestError } = require('../utils/errors');

class AIChatService {
  /**
   * Retrieves or initializes a conversation for a specific patient.
   */
  async getOrCreateConversation(userId, conversationId = null, title = 'Health Consultation') {
    if (conversationId) {
      const conv = await Conversation.findOne({ _id: conversationId, userId });
      if (!conv) {
        throw new NotFoundError('Conversation not found');
      }
      return conv;
    }

    return await Conversation.create({
      userId,
      title: title.length > 40 ? `${title.substring(0, 37)}...` : title,
    });
  }

  /**
   * Lists all chat conversations belonging to the user.
   */
  async getUserConversations(userId) {
    return await Conversation.find({ userId }).sort({ updatedAt: -1 });
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
  async sendMessage({ userId, conversationId, question, message, history = [] }) {
    const rawQuery = (message || question || '').trim();

    if (!rawQuery) {
      throw new BadRequestError('Message cannot be empty');
    }

    if (rawQuery.length > 2500) {
      throw new BadRequestError('Message exceeds maximum allowed length of 2500 characters');
    }

    // 1. Get or create conversation record
    let conversation = null;
    if (userId) {
      conversation = await this.getOrCreateConversation(userId, conversationId, rawQuery);
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

    // 3. Strictly fetch user's processed medical documents if user is logged in
    let documentContext = [];
    if (userId) {
      const userDocs = await Document.find({
        userId,
        status: 'PROCESSED',
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('fileName documentType extractedText createdAt');

      documentContext = userDocs.map((doc) => ({
        fileName: doc.fileName,
        documentType: doc.documentType,
        text: (doc.extractedText || '').substring(0, 1500),
      }));
    }

    // 4. Record user message in DB if user is authenticated
    let userMsg = null;
    if (conversation) {
      userMsg = await Message.create({
        conversationId: conversation._id,
        role: 'user',
        content: rawQuery,
      });
    }

    // 5. Invoke Real LLM Service
    let generatedAnswer = '';
    try {
      generatedAnswer = await llmService.generateResponse({
        message: rawQuery,
        history: formattedHistory,
        documentContext,
      });
    } catch (llmError) {
      console.error('LLM generation error in AIChatService:', llmError.message);
      // Clean, user-facing error message without exposing secrets
      if (llmError.message.includes('AI_CONFIG_MISSING')) {
        throw new Error('The AI service is not configured. Please set AI_API_KEY in the backend environment.');
      }
      throw new Error('The AI service is temporarily unavailable. Please try again.');
    }

    // 6. Record assistant message in DB
    let assistantMsg = null;
    if (conversation) {
      assistantMsg = await Message.create({
        conversationId: conversation._id,
        role: 'assistant',
        content: generatedAnswer,
        sources: documentContext.map((d) => ({ fileName: d.fileName })),
      });

      conversation.updatedAt = new Date();
      await conversation.save();
    }

    return {
      conversationId: conversation?._id || null,
      message: generatedAnswer,
      userMessage: userMsg || { role: 'user', content: rawQuery },
      assistantMessage: assistantMsg || { role: 'assistant', content: generatedAnswer },
      sources: documentContext.map((d) => ({ fileName: d.fileName })),
    };
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
