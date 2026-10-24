import api from './api';

const extractId = (param) => {
  if (!param) return null;
  const id = typeof param === 'object' ? (param.patientProfileId || param._id || param.id) : param;
  if (!id || id === 'undefined' || id === 'null' || id === '[object Object]') return null;
  return id;
};

export const medicationService = {
  async getMedications(status, patientProfileId = null) {
    const params = {};
    if (status && status !== 'ALL') params.status = status;
    const cleanId = extractId(patientProfileId);
    if (cleanId) params.patientProfileId = cleanId;
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
