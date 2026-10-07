import React from 'react';
import MedicationCard from './MedicationCard';
import { Pill, Plus } from 'lucide-react';
import Button from '../common/Button';

const MedicationList = ({ medications = [], onEdit, onDelete, onOpenAdd }) => {
  if (medications.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#f1f5f9',
          color: 'var(--text-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto'
        }}>
          <Pill size={32} />
        </div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          No medications added yet.
        </h3>
        <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem auto', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Organize your prescriptions, dosages, and daily medication schedules in one place.
        </p>
        <Button variant="primary" onClick={onOpenAdd} icon={Plus}>
          Add Medication
        </Button>
      </div>
    );
  }

  return (
    <div className="grid-3">
      {medications.map((med) => (
        <MedicationCard key={med._id} medication={med} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
};

export default MedicationList;
