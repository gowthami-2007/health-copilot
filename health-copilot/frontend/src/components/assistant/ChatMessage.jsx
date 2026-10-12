import React from 'react';
import { Bot, User, FileText, ExternalLink, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

const cleanContent = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\n+\s*(?:\*{3,}|-{3,}|_{3,})\s*[\s\S]*$/i, '')
    .replace(/\n+\s*(?:>|\*|_)*\s*(?:medical\s+)?disclaimer\s*:?[\s\S]*$/i, '')
    .replace(/\n+\s*(?:>|\*|_)*\s*(?:please\s+note|note)\s*:?\s*(?:this\s+information|ai-generated\s+information|this\s+is\s+for\s+educational)[\s\S]*$/i, '')
    .trim();
};

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  const displayContent = isUser ? message.content : cleanContent(message.content);

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.85rem',
        alignItems: 'flex-start',
        marginBottom: '1.25rem',
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
      className="animate-fade-in"
    >
      {/* Avatar */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: isUser ? 'var(--primary)' : 'var(--accent)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: isUser ? '0 2px 8px var(--primary-glow)' : '0 2px 8px var(--accent-glow)',
        }}
      >
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>

      {/* Bubble Content */}
      <div
        className="chat-message-bubble"
        style={{
          backgroundColor: isUser
            ? 'var(--primary)'
            : message.isError
              ? '#fef2f2'
              : '#ffffff',
          color: isUser
            ? '#ffffff'
            : message.isError
              ? '#991b1b'
              : 'var(--text-main)',
          padding: '1rem 1.25rem',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          boxShadow: isUser ? '0 2px 6px rgba(2, 132, 199, 0.2)' : 'var(--shadow-sm)',
          border: isUser
            ? 'none'
            : message.isError
              ? '1px solid #fecaca'
              : '1px solid var(--border-light)',
          fontSize: '0.925rem',
          lineHeight: 1.6,
          minWidth: 0,
        }}
      >
        {/* Attached Images or Documents */}
        {message.attachments && message.attachments.length > 0 && (
          <div style={{ marginBottom: displayContent ? '0.75rem' : 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {message.attachments.map((att, idx) => {
              const isImg = att.attachmentType === 'image' || att.fileType?.startsWith('image/') || att.previewUrl;
              const docUrl = att.documentId ? `/api/documents/${att.documentId}/file` : att.fileUrl || att.previewUrl;
              return (
                <div key={idx} style={{ maxWidth: '100%' }}>
                  {isImg && (att.previewUrl || att.documentId) ? (
                    <div style={{ borderRadius: '8px', overflow: 'hidden', border: isUser ? '1px solid rgba(255,255,255,0.3)' : '1px solid var(--border-light)', maxWidth: '280px', maxHeight: '200px' }}>
                      <img
                        src={att.previewUrl || docUrl}
                        alt={att.fileName || 'Attachment'}
                        style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '200px', objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.4rem 0.65rem',
                        borderRadius: '6px',
                        backgroundColor: isUser ? 'rgba(255, 255, 255, 0.15)' : '#f1f5f9',
                        color: isUser ? '#ffffff' : 'var(--text-main)',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        border: isUser ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid #e2e8f0',
                      }}
                    >
                      <FileText size={14} />
                      <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.fileName}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          {displayContent}
        </div>

        {/* Source Citations for AI Responses */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div
            style={{
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Sources Retrieved From Your Vault
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {message.sources.map((src, i) => (
                <Link
                  key={i}
                  to={`/documents/${src.documentId}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.6rem',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}
                  title={src.excerpt || src.fileName}
                >
                  <FileText size={12} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.fileName}</span>
                  <ExternalLink size={10} style={{ flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
