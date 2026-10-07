import React from 'react';
import { Pill, Edit2, Trash2, Clock, Calendar, CheckCircle, PauseCircle } from 'lucide-react';

const MedicationCard = ({ medication, onEdit, onDelete }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge badge-success"><CheckCircle size={12} /> Active</span>;
      case 'PAUSED':
        return <span className="badge badge-warning"><PauseCircle size={12} /> Paused</span>;
      default:
        return <span className="badge badge-neutral">Completed</span>;
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--secondary-light)',
            color: 'var(--secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Pill size={20} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {getStatusBadge(medication.status)}
            <button
              type="button"
              onClick={() => onEdit(medication)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-subtle)',
                cursor: 'pointer',
                padding: '0.3rem',
                display: 'flex',
              }}
              title="Edit medication"
              aria-label="Edit medication"
            >
              <Edit2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(medication._id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-subtle)',
                cursor: 'pointer',
                padding: '0.3rem',
                display: 'flex',
              }}
              title="Delete medication"
              aria-label="Delete medication"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
          {medication.name}
        </h3>

        <div style={{
          display: 'inline-block',
          backgroundColor: '#f1f5f9',
          padding: '0.2rem 0.55rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--text-main)',
          margin: '0.4rem 0 0.85rem 0'
        }}>
          Dosage: {medication.dosage}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
            <Clock size={14} color="var(--primary)" />
            <span><strong>Schedule:</strong> {medication.frequency}</span>
          </div>

          {medication.instructions && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '0.25rem', lineHeight: 1.4 }}>
              <strong>Instructions:</strong> {medication.instructions}
            </p>
          )}

          {medication.prescribedBy && (
            <p style={{ color: 'var(--text-subtle)', fontSize: '0.78rem' }}>
              Prescribed by: {medication.prescribedBy}
            </p>
          )}
        </div>
      </div>

      <div style={{
        marginTop: '1rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: 'var(--text-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Calendar size={12} />
          <span>Started {new Date(medication.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>
    </div>
  );
};

export default MedicationCard;
