import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/common/Layout';
import DocumentSummary from '../components/documents/DocumentSummary';
import DocumentViewer from '../components/documents/DocumentViewer';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import Button from '../components/common/Button';
import documentService from '../services/documentService';
import {
  ArrowLeft,
  Calendar,
  FileText,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Bot,
  Layers,
} from 'lucide-react';

const DocumentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'extractedText' | 'preview'

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await documentService.getDocumentById(id);
      setDocument(res.data);
    } catch (err) {
      console.error('Error fetching document:', err);
      setError(err.message || 'Failed to load document details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const handleReprocess = async () => {
    try {
      setIsProcessing(true);
      const res = await documentService.processDocument(id);
      setDocument(res.data);
    } catch (err) {
      alert(err.message || 'Failed to reprocess document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this document permanently?')) {
      return;
    }
    try {
      await documentService.deleteDocument(id);
      navigate('/documents');
    } catch (err) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PROCESSED':
        return <span className="badge badge-success"><CheckCircle2 size={13} /> Processed & Summarized</span>;
      case 'PROCESSING':
        return <span className="badge badge-warning"><Clock size={13} /> Processing...</span>;
      case 'FAILED':
        return <span className="badge badge-danger"><AlertTriangle size={13} /> Extraction Failed</span>;
      default:
        return <span className="badge badge-neutral"><Clock size={13} /> Uploaded</span>;
    }
  };

  if (loading) {
    return (
      <Layout pageTitle="Document Details">
        <Loader message="Loading document analysis..." />
      </Layout>
    );
  }

  if (error || !document) {
    return (
      <Layout pageTitle="Document Details">
        <div style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
          <ErrorMessage message={error || 'Document not found'} />
          <Button variant="secondary" onClick={() => navigate('/documents')} icon={ArrowLeft}>
            Back to Documents
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Document Intelligence">
      {/* Top Breadcrumb & Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to="/documents"
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.4rem 0.6rem' }}
            title="Back to list"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              {document.fileName}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.25rem' }}>
              <span className="badge badge-primary">{document.documentType}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={13} />
                Uploaded {new Date(document.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {getStatusBadge(document.status)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReprocess}
            isLoading={isProcessing}
            icon={RefreshCw}
            title="Re-run AI Analysis"
          >
            Re-analyze
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            icon={Trash2}
            title="Delete Document"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-light)',
        marginBottom: '1.5rem',
        gap: '0.5rem'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'summary' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'summary' ? 'var(--primary)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Bot size={16} /> AI Summary & Insights
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'preview' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'preview' ? 'var(--primary)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <FileText size={16} /> Original Document Preview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('extractedText')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'extractedText' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'extractedText' ? 'var(--primary)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Layers size={16} /> Extracted Raw Text
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'summary' && (
        <div className="grid-2">
          <div>
            <DocumentSummary summary={document.summary} />
          </div>

          <div>
            <DocumentViewer
              documentId={document._id}
              fileUrl={document.fileUrl}
              fileName={document.fileName}
              fileType={document.fileType}
            />
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <DocumentViewer
            documentId={document._id}
            fileUrl={document.fileUrl}
            fileName={document.fileName}
            fileType={document.fileType}
          />
        </div>
      )}

      {activeTab === 'extractedText' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
              Text Extracted by Document Processor
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
              {document.extractedText ? `${document.extractedText.length} characters` : '0 characters'}
            </span>
          </div>

          <pre style={{
            backgroundColor: '#f8fafc',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            color: 'var(--text-main)',
            maxHeight: '600px',
            overflowY: 'auto'
          }}>
            {document.extractedText || 'No text extracted. The document may be an unread image scan or empty.'}
          </pre>
        </div>
      )}
    </Layout>
  );
};

export default DocumentDetails;
