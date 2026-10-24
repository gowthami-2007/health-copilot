import api from './api';

const extractId = (param) => {
  if (!param) return null;
  const id = typeof param === 'object' ? (param.patientProfileId || param._id || param.id) : param;
  if (!id || id === 'undefined' || id === 'null' || id === '[object Object]') return null;
  return id;
};

export const appointmentService = {
  async getAppointments(status, type, patientProfileId = null) {
    const params = {};
    if (status && status !== 'ALL') params.status = status;
    if (type && type !== 'ALL') params.type = type;
    const cleanId = extractId(patientProfileId);
    if (cleanId) params.patientProfileId = cleanId;
    return await api.get('/appointments', { params });
  },

  async getOverdue(patientProfileId = null) {
    const params = {};
    const cleanId = extractId(patientProfileId);
    if (cleanId) params.patientProfileId = cleanId;
    return await api.get('/appointments/overdue', { params });
  },

  async getAppointmentById(id) {
    return await api.get(`/appointments/${id}`);
  },

  async createAppointment(data) {
    return await api.post('/appointments', data);
  },

  async updateAppointment(id, data) {
    return await api.put(`/appointments/${id}`, data);
  },

  async deleteAppointment(id) {
    return await api.delete(`/appointments/${id}`);
  },
};

export default appointmentService;
