import React from 'react';
import { Link } from 'react-router-dom';
import {
  HeartPulse,
  Bot,
  FileText,
  Pill,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  Stethoscope,
  Activity,
  Sparkles,
  ShieldCheck,
  FileCheck2,
  MessageSquare,
} from 'lucide-react';

const Landing = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <nav style={{
        height: '75px',
        borderBottom: '1px solid var(--border-light)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            color: '#ffffff',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px var(--primary-glow)',
          }}>
            <HeartPulse size={24} />
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Health<span style={{ color: 'var(--primary)' }}>Copilot</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            to="/login"
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 600 }}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="btn btn-primary btn-sm"
          >
            Get Started <ArrowRight size={15} />
          </Link>
        </div>
      </nav>

      {/* Redesigned Hero Section */}
      <section className="hero-section">
        <div className="hero-grid-pattern" aria-hidden="true" />

        <div className="hero-container">
          {/* Left Column: Headline, Narrative & Call-To-Action */}
          <div className="hero-content">
            <div className="hero-anim-badge">
              <div className="hero-badge">
                <span className="hero-badge-dot" />
                <span>Next-Gen Clinical Health Intelligence</span>
              </div>
            </div>

            <h1 className="hero-title hero-anim-title">
              Your Personal AI{' '}
              <span className="hero-title-highlight">Health Copilot</span>
            </h1>

            <p className="hero-description hero-anim-desc">
              Understand complex lab reports, track daily medications, and ask questions about your medical history — with verified answers cited directly from your personal health documents.
            </p>

            <div className="hero-actions hero-anim-actions">
              <Link to="/register" className="btn btn-primary hero-btn-primary">
                Get Started Free <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="hero-btn-secondary">
                <Sparkles size={16} style={{ color: '#0284c7' }} /> Explore Live Demo
              </Link>
            </div>

            <div className="hero-trust-list hero-anim-trust">
              <div className="hero-trust-item">
                <CheckCircle2 size={16} />
                <span>Zero Third-Party Sharing</span>
              </div>
              <div className="hero-trust-item">
                <CheckCircle2 size={16} />
                <span>Instant OCR Report Parsing</span>
              </div>
              <div className="hero-trust-item">
                <CheckCircle2 size={16} />
                <span>Cited AI Sources</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Product Preview Element */}
          <div className="hero-visual-wrapper hero-anim-visual">
            {/* Top Floating Badge */}
            <div className="hero-float-badge-top" aria-hidden="true">
              <Pill size={16} />
              <span>Active Prescription Monitored</span>
            </div>

            {/* Main Interactive Clinical Card */}
            <div className="hero-visual-card">
              <div className="hero-preview-header">
                <div className="hero-preview-source">
                  <div className="hero-preview-icon">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div className="hero-preview-docname">Metabolic & Lipid Panel</div>
                    <div className="hero-preview-meta">Quest Diagnostics • Extracted & Indexed</div>
                  </div>
                </div>
                <div className="hero-preview-status">
                  <Activity size={12} />
                  <span>RAG Ready</span>
                </div>
              </div>

              {/* Biomarker Key Metrics */}
              <div className="hero-biomarkers">
                <div className="hero-biomarker-chip">
                  <div className="hero-biomarker-label">Hemoglobin</div>
                  <div className="hero-biomarker-val">14.2 <span style={{ fontSize: '0.68rem', fontWeight: 500, color: '#64748b' }}>g/dL</span></div>
                  <div className="hero-biomarker-tag">Optimal</div>
                </div>
                <div className="hero-biomarker-chip">
                  <div className="hero-biomarker-label">Total Chol</div>
                  <div className="hero-biomarker-val">188 <span style={{ fontSize: '0.68rem', fontWeight: 500, color: '#64748b' }}>mg/dL</span></div>
                  <div className="hero-biomarker-tag">Normal</div>
                </div>
                <div className="hero-biomarker-chip">
                  <div className="hero-biomarker-label">Vitamin D</div>
                  <div className="hero-biomarker-val">34.8 <span style={{ fontSize: '0.68rem', fontWeight: 500, color: '#64748b' }}>ng/mL</span></div>
                  <div className="hero-biomarker-tag">Healthy</div>
                </div>
              </div>

              {/* AI Copilot Query & Cited Answer */}
              <div className="hero-chat-snippet">
                <div className="hero-chat-user">
                  <MessageSquare size={14} style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
                  <span>"Are my cholesterol and vitamin levels in healthy ranges?"</span>
                </div>
                <div className="hero-chat-ai">
                  <div className="hero-chat-ai-header">
                    <Bot size={14} />
                    <span>Health Copilot Assistant</span>
                  </div>
                  <p className="hero-chat-ai-body">
                    Yes. Your total cholesterol is 188 mg/dL (under the 200 mg/dL target) and Vitamin D is 34.8 ng/mL, showing consistent improvement from your previous report.
                  </p>
                  <div className="hero-chat-citation">
                    <FileCheck2 size={12} />
                    <span>Cited from Lab Report #QD-2026</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Floating Badge */}
            <div className="hero-float-badge-bottom" aria-hidden="true">
              <ShieldCheck size={16} />
              <span>Strict Patient Vault Security</span>
            </div>
          </div>
        </div>
      </section>


      {/* Core Features Grid */}
      <section style={{ padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            One Unified Health Intelligence Platform
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
            Eliminate scattered medical paperwork with an assistant engineered specifically for your health records.
          </p>
        </div>

        <div className="grid-3">
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <FileText size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Understand Health Documents</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Upload laboratory blood reports, imaging scans, and clinic notes. Our extractor translates complex measurements into plain language summaries.
            </p>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#e0e7ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Bot size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Ask Questions About Your Records</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Chat naturally with your AI Copilot powered by Retrieval-Augmented Generation (RAG). Receive precise answers cited directly from your documents.
            </p>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ccfbf1', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Pill size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Organize Medications</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Maintain an active list of your prescriptions, dosages, schedules, and prescriber notes. Never forget daily dosages again.
            </p>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Calendar size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Manage Appointments</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Schedule and monitor doctor appointments, upcoming lab tests, clinic locations, and preparation notes in one organized schedule.
            </p>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Clock size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Chronological Health Timeline</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              View a connected timeline of test results, prescription additions, and clinic visits across months and years.
            </p>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Stethoscope size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Doctor Discussion Prompts</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Get AI-curated, proactive questions tailored to your test results so you walk into every doctor visit fully prepared.
            </p>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer style={{ padding: '2.5rem 2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
        <p>© 2026 Health Copilot. Built with MERN + AI RAG architecture.</p>
        <p style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
          Secure Patient Vault • Zero Third-Party Data Sharing
        </p>
      </footer>
    </div>
  );
};

export default Landing;
