import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  RefreshCw,
  Info,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import Layout from '../components/common/Layout';
import useProfile from '../hooks/useProfile';
import useLanguage from '../hooks/useLanguage';
import trendService from '../services/trendService';

const METRIC_TABS = [
  { key: 'hba1c', label: 'HbA1c', unit: '%', normalMin: 4.0, normalMax: 5.6 },
  { key: 'bloodGlucose', label: 'Fasting Blood Sugar', unit: 'mg/dL', normalMin: 70, normalMax: 99 },
  { key: 'cholesterol', label: 'Total Cholesterol', unit: 'mg/dL', normalMin: 125, normalMax: 200 },
  { key: 'ldl', label: 'LDL Cholesterol', unit: 'mg/dL', normalMin: 50, normalMax: 100 },
  { key: 'hdl', label: 'HDL Cholesterol', unit: 'mg/dL', normalMin: 40, normalMax: 60 },
  { key: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', normalMin: 50, normalMax: 150 },
  { key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL', normalMin: 12.0, normalMax: 17.5 },
  { key: 'creatinine', label: 'Serum Creatinine', unit: 'mg/dL', normalMin: 0.6, normalMax: 1.2 },
];

const HealthTrends = () => {
  const navigate = useNavigate();
  const { activeProfile } = useProfile();
  const { t } = useLanguage();

  const [selectedMetric, setSelectedMetric] = useState('hba1c');
  const [trendsData, setTrendsData] = useState({});
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const profileId = activeProfile?._id || null;
      const [trendRes, insightRes] = await Promise.all([
        trendService.getTrends(profileId),
        trendService.getInsights(profileId),
      ]);
      setTrendsData(trendRes?.data?.data?.trends || trendRes?.data?.trends || {});
      setInsights(insightRes?.data?.data?.insights || insightRes?.data?.insights || []);
    } catch (err) {
      console.error('Failed to load health trends:', err);
      setError(err.response?.data?.message || 'Unable to load health trends. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeProfile?._id]);

  const currentMetricTrend = trendsData[selectedMetric];
  const measurements = currentMetricTrend?.measurements || [];
  const currentTab = METRIC_TABS.find((t) => t.key === selectedMetric);

  // SVG Chart calculation
  const renderChart = () => {
    if (measurements.length < 1) {
      return (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
          <Activity size={38} color="var(--border-light)" style={{ marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 600, margin: '0 0 0.25rem 0' }}>No historical measurements recorded for this test.</p>
          <p style={{ fontSize: '0.85rem' }}>Upload medical lab reports to automatically track longitudinal trends.</p>
        </div>
      );
    }

    const width = 640;
    const height = 240;
    const padding = { top: 25, right: 30, bottom: 40, left: 50 };

    const values = measurements.map((m) => m.value);
    const minVal = Math.min(...values, currentTab.normalMin * 0.9);
    const maxVal = Math.max(...values, currentTab.normalMax * 1.1);
    const valRange = maxVal - minVal || 1;

    const getX = (idx) => {
      if (measurements.length === 1) return width / 2;
      return padding.left + (idx / (measurements.length - 1)) * (width - padding.left - padding.right);
    };

    const getY = (val) => {
      return height - padding.bottom - ((val - minVal) / valRange) * (height - padding.top - padding.bottom);
    };

    const points = measurements.map((m, idx) => `${getX(idx)},${getY(m.value)}`).join(' ');

    // Normal range band
    const normalYTop = getY(Math.min(currentTab.normalMax, maxVal));
    const normalYBottom = getY(Math.max(currentTab.normalMin, minVal));
    const normalBandHeight = Math.max(normalYBottom - normalYTop, 4);

    return (
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Normal Reference Range Background Shading */}
          <rect
            x={padding.left}
            y={normalYTop}
            width={width - padding.left - padding.right}
            height={normalBandHeight}
            fill="#ecfdf5"
            opacity="0.85"
          />
          <text
            x={width - padding.right - 8}
            y={normalYTop + 14}
            textAnchor="end"
            fontSize="10"
            fill="#059669"
            fontWeight="600"
          >
            Reference: {currentTab.normalMin} - {currentTab.normalMax} {currentTab.unit}
          </text>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="var(--border-light)"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="var(--border-light)"
            strokeWidth="1"
          />

          {/* Trend line */}
          {measurements.length > 1 && (
            <polyline
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          )}

          {/* Data Points */}
          {measurements.map((m, idx) => {
            const cx = getX(idx);
            const cy = getY(m.value);
            const isAbnormal = m.value < currentTab.normalMin || m.value > currentTab.normalMax;
            return (
              <g key={idx}>
                <circle
                  cx={cx}
                  cy={cy}
                  r="6"
                  fill={isAbnormal ? '#ef4444' : '#10b981'}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                />
                {/* Value Label */}
                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="var(--text-main)"
                >
                  {m.value} {currentTab.unit}
                </text>
                {/* Date Label */}
                <text
                  x={cx}
                  y={height - padding.bottom + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--text-muted)"
                >
                  {m.date ? new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : 'Report'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <Layout pageTitle="Health Trends & Preventive Insights">
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Patient & Disclaimer Banner */}
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
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
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700
            }}>
              {activeProfile?.name?.charAt(0) || 'P'}
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e3a8a' }}>
                Longitudinal Health Records for {activeProfile?.name || 'Selected Patient'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#1d4ed8' }}>
                {activeProfile?.relationship} • {measurements.length} recorded measurements for current selection
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchData}
            className="btn btn-sm"
            style={{
              gap: '0.4rem',
              backgroundColor: '#ffffff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Trends</span>
          </button>
        </div>

        {/* Metric Selector Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
          borderBottom: '1px solid var(--border-light)'
        }}>
          {METRIC_TABS.map((tab) => {
            const hasData = trendsData[tab.key]?.measurements?.length > 0;
            const isSelected = selectedMetric === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedMetric(tab.key)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  border: isSelected ? '1px solid var(--border-light)' : '1px solid transparent',
                  borderBottom: isSelected ? '2px solid var(--primary)' : 'none',
                  backgroundColor: isSelected ? '#ffffff' : 'transparent',
                  color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                  position: 'relative'
                }}
              >
                <span>{tab.label}</span>
                {hasData && (
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: isSelected ? 'var(--primary-light)' : '#f1f5f9',
                    color: isSelected ? 'var(--primary)' : 'var(--text-subtle)',
                    fontWeight: 700
                  }}>
                    {trendsData[tab.key].measurements.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Trend Visualization & Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: measurements.length > 0 ? '2fr 1fr' : '1fr',
          gap: '1.5rem',
          alignItems: 'start'
        }}>
          {/* Chart Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {currentTab.label} Progression
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Units: {currentTab.unit} • Standard Reference: {currentTab.normalMin} - {currentTab.normalMax} {currentTab.unit}
                </span>
              </div>
              {currentMetricTrend?.direction && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  backgroundColor: currentMetricTrend.direction === 'IMPROVING' || currentMetricTrend.direction === 'STABLE'
                    ? '#ecfdf5' : '#fef2f2',
                  color: currentMetricTrend.direction === 'IMPROVING' || currentMetricTrend.direction === 'STABLE'
                    ? '#059669' : '#dc2626'
                }}>
                  {currentMetricTrend.direction === 'INCREASING' && <TrendingUp size={14} />}
                  {currentMetricTrend.direction === 'DECREASING' && <TrendingDown size={14} />}
                  {currentMetricTrend.direction === 'STABLE' && <Activity size={14} />}
                  <span>{currentMetricTrend.direction}</span>
                </div>
              )}
            </div>

            {renderChart()}
          </div>

          {/* Metric Analysis Summary Card */}
          {measurements.length > 0 && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-light)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Longitudinal Metric Summary
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    First Recorded
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                    {measurements[0]?.value} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{currentTab.unit}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                    {measurements[0]?.date ? new Date(measurements[0].date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Latest Result
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                    {measurements[measurements.length - 1]?.value} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{currentTab.unit}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                    {measurements[measurements.length - 1]?.date ? new Date(measurements[measurements.length - 1].date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Net Change */}
              {measurements.length > 1 && (
                <div style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-light)'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Observed Net Change:
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                    {currentMetricTrend.delta > 0 ? `+${currentMetricTrend.delta}` : currentMetricTrend.delta} {currentTab.unit}
                    {' '}({currentMetricTrend.percentChange > 0 ? `+${currentMetricTrend.percentChange}%` : `${currentMetricTrend.percentChange}%`})
                  </div>
                </div>
              )}

              {/* Plain Language Interpretation */}
              <div style={{ fontSize: '0.82rem', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                {currentMetricTrend?.interpretation || 'Regular longitudinal tracking provides important context for your physician.'}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Measurement History Table */}
        {measurements.length > 0 && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-main)' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Documented Laboratory Results History
              </h4>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: '#fcfcfc', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Test Date</th>
                    <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Measured Value</th>
                    <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Reference Range</th>
                    <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Classification</th>
                    <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Source Document</th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((m, idx) => {
                    const isAbove = m.value > currentTab.normalMax;
                    const isBelow = m.value < currentTab.normalMin;
                    const isNormal = !isAbove && !isBelow;

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {m.date ? new Date(m.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown Date'}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700 }}>
                          {m.value} {currentTab.unit}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)' }}>
                          {m.referenceRange || `${currentTab.normalMin} - ${currentTab.normalMax} ${currentTab.unit}`}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem' }}>
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: isNormal ? '#ecfdf5' : '#fef2f2',
                            color: isNormal ? '#059669' : '#dc2626',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            {isNormal ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                            {isNormal ? 'Normal Range' : isAbove ? 'Above Reference' : 'Below Reference'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem' }}>
                          {m.documentId ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/documents/${m.documentId}`)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.82rem'
                              }}
                            >
                              <FileText size={14} />
                              <span>{m.documentName || 'View Lab Report'}</span>
                              <ExternalLink size={12} />
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-subtle)' }}>Direct Entry</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Preventive Health Insights & Clinical Opportunities */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Activity size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Preventive Next Steps & Discussion Points
            </h3>
          </div>

          {insights.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '0.5rem' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No urgent preventive alerts flagged for {activeProfile?.name}.</p>
              <p style={{ fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>All available reports are currently within normal baseline ranges.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {insights.map((ins, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: ins.urgency === 'HIGH' ? '#fff1f2' : '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: ins.urgency === 'HIGH' ? '#fecdd3' : '#e2e8f0',
                      color: ins.urgency === 'HIGH' ? '#9f1239' : '#334155',
                      textTransform: 'uppercase'
                    }}>
                      {ins.category || 'PREVENTIVE INSIGHT'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                      {ins.date ? new Date(ins.date).toLocaleDateString() : ''}
                    </span>
                  </div>

                  <h5 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {ins.title}
                  </h5>

                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {ins.explanation}
                  </p>

                  <div style={{
                    marginTop: 'auto',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    fontSize: '0.78rem',
                    color: 'var(--primary)',
                    fontWeight: 600
                  }}>
                    💡 Discussion Point: {ins.recommendedDiscussion || 'Discuss these results at your next routine checkup.'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default HealthTrends;
