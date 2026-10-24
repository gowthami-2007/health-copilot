import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Lock,
  Unlock,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Copy,
  Check,
  Share2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Calendar,
  ChevronRight,
  Info,
  Building2,
  FileSearch,
  Loader2,
  ArrowRight,
  Eye,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import useLanguage from '../hooks/useLanguage';
import abhaService from '../services/abhaService';
import Layout from '../components/common/Layout';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import ErrorMessage from '../components/common/ErrorMessage';
import DocumentViewer from '../components/documents/DocumentViewer';

const Abha = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  // Profile and Identity State
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Search State
  const [searchInput, setSearchInput] = useState('');
  const [searchValidationMsg, setSearchValidationMsg] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  // Consent Management State
  const [consentRequests, setConsentRequests] = useState({ incoming: [], outgoing: [] });
  const [consentLoading, setConsentLoading] = useState(false);
  const [activeConsentTab, setActiveConsentTab] = useState('incoming'); // 'incoming' | 'active' | 'outgoing'

  // Request Access Modal State
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentForm, setConsentForm] = useState({
    purpose: 'CLINICAL_CONSULTATION',
    purposeDescription: '',
    scope: ['ALL_DOCUMENTS', 'AI_SUMMARIES'],
    durationDays: 7,
  });
  const [submittingConsent, setSubmittingConsent] = useState(false);

  // Link ABHA Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkForm, setLinkForm] = useState({
    abhaNumber: '',
    abhaAddress: '',
  });
  const [linkingAbha, setLinkingAbha] = useState(false);

  // Document Viewer State
  const [previewDoc, setPreviewDoc] = useState(null);

  // Action Success Toast
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  useEffect(() => {
    loadMyProfile();
    loadConsents();
  }, []);

  const loadMyProfile = async () => {
    try {
      setProfileLoading(true);
      setProfileError('');
      const res = await abhaService.getMyAbhaProfile();
      if (res?.data) {
        setProfile(res.data);
        setLinkForm({
          abhaNumber: res.data.abhaNumber || '',
          abhaAddress: res.data.abhaAddress || '',
        });
      }
    } catch (err) {
      console.error('Failed to load ABHA profile:', err);
      setProfileError(err.message || 'Unable to load health identity profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const loadConsents = async () => {
    try {
      setConsentLoading(true);
      const res = await abhaService.getConsentRequests();
      if (res?.data) {
        setConsentRequests(res.data);
      }
    } catch (err) {
      console.error('Failed to load consents:', err);
    } finally {
      setConsentLoading(false);
    }
  };

  const handleCopyHealthId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const validateSearchFormat = (val) => {
    const clean = val.trim();
    if (!clean) {
      setSearchValidationMsg('');
      return false;
    }
    const isDemo = /^ABHA-DEMO-[a-zA-Z0-9_-]+$/i.test(clean);
    const is14Digit = /^\d{2}-\d{4}-\d{4}-\d{4}$/.test(clean) || /^\d{14}$/.test(clean);
    const isAddress = /^[a-zA-Z0-9._%+-]+@abdm$/i.test(clean);

    if (!isDemo && !is14Digit && !isAddress) {
      setSearchValidationMsg(
        'Format reminder: Use ABHA-DEMO-XXXX-XXXX, 14-digit number (XX-XXXX-XXXX-XXXX), or address (name@abdm).'
      );
      return false;
    }
    setSearchValidationMsg('');
    return true;
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = searchInput.trim();
    if (!query) {
      setSearchValidationMsg('Please enter an ABHA identifier.');
      return;
    }

    try {
      setSearching(true);
      setSearchError('');
      setSearchResult(null);
      setActionSuccessMsg('');

      const res = await abhaService.searchAbha(query);
      if (res?.data) {
        setSearchResult(res.data);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError(err.message || 'Search failed. Patient could not be found.');
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  };

  const handleOpenConsentModal = () => {
    setConsentForm({
      purpose: 'CLINICAL_CONSULTATION',
      purposeDescription: '',
      scope: ['ALL_DOCUMENTS', 'AI_SUMMARIES'],
      durationDays: 7,
    });
    setShowConsentModal(true);
  };

  const handleSubmitConsentRequest = async (e) => {
    e.preventDefault();
    if (!searchResult?.patient) return;

    try {
      setSubmittingConsent(true);
      const targetId = searchResult.patient.healthId || searchInput.trim();
      const res = await abhaService.requestConsent({
        targetIdentifier: targetId,
        purpose: consentForm.purpose,
        purposeDescription: consentForm.purposeDescription,
        scope: consentForm.scope,
        durationDays: consentForm.durationDays,
      });

      setShowConsentModal(false);
      setActionSuccessMsg('Access request submitted successfully. The patient will review your request.');
      // Refresh search result and consents
      handleSearch();
      loadConsents();
    } catch (err) {
      console.error('Consent request error:', err);
      alert(err.message || 'Failed to submit consent request.');
    } finally {
      setSubmittingConsent(false);
    }
  };

  const handleGrantConsent = async (consentId) => {
    try {
      await abhaService.grantConsent(consentId);
      setActionSuccessMsg('Consent granted. Requester is now authorized to view permitted documents.');
      loadConsents();
      loadMyProfile();
    } catch (err) {
      console.error('Grant consent error:', err);
      alert(err.message || 'Failed to grant consent.');
    }
  };

  const handleRejectConsent = async (consentId) => {
    try {
      await abhaService.rejectConsent(consentId);
      setActionSuccessMsg('Consent request rejected.');
      loadConsents();
    } catch (err) {
      console.error('Reject consent error:', err);
      alert(err.message || 'Failed to reject consent.');
    }
  };

  const handleRevokeConsent = async (consentId) => {
    if (!window.confirm('Are you sure you want to revoke access? The user will immediately lose access to your health documents.')) {
      return;
    }
    try {
      await abhaService.revokeConsent(consentId);
      setActionSuccessMsg('Access revoked successfully. Subsequent lookup blocked.');
      loadConsents();
      loadMyProfile();
    } catch (err) {
      console.error('Revoke consent error:', err);
      alert(err.message || 'Failed to revoke access.');
    }
  };

  const handleLinkOfficialAbha = async (e) => {
    e.preventDefault();
    try {
      setLinkingAbha(true);
      await abhaService.linkOfficialAbha(linkForm);
      setShowLinkModal(false);
      setActionSuccessMsg('ABHA details updated in demonstration mode.');
      loadMyProfile();
    } catch (err) {
      console.error('Link ABHA error:', err);
      alert(err.message || 'Failed to link ABHA identity.');
    } finally {
      setLinkingAbha(false);
    }
  };

  // Helper for status badge presentation
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'OFFICIAL_VERIFIED':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: '#ecfdf5',
            color: '#059669',
            border: '1px solid #a7f3d0'
          }}>
            <ShieldCheck size={14} /> Official ABHA Verified
          </span>
        );
      case 'DEMO_ASSIGNED':
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: '#eef2ff',
            color: '#4f46e5',
            border: '1px solid #c7d2fe'
          }}>
            <Sparkles size={14} /> Demo Health ID Assigned
          </span>
        );
    }
  };

  return (
    <Layout pageTitle={t('abha.pageTitle', 'ABHA Health ID')}>
      <div className="container" style={{ padding: '1.5rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldCheck size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                ABHA Health Identity & Record Lookup
              </h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Manage your Ayushman Bharat Health Account (ABHA) identity and access authorized patient records via federated consent.
              </p>
            </div>
          </div>

          <div>
            {profile && renderStatusBadge(profile.abhaStatus)}
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div style={{
          padding: '0.85rem 1.25rem',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: 'var(--radius-md)',
          color: '#065f46',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', fontSize: '0.8rem', fontWeight: 600 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Grid: Profile & Lookup */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Section A & B: My ABHA Profile Card */}
        <div style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} color="var(--primary)" /> My Health Identity
            </h3>
            <button
              onClick={() => setShowLinkModal(true)}
              style={{
                fontSize: '0.775rem',
                color: 'var(--primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Configure Identity
            </button>
          </div>

          {profileLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 0.75rem auto' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading health profile...</p>
            </div>
          ) : profileError ? (
            <ErrorMessage message={profileError} onRetry={loadMyProfile} />
          ) : (
            <div>
              {/* Primary Identifier Box */}
              <div style={{
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #e2e8f0',
                marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Application Health ID
                  </span>
                  <button
                    onClick={() => handleCopyHealthId(profile?.healthId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.725rem',
                      color: 'var(--primary)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {copiedId ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    {copiedId ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.02em', wordBreak: 'break-all' }}>
                  {profile?.healthId || 'Not Assigned'}
                </div>
              </div>

              {/* Patient Attributes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Full Name</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{profile?.fullName || user?.name || 'Patient'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Gender</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', textTransform: 'capitalize' }}>
                    {profile?.gender || 'Not specified'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>ABHA Address</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {profile?.abhaAddress || 'Not linked'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>14-digit ABHA No.</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {profile?.abhaNumber || 'Not linked'}
                  </div>
                </div>
              </div>

              {/* Stats Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-light)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}>
                <div><strong>{profile?.linkedDocumentsCount || 0}</strong> Medical Records</div>
                <div><strong>{profile?.activeConsentsCount || 0}</strong> Active Consents</div>
              </div>

              {/* Provenance note */}
              <div style={{
                marginTop: '1rem',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: '#92400e',
                lineHeight: 1.4
              }}>
                <strong>Mode Notice:</strong> {profile?.provenanceNotice}
              </div>
            </div>
          )}
        </div>

        {/* Section C: Search by ABHA ID Card */}
        <div style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={18} color="var(--primary)" /> Patient Record Lookup
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Search another patient's health records by ABHA identifier. Records are protected and require verified patient consent.
            </p>

            <form onSubmit={handleSearch} style={{ marginBottom: '1rem' }}>
              <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingRight: '2.5rem', fontSize: '0.9rem' }}
                  placeholder="e.g. ABHA-DEMO-4829-1092 or user@abdm"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    validateSearchFormat(e.target.value);
                  }}
                />
                <button
                  type="submit"
                  disabled={searching || !searchInput.trim()}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.4rem 0.6rem',
                    cursor: searching || !searchInput.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {searching ? <Loader2 size={16} className="spinner" /> : <Search size={16} />}
                </button>
              </div>

              {searchValidationMsg && (
                <div style={{ fontSize: '0.75rem', color: '#b45309', marginBottom: '0.5rem' }}>
                  {searchValidationMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick lookup:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (profile?.healthId) {
                      setSearchInput(profile.healthId);
                      validateSearchFormat(profile.healthId);
                    }
                  }}
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--primary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  My Own Health ID
                </button>
              </div>
            </form>
          </div>

          <div style={{
            padding: '0.85rem',
            backgroundColor: '#f8fafc',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #e2e8f0',
            fontSize: '0.775rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
          }}>
            <Lock size={16} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Privacy Protocol:</strong> Knowing another patient's identifier does not permit immediate record access. An explicit, purpose-bound consent request must be approved by the patient.
            </div>
          </div>
        </div>
      </div>

      {/* Search Error State */}
      {searchError && (
        <div style={{
          padding: '1.25rem',
          backgroundColor: '#fef2f2',
          border: '1.5px solid #fca5a5',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
        }}>
          <AlertTriangle size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#991b1b', margin: '0 0 0.25rem 0' }}>
              Patient Lookup Notice
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#7f1d1d', margin: 0, lineHeight: 1.5 }}>
              {searchError}
            </p>
          </div>
        </div>
      )}

      {/* Search Result Section */}
      {searchResult && (
        <div style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          padding: '1.75rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSearch size={20} color="var(--primary)" /> Patient Record Search Result
            </h3>
            {searchResult.isAuthorized ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0'
              }}>
                <Unlock size={14} /> Authorized Access
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: '#fffbeb',
                color: '#d97706',
                border: '1px solid #fcd34d'
              }}>
                <Lock size={14} /> Consent Required
              </span>
            )}
          </div>

          {/* Result Case 1: Unauthorized / Consent Required Preview */}
          {!searchResult.isAuthorized ? (
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600, textTransform: 'uppercase' }}>
                    Patient Identity Preview
                  </div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#78350f', margin: '0.25rem 0' }}>
                    {searchResult.patient?.maskedName || 'Protected Patient'}
                  </h4>
                  <div style={{ fontSize: '0.85rem', color: '#92400e' }}>
                    ABHA ID: <strong>{searchResult.patient?.healthId}</strong>
                  </div>
                </div>

                <div>
                  {searchResult.hasPendingRequest ? (
                    <div style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <Clock size={16} /> Request Pending Review
                    </div>
                  ) : (
                    <Button variant="primary" onClick={handleOpenConsentModal}>
                      Request Record Access
                    </Button>
                  )}
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                {searchResult.message}
              </p>
            </div>
          ) : (
            /* Result Case 2: Authorized Records Available */
            <div>
              {/* Authorized Patient Card */}
              <div style={{
                padding: '1.25rem',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                    Authorized Patient Profile
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#14532d' }}>
                    {searchResult.patient?.fullName}
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#166534', marginTop: '0.25rem' }}>
                    Health ID: <strong>{searchResult.patient?.healthId}</strong> • Gender: <span style={{ textTransform: 'capitalize' }}>{searchResult.patient?.gender}</span>
                  </div>
                </div>

                {searchResult.consent && (
                  <div style={{ fontSize: '0.8rem', color: '#166534', textAlign: 'right' }}>
                    <div>Purpose: <strong>{searchResult.consent.purpose.replace(/_/g, ' ')}</strong></div>
                    <div>Access Valid Until: <strong>{new Date(searchResult.consent.validUntil).toLocaleDateString()}</strong></div>
                  </div>
                )}
              </div>

              {/* Permitted Documents List */}
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                Permitted Medical Documents ({searchResult.documents?.length || 0})
              </h4>

              {searchResult.documents?.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-muted)'
                }}>
                  <FileText size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>No accessible medical documents found for this patient.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                  {searchResult.documents.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        padding: '1.25rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                          }}>
                            {doc.documentType}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h5 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0', wordBreak: 'break-word' }}>
                          {doc.fileName}
                        </h5>

                        {doc.hospitalName && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            <Building2 size={13} style={{ display: 'inline', marginRight: '4px' }} />
                            {doc.hospitalName}
                          </div>
                        )}

                        {/* AI Summary Interpretation */}
                        {doc.hasAIInterpretation && (
                          <div style={{
                            padding: '0.75rem',
                            backgroundColor: '#f8fafc',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #e2e8f0',
                            marginTop: '0.75rem',
                            marginBottom: '0.75rem',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', marginBottom: '0.35rem' }}>
                              <Sparkles size={13} /> AI Clinical Summary
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#334155', margin: 0, lineHeight: 1.4 }}>
                              {doc.aiSummary}
                            </p>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => {
                            const patientId = doc.patientId || searchResult.patient?.id;
                            const targetFileUrl = doc.fileUrl || (patientId ? `/api/abha/patients/${patientId}/documents/${doc.id || doc._id}/file` : null);
                            setPreviewDoc({
                              ...doc,
                              patientId,
                              fileUrl: targetFileUrl,
                            });
                          }}
                        >
                          <Eye size={14} style={{ marginRight: '4px' }} /> View Document
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section D: Consent & Authorization Manager */}
      <div style={{
        backgroundColor: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={20} color="var(--primary)" /> Consent & Access Control Manager
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Review incoming access requests for your health records, view active permissions, or revoke previously granted access.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setActiveConsentTab('incoming')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeConsentTab === 'incoming' ? '#ffffff' : 'transparent',
                color: activeConsentTab === 'incoming' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: activeConsentTab === 'incoming' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Incoming Requests ({consentRequests.incoming.filter(c => c.status === 'PENDING').length})
            </button>
            <button
              onClick={() => setActiveConsentTab('active')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeConsentTab === 'active' ? '#ffffff' : 'transparent',
                color: activeConsentTab === 'active' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: activeConsentTab === 'active' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Active Permissions ({consentRequests.incoming.filter(c => c.status === 'GRANTED' && !c.isExpired).length})
            </button>
            <button
              onClick={() => setActiveConsentTab('outgoing')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeConsentTab === 'outgoing' ? '#ffffff' : 'transparent',
                color: activeConsentTab === 'outgoing' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: activeConsentTab === 'outgoing' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              My Outgoing Requests ({consentRequests.outgoing.length})
            </button>
          </div>
        </div>

        {/* Tab Content 1: Incoming Pending Requests */}
        {activeConsentTab === 'incoming' && (
          <div>
            {consentRequests.incoming.filter(c => c.status === 'PENDING').length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 0.75rem auto' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No pending access requests.</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.825rem' }}>You have full control. Requesters will appear here when they request access to your records.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {consentRequests.incoming
                  .filter(c => c.status === 'PENDING')
                  .map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: '1.25rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.party?.name || 'Practitioner'}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({c.party?.healthId})</span>
                        </div>
                        <div style={{ fontSize: '0.825rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                          Purpose: <strong>{c.purpose.replace(/_/g, ' ')}</strong> • Requested for: <strong>{c.durationDays} days</strong>
                        </div>
                        {c.purposeDescription && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            "{c.purposeDescription}"
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
                          Requested on: {new Date(c.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleRejectConsent(c.id)}
                          style={{
                            padding: '0.45rem 0.85rem',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleGrantConsent(c.id)}
                          style={{
                            padding: '0.45rem 1rem',
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Grant Access
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Active Granted Consents */}
        {activeConsentTab === 'active' && (
          <div>
            {consentRequests.incoming.filter(c => c.status === 'GRANTED' && !c.isExpired).length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Lock size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No active external permissions granted.</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.825rem' }}>Your health records are completely private.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {consentRequests.incoming
                  .filter(c => c.status === 'GRANTED' && !c.isExpired)
                  .map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: '1.25rem',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#166534' }}>{c.party?.name}</span>
                          <span style={{ fontSize: '0.75rem', color: '#15803d' }}>({c.party?.healthId})</span>
                        </div>
                        <div style={{ fontSize: '0.825rem', color: '#166534' }}>
                          Purpose: <strong>{c.purpose.replace(/_/g, ' ')}</strong> • Valid Until: <strong>{new Date(c.validUntil).toLocaleDateString()}</strong>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.25rem' }}>
                          Granted on: {new Date(c.grantedAt || c.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div>
                        <button
                          onClick={() => handleRevokeConsent(c.id)}
                          style={{
                            padding: '0.45rem 0.85rem',
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Revoke Access
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Outgoing Requests */}
        {activeConsentTab === 'outgoing' && (
          <div>
            {consentRequests.outgoing.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <FileSearch size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
                <p style={{ margin: 0, fontWeight: 600 }}>You haven't requested access to any patient records yet.</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.825rem' }}>Use the search box above to find another patient's ABHA ID and request access.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {consentRequests.outgoing.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: '1.25rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Target: {c.party?.name || 'Patient'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({c.party?.healthId})</span>
                      </div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-main)' }}>
                        Purpose: <strong>{c.purpose.replace(/_/g, ' ')}</strong> • Status:{' '}
                        <span style={{
                          fontWeight: 700,
                          color: c.status === 'GRANTED' ? '#059669' : c.status === 'REJECTED' ? '#dc2626' : c.status === 'REVOKED' ? '#4b5563' : '#d97706',
                        }}>
                          {c.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
                        Submitted on: {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div>
                      {c.status === 'GRANTED' && !c.isExpired && (
                        <button
                          onClick={() => {
                            setSearchInput(c.party?.healthId || '');
                            handleSearch();
                          }}
                          style={{
                            padding: '0.45rem 0.85rem',
                            backgroundColor: 'var(--primary)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          View Records <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal 1: Request Access Modal */}
      {showConsentModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: 'var(--shadow-xl)',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
              Request Health Record Consent
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Specify the clinical purpose and duration for accessing records belonging to{' '}
              <strong>{searchResult?.patient?.maskedName}</strong>.
            </p>

            <form onSubmit={handleSubmitConsentRequest}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Clinical Purpose</label>
                <select
                  className="form-select"
                  value={consentForm.purpose}
                  onChange={(e) => setConsentForm({ ...consentForm, purpose: e.target.value })}
                >
                  <option value="CLINICAL_CONSULTATION">Clinical Consultation</option>
                  <option value="SECOND_OPINION">Second Medical Opinion</option>
                  <option value="EMERGENCY_CARE">Emergency Care</option>
                  <option value="RECORD_TRANSFER">Record Transfer</option>
                  <option value="GENERAL_CARE">General Care</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Access Duration (Days)</label>
                <select
                  className="form-select"
                  value={consentForm.durationDays}
                  onChange={(e) => setConsentForm({ ...consentForm, durationDays: Number(e.target.value) })}
                >
                  <option value={1}>1 Day (Single Visit)</option>
                  <option value={7}>7 Days (Standard Consultation)</option>
                  <option value={14}>14 Days (Extended Follow-up)</option>
                  <option value={30}>30 Days (Ongoing Care)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Consultation Notes (Optional)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Provide context for the patient (e.g. Reviewing recent blood reports before prescription refill)"
                  value={consentForm.purposeDescription}
                  onChange={(e) => setConsentForm({ ...consentForm, purposeDescription: e.target.value })}
                  maxLength={300}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowConsentModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingConsent}
                >
                  {submittingConsent ? 'Submitting Request...' : 'Submit Consent Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Configure / Link ABHA Modal */}
      {showLinkModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            maxWidth: '480px',
            width: '100%',
            boxShadow: 'var(--shadow-xl)',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
              Configure ABHA Identity
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Link or update your ABHA address and 14-digit number. In demonstration mode, these are stored for testing interoperability.
            </p>

            <form onSubmit={handleLinkOfficialAbha}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">ABHA Address (e.g. yourname@abdm)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="name@abdm"
                  value={linkForm.abhaAddress}
                  onChange={(e) => setLinkForm({ ...linkForm, abhaAddress: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">14-Digit ABHA Number (XX-XXXX-XXXX-XXXX)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="91-1234-5678-9012"
                  value={linkForm.abhaNumber}
                  onChange={(e) => setLinkForm({ ...linkForm, abhaNumber: e.target.value })}
                />
              </div>

              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f8fafc',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: '#64748b',
                marginBottom: '1.5rem',
                lineHeight: 1.4,
              }}>
                <strong>Official ABDM Note:</strong> Live verification requires an active ABDM Health Facility Registry (HFR) and Client Secret onboarding from the National Health Authority (NHA).
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowLinkModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={linkingAbha}
                >
                  {linkingAbha ? 'Saving...' : 'Save Identity'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      <Modal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.fileName || 'Medical Document Preview'}
        maxWidth="950px"
      >
        {previewDoc && (
          <DocumentViewer
            fileUrl={previewDoc.fileUrl}
            documentId={previewDoc.id || previewDoc._id}
            fileName={previewDoc.fileName}
            fileType={previewDoc.fileType}
          />
        )}
      </Modal>
    </div>
  </Layout>
);
};

export default Abha;
