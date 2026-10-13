import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/common/Layout';
import AppointmentCard from '../components/appointments/AppointmentCard';
import AppointmentForm from '../components/appointments/AppointmentForm';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import Button from '../components/common/Button';
import appointmentService from '../services/appointmentService';
import { Stethoscope, Plus, CheckCircle, Calendar, Sparkles, Clock } from 'lucide-react';

const Consultations = () => {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchConsultations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await appointmentService.getAppointments(filterStatus, 'CONSULTATION');
      setConsultations(res.data?.appointments || []);
    } catch (err) {
      console.error('Failed to load consultations:', err);
      setError(err.message || 'Could not load consultations');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  const handleCreateOrUpdate = async (formData) => {
    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        type: 'CONSULTATION',
      };
      if (editingConsultation) {
        await appointmentService.updateAppointment(editingConsultation._id, payload);
      } else {
        await appointmentService.createAppointment(payload);
      }
      setIsModalOpen(false);
      setEditingConsultation(null);
      fetchConsultations();
    } catch (err) {
      alert(err.message || 'Failed to save consultation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (consultation) => {
    setEditingConsultation(consultation);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this consultation record?')) return;
    try {
      await appointmentService.deleteAppointment(id);
      setConsultations((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete consultation');
    }
  };

  const handleComplete = async (id) => {
    try {
      await appointmentService.updateAppointment(id, { status: 'COMPLETED' });
      fetchConsultations();
    } catch (err) {
      alert('Failed to mark consultation completed');
    }
  };

  const openAddModal = () => {
    setEditingConsultation(null);
    setIsModalOpen(true);
  };

  // Metrics
  const autoExtractedCount = consultations.filter((c) => c.autoExtracted).length;
  const completedCount = consultations.filter((c) => c.status === 'COMPLETED').length;
  const upcomingCount = consultations.filter((c) => c.status === 'UPCOMING').length;

  return (
    <Layout pageTitle="Doctor Consultations">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(109, 40, 217, 0.3)',
          }}>
            <Stethoscope size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
              Doctor Consultations
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Track clinical evaluations, doctor assessments, and physician notes extracted from documents.
            </p>
          </div>
        </div>

        <Button id="open-add-consultation-btn" variant="primary" onClick={openAddModal} icon={Plus}>
          Record Consultation
        </Button>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError(null)} />

      {/* Stats Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#ede9fe',
            color: '#6d28d9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Stethoscope size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {consultations.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Total Consultations
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {completedCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Completed Reviews
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {upcomingCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Scheduled Consultations
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#fef3c7',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {autoExtractedCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Auto-Extracted
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['ALL', 'COMPLETED', 'UPCOMING', 'CANCELLED'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            style={{
              padding: '0.4rem 0.95rem',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${filterStatus === status ? '#6d28d9' : 'var(--border-light)'}`,
              backgroundColor: filterStatus === status ? '#6d28d9' : '#ffffff',
              color: filterStatus === status ? '#ffffff' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Consultations List */}
      {loading && consultations.length === 0 ? (
        <Loader message="Loading doctor consultation records..." />
      ) : consultations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#ede9fe',
            color: '#6d28d9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto'
          }}>
            <Stethoscope size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            No doctor consultations recorded yet.
          </h3>
          <p style={{ maxWidth: '440px', margin: '0 auto 1.5rem auto', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Whenever you upload medical slips, prescription notes, or clinical reports mentioning a doctor consultation, they are automatically parsed and cataloged here.
          </p>
          <Button variant="primary" onClick={openAddModal} icon={Plus}>
            Record First Consultation
          </Button>
        </div>
      ) : (
        <div className="grid-3">
          {consultations.map((item) => (
            <AppointmentCard
              key={item._id}
              appointment={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      {/* Record Consultation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingConsultation(null);
        }}
        title={editingConsultation ? 'Edit Doctor Consultation' : 'Record Doctor Consultation'}
      >
        <AppointmentForm
          initialData={editingConsultation}
          defaultType="CONSULTATION"
          onSubmit={handleCreateOrUpdate}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingConsultation(null);
          }}
          isLoading={isSubmitting}
        />
      </Modal>
    </Layout>
  );
};

export default Consultations;
