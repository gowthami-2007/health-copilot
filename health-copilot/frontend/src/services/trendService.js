import api from './api';

export const trendService = {
  async getTrends(patientProfileId = null) {
    const params = {};
    if (patientProfileId) params.patientProfileId = patientProfileId;
    return await api.get('/trends', { params });
  },

  async getInsights(patientProfileId = null) {
    const params = {};
    if (patientProfileId) params.patientProfileId = patientProfileId;
    return await api.get('/trends/insights', { params });
  },
};

export default trendService;
