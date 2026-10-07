import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import ErrorMessage from '../common/ErrorMessage';

const MedicationForm = ({ initialData, onSubmit, onCancel, isLoading = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'Once daily',
    instructions: '',
    startDate: new Date().toISOString().split('T')[0],
    prescribedBy: '',
    notes: '',
    status: 'ACTIVE',
  });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        dosage: initialData.dosage || '',
        frequency: initialData.frequency || 'Once daily',
        instructions: initialData.instructions || '',
        startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '',
        prescribedBy: initialData.prescribedBy || '',
        notes: initialData.notes || '',
        status: initialData.status || 'ACTIVE',
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.dosage.trim()) {
      setErrorMsg('Medication name and dosage are required.');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <ErrorMessage message={errorMsg} onDismiss={() => setErrorMsg('')} />

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label" htmlFor="med-name">Medication Name *</label>
          <input
            id="med-name"
            type="text"
            name="name"
            className="form-input"
            placeholder="e.g. Paracetamol, Metformin"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="med-dosage">Dosage *</label>
          <input
            id="med-dosage"
            type="text"
            name="dosage"
            className="form-input"
            placeholder="e.g. 500 mg, 1 tablet"
            value={formData.dosage}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label" htmlFor="med-frequency">Frequency / Schedule *</label>
          <select
            id="med-frequency"
            name="frequency"
            className="form-select"
            value={formData.frequency}
            onChange={handleChange}
          >
            <option value="Once daily in morning">Once daily (Morning)</option>
            <option value="Once daily at night">Once daily (Night / Bedtime)</option>
            <option value="Twice daily (Morning & Night)">Twice daily (Morning & Night)</option>
            <option value="Three times daily with meals">Three times daily (With meals)</option>
            <option value="Every 4 to 6 hours as needed">As needed (PRN)</option>
            <option value="Weekly">Weekly</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="med-status">Status</label>
          <select
            id="med-status"
            name="status"
            className="form-select"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="med-instructions">Special Instructions</label>
        <input
          id="med-instructions"
          type="text"
          name="instructions"
          className="form-input"
          placeholder="e.g. Take with food, drink full glass of water"
          value={formData.instructions}
          onChange={handleChange}
        />
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label" htmlFor="med-start-date">Start Date</label>
          <input
            id="med-start-date"
            type="date"
            name="startDate"
            className="form-input"
            value={formData.startDate}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="med-prescriber">Prescribed By Doctor</label>
          <input
            id="med-prescriber"
            type="text"
            name="prescribedBy"
            className="form-input"
            placeholder="e.g. Dr. Emily Thorne"
            value={formData.prescribedBy}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="med-notes">Notes</label>
        <textarea
          id="med-notes"
          rows={2}
          name="notes"
          className="form-textarea"
          placeholder="e.g. Refill needed after 30 days"
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
        <Button id="save-medication-btn" type="submit" variant="primary" isLoading={isLoading}>
          {initialData ? 'Update Medication' : 'Add Medication'}
        </Button>
      </div>
    </form>
  );
};

export default MedicationForm;
