import api from './api';

export const aiService = {
  /**
   * Sends user message and prior conversation history to POST /api/chat.
   */
  async sendChat(message, conversationId = null, history = []) {
    return await api.post('/chat', {
      message,
      question: message,
      conversationId,
      history,
    });
  },

  async getConversations() {
    return await api.get('/ai/conversations');
  },

  async getMessages(conversationId) {
    return await api.get(`/ai/conversations/${conversationId}/messages`);
  },

  async deleteConversation(conversationId) {
    return await api.delete(`/ai/conversations/${conversationId}`);
  },

  async summarizeDocument(documentId) {
    return await api.post(`/ai/summarize/${documentId}`);
  },
};

export default aiService;
