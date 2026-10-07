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
import { Bot, ArrowRight, Sparkles, Activity, ShieldCheck, Plus } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quickQuestion, setQuickQuestion] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getDashboard();
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
  }, []);

  const handleAskAI = (e) => {
    e.preventDefault();
    if (!quickQuestion.trim()) return;
    navigate('/assistant', { state: { initialPrompt: quickQuestion.trim() } });
  };

  return (
    <Layout pageTitle="Patient Health Overview">
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
            {data?.greeting || 'Good day'}, {user?.name || 'Patient'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Here is your centralized personal health overview and AI assistance.
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          padding: '0.45rem 0.85rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#065f46'
        }}>
          <ShieldCheck size={16} />
          <span>Private Patient Data Isolation Active</span>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <Loader message="Synchronizing health data..." />
      ) : (
        <>
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
                AI Health Assistant
              </h3>
              <span className="badge" style={{ backgroundColor: '#ffffff', color: '#4338ca', fontSize: '0.72rem' }}>
                RAG Enabled
              </span>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1rem', maxWidth: '750px' }}>
              Ask questions directly about your uploaded blood reports, test results, doctor instructions, and medications.
            </p>

            <form onSubmit={handleAskAI} style={{ display: 'flex', gap: '0.75rem', maxWidth: '750px' }}>
              <input
                id="dashboard-ai-input"
                type="text"
                className="form-input"
                placeholder="e.g. 'What was my cholesterol level in the latest blood report?' or 'When is my next appointment?'"
                value={quickQuestion}
                onChange={(e) => setQuickQuestion(e.target.value)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)'
                }}
              />
              <button
                type="submit"
                className="btn btn-accent"
                style={{ flexShrink: 0 }}
              >
                Ask <ArrowRight size={16} />
              </button>
            </form>
          </div>

          {/* Grid Layout: Recent Documents & Upcoming Appointments */}
          <div className="grid-2" style={{ marginBottom: '2rem' }}>
            <RecentDocuments documents={data?.recentDocuments} />
            <UpcomingAppointments appointments={data?.upcomingAppointments} />
          </div>

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
