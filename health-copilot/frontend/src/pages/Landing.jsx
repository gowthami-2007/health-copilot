import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

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

      {/* Hero Section */}
      <section style={{
        padding: '5rem 1.5rem 4rem 1.5rem',
        background: 'radial-gradient(ellipse at 50% 0%, #e0f2fe 0%, #f8fafc 70%)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '3.25rem',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '1.25rem',
            color: '#0f172a'
          }}>
            Your Personal AI <span style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Health Copilot</span>
          </h1>

          <p style={{
            fontSize: '1.2rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            maxWidth: '680px',
            margin: '0 auto 2.25rem auto'
          }}>
            Understand, organize, and manage your healthcare information in one secure place.
            Transform complex blood tests and clinical notes into clear, actionable answers.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              Get Started Free <ArrowRight size={18} />
            </Link>
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
