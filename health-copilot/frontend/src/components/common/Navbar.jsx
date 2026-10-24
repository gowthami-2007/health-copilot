import React, { useState } from 'react';
import { Menu, Bot, UploadCloud, Globe, Users, ChevronDown, Check, UserPlus, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import useLanguage from '../../hooks/useLanguage';
import useAuth from '../../hooks/useAuth';
import useProfile from '../../hooks/useProfile';
import profileService from '../../services/profileService';

const PAGE_TITLE_KEYS = {
  '/dashboard': 'dashboard.pageTitle',
  '/assistant': 'assistant.pageTitle',
  '/trends': 'trends.pageTitle',
  '/wellness': 'wellness.pageTitle',
  '/agent': 'agent.pageTitle',
  '/documents': 'documents.pageTitle',
  '/abha': 'abha.pageTitle',
  '/medications': 'medications.pageTitle',
  '/appointments': 'appointments.pageTitle',
  '/timeline': 'timeline.pageTitle',
  '/profile': 'profile.pageTitle',
};

const Navbar = ({ onOpenSidebar, pageTitle = 'Dashboard' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, isTelugu, t } = useLanguage();
  const { user, setUser } = useAuth();
  const { activeProfile, profiles, switchProfile, addProfile, loading: profileLoading } = useProfile();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    relationship: 'Mother',
    dateOfBirth: '',
    gender: 'female',
    bloodGroup: '',
    allergies: '',
    chronicConditions: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const isDashboard = location.pathname === '/dashboard';

  // Compute translated page title
  const titleKey = PAGE_TITLE_KEYS[location.pathname];
  const displayTitle = titleKey ? t(titleKey, pageTitle) : pageTitle;

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.name.trim()) return;
    try {
      setSubmitting(true);
      await addProfile({
        name: newMember.name,
        relationship: newMember.relationship,
        dateOfBirth: newMember.dateOfBirth || undefined,
        gender: newMember.gender,
        bloodGroup: newMember.bloodGroup || undefined,
        allergies: newMember.allergies ? newMember.allergies.split(',').map(s => s.trim()) : [],
        chronicConditions: newMember.chronicConditions ? newMember.chronicConditions.split(',').map(s => s.trim()) : [],
      });
      setShowAddModal(false);
      setNewMember({
        name: '',
        relationship: 'Mother',
        dateOfBirth: '',
        gender: 'female',
        bloodGroup: '',
        allergies: '',
        chronicConditions: '',
      });
    } catch (err) {
      alert(err.message || 'Failed to add family member');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLanguage = async () => {
    const nextLang = language === 'te' ? 'en' : 'te';
    setLanguage(nextLang);
    if (user) {
      try {
        const res = await profileService.updateProfile({ preferredLanguage: nextLang });
        if (res?.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('health_copilot_user', JSON.stringify(res.data.user));
        }
      } catch (err) {
        console.warn('Could not sync language to backend profile:', err.message);
      }
    }
  };

  return (
    <header className="app-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        <button
          type="button"
          onClick={onOpenSidebar}
          className="mobile-hamburger-btn"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        <h1 style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          margin: 0,
          color: 'var(--text-main)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {displayTitle}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
        {/* Family Member Profile Selector */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(prev => !prev)}
            className="btn btn-sm"
            style={{
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-light)',
              backgroundColor: '#ffffff',
              color: 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-xs)',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Switch Patient Profile"
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 700
            }}>
              {activeProfile?.name?.charAt(0) || 'P'}
            </div>
            <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeProfile ? `${activeProfile.name} (${activeProfile.relationship})` : 'Select Profile'}
            </span>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '260px',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 1000,
              overflow: 'hidden',
              animation: 'fadeIn 0.15s ease-out'
            }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-main)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Family Health Profiles
              </div>

              <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '0.35rem 0' }}>
                {profiles.map(p => {
                  const isCurrent = activeProfile?._id === p._id;
                  return (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => {
                        switchProfile(p._id);
                        setShowProfileMenu(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.6rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isCurrent ? 'var(--primary-light)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: isCurrent ? 'var(--primary)' : 'var(--border-light)',
                          color: isCurrent ? '#ffffff' : 'var(--text-main)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {p.relationship} {p.bloodGroup ? `• ${p.bloodGroup}` : ''}
                          </div>
                        </div>
                      </div>
                      {isCurrent && <Check size={16} color="var(--primary)" />}
                    </button>
                  );
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', padding: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowAddModal(true);
                  }}
                  className="btn btn-sm btn-outline"
                  style={{ width: '100%', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                >
                  <UserPlus size={14} />
                  <span>+ Add Family Member</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Language Toggle Indicator */}
        <button
          type="button"
          onClick={toggleLanguage}
          title={isTelugu ? 'Switch to English' : 'తెలుగులోకి మార్చండి'}
          className="btn btn-sm"
          style={{
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            border: `1px solid ${isTelugu ? '#86efac' : 'var(--border-light)'}`,
            backgroundColor: isTelugu ? '#f0fdf4' : '#f8fafc',
            color: isTelugu ? '#15803d' : 'var(--text-main)',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Globe size={14} color={isTelugu ? '#16a34a' : 'var(--primary)'} />
          <span>{isTelugu ? 'తెలుగు' : 'English'}</span>
        </button>

        {isDashboard && (
          <>
            {/* Quick AI button */}
            <button
              type="button"
              onClick={() => navigate('/assistant')}
              className="btn btn-secondary btn-sm"
              style={{ gap: '0.4rem', border: '1px solid #c7d2fe', backgroundColor: '#eef2ff', color: '#4338ca' }}
              title={t('nav.askAi', 'Ask Health AI')}
            >
              <Bot size={15} />
              <span className="nav-btn-text">{t('nav.askAi', 'Ask Health AI')}</span>
            </button>

            {/* Quick Upload button */}
            <button
              type="button"
              onClick={() => navigate('/documents')}
              className="btn btn-primary btn-sm"
              style={{ gap: '0.4rem' }}
              title={t('nav.uploadDoc', 'Upload Document')}
            >
              <UploadCloud size={15} />
              <span className="nav-btn-text">{t('nav.uploadDoc', 'Upload Document')}</span>
            </button>
          </>
        )}
      </div>

      {/* Add Family Member Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '480px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Add Family Member
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMember} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="e.g. Martha Johnson"
                  className="form-control"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Relationship *
                  </label>
                  <select
                    value={newMember.relationship}
                    onChange={(e) => setNewMember({ ...newMember, relationship: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Gender *
                  </label>
                  <select
                    value={newMember.gender}
                    onChange={(e) => setNewMember({ ...newMember, gender: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={newMember.dateOfBirth}
                    onChange={(e) => setNewMember({ ...newMember, dateOfBirth: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Blood Group
                  </label>
                  <input
                    type="text"
                    value={newMember.bloodGroup}
                    onChange={(e) => setNewMember({ ...newMember, bloodGroup: e.target.value })}
                    placeholder="e.g. O+, B+"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Chronic Conditions (comma separated)
                </label>
                <input
                  type="text"
                  value={newMember.chronicConditions}
                  onChange={(e) => setNewMember({ ...newMember, chronicConditions: e.target.value })}
                  placeholder="e.g. Hypertension, Type 2 Diabetes"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-sm"
                >
                  {submitting ? 'Adding...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
