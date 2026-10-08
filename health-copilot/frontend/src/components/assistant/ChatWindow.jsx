import React, { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import SuggestedQuestions from './SuggestedQuestions';
import { Bot, ShieldCheck, Sparkles, MessageSquare } from 'lucide-react';

const ChatWindow = ({
  messages = [],
  isLoading = false,
  onSendMessage,
  conversationTitle = 'Health Consultation',
}) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div
      className="card chat-window-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Chat Header */}
      <div
        style={{
          padding: '0.85rem 1.25rem',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fafcff',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bot size={20} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700, color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {conversationTitle}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <ShieldCheck size={12} color="#10b981" style={{ flexShrink: 0 }} /> Powered by RAG • Vault Isolation Active
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
            Health Copilot AI
          </span>
        </div>
      </div>

      {/* Messages Scroll Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '2rem 1rem',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Bot size={32} />
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Ask me about your uploaded health records.
            </h3>
            <p style={{ maxWidth: '480px', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              I can explain medical reports, find past laboratory values, list your prescribed medications, and prepare proactive questions for your doctor.
            </p>

            <SuggestedQuestions onSelectQuestion={onSendMessage} />
          </div>
        ) : (
          <div style={{ minWidth: 0, width: '100%' }}>
            {messages.map((msg, index) => (
              <ChatMessage key={msg._id || index} message={msg} />
            ))}

            {isLoading && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Bot size={18} />
                </div>
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '16px 16px 16px 4px',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                  <span style={{ fontWeight: 500 }}>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Tray */}
      <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#ffffff', borderTop: '1px solid var(--border-light)', boxSizing: 'border-box', width: '100%' }}>
        <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', display: 'block', lineHeight: 1.4 }}>
            AI-generated information is informational only. Does not diagnose or prescribe. Consult a licensed doctor for medical care.
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
