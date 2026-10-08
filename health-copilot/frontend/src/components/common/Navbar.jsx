import React from 'react';
import { Menu, Search, Bot, UploadCloud, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ onOpenSidebar, pageTitle = 'Dashboard' }) => {
  const navigate = useNavigate();

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
          {pageTitle}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {/* Quick AI button */}
        <button
          type="button"
          onClick={() => navigate('/assistant')}
          className="btn btn-secondary btn-sm"
          style={{ gap: '0.4rem', border: '1px solid #c7d2fe', backgroundColor: '#eef2ff', color: '#4338ca' }}
          title="Ask Health AI"
        >
          <Bot size={15} />
          <span className="nav-btn-text">Ask Health AI</span>
        </button>

        {/* Quick Upload button */}
        <button
          type="button"
          onClick={() => navigate('/documents')}
          className="btn btn-primary btn-sm"
          style={{ gap: '0.4rem' }}
          title="Upload Document"
        >
          <UploadCloud size={15} />
          <span className="nav-btn-text">Upload Document</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
