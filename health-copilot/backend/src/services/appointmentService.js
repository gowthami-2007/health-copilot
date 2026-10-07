const Appointment = require('../models/Appointment');
const Timeline = require('../models/Timeline');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

class AppointmentService {
  async createAppointment(userId, data) {
    const apt = await Appointment.create({
      userId,
      ...data,
    });

    // Create Timeline event
    await Timeline.create({
      userId,
      eventType: 'APPOINTMENT',
      title: `Scheduled Visit: ${apt.doctorName}`,
      description: `Specialty: ${apt.specialty}. Reason: ${apt.reason || 'General checkup'}. Time: ${apt.time}`,
      date: apt.date,
      referenceId: apt._id,
      metadata: {
        appointmentId: apt._id,
        doctorName: apt.doctorName,
        specialty: apt.specialty,
      },
    });

    return apt;
  }

  async getAppointments(userId, status = null) {
    const query = { userId };
    if (status && status !== 'ALL') {
      query.status = status;
    }
    return await Appointment.find(query).sort({ date: 1 });
  }

  async getAppointmentById(appointmentId, userId) {
    const apt = await Appointment.findById(appointmentId);
    if (!apt) {
      throw new NotFoundError('Appointment not found');
    }
    if (apt.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('Unauthorized to access this appointment record');
    }
    return apt;
  }

  async updateAppointment(appointmentId, userId, updateData) {
    const apt = await this.getAppointmentById(appointmentId, userId);

    Object.assign(apt, updateData);
    await apt.save();

    // If status changed to COMPLETED, update timeline
    if (updateData.status === 'COMPLETED') {
      await Timeline.create({
        userId,
        eventType: 'APPOINTMENT',
        title: `Completed Visit: ${apt.doctorName}`,
        description: `Consultation notes: ${apt.notes || 'Visit concluded successfully.'}`,
        date: new Date(),
        referenceId: apt._id,
      });
    }

    return apt;
  }

  async deleteAppointment(appointmentId, userId) {
    const apt = await this.getAppointmentById(appointmentId, userId);

    await Timeline.deleteMany({ referenceId: apt._id });
    await Appointment.findByIdAndDelete(appointmentId);

    return { message: 'Appointment removed successfully' };
  }
}

module.exports = new AppointmentService();
