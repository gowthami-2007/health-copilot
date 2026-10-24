const agentService = require('../services/agentService');

class AgentController {
  async getActions(req, res, next) {
    try {
      const { status, patientProfileId } = req.query;
      const actions = await agentService.getActions(req.user.id, status, patientProfileId);
      res.status(200).json({
        success: true,
        message: 'Agent actions retrieved successfully',
        data: { actions },
      });
    } catch (error) {
      next(error);
    }
  }

  async scanActions(req, res, next) {
    try {
      const { patientProfileId } = req.body;
      const newActions = await agentService.scanAndGenerateActions(req.user.id, patientProfileId);
      res.status(200).json({
        success: true,
        message: `Agent scan completed. ${newActions.length} proposal(s) generated.`,
        data: { actions: newActions },
      });
    } catch (error) {
      next(error);
    }
  }

  async approveAction(req, res, next) {
    try {
      const { editData } = req.body;
      const action = await agentService.approveAction(req.user.id, req.params.id, editData);
      res.status(200).json({
        success: true,
        message: 'Action approved and executed successfully',
        data: { action },
      });
    } catch (error) {
      next(error);
    }
  }

  async rejectAction(req, res, next) {
    try {
      const { reason } = req.body;
      const action = await agentService.rejectAction(req.user.id, req.params.id, reason);
      res.status(200).json({
        success: true,
        message: 'Action rejected',
        data: { action },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AgentController();
