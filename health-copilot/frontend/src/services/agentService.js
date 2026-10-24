import api from './api';

export const agentService = {
  async getActions(status = null, patientProfileId = null) {
    const params = {};
    if (status && status !== 'ALL') params.status = status;
    if (patientProfileId) params.patientProfileId = patientProfileId;
    return await api.get('/agent/actions', { params });
  },

  async scanActions(patientProfileId = null) {
    return await api.post('/agent/scan', { patientProfileId });
  },

  async approveAction(id, editData = {}) {
    return await api.post(`/agent/actions/${id}/approve`, { editData });
  },

  async rejectAction(id, reason = '') {
    return await api.post(`/agent/actions/${id}/reject`, { reason });
  },
};

export default agentService;
