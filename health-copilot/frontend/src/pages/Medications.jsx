import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/common/Layout';
import MedicationList from '../components/medications/MedicationList';
import MedicationForm from '../components/medications/MedicationForm';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import medicationService from '../services/medicationService';
import Button from '../components/common/Button';
import { useLanguage } from '../hooks/useLanguage';
import { Plus, Pill, ShieldAlert } from 'lucide-react';

const Medications = () => {
  const { t } = useLanguage();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchMedications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await medicationService.getMedications(filterStatus);
      setMedications(res.data?.medications || []);
    } catch (err) {
      console.error('Failed to load medications:', err);
      setError(err.message || 'Could not load medications');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const handleCreateOrUpdate = async (formData) => {
    try {
      setIsSubmitting(true);
      if (editingMedication) {
        await medicationService.updateMedication(editingMedication._id, formData);
      } else {
        await medicationService.createMedication(formData);
      }
      setIsModalOpen(false);
      setEditingMedication(null);
      fetchMedications();
    } catch (err) {
      alert(err.message || 'Failed to save medication');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (med) => {
    setEditingMedication(med);
    setIsModalOpen(true);
  };

  const handleDelete = async (medId) => {
    if (!window.confirm(t('common.confirm', 'Delete this medication record?'))) return;
    try {
      await medicationService.deleteMedication(medId);
      setMedications((prev) => prev.filter((m) => m._id !== medId));
    } catch (err) {
      alert(err.message || 'Failed to delete medication');
    }
  };

  const openAddModal = () => {
    setEditingMedication(null);
    setIsModalOpen(true);
  };

  const filterOptions = [
    { key: 'ALL', label: t('common.all', 'ALL') },
    { key: 'ACTIVE', label: t('common.active', 'ACTIVE') },
    { key: 'PAUSED', label: 'PAUSED' },
    { key: 'COMPLETED', label: t('common.completed', 'COMPLETED') },
  ];

  return (
    <Layout pageTitle={t('medications.pageTitle', 'Medication Management')}>
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
            {t('medications.pageTitle', 'Prescriptions & Medications')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {t('medications.subtitle', 'Track active dosages, schedules, and prescriber instructions.')}
          </p>
        </div>

        <Button id="open-add-med-btn" variant="primary" onClick={openAddModal} icon={Plus}>
          {t('medications.addMedication', 'Add Medication')}
        </Button>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError(null)} />

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setFilterStatus(opt.key)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${filterStatus === opt.key ? 'var(--primary)' : 'var(--border-light)'}`,
              backgroundColor: filterStatus === opt.key ? 'var(--primary)' : '#ffffff',
              color: filterStatus === opt.key ? '#ffffff' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && medications.length === 0 ? (
        <Loader message={t('common.loading', 'Loading medication records...')} />
      ) : (
        <MedicationList
          medications={medications}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onOpenAdd={openAddModal}
        />
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMedication(null);
        }}
        title={editingMedication ? t('common.edit', 'Edit Medication') : t('medications.addMedication', 'Add New Medication')}
      >
        <MedicationForm
          initialData={editingMedication}
          onSubmit={handleCreateOrUpdate}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingMedication(null);
          }}
          isLoading={isSubmitting}
        />
      </Modal>
    </Layout>
  );
};

export default Medications;
