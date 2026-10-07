import api from './api';

export const appointmentService = {
  async getAppointments(status) {
    return await api.get('/appointments', { params: { status } });
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
