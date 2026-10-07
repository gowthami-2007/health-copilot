import React, { useState, useEffect } from 'react';
import Layout from '../components/common/Layout';
import Timeline from '../components/timeline/Timeline';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import timelineService from '../services/timelineService';
import { Clock, Filter } from 'lucide-react';

const TimelinePage = () => {
  const [timelineData, setTimelineData] = useState({ events: [], groupedByYear: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await timelineService.getTimeline();
        setTimelineData(res.data);
      } catch (err) {
        console.error('Failed to load timeline:', err);
        setError(err.message || 'Could not load health timeline');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, []);

  // Filter events if needed
  let filteredEvents = timelineData.events;
  if (filterType !== 'ALL') {
    filteredEvents = timelineData.events.filter((e) => e.eventType === filterType);
  }

  // Regroup filtered events
  const filteredGrouped = {};
  for (const event of filteredEvents) {
    const year = new Date(event.date).getFullYear() || new Date().getFullYear();
    if (!filteredGrouped[year]) filteredGrouped[year] = [];
    filteredGrouped[year].push(event);
  }

  return (
    <Layout pageTitle="Chronological Health Timeline">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            Health Journey Timeline
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            A unified chronological history of clinical documents, appointments, and medication milestones.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['ALL', 'DOCUMENT', 'APPOINTMENT', 'MEDICATION'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                border: `1px solid ${filterType === type ? 'var(--primary)' : 'var(--border-light)'}`,
                backgroundColor: filterType === type ? 'var(--primary)' : '#ffffff',
                color: filterType === type ? '#ffffff' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {type === 'ALL' ? 'All Events' : `${type.charAt(0) + type.slice(1).toLowerCase()}s`}
            </button>
          ))}
        </div>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError(null)} />

      {loading ? (
        <Loader message="Compiling chronological records..." />
      ) : (
        <Timeline events={filteredEvents} groupedByYear={filteredGrouped} />
      )}
    </Layout>
  );
};

export default TimelinePage;
