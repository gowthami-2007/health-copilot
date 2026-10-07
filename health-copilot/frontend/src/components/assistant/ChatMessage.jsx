import React from 'react';
import { Bot, User, FileText, ExternalLink, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';

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
        style={{
          maxWidth: '80%',
          backgroundColor: isUser ? 'var(--primary)' : '#ffffff',
          color: isUser ? '#ffffff' : 'var(--text-main)',
          padding: '1rem 1.25rem',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          boxShadow: isUser ? '0 2px 6px rgba(2, 132, 199, 0.2)' : 'var(--shadow-sm)',
          border: isUser ? 'none' : '1px solid var(--border-light)',
          fontSize: '0.925rem',
          lineHeight: 1.6,
        }}
      >
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.content}
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
                  }}
                  title={src.excerpt || src.fileName}
                >
                  <FileText size={12} />
                  <span>{src.fileName}</span>
                  <ExternalLink size={10} />
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
