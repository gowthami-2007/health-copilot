import React from 'react';
import DocumentCard from './DocumentCard';
import { FileQuestion, UploadCloud } from 'lucide-react';
import Button from '../common/Button';

const DocumentList = ({
  documents = [],
  onDelete,
  onOpenUpload,
  selectedType,
  onSelectType,
  searchTerm,
  onSearchChange,
}) => {
  const types = ['All', 'Blood Report', 'Prescription', 'Lab Report', 'Doctor Note', 'Imaging Report', 'Other'];

  return (
    <div>
      {/* Filters & Search Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {types.map((type) => {
            const isSelected = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelectType(type)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-light)'}`,
                  backgroundColor: isSelected ? 'var(--primary)' : '#ffffff',
                  color: isSelected ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {type}
              </button>
            );
          })}
        </div>

        {/* Search Field */}
        <div style={{ width: '100%', maxWidth: '300px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search report name or test..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ padding: '0.5rem 0.85rem', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      {/* Document Grid or Empty State */}
      {documents.length === 0 ? (
        <div className="card" style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          backgroundColor: '#ffffff',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            color: 'var(--text-subtle)'
          }}>
            <FileQuestion size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            You haven't uploaded any health documents yet.
          </h3>
          <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem auto', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Upload your laboratory blood work, imaging scans, prescriptions, or doctor summaries to start receiving AI explanations and insights.
          </p>
          <Button variant="primary" onClick={onOpenUpload} icon={UploadCloud}>
            Upload Document Now
          </Button>
        </div>
      ) : (
        <div className="grid-3">
          {documents.map((doc) => (
            <DocumentCard key={doc._id} document={doc} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentList;
