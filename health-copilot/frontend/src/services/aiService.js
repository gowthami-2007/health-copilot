import api from './api';

export const aiService = {
  /**
   * Upload an attachment file for chat
   */
  async uploadAttachment(file, onUploadProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/ai/upload-attachment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },

  /**
   * Sends user message, attachments, and prior conversation history to POST /api/chat.
   */
  async sendChat(message, conversationId = null, history = [], signal = null, attachments = []) {
    return await api.post(
      '/chat',
      {
        message,
        question: message,
        conversationId,
        history,
        attachments,
      },
      signal ? { signal } : undefined
    );
  },

  async getConversations(signal = null) {
    return await api.get('/ai/conversations', signal ? { signal } : undefined);
  },

  async getMessages(conversationId, signal = null) {
    return await api.get(`/ai/conversations/${conversationId}/messages`, signal ? { signal } : undefined);
  },

  async deleteConversation(conversationId) {
    return await api.delete(`/ai/conversations/${conversationId}`);
  },

  async renameConversation(conversationId, title) {
    return await api.put(`/ai/conversations/${conversationId}`, { title });
  },

  async summarizeDocument(documentId) {
    return await api.post(`/ai/summarize/${documentId}`);
  },
};

export default aiService;
