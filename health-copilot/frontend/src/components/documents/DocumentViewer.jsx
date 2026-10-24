import React, { useState } from 'react';
import { ExternalLink, Download, FileText, Image } from 'lucide-react';
import Button from '../common/Button';
import { getAuthToken, getBaseUrl } from '../../services/api';

const DocumentViewer = ({ documentId, fileUrl, fileName, fileType }) => {
  const isDeclaredPdf = fileType?.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf');
  const [viewAsPdf, setViewAsPdf] = useState(isDeclaredPdf);

  // Obtain current session's JWT token (support in-memory and persistent storage)
  const token = getAuthToken() || localStorage.getItem('health_copilot_token') || '';
  const apiBase = getBaseUrl().replace(/\/+$/, '');

  // Construct secure, authenticated file streaming endpoints
  let viewUrl = '';
  let downloadUrl = '';

  if (fileUrl) {
    if (fileUrl.startsWith('http')) {
      viewUrl = token ? `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : fileUrl;
    } else {
      const cleanPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
      const prefix = cleanPath.startsWith('/api')
        ? (apiBase === '/api' ? '' : apiBase.replace(/\/api$/, ''))
        : apiBase;
      viewUrl = `${prefix}${cleanPath}${cleanPath.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
    }
    downloadUrl = viewUrl;
  } else if (documentId) {
    viewUrl = `${apiBase}/documents/${documentId}/file?token=${encodeURIComponent(token)}`;
    downloadUrl = `${apiBase}/documents/${documentId}/download?token=${encodeURIComponent(token)}`;
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
          {viewAsPdf ? <FileText size={18} color="#dc2626" /> : <Image size={18} color="var(--primary)" />}
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Original Document Preview {viewAsPdf && '(Clinical PDF Report)'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a
            href={downloadUrl}
            download={fileName || 'document'}
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.35rem' }}
          >
            <Download size={14} /> Download
          </a>
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            style={{ gap: '0.35rem' }}
          >
            <ExternalLink size={14} /> Open Full View
          </a>
        </div>
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
        minHeight: '450px',
        position: 'relative',
      }}>
        {viewAsPdf ? (
          <object
            data={`${viewUrl}#toolbar=0`}
            type="application/pdf"
            width="100%"
            height="100%"
            style={{ border: 'none', minHeight: '520px', width: '100%', height: '100%' }}
          >
            <iframe
              src={`${viewUrl}#toolbar=0`}
              title={fileName}
              width="100%"
              height="100%"
              style={{ border: 'none', minHeight: '500px' }}
            >
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', margin: '1rem', border: '1px solid var(--border-light)' }}>
                <FileText size={48} color="var(--primary)" style={{ marginBottom: '0.75rem' }} />
                <h4 style={{ margin: '0 0 0.5rem 0' }}>PDF Document Ready</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Click below to open and review the full document in a high-resolution viewer.
                </p>
                <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ gap: '0.5rem' }}>
                  <ExternalLink size={14} /> Open Full Document View
                </a>
              </div>
            </iframe>
          </object>
        ) : (
          <img
            src={viewUrl}
            alt={fileName}
            onError={() => {
              // Automatically fallback to PDF viewer when image fails (e.g. backend responded with synthesized PDF)
              setViewAsPdf(true);
            }}
            style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain', padding: '0.5rem' }}
          />
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;
