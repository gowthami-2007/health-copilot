import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileImage,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Pill,
  Save,
  Plus,
  Trash2,
  ShieldAlert,
  User,
  Building,
  Calendar,
  Stethoscope,
  Info,
  Check,
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import ErrorMessage from '../common/ErrorMessage';
import documentService from '../../services/documentService';
import useLanguage from '../../hooks/useLanguage';

const PrescriptionExtractorModal = ({ isOpen, onClose, onSaveSuccess }) => {
  const { t, isTelugu } = useLanguage();

  // Workflow state: 'upload' | 'analyzing' | 'review' | 'saving' | 'saved'
  const [phase, setPhase] = useState('upload');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Extracted and editable structured data
  const [extractedData, setExtractedData] = useState(null);
  const [userConfirmedReview, setUserConfirmedReview] = useState(false);

  // Image viewer zoom & rotation
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  const fileInputRef = useRef(null);

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset state when modal is opened/closed
  useEffect(() => {
    if (!isOpen) {
      setPhase('upload');
      setSelectedFile(null);
      setPreviewUrl(null);
      setErrorMsg('');
      setExtractedData(null);
      setUserConfirmedReview(false);
      setZoomLevel(1);
      setRotation(0);
    }
  }, [isOpen]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file) => {
    setErrorMsg('');
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg(
        isTelugu
          ? 'దయచేసి ప్రిస్క్రిప్షన్ చిత్రాన్ని మాత్రమే అప్‌లోడ్ చేయండి (JPG, PNG, లేదా WEBP). PDF పత్రాలకు నేరుగా విజన్ విశ్లేషణ అందుబాటులో లేదు.'
          : 'Invalid file format. Please upload a prescription image (.jpg, .png, or .webp). PDF files cannot be analyzed directly with the vision model.'
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg(
        isTelugu
          ? 'చిత్రం పరిమాణం 10MB కంటే తక్కువగా ఉండాలి.'
          : 'Image size exceeds the 10MB limit. Please upload a clearer, smaller image.'
      );
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMsg(isTelugu ? 'దయచేసి ప్రిస్క్రిప్షన్ చిత్రాన్ని ఎంచుకోండి.' : 'Please select an image file first.');
      return;
    }

    try {
      setPhase('analyzing');
      setErrorMsg('');
      setUploadProgress(0);

      const response = await documentService.analyzePrescription(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      if (response?.data) {
        setExtractedData(response.data);
        setPhase('review');
      } else {
        throw new Error('Analysis completed but returned empty prescription data.');
      }
    } catch (err) {
      console.error('Prescription vision analysis error:', err);
      setPhase('upload');
      setErrorMsg(err.message || 'Failed to analyze prescription image. Please try again.');
    }
  };

  // Medicine edits
  const handleMedicineChange = (index, field, value) => {
    if (!extractedData) return;
    const updatedMeds = [...(extractedData.medicines || [])];
    updatedMeds[index] = { ...updatedMeds[index], [field]: value };
    setExtractedData({ ...extractedData, medicines: updatedMeds });
  };

  const handleAddMedicine = () => {
    if (!extractedData) return;
    const newMed = {
      id: `manual-med-${Date.now()}`,
      nameAsWritten: 'New Medicine',
      normalizedName: '',
      strength: '',
      dosageInstructions: '',
      frequency: 'Once daily (OD)',
      route: 'Oral',
      duration: '',
      additionalInstructions: '',
      confidence: 'high',
      requiresReview: false,
      uncertaintyNotes: [],
    };
    setExtractedData({
      ...extractedData,
      medicines: [...(extractedData.medicines || []), newMed],
    });
  };

  const handleDeleteMedicine = (index) => {
    if (!extractedData) return;
    const updatedMeds = (extractedData.medicines || []).filter((_, i) => i !== index);
    setExtractedData({ ...extractedData, medicines: updatedMeds });
  };

  // Header / patient edits
  const handleDoctorChange = (field, value) => {
    setExtractedData((prev) => ({
      ...prev,
      doctor: { ...(prev.doctor || {}), [field]: value },
    }));
  };

  const handleHospitalChange = (field, value) => {
    setExtractedData((prev) => ({
      ...prev,
      hospital: { ...(prev.hospital || {}), [field]: value },
    }));
  };

  const handlePatientChange = (field, value) => {
    setExtractedData((prev) => ({
      ...prev,
      patient: { ...(prev.patient || {}), [field]: value },
    }));
  };

  // Save confirmed prescription to vault
  const handleSaveConfirmed = async () => {
    if (!selectedFile || !extractedData) return;

    try {
      setPhase('saving');
      setErrorMsg('');

      const res = await documentService.saveReviewedPrescription(selectedFile, extractedData);

      setPhase('saved');
      setTimeout(() => {
        if (onSaveSuccess) {
          onSaveSuccess(res.data);
        }
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to save reviewed prescription:', err);
      setPhase('review');
      setErrorMsg(err.message || 'Failed to save confirmed prescription to medical records.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        phase === 'review' || phase === 'saving' || phase === 'saved'
          ? (isTelugu ? 'ప్రిస్క్రిప్షన్ సమీక్ష & ధృవీకరణ' : 'Review & Verify AI Prescription Extraction')
          : (isTelugu ? 'AI ప్రిస్క్రిప్షన్ రీడర్ (చేతిరాత & ముద్రిత)' : 'AI Prescription Reader (Handwritten & Printed Vision)')
      }
      maxWidth={phase === 'review' || phase === 'saving' || phase === 'saved' ? '1280px' : '620px'}
    >
      <ErrorMessage message={errorMsg} onDismiss={() => setErrorMsg('')} />

      {/* PHASE 1: UPLOAD & PREVIEW */}
      {(phase === 'upload' || phase === 'analyzing') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Informational Guidance Alert */}
          <div
            style={{
              padding: '0.9rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#f0fdfa',
              border: '1px solid #99f6e4',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
            }}
          >
            <Sparkles size={20} color="#0d9488" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.875rem', color: '#134e4a', lineHeight: 1.5 }}>
              <strong>{isTelugu ? 'మల్టీమోడల్ AI విజన్ ప్రాసెసింగ్:' : 'Multimodal AI Vision Engine:'}</strong>{' '}
              {isTelugu
                ? 'ఈ వ్యవస్థ మీ ప్రిస్క్రిప్షన్ చిత్రాన్ని నేరుగా చదువుతుంది. ఇది డాక్టర్ చేతిరాత, Rx సూచనలు, మోతాదులు మరియు క్లినిక్ వివరాలను సురక్షితంగా గుర్తిస్తుంది.'
                : "Unlike basic OCR that scrambles cursive handwriting, our multimodal vision model analyzes strokes, medical letterheads, and clinical abbreviations directly from the photo."}
            </div>
          </div>

          {/* Drag & Drop Zone */}
          {!selectedFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-color, #cbd5e1)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: dragActive ? 'rgba(59, 130, 246, 0.05)' : '#fafafa',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  color: 'var(--primary, #0284c7)',
                }}
              >
                <UploadCloud size={28} />
              </div>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', fontWeight: 600 }}>
                {isTelugu ? 'ప్రిస్క్రిప్షన్ ఫోటోను ఇక్కడ లాగి వదలండి' : 'Upload or Drag & Drop Prescription Image'}
              </h4>
              <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '0.85rem' }}>
                Supports JPEG, PNG, WEBP up to 10MB
              </p>
            </div>
          ) : (
            <div
              style={{
                border: '1px solid var(--border-light, #e2e8f0)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                backgroundColor: '#ffffff',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileImage size={20} color="var(--primary)" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedFile.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
                {phase !== 'analyzing' && (
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                    }}
                  >
                    {isTelugu ? 'మార్చు' : 'Change Image'}
                  </button>
                )}
              </div>

              {/* Image Preview Box */}
              {previewUrl && (
                <div
                  style={{
                    maxHeight: '260px',
                    overflow: 'hidden',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="Prescription Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '260px',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Analyzing Progress State */}
          {phase === 'analyzing' && (
            <div style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem', width: '2.5rem', height: '2.5rem' }} />
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', color: 'var(--primary)' }}>
                {isTelugu ? 'ప్రిస్క్రిప్షన్ చేతిరాతను AI విశ్లేషిస్తోంది...' : 'Multimodal Vision Reading Prescription...'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                Interpreting medical handwriting, extracting medication names, strengths, and dosage frequencies...
              </p>
            </div>
          )}

          {/* Action Footer */}
          {phase !== 'analyzing' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="outline" onClick={onClose}>
                {isTelugu ? 'రద్దు చేయి' : 'Cancel'}
              </Button>
              <Button
                id="start-prescription-analysis-btn"
                variant="primary"
                onClick={handleAnalyze}
                disabled={!selectedFile}
                icon={Sparkles}
              >
                {isTelugu ? 'AI తో విశ్లేషించండి' : 'Analyze Prescription with Vision AI'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* PHASE 2: INTERACTIVE REVIEW & VERIFICATION */}
      {(phase === 'review' || phase === 'saving' || phase === 'saved') && extractedData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Medical Safety Disclaimer Alert Banner */}
          <div
            style={{
              padding: '0.85rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <ShieldAlert size={22} color="#d97706" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.85rem', color: '#92400e', lineHeight: 1.45 }}>
              <strong>{isTelugu ? 'వైద్యపరమైన ముఖ్య గమనిక:' : 'Mandatory Clinical Safety Notice:'}</strong>{' '}
              {isTelugu
                ? 'AI ద్వారా సంగ్రహించబడిన సమాచారం ధృవీకరించబడిన ప్రిస్క్రిప్షన్ కాదు. అసలు ప్రిస్క్రిప్షన్ చిత్రంతో ప్రతి మందు పేరు మరియు మోతాదును తప్పనిసరిగా సరిచూసుకోండి.'
                : 'AI-extracted data is not a verified medical prescription. Cross-check all medicines, strengths, and directions against the original document before saving.'}
            </div>
          </div>

          {/* Main Inspection Grid (Side-by-Side: Original Image on Left, Structured Data on Right) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(320px, 1fr) minmax(420px, 1.4fr)',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            {/* LEFT COLUMN: Original Prescription Image Inspector */}
            <div
              style={{
                border: '1px solid var(--border-light, #e2e8f0)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#ffffff',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Toolbar */}
              <div
                style={{
                  padding: '0.65rem 1rem',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid var(--border-light, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main, #1e293b)' }}>
                  {isTelugu ? 'అసలు ప్రిస్క్రిప్షన్ చిత్రం' : 'Original Prescription Image'}
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    title="Zoom In"
                    onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <ZoomIn size={15} />
                  </button>
                  <button
                    title="Zoom Out"
                    onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <ZoomOut size={15} />
                  </button>
                  <button
                    title="Rotate"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCw size={15} />
                  </button>
                  <button
                    title="Reset"
                    onClick={() => {
                      setZoomLevel(1);
                      setRotation(0);
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>
              </div>

              {/* Zoomable Image Container */}
              <div
                style={{
                  height: '560px',
                  backgroundColor: '#0f172a',
                  overflow: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                }}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Prescription Original"
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.15s ease',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No image preview available</div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Extracted Structured Clinical Details */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                maxHeight: '620px',
                overflowY: 'auto',
                paddingRight: '0.5rem',
              }}
            >
              {/* Doctor & Facility Card */}
              <div
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border-light, #e2e8f0)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Stethoscope size={18} color="var(--primary)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {isTelugu ? 'వైద్యుడు & ఆసుపత్రి వివరాలు' : 'Physician & Hospital Details'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {isTelugu ? 'డాక్టర్ పేరు' : "Doctor's Name"}
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      value={extractedData.doctor?.name || ''}
                      onChange={(e) => handleDoctorChange('name', e.target.value)}
                      placeholder="e.g. Dr. R. K. Sharma"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {isTelugu ? 'స్పెషాలిటీ / రిజిస్ట్రేషన్ నంబర్' : 'Specialization / Reg. No.'}
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      value={extractedData.doctor?.regNumber || extractedData.doctor?.department || ''}
                      onChange={(e) => handleDoctorChange('regNumber', e.target.value)}
                      placeholder="e.g. MCI-54921 / Cardiology"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {isTelugu ? 'ఆసుపత్రి / క్లినిక్ పేరు' : 'Clinic / Hospital Name'}
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      value={extractedData.hospital?.name || ''}
                      onChange={(e) => handleHospitalChange('name', e.target.value)}
                      placeholder="e.g. Apollo Clinic"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {isTelugu ? 'ప్రిస్క్రిప్షన్ తేదీ' : 'Prescription Date'}
                    </label>
                    <input
                      type="date"
                      className="input"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      value={extractedData.prescriptionDate || ''}
                      onChange={(e) => setExtractedData({ ...extractedData, prescriptionDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Patient Card */}
              <div
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border-light, #e2e8f0)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <User size={18} color="var(--primary)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {isTelugu ? 'రోగి సమాచారం' : 'Patient Information'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {isTelugu ? 'రోగి పేరు' : 'Patient Name'}
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      value={extractedData.patient?.name || ''}
                      onChange={(e) => handlePatientChange('name', e.target.value)}
                      placeholder="Patient Name"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {isTelugu ? 'వయస్సు' : 'Age'}
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      value={extractedData.patient?.age || ''}
                      onChange={(e) => handlePatientChange('age', e.target.value)}
                      placeholder="e.g. 45"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {isTelugu ? 'లింగం' : 'Sex'}
                    </label>
                    <select
                      className="input"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      value={extractedData.patient?.sex || ''}
                      onChange={(e) => handlePatientChange('sex', e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* MEDICATIONS LIST */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Pill size={18} color="var(--primary)" />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {isTelugu ? 'గుర్తించబడిన మందులు' : 'Identified Medications'} ({extractedData.medicines?.length || 0})
                    </span>
                  </div>
                  <button
                    onClick={handleAddMedicine}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'none',
                      border: '1px solid var(--primary)',
                      color: 'var(--primary)',
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={14} /> {isTelugu ? 'మందును జోడించు' : 'Add Medication'}
                  </button>
                </div>

                {(!extractedData.medicines || extractedData.medicines.length === 0) ? (
                  <div
                    style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                    }}
                  >
                    No medications were identified. Click "Add Medication" to manually enter items from the prescription.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {extractedData.medicines.map((med, idx) => {
                      const isUncertain = med.requiresReview || med.confidence === 'low';
                      return (
                        <div
                          key={med.id || idx}
                          style={{
                            border: `1.5px solid ${isUncertain ? '#f59e0b' : '#e2e8f0'}`,
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: isUncertain ? '#fffdf7' : '#ffffff',
                            padding: '1rem',
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        >
                          {/* Medication Header */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '0.65rem',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  backgroundColor: isUncertain ? '#fef3c7' : '#e0f2fe',
                                  color: isUncertain ? '#b45309' : 'var(--primary)',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {idx + 1}
                              </span>

                              {/* Confidence Badge */}
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '999px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  backgroundColor:
                                    med.confidence === 'high'
                                      ? '#ecfdf5'
                                      : med.confidence === 'medium'
                                      ? '#fefce8'
                                      : '#fef2f2',
                                  color:
                                    med.confidence === 'high'
                                      ? '#047857'
                                      : med.confidence === 'medium'
                                      ? '#a16207'
                                      : '#b91c1c',
                                  border: `1px solid ${
                                    med.confidence === 'high'
                                      ? '#a7f3d0'
                                      : med.confidence === 'medium'
                                      ? '#fde047'
                                      : '#fca5a5'
                                  }`,
                                }}
                              >
                                {med.confidence === 'high' ? (
                                  <Check size={12} />
                                ) : (
                                  <AlertTriangle size={12} />
                                )}
                                {med.confidence === 'high'
                                  ? 'High Confidence'
                                  : med.confidence === 'medium'
                                  ? 'Medium Confidence'
                                  : 'Low Confidence (Unclear Handwriting)'}
                              </span>

                              {isUncertain && (
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '999px',
                                    backgroundColor: '#fff7ed',
                                    color: '#c2410c',
                                    border: '1px solid #ffedd5',
                                  }}
                                >
                                  Requires Review
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleDeleteMedicine(idx)}
                              title="Delete medication"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {/* Verbatim Written Note */}
                          <div
                            style={{
                              backgroundColor: '#f1f5f9',
                              padding: '0.35rem 0.65rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.775rem',
                              color: '#334155',
                              marginBottom: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>Written Text:</span>
                            <span style={{ fontStyle: 'italic' }}>"{med.nameAsWritten || 'Unspecified'}"</span>
                          </div>

                          {/* Uncertainty Notes Alert */}
                          {med.uncertaintyNotes && med.uncertaintyNotes.length > 0 && (
                            <div
                              style={{
                                backgroundColor: '#fef3c7',
                                border: '1px solid #fde68a',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.45rem 0.65rem',
                                fontSize: '0.775rem',
                                color: '#92400e',
                                marginBottom: '0.75rem',
                              }}
                            >
                              <strong>Handwriting Ambiguity:</strong> {med.uncertaintyNotes.join('; ')}
                            </div>
                          )}

                          {/* Editable Fields Grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                Normalized Medicine Name *
                              </label>
                              <input
                                type="text"
                                className="input"
                                style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                                value={med.normalizedName || med.nameAsWritten || ''}
                                onChange={(e) => handleMedicineChange(idx, 'normalizedName', e.target.value)}
                                placeholder="e.g. Paracetamol"
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                Strength / Dosage Concentration
                              </label>
                              <input
                                type="text"
                                className="input"
                                style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                                value={med.strength || ''}
                                onChange={(e) => handleMedicineChange(idx, 'strength', e.target.value)}
                                placeholder="e.g. 500 mg, 625 mg"
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                Dosage Instructions
                              </label>
                              <input
                                type="text"
                                className="input"
                                style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                                value={med.dosageInstructions || ''}
                                onChange={(e) => handleMedicineChange(idx, 'dosageInstructions', e.target.value)}
                                placeholder="e.g. 1 tablet after food"
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                Frequency
                              </label>
                              <input
                                type="text"
                                className="input"
                                style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                                value={med.frequency || ''}
                                onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                                placeholder="e.g. Twice daily (BD)"
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                Duration
                              </label>
                              <input
                                type="text"
                                className="input"
                                style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                                value={med.duration || ''}
                                onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                                placeholder="e.g. 5 days, 1 week"
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.65rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                Route
                              </label>
                              <select
                                className="input"
                                style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                                value={med.route || 'Oral'}
                                onChange={(e) => handleMedicineChange(idx, 'route', e.target.value)}
                              >
                                <option value="Oral">Oral (Tablets/Syrup)</option>
                                <option value="Topical">Topical (Ointment/Cream)</option>
                                <option value="Inhalation">Inhalation (Inhaler/Nebulizer)</option>
                                <option value="Injection">Injection (IV/IM/SubQ)</option>
                                <option value="Ophthalmic">Eye Drops</option>
                                <option value="Otic">Ear Drops</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                Special Instructions
                              </label>
                              <input
                                type="text"
                                className="input"
                                style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                                value={med.additionalInstructions || ''}
                                onChange={(e) => handleMedicineChange(idx, 'additionalInstructions', e.target.value)}
                                placeholder="e.g. Avoid dairy, take with full glass of water"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Clinical Impressions & Diagnoses */}
              <div
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border-light, #e2e8f0)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  {isTelugu ? 'క్లినికల్ రోగ నిర్ధారణ & సూచనలు' : 'Clinical Diagnoses & Follow-up'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Diagnoses (comma separated)
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      value={(extractedData.diagnosis || []).join(', ')}
                      onChange={(e) =>
                        setExtractedData({
                          ...extractedData,
                          diagnosis: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="e.g. Upper Respiratory Infection, Fever"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Recommended Tests / Investigations
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      value={(extractedData.investigations || []).join(', ')}
                      onChange={(e) =>
                        setExtractedData({
                          ...extractedData,
                          investigations: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="e.g. Complete Blood Picture (CBP)"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Follow-up & Return Instructions
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      value={(extractedData.followUpInstructions || []).join(', ')}
                      onChange={(e) =>
                        setExtractedData({
                          ...extractedData,
                          followUpInstructions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="e.g. Review after 5 days if fever persists"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Confirmation Checkbox & Action Buttons */}
          <div
            style={{
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-light, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                id="user-reviewed-prescription-checkbox"
                type="checkbox"
                checked={userConfirmedReview}
                onChange={(e) => setUserConfirmedReview(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                {isTelugu
                  ? 'నేను అసలు ప్రిస్క్రిప్షన్ చిత్రంతో మందుల వివరాలను సరిచూసుకున్నాను మరియు ధృవీకరించాను.'
                  : 'I have personally verified all medication names and instructions against the original prescription photo.'}
              </span>
            </label>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button
                variant="outline"
                onClick={() => {
                  setPhase('upload');
                  setExtractedData(null);
                }}
              >
                {isTelugu ? 'మరొక చిత్రాన్ని అప్‌లోడ్ చేయి' : 'Upload Different Image'}
              </Button>

              <Button
                id="save-confirmed-prescription-btn"
                variant="primary"
                onClick={handleSaveConfirmed}
                disabled={!userConfirmedReview || phase === 'saving' || phase === 'saved'}
                icon={Save}
              >
                {phase === 'saving'
                  ? (isTelugu ? 'భద్రపరుస్తోంది...' : 'Saving to Medical Vault...')
                  : phase === 'saved'
                  ? (isTelugu ? 'భద్రపరచబడింది!' : 'Saved Successfully!')
                  : (isTelugu ? 'ధృవీకరించి వాల్ట్‌లో భద్రపరుచు' : 'Confirm & Save to Health Records')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PrescriptionExtractorModal;
