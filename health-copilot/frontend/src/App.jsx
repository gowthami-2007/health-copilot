import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Routes>
          <Route path="/" element={
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#0284c7' }}>
                Health Copilot
              </h1>
              <p style={{ color: '#64748b' }}>
                AI-Powered Personal Health Copilot is initializing...
              </p>
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
