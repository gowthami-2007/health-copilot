import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  Edit2,
  Trash2,
  UserCheck,
  Stethoscope,
  Sparkles,
  FileText,
} from 'lucide-react';

const AppointmentCard = ({ appointment, onEdit, onDelete, onComplete }) => {
  const isUpcoming = appointment.status === 'UPCOMING';
  const isCompleted = appointment.status === 'COMPLETED';
  const isConsultation = appointment.type === 'CONSULTATION';

  const docId = appointment.sourceDocumentId?._id || appointment.sourceDocumentId;
  const docName = appointment.sourceDocumentId?.fileName;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderLeft: isConsultation ? '4px solid #8b5cf6' : '4px solid var(--primary)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: isConsultation
              ? 'rgba(139, 92, 246, 0.12)'
              : isUpcoming
              ? 'var(--primary-light)'
              : '#f1f5f9',
            color: isConsultation ? '#7c3aed' : isUpcoming ? 'var(--primary)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {isConsultation ? <Stethoscope size={20} /> : <UserCheck size={20} />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* Type Badge */}
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: isConsultation ? '#ede9fe' : '#e0f2fe',
                color: isConsultation ? '#6d28d9' : '#0369a1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              {isConsultation ? <Stethoscope size={11} /> : <Calendar size={11} />}
              {isConsultation ? 'Consultation' : 'Appointment'}
            </span>

            {/* Status Badge */}
            <span className={`badge ${isUpcoming ? 'badge-primary' : isCompleted ? 'badge-success' : 'badge-neutral'}`}>
              {appointment.status}
            </span>

            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(appointment)}
                style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer', padding: '0.3rem', display: 'flex' }}
                title="Edit record"
                aria-label="Edit record"
              >
                <Edit2 size={15} />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(appointment._id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer', padding: '0.3rem', display: 'flex' }}
                title="Delete record"
                aria-label="Delete record"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
          {appointment.doctorName}
        </h3>
        <p style={{
          fontSize: '0.85rem',
          color: isConsultation ? '#7c3aed' : 'var(--primary)',
          fontWeight: 600,
          margin: '0.15rem 0 0.85rem 0'
        }}>
          {appointment.specialty || 'General Practitioner'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', fontWeight: 600 }}>
            <Calendar size={15} color={isConsultation ? '#7c3aed' : 'var(--primary)'} />
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
              <strong>{isConsultation ? 'Assessment / Reason:' : 'Reason:'}</strong> {appointment.reason}
            </p>
          )}

          {appointment.notes && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', lineHeight: 1.4 }}>
              <strong>Notes:</strong> {appointment.notes}
            </p>
          )}

          {/* Auto-Extracted source document link */}
          {(appointment.autoExtracted || docId) && (
            <div style={{
              marginTop: '0.5rem',
              padding: '0.4rem 0.6rem',
              backgroundColor: '#f8fafc',
              border: '1px dashed var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--text-muted)',
            }}>
              <Sparkles size={13} color="#f59e0b" />
              <span>Auto-extracted from document:</span>
              {docId ? (
                <Link
                  to={`/documents/${docId}`}
                  style={{
                    color: 'var(--primary)',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '170px',
                  }}
                  title={docName || 'View Document'}
                >
                  {docName || 'View Document'}
                </Link>
              ) : (
                <span style={{ fontWeight: 600 }}>Medical File</span>
              )}
            </div>
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
