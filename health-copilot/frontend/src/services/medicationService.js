import api from './api';

export const medicationService = {
  async getMedications(status) {
    return await api.get('/medications', { params: { status } });
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

  async deleteMedication(id) {
    return await api.delete(`/medications/${id}`);
  },
};

export default medicationService;
