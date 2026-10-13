import React from 'react';
import { Menu, Bot, UploadCloud, Globe } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import useLanguage from '../../hooks/useLanguage';
import useAuth from '../../hooks/useAuth';
import profileService from '../../services/profileService';

const PAGE_TITLE_KEYS = {
  '/dashboard': 'dashboard.pageTitle',
  '/assistant': 'assistant.pageTitle',
  '/documents': 'documents.pageTitle',
  '/medications': 'medications.pageTitle',
  '/appointments': 'appointments.pageTitle',
  '/consultations': 'consultations.pageTitle',
  '/timeline': 'timeline.pageTitle',
  '/profile': 'profile.pageTitle',
};

const Navbar = ({ onOpenSidebar, pageTitle = 'Dashboard' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, isTelugu, t } = useLanguage();
  const { user, setUser } = useAuth();

  const isDashboard = location.pathname === '/dashboard';

  // Compute translated page title
  const titleKey = PAGE_TITLE_KEYS[location.pathname];
  const displayTitle = titleKey ? t(titleKey, pageTitle) : pageTitle;

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

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
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
    </header>
  );
};

export default Navbar;
