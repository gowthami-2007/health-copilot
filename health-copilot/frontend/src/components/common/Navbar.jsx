import React from 'react';
import { Menu, Search, Bot, UploadCloud, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ onOpenSidebar, pageTitle = 'Dashboard' }) => {
  const navigate = useNavigate();

  return (
    <header className="app-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          onClick={onOpenSidebar}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-main)',
            padding: '0.25rem',
          }}
          className="mobile-hamburger-btn"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
          {pageTitle}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Quick AI button */}
        <button
          type="button"
          onClick={() => navigate('/assistant')}
          className="btn btn-secondary btn-sm"
          style={{ gap: '0.4rem', border: '1px solid #c7d2fe', backgroundColor: '#eef2ff', color: '#4338ca' }}
        >
          <Bot size={15} />
          <span>Ask Health AI</span>
        </button>

        {/* Quick Upload button */}
        <button
          type="button"
          onClick={() => navigate('/documents')}
          className="btn btn-primary btn-sm"
          style={{ gap: '0.4rem' }}
        >
          <UploadCloud size={15} />
          <span>Upload Document</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
