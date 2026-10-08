import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/common/Layout';
import AppointmentList from '../components/appointments/AppointmentList';
import AppointmentForm from '../components/appointments/AppointmentForm';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import appointmentService from '../services/appointmentService';
import Button from '../components/common/Button';
import { Plus, Calendar } from 'lucide-react';

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await appointmentService.getAppointments(filterStatus);
      setAppointments(res.data?.appointments || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError(err.message || 'Could not load appointments');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleCreateOrUpdate = async (formData) => {
    try {
      setIsSubmitting(true);
      if (editingAppointment) {
        await appointmentService.updateAppointment(editingAppointment._id, formData);
      } else {
        await appointmentService.createAppointment(formData);
      }
      setIsModalOpen(false);
      setEditingAppointment(null);
      fetchAppointments();
    } catch (err) {
      alert(err.message || 'Failed to save appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (apt) => {
    setEditingAppointment(apt);
    setIsModalOpen(true);
  };

  const handleDelete = async (aptId) => {
    if (!window.confirm('Delete this appointment record?')) return;
    try {
      await appointmentService.deleteAppointment(aptId);
      setAppointments((prev) => prev.filter((a) => a._id !== aptId));
    } catch (err) {
      alert(err.message || 'Failed to delete appointment');
    }
  };

  const handleComplete = async (aptId) => {
    try {
      await appointmentService.updateAppointment(aptId, { status: 'COMPLETED' });
      fetchAppointments();
    } catch (err) {
      alert('Failed to mark appointment completed');
    }
  };

  const openAddModal = () => {
    setEditingAppointment(null);
    setIsModalOpen(true);
  };

  return (
    <Layout pageTitle="Appointment Management">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            Doctor Visits & Appointments
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Coordinate clinical consultations, follow-up tests, and physician notes.
          </p>
        </div>

        <Button id="open-add-apt-btn" variant="primary" onClick={openAddModal} icon={Plus}>
          Schedule Appointment
        </Button>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError(null)} />

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['ALL', 'UPCOMING', 'COMPLETED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${filterStatus === status ? 'var(--primary)' : 'var(--border-light)'}`,
              backgroundColor: filterStatus === status ? 'var(--primary)' : '#ffffff',
              color: filterStatus === status ? '#ffffff' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {loading && appointments.length === 0 ? (
        <Loader message="Loading appointment schedule..." />
      ) : (
        <AppointmentList
          appointments={appointments}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onComplete={handleComplete}
          onOpenAdd={openAddModal}
        />
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAppointment(null);
        }}
        title={editingAppointment ? 'Edit Appointment' : 'Schedule New Appointment'}
      >
        <AppointmentForm
          initialData={editingAppointment}
          onSubmit={handleCreateOrUpdate}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingAppointment(null);
          }}
          isLoading={isSubmitting}
        />
      </Modal>
    </Layout>
  );
};

export default Appointments;
