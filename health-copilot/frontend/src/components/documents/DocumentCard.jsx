import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Image, Trash2, ArrowRight, Eye, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

const DocumentCard = ({ document, onDelete }) => {
  const isPdf = document.fileType?.includes('pdf') || document.fileName?.endsWith('.pdf');

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

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.2s ease',
        border: '1px solid var(--border-light)',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: isPdf ? '#fee2e2' : 'var(--primary-light)',
            color: isPdf ? '#dc2626' : 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {isPdf ? <FileText size={22} /> : <Image size={22} />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {getStatusBadge(document.status)}
            <button
              type="button"
              onClick={() => onDelete(document._id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-subtle)',
                cursor: 'pointer',
                padding: '0.3rem',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                transition: 'color 0.15s ease'
              }}
              title="Delete document"
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-subtle)'}
              aria-label="Delete document"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <h4 style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--text-main)',
          marginBottom: '0.35rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }} title={document.fileName}>
          {document.fileName}
        </h4>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
            {document.documentType || 'Other'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
            {formatSize(document.fileSize)}
          </span>
        </div>

        {document.summary?.overview && (
          <p style={{
            fontSize: '0.825rem',
            color: 'var(--text-muted)',
            lineHeight: 1.4,
            marginBottom: '1rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {document.summary.overview}
          </p>
        )}
      </div>

      <div style={{
        paddingTop: '0.85rem',
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.78rem'
      }}>
        <span style={{ color: 'var(--text-subtle)' }}>
          {new Date(document.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>

        <Link
          to={`/documents/${document._id}`}
          style={{
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            color: 'var(--primary)',
            textDecoration: 'none'
          }}
        >
          View Details <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
};

export default DocumentCard;
