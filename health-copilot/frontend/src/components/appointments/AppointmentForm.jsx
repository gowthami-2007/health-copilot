import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import ErrorMessage from '../common/ErrorMessage';

const SPECIALTIES = [
  'General Practitioner',
  'Cardiology',
  'Endocrinology',
  'Dermatology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Gastroenterology',
  'Ophthalmology',
  'Other',
];

const AppointmentForm = ({ initialData, onSubmit, onCancel, isLoading = false }) => {
  const [formData, setFormData] = useState({
    doctorName: '',
    specialty: 'General Practitioner',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    time: '10:00 AM',
    location: '',
    reason: '',
    notes: '',
    status: 'UPCOMING',
  });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        doctorName: initialData.doctorName || '',
        specialty: initialData.specialty || 'General Practitioner',
        date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : '',
        time: initialData.time || '10:00 AM',
        location: initialData.location || '',
        reason: initialData.reason || '',
        notes: initialData.notes || '',
        status: initialData.status || 'UPCOMING',
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.doctorName.trim() || !formData.date || !formData.time.trim()) {
      setErrorMsg('Doctor name, date, and time are required.');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <ErrorMessage message={errorMsg} onDismiss={() => setErrorMsg('')} />

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label" htmlFor="apt-doctor">Doctor / Healthcare Provider *</label>
          <input
            id="apt-doctor"
            type="text"
            name="doctorName"
            className="form-input"
            placeholder="e.g. Dr. Robert Chen"
            value={formData.doctorName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="apt-specialty">Specialty</label>
          <select
            id="apt-specialty"
            name="specialty"
            className="form-select"
            value={formData.specialty}
            onChange={handleChange}
          >
            {SPECIALTIES.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label" htmlFor="apt-date">Date *</label>
          <input
            id="apt-date"
            type="date"
            name="date"
            className="form-input"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="apt-time">Time *</label>
          <input
            id="apt-time"
            type="text"
            name="time"
            className="form-input"
            placeholder="e.g. 10:30 AM"
            value={formData.time}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="apt-location">Location / Clinic / Virtual Link</label>
        <input
          id="apt-location"
          type="text"
          name="location"
          className="form-input"
          placeholder="e.g. City Health Center, Suite 402 or Telehealth"
          value={formData.location}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="apt-reason">Reason for Visit</label>
        <input
          id="apt-reason"
          type="text"
          name="reason"
          className="form-input"
          placeholder="e.g. Annual physical, review recent blood test"
          value={formData.reason}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="apt-notes">Preparation Notes</label>
        <textarea
          id="apt-notes"
          rows={2}
          name="notes"
          className="form-textarea"
          placeholder="e.g. Fasting 8 hours prior required"
          value={formData.notes}
          onChange={handleChange}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button id="save-appointment-btn" type="submit" variant="primary" isLoading={isLoading}>
          {initialData ? 'Update Appointment' : 'Schedule Appointment'}
        </Button>
      </div>
    </form>
  );
};

export default AppointmentForm;
