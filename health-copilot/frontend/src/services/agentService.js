import api from './api';

const extractId = (param) => {
  if (!param) return null;
  const id = typeof param === 'object' ? (param.patientProfileId || param._id || param.id) : param;
  if (!id || id === 'undefined' || id === 'null' || id === '[object Object]') return null;
  return id;
};

export const agentService = {
  async getActions(statusOrFilter = null, patientProfileId = null) {
    const params = {};
    let status = statusOrFilter;
    let profileId = patientProfileId;

    if (typeof statusOrFilter === 'object' && statusOrFilter !== null) {
      status = statusOrFilter.status || null;
      profileId = statusOrFilter.patientProfileId || statusOrFilter._id || statusOrFilter.id || null;
    }

    if (status && status !== 'ALL' && typeof status === 'string') {
      params.status = status;
    }

    const cleanId = extractId(profileId);
    if (cleanId) {
      params.patientProfileId = cleanId;
    }

    return await api.get('/agent/actions', { params });
  },

  async scanActions(param = null) {
    const cleanId = extractId(param);
    const payload = cleanId ? { patientProfileId: cleanId } : {};
    return await api.post('/agent/scan', payload);
  },

  async approveAction(id, editData = {}) {
    return await api.post(`/agent/actions/${id}/approve`, { editData });
  },

  async rejectAction(id, reason = '') {
    return await api.post(`/agent/actions/${id}/reject`, { reason });
  },
};

export default agentService;
