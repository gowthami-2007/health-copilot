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

  /**
   * Analyzes a prescription image using multimodal AI vision.
   * Sends actual image file directly to vision backend.
   */
  async analyzePrescription(file, onProgress) {
    const formData = new FormData();
    formData.append('image', file);

    return await api.post('/documents/analyze-prescription', formData, {
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

  /**
   * Saves confirmed, user-reviewed prescription image and structured data to the vault.
   */
  async saveReviewedPrescription(file, prescriptionData, patientProfileId = null) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append(
      'prescriptionData',
      typeof prescriptionData === 'string' ? prescriptionData : JSON.stringify(prescriptionData)
    );
    if (patientProfileId) {
      formData.append('patientProfileId', patientProfileId);
    }

    return await api.post('/documents/save-prescription', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
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
