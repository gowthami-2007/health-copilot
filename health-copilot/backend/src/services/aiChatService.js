const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Document = require('../models/Document');
const aiServiceClient = require('./aiServiceClient');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

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
   * Sends a user query to the RAG pipeline with strictly scoped user documents.
   */
  async sendMessage({ userId, conversationId, question }) {
    if (!question || !question.trim()) {
      throw new Error('Question cannot be empty');
    }

    // 1. Get or create conversation scoped to this user
    const conversation = await this.getOrCreateConversation(
      userId,
      conversationId,
      question.trim()
    );

    // 2. Fetch recent conversation history
    const history = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .limit(6);
    const formattedHistory = history.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 3. Strictly fetch ONLY this user's processed documents for RAG context
    const userDocuments = await Document.find({
      userId,
      status: 'PROCESSED',
    }).select('fileName documentType chunks extractedText createdAt');

    // 4. Save user message to DB
    const userMsg = await Message.create({
      conversationId: conversation._id,
      role: 'user',
      content: question.trim(),
    });

    // 5. Query RAG engine
    const aiResponse = await aiServiceClient.queryChat({
      question: question.trim(),
      userDocuments,
      conversationHistory: formattedHistory,
    });

    // 6. Save assistant message to DB
    const assistantMsg = await Message.create({
      conversationId: conversation._id,
      role: 'assistant',
      content: aiResponse.answer,
      sources: aiResponse.sources || [],
    });

    // 7. Touch conversation updatedAt
    conversation.updatedAt = new Date();
    await conversation.save();

    return {
      conversationId: conversation._id,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      sources: aiResponse.sources || [],
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
