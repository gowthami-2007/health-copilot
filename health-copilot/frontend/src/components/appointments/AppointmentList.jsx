import React from 'react';
import AppointmentCard from './AppointmentCard';
import { Calendar, Plus } from 'lucide-react';
import Button from '../common/Button';

const AppointmentList = ({ appointments = [], onEdit, onDelete, onComplete, onOpenAdd }) => {
  if (appointments.length === 0) {
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
          <Calendar size={32} />
        </div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          No upcoming appointments.
        </h3>
        <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem auto', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Schedule doctor visits, laboratory draws, and medical consultations to keep your schedule organized.
        </p>
        <Button variant="primary" onClick={onOpenAdd} icon={Plus}>
          Schedule Appointment
        </Button>
      </div>
    );
  }

  return (
    <div className="grid-3">
      {appointments.map((apt) => (
        <AppointmentCard
          key={apt._id}
          appointment={apt}
          onEdit={onEdit}
          onDelete={onDelete}
          onComplete={onComplete}
        />
      ))}
    </div>
  );
};

export default AppointmentList;
