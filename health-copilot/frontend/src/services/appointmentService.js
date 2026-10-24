import api from './api';

export const appointmentService = {
  async getAppointments(status, type, patientProfileId = null) {
    const params = {};
    if (status && status !== 'ALL') params.status = status;
    if (type && type !== 'ALL') params.type = type;
    if (patientProfileId) params.patientProfileId = patientProfileId;
    return await api.get('/appointments', { params });
  },

  async getOverdue(patientProfileId = null) {
    const params = {};
    if (patientProfileId) params.patientProfileId = patientProfileId;
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
