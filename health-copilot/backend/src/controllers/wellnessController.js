const wellnessService = require('../services/wellnessService');
const { sanitizeObjectId } = require('../utils/idSanitizer');

class WellnessController {
  async getRecommendations(req, res, next) {
    try {
      const patientProfileId = sanitizeObjectId(req.query.patientProfileId);
      const recommendations = await wellnessService.getRecommendations(req.user.id, patientProfileId);
      res.status(200).json({
        success: true,
        message: 'Personalized wellness recommendations retrieved',
        data: { recommendations },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const updated = await wellnessService.updateStatus(req.user.id, req.params.id, status);
      res.status(200).json({
        success: true,
        message: `Recommendation marked as ${status.toLowerCase()}`,
        data: { recommendation: updated },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WellnessController();
