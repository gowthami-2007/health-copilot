import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, UserCheck, Clock, MapPin } from 'lucide-react';

const UpcomingAppointments = ({ appointments = [] }) => {
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
          <Calendar size={20} color="var(--accent)" />
          <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Upcoming Appointments</h3>
        </div>
        <Link to="/appointments" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          Manage <ArrowRight size={14} />
        </Link>
      </div>

      {appointments.length === 0 ? (
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
          <Calendar size={36} color="var(--text-subtle)" style={{ marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            No upcoming appointments
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Keep track of doctor consultations and clinical follow-ups
          </p>
          <Link to="/appointments" className="btn btn-secondary btn-sm">
            Schedule Appointment
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
          {appointments.map((apt) => (
            <div
              key={apt._id}
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
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <UserCheck size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.925rem', color: 'var(--text-main)', margin: 0, fontWeight: 600 }}>
                    {apt.doctorName}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    {apt.specialty || 'General Practitioner'}
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  <Calendar size={13} color="var(--primary)" />
                  <span>{new Date(apt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Clock size={12} />
                  <span>{apt.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingAppointments;
