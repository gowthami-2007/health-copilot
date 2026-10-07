import React from 'react';
import { FileText, Calendar, Pill, Activity, CheckCircle2, Stethoscope } from 'lucide-react';

const TimelineItem = ({ event, isLast = false }) => {
  const getEventIcon = (type) => {
    switch (type) {
      case 'DOCUMENT':
        return { icon: FileText, bg: '#e0f2fe', color: '#0284c7' };
      case 'APPOINTMENT':
        return { icon: Calendar, bg: '#e0e7ff', color: '#6366f1' };
      case 'MEDICATION':
        return { icon: Pill, bg: '#ccfbf1', color: '#0d9488' };
      default:
        return { icon: Activity, bg: '#f1f5f9', color: '#64748b' };
    }
  };

  const { icon: Icon, bg, color } = getEventIcon(event.eventType);

  return (
    <div style={{ display: 'flex', gap: '1.25rem', position: 'relative' }}>
      {/* Vertical Spine Line */}
      {!isLast && (
        <div
          style={{
            position: 'absolute',
            left: '20px',
            top: '40px',
            bottom: '-16px',
            width: '2px',
            backgroundColor: '#e2e8f0',
            zIndex: 1,
          }}
        />
      )}

      {/* Node Icon */}
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          backgroundColor: bg,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          zIndex: 2,
          boxShadow: '0 0 0 4px #ffffff',
          border: '1px solid var(--border-light)',
        }}
      >
        <Icon size={20} />
      </div>

      {/* Content Card */}
      <div
        className="card"
        style={{
          flex: 1,
          marginBottom: '1.5rem',
          padding: '1.15rem 1.4rem',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            {event.title}
          </h4>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: 500 }}>
            {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          {event.description}
        </p>

        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
            {event.eventType}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TimelineItem;
