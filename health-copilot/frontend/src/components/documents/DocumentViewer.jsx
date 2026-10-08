import React from 'react';
import { ExternalLink, Download, FileText, Image } from 'lucide-react';
import Button from '../common/Button';

const DocumentViewer = ({ documentId, fileUrl, fileName, fileType }) => {
  const isPdf = fileType?.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf');
  const isImage = fileType?.includes('image') || /\.(png|jpe?g)$/i.test(fileName || '');

  // Obtain current session's JWT token
  const token = localStorage.getItem('health_copilot_token');
  const apiBase = (import.meta.env.VITE_API_URL || 'https://health-copilot-pv0y.onrender.com/api').replace(/\/+$/, '');

  // Construct secure, authenticated file streaming endpoints
  let viewUrl = '';
  let downloadUrl = '';

  if (documentId) {
    viewUrl = `${apiBase}/documents/${documentId}/file?token=${encodeURIComponent(token || '')}`;
    downloadUrl = `${apiBase}/documents/${documentId}/download?token=${encodeURIComponent(token || '')}`;
  } else if (fileUrl) {
    if (fileUrl.startsWith('http')) {
      viewUrl = token ? `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : fileUrl;
    } else {
      const cleanPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
      viewUrl = `${apiBase}${cleanPath}?token=${encodeURIComponent(token || '')}`;
    }
    downloadUrl = viewUrl;
  }

  return (
    <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.75rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isPdf ? <FileText size={18} color="#dc2626" /> : <Image size={18} color="var(--primary)" />}
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Original Document Preview
          </span>
        </div>

        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
          style={{ gap: '0.35rem' }}
        >
          <ExternalLink size={14} /> Open Full View
        </a>
      </div>

      <div style={{
        flex: 1,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border-light)',
        minHeight: '450px'
      }}>
        {isPdf ? (
          <iframe
            src={`${viewUrl}#toolbar=0`}
            title={fileName}
            width="100%"
            height="100%"
            style={{ border: 'none', minHeight: '500px' }}
          />
        ) : isImage ? (
          <img
            src={viewUrl}
            alt={fileName}
            style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain', padding: '0.5rem' }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <FileText size={48} color="var(--text-subtle)" style={{ marginBottom: '0.5rem' }} />
            <p>Preview not directly supported in this browser.</p>
            <a href={downloadUrl} download className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
              <Download size={14} /> Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;
