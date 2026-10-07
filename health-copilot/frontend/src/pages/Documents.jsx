import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/common/Layout';
import DocumentList from '../components/documents/DocumentList';
import DocumentUpload from '../components/documents/DocumentUpload';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import documentService from '../services/documentService';
import { UploadCloud, Plus } from 'lucide-react';
import Button from '../components/common/Button';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (selectedType !== 'All') params.type = selectedType;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await documentService.getDocuments(params);
      setDocuments(res.data?.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError(err.message || 'Could not load documents');
    } finally {
      setLoading(false);
    }
  }, [selectedType, searchTerm]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to permanently delete this health document?')) {
      return;
    }

    try {
      await documentService.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
    } catch (err) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleUploadSuccess = (newDoc) => {
    setIsUploadModalOpen(false);
    fetchDocuments();
  };

  return (
    <Layout pageTitle="Personal Health Documents">
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            Health Records & Reports
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Store, view, and analyze all your blood tests, prescriptions, and medical reports.
          </p>
        </div>

        <Button
          id="open-upload-modal-btn"
          variant="primary"
          onClick={() => setIsUploadModalOpen(true)}
          icon={Plus}
        >
          Upload New Document
        </Button>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError(null)} />

      {loading && documents.length === 0 ? (
        <Loader message="Loading your health repository..." />
      ) : (
        <DocumentList
          documents={documents}
          onDelete={handleDelete}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          selectedType={selectedType}
          onSelectType={setSelectedType}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Medical Document"
        maxWidth="600px"
      >
        <DocumentUpload
          onUploadSuccess={handleUploadSuccess}
          onCancel={() => setIsUploadModalOpen(false)}
        />
      </Modal>
    </Layout>
  );
};

export default Documents;
