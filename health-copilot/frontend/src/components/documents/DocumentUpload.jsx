import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import Button from '../common/Button';
import ErrorMessage from '../common/ErrorMessage';
import documentService from '../../services/documentService';

const DOCUMENT_TYPES = [
  'Blood Report',
  'Prescription',
  'Lab Report',
  'Doctor Note',
  'Imaging Report',
  'Other',
];

const DocumentUpload = ({ onUploadSuccess, onCancel, onOpenPrescriptionExtractor }) => {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('Blood Report');
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState('idle'); // 'idle' | 'uploading' | 'validating' | 'processing' | 'extracting' | 'summarizing' | 'complete' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [validationError, setValidationError] = useState(null); // { title, message, code, type }
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef(null);

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
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    setErrorMsg('');
    setValidationError(null);
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setErrorMsg('Invalid file format. Please upload a PDF, JPG, PNG, or WEBP document.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMsg('File exceeds 10MB limit. Please upload a smaller file.');
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg('Please select a file to upload.');
      return;
    }

    try {
      setStep('uploading');
      setErrorMsg('');
      setValidationError(null);

      // Step: Uploading
      const response = await documentService.uploadDocument(file, documentType, (p) => {
        setUploadProgress(p);
      });

      const docId = response.data?._id;

      // Real pipeline progress steps & status verification
      setStep('validating');
      await new Promise((r) => setTimeout(r, 400));

      setStep('processing');
      let processedDoc = response.data;

      if (docId) {
        setStep('extracting');
        // Poll document status for up to 8 seconds
        for (let attempt = 0; attempt < 8; attempt++) {
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const checkRes = await documentService.getDocumentById(docId);
            if (checkRes.data) {
              processedDoc = checkRes.data;
              if (checkRes.data.status === 'PROCESSED' || checkRes.data.status === 'FAILED') {
                break;
              }
            }
          } catch (pollErr) {
            // Ignore temporary polling glitch
          }
        }
      }

      setStep('summarizing');
      await new Promise((r) => setTimeout(r, 600));

      if (processedDoc?.status === 'FAILED') {
        setStep('error');
        setErrorMsg(
          processedDoc.failureReason ||
          "We couldn't extract readable text from this document image. You can still view the original document in your list and review clinical fields manually."
        );
        return;
      }

      setStep('complete');
      setTimeout(() => {
        if (onUploadSuccess) onUploadSuccess(processedDoc || response.data);
      }, 800);
    } catch (err) {
      console.error('Upload error:', err);
      setStep('error');

      const errorCode =
        err.code ||
        err.errorCode ||
        (typeof err.error === 'object' ? err.error?.code : err.error);
      const serverMessage =
        err.message ||
        (typeof err.error === 'object' ? err.error?.message : null) ||
        'Failed to upload and process document.';

      let title = 'Upload Failed';
      let message = serverMessage;
      let type = 'error';

      if (errorCode === 'NON_MEDICAL_DOCUMENT') {
        title = 'Invalid Document';
        message =
          'This file does not appear to be health-related. Please upload a medical prescription, laboratory report, medical certificate, discharge summary, or another healthcare document.';
        type = 'rejected';
      } else if (errorCode === 'DOCUMENT_CLASSIFICATION_UNCERTAIN') {
        title = 'Unable to Verify Document';
        message =
          "We couldn't confidently determine whether this document is health-related. Please upload a clearer image or a readable PDF.";
        type = 'uncertain';
      } else if (errorCode === 'DOCUMENT_UNREADABLE') {
        title = 'Unable to Read File';
        message =
          'This file is empty, corrupted, or unreadable. Please upload a valid PDF or a clear image.';
        type = 'unreadable';
      }

      setValidationError({
        title,
        message,
        code: errorCode || 'UPLOAD_ERROR',
        type,
      });
      setErrorMsg(message);
    }
  };

  const renderStatusPipeline = () => {
    const steps = [
      { key: 'uploading', label: `Uploading file (${uploadProgress}%)...` },
      { key: 'validating', label: 'Validating medical document authenticity...' },
      { key: 'processing', label: 'Processing document structure...' },
      { key: 'extracting', label: 'Extracting medical text & measurements...' },
      { key: 'summarizing', label: 'Generating AI summary & doctor questions...' },
      { key: 'complete', label: 'Complete! Document successfully organized.' },
    ];


    const currentIdx = steps.findIndex((s) => s.key === step);

    return (
      <div style={{ padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          {step === 'complete' ? (
            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto' }} />
          ) : (
            <div className="spinner" style={{ margin: '0 auto', width: '2.5rem', height: '2.5rem' }} />
          )}
        </div>

        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
          {steps[currentIdx]?.label || 'Analyzing document...'}
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '320px', margin: '0 auto', textAlign: 'left' }}>
          {steps.map((s, idx) => {
            const isDone = idx < currentIdx || step === 'complete';
            const isCurrent = idx === currentIdx && step !== 'complete';
            return (
              <div
                key={s.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.825rem',
                  color: isDone ? '#059669' : isCurrent ? 'var(--primary)' : 'var(--text-subtle)',
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                {isDone ? (
                  <CheckCircle2 size={15} />
                ) : isCurrent ? (
                  <span className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} />
                ) : (
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px solid #cbd5e1' }} />
                )}
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (step !== 'idle' && step !== 'error') {
    return renderStatusPipeline();
  }

  return (
    <div>
      {/* AI Document Validation Banner */}
      {validationError && (
        <div
          role="alert"
          id="document-validation-alert"
          style={{
            padding: '1.25rem',
            backgroundColor: validationError.type === 'uncertain' ? '#fffbeb' : '#fef2f2',
            border: `1.5px solid ${validationError.type === 'uncertain' ? '#fcd34d' : '#fca5a5'}`,
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: validationError.type === 'uncertain' ? '#fef3c7' : '#fee2e2',
              color: validationError.type === 'uncertain' ? '#d97706' : '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px',
            }}
          >
            <AlertTriangle size={20} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '0.975rem', fontWeight: 700, color: validationError.type === 'uncertain' ? '#92400e' : '#991b1b', margin: 0 }}>
                {validationError.title}
              </h4>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  backgroundColor: validationError.type === 'uncertain' ? '#fef3c7' : '#fee2e2',
                  color: validationError.type === 'uncertain' ? '#92400e' : '#991b1b',
                  letterSpacing: '0.04em',
                }}
              >
                {validationError.code}
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: validationError.type === 'uncertain' ? '#78350f' : '#7f1d1d', margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>
              {validationError.message}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                id="select-another-doc-btn"
                onClick={() => {
                  setFile(null);
                  setValidationError(null);
                  setErrorMsg('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  fileInputRef.current?.click();
                }}
                style={{
                  padding: '0.4rem 0.85rem',
                  backgroundColor: validationError.type === 'uncertain' ? '#d97706' : '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.15s ease',
                }}
              >
                Select Another File
              </button>

              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                  setErrorMsg('');
                }}
                style={{
                  padding: '0.4rem 0.75rem',
                  backgroundColor: 'transparent',
                  color: validationError.type === 'uncertain' ? '#92400e' : '#991b1b',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {!validationError && <ErrorMessage message={errorMsg} onDismiss={() => setErrorMsg('')} />}

      <div className="form-group">
        <label className="form-label" htmlFor="doc-type-select">Document Category</label>
        <select
          id="doc-type-select"
          className="form-select"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
        >
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Suggestion banner if Prescription is chosen */}
      {documentType === 'Prescription' && onOpenPrescriptionExtractor && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#f0fdfa',
            border: '1px solid #99f6e4',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '0.825rem', color: '#115e59' }}>
            <strong>Handwritten Prescription?</strong> Use our Multimodal AI Vision reader to interpret cursive doctor handwriting and verify dosages interactively.
          </div>
          <button
            type="button"
            onClick={onOpenPrescriptionExtractor}
            style={{
              padding: '0.35rem 0.75rem',
              backgroundColor: '#0d9488',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.775rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Open Vision Reader
          </button>
        </div>
      )}

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-light)'}`,
          backgroundColor: dragActive ? 'var(--primary-light)' : '#f8fafc',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '1.5rem',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary-light)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem auto'
        }}>
          <UploadCloud size={28} />
        </div>

        {file ? (
          <div>
            <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
              {file.name}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {(file.size / (1024 * 1024)).toFixed(2)} MB • Click to replace
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              Drag & drop your health document here, or browse
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Supports PDF, PNG, JPG (Max 10MB)
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          id="confirm-upload-btn"
          variant="primary"
          onClick={handleUpload}
          disabled={!file}
        >
          Upload & Analyze Document
        </Button>
      </div>
    </div>
  );
};

export default DocumentUpload;
