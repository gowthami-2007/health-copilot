const Appointment = require('../models/Appointment');
const Document = require('../models/Document');
const Timeline = require('../models/Timeline');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

class AppointmentService {
  async createAppointment(userId, data) {
    const isOverdue = data.date && new Date(data.date) < new Date() && data.status === 'UPCOMING';

    const apt = await Appointment.create({
      userId,
      ...data,
      isOverdueFollowup: data.isOverdueFollowup !== undefined ? data.isOverdueFollowup : isOverdue,
    });

    // Create Timeline event
    const isConsultation = apt.type === 'CONSULTATION';
    await Timeline.create({
      userId,
      patientProfileId: apt.patientProfileId || null,
      eventType: 'APPOINTMENT',
      title: isConsultation
        ? `Doctor Consultation: ${apt.doctorName}`
        : `Scheduled Visit: ${apt.doctorName}`,
      description: `Specialty: ${apt.specialty}. ${apt.reason ? `Reason: ${apt.reason}. ` : ''}Time: ${apt.time}`,
      date: apt.date,
      referenceId: apt._id,
      metadata: {
        appointmentId: apt._id,
        doctorName: apt.doctorName,
        specialty: apt.specialty,
        type: apt.type,
        sourceDocumentId: apt.sourceDocumentId,
        autoExtracted: apt.autoExtracted,
      },
    });

    return apt;
  }

  async getAppointments(userId, status = null, type = null, patientProfileId = null) {
    const query = { userId };
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (type && type !== 'ALL') {
      query.type = type.toUpperCase();
    }
    if (patientProfileId) {
      query.patientProfileId = patientProfileId;
    }
    const appointments = await Appointment.find(query)
      .populate('sourceDocumentId', 'fileName fileUrl documentType')
      .sort({ date: 1 });

    const now = new Date();
    // Dynamically mark overdue status if appointment date has passed
    return appointments.map((apt) => {
      const obj = apt.toObject();
      if (obj.status === 'UPCOMING' && new Date(obj.date) < now) {
        obj.isOverdueFollowup = true;
      }
      return obj;
    });
  }

  async getOverdueFollowups(userId, patientProfileId = null) {
    const now = new Date();
    const query = {
      userId,
      status: 'UPCOMING',
      $or: [
        { isOverdueFollowup: true },
        { date: { $lt: now } },
      ],
    };
    if (patientProfileId) {
      query.patientProfileId = patientProfileId;
    }
    return await Appointment.find(query)
      .populate('sourceDocumentId', 'fileName fileUrl documentType')
      .sort({ date: 1 });
  }

  async getAppointmentById(appointmentId, userId) {
    const apt = await Appointment.findById(appointmentId).populate('sourceDocumentId', 'fileName fileUrl documentType');
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
    if (apt.status === 'UPCOMING' && new Date(apt.date) < new Date()) {
      apt.isOverdueFollowup = true;
    } else if (apt.status === 'COMPLETED' || apt.status === 'CANCELLED') {
      apt.isOverdueFollowup = false;
    }

    await apt.save();

    // If status changed to COMPLETED, update timeline
    if (updateData.status === 'COMPLETED') {
      const isConsultation = apt.type === 'CONSULTATION';
      await Timeline.create({
        userId,
        patientProfileId: apt.patientProfileId || null,
        eventType: 'APPOINTMENT',
        title: isConsultation
          ? `Completed Consultation: ${apt.doctorName}`
          : `Completed Visit: ${apt.doctorName}`,
        description: `Consultation notes: ${apt.notes || 'Visit concluded successfully.'}`,
        date: new Date(),
        referenceId: apt._id,
        metadata: {
          appointmentId: apt._id,
          doctorName: apt.doctorName,
          type: apt.type,
        },
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
