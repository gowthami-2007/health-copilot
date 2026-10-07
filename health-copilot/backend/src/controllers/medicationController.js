const medicationService = require('../services/medicationService');
const { validateMedication } = require('../validators/medicationValidator');
const { successResponse } = require('../utils/apiResponse');

class MedicationController {
  async create(req, res, next) {
    try {
      const validatedData = validateMedication(req.body);
      const med = await medicationService.createMedication(req.user.id, validatedData);
      return successResponse(res, 'Medication added successfully', med, 201);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const { status } = req.query;
      const medications = await medicationService.getMedications(req.user.id, status);
      return successResponse(res, 'Medications retrieved', { medications }, 200);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const med = await medicationService.getMedicationById(req.params.id, req.user.id);
      return successResponse(res, 'Medication retrieved', med, 200);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await medicationService.updateMedication(
        req.params.id,
        req.user.id,
        req.body
      );
      return successResponse(res, 'Medication updated successfully', updated, 200);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await medicationService.deleteMedication(req.params.id, req.user.id);
      return successResponse(res, result.message, {}, 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MedicationController();
