const dashboardService = require('../services/dashboardService');
const { successResponse } = require('../utils/apiResponse');

class DashboardController {
  async getDashboard(req, res, next) {
    try {
      const data = await dashboardService.getDashboardData(req.user.id);
      return successResponse(res, 'Dashboard data retrieved successfully', data, 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
