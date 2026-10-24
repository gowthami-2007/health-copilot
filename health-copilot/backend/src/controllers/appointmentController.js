const appointmentService = require('../services/appointmentService');
const { validateAppointment } = require('../validators/appointmentValidator');
const { successResponse } = require('../utils/apiResponse');

class AppointmentController {
  async create(req, res, next) {
    try {
      const validatedData = validateAppointment(req.body);
      if (req.body.patientProfileId) {
        validatedData.patientProfileId = req.body.patientProfileId;
      }
      if (req.body.isOverdueFollowup !== undefined) {
        validatedData.isOverdueFollowup = req.body.isOverdueFollowup;
      }
      const apt = await appointmentService.createAppointment(req.user.id, validatedData);
      return successResponse(res, 'Appointment scheduled successfully', apt, 201);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const { status, type, patientProfileId } = req.query;
      const appointments = await appointmentService.getAppointments(req.user.id, status, type, patientProfileId);
      return successResponse(res, 'Appointments retrieved', { appointments }, 200);
    } catch (error) {
      next(error);
    }
  }

  async getOverdue(req, res, next) {
    try {
      const { patientProfileId } = req.query;
      const overdue = await appointmentService.getOverdueFollowups(req.user.id, patientProfileId);
      return successResponse(res, 'Overdue follow-ups retrieved', { overdue }, 200);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const apt = await appointmentService.getAppointmentById(req.params.id, req.user.id);
      return successResponse(res, 'Appointment retrieved', apt, 200);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await appointmentService.updateAppointment(
        req.params.id,
        req.user.id,
        req.body
      );
      return successResponse(res, 'Appointment updated successfully', updated, 200);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await appointmentService.deleteAppointment(req.params.id, req.user.id);
      return successResponse(res, result.message, {}, 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AppointmentController();
