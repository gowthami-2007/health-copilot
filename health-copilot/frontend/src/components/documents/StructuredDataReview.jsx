import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Edit3, Save, ShieldCheck, Download, Code, Check } from 'lucide-react';
import Button from '../common/Button';
import documentService from '../../services/documentService';

const StructuredDataReview = ({ document, onUpdateSuccess }) => {
  const structuredData = document?.structuredData || {};
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(structuredData);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [showFhirModal, setShowFhirModal] = useState(false);
  const [fhirJson, setFhirJson] = useState(null);
  const [loadingFhir, setLoadingFhir] = useState(false);

  const labResults = formData.labResults || [];
  const prescriptions = formData.prescriptions || [];

  const handleLabChange = (index, field, value) => {
    const updated = [...labResults];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, labResults: updated }));
  };

  const handleSaveAndVerify = async () => {
    try {
      setIsSaving(true);
      setFeedbackMsg(null);
      const res = await documentService.updateStructuredData(document._id, formData, 'VERIFIED');
      setFeedbackMsg('Clinical data verified and saved to your health profile!');
      setIsEditing(false);
      if (onUpdateSuccess) onUpdateSuccess(res.data);
    } catch (err) {
      alert(err.message || 'Failed to save verified data');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadFhir = async () => {
    try {
      setLoadingFhir(true);
      setShowFhirModal(true);
      const res = await documentService.getFhirBundle(document._id);
      setFhirJson(res.data);
    } catch (err) {
      alert(err.message || 'Failed to generate FHIR Bundle');
    } finally {
      setLoadingFhir(false);
    }
  };

  const isReviewRequired = structuredData.reviewStatus === 'REVIEW_REQUIRED';
  const isVerified = structuredData.reviewStatus === 'VERIFIED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Review Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1rem 1.25rem',
          backgroundColor: isVerified ? '#ecfdf5' : isReviewRequired ? '#fffbeb' : '#f8fafc',
          border: `1px solid ${isVerified ? '#a7f3d0' : isReviewRequired ? '#fde68a' : '#e2e8f0'}`,
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isVerified ? (
            <ShieldCheck size={24} color="#059669" />
          ) : (
            <AlertTriangle size={24} color={isReviewRequired ? '#d97706' : 'var(--primary)'} />
          )}
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', color: isVerified ? '#065f46' : isReviewRequired ? '#92400e' : 'var(--text-main)' }}>
              {isVerified ? 'Clinically Verified Record' : isReviewRequired ? 'Verification & Review Recommended' : 'Auto-Extracted Medical Information'}
            </h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: isVerified ? '#047857' : 'var(--text-muted)' }}>
              {isVerified
                ? 'This record was reviewed and confirmed by you. Information is synced with your Health Profile.'
                : 'Review extracted values against the original document before confirming.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button variant="secondary" size="sm" onClick={handleLoadFhir} icon={Code}>
            View FHIR R4 Bundle
          </Button>

          {!isEditing ? (
            <Button variant="primary" size="sm" onClick={() => setIsEditing(true)} icon={Edit3}>
              Edit & Verify
            </Button>
          ) : (
            <Button variant="accent" size="sm" onClick={handleSaveAndVerify} isLoading={isSaving} icon={Save}>
              Confirm & Save
            </Button>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)', color: '#065f46', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Common Metadata Details */}
      <div className="card">
        <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
          Clinical Metadata
        </h4>
        <div className="grid-3" style={{ gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-subtle)' }}>Patient Name</label>
            {isEditing ? (
              <input
                type="text"
                className="form-input"
                value={formData.patientName || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, patientName: e.target.value }))}
                placeholder="Enter patient name"
                style={{ marginTop: '0.25rem' }}
              />
            ) : (
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {formData.patientName || 'Unknown / Not stated'}
              </p>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-subtle)' }}>Healthcare Provider / Facility</label>
            {isEditing ? (
              <input
                type="text"
                className="form-input"
                value={formData.healthcareProvider || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, healthcareProvider: e.target.value }))}
                placeholder="Enter lab or doctor name"
                style={{ marginTop: '0.25rem' }}
              />
            ) : (
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {formData.healthcareProvider || 'Not specified'}
              </p>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-subtle)' }}>Confidence Score</label>
            <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>
              {Math.round((formData.confidenceScore || 0.9) * 100)}% Match Confidence
            </p>
          </div>
        </div>
      </div>

      {/* Laboratory Results Table */}
      {labResults.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>
              Extracted Laboratory Results ({labResults.length})
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
              Source: Reporting Laboratory Reference Intervals
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Test Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Result Value</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Unit</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Reference Range</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {labResults.map((item, idx) => {
                  const isHigh = item.abnormalFlag === 'HIGH';
                  const isLow = item.abnormalFlag === 'LOW';
                  const isAbnormal = item.abnormalFlag && item.abnormalFlag !== 'NORMAL';

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isAbnormal ? '#fff1f2' : 'transparent' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-input"
                            value={item.testName}
                            onChange={(e) => handleLabChange(idx, 'testName', e.target.value)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                          />
                        ) : (
                          item.testName
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: isAbnormal ? '#be123c' : 'var(--text-main)' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-input"
                            value={item.result}
                            onChange={(e) => handleLabChange(idx, 'result', e.target.value)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', width: '90px' }}
                          />
                        ) : (
                          item.result
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                        {item.unit || '-'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                        {item.referenceRange || 'Lab range unavailable'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isAbnormal ? (
                          <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>
                            {item.abnormalFlag}
                          </span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                            NORMAL
                          </span>
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

      {/* Prescriptions Table */}
      {prescriptions.length > 0 && (
        <div className="card">
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: 'var(--text-main)' }}>
            Documented Prescription Medications ({prescriptions.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {prescriptions.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div>
                  <h5 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    {p.medicationName} {p.dosage}
                  </h5>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Frequency: {p.frequency || 'As directed'} • Duration: {p.duration || '30 days'}
                  </p>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                  Documented in Rx
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Appointments & Consultations */}
      {((structuredData.consultations && structuredData.consultations.length > 0) ||
        (structuredData.appointments && structuredData.appointments.length > 0)) && (
        <div className="card" style={{ border: '1px solid #c7d2fe', backgroundColor: '#faf5ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Synced Visits & Consultations
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a href="/appointments" className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
                Appointments Page
              </a>
              <a href="/consultations" className="btn btn-primary btn-sm" style={{ fontSize: '0.78rem' }}>
                Consultations Page
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(structuredData.consultations || []).map((con, idx) => (
              <div key={`con-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid #e9d5ff' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-full)', backgroundColor: '#ede9fe', color: '#6d28d9' }}>
                      CONSULTATION
                    </span>
                    <h5 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700 }}>
                      {con.doctorName}
                    </h5>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Specialty: {con.specialty} • Date: {con.date ? new Date(con.date).toLocaleDateString() : 'Recorded'} • Time: {con.time}
                  </p>
                  {con.notes && (
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
                      Notes: {con.notes}
                    </p>
                  )}
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                  Synced
                </span>
              </div>
            ))}

            {(structuredData.appointments || []).map((apt, idx) => (
              <div key={`apt-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid #bae6fd' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-full)', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                      FOLLOW-UP APPOINTMENT
                    </span>
                    <h5 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700 }}>
                      {apt.doctorName}
                    </h5>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Specialty: {apt.specialty} • Date: {apt.date ? new Date(apt.date).toLocaleDateString() : 'Upcoming'} • Time: {apt.time}
                  </p>
                  {apt.notes && (
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
                      Notes: {apt.notes}
                    </p>
                  )}
                </div>
                <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                  Scheduled
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FHIR Modal Preview */}
      {showFhirModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem' }} onClick={() => setShowFhirModal(false)}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '750px', maxHeight: '85vh', overflowY: 'auto', backgroundColor: '#ffffff' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>
                  HL7 FHIR R4 Bundle Specification
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                  ABDM/ABHA Interoperability Standard: DiagnosticReport & Observations
                </span>
              </div>
              <button type="button" onClick={() => setShowFhirModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {loadingFhir ? (
              <p style={{ textAlign: 'center', padding: '2rem' }}>Generating official FHIR R4 resource mapping...</p>
            ) : (
              <pre style={{ backgroundColor: '#0f172a', color: '#38bdf8', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', overflowX: 'auto', maxHeight: '500px' }}>
                {JSON.stringify(fhirJson, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StructuredDataReview;
