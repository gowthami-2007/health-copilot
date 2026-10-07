import React from 'react';
import TimelineItem from './TimelineItem';
import { Clock } from 'lucide-react';

const Timeline = ({ events = [], groupedByYear = {} }) => {
  if (events.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#f1f5f9',
          color: 'var(--text-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto'
        }}>
          <Clock size={32} />
        </div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          Your Health Timeline is Empty
        </h3>
        <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem auto', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Uploading medical reports, adding prescriptions, and scheduling consultations will automatically generate your chronological healthcare journey.
        </p>
      </div>
    );
  }

  // Render grouped by year descending
  const years = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      {years.map((year) => (
        <div key={year} style={{ marginBottom: '2.5rem' }}>
          {/* Year Marker */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.95rem',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.85rem',
            fontWeight: 800,
            marginBottom: '1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <span>{year}</span>
          </div>

          <div>
            {groupedByYear[year].map((item, idx) => (
              <TimelineItem
                key={item.id || item._id || idx}
                event={item}
                isLast={idx === groupedByYear[year].length - 1}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;
