import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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

const DocumentUpload = ({ onUploadSuccess, onCancel }) => {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('Blood Report');
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState('idle'); // 'idle' | 'uploading' | 'processing' | 'extracting' | 'summarizing' | 'complete' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
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
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(selectedFile.type)) {
      setErrorMsg('Invalid file format. Please upload a PDF, JPG, or PNG document.');
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

      // Step: Uploading
      const response = await documentService.uploadDocument(file, documentType, (p) => {
        setUploadProgress(p);
      });

      const docId = response.data?._id;

      // Simulated pipeline progress steps for responsive feedback
      setStep('processing');
      await new Promise((r) => setTimeout(r, 600));

      setStep('extracting');
      await new Promise((r) => setTimeout(r, 700));

      setStep('summarizing');
      await new Promise((r) => setTimeout(r, 800));

      setStep('complete');
      setTimeout(() => {
        if (onUploadSuccess) onUploadSuccess(response.data);
      }, 1000);
    } catch (err) {
      console.error('Upload error:', err);
      setStep('error');
      setErrorMsg(err.message || 'Failed to upload and process document.');
    }
  };

  const renderStatusPipeline = () => {
    const steps = [
      { key: 'uploading', label: `Uploading file (${uploadProgress}%)...` },
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
      <ErrorMessage message={errorMsg} onDismiss={() => setErrorMsg('')} />

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
          accept=".pdf,.png,.jpg,.jpeg"
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
