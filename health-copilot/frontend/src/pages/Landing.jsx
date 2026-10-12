import React, { useState } from 'react';
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
  Sparkles,
  ShieldCheck,
  FileCheck2,
  MessageSquare,
  User,
  Users,
  Baby,
  Heart,
  HelpCircle,
  PhoneCall,
  Check,
  Building2,
  Receipt,
  Percent,
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const [selectedMember, setSelectedMember] = useState('Self');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [pincode, setPincode] = useState('');

  const members = [
    { id: 'Self', label: 'Self', icon: User },
    { id: 'Spouse', label: 'Spouse', icon: Heart },
    { id: 'Child', label: 'Child', icon: Baby },
    { id: 'Parent', label: 'Parent', icon: Users },
    { id: 'ParentInLaw', label: 'Parent In-Law', icon: Users },
  ];

  const handleGetStarted = (e) => {
    e.preventDefault();
    navigate('/register');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <nav style={{
        height: '75px',
        borderBottom: '1px solid var(--border-light)',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
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
          <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Health<span style={{ color: 'var(--primary)' }}>Copilot</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a
            href="#faq"
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', border: '1px solid #e2e8f0' }}
          >
            <HelpCircle size={15} /> FAQs
          </a>
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

      {/* Hero Section matching Acko UI layout */}
      <section className="hero-section">
        <div className="hero-grid-pattern" aria-hidden="true" />

        <div className="hero-container">
          {/* Left Column: Heading + Joyful Family Visual with Surrounding Badges */}
          <div className="hero-left-col">
            <h1 className="hero-title">
              Health intelligence for people who don't compromise
            </h1>

            <div className="hero-image-stage">
              {/* Badge 1: Top Center */}
              <div className="hero-pill-badge hero-pill-top-center">
                <span className="hero-pill-badge-title">
                  <span className="hero-pill-badge-highlight">No</span> room
                </span>
                <span className="hero-pill-badge-sub">rent limits</span>
              </div>

              {/* Badge 2: Mid Right */}
              <div className="hero-pill-badge hero-pill-mid-right">
                <span className="hero-pill-badge-title" style={{ color: '#059669' }}>
                  100%
                </span>
                <span className="hero-pill-badge-sub">report clarity</span>
              </div>

              {/* Central Family Image */}
              <img
                src="/hero-family.jpg"
                alt="Happy Indian family protected by Health Copilot"
                className="hero-family-img"
              />

              {/* Badge 3: Mid Left */}
              <div className="hero-pill-badge hero-pill-mid-left">
                <span className="hero-pill-badge-title" style={{ color: '#0284c7' }}>
                  11,500+
                </span>
                <span className="hero-pill-badge-sub">verified labs & clinics</span>
              </div>

              {/* Badge 4: Bottom Right */}
              <div className="hero-pill-badge hero-pill-top-left" style={{ bottom: '-10px', top: 'auto', right: '-12px', left: 'auto' }}>
                <span className="hero-pill-badge-title" style={{ color: '#7c3aed' }}>
                  ABHA Ready
                </span>
                <span className="hero-pill-badge-sub">Instant Vault Sync</span>
              </div>
            </div>
          </div>

          {/* Right Column: Member Selection & Personalization Card */}
          <div className="hero-form-card">
            <h3>Who would you like to safeguard?</h3>

            {/* Member Selector Icons */}
            <div className="member-selector-grid">
              {members.map((m) => {
                const IconComponent = m.icon;
                const isSelected = selectedMember === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMember(m.id)}
                    className={`member-btn ${isSelected ? 'active' : ''}`}
                  >
                    <div className="member-icon-bubble">
                      <IconComponent size={20} />
                      {isSelected && (
                        <div className="member-check-badge">
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span className="member-label">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Age Input */}
            <div className="hero-card-section-title">Please enter the age</div>
            <div className="hero-age-row">
              <span className="hero-age-label">
                {selectedMember === 'Child' ? 'Child age' : 'Eldest member (self, spouse)'}
              </span>
              <input
                type="number"
                min="1"
                max="105"
                placeholder="32"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="hero-age-input"
              />
            </div>

            {/* Phone & Pincode Split Row */}
            <div className="hero-input-split">
              <div className="hero-phone-group">
                <span className="hero-phone-prefix">+91</span>
                <input
                  type="tel"
                  placeholder="Your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="hero-phone-input"
                  maxLength={10}
                />
              </div>

              <input
                type="text"
                placeholder="Your pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="hero-pincode-input"
                maxLength={6}
              />
            </div>

            {/* Green CTA Button */}
            <button
              type="button"
              onClick={handleGetStarted}
              className="hero-cta-btn"
            >
              Get Started Free <ArrowRight size={18} />
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.85rem' }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                🔒 Zero third-party data sharing • Instant OCR & RAG analysis
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Why Health Copilot Stats Row */}
      <section className="why-acko-section">
        <h2 className="why-acko-title">Why Health Copilot?</h2>

        <div className="why-acko-grid">
          <div className="why-acko-card">
            <div className="why-acko-icon">
              <Users size={26} />
            </div>
            <div>
              <div className="why-acko-stat">7.5Cr+</div>
              <p className="why-acko-desc">Clinical records interpreted and structured across patients</p>
            </div>
          </div>

          <div className="why-acko-card">
            <div className="why-acko-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="why-acko-stat">100%</div>
              <p className="why-acko-desc">Vault isolation with private user-level data segregation</p>
            </div>
          </div>

          <div className="why-acko-card">
            <div className="why-acko-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
              <Activity size={26} />
            </div>
            <div>
              <div className="why-acko-stat">98%</div>
              <p className="why-acko-desc">Doctor preparation satisfaction with bilingual summaries</p>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Chat / Call Widget matching Acko */}
      <Link to="/assistant" className="hero-floating-help" title="Ask AI Health Assistant">
        <span className="hero-floating-help-dot" />
        <span>Ask Copilot AI</span>
        <Bot size={16} />
      </Link>


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
