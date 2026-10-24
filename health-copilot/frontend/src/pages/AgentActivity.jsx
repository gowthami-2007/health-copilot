import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Bot,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  HelpCircle,
  History,
} from 'lucide-react';
import Layout from '../components/common/Layout';
import useProfile from '../hooks/useProfile';
import agentService from '../services/agentService';

const AgentActivity = () => {
  const { activeProfile } = useProfile();
  const [actions, setActions] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const fetchActions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await agentService.getActions(null, activeProfile?._id || null);
      setActions(res?.data?.data?.actions || res?.data?.actions || []);
    } catch (err) {
      console.error('Failed to load agent actions:', err);
      setError(err.response?.data?.message || 'Unable to load agent activity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, [activeProfile?._id]);

  const handleScan = async () => {
    try {
      setScanning(true);
      const res = await agentService.scanActions(activeProfile?._id || null);
      await fetchActions();
      const count = res?.data?.data?.actions?.length || res?.data?.newActionsCount || 0;
      alert(`Agent scan complete! Found ${count} proactive action proposal(s).`);
    } catch (err) {
      alert('Agent scan failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setScanning(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setProcessingId(id);
      await agentService.approveAction(id);
      await fetchActions();
    } catch (err) {
      alert('Failed to approve action: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Optional rejection reason (or leave blank):');
    try {
      setProcessingId(id);
      await agentService.rejectAction(id, reason || 'Rejected by user');
      await fetchActions();
    } catch (err) {
      alert('Failed to reject action: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const pendingActions = actions.filter((a) => a.status === 'PENDING_APPROVAL' || a.status === 'PROPOSED');
  const historyActions = actions.filter((a) => a.status !== 'PENDING_APPROVAL' && a.status !== 'PROPOSED');

  return (
    <Layout pageTitle="Proactive Agent Automations & Audit Trail">
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Agent Overview Banner */}
        <div style={{
          backgroundColor: '#312e81',
          color: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 20px rgba(49, 46, 129, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <Cpu size={26} color="#c7d2fe" />
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                Proactive Healthcare Agent
              </div>
              <div style={{ fontSize: '0.85rem', color: '#c7d2fe', marginTop: '0.2rem' }}>
                Monitors records for {activeProfile?.name || 'patient'}, proposes medication schedules, detects overdue care, and enforces human-in-the-loop approvals.
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={scanning}
            onClick={handleScan}
            className="btn btn-sm"
            style={{
              backgroundColor: '#6366f1',
              color: '#ffffff',
              border: '1px solid #818cf8',
              fontWeight: 700,
              gap: '0.5rem',
              padding: '0.6rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)'
            }}
          >
            <Play size={15} className={scanning ? 'animate-spin' : ''} />
            <span>{scanning ? 'Running Agent Scan...' : 'Run Proactive Scan'}</span>
          </button>
        </div>

        {/* Human-in-the-loop Safety Architecture Notice */}
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.82rem',
          color: '#1e3a8a'
        }}>
          <ShieldCheck size={20} color="#2563eb" style={{ flexShrink: 0 }} />
          <div>
            <strong>Strict Human-in-the-Loop Guardrail:</strong> The autonomous agent will NEVER execute clinical actions or modify schedules without your explicit review and approval. Every proposed action is fully recorded in the audit trail.
          </div>
        </div>

        {/* Pending Actions (Human Review Required) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Pending Action Proposals</span>
              <span style={{
                fontSize: '0.75rem',
                padding: '0.15rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: pendingActions.length > 0 ? '#fef3c7' : '#f1f5f9',
                color: pendingActions.length > 0 ? '#b45309' : 'var(--text-muted)',
                fontWeight: 700
              }}>
                {pendingActions.length} Pending
              </span>
            </h3>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="animate-spin" />
              <p>Scanning agent event queue...</p>
            </div>
          ) : pendingActions.length === 0 ? (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-light)',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              <CheckCircle2 size={36} color="#10b981" style={{ marginBottom: '0.5rem' }} />
              <h4 style={{ margin: 0, color: 'var(--text-main)' }}>No Pending Agent Approvals</h4>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                All detected records have been processed or approved. Click "Run Proactive Scan" to check for new document events.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingActions.map((action) => (
                <div
                  key={action._id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid #fde68a',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    borderLeft: '5px solid #f59e0b'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.6rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: '#fef3c7',
                        color: '#b45309',
                        textTransform: 'uppercase'
                      }}>
                        {action.triggerEvent?.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Detected: {action.createdAt ? new Date(action.createdAt).toLocaleString() : 'Just now'}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309' }}>
                      Requires Human Approval
                    </span>
                  </div>

                  {/* Proposal & Rationale */}
                  <div>
                    <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {action.proposal?.title || action.actionType?.replace(/_/g, ' ')}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                      {action.proposal?.description || JSON.stringify(action.proposal)}
                    </p>
                  </div>

                  {/* Rationale Callout */}
                  <div style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#f8fafc',
                    border: '1px solid var(--border-light)',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)'
                  }}>
                    <strong style={{ color: 'var(--text-main)' }}>Agent Reasoning: </strong>
                    {action.rationale}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      disabled={processingId === action._id}
                      onClick={() => handleReject(action._id)}
                      className="btn btn-outline btn-sm"
                      style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                    >
                      <XCircle size={15} />
                      <span>Reject Proposal</span>
                    </button>
                    <button
                      type="button"
                      disabled={processingId === action._id}
                      onClick={() => handleApprove(action._id)}
                      className="btn btn-primary btn-sm"
                      style={{ gap: '0.4rem', backgroundColor: '#16a34a', borderColor: '#15803d' }}
                    >
                      <CheckCircle2 size={15} />
                      <span>{processingId === action._id ? 'Executing...' : 'Approve & Execute'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Autonomous Execution Audit Trail */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} color="var(--primary)" />
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Execution Audit Trail & Immutable Log
            </h4>
          </div>

          {historyActions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No past executions recorded in the audit trail yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: '#fcfcfc', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Timestamp</th>
                    <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Trigger Event</th>
                    <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Action Title</th>
                    <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {historyActions.map((item) => (
                    <tr key={item._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {item.triggerEvent?.replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 500 }}>
                        {item.proposal?.title || item.actionType}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <span style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: item.status === 'EXECUTED' || item.status === 'APPROVED' ? '#ecfdf5' : '#fef2f2',
                          color: item.status === 'EXECUTED' || item.status === 'APPROVED' ? '#059669' : '#dc2626'
                        }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {item.executionResult?.message || item.rejectionReason || 'Completed successfully'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AgentActivity;
