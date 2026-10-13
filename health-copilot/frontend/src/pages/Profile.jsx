import React, { useState, useEffect } from 'react';
import Layout from '../components/common/Layout';
import Button from '../components/common/Button';
import ErrorMessage from '../components/common/ErrorMessage';
import useAuth from '../hooks/useAuth';
import useLanguage from '../hooks/useLanguage';
import profileService from '../services/profileService';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Globe,
  Link2,
  Unlink,
  ExternalLink,
  FileText,
  Database,
  Download,
  Info,
} from 'lucide-react';

const Profile = () => {
  const { user, setUser, logout } = useAuth();
  const { language, setLanguage, t, isTelugu } = useLanguage();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
    gender: user?.gender || '',
    preferredLanguage: user?.preferredLanguage || 'en',
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ABHA Sandbox state
  const [abhaLoading, setAbhaLoading] = useState(false);
  const [abhaAddressInput, setAbhaAddressInput] = useState('');
  const [sampleModalOpen, setSampleModalOpen] = useState(false);
  const [sampleRecords, setSampleRecords] = useState([]);
  const [importingId, setImportingId] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || '',
        preferredLanguage: user.preferredLanguage || 'en',
      });
      setAbhaAddressInput(user.mockAbha?.abhaAddress || `${(user.email || 'patient').split('@')[0]}@abdm`);
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLanguageChange = async (lang) => {
    setFormData((prev) => ({ ...prev, preferredLanguage: lang }));
    setLanguage(lang);
    try {
      setLoading(true);
      const res = await profileService.updateProfile({ preferredLanguage: lang });
      setUser(res.data.user);
      localStorage.setItem('health_copilot_user', JSON.stringify(res.data.user));
      setSuccessMsg(
        lang === 'te'
          ? t('profile.langSavedNotice', 'Default language set to Telugu (తెలుగు). The entire application and AI assistant are now presented in Telugu.')
          : t('profile.langSavedNoticeEn', 'Default language set to English.')
      );
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update preferred language.');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkMockAbha = async () => {
    try {
      setAbhaLoading(true);
      setErrorMsg('');
      const res = await profileService.linkMockAbha({
        abhaAddress: abhaAddressInput || `${(user?.email || 'patient').split('@')[0]}@abdm`,
        abhaNumber: '91-4567-8901-2345',
      });
      setUser(res.data.user);
      localStorage.setItem('health_copilot_user', JSON.stringify(res.data.user));
      setSuccessMsg('Mock ABHA address linked successfully to ABDM sandbox.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to link mock ABHA address.');
    } finally {
      setAbhaLoading(false);
    }
  };

  const handleUnlinkMockAbha = async () => {
    try {
      setAbhaLoading(true);
      setErrorMsg('');
      const res = await profileService.unlinkMockAbha();
      setUser(res.data.user);
      localStorage.setItem('health_copilot_user', JSON.stringify(res.data.user));
      setSuccessMsg('Mock ABHA identity unlinked.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to unlink mock ABHA.');
    } finally {
      setAbhaLoading(false);
    }
  };

  const handleOpenPreview = async () => {
    try {
      setAbhaLoading(true);
      const res = await profileService.getSampleAbhaRecords();
      setSampleRecords(res.data.records || []);
      setSampleModalOpen(true);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch sample records.');
    } finally {
      setAbhaLoading(false);
    }
  };

  const handleImportRecord = async (recordId) => {
    try {
      setImportingId(recordId);
      await profileService.importSampleAbhaRecord(recordId);
      setSuccessMsg('Record imported into your document vault and health timeline!');
      setSampleModalOpen(false);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to import simulated record.');
    } finally {
      setImportingId(null);
    }
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
    <Layout pageTitle={t('profile.pageTitle', 'Patient Profile & Privacy Settings')}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            {t('profile.pageTitle', 'Personal Profile & Privacy')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {t('profile.subtitle', 'Manage your personal healthcare profile and data privacy controls.')}
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
            <User size={20} color="var(--primary)" /> {t('profile.infoSection', 'Profile Information')}
          </h3>

          <form onSubmit={handleUpdate}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">{t('profile.fullName', 'Full Name')}</label>
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
                <label className="form-label" htmlFor="profile-email">{t('profile.email', 'Email (Immutable)')}</label>
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
                <label className="form-label" htmlFor="profile-dob">{t('profile.dob', 'Date of Birth')}</label>
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
                <label className="form-label" htmlFor="profile-gender">{t('profile.gender', 'Gender Identity')}</label>
                <select
                  id="profile-gender"
                  name="gender"
                  className="form-select"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">{t('profile.genderPreferNot', 'Prefer not to say')}</option>
                  <option value="male">{t('profile.genderMale', 'Male')}</option>
                  <option value="female">{t('profile.genderFemale', 'Female')}</option>
                  <option value="other">{t('profile.genderOther', 'Other / Non-binary')}</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button type="submit" variant="primary" isLoading={loading}>
                {t('profile.saveChanges', 'Save Profile Changes')}
              </Button>
            </div>
          </form>
        </div>

        {/* Regional Language Settings */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={20} color="var(--primary)" /> {t('profile.langSection', 'Regional Language Settings')}
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#eff6ff', color: 'var(--primary)' }}>
              {t('profile.langBadge', 'Bilingual AI Copilot')}
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            {t('profile.langSubtitle', 'Choose your preferred language for the entire application interface, AI medical summaries, health interpretations, and chat box consultations. Clinical lab values, decimal precision, and medication brand names are strictly preserved in their original form.')}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div
              onClick={() => handleLanguageChange('en')}
              style={{
                border: `2px solid ${formData.preferredLanguage === 'en' ? 'var(--primary)' : 'var(--border-light)'}`,
                backgroundColor: formData.preferredLanguage === 'en' ? '#f0f9ff' : '#ffffff',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: formData.preferredLanguage === 'en' ? 'var(--primary)' : 'var(--text-main)' }}>
                  {t('profile.langEnglish', 'English (Default)')}
                </span>
                {formData.preferredLanguage === 'en' && <CheckCircle2 size={18} color="var(--primary)" />}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                {t('profile.langEnglishDesc', 'Plain-language clinical summaries & AI assistant consultations in standard English.')}
              </p>
            </div>

            <div
              onClick={() => handleLanguageChange('te')}
              style={{
                border: `2px solid ${formData.preferredLanguage === 'te' ? '#16a34a' : 'var(--border-light)'}`,
                backgroundColor: formData.preferredLanguage === 'te' ? '#f0fdf4' : '#ffffff',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: formData.preferredLanguage === 'te' ? '#16a34a' : 'var(--text-main)' }}>
                  {t('profile.langTelugu', 'తెలుగు (Telugu)')}
                </span>
                {formData.preferredLanguage === 'te' && <CheckCircle2 size={18} color="#16a34a" />}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                {t('profile.langTeluguDesc', 'తెలుగులో మొత్తం అప్లికేషన్, AI సంప్రదింపులు మరియు సమగ్ర ఆరోగ్య సారాంశాలు (ల్యాబ్ యూనిట్లు & మందుల పేర్లు యధాతథంగా ఉంటాయి).')}
              </p>
            </div>
          </div>
        </div>

        {/* Mock ABDM / ABHA Readiness (Phase 7) */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={20} color="#6366f1" /> {t('profile.abdmSection', 'ABDM / ABHA Readiness (Mock Sandbox)')}
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.6rem',
                borderRadius: '999px',
                backgroundColor: user?.mockAbha?.isLinked ? '#ecfdf5' : '#fef2f2',
                color: user?.mockAbha?.isLinked ? '#059669' : '#dc2626',
                border: `1px solid ${user?.mockAbha?.isLinked ? '#a7f3d0' : '#fecaca'}`,
              }}
            >
              {user?.mockAbha?.isLinked ? '● Linked (Sandbox Mode)' : '○ Not Linked'}
            </span>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            {t('profile.abdmSubtitle', 'Ayushman Bharat Digital Mission (ABDM) integration prototype. Simulates federated electronic health record (EHR) discovery, consent-based record import, and FHIR R4 Bundle exchange without connecting to live government APIs.')}
          </p>

          {user?.mockAbha?.isLinked ? (
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>ABHA Address</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                    {user?.mockAbha?.abhaAddress || 'santhosh@abdm'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>ABHA Number</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                    {user?.mockAbha?.abhaNumber || '91-4567-8901-2345'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Sync Status</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669', marginTop: '0.25rem' }}>
                    Active Sandbox
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Button variant="primary" size="sm" icon={ExternalLink} onClick={handleOpenPreview} isLoading={abhaLoading}>
                  Preview Simulated ABHA Records
                </Button>
                <Button variant="outline" size="sm" icon={Unlink} onClick={handleUnlinkMockAbha} isLoading={abhaLoading}>
                  Unlink Mock ABHA
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div className="grid-2" style={{ marginBottom: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Mock ABHA Address (e.g. name@abdm)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={abhaAddressInput}
                    onChange={(e) => setAbhaAddressInput(e.target.value)}
                    placeholder="yourname@abdm"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Mock 14-Digit ABHA Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value="91-4567-8901-2345"
                    disabled
                    style={{ backgroundColor: '#f1f5f9' }}
                  />
                </div>
              </div>
              <Button variant="primary" size="sm" icon={Link2} onClick={handleLinkMockAbha} isLoading={abhaLoading}>
                Connect to Mock ABDM Sandbox
              </Button>
            </div>
          )}
        </div>

        {/* ABHA Records Preview Modal */}
        {sampleModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                maxWidth: '700px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '1.5rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Database size={22} color="#6366f1" /> Simulated ABDM Health Records
                </h3>
                <button
                  onClick={() => setSampleModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.825rem', color: '#166534', display: 'flex', gap: '0.5rem' }}>
                <Info size={18} style={{ flexShrink: 0 }} />
                <span>
                  These simulated records demonstrate federated health data exchange. Clicking "Import to Vault" imports the synthetic report into your personal documents, extracts structured lab values, and links to your timeline.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sampleRecords.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{rec.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {rec.facility} • {new Date(rec.recordDate).toLocaleDateString()}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#4338ca' }}>
                        {rec.type}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      {rec.contentSummary}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Provenance: <code>{rec.provenance}</code>
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Download}
                        onClick={() => handleImportRecord(rec.id)}
                        isLoading={importingId === rec.id}
                      >
                        Import to Vault
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Security & Data Privacy Section */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} color="#059669" /> {t('profile.securitySection', 'Data Isolation & Privacy Security')}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {t('profile.securitySubtitle', 'Health Copilot isolates all documents, lab measurements, prescriptions, and AI conversations strictly to your individual account ID. No other user can retrieve, search, or view your records.')}
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
            <Trash2 size={20} color="var(--danger)" /> {t('profile.dangerSection', 'Danger Zone: Erase All Data & Account')}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            {t('profile.dangerSubtitle', 'Permanently delete your account along with all uploaded medical PDFs, OCR transcripts, AI chat histories, active medications, and scheduled appointments. This action cannot be undone.')}
          </p>

          {!deleteConfirmOpen ? (
            <Button
              variant="danger"
              onClick={() => setDeleteConfirmOpen(true)}
              icon={Trash2}
            >
              {t('profile.dangerBtn', 'Delete My Account and All Health Records')}
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
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteAccount}
                  isLoading={isDeleting}
                >
                  {t('common.confirm', 'Confirm & Erase Everything')}
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
