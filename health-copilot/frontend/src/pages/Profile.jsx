import React, { useState, useEffect } from 'react';
import Layout from '../components/common/Layout';
import Button from '../components/common/Button';
import ErrorMessage from '../components/common/ErrorMessage';
import useAuth from '../hooks/useAuth';
import profileService from '../services/profileService';
import { User, Mail, Calendar, Shield, Trash2, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';

const Profile = () => {
  const { user, setUser, logout } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
    gender: user?.gender || '',
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    try {
      setLoading(true);
      const res = await profileService.updateProfile(formData);
      setUser(res.data.user);
      localStorage.setItem('health_copilot_user', JSON.stringify(res.data.user));
      setSuccessMsg('Profile updated successfully.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await profileService.deleteAccount();
      alert('Your account and all associated healthcare documents have been erased.');
      await logout();
      window.location.href = '/';
    } catch (err) {
      alert(err.message || 'Failed to erase account data');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout pageTitle="Patient Profile & Privacy Settings">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            Personal Profile & Privacy
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage your personal healthcare profile and data privacy controls.
          </p>
        </div>

        <ErrorMessage message={errorMsg} onDismiss={() => setErrorMsg('')} />

        {successMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 'var(--radius-md)',
              color: '#065f46',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Profile Details Form */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={20} color="var(--primary)" /> Profile Information
          </h3>

          <form onSubmit={handleUpdate}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">Full Name</label>
                <input
                  id="profile-name"
                  type="text"
                  name="name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-email">Email (Immutable)</label>
                <input
                  id="profile-email"
                  type="email"
                  className="form-input"
                  value={user?.email || ''}
                  disabled
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="profile-dob">Date of Birth</label>
                <input
                  id="profile-dob"
                  type="date"
                  name="dateOfBirth"
                  className="form-input"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-gender">Gender Identity</label>
                <select
                  id="profile-gender"
                  name="gender"
                  className="form-select"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / Non-binary</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button type="submit" variant="primary" isLoading={loading}>
                Save Profile Changes
              </Button>
            </div>
          </form>
        </div>

        {/* Security & Data Privacy Section */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} color="#059669" /> Data Isolation & Privacy Security
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Health Copilot isolates all documents, lab measurements, prescriptions, and AI conversations strictly to your individual account ID. No other user can retrieve, search, or view your records.
          </p>

          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.825rem',
            color: 'var(--text-muted)'
          }}>
            <Lock size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
            <span>
              All file storage and database queries enforce authenticated JWT credentials. Passwords are encrypted with bcrypt hashing.
            </span>
          </div>
        </div>

        {/* Danger Zone: Account & Health Records Erasure */}
        <div className="card" style={{ borderColor: 'var(--danger-border)', backgroundColor: '#fffbfb' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--danger)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trash2 size={20} color="var(--danger)" /> Danger Zone: Erase All Data & Account
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Permanently delete your account along with all uploaded medical PDFs, OCR transcripts, AI chat histories, active medications, and scheduled appointments. This action cannot be undone.
          </p>

          {!deleteConfirmOpen ? (
            <Button
              variant="danger"
              onClick={() => setDeleteConfirmOpen(true)}
              icon={Trash2}
            >
              Delete My Account and All Health Records
            </Button>
          ) : (
            <div style={{
              padding: '1.25rem',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--danger)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontWeight: 700, marginBottom: '0.5rem' }}>
                <AlertTriangle size={18} />
                <span>Confirm Permanent Data Erasure</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Are you absolutely sure? All documents, appointments, medications, and conversations will be eradicated from the servers immediately.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteAccount}
                  isLoading={isDeleting}
                >
                  Confirm & Erase Everything
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
