import api from './api';

export const wellnessService = {
  async getRecommendations(patientProfileId = null) {
    const params = {};
    if (patientProfileId) params.patientProfileId = patientProfileId;
    return await api.get('/wellness', { params });
  },

  async updateStatus(id, status) {
    return await api.patch(`/wellness/${id}/status`, { status });
  },
};

export default wellnessService;
