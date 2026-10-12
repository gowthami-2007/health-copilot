import React from 'react';
import { FileText, Pill, Calendar, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const HealthStats = ({
  stats = {
    documents: 0,
    medications: 0,
    appointments: 0,
    totalLabResults: 0,
    abnormalLabs: 0,
    reviewRequired: 0,
  },
}) => {
  const cards = [
    {
      title: 'Health Documents',
      count: stats.documents || 0,
      icon: FileText,
      color: '#0284c7',
      bg: '#e0f2fe',
      link: '/documents',
      label: 'Secure vault files',
    },
    {
      title: 'Lab Parameters',
      count: stats.totalLabResults || 0,
      icon: Activity,
      color: stats.abnormalLabs > 0 ? '#ea580c' : '#059669',
      bg: stats.abnormalLabs > 0 ? '#ffedd5' : '#ecfdf5',
      link: '/documents',
      label: stats.abnormalLabs > 0 ? `${stats.abnormalLabs} out-of-range flag(s)` : 'All normal',
    },
    {
      title: 'Active Medications',
      count: stats.medications || 0,
      icon: Pill,
      color: '#0d9488',
      bg: '#ccfbf1',
      link: '/medications',
      label: 'Verified prescriptions',
    },
    {
      title: 'Upcoming Visits',
      count: stats.appointments || 0,
      icon: Calendar,
      color: '#6366f1',
      bg: '#e0e7ff',
      link: '/appointments',
      label: 'Scheduled consults',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}
    >
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Link
            key={idx}
            to={card.link}
            className="card"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.4rem 1.6rem',
              transition: 'all 0.2s ease',
              border: '1px solid var(--border-light)',
              minWidth: 0,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {card.title}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                  {card.count}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
                  {card.label}
                </span>
              </div>
            </div>

            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: card.bg,
                color: card.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginLeft: '0.5rem',
              }}
            >
              <Icon size={26} />
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default HealthStats;
