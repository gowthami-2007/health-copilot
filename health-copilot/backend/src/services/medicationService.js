const Medication = require('../models/Medication');
const Timeline = require('../models/Timeline');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

class MedicationService {
  async createMedication(userId, data) {
    const med = await Medication.create({
      userId,
      ...data,
    });

    // Create Timeline event
    await Timeline.create({
      userId,
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

  async getMedications(userId, status = null) {
    const query = { userId };
    if (status && status !== 'ALL') {
      query.status = status;
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
    await med.save();

    return med;
  }

  async deleteMedication(medicationId, userId) {
    const med = await this.getMedicationById(medicationId, userId);

    await Timeline.deleteMany({ referenceId: med._id });
    await Medication.findByIdAndDelete(medicationId);

    return { message: 'Medication removed successfully' };
  }
}

module.exports = new MedicationService();
