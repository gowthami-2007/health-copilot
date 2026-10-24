import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/common/Layout';
import HealthStats from '../components/dashboard/HealthStats';
import RecentDocuments from '../components/dashboard/RecentDocuments';
import UpcomingAppointments from '../components/dashboard/UpcomingAppointments';
import MedicationOverview from '../components/dashboard/MedicationOverview';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import dashboardService from '../services/dashboardService';
import useAuth from '../hooks/useAuth';
import useProfile from '../hooks/useProfile';
import useLanguage from '../hooks/useLanguage';
import { Bot, ArrowRight, Sparkles, Activity, Plus, TrendingUp, AlertTriangle, Cpu } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { t, isTelugu } = useLanguage();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quickQuestion, setQuickQuestion] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getDashboard({ patientProfileId: activeProfile?._id });
      setData(res.data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError(err.message || 'Failed to load health overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeProfile?._id]);

  const handleAskAI = (e) => {
    e.preventDefault();
    if (!quickQuestion.trim()) return;
    navigate('/assistant', { state: { initialPrompt: quickQuestion.trim() } });
  };

  // Determine localized greeting
  const greeting = data?.greeting || (isTelugu ? 'నమస్కారం' : 'Good day');

  return (
    <Layout pageTitle={t('dashboard.pageTitle', 'Patient Health Overview')}>
      {/* Greeting Banner */}
      <div style={{
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            {greeting}, {user?.name || (isTelugu ? 'రోగి' : 'Patient')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {t('dashboard.welcomeSubtitle', 'Here is your centralized personal health overview and AI assistance.')}
          </p>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <Loader message={isTelugu ? 'ఆరోగ్య డేటాను సమకాలీకరిస్తోంది...' : 'Synchronizing health data...'} />
      ) : (
        <>
          {/* Overdue Follow-up Clinical Alert Banner */}
          {data?.overdueFollowups && data.overdueFollowups.length > 0 && (
            <div style={{
              marginBottom: '1.5rem',
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#9f1239' }}>
                    Overdue Clinical Follow-up Detected ({data.overdueFollowups.length})
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#be123c' }}>
                    {data.overdueFollowups[0].title || data.overdueFollowups[0].reason || 'Scheduled follow-up'} with {data.overdueFollowups[0].doctorName || 'Doctor'} was originally recommended for {new Date(data.overdueFollowups[0].date).toLocaleDateString()}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/appointments')}
                className="btn btn-sm"
                style={{ backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 600, fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
              >
                Schedule Appointment <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Pending Proactive Agent Proposals Banner */}
          {data?.pendingAgentActions && data.pendingAgentActions.length > 0 && (
            <div style={{
              marginBottom: '1.5rem',
              backgroundColor: '#eef2ff',
              border: '1px solid #c7d2fe',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#e0e7ff',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Cpu size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#312e81' }}>
                    Proactive Agent Proposal Ready for Review
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#4338ca' }}>
                    {data.pendingAgentActions[0].proposal?.title || 'Proposed medication reminder schedule requires your approval.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/agent')}
                className="btn btn-sm"
                style={{ backgroundColor: '#4f46e5', color: '#ffffff', fontWeight: 600, fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
              >
                Review & Approve <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Health Stats Cards */}
          <HealthStats stats={data?.stats} />

          {/* AI Health Assistant Quick Query Bar */}
          <div className="card" style={{
            marginBottom: '2rem',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
            border: '1px solid #c7d2fe',
            padding: '1.4rem 1.75rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <div style={{
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
                padding: '0.35rem',
                borderRadius: '8px',
                display: 'flex'
              }}>
                <Bot size={18} />
              </div>
              <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#312e81' }}>
                {t('dashboard.askAiTitle', 'AI Health Assistant')}
              </h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1rem', maxWidth: '750px' }}>
              {t('dashboard.askAiSubtitle', 'Ask questions directly about your uploaded blood reports, test results, doctor instructions, and medications.')}
            </p>

            <form onSubmit={handleAskAI} style={{ display: 'flex', gap: '0.75rem', maxWidth: '750px', flexWrap: 'wrap' }}>
              <input
                id="dashboard-ai-input"
                type="text"
                className="form-input"
                placeholder={t('dashboard.askAiPlaceholder', "e.g. 'What was my cholesterol level in the latest blood report?'")}
                value={quickQuestion}
                onChange={(e) => setQuickQuestion(e.target.value)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
                  flex: '1 1 200px',
                  minWidth: 0,
                }}
              />
              <button
                type="submit"
                className="btn btn-accent"
                style={{ flexShrink: 0 }}
              >
                {t('dashboard.askAiBtn', 'Ask AI')} <ArrowRight size={16} />
              </button>
            </form>
          </div>

          {/* Grid Layout: Recent Documents & Upcoming Appointments */}
          <div className="grid-2" style={{ marginBottom: '2rem' }}>
            <RecentDocuments documents={data?.recentDocuments} />
            <UpcomingAppointments appointments={data?.upcomingAppointments} />
          </div>

          {/* Recent Laboratory Observations (Phase 5.1) */}
          {data?.recentLabObservations && data.recentLabObservations.length > 0 && (
            <div className="card" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={20} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Recent Extracted Lab Observations</h3>
                </div>
                <button
                  onClick={() => navigate('/documents')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  View All Reports <ArrowRight size={14} />
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Test Parameter</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Observed Result</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Reference Interval</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Status</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Source Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentLabObservations.map((obs, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {obs.testName}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {obs.result}
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                          {obs.referenceRange || 'Standard'}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '999px',
                              backgroundColor:
                                obs.abnormalFlag === 'HIGH'
                                  ? '#fef2f2'
                                  : obs.abnormalFlag === 'LOW'
                                    ? '#eff6ff'
                                    : '#ecfdf5',
                              color:
                                obs.abnormalFlag === 'HIGH'
                                  ? '#dc2626'
                                  : obs.abnormalFlag === 'LOW'
                                    ? '#2563eb'
                                    : '#059669',
                              border: `1px solid ${obs.abnormalFlag === 'HIGH'
                                  ? '#fecaca'
                                  : obs.abnormalFlag === 'LOW'
                                    ? '#bfdbfe'
                                    : '#a7f3d0'
                                }`,
                            }}
                          >
                            {obs.abnormalFlag || 'NORMAL'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <button
                            onClick={() => navigate(`/documents/${obs.documentId}`)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary)',
                              fontSize: '0.825rem',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              padding: 0,
                            }}
                          >
                            {obs.documentName}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Medication Overview & Activity */}
          <div className="grid-2">
            <MedicationOverview medications={data?.medications} />

            {/* Recent Timeline / Activity */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={20} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Recent Health Activity</h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/timeline')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  Full Timeline <ArrowRight size={14} />
                </button>
              </div>

              {(!data?.recentTimeline || data.recentTimeline.length === 0) ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-light)'
                }}>
                  <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    No recorded timeline events yet
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Uploading reports and scheduling appointments will populate your chronological timeline automatically.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {data.recentTimeline.map((item) => (
                    <div
                      key={item._id}
                      style={{
                        padding: '0.75rem 0.95rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                          {item.title}
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                          {item.description}
                        </p>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                        {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
};

export default Dashboard;
