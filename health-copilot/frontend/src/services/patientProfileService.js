import api from './api';

export const patientProfileService = {
  async getProfiles() {
    return await api.get('/family-profiles');
  },

  async getProfileById(id) {
    return await api.get(`/family-profiles/${id}`);
  },

  async createProfile(data) {
    return await api.post('/family-profiles', data);
  },

  async updateProfile(id, data) {
    return await api.put(`/family-profiles/${id}`, data);
  },

  async setPrimary(id) {
    return await api.post(`/family-profiles/${id}/set-primary`);
  },

  async deleteProfile(id) {
    return await api.delete(`/family-profiles/${id}`);
  },
};

export default patientProfileService;
