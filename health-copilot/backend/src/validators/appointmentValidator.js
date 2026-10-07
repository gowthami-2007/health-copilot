const { ValidationError } = require('../utils/errors');

const validateAppointment = (data) => {
  const { doctorName, date, time } = data || {};

  if (!doctorName || typeof doctorName !== 'string' || !doctorName.trim()) {
    throw new ValidationError('Doctor or provider name is required.');
  }

  if (!date) {
    throw new ValidationError('Appointment date is required.');
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new ValidationError('Invalid appointment date format.');
  }

  if (!time || typeof time !== 'string' || !time.trim()) {
    throw new ValidationError('Appointment time is required (e.g. 10:30 AM).');
  }

  return {
    doctorName: doctorName.trim(),
    specialty: data.specialty ? data.specialty.trim() : 'General Practitioner',
    date: parsedDate,
    time: time.trim(),
    location: data.location ? data.location.trim() : '',
    reason: data.reason ? data.reason.trim() : '',
    notes: data.notes ? data.notes.trim() : '',
    status: data.status || 'UPCOMING',
  };
};

module.exports = {
  validateAppointment,
};
