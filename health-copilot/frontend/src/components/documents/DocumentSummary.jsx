import React from 'react';
import { Sparkles, HelpCircle, AlertCircle, Calendar, Pill, Activity, Stethoscope } from 'lucide-react';

const DocumentSummary = ({ summary = {} }) => {
  const {
    overview,
    keyInformation = [],
    datesMentioned = [],
    medicationsMentioned = [],
    testsMentioned = [],
    doctorQuestions = [],
  } = summary || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Overview Block */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
        border: '1px solid #a7f3d0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Sparkles size={20} color="#059669" />
          <h3 style={{ fontSize: '1.15rem', color: '#064e3b', margin: 0 }}>
            AI Health Summary
          </h3>
        </div>
        <p style={{ color: '#134e4a', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
          {overview || 'No overview generated yet.'}
        </p>
      </div>

      {/* Key Findings / Important Information */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Activity size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Important Information & Measurements</h3>
        </div>

        {keyInformation.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No specific measurement flags extracted.
          </p>
        ) : (
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {keyInformation.map((item, idx) => (
              <li key={idx} style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Metadata Grid: Tests, Medications, Dates */}
      <div className="grid-3">
        {/* Tests Conducted */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Activity size={16} color="var(--primary)" />
            <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Tests Mentioned</h4>
          </div>
          {testsMentioned.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None recorded</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {testsMentioned.map((t, i) => (
                <span key={i} className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Medications Found */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Pill size={16} color="var(--secondary)" />
            <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Medications</h4>
          </div>
          {medicationsMentioned.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None recorded</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {medicationsMentioned.map((m, i) => (
                <span key={i} className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Dates Extracted */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Calendar size={16} color="var(--accent)" />
            <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Dates in Report</h4>
          </div>
          {datesMentioned.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None recorded</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {datesMentioned.map((d, i) => (
                <span key={i} className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Questions for Doctor */}
      <div className="card" style={{
        backgroundColor: '#fffbeb',
        border: '1px solid #fde68a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Stethoscope size={20} color="#b45309" />
          <h3 style={{ fontSize: '1.15rem', color: '#92400e', margin: 0 }}>
            Questions to Discuss with Your Healthcare Professional
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '0.75rem' }}>
          Take these discussion prompts to your next doctor appointment:
        </p>
        <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {doctorQuestions.map((q, idx) => (
            <li key={idx} style={{ fontSize: '0.9rem', color: '#78350f', fontWeight: 500 }}>
              {q}
            </li>
          ))}
        </ul>
      </div>

      {/* Safety & Medical Disclaimer Box */}
      <div style={{
        padding: '0.85rem 1rem',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem'
      }}>
        <AlertCircle size={16} color="var(--text-subtle)" style={{ flexShrink: 0 }} />
        <span>
          <strong>DISCLAIMER:</strong> AI-generated summaries may contain errors or omissions. Always verify all findings with a qualified medical professional. This assistant does not provide diagnoses or prescribe treatment.
        </span>
      </div>
    </div>
  );
};

export default DocumentSummary;
