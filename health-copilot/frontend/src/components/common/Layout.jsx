import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { ShieldAlert } from 'lucide-react';

const Layout = ({ children, pageTitle = 'Dashboard' }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-main">
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} pageTitle={pageTitle} />

        <main className="app-content animate-fade-in">
          {children}

          {/* Persistent Healthcare Disclaimer Banner */}
          <div className="medical-disclaimer-banner" style={{ marginTop: '2.5rem' }}>
            <ShieldAlert size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
            <span>
              <strong>Healthcare Advisory:</strong> Health Copilot is an AI-powered informational tool to organize records. It does not provide medical diagnoses, treatment plans, or emergency services. Consult a licensed healthcare provider for clinical decisions.
            </span>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
