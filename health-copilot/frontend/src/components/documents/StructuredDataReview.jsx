import React, { useState, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Edit3, Save, ShieldCheck, Code, Plus, Trash2, Pill } from 'lucide-react';
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

  // AI Clinical Pharmacology & Synergy Insight Analyzer
  const clinicalInsights = useMemo(() => {
    if (!Array.isArray(prescriptions) || prescriptions.length === 0) return [];
    const names = prescriptions.map((p) => (p.medicationName || '').toLowerCase());
    const hasIron = names.some((n) => n.includes('feso4') || n.includes('iron') || n.includes('ferrous') || n.includes('fesby'));
    const hasVitC = names.some((n) => n.includes('ascorbic') || n.includes('vitamin c') || n.includes('acad'));
    const hasAntacid = names.some((n) => n.includes('omeprazole') || n.includes('pantoprazole') || n.includes('antacid'));

    const list = [];
    if (hasIron && hasVitC) {
      list.push({
        type: 'synergy',
        title: 'Clinical Synergy Detected (Iron + Vitamin C)',
        text: 'Ascorbic Acid (Vitamin C) significantly increases the bioavailability and gastrointestinal absorption of FeSO4 (Iron) by reducing ferric to soluble ferrous iron. Taking both together accelerates hemoglobin recovery.',
      });
    }
    if (hasIron) {
      list.push({
        type: 'caution',
        title: 'Dietary Interaction Caution (Iron Absorption)',
        text: 'Do not take Ferrous Sulfate with milk, dairy, tea, coffee, or calcium antacids. Calcium and tannins inhibit iron absorption by up to 60%. Space apart by at least 2 hours.',
      });
    }
    if (hasAntacid && hasIron) {
      list.push({
        type: 'caution',
        title: 'Antacid Interaction Notice',
        text: 'Acid-reducing medications elevate gastric pH, decreasing iron dissolution. Separate administration by at least 2 to 4 hours.',
      });
    }
    return list;
  }, [prescriptions]);

  const handleLabChange = (index, field, value) => {
    const updated = [...labResults];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, labResults: updated }));
  };

  const handlePrescriptionChange = (index, field, value) => {
    const updated = [...prescriptions];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, prescriptions: updated }));
  };

  const handleAddPrescription = () => {
    setFormData((prev) => ({
      ...prev,
      prescriptions: [
        ...(prev.prescriptions || []),
        {
          medicationName: '',
          dosage: 'As prescribed',
          frequency: 'Once daily',
          quantity: '# 30',
          route: 'Oral',
          instructions: '',
          isCurrentMedication: true,
          verificationStatus: 'UNVERIFIED',
        },
      ],
    }));
  };

  const handleDeletePrescription = (index) => {
    const updated = prescriptions.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, prescriptions: updated }));
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
                : 'OCR-extracted medication details are unverified draft text. Please review against the original document before confirming.'}
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

      {/* Patient & Provider Metadata Details */}
      <div className="card">
        <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
          Patient & Clinical Details
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
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-subtle)' }}>Age</label>
            {isEditing ? (
              <input
                type="number"
                className="form-input"
                value={formData.patientAge ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, patientAge: e.target.value ? parseInt(e.target.value, 10) : null }))}
                placeholder="Patient age"
                style={{ marginTop: '0.25rem' }}
              />
            ) : (
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {formData.patientAge !== null && formData.patientAge !== undefined ? `${formData.patientAge} years` : 'Not stated'}
              </p>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-subtle)' }}>Sex / Gender</label>
            {isEditing ? (
              <input
                type="text"
                className="form-input"
                value={formData.patientSex || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, patientSex: e.target.value }))}
                placeholder="e.g. Female, Male"
                style={{ marginTop: '0.25rem' }}
              />
            ) : (
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {formData.patientSex || 'Not specified'}
              </p>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-subtle)' }}>Address</label>
            {isEditing ? (
              <input
                type="text"
                className="form-input"
                value={formData.patientAddress || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, patientAddress: e.target.value }))}
                placeholder="Patient residence / address"
                style={{ marginTop: '0.25rem' }}
              />
            ) : (
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {formData.patientAddress || 'Not stated'}
              </p>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-subtle)' }}>Prescription Date</label>
            {isEditing ? (
              <input
                type="date"
                className="form-input"
                value={formData.documentDate ? new Date(formData.documentDate).toISOString().slice(0, 10) : ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, documentDate: e.target.value ? new Date(e.target.value) : null }))}
                style={{ marginTop: '0.25rem' }}
              />
            ) : (
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {formData.documentDate && !isNaN(new Date(formData.documentDate).getTime()) ? new Date(formData.documentDate).toLocaleDateString() : 'Not stated'}
              </p>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-subtle)' }}>Attending Physician / Doctor</label>
            {isEditing ? (
              <input
                type="text"
                className="form-input"
                value={formData.doctorName || formData.healthcareProvider || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, doctorName: e.target.value, healthcareProvider: e.target.value }))}
                placeholder="Doctor name"
                style={{ marginTop: '0.25rem' }}
              />
            ) : (
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {formData.doctorName || formData.healthcareProvider || 'Not specified'}
              </p>
            )}
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-subtle)' }}>Doctor Registration (License / PTR / S2)</label>
            {isEditing ? (
              <input
                type="text"
                className="form-input"
                value={formData.doctorRegistration || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, doctorRegistration: e.target.value }))}
                placeholder="e.g. Lic. No. 12345, PTR No. 1234567"
                style={{ marginTop: '0.25rem' }}
              />
            ) : (
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {formData.doctorRegistration || 'None recorded'}
              </p>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-subtle)' }}>OCR Match Confidence</label>
            <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>
              {Math.round((formData.confidenceScore || 0.9) * 100)}% Confidence
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

      {/* Prescription Medications Section */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Pill size={18} color="var(--primary)" />
              Extracted Prescriptions ({prescriptions.length})
            </h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
              Medical safety notice: OCR medications are treated as unverified text until verified.
            </p>
          </div>
          {isEditing && (
            <Button variant="secondary" size="sm" onClick={handleAddPrescription} icon={Plus}>
              Add Medication
            </Button>
          )}
        </div>

        {/* AI Clinical Synergy & Interaction Insights */}
        {clinicalInsights.length > 0 && (
          <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {clinicalInsights.map((insight, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: insight.type === 'synergy' ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${insight.type === 'synergy' ? '#86efac' : '#fde68a'}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                }}
              >
                {insight.type === 'synergy' ? (
                  <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                )}
                <div>
                  <h5 style={{ margin: '0 0 0.2rem 0', fontSize: '0.85rem', color: insight.type === 'synergy' ? '#14532d' : '#78350f', fontWeight: 700 }}>
                    {insight.title}
                  </h5>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: insight.type === 'synergy' ? '#166534' : '#92400e', lineHeight: 1.45 }}>
                    {insight.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {prescriptions.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No prescription medications identified in this document.
            {isEditing && (
              <div style={{ marginTop: '0.75rem' }}>
                <Button variant="secondary" size="sm" onClick={handleAddPrescription} icon={Plus}>
                  Add Medication Manually
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {prescriptions.map((p, i) => (
              <div
                key={i}
                style={{
                  padding: '1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Medication Name (e.g. FeSO4 tab)"
                        value={p.medicationName || ''}
                        onChange={(e) => handlePrescriptionChange(i, 'medicationName', e.target.value)}
                        style={{ flex: 2, fontWeight: 600 }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Dosage (e.g. 500mg tab)"
                        value={p.dosage || ''}
                        onChange={(e) => handlePrescriptionChange(i, 'dosage', e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePrescription(i)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.4rem 0.6rem' }}
                        title="Remove medication"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Frequency (e.g. Once daily)"
                        value={p.frequency || ''}
                        onChange={(e) => handlePrescriptionChange(i, 'frequency', e.target.value)}
                        style={{ fontSize: '0.8rem' }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Quantity (e.g. # 30)"
                        value={p.quantity || ''}
                        onChange={(e) => handlePrescriptionChange(i, 'quantity', e.target.value)}
                        style={{ fontSize: '0.8rem' }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Route (e.g. Oral)"
                        value={p.route || ''}
                        onChange={(e) => handlePrescriptionChange(i, 'route', e.target.value)}
                        style={{ fontSize: '0.8rem' }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Duration (e.g. 30 days)"
                        value={p.duration || ''}
                        onChange={(e) => handlePrescriptionChange(i, 'duration', e.target.value)}
                        style={{ fontSize: '0.8rem' }}
                      />
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Instructions / Sig (e.g. Sig: Once a day after food)"
                      value={p.instructions || ''}
                      onChange={(e) => handlePrescriptionChange(i, 'instructions', e.target.value)}
                      style={{ fontSize: '0.8rem' }}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h5 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-main)', fontWeight: 700 }}>
                          {p.medicationName || 'Unnamed medication'} {p.dosage ? `— ${p.dosage}` : ''}
                        </h5>
                        <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>
                          {p.verificationStatus || 'UNVERIFIED'}
                        </span>
                      </div>
                      <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                        <strong>Frequency:</strong> {p.frequency || 'As directed'} • <strong>Quantity:</strong> {p.quantity || 'As prescribed'} • <strong>Route:</strong> {p.route || 'Oral'} • <strong>Duration:</strong> {p.duration || '30 days'}
                      </p>
                      {p.instructions && (
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-main)', fontStyle: 'italic' }}>
                          Instructions: {p.instructions}
                        </p>
                      )}
                    </div>
                    <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                      Rx Extract
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
                    Specialty: {con.specialty} • Date: {con.date && !isNaN(new Date(con.date).getTime()) ? new Date(con.date).toLocaleDateString() : 'Recorded'} • Time: {con.time}
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
                    Specialty: {apt.specialty} • Date: {apt.date && !isNaN(new Date(apt.date).getTime()) ? new Date(apt.date).toLocaleDateString() : 'Upcoming'} • Time: {apt.time}
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
          <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '700px', width: '100%', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '1.1rem' }}>HL7 FHIR R4 Bundle</h4>
              <button type="button" onClick={() => setShowFhirModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, backgroundColor: '#0f172a' }}>
              {loadingFhir ? (
                <p style={{ color: '#94a3b8' }}>Generating FHIR R4 representation...</p>
              ) : (
                <pre style={{ margin: 0, color: '#38bdf8', fontSize: '0.8rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(fhirJson, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StructuredDataReview;
