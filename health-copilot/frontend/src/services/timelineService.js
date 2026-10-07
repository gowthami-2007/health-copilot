import api from './api';

export const timelineService = {
  async getTimeline() {
    return await api.get('/timeline');
  },
};

export default timelineService;
