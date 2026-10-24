import api from './api';

export const dashboardService = {
  async getDashboard(patientProfileId = null) {
    const params = {};
    if (patientProfileId) params.patientProfileId = patientProfileId;
    return await api.get('/dashboard', { params });
  },
};

export default dashboardService;
