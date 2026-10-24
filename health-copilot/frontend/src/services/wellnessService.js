import api from './api';

const extractId = (param) => {
  if (!param) return null;
  const id = typeof param === 'object' ? (param.patientProfileId || param._id || param.id) : param;
  if (!id || id === 'undefined' || id === 'null' || id === '[object Object]') return null;
  return id;
};

export const wellnessService = {
  async getRecommendations(param = null) {
    const params = {};
    const patientProfileId = extractId(param);
    if (patientProfileId) params.patientProfileId = patientProfileId;
    return await api.get('/wellness', { params });
  },

  async updateStatus(id, status) {
    return await api.patch(`/wellness/${id}/status`, { status });
  },
};

export default wellnessService;
