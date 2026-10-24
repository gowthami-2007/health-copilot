import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Utensils,
  Footprints,
  Moon,
  Heart,
  CalendarCheck,
  Pill,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  ChevronRight,
  Filter,
} from 'lucide-react';
import Layout from '../components/common/Layout';
import useProfile from '../hooks/useProfile';
import wellnessService from '../services/wellnessService';

const CATEGORIES = [
  { key: 'ALL', label: 'All Guidance', icon: Sparkles },
  { key: 'NUTRITION', label: 'Diet & Nutrition', icon: Utensils },
  { key: 'PHYSICAL_ACTIVITY', label: 'Physical Activity', icon: Footprints },
  { key: 'SLEEP', label: 'Sleep Habits', icon: Moon },
  { key: 'HEALTHY_HABITS', label: 'Healthy Habits', icon: Heart },
  { key: 'FOLLOWUP_PREP', label: 'Follow-up Prep', icon: CalendarCheck },
  { key: 'MEDICATION_ADHERENCE', label: 'Medication Adherence', icon: Pill },
];

const Wellness = () => {
  const { activeProfile } = useProfile();
  const [recommendations, setRecommendations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await wellnessService.getRecommendations(activeProfile?._id || null);
      setRecommendations(res?.data?.data?.recommendations || res?.data?.recommendations || []);
    } catch (err) {
      console.error('Failed to load wellness recommendations:', err);
      setError(err.response?.data?.message || 'Unable to load recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [activeProfile?._id]);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      setUpdatingId(id);
      await wellnessService.updateStatus(id, newStatus);
      setRecommendations((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      alert('Failed to update recommendation status: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRecs = recommendations.filter((r) => {
    if (r.status === 'DISMISSED') return false;
    if (selectedCategory === 'ALL') return true;
    return r.category === selectedCategory;
  });

  return (
    <Layout pageTitle="Personalized Wellness & Lifestyle Guidance">
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Banner with Profile Info */}
        <div style={{
          backgroundColor: '#f0fdfa',
          border: '1px solid #99f6e4',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'var(--secondary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(13, 148, 136, 0.25)'
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#134e4a' }}>
                Personalized Wellness for {activeProfile?.name || 'Selected Patient'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#0f766e' }}>
                Evidence-informed suggestions tailored to recorded lab results, chronic conditions, and active prescriptions.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchRecommendations}
            className="btn btn-sm"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #99f6e4',
              color: '#0f766e',
              fontWeight: 700,
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Guidance</span>
          </button>
        </div>

        {/* Safety Disclaimer Banner */}
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.8rem',
          color: '#92400e'
        }}>
          <ShieldAlert size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Healthcare Advisory:</strong> Wellness recommendations are general lifestyle educational guidance
            and do not replace medical treatment plans or clinician advice. Never alter prescribed medications without consulting your doctor.
          </div>
        </div>

        {/* Category Filters */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.35rem'
        }}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;
            const count = recommendations.filter(
              (r) => r.status !== 'DISMISSED' && (cat.key === 'ALL' || r.category === cat.key)
            ).length;

            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className="btn btn-sm"
                style={{
                  borderRadius: 'var(--radius-full)',
                  padding: '0.45rem 0.85rem',
                  backgroundColor: isSelected ? 'var(--secondary)' : '#ffffff',
                  color: isSelected ? '#ffffff' : 'var(--text-main)',
                  border: isSelected ? '1px solid var(--secondary)' : '1px solid var(--border-light)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  whiteSpace: 'nowrap',
                  boxShadow: 'var(--shadow-xs)'
                }}
              >
                <Icon size={14} />
                <span>{cat.label}</span>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 700
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Recommendations Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ marginBottom: '0.75rem' }} />
            <p>Loading personalized guidance...</p>
          </div>
        ) : filteredRecs.length === 0 ? (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
            padding: '3rem 2rem',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}>
            <CheckCircle2 size={40} color="var(--secondary)" style={{ marginBottom: '0.75rem' }} />
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>You are all caught up!</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              No pending wellness guidance in this category. Upload medical records or prescriptions to generate personalized lifestyle insights.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {filteredRecs.map((rec) => {
              const isCompleted = rec.status === 'COMPLETED';

              return (
                <div
                  key={rec._id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-light)',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    opacity: isCompleted ? 0.75 : 1,
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  {/* Category & Urgency Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--secondary-light)',
                      color: 'var(--secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {rec.category.replace('_', ' ')}
                    </span>

                    {rec.urgency && (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: rec.urgency === 'HIGH' ? '#fee2e2' : '#fef3c7',
                        color: rec.urgency === 'HIGH' ? '#b91c1c' : '#92400e',
                      }}>
                        {rec.urgency} PRIORITY
                      </span>
                    )}
                  </div>

                  {/* Title & Action */}
                  <div>
                    <h4 style={{
                      margin: '0 0 0.35rem 0',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      textDecoration: isCompleted ? 'line-through' : 'none'
                    }}>
                      {rec.title}
                    </h4>
                    <p style={{
                      margin: 0,
                      fontSize: '0.88rem',
                      color: 'var(--text-main)',
                      lineHeight: '1.5',
                      fontWeight: 500
                    }}>
                      {rec.practicalAction}
                    </p>
                  </div>

                  {/* Why this is suggested */}
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#f8fafc',
                    border: '1px solid var(--border-light)',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    lineHeight: '1.4'
                  }}>
                    <strong style={{ color: 'var(--text-main)' }}>Why this is suggested: </strong>
                    {rec.reason || rec.rationale}
                  </div>

                  {/* Limitations Notice */}
                  {rec.limitations && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                      Notice: {rec.limitations}
                    </div>
                  )}

                  {/* Interactive Action Controls */}
                  <div style={{
                    marginTop: 'auto',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <button
                      type="button"
                      disabled={updatingId === rec._id}
                      onClick={() => handleStatusUpdate(rec._id, isCompleted ? 'ACTIVE' : 'COMPLETED')}
                      className="btn btn-sm"
                      style={{
                        gap: '0.4rem',
                        backgroundColor: isCompleted ? '#f0fdf4' : '#ffffff',
                        border: isCompleted ? '1px solid #86efac' : '1px solid var(--border-light)',
                        color: isCompleted ? '#16a34a' : 'var(--text-main)',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      <CheckCircle2 size={15} color={isCompleted ? '#16a34a' : 'var(--text-muted)'} />
                      <span>{isCompleted ? 'Completed' : 'Mark Done'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={updatingId === rec._id}
                      onClick={() => handleStatusUpdate(rec._id, 'DISMISSED')}
                      className="btn btn-sm"
                      style={{
                        gap: '0.3rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                      title="Dismiss this recommendation"
                    >
                      <XCircle size={14} />
                      <span>Dismiss</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Wellness;
