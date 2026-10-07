import React from 'react';
import { Calendar, Clock, MapPin, CheckCircle, Edit2, Trash2, UserCheck, AlertCircle } from 'lucide-react';

const AppointmentCard = ({ appointment, onEdit, onDelete, onComplete }) => {
  const isUpcoming = appointment.status === 'UPCOMING';
  const isCompleted = appointment.status === 'COMPLETED';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: isUpcoming ? 'var(--primary-light)' : '#f1f5f9',
            color: isUpcoming ? 'var(--primary)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserCheck size={20} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className={`badge ${isUpcoming ? 'badge-primary' : isCompleted ? 'badge-success' : 'badge-neutral'}`}>
              {appointment.status}
            </span>
            <button
              type="button"
              onClick={() => onEdit(appointment)}
              style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer', padding: '0.3rem', display: 'flex' }}
              title="Edit appointment"
              aria-label="Edit appointment"
            >
              <Edit2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(appointment._id)}
              style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer', padding: '0.3rem', display: 'flex' }}
              title="Delete appointment"
              aria-label="Delete appointment"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
          {appointment.doctorName}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, margin: '0.15rem 0 0.85rem 0' }}>
          {appointment.specialty || 'General Practitioner'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', fontWeight: 600 }}>
            <Calendar size={15} color="var(--primary)" />
            <span>{new Date(appointment.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
            <Clock size={15} />
            <span>Time: {appointment.time}</span>
          </div>

          {appointment.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
              <MapPin size={15} />
              <span>{appointment.location}</span>
            </div>
          )}

          {appointment.reason && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.4 }}>
              <strong>Reason:</strong> {appointment.reason}
            </p>
          )}

          {appointment.notes && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', lineHeight: 1.4 }}>
              <strong>Notes:</strong> {appointment.notes}
            </p>
          )}
        </div>
      </div>

      {isUpcoming && onComplete && (
        <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
          <button
            type="button"
            onClick={() => onComplete(appointment._id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.45rem',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 'var(--radius-sm)',
              color: '#065f46',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            <CheckCircle size={14} /> Mark as Completed
          </button>
        </div>
      )}
    </div>
  );
};

export default AppointmentCard;
