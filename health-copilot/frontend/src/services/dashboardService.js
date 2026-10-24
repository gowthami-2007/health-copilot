import api from './api';

export const dashboardService = {
  async getDashboard(param = null) {
    const params = {};
    const patientProfileId =
      typeof param === 'object' && param !== null
        ? param.patientProfileId || param._id || param.id || null
        : param;

    if (
      patientProfileId &&
      patientProfileId !== 'undefined' &&
      patientProfileId !== 'null' &&
      patientProfileId !== '[object Object]'
    ) {
      params.patientProfileId = patientProfileId;
    }
    return await api.get('/dashboard', { params });
  },
};

export default dashboardService;
