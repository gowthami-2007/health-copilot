import api from './api';

export const profileService = {
  async getProfile() {
    return await api.get('/profile');
  },

  async updateProfile(data) {
    return await api.put('/profile', data);
  },

  async deleteAccount() {
    return await api.delete('/profile');
  },

  async linkMockAbha(data) {
    return await api.post('/profile/abha/link', data);
  },

  async unlinkMockAbha() {
    return await api.post('/profile/abha/unlink');
  },

  async getSampleAbhaRecords() {
    return await api.get('/profile/abha/samples');
  },

  async importSampleAbhaRecord(recordId) {
    return await api.post('/profile/abha/import', { recordId });
  },
};

export default profileService;
