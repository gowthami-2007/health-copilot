const patientProfileService = require('../services/patientProfileService');

class PatientProfileController {
  async getProfiles(req, res, next) {
    try {
      const profiles = await patientProfileService.getProfiles(req.user.id);
      res.status(200).json({
        success: true,
        message: 'Family profiles retrieved successfully',
        data: { profiles },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const profile = await patientProfileService.getProfileById(req.user.id, req.params.id);
      res.status(200).json({
        success: true,
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  }

  async createProfile(req, res, next) {
    try {
      const profile = await patientProfileService.createProfile(req.user.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Family profile created successfully',
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const profile = await patientProfileService.updateProfile(req.user.id, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Family profile updated successfully',
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  }

  async setPrimary(req, res, next) {
    try {
      const profile = await patientProfileService.setPrimary(req.user.id, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Primary profile updated',
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProfile(req, res, next) {
    try {
      const result = await patientProfileService.deleteProfile(req.user.id, req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PatientProfileController();
