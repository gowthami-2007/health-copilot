import api from './api';

export const medicationService = {
  async getMedications(status, patientProfileId = null) {
    const params = {};
    if (status && status !== 'ALL') params.status = status;
    if (patientProfileId) params.patientProfileId = patientProfileId;
    return await api.get('/medications', { params });
  },

  async getMedicationById(id) {
    return await api.get(`/medications/${id}`);
  },

  async createMedication(data) {
    return await api.post('/medications', data);
  },

  async updateMedication(id, data) {
    return await api.put(`/medications/${id}`, data);
  },

  async recordAction(id, { action, scheduledTime, notes, snoozeMinutes = 15 }) {
    return await api.post(`/medications/${id}/action`, { action, scheduledTime, notes, snoozeMinutes });
  },

  async deleteMedication(id) {
    return await api.delete(`/medications/${id}`);
  },
};

export default medicationService;
