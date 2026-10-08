import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowRight, UploadCloud, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

const RecentDocuments = ({ documents = [] }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PROCESSED':
        return <span className="badge badge-success"><CheckCircle2 size={12} /> Summarized</span>;
      case 'PROCESSING':
        return <span className="badge badge-warning"><Clock size={12} /> Processing</span>;
      case 'FAILED':
        return <span className="badge badge-danger"><AlertTriangle size={12} /> Unreadable</span>;
      default:
        return <span className="badge badge-neutral"><Clock size={12} /> Uploaded</span>;
    }
  };

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Recent Health Documents</h3>
        </div>
        <Link to="/documents" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          View all <ArrowRight size={14} />
        </Link>
      </div>

      {documents.length === 0 ? (
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
          <UploadCloud size={36} color="var(--text-subtle)" style={{ marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            No documents uploaded yet
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Upload blood reports, prescriptions, or doctor notes to get AI summaries
          </p>
          <Link to="/documents" className="btn btn-primary btn-sm">
            Upload First Document
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
          {documents.map((doc) => (
            <Link
              key={doc._id}
              to={`/documents/${doc._id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.backgroundColor = 'var(--bg-main)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-light)';
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, overflow: 'hidden' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileText size={18} />
                </div>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <h4 style={{ fontSize: '0.925rem', color: 'var(--text-main)', margin: 0, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.fileName}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', overflow: 'hidden' }}>
                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', flexShrink: 0 }}>
                      {doc.documentType || 'Medical Report'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
                      {new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ flexShrink: 0 }}>
                {getStatusBadge(doc.status)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentDocuments;
