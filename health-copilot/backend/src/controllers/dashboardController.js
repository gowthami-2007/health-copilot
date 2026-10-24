const dashboardService = require('../services/dashboardService');
const { successResponse } = require('../utils/apiResponse');
const { sanitizeObjectId } = require('../utils/idSanitizer');

class DashboardController {
  async getDashboard(req, res, next) {
    try {
      const patientProfileId = sanitizeObjectId(req.query.patientProfileId);
      const data = await dashboardService.getDashboardData(req.user.id, patientProfileId);
      return successResponse(res, 'Dashboard data retrieved successfully', data, 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
