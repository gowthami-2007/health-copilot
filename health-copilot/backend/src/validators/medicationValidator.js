const { ValidationError } = require('../utils/errors');

const validateMedication = (data) => {
  const { name, dosage, frequency } = data || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new ValidationError('Medication name is required (e.g. Paracetamol, Lisinopril).');
  }

  if (!dosage || typeof dosage !== 'string' || !dosage.trim()) {
    throw new ValidationError('Dosage is required (e.g. 500 mg, 10 ml, 1 tablet).');
  }

  if (!frequency || typeof frequency !== 'string' || !frequency.trim()) {
    throw new ValidationError('Frequency is required (e.g. Once daily, Twice daily with food).');
  }

  return {
    name: name.trim(),
    dosage: dosage.trim(),
    frequency: frequency.trim(),
    instructions: data.instructions ? data.instructions.trim() : '',
    startDate: data.startDate ? new Date(data.startDate) : new Date(),
    endDate: data.endDate ? new Date(data.endDate) : null,
    prescribedBy: data.prescribedBy ? data.prescribedBy.trim() : '',
    notes: data.notes ? data.notes.trim() : '',
    status: data.status || 'ACTIVE',
  };
};

module.exports = {
  validateMedication,
};
