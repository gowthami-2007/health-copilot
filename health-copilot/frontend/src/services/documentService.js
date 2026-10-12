import api from './api';

export const documentService = {
  async uploadDocument(file, documentType = 'Other', onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    return await api.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
  },

  async getDocuments(params = {}) {
    return await api.get('/documents', { params });
  },

  async getDocumentById(id) {
    return await api.get(`/documents/${id}`);
  },

  async processDocument(id) {
    return await api.post(`/documents/${id}/process`);
  },

  async updateStructuredData(id, data) {
    return await api.put(`/documents/${id}/structured-data`, data);
  },

  async getFhirBundle(id) {
    return await api.get(`/documents/${id}/fhir`);
  },

  async deleteDocument(id) {
    return await api.delete(`/documents/${id}`);
  },
};

export default documentService;
