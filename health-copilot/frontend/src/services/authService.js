import api from './api';

export const authService = {
  async register(data) {
    return await api.post('/auth/register', data);
  },

  async login(credentials) {
    return await api.post('/auth/login', credentials);
  },

  async getMe() {
    return await api.get('/auth/me');
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Continue even if network error on logout
    } finally {
      localStorage.removeItem('health_copilot_token');
      localStorage.removeItem('health_copilot_user');
    }
  },
};

export default authService;
