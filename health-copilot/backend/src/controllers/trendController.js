const healthTrendsService = require('../services/healthTrendsService');
const { sanitizeObjectId } = require('../utils/idSanitizer');

class TrendController {
  async getTrends(req, res, next) {
    try {
      const patientProfileId = sanitizeObjectId(req.query.patientProfileId);
      const trends = await healthTrendsService.getTrends(req.user.id, patientProfileId);
      res.status(200).json({
        success: true,
        message: 'Health trends retrieved successfully',
        data: { trends },
      });
    } catch (error) {
      next(error);
    }
  }

  async getInsights(req, res, next) {
    try {
      const patientProfileId = sanitizeObjectId(req.query.patientProfileId);
      const insights = await healthTrendsService.getPreventiveInsights(req.user.id, patientProfileId);
      res.status(200).json({
        success: true,
        message: 'Preventive health insights retrieved successfully',
        data: { insights },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TrendController();
