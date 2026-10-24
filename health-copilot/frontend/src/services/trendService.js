import api from './api';

const extractId = (param) => {
  if (!param) return null;
  const id = typeof param === 'object' ? (param.patientProfileId || param._id || param.id) : param;
  if (!id || id === 'undefined' || id === 'null' || id === '[object Object]') return null;
  return id;
};

export const trendService = {
  async getTrends(param = null) {
    const params = {};
    const patientProfileId = extractId(param);
    if (patientProfileId) params.patientProfileId = patientProfileId;
    return await api.get('/trends', { params });
  },

  async getInsights(param = null) {
    const params = {};
    const patientProfileId = extractId(param);
    if (patientProfileId) params.patientProfileId = patientProfileId;
    return await api.get('/trends/insights', { params });
  },
};

export default trendService;
