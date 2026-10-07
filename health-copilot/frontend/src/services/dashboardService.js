import api from './api';

export const dashboardService = {
  async getDashboard() {
    return await api.get('/dashboard');
  },
};

export default dashboardService;
