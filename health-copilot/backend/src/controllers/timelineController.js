const timelineService = require('../services/timelineService');
const { successResponse } = require('../utils/apiResponse');

class TimelineController {
  async getTimeline(req, res, next) {
    try {
      const timelineData = await timelineService.getTimeline(req.user.id);
      return successResponse(res, 'Health timeline retrieved', timelineData, 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TimelineController();
