import api from './api';

export const aiService = {
  async sendChat(question, conversationId = null) {
    return await api.post('/ai/chat', { question, conversationId });
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
