import React from 'react';
import { Link } from 'react-router-dom';
import { Pill, ArrowRight, Sun, Moon, Clock } from 'lucide-react';

const MedicationOverview = ({ medications = [] }) => {
  const getFrequencyIcon = (freq = '') => {
    const lower = freq.toLowerCase();
    if (lower.includes('morning')) return <Sun size={14} color="#f59e0b" />;
    if (lower.includes('night') || lower.includes('bed')) return <Moon size={14} color="#6366f1" />;
    return <Clock size={14} color="var(--primary)" />;
  };

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Pill size={20} color="var(--secondary)" />
          <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Current Medications</h3>
        </div>
        <Link to="/medications" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          View all <ArrowRight size={14} />
        </Link>
      </div>

      {medications.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-light)'
        }}>
          <Pill size={36} color="var(--text-subtle)" style={{ marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            No medications added yet
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Organize active dosages, schedules, and physician instructions
          </p>
          <Link to="/medications" className="btn btn-secondary btn-sm">
            Add Medication
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
          {medications.map((med) => (
            <div
              key={med._id}
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--secondary-light)',
                  color: 'var(--secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Pill size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.925rem', color: 'var(--text-main)', margin: 0, fontWeight: 600 }}>
                    {med.name}
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Dosage: {med.dosage}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  padding: '0.2rem 0.55rem',
                  backgroundColor: '#f1f5f9',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  {getFrequencyIcon(med.frequency)}
                  <span>{med.frequency}</span>
                </div>
                {med.instructions && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', margin: '0.2rem 0 0 0' }}>
                    {med.instructions}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicationOverview;
