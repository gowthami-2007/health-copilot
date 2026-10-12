import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const [selectedMember, setSelectedMember] = useState('Self');
  const [age, setAge] = useState('');
  const [openFaq, setOpenFaq] = useState(0); // First item open by default
  const featuresRef = useRef(null);

  const members = [
    { id: 'Self', label: 'Self', icon: User },
    { id: 'Spouse', label: 'Spouse', icon: Heart },
    { id: 'Child', label: 'Child', icon: Baby },
    { id: 'Parent', label: 'Parent', icon: Users },
    { id: 'ParentInLaw', label: 'Parent In-Law', icon: Users },
  ];

  const faqs = [
    {
      q: 'How does Health Copilot understand my medical and lab reports?',
      a: 'Health Copilot uses an integrated OCR engine to extract key measurements, diagnostic panels, and doctor notes from uploaded PDFs or photos. Our Retrieval-Augmented Generation (RAG) system then references these exact values to generate plain-language explanations with cited source documents.',
    },
    {
      q: 'Is my personal health data kept private and secure?',
      a: 'Yes, completely. Your medical documents, extracted biomarker values, and consultation history are strictly isolated to your individual authenticated user account. We maintain zero third-party sharing and apply zero data tracking.',
    },
    {
      q: 'Can Health Copilot replace visits to my doctor?',
      a: 'No. Health Copilot is an informational AI assistant designed to help you organize documents, understand medical terms, and formulate proactive questions. It does not provide medical diagnoses, emergency care, or prescription changes. Always consult a licensed healthcare professional for clinical decisions.',
    },
    {
      q: 'Does it support regional Indian languages like Telugu?',
      a: 'Yes! You can toggle between English and Telugu (తెలుగు) in your Profile Settings. The AI will translate document summaries and explanations while strictly preserving exact medical values, dosages, and drug names in their original clinical format.',
    },
    {
      q: 'What is the simulated ABDM / ABHA Sandbox readiness?',
      a: 'It demonstrates compatibility with India’s Ayushman Bharat Digital Mission (ABDM). In sandbox mode, you can link a mock 14-digit ABHA identity, preview simulated federated hospital records, and import FHIR R4 standardized clinical bundles into your timeline.',
    },
    {
      q: 'How do I add prescriptions and set reminder schedules?',
      a: 'Head to the Medications tab to record prescription names, dosages, schedules (e.g. once daily with meals), and prescribing doctors. Your daily regimens are organized alongside upcoming clinical appointments in your unified Health Timeline.',
    },
  ];

  // Scroll / load IntersectionObserver to trigger fly-in animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fly-in');
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    const elements = document.querySelectorAll('.feature-fly-card, .features-header-fly');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

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

            {/* Green CTA Button */}
            <button
              type="button"
              onClick={handleGetStarted}
              className="hero-cta-btn"
            >
              Get Started Free <ArrowRight size={18} />
            </button>
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
      <section ref={featuresRef} style={{ padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div className="features-header-fly" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            One Unified Health Intelligence Platform
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
            Eliminate scattered medical paperwork with an assistant engineered specifically for your health records.
          </p>
        </div>

        <div className="grid-3">
          <div className="card feature-fly-card" style={{ padding: '2rem', animationDelay: '0.05s' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <FileText size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 700 }}>Understand Health Documents</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
              Upload laboratory blood reports, imaging scans, and clinic notes. Our extractor translates complex measurements into plain language summaries.
            </p>
          </div>

          <div className="card feature-fly-card" style={{ padding: '2rem', animationDelay: '0.15s' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#e0e7ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Bot size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 700 }}>Ask Questions About Your Records</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
              Chat naturally with your AI Copilot powered by Retrieval-Augmented Generation (RAG). Receive precise answers cited directly from your documents.
            </p>
          </div>

          <div className="card feature-fly-card" style={{ padding: '2rem', animationDelay: '0.25s' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ccfbf1', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Pill size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 700 }}>Organize Medications</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
              Maintain an active list of your prescriptions, dosages, schedules, and prescriber notes. Never forget daily dosages again.
            </p>
          </div>

          <div className="card feature-fly-card" style={{ padding: '2rem', animationDelay: '0.35s' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Calendar size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 700 }}>Manage Appointments</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
              Schedule and monitor doctor appointments, upcoming lab tests, clinic locations, and preparation notes in one organized schedule.
            </p>
          </div>

          <div className="card feature-fly-card" style={{ padding: '2rem', animationDelay: '0.45s' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Clock size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 700 }}>Chronological Health Timeline</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
              View a connected timeline of test results, prescription additions, and clinic visits across months and years.
            </p>
          </div>

          <div className="card feature-fly-card" style={{ padding: '2rem', animationDelay: '0.55s' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Stethoscope size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 700 }}>Doctor Discussion Prompts</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
              Get AI-curated, proactive questions tailored to your test results so you walk into every doctor visit fully prepared.
            </p>
          </div>
        </div>
      </section>



      {/* Frequently Asked Questions Section */}
      <section id="faq" className="faq-section">
        <div className="faq-container">
          <div className="faq-header">
            <h2 className="faq-title">Frequently Asked Questions</h2>
            <p className="faq-subtitle">
              Learn how Health Copilot protects your personal vault, processes laboratory reports, and powers conversational healthcare intelligence.
            </p>
          </div>

          <div className="faq-list">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className={`faq-item ${isOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="faq-question-btn"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <div className="faq-icon-chevron">
                      <ChevronDown size={16} />
                    </div>
                  </button>
                  <div className="faq-collapse-wrapper">
                    <div className="faq-collapse-inner">
                      <div className="faq-answer-panel">
                        <p style={{ margin: 0 }}>{faq.a}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
