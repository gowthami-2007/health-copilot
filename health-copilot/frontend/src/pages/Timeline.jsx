import React, { useState, useEffect } from 'react';
import Layout from '../components/common/Layout';
import Timeline from '../components/timeline/Timeline';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import timelineService from '../services/timelineService';
import { useLanguage } from '../hooks/useLanguage';
import { Clock, Filter } from 'lucide-react';

const TimelinePage = () => {
  const { t } = useLanguage();
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

  const filterOptions = [
    { id: 'ALL', label: t('timeline.allFilter', 'All Events') },
    { id: 'DOCUMENT', label: t('timeline.documentsFilter', 'Documents') },
    { id: 'APPOINTMENT', label: t('timeline.appointmentsFilter', 'Appointments') },
    { id: 'MEDICATION', label: t('timeline.medicationsFilter', 'Medications') },
  ];

  return (
    <Layout pageTitle={t('timeline.pageTitle', 'Chronological Health Timeline')}>
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
            {t('timeline.pageTitle', 'Health Journey Timeline')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {t('timeline.subtitle', 'A unified chronological history of clinical documents, appointments, and medication milestones.')}
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilterType(opt.id)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                border: `1px solid ${filterType === opt.id ? 'var(--primary)' : 'var(--border-light)'}`,
                backgroundColor: filterType === opt.id ? 'var(--primary)' : '#ffffff',
                color: filterType === opt.id ? '#ffffff' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError(null)} />

      {loading ? (
        <Loader message={t('common.loading', 'Compiling chronological records...')} />
      ) : (
        <Timeline events={filteredEvents} groupedByYear={filteredGrouped} />
      )}
    </Layout>
  );
};

export default TimelinePage;
