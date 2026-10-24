const Medication = require('../models/Medication');
const Timeline = require('../models/Timeline');
const schedulerService = require('./schedulerService');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { sanitizeObjectId } = require('../utils/idSanitizer');

class MedicationService {
  /**
   * Helper to derive standard reminder times from prescription frequency
   */
  deriveDefaultReminderTimes(frequency = '') {
    const f = frequency.toLowerCase();
    if (f.includes('four') || f.includes('qid')) {
      return ['08:00', '12:00', '16:00', '20:00'];
    }
    if (f.includes('three') || f.includes('thrice') || f.includes('tid')) {
      return ['08:00', '14:00', '20:00'];
    }
    if (f.includes('twice') || f.includes('bd') || f.includes('bid')) {
      return ['08:00', '20:00'];
    }
    if (f.includes('night') || f.includes('bedtime') || f.includes('hs')) {
      return ['21:00'];
    }
    if (f.includes('afternoon') || f.includes('lunch')) {
      return ['13:00'];
    }
    // Default once daily in morning
    return ['08:00'];
  }

  async createMedication(userId, data) {
    let reminderTimes = data.reminderTimes;
    if (!Array.isArray(reminderTimes) || reminderTimes.length === 0) {
      reminderTimes = this.deriveDefaultReminderTimes(data.frequency);
    }

    const nextOccurrence = schedulerService.calculateNextOccurrence(reminderTimes, null);

    const med = await Medication.create({
      userId,
      ...data,
      reminderTimes,
      nextOccurrence,
    });

    // Create Timeline event
    await Timeline.create({
      userId,
      patientProfileId: med.patientProfileId || null,
      eventType: 'MEDICATION',
      title: `Added Medication: ${med.name}`,
      description: `Dosage: ${med.dosage} (${med.frequency}). Instructions: ${med.instructions || 'As prescribed.'}`,
      date: med.startDate || new Date(),
      referenceId: med._id,
      metadata: {
        medicationId: med._id,
        name: med.name,
        dosage: med.dosage,
      },
    });

    return med;
  }

  async getMedications(userId, status = null, patientProfileId = null) {
    const cleanProfileId = sanitizeObjectId(patientProfileId);
    const query = { userId };
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (cleanProfileId) {
      query.patientProfileId = cleanProfileId;
    }
    return await Medication.find(query).sort({ createdAt: -1 });
  }

  async getMedicationById(medicationId, userId) {
    const med = await Medication.findById(medicationId);
    if (!med) {
      throw new NotFoundError('Medication not found');
    }
    if (med.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('Unauthorized to view this medication record');
    }
    return med;
  }

  async updateMedication(medicationId, userId, updateData) {
    const med = await this.getMedicationById(medicationId, userId);

    Object.assign(med, updateData);

    if (updateData.reminderTimes || updateData.snoozeUntil !== undefined) {
      med.nextOccurrence = schedulerService.calculateNextOccurrence(
        med.reminderTimes,
        med.snoozeUntil
      );
    }

    await med.save();
    return med;
  }

  async recordDoseAction(medicationId, userId, actionData) {
    return await schedulerService.recordDoseAction(userId, medicationId, actionData);
  }

  async deleteMedication(medicationId, userId) {
    const med = await this.getMedicationById(medicationId, userId);

    await Timeline.deleteMany({ referenceId: med._id });
    await Medication.findByIdAndDelete(medicationId);

    return { message: 'Medication removed successfully' };
  }
}

module.exports = new MedicationService();
