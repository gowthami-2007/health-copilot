import api from './api';

export const authService = {
  async register(data) {
    return await api.post('/auth/register', data);
  },

  async login(credentials) {
    return await api.post('/auth/login', credentials);
  },

  async googleAuth(idToken) {
    return await api.post('/auth/google', { idToken });
  },

  async verifyEmail({ token, code, email }) {
    return await api.post('/auth/verify-email', { token, code, email });
  },

  async resendVerification(email) {
    return await api.post('/auth/resend-verification', { email });
  },

  async forgotPassword(email) {
    return await api.post('/auth/forgot-password', { email });
  },

  async resetPassword({ token, password, confirmPassword }) {
    return await api.post('/auth/reset-password', { token, password, confirmPassword });
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
