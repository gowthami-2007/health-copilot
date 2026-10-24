import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, Camera, FileUp, X, FileText, Image as ImageIcon, AlertCircle, Mic, MicOff } from 'lucide-react';
import Button from '../common/Button';
import CameraModal from './CameraModal';
import useLanguage from '../../hooks/useLanguage';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'application/pdf',
  'text/plain',
];

const ChatInput = ({
  onSendMessage,
  isLoading = false,
  placeholder = null,
}) => {
  const { t, isTelugu } = useLanguage();
  const [text, setText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [attachments, setAttachments] = useState([]); // [{ file, previewUrl, fileName, fileType, fileSize, attachmentType }]
  const [validationError, setValidationError] = useState(null);

  const { startListening, stopListening, isListening } = useVoiceAssistant();

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening({
        language: isTelugu ? 'te' : 'en',
        onTranscript: (spoken) => {
          setText(spoken);
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
          }
        },
      });
    }
  };

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);
  const attachmentButtonRef = useRef(null);

  // Close menu on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        attachmentButtonRef.current &&
        !attachmentButtonRef.current.contains(e.target)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const rawText = text.trim();
    if ((!rawText && attachments.length === 0) || isLoading) return;

    onSendMessage(rawText, attachments);
    setText('');
    setAttachments([]);
    setValidationError(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    // Auto resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setValidationError(null);
    const newAttachments = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setValidationError(`"${file.name}" exceeds the 10MB limit.`);
        continue;
      }

      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      const isTxt = file.type === 'text/plain';

      if (!isImage && !isPdf && !isTxt && !ALLOWED_MIME_TYPES.includes(file.type)) {
        setValidationError(`"${file.name}" format not supported. Please upload JPG, PNG, WEBP, or PDF.`);
        continue;
      }

      const previewUrl = isImage ? URL.createObjectURL(file) : null;
      newAttachments.push({
        file,
        previewUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        attachmentType: isImage ? 'image' : 'document',
      });
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }

    // Reset native input so user can re-select same file if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsMenuOpen(false);
  };

  const handleCameraPhoto = (capturedPhoto) => {
    setValidationError(null);
    setAttachments((prev) => [
      ...prev,
      {
        ...capturedPhoto,
        attachmentType: 'image',
      },
    ]);
    setIsCameraOpen(false);
  };

  const handleRemoveAttachment = (indexToRemove) => {
    setAttachments((prev) => {
      const target = prev[indexToRemove];
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const isSendDisabled = (!text.trim() && attachments.length === 0) || isLoading;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Validation banner */}
      {validationError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.4rem 0.75rem',
            marginBottom: '0.5rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            color: '#991b1b',
            fontSize: '0.8rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertCircle size={14} />
            <span>{validationError}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', padding: '0.1rem' }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Attachment Previews Area */}
      {attachments.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            backgroundColor: '#f8fafc',
            border: '1px solid var(--border-light)',
            borderBottom: 'none',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          }}
        >
          {attachments.map((att, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '0.35rem 0.55rem',
                boxShadow: 'var(--shadow-sm)',
                maxWidth: '220px',
                position: 'relative',
              }}
            >
              {att.attachmentType === 'image' && att.previewUrl ? (
                <img
                  src={att.previewUrl}
                  alt={att.fileName}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={16} />
                </div>
              )}

              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    margin: 0,
                    color: 'var(--text-main)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={att.fileName}
                >
                  {att.fileName}
                </p>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                  {att.fileSize ? `${Math.round(att.fileSize / 1024)} KB` : 'Attached'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveAttachment(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-subtle)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                }}
                title="Remove attachment"
                aria-label="Remove attachment"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <form
        onSubmit={handleSubmit}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '0.5rem',
          padding: '0.65rem 0.85rem',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-light)',
          borderRadius: attachments.length > 0 ? '0 0 var(--radius-lg) var(--radius-lg)' : 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Attachment "+" Button */}
        <div style={{ position: 'relative' }}>
          <button
            ref={attachmentButtonRef}
            id="chat-attach-btn"
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title={t('assistant.attachBtn', 'Attach image or document')}
            aria-label={t('assistant.attachBtn', 'Attach image or document')}
            aria-expanded={isMenuOpen}
            disabled={isLoading}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              backgroundColor: isMenuOpen ? 'var(--primary-light)' : '#f8fafc',
              color: isMenuOpen ? 'var(--primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            <Plus size={18} style={{ transform: isMenuOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.15s ease' }} />
          </button>

          {/* Attachment Popup Menu */}
          {isMenuOpen && (
            <div
              ref={menuRef}
              id="attachment-menu-popup"
              className="card animate-fade-in"
              style={{
                position: 'absolute',
                bottom: '48px',
                left: '0',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '0.4rem',
                minWidth: '220px',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
              }}
            >
              <button
                type="button"
                id="menu-camera-btn"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsCameraOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.65rem 0.85rem',
                  width: '100%',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-light)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Camera size={16} color="var(--primary)" />
                <span>{t('assistant.menuCamera', 'Camera / Take Photo')}</span>
              </button>

              <button
                type="button"
                id="menu-upload-btn"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.65rem 0.85rem',
                  width: '100%',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-light)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <FileUp size={16} color="var(--accent)" />
                <span>{t('assistant.menuUpload', 'Upload Document / Image')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Hidden File Picker Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          id="assistant-chat-textarea"
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            attachments.length > 0
              ? t('assistant.inputPlaceholderAttached', 'Add an optional question about the attached files...')
              : (placeholder || t('assistant.inputPlaceholder', 'Ask a question about your health records...'))
          }
          disabled={isLoading}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: '0.95rem',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            maxHeight: '120px',
            color: 'var(--text-main)',
            padding: '0.35rem 0',
            backgroundColor: 'transparent',
          }}
        />

        {/* Voice Speech-to-Text Button */}
        <button
          type="button"
          id="assistant-voice-btn"
          onClick={handleVoiceToggle}
          title={isListening ? 'Stop listening' : isTelugu ? 'తెలుగులో మాట్లాడండి' : 'Speak your question'}
          style={{
            backgroundColor: isListening ? '#fee2e2' : 'transparent',
            border: isListening ? '1px solid #ef4444' : '1px solid var(--border-light)',
            color: isListening ? '#dc2626' : 'var(--text-muted)',
            borderRadius: 'var(--radius-md)',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        {/* Send Button */}
        <Button
          id="send-chat-btn"
          type="submit"
          variant="accent"
          size="sm"
          isLoading={isLoading}
          disabled={isSendDisabled}
          style={{
            borderRadius: 'var(--radius-md)',
            padding: '0.55rem 0.85rem',
            height: '38px',
            flexShrink: 0,
          }}
        >
          <Send size={15} />
        </Button>
      </form>

      {/* In-Browser Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapturePhoto={handleCameraPhoto}
      />
    </div>
  );
};

export default ChatInput;
